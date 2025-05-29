from pipecat.services.cartesia.tts import CartesiaTTSService
from pipecat.services.elevenlabs.tts import ElevenLabsTTSService
from pipecat.services.rime.tts import RimeTTSService

# from pipecat.services.google.tts import GoogleTTSService
from pipecat.transcriptions.language import Language

from src.core.config import Config


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
        else:
            raise ValueError(f"Unsupported TTS provider: {provider}")
