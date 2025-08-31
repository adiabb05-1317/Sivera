from pipecat.services.cartesia.tts import CartesiaTTSService
from pipecat.services.elevenlabs.tts import ElevenLabsTTSService
from pipecat.services.google.tts import GoogleTTSService
from pipecat.services.rime.tts import RimeTTSService
from pipecat.transcriptions.language import Language
from pipecat.services.aws.tts import AWSPollyTTSService
from pipecat.transcriptions.language import Language
import logging

from src.core.config import Config

logger = logging.getLogger(__name__)


class TTSFactory:
    @staticmethod
    def create_tts_service(provider=None):
        """
        Create a TTS service based on the configuration or specified provider.

        Args:
            provider (str, optional): The TTS provider to use. If not provided,
                                      it will be read from the configuration.

        Returns:
            Either ElevenLabsTTSService or CartesiaTTSService.

        Raises:
            ValueError: If provider is not supported or required API keys are missing.
        """
        config = Config.TTS_CONFIG
        if provider is None:
            provider = config["provider"]

        if provider == "elevenlabs":
            elevenlabs_config = config["elevenlabs"]
            api_key = elevenlabs_config["api_key"]
            if not api_key:
                raise ValueError("ElevenLabs API key is required but missing")

            return ElevenLabsTTSService(
                api_key=api_key,
                voice_id=elevenlabs_config["voice_id"],
                model=elevenlabs_config["model"],
                stability=elevenlabs_config["stability"],
                clarity=elevenlabs_config["clarity"],
                similarity_boost=elevenlabs_config["similarity_boost"],
                params=ElevenLabsTTSService.InputParams(
                    language=Language.EN_US,
                    optimize_streaming_latency="1",
                ),
            )
        elif provider == "cartesia":
            cartesia_config = config["cartesia"]
            api_key = cartesia_config["api_key"]
            if not api_key:
                raise ValueError("Cartesia API key is required but missing")

            voice_controls = cartesia_config.get("voice_controls", None)
            return CartesiaTTSService(
                api_key=api_key,
                voice_id=cartesia_config["voice_id"],
                model=cartesia_config["model"],
                sample_rate=cartesia_config["sample_rate"],
                voice_controls=voice_controls,
            )
        elif provider == "rime":
            rime_config = config["rime"]
            api_key = rime_config["api_key"]
            if not api_key:
                raise ValueError("Rime API key is required but missing")

            return RimeTTSService(
                api_key=api_key,
                voice_id=rime_config["voice_id"],
                model=rime_config["model"],
                sample_rate=rime_config["sample_rate"],
            )
        elif provider == "google":
            google_config = config["google"]

            return GoogleTTSService(
                credentials_path=google_config["credentials_path"],
                voice_id=google_config["voice_id"],
                sample_rate=google_config["sample_rate"],
                params=GoogleTTSService.InputParams(
                    language=Language.EN,
                ),
            )

        elif provider == "aws":
            aws_config = config["aws_polly"]
            return AWSPollyTTSService(
                aws_access_key_id=aws_config["aws_access_key_id"],
                api_key=aws_config["aws_secret_access_key"],
                region=aws_config["region"],
                voice_id=aws_config["voice_id"],
                params=AWSPollyTTSService.InputParams(
                    engine=aws_config["engine"], 
                    language=Language.EN, 
                    rate=aws_config["rate"], 
                    volume=aws_config["volume"]
                ),
            )

        else:
            raise ValueError(f"Unsupported TTS provider: {provider}")

    @staticmethod
    async def cleanup_tts_service(tts_service):
        """
        Clean up TTS service resources to prevent memory leaks.
        
        Args:
            tts_service: The TTS service instance to clean up
        """
        if tts_service:
            try:
                if hasattr(tts_service, "close"):
                    await tts_service.close()
                elif hasattr(tts_service, "__del__"):
                    del tts_service
            except Exception as e:
                logger.warning(f"Error cleaning up TTS service: {e}")
