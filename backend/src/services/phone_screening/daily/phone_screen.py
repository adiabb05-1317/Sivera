import asyncio
import json
import os
from typing import Any, Dict, Optional

import aiohttp
from dotenv import load_dotenv
from pipecat.audio.vad.silero import SileroVADAnalyzer, VADParams
from pipecat.frames.frames import BotInterruptionFrame, LLMMessagesFrame
from pipecat.observers.base_observer import FramePushed
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineParams, PipelineTask
from pipecat.processors.aggregators.openai_llm_context import OpenAILLMContext
from src.constants.prompts import PHONE_SCREENING_PROMPT_TEMPLATE
from pipecat.processors.filters.stt_mute_filter import (
    STTMuteConfig,
    STTMuteFilter,
    STTMuteStrategy,
)
from pipecat.processors.frame_processor import FrameDirection
from pipecat.processors.frameworks.rtvi import (
    RTVI_MESSAGE_LABEL,
    RTVIConfig,
    RTVIMessageLiteral,
    RTVIObserver,
    RTVIProcessor,
    TransportMessageUrgentFrame,
)
from pipecat.services.deepgram.stt import DeepgramSTTService
from pipecat.services.openai.llm import OpenAILLMService
from pipecat.transports.services.daily import (
    DailyParams,
    DailyTransport,
    DailyDialinSettings,
)
from pydantic import BaseModel

from src.constants.ai_models import LLMModels
from src.services.tts_factory import TTSFactory
from src.utils.logger import logger

load_dotenv(override=True)


class PhoneScreenRTVIProcessor(RTVIProcessor):
    async def interrupt_bot(self):
        logger.info("PhoneScreenRTVIProcessor: Interrupting bot...")
        await super().interrupt_bot()
        logger.info("PhoneScreenRTVIProcessor: BotInterruptionFrame pushed upstream")


class PhoneScreenRTVIObserver(RTVIObserver):
    async def on_push_frame(self, data: FramePushed):
        if isinstance(data.frame, BotInterruptionFrame):
            logger.info(
                f"Bot interruption frame detected: {data.frame} from {data.source.__class__.__name__} to {data.destination.__class__.__name__}"
            )
        await super().on_push_frame(data)


phone_screen_instance = None


async def end_phone_screen_pipeline():
    logger.info("Ending phone screen session")
    if phone_screen_instance:
        await phone_screen_instance.stop()


class RTVIPhoneMessage(BaseModel):
    """Model for sending messages to phone screening system."""

    label: RTVIMessageLiteral = RTVI_MESSAGE_LABEL
    type: str = "phone_screen"
    data: Dict[str, Any]


