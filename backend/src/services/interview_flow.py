import asyncio
from datetime import datetime
import json
import os
from typing import Any, Dict, Optional
import uuid

import aiohttp

from dotenv import load_dotenv
from src.core.config import Config
from pipecat.audio.vad.silero import SileroVADAnalyzer, VADParams
from pipecat.frames.frames import BotInterruptionFrame
from pipecat.observers.base_observer import FramePushed
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineParams, PipelineTask
from pipecat.processors.aggregators.openai_llm_context import OpenAILLMContext
from pipecat.processors.filters.stt_mute_filter import (
    STTMuteConfig,
    STTMuteFilter,
    STTMuteStrategy,
)
from pipecat.processors.frame_processor import FrameDirection
from pipecat.processors.frameworks.rtvi import (
    RTVI_MESSAGE_LABEL,
    ActionResult,
    RTVIAction,
    RTVIActionArgument,
    RTVIConfig,
    RTVIMessageLiteral,
    RTVIObserver,
    RTVIProcessor,
    TransportMessageUrgentFrame,
)
from pipecat.services.deepgram.stt import DeepgramSTTService
from pipecat.transports.services.daily import DailyParams, DailyTransport
from pipecat_flows import FlowManager
from pydantic import BaseModel

from src.services.llm_factory import LLMFactory
from src.services.tts_factory import TTSFactory
from src.services.analytics import InterviewAnalytics
from src.utils.logger import logger
from src.utils.resume_extractor import fetch_and_process_resume

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
        logger.info("Sending message to client using model approach")
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
        job_id=None,
        candidate_id=None,
        bot_name="Sia",
        linkedin_profile=None,
        additional_links=None,
    ):
        self.url = url
        self.token = bot_token
        self.session_id = session_id
        self.job_id = job_id
        self.candidate_id = candidate_id
        self.bot_name = bot_name
        self.task: Optional[PipelineTask] = None
        self.runner: Optional[PipelineRunner] = None
        self.task_running = False
        self.db = db_manager
        self.interview_start_time = None  # Track when interview starts

        # TODO: here call linkedin api to get the profile
        # also get the additional links and their important information

        self.additional_links = additional_links or []
        self.additional_links_info = []
        if self.additional_links:
            # Scrape all links concurrently for better performance
            from src.utils.link_scraper import scrape_multiple_links_sync
            self.additional_links_info = scrape_multiple_links_sync(self.additional_links)

        if self.job_id:
            self.job = self.db.fetch_one("jobs", {"id": self.job_id})
            self.interview = self.db.fetch_one("interviews", {"job_id": self.job_id})
            self.flow_config = self.db.fetch_one(
                "interview_flows", {"id": self.job.get("flow_id")}
            )["flow_json"]
            self.skills = self.job.get("skills")
            logger.info(f"Skills: {self.skills}")
            self.candidate = self.db.fetch_one("candidates", {"id": candidate_id})
            self.candidate_name = self.candidate.get("name")
            self.job_title = self.job.get("title")
            self.resume_url = self.candidate.get("resume_url")
            self.db.update("candidate_interviews", {"room_url": self.url, "bot_token": self.token}, {"candidate_id": self.candidate_id, "interview_id": self.interview.get("id")})
        else:
            # this is just for testing
            with open("src/services/flows/default.json", "r") as f:
                self.flow_config = json.load(f)
            self.candidate_name = "Mithra"
            self.job_title = "Google AI Platform, Cloud Engineer"
            self.resume_url = "https://glttawcpverjawfrbohm.supabase.co/storage/v1/object/sign/resumes/mithra_1751825465503.pdf?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8wMTYzZjAwNS0xZDVlLTQ3NDEtYjJhYi0yNjQ0MWYwYTg4MzYiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJyZXN1bWVzL21pdGhyYV8xNzUxODI1NDY1NTAzLnBkZiIsImlhdCI6MTc1MTg4NjIzNiwiZXhwIjoxNzgzNDIyMjM2fQ.2v2JMRGbAMVKAecynxbjC3oHsMDcQpYWZjBl6Tw6jig"
            self.skills = ["Java", "Python", "Langchain", "RabbitMQ", "AWS"]

        # Fetch resume content during initialization
        self.resume = fetch_and_process_resume(self.resume_url, self.candidate_name)

        self.stt = DeepgramSTTService(api_key=os.getenv("DEEPGRAM_API_KEY"))
        self.tts = TTSFactory.create_tts_service()
        self.llm = LLMFactory.create_llm_service()

        # Get formatted links information
        links_info = self.get_formatted_links_info()

        tts_instructions = ""
        if Config.TTS_CONFIG["provider"] == "rime":
            tts_instructions =   f"""
                Punctuation serves many purposes in normal writing, it indicates sentence structural things like sentence breaks and questions, but it also serves to indicate pronunciation cues, such as commas for pauses and exclamation points for excitement.

                Questions:
                    1) what do you mean.	(a simple period at the end of the sentence renders it a non-question)
                    2) what do you mean?	(a simple question mark indicates an unmarked question)
                    3) what do you mean?!	(adding an exclamation point makes the question more excited)
                    4) what do you mean!?	(changing the order of the exclamation point and question mark makes a different sort of question)
                    5) what do you mean??	(multiple question marks can also change the type of question prosody)

                False Starts
                    1) i i think it’s pretty cool	(putting a word twice in a row can create more realistic, flawed human speech)
                    2) i- i think it’s pretty cool	(adding a dash immediately after some words can give a cut-off, false start sort of realism)

                Pauses
                    1) so it’s kind of funny.	(without any comma, there will be no pause)
                    2) so, it’s kind of funny.	(adding a comma creates a slight pause)
                    3) so. it’s kind of funny.	(adding a period creates a longer pause)
                
                Numbers
                    Ordinal Numbers
                    Desired Output	(Input)
                    1) One hundred and twenty-three	(123)
                    2) Two thousand and twenty-two	(2,022)
                    3) Four zero	(4 0)
                    4) Forty	(40)

                    Years
                    Desired Output	(Input)
                    1) Twenty twenty two	(2022)

                    Cardinal Numbers
                    Desired Output	(Input)
                    1) Fifth	(5th)

                    Phone Numbers
                    Desired Output	(Input)
                    1) Five five five, seven seven two, nine one four zero	((555)-265-9076)
                    2) Five five five, seven seven two, nine one four zero	(555-772-9140)
                    3) Five five five, seven seven two, nine one four zero	(5 5 5, 7 7 2, 9 1 4 0)

                    Decimals
                    Desired Output	(Input)
                    1) Zero point seven five	(0.75)
                    2) Zero point seven five	(0 point 7 5)

                    Currency
                    Desired Output	(Input)
                    1) Seven dollars, ninety five cents	($7.95)
                    2) One thousand and forty-five dollars, ninety six cents	($1,045.96)
                    3) One thousand and forty-five dollars, ninety six cents	($1045.96)

                    Units of Measurement
                    Desired Output	(Input)
                    1) Five kilograms	(5kg)
                    2) Seventy degrees Fahrenheit	(70°F)

                Dates & Times
                    Desired Output	(Input)
                    1) October twelfth, twenty twenty-four	(10/12/2024)
                    2) March fifteenth, twenty twenty-three	(March 15, 2023)
                    3) January first	(January 1st)
                    4) January first	(Jan. 1)

                    Times
                    Desired Output	(Input)
                    1) Ten thirty A M	(10:30 am)
                    2) Ten thirty A M	(10:30am)
                    3) Ten thirty A M	(10:30 AM)
                    4) Two o’clock P M	(2 o’clock p. m.)

                Abbreviations, Acronyms, and Initialisms
                    Desired Output	(Input)
                    1) Doctor Smith	(Dr. Smith)
                    2) For example	(e.g.)
                    3) Road	(rd.)
                    4) Saint John	(St. John)

                    Acronyms and Initialisms
                    Acronyms are pronounced as a single word, for example, NASA is pronounced as “Nasa”. Initialisms are pronounced as a series of letters, for example DNA is pronounced as “D N A”.
                    By default Rime will pronounce a series of capital letters as acronyms, i.e. as a single word. However, for many common initialisms, e.g. DNA, ID, USA, FBI, CIA, etc., Rime will automatically pronounce them correctly as a series of letters.
                    That being said, to ensure that initialisms are pronounced correctly as a series of letters, the best practice is to use lower case and put a period and space after each letter.
                    Desired Output	(Input)
                    1) Nasa	(NASA)
                    2) D N A	(DNA)
                    3) D N A	(d. n. a.)
                    4) UPS	(u. p. s.)
                    5) GPA	(g. p. a.)

                Symbols and Percentages
                    Desired Output	(Input)
                    1) And	(&)
                    2) Dollar	($)
                    3) Percent	(%)
                    4) One hundred percent	(100%)
                    5) Hash	(#)
                
                Addresses, URLs, and Emails
                    Addresses
                    While Rime will typically pronounce state name abbreviations correctly in the context of an address, best practice is to write out the full state name, e.g. “Massachusetts” instead of “MA”, to get consistent results. Common street abbreviations, e.g. “Rd.” or “St.”, will automatically be pronounced correctly.
                    Desired Output	(Input)
                    1) Five twenty-nine main street, boston, massachusetts, zero two one two nine	(529 Main St., Boston, Massachusetts 02129)
                    2) Five twenty-nine main street, boston, massachusetts, zero two one two nine	(529 Main St., Boston, MA 02129)
                    3) Five twenty-nine main street, boston, massachusetts, zero two one two nine	(529 Main Street, Boston, MA 02129)
                    4) Five twenty-nine main street, boston, massachusetts, zero two one two nine	(529 Main St, Boston, MA 02129)

                URLs
                    Desired Output	(Input)
                    1) Double-u double-u double-u dot example dot com	(www.example.com)
                    2) H t t p s colon slash slash double-u double-u double-u dot rime dot ai slash dashboard	(https://rime.ai/dashboard)

                Emails
                    Desired Output	(Input)
                    1) Name at example dot com	(name@example.com)
            """
            
        # TODO: add instructions for other TTS providers
        elif Config.TTS_CONFIG["provider"] == "elevenlabs":
            tts_instructions = f"""
                TTS Provider: {Config.TTS_CONFIG["provider"]} 
            """
        elif Config.TTS_CONFIG["provider"] == "cartesia":
            tts_instructions = f"""
                TTS Provider: {Config.TTS_CONFIG["provider"]} 
            """
        elif Config.TTS_CONFIG["provider"] == "google":
            tts_instructions = f"""
                TTS Provider: {Config.TTS_CONFIG["provider"]} 
            """

        system_prompt = f"""Your name is {self.bot_name}. You are an interviewer conducting an interview for the position of {self.job_title}.
        Your responses should be clear, concise, and professional.
        Keep your replies very short, as they will be read aloud. Make them conversational, without using any special characters or formatting.

        IMPORTANT:
        Follow the instructions for giving the replies, as they will be read aloud:
        {tts_instructions}

        You are allowed to ask follow-up questions.
        You will be speaking with {self.candidate_name}.

        IMPORTANT:
        - You do not need to be kind or friendly. You are not the candidate's friend, mentor, or coach. You are an interviewer.
        - Don't expect the candidate to be extremely detailed in their responses. You can expect them to sometimes skip over some details.
        - Your job is to assess the candidate’s skills and experience. Be strict and critical in your evaluation.
        - Spend most of the time asking questions based on the skills required for the job.
        - If the candidate absolutely doesn't know something or asks for help, offer only a very subtle hint.

        Begin by greeting the candidate by name. i.e "Hey {self.candidate_name}" and introduce yourself as {self.bot_name} then proceed with the interview.
        You will be asking question based on the skills required for the job, which are: {self.skills}

        Information about the candidate:
            Candidate Name: {self.candidate_name}
            Job Title: {self.job_title}
            Resume: {self.resume}
            Additional Links: {self.additional_links}
            Additional Links Information: {links_info}
        """

        self._inject_dynamic_content_into_flow(system_prompt)

        context = OpenAILLMContext(
            messages=[
                {
                    "role": "system",
                    "content": system_prompt.strip(),
                },
            ]
        )
        self.context_aggregator = self.llm.create_context_aggregator(context)
        self.stt_mute_filter = STTMuteFilter(
            stt_service=self.stt,
            config=STTMuteConfig(strategies={STTMuteStrategy.MUTE_UNTIL_FIRST_BOT_COMPLETE}),
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
    async def create(cls, url, bot_token, session_id, db_manager, job_id, bot_name="Sia"):
        return cls(url, bot_token, session_id, db_manager, job_id, bot_name)

    async def create_transport(self):
        self.aiohttp_session = aiohttp.ClientSession()

        self.transport = DailyTransport(
            room_url=self.url,
            token=self.token,
            bot_name=self.bot_name,
            params=DailyParams(
                # TODO: I don't see this contributing that much, or might need to finetune params.
                # turn_analyzer=FalSmartTurnAnalyzer(
                #     api_key=os.getenv("FAL_API_KEY"),
                #     aiohttp_session=self.aiohttp_session,
                #     params=SmartTurnParams(
                #         stop_secs=2,  # Time to wait after speech ends before considering turn complete
                #         pre_speech_ms=0.3,  # No delay before starting to process speech
                #         max_duration_secs=8.0,  # Maximum length of a single turn to maintain natural conversation
                #     ),
                # ),
                audio_out_enabled=True,
                audio_out_sample_rate=48000,
                audio_out_channels=1,
                audio_in_enabled=True,
                camera_out_enabled=True,
                camera_out_width=1024,
                camera_out_height=768,
                camera_out_framerate=30,
                vad_analyzer=SileroVADAnalyzer(
                    params=VADParams(
                        stop_secs=0.1,
                    ),
                ),
                audio_in_passthrough=True,
            ),
        )

        @self.transport.event_handler("on_joined")
        async def on_joined(_transport, _participant):
            logger.info(f"Bot joined the session: {self.session_id}")

        @self.transport.event_handler("on_call_state_updated")
        async def on_call_state_updated(_transport, state):
            logger.info(f"Call state updated: {state}")

        @self.transport.event_handler("on_first_participant_joined")
        async def on_first_participant_joined(_transport, participant):
            if not self.task:
                return

            if not self.flow_manager:
                logger.error("Flow manager not initialized")
                return

            logger.info(f"First participant joined: {participant}")
            # Start the interview timer
            self.interview_start_time = datetime.now()
            logger.info(f"Interview timer started at: {self.interview_start_time}")
            await self.flow_manager.initialize()
            pass

        @self.transport.event_handler("on_participant_left")
        async def on_participant_left(_transport, participant, reason):
            logger.info(f"Participant left: {participant}, reason: {reason}")
            await self.stop()

        @self.transport.event_handler("on_app_message")
        async def on_app_message(_transport, participant, message):
            try:
                if isinstance(participant, dict) and isinstance(message, str):
                    logger.info(f"Received app message from {message}: {participant}")
                    return

                if isinstance(message, dict):
                    if message.get("type") == "end_session":
                        logger.info("Received end_session command")

                        await self.stop()
                    elif message.get("msg") == "interrupt":
                        logger.info("Interrupt message received, triggering bot interruption")
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
            _rtvi: RTVIProcessor, _service: str, arguments: Dict[str, Any]
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
            logger.info(f"- Allow interruptions: {self.task.params.allow_interruptions}")
            logger.info(f"- STT mute strategy: {self.stt_mute_filter._config.strategies}")

            logger.info(f"Starting interview flow for session {self.session_id}")

            await self.runner.run(self.task)
            self.task_running = True

            logger.info(f"Interview flow pipeline running for session {self.session_id}")

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
                raise RuntimeError(f"Failed to start interview flow: {e}") from None

    async def stop(self):
        try:
            # Calculate interview duration if not already done
            interview_duration_seconds = None
            interview_end_time = None
            if self.interview_start_time:
                interview_end_time = datetime.now()
                duration = interview_end_time - self.interview_start_time
                interview_duration_seconds = duration.total_seconds()
                logger.info(
                    f"Interview duration on stop: {interview_duration_seconds} seconds ({duration})"
                )

            # Save chat history when pipeline is canceled
            if hasattr(self, "flow_manager") and self.flow_manager:
                try:
                    message_history = self.flow_manager.get_current_context()
                    filtered_messages = [
                        msg
                        for msg in message_history
                        if (msg["role"] == "user" or msg["role"] == "assistant")
                    ]

                    merged_messages = []
                    current_user_message = ""
                    current_role = None

                    for msg in filtered_messages:
                        if msg["role"] == "user":
                            if current_role == "user":
                                current_user_message += msg["content"]
                            else:
                                if current_role is not None:
                                    merged_messages.append({"role": current_role, "content": current_user_message})
                                current_user_message = msg["content"]
                            current_role = "user"
                        else:
                            if current_role == "user":
                                merged_messages.append({"role": current_role, "content": current_user_message})
                                current_user_message = ""
                            merged_messages.append(msg)
                            current_role = "assistant"

                    if current_role == "user" and current_user_message:
                        merged_messages.append({"role": current_role, "content": current_user_message})

                    filtered_messages = merged_messages

                    session_data = {
                        "id": str(uuid.uuid4()),
                        "chat_history": json.dumps(filtered_messages),
                        "call_type": "web_interview",
                        "call_id": self.session_id,
                    }
                    self.db.execute_query("session_history", session_data)
                    logger.info(
                        f"Chat history saved to session_history table for session {self.session_id}"
                    )

                    # Also save analytics if we have candidate and interview data
                    if (
                        hasattr(self, "candidate_id")
                        and hasattr(self, "interview")
                        and interview_duration_seconds is not None
                    ):
                        try:
                            self.db.update("candidate_interviews", {
                                "status": "Completed",
                                "updated_at": datetime.now().isoformat(),
                                "completed_at": interview_end_time.isoformat(),
                            }, {
                                "candidate_id": self.candidate_id,
                                "interview_id": self.interview.get("id")
                            })
                            logger.info(
                                f"Candidate interview updated for candidate {self.candidate_id} and interview {self.interview.get('id')}"
                            )

                            self.db.update("candidates", {
                                "status": "Interviewed",
                                "updated_at": datetime.now().isoformat(),
                            }, {
                                "id": self.candidate_id
                            })
                            logger.info(
                                f"Candidate updated for candidate {self.candidate_id}"
                            )

                            candidate_interview_id = self.db.fetch_one(
                                "candidate_interviews",
                                {
                                    "candidate_id": self.candidate_id,
                                    "interview_id": self.interview.get("id")
                                },
                            )
                            if candidate_interview_id:
                                analytics_service = InterviewAnalytics()
                                analytics = await analytics_service.analyze_interview(filtered_messages)
                                details = {
                                    "interview_duration_seconds": interview_duration_seconds,
                                    "interview_start_time": self.interview_start_time.isoformat(),
                                    "interview_end_time": interview_end_time.isoformat(),
                                }

                                analytics.update(details)

                                logger.info(
                                    f"Interview analytics calculated for candidate {self.candidate_id} and interview {self.interview.get('id')}"
                                )

                                ix = str(uuid.uuid4())
                                self.db.execute_query("interview_analytics", {
                                    "id": ix,
                                    "interview_id": self.interview.get("id"),
                                    "organization_id": self.job.get("organization_id"),
                                    "candidate_id": self.candidate_id,
                                    "candidate_interview_id": candidate_interview_id.get("id"),
                                    "data": analytics,
                                })

                                self.db.execute_query(
                                    "interview_sessions",
                                    {
                                        "candidate_interview_id": candidate_interview_id.get("id"),
                                        "session_history": session_data.get("id"),
                                        "created_at": self.interview_start_time.isoformat(),
                                        "updated_at": interview_end_time.isoformat(),
                                        "analytics": ix,
                                        "status": "Completed",
                                    },
                                )
                                logger.info("Analytics with duration saved during stop()")
                        except Exception as e:
                            logger.error(f"Failed to save analytics during stop(): {e}")

                except Exception as e:
                    logger.error(f"Failed to save chat history during pipeline cancellation: {e}")

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

    def _inject_dynamic_content_into_flow(self, context):
        """
        Inject dynamic content (candidate name, job title, resume) into flow config role_messages.
        """
        if not self.flow_config or not isinstance(self.flow_config, dict):
            return

        # Iterate through all nodes in the flow config
        nodes = self.flow_config.get("nodes", {})
        for node_name, node_config in nodes.items():
            role_messages = node_config.get("role_messages", [])

            for message in role_messages:
                if message.get("role") == "system":
                    # Append candidate context to existing system message
                    original_content = message.get("content", "")
                    message["content"] = original_content + context

        logger.info("Dynamic content injected into flow config")

    def _scrape_link(self, link: str) -> Dict[str, Any]:
        """
        Scrape a single link for comprehensive information.
        Uses the link_scraper utility for the actual scraping logic.
        
        Args:
            link: The URL to scrape
            
        Returns:
            Dictionary containing scraped information
        """
        from src.utils.link_scraper import scrape_link_sync
        
        try:
            logger.info(f"Scraping link: {link}")
            result = scrape_link_sync(link)
            logger.info(f"Successfully scraped link: {link} - Type: {result.get('type', 'unknown')}")
            return result
        except Exception as e:
            logger.error(f"Error scraping link {link}: {e}")
            return {"error": str(e), "url": link}

    def get_formatted_links_info(self) -> str:
        """
        Get formatted string representation of all scraped links information.
        This can be used to include in the system prompt or for analysis.
        
        Returns:
            Formatted string containing all scraped links information
        """
        if not self.additional_links_info:
            return ""
        
        formatted_info = []
        for i, info in enumerate(self.additional_links_info, 1):
            if "error" in info:
                formatted_info.append(f"Link {i}: {info['url']} - Error: {info['error']}")
                continue
            
            link_type = info.get("type", "unknown")
            url = info.get("url", "")
            title = info.get("title", "")
            description = info.get("description", "")
            
            section = f"Link {i} ({link_type.upper()}): {url}"
            if title:
                section += f"\nTitle: {title}"
            if description:
                section += f"\nDescription: {description}"
            
            # Add type-specific information
            if link_type == "github":
                if info.get("languages"):
                    section += f"\nLanguages: {', '.join(info['languages'])}"
                if info.get("topics"):
                    section += f"\nTopics: {', '.join(info['topics'])}"
                if info.get("readme"):
                    section += f"\nREADME: {info['readme'][:200]}..."
                    
            elif link_type == "portfolio":
                if info.get("skills"):
                    section += f"\nSkills: {', '.join(info['skills'])}"
                if info.get("projects"):
                    projects = [p.get("title", "") for p in info["projects"]]
                    section += f"\nProjects: {', '.join(projects)}"
                    
            elif link_type == "document":
                if info.get("summary"):
                    section += f"\nSummary: {info['summary']}"
                    
            formatted_info.append(section)
        
        return "\n\n".join(formatted_info)
