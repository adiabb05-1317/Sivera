import asyncio
import json
import os
from typing import Any, Dict, Optional

from dotenv import load_dotenv
from pipecat.audio.vad.silero import SileroVADAnalyzer, VADParams
from pipecat.frames.frames import BotInterruptionFrame
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineParams, PipelineTask
from pipecat.processors.aggregators.openai_llm_context import OpenAILLMContext
from pipecat.processors.filters.stt_mute_filter import (
    STTMuteConfig,
    STTMuteFilter,
    STTMuteStrategy,
)
from pipecat.processors.frame_processor import Frame, FrameDirection, FrameProcessor
from pipecat.processors.frameworks.rtvi import (
    ActionResult,
    RTVIAction,
    RTVIActionArgument,
    RTVIConfig,
    RTVIObserver,
    RTVIProcessor,
    TransportMessageUrgentFrame,
)
from pipecat.services.deepgram.stt import DeepgramSTTService
from pipecat.services.openai.llm import OpenAILLMService
from pipecat.transports.services.daily import DailyParams, DailyTransport
from pipecat_flows import FlowArgs, FlowManager
from src.constants.ai_models import LLMModels
from src.services.tts_factory import TTSFactory
from src.utils.logger import logger

load_dotenv(override=True)


class InterviewRTVIProcessor(RTVIProcessor):
    async def interrupt_bot(self):
        logger.info("InterviewRTVIProcessor: Interrupting bot...")
        await super().interrupt_bot()
        logger.info("InterviewRTVIProcessor: BotInterruptionFrame pushed upstream")


class InterviewRTVIObserver(RTVIObserver):
    async def on_push_frame(
        self,
        src: FrameProcessor,
        dst: FrameProcessor,
        frame: Frame,
        direction: FrameDirection,
        timestamp: int,
    ):
        if isinstance(frame, BotInterruptionFrame):
            logger.info(
                f"Bot interruption frame detected: {frame} from {src.__class__.__name__} to {dst.__class__.__name__}"
            )
        await super().on_push_frame(src, dst, frame, direction, timestamp)


rtvi_instance = None


class InterviewFlow:
    def __init__(
        self,
        url,
        bot_token,
        session_id,
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
                    "content": "You are an interviewer. Your responses should be clear, concise, and professional. Keep your responses under 150 words.",
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
        self.rtvi_observer = InterviewRTVIObserver(rtvi=self.rtvi)

    @classmethod
    async def create(
        cls, url, bot_token, session_id, flow_config_path=None, bot_name="Interviewer"
    ):
        flow_config_path = flow_config_path or "src/services/devops_flow.json"
        return cls(url, bot_token, session_id, flow_config_path, bot_name)

    async def create_transport(self):
        self.transport = DailyTransport(
            room_url=self.url,
            token=self.token,
            bot_name=self.bot_name,
            params=DailyParams(
                join_as_owner=False,
                audio_out_enabled=True,
                audio_out_sample_rate=48000,
                audio_out_channels=1,
                mic_enabled=True,
                cam_enabled=False,
                vad_enabled=True,
                vad_analyzer=SileroVADAnalyzer(
                    sample_rate=16000,
                    params=VADParams(
                        threshold=0.5,
                        min_speech_duration_ms=250,
                        min_silence_duration_ms=100,
                    ),
                ),
                vad_audio_passthrough=True,
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
            await self.stop()

        @self.transport.event_handler("on_app_message")
        async def on_app_message(transport, participant, message):
            try:
                # Check if message is a string (participant ID)
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
                        # Handle chat history request if needed
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
                allow_interruptions=True,
                auto_enable_processors=True,
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

        except Exception as e:
            logger.error(f"Error stopping interview flow: {e}")
