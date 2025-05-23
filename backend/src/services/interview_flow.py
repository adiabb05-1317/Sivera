import asyncio
import json
import os
import uuid
import aiohttp
from typing import Any, Dict, Optional, Literal

from dotenv import load_dotenv
from pipecat.audio.vad.silero import SileroVADAnalyzer, VADParams
from pipecat.audio.turn.smart_turn.fal_smart_turn import FalSmartTurnAnalyzer
from pipecat.audio.turn.smart_turn.base_smart_turn import SmartTurnParams
from pipecat.frames.frames import BotInterruptionFrame
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineParams, PipelineTask
from pipecat.processors.aggregators.openai_llm_context import OpenAILLMContext
from pipecat.observers.base_observer import FramePushed
from pipecat.processors.filters.stt_mute_filter import (
    STTMuteConfig,
    STTMuteFilter,
    STTMuteStrategy,
)
from pipecat.processors.frame_processor import Frame, FrameDirection, FrameProcessor
from pipecat.processors.frameworks.rtvi import (
    ActionResult,
    RTVIConfig,
    RTVIObserver,
    RTVIProcessor,
    TransportMessageUrgentFrame,
    RTVI_MESSAGE_LABEL,
    RTVIMessageLiteral,
    RTVIAction,
    RTVIActionArgument,
)
from pipecat.services.deepgram.stt import DeepgramSTTService
from pipecat.services.openai.llm import OpenAILLMService
from pipecat.transports.services.daily import DailyParams, DailyTransport
from pipecat_flows import FlowArgs, FlowManager
from src.constants.ai_models import LLMModels
from src.services.tts_factory import TTSFactory
from src.utils.logger import logger
from pydantic import BaseModel


load_dotenv(override=True)


class InterviewRTVIProcessor(RTVIProcessor):
    async def interrupt_bot(self):
        logger.info("InterviewRTVIProcessor: Interrupting bot...")
        await super().interrupt_bot()
        logger.info("InterviewRTVIProcessor: BotInterruptionFrame pushed upstream")


class InterviewRTVIObserver(RTVIObserver):
    async def on_push_frame(self, data: FramePushed):
        if isinstance(data.frame, BotInterruptionFrame):
            logger.info(
                f"Bot interruption frame detected: {data.frame} from {data.source.__class__.__name__} to {data.destination.__class__.__name__}"
            )
        await super().on_push_frame(data)


rtvi_instance = None
interview__flow_instance = None


async def end_interview_pipeline():
    logger.info("Ending interview session")
    if interview__flow_instance:
        await interview__flow_instance.stop()


class RTVISourcesMessage(BaseModel):
    """Model for sending sources to client via RTVI transport."""

    label: RTVIMessageLiteral = RTVI_MESSAGE_LABEL
    type: str = "sources"
    data: Dict[str, Any]


async def send_message_to_client(message):
    """
    Send generic message to the client via RTVI transport.

    Args:
        message: Message data to send to client
    """
    if not rtvi_instance:
        logger.warning("Cannot send message: RTVI instance not set")
        return

    try:

        message_model = RTVISourcesMessage(data=message)
        logger.info(f"Sending message to client using model approach")
        await rtvi_instance.push_frame(
            TransportMessageUrgentFrame(message=message_model.model_dump()),
            FrameDirection.DOWNSTREAM,
        )
        logger.info("Message sent to client via RTVI")
    except Exception as e:
        logger.error(f"Error sending message to client: {str(e)}")