class PhoneScreen:
    def __init__(
        self,
        url,
        bot_token,
        session_id,
        db_manager,
        call_id,
        call_domain,
        candidate_name,
        company_name,
        position_title,
        screening_questions=None,
        bot_name="Sia",
        dialout_settings=None,
    ):
        self.url = url
        self.token = bot_token
        self.session_id = session_id
        self.bot_name = bot_name
        self.call_id = call_id
        self.call_domain = call_domain
        self.candidate_name = candidate_name
        self.company_name = company_name
        self.position_title = position_title
        self.job_description = ""
        self.screening_questions = screening_questions or [
            "Can you tell me about your current role and what you're looking for in your next position?",
            "What experience do you have with software development and which programming languages are you most comfortable with?",
            "Are you currently interviewing with other companies, and what's your timeline for making a decision?",
            "What interests you most about this role and our company?",
            "Do you have any questions about the position or the next steps in our process?",
        ]
        self.dialout_settings = dialout_settings or {}
        self.task: Optional[PipelineTask] = None
        self.runner: Optional[PipelineRunner] = None
        self.task_running = False
        self.db = db_manager
        # Dialout state tracking
        self.dialout_successful = False
        self.max_retries = 5
        self.retry_count = 0

        # Initialize services optimized for phone calls
        self.stt = DeepgramSTTService(api_key=os.getenv("DEEPGRAM_API_KEY"))

        # Force ElevenLabs TTS for phone calls
        self.tts = TTSFactory.create_tts_service(provider="elevenlabs")

        self.llm = OpenAILLMService(
            api_key=os.getenv("OPENAI_API_KEY"),
            model=LLMModels.GPT_4_1,
        )

        # Format screening questions as numbered list
        questions_formatted = "\n".join(
            [
                f"{i+1}. {question}"
                for i, question in enumerate(self.screening_questions)
            ]
        )

        system_prompt = PHONE_SCREENING_PROMPT_TEMPLATE.format(
            candidate_name=self.candidate_name,
            company_name=self.company_name,
            position_title=self.position_title,
            screening_questions=questions_formatted,
            job_description=self.job_description,
        )

        # Debug: Print the formatted prompt to see what's being sent
        logger.info(f"=== FORMATTED SYSTEM PROMPT ===")
        logger.info(f"Candidate Name: {self.candidate_name}")
        logger.info(f"Company Name: {self.company_name}")
        logger.info(f"Position Title: {self.position_title}")
        logger.info(f"System Prompt Preview: {system_prompt[:200]}...")

        context = OpenAILLMContext(
            messages=[
                {
                    "role": "system",
                    "content": system_prompt,
                }
            ]
        )
        self.context_aggregator = self.llm.create_context_aggregator(context)

        # Phone optimized STT filter
        self.stt_mute_filter = STTMuteFilter(
            stt_service=self.stt,
            config=STTMuteConfig(
                strategies={STTMuteStrategy.MUTE_UNTIL_FIRST_BOT_COMPLETE}
            ),
        )

        # RTVI config for phone screening
        self.rtvi_config = RTVIConfig(
            config=[
                {"type": "speaking", "service": "rtvi", "options": []},
                {"type": "user_transcription", "service": "rtvi", "options": []},
                {"type": "bot_transcription", "service": "rtvi", "options": []},
                {"type": "bot_tts", "service": "rtvi", "options": []},
            ]
        )
        self.rtvi = PhoneScreenRTVIProcessor(config=self.rtvi_config)
        globals()["phone_screen_instance"] = self
        self.rtvi_observer = PhoneScreenRTVIObserver(rtvi=self.rtvi)

    @classmethod
    async def create(
        cls,
        url,
        bot_token,
        session_id,
        call_id,
        call_domain,
        bot_name="Phone Screener",
        dialout_settings=None,
    ):
        return cls(
            url, bot_token, session_id, call_id, call_domain, bot_name, dialout_settings
        )

    async def attempt_dialout(self):
        """Attempt to start dialout with retry logic."""
        if self.retry_count < self.max_retries and not self.dialout_successful:
            self.retry_count += 1

            phone_number = self.dialout_settings.get("phone_number")
            dialout_params = {"phoneNumber": phone_number}
            caller_id = self.dialout_settings.get("caller_id")
            if caller_id:
                dialout_params["callerId"] = caller_id
                logger.debug(f"Including caller ID in dialout: {caller_id}")

            logger.debug(f"Dialout parameters: {dialout_params}")
            await self.transport.start_dialout(dialout_params)
        else:
            logger.error(
                f"Maximum retry attempts ({self.max_retries}) reached. Giving up on dialout."
            )

    async def create_transport(self):
        self.aiohttp_session = aiohttp.ClientSession()

        # Configure Daily dialin settings for SIP
        dialin_settings = DailyDialinSettings(
            call_id=self.call_id, call_domain=self.call_domain
        )

        # Phone optimized transport settings
        self.transport = DailyTransport(
            room_url=self.url,
            token=self.token,
            bot_name=self.bot_name,
            params=DailyParams(
                api_url="https://api.daily.co/v1",
                api_key=os.getenv("DAILY_API_KEY"),
                dialin_settings=dialin_settings,
                audio_out_enabled=True,
                audio_out_sample_rate=48000,
                audio_out_channels=1,
                audio_in_enabled=True,
                camera_out_enabled=False,  # No video for phone calls
                camera_out_width=0,
                camera_out_height=0,
                vad_analyzer=SileroVADAnalyzer(
                    params=VADParams(
                        stop_secs=0.3,  # Slightly longer pause for phone calls
                    ),
                ),
                audio_in_passthrough=True,
                transcription_enabled=True,  # Enable for phone screening logging
            ),
        )

        # Event handlers for phone calls and dialout
        @self.transport.event_handler("on_joined")
        async def on_joined(transport, data):
            logger.debug("Bot joined the room")
            # Check if we have dialout settings and initiate call
            if self.dialout_settings and (
                self.dialout_settings.get("phone_number")
                or self.dialout_settings.get("sip_uri")
            ):
                target = self.dialout_settings.get(
                    "sip_uri"
                ) or self.dialout_settings.get("phone_number")
                logger.debug(
                    f"Dialout settings detected; starting dialout to: {target}"
                )
                await self.attempt_dialout()

        @self.transport.event_handler("on_dialout_connected")
        async def on_dialout_connected(transport, data):
            logger.debug(f"Dial-out connected: {data}")

        @self.transport.event_handler("on_dialout_answered")
        async def on_dialout_answered(transport, data):
            logger.debug(f"Dial-out answered: {data}")
            self.dialout_successful = True  # Mark as successful to stop retries

            # Automatically start capturing transcription for the participant
            await transport.capture_participant_transcription(data["sessionId"])

            # Start with greeting message after dialout is answered
            greeting_instruction = f"""You are Sia from {self.company_name}. Start the call by saying:
            "Hello, this is Sia from {self.company_name}. Am I speaking with {self.candidate_name}? I'm calling regarding your application for the {self.position_title} position. Is now a good time for a quick 5-10 minute conversation?"
            
            Use the EXACT names provided - do not use placeholders like [Your Name] or [Candidate's Name]. Use:
            - Your name: Sia
            - Company: {self.company_name}  
            - Candidate: {self.candidate_name}
            - Position: {self.position_title}"""

            initial_messages = [
                {
                    "role": "system",
                    "content": greeting_instruction,
                }
            ]

            await self.task.queue_frames([LLMMessagesFrame(messages=initial_messages)])

        @self.transport.event_handler("on_dialout_error")
        async def on_dialout_error(transport, data: Any):
            logger.error(
                f"Dial-out error (attempt {self.retry_count}/{self.max_retries}): {data}"
            )

            if self.retry_count < self.max_retries:
                logger.info(f"Retrying dialout")
                await self.attempt_dialout()
            else:
                logger.error(
                    f"All {self.max_retries} dialout attempts failed. Stopping bot."
                )
                await self.task.cancel()

        @self.transport.event_handler("on_first_participant_joined")
        async def on_first_participant_joined(transport, participant):
            logger.info(f"Phone participant joined: {participant}")

        @self.transport.event_handler("on_participant_left")
        async def on_participant_left(transport, participant, reason):
            logger.info(f"Phone participant left: {participant}, reason: {reason}")

            await self.stop()

        @self.transport.event_handler("on_call_state_updated")
        async def on_call_state_updated(transport, state):
            logger.info(f"Phone call state updated: {state}")

        @self.transport.event_handler("on_dialin_ready")
        async def on_dialin_ready(transport, sip_endpoint: str):
            logger.info(f"Dial-in ready at: {sip_endpoint}")

    async def create_pipeline(self):
        if not hasattr(self, "transport") or not self.transport:
            raise Exception("Transport not initialized")

        # Phone screening pipeline - optimized for voice-only interaction
        pipeline = Pipeline(
            [
                self.transport.input(),
                self.rtvi,
                self.stt_mute_filter,
                self.stt,
                self.context_aggregator.user(),
                self.llm,
                self.tts,
                self.transport.output(),
                self.context_aggregator.assistant(),
            ]
        )

        # Phone screening task parameters
        self.task = PipelineTask(
            pipeline=pipeline,
            params=PipelineParams(
                allow_interruptions=True,
                auto_enable_processors=True,
                stream_processing=True,
                parallel_processing=True,
                buffer_size=2048,
                max_queue_size=30,
                processing_timeout=8.0,
                error_handling="retry",
            ),
            observers=[self.rtvi_observer],
        )

        return self.task

    async def start(self):
        if self.runner and self.task_running:
            logger.warning("Phone screen runner is already running")
            return

        await self.create_transport()
        await self.create_pipeline()

        self.runner = PipelineRunner()

        try:
            logger.info("Starting phone screening pipeline...")
            logger.info(f"- Call ID: {self.call_id}")
            logger.info(f"- Call Domain: {self.call_domain}")
            logger.info(f"- Session ID: {self.session_id}")
            if self.dialout_settings.get("phone_number"):
                logger.info(f"- Dialout to: {self.dialout_settings['phone_number']}")

            await self.runner.run(self.task)
            self.task_running = True

            logger.info(
                f"Phone screening pipeline running for session {self.session_id}"
            )

        except Exception as e:
            logger.error(f"Failed to start phone screening: {e}")
            if self.runner:
                self.task_running = False
            raise RuntimeError(f"Failed to start phone screening: {e}") from None

    async def stop(self):
        try:

            if self.task:
                logger.info("Canceling phone screening task")
                try:
                    await self.task.cancel()
                    logger.info("Phone screening task cancelled successfully")
                except asyncio.CancelledError:
                    pass
                except Exception as e:
                    logger.error(f"Error cancelling phone screening task: {e}")
                finally:
                    self.task = None
                    self.task_running = False

            if hasattr(self, "aiohttp_session"):
                await self.aiohttp_session.close()

        except Exception as e:
            logger.error(f"Error stopping phone screening: {e}")