class InterviewFlow:
    def __init__(
        self,
        url,
        bot_token,
        session_id,
        db_manager,
        flow_config_path="src/services/sde1_interview_flow.json",
        bot_name="Interviewer",
    ):
        self.url = url
        self.token = bot_token
        self.session_id = session_id
        self.bot_name = bot_name
        self.task: Optional[PipelineTask] = None
        self.runner: Optional[PipelineRunner] = None
        self.task_running = False
        self.db = db_manager

        self.flow_config = json.load(open(flow_config_path))

        self.stt = DeepgramSTTService(api_key=os.getenv("DEEPGRAM_API_KEY"))
        self.tts = TTSFactory.create_tts_service()
        self.llm = OpenAILLMService(
            api_key=os.getenv("OPENAI_API_KEY"),
            model=LLMModels.GPT_4_1,
        )
        context = OpenAILLMContext(
            messages=[
                {
                    "role": "system",
                    "content": """
                    You are an interviewer. Your responses should be clear, concise, and professional.
                    Keep your responses under 150 words. 
                    Your output will be converted to audio so don't include special characters in your answers. 
                    """,
                }
            ]
        )
        self.context_aggregator = self.llm.create_context_aggregator(context)
        self.stt_mute_filter = STTMuteFilter(
            stt_service=self.stt,
            config=STTMuteConfig(
                strategies={STTMuteStrategy.MUTE_UNTIL_FIRST_BOT_COMPLETE}
            ),
        )
        self.rtvi_config = RTVIConfig(
            config=[
                {"type": "speaking", "service": "rtvi", "options": []},
                {"type": "user_transcription", "service": "rtvi", "options": []},
                {"type": "bot_transcription", "service": "rtvi", "options": []},
                {"type": "bot_tts", "service": "rtvi", "options": []},
            ]
        )
        self.rtvi = InterviewRTVIProcessor(config=self.rtvi_config)
        globals()["rtvi_instance"] = self.rtvi
        globals()["interview__flow_instance"] = self
        self.rtvi_observer = InterviewRTVIObserver(rtvi=self.rtvi)

    @classmethod
    async def create(
        cls, url, bot_token, session_id, flow_config_path=None, bot_name="Interviewer"
    ):
        flow_config_path = flow_config_path or "src/services/devops_flow.json"
        return cls(url, bot_token, session_id, flow_config_path, bot_name)

    async def create_transport(self):
        self.aiohttp_session = aiohttp.ClientSession()

        self.transport = DailyTransport(
            room_url=self.url,
            token=self.token,
            bot_name=self.bot_name,
            params=DailyParams(
                turn_analyzer=FalSmartTurnAnalyzer(
                    api_key=os.getenv("FAL_API_KEY"),
                    aiohttp_session=self.aiohttp_session,
                    params=SmartTurnParams(
                        stop_secs=0.8,  # Time to wait after speech ends before considering turn complete
                        pre_speech_ms=0.0,  # No delay before starting to process speech
                        max_duration_secs=5.0,  # Maximum length of a single turn to maintain natural conversation
                        timeout_secs=3.0,  # Maximum time to wait for turn detection API response
                        retry_count=2,  # Number of times to retry failed turn detection requests
                        retry_delay=0.5,  # Time to wait between retry attempts
                    ),
                ),
                audio_out_enabled=True,  # Enable audio output for bot responses
                audio_out_sample_rate=48000,  # High-quality audio sampling rate
                audio_out_channels=1,  # Mono audio output for better compatibility
                audio_in_enabled=True,  # Enable audio input for user speech
                camera_out_enabled=True,  # Enable video output for bot
                camera_out_width=1024,  # High-resolution video width
                camera_out_height=768,  # High-resolution video height
                camera_out_framerate=30,  # Smooth video frame rate
                vad_analyzer=SileroVADAnalyzer(
                    params=VADParams(
                        stop_secs=0.1,  # Quick detection of speech end
                        threshold=0.5,  # Balance between sensitivity and noise rejection
                        min_speech_duration_ms=100,  # Ignore very short sounds to reduce false positives
                    ),
                ),
                audio_in_passthrough=True,  # Pass audio through VAD for real-time processing
            ),
        )

        @self.transport.event_handler("on_joined")
        async def on_joined(transport, participant):
            logger.info(f"Bot joined the session: {self.session_id}")

        @self.transport.event_handler("on_call_state_updated")
        async def on_call_state_updated(transport, state):
            logger.info(f"Call state updated: {state}")

        @self.transport.event_handler("on_first_participant_joined")
        async def on_first_participant_joined(transport, participant):
            if not self.task:
                return

            if not self.flow_manager:
                logger.error("Flow manager not initialized")
                return

            logger.info(f"First participant joined: {participant}")
            await self.flow_manager.initialize()
            pass

        @self.transport.event_handler("on_participant_left")
        async def on_participant_left(transport, participant, reason):
            logger.info(f"Participant left: {participant}, reason: {reason}")
            message_history = self.flow_manager.get_current_context()
            filtered_messages = [
                msg
                for msg in message_history
                if (msg["role"] == "user" or msg["role"] == "assistant")
            ]
            logger.debug(filtered_messages)

            try:
                session_data = {
                    "session_id": self.session_id,
                    "chat_history": json.dumps(filtered_messages),
                }
                self.db.execute_query("session_history", session_data)
                logger.info(
                    f"Chat history saved to session_history table for session {self.session_id}"
                )
            except Exception as e:
                logger.error(f"Failed to save chat history: {e}")

            await self.stop()

        @self.transport.event_handler("on_app_message")
        async def on_app_message(transport, participant, message):
            try:
                if isinstance(participant, dict) and isinstance(message, str):
                    logger.info(f"Received app message from {message}: {participant}")
                    return

                if isinstance(message, dict):
                    if message.get("type") == "end_session":
                        logger.info("Received end_session command")

                        await self.stop()
                    elif message.get("msg") == "interrupt":
                        logger.info(
                            "Interrupt message received, triggering bot interruption"
                        )
                        try:
                            await self.rtvi.interrupt_bot()
                            logger.info("Bot interruption triggered successfully")
                        except Exception as e:
                            logger.error(f"Failed to interrupt bot: {e}")
                    elif message.get("event") == "request-chat-history":
                        logger.info("Chat history request received")
                    else:
                        logger.info(f"Unhandled message type: {message}")
            except Exception as e:
                logger.error(f"Error handling app message: {e}")

    async def create_pipeline(self):
        if not hasattr(self, "transport") or not self.transport:
            raise Exception("Transport not initialized")

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

        self.task = PipelineTask(
            pipeline=pipeline,
            params=PipelineParams(
                allow_interruptions=True,  # Enable bot interruption for more natural conversation
                auto_enable_processors=True,  # Automatically enable all processors
                stream_processing=True,  # Process audio in real-time streams
                parallel_processing=True,  # Enable parallel processing of frames
                buffer_size=2048,  # Larger buffer for smoother audio processing
                max_queue_size=50,  # Smaller queue for faster processing of frames
                processing_timeout=5.0,  # Overall timeout for processing pipeline
                error_handling="retry",  # Automatically retry on processing errors
            ),
            observers=[self.rtvi_observer],
        )

        self.flow_manager = FlowManager(
            task=self.task,
            llm=self.llm,
            context_aggregator=self.context_aggregator,
            tts=self.tts,
            flow_config=self.flow_config,
        )

        async def handle_append_to_messages(
            rtvi: RTVIProcessor, service: str, arguments: Dict[str, Any]
        ) -> ActionResult:
            if "messages" in arguments and arguments["messages"]:
                for msg in arguments["messages"]:
                    self.context_aggregator.user()._context.messages.append(msg)
                print("Current context:", self.flow_manager.get_current_context())
                return True
            else:
                return False

        self.append_to_messages_action = RTVIAction(
            service="llm",
            action="append_to_messages",
            arguments=[
                RTVIActionArgument(name="messages", type="array"),
            ],
            result="bool",
            handler=handle_append_to_messages,
        )
        self.rtvi.register_action(self.append_to_messages_action)
        return self.task

    async def start(self):
        if self.runner and self.task_running:
            logger.warning("Runner is already running")
            return

        await self.create_transport()
        await self.create_pipeline()

        self.runner = PipelineRunner()

        try:
            logger.info("Starting interview flow pipeline...")
            logger.info(
                f"- Allow interruptions: {self.task.params.allow_interruptions}"
            )
            logger.info(
                f"- STT mute strategy: {self.stt_mute_filter._config.strategies}"
            )

            logger.info(f"Starting interview flow for session {self.session_id}")

            await self.runner.run(self.task)
            self.task_running = True

            logger.info(
                f"Interview flow pipeline running for session {self.session_id}"
            )

        except Exception as e:
            logger.error(f"Failed to start interview flow: {e}")
            if self.runner:
                self.task_running = False

            logger.info("Attempting to restart pipeline after error...")

            try:
                self.task = PipelineTask(
                    pipeline=self.task.pipeline,
                    params=self.task.params,
                    observers=[self.rtvi_observer],
                )
                await self.runner.run(self.task)
                self.task_running = True
            except Exception as recovery_error:
                logger.error(f"Failed to recover pipeline: {recovery_error}")
                raise RuntimeError(f"Failed to start interview flow: {e}")

    async def stop(self):
        try:
            # Save chat history when pipeline is canceled
            if hasattr(self, "flow_manager") and self.flow_manager:
                try:
                    message_history = self.flow_manager.get_current_context()
                    filtered_messages = [
                        msg
                        for msg in message_history
                        if (msg["role"] == "user" or msg["role"] == "assistant")
                    ]

                    session_data = {
                        "session_id": self.session_id,
                        "chat_history": json.dumps(filtered_messages),
                    }
                    self.db.execute_query("session_history", session_data)
                    logger.info(
                        f"Chat history saved to session_history table for session {self.session_id}"
                    )
                except Exception as e:
                    logger.error(
                        f"Failed to save chat history during pipeline cancellation: {e}"
                    )

            if self.task:
                logger.info("Canceling pipeline task")
                try:
                    await self.task.cancel()
                    logger.info("Pipeline task cancelled successfully")
                except asyncio.CancelledError:
                    pass
                except Exception as e:
                    logger.error(f"Error cancelling pipeline task: {e}")
                finally:
                    self.task = None
                    self.task_running = False

            if hasattr(self, "aiohttp_session"):
                await self.aiohttp_session.close()

        except Exception as e:
            logger.error(f"Error stopping interview flow: {e}")
