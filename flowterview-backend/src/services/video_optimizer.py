import os
import subprocess
import tempfile
import shutil
import logging
from typing import Optional, Tuple
from pathlib import Path

logger = logging.getLogger(__name__)

class VideoOptimizer:
    """Service for optimizing video files for web streaming."""
    
    def __init__(self):
        self.temp_dir = tempfile.mkdtemp(prefix="video_optimizer_")
        logger.info(f"🎬 VideoOptimizer initialized with temp dir: {self.temp_dir}")
    
    def __del__(self):
        """Cleanup temp directory on destruction."""
        try:
            if os.path.exists(self.temp_dir):
                shutil.rmtree(self.temp_dir)
                logger.info(f"🧹 Cleaned up temp dir: {self.temp_dir}")
        except Exception as e:
            logger.warning(f"⚠️ Failed to cleanup temp dir: {e}")
    
    def optimize_webm_for_streaming(self, input_path: str, output_path: Optional[str] = None, force_optimize: bool = False) -> Tuple[bool, str]:
        """
        Optimize WebM file for web streaming by moving metadata to beginning.
        
        Args:
            input_path: Path to input WebM file
            output_path: Path for optimized output (optional, will generate if None)
            
        Returns:
            Tuple of (success: bool, output_path: str)
        """
        try:
            if not os.path.exists(input_path):
                logger.error(f"❌ Input file not found: {input_path}")
                return False, ""
            
            # Generate output path if not provided
            if output_path is None:
                input_file = Path(input_path)
                output_path = str(input_file.parent / f"{input_file.stem}_optimized{input_file.suffix}")
            
            logger.info(f"🎬 Optimizing WebM for streaming: {input_path} -> {output_path}")
            
            # Check if ffmpeg is available
            if not self._check_ffmpeg():
                logger.error("❌ FFmpeg not available - cannot optimize video")
                return False, ""
            
            # Get original file info
            original_info = self._get_video_info(input_path)
            if original_info:
                logger.info(f"📊 Original file: {original_info}")
            
            # Check file size - skip optimization for very large files unless forced
            file_size = os.path.getsize(input_path)
            from src.core.config import Config
            max_size_for_optimization = Config.VIDEO_OPTIMIZATION_MAX_SIZE_MB * 1024 * 1024
            
            if not force_optimize and file_size > max_size_for_optimization:
                logger.info(f"📏 File too large ({file_size / 1024 / 1024:.1f}MB) - skipping optimization")
                return True, input_path  # Return original file as "optimized"
            
            # Optimize WebM for web streaming
            success = self._run_ffmpeg_optimization(input_path, output_path)
            
            if success:
                # Get optimized file info
                optimized_info = self._get_video_info(output_path)
                if optimized_info:
                    logger.info(f"📊 Optimized file: {optimized_info}")
                
                # Verify the optimized file is valid
                if self._verify_video_file(output_path):
                    logger.info(f"✅ WebM optimization successful: {output_path}")
                    return True, output_path
                else:
                    logger.error(f"❌ Optimized file verification failed: {output_path}")
                    return False, ""
            else:
                logger.error(f"❌ WebM optimization failed")
                return False, ""
                
        except Exception as e:
            logger.error(f"❌ Error optimizing WebM: {e}")
            return False, ""
    
    def _check_ffmpeg(self) -> bool:
        """Check if FFmpeg is available on the system."""
        try:
            result = subprocess.run(['ffmpeg', '-version'], 
                                  capture_output=True, text=True, timeout=10)
            return result.returncode == 0
        except (subprocess.TimeoutExpired, FileNotFoundError, subprocess.SubprocessError):
            return False
    
    def _get_video_info(self, file_path: str) -> Optional[dict]:
        """Get video file information using ffprobe."""
        try:
            cmd = [
                'ffprobe', '-v', 'quiet', '-print_format', 'json',
                '-show_format', '-show_streams', file_path
            ]
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            
            if result.returncode == 0:
                import json
                info = json.loads(result.stdout)
                
                format_info = info.get('format', {})
                video_stream = next((s for s in info.get('streams', []) if s.get('codec_type') == 'video'), {})
                audio_stream = next((s for s in info.get('streams', []) if s.get('codec_type') == 'audio'), {})
                
                return {
                    'duration': format_info.get('duration'),
                    'size': format_info.get('size'),
                    'bit_rate': format_info.get('bit_rate'),
                    'video_codec': video_stream.get('codec_name'),
                    'audio_codec': audio_stream.get('codec_name'),
                    'width': video_stream.get('width'),
                    'height': video_stream.get('height'),
                    'fps': video_stream.get('r_frame_rate')
                }
        except Exception as e:
            logger.warning(f"⚠️ Could not get video info: {e}")
        
        return None
    
    def _run_ffmpeg_optimization(self, input_path: str, output_path: str) -> bool:
        """
        Run FFmpeg to optimize WebM for web streaming.
        
        This re-encodes the video with:
        - Metadata moved to beginning (faststart equivalent for WebM)
        - Optimized keyframe intervals
        - Proper codec settings for web playback
        """
        try:
            # FFmpeg command for fast WebM optimization with proper seeking
            cmd = [
                'ffmpeg',
                '-i', input_path,
                '-c:v', 'libvpx',               # VP8 codec for faster encoding
                '-crf', '25',                   # Slightly better quality
                '-b:v', '0',                    # Let CRF control bitrate
                '-deadline', 'realtime',        # Fastest encoding speed
                '-cpu-used', '8',               # Maximum speed optimization
                '-g', '30',                     # Keyframe interval (every 30 frames)
                '-keyint_min', '30',            # Minimum keyframe interval
                '-auto-alt-ref', '1',           # Enable alternate reference frames
                '-lag-in-frames', '25',         # Lag frames for better compression
                '-c:a', 'libopus',              # Opus audio codec
                '-b:a', '128k',                 # Audio bitrate
                '-movflags', '+faststart',      # Move metadata to beginning
                '-f', 'webm',                   # Force WebM format
                '-y',                           # Overwrite output
                output_path
            ]
            
            logger.info(f"🔄 Running FFmpeg: {' '.join(cmd)}")
            
            # Run FFmpeg with timeout
            from src.core.config import Config
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=Config.FFMPEG_TIMEOUT)
            
            if result.returncode == 0:
                logger.info("✅ FFmpeg optimization completed successfully")
                return True
            else:
                logger.error(f"❌ FFmpeg failed: {result.stderr}")
                return False
                
        except subprocess.TimeoutExpired:
            logger.error("❌ FFmpeg optimization timed out")
            return False
        except Exception as e:
            logger.error(f"❌ FFmpeg error: {e}")
            return False
    
    def _verify_video_file(self, file_path: str) -> bool:
        """Verify that the optimized video file is valid and playable."""
        try:
            # Quick verification using ffprobe
            cmd = ['ffprobe', '-v', 'error', file_path]
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            
            if result.returncode == 0:
                # Check file size
                file_size = os.path.getsize(file_path)
                if file_size > 0:
                    logger.info(f"✅ Video file verified: {file_size} bytes")
                    return True
                else:
                    logger.error("❌ Video file is empty")
                    return False
            else:
                logger.error(f"❌ Video file verification failed: {result.stderr}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Error verifying video file: {e}")
            return False
    
    def create_mp4_fallback(self, webm_path: str, mp4_path: Optional[str] = None) -> Tuple[bool, str]:
        """
        Create an MP4 fallback version for better browser compatibility.
        
        Args:
            webm_path: Path to WebM file
            mp4_path: Path for MP4 output (optional)
            
        Returns:
            Tuple of (success: bool, output_path: str)
        """
        try:
            if not os.path.exists(webm_path):
                logger.error(f"❌ WebM file not found: {webm_path}")
                return False, ""
            
            # Generate MP4 path if not provided
            if mp4_path is None:
                webm_file = Path(webm_path)
                mp4_path = str(webm_file.parent / f"{webm_file.stem}.mp4")
            
            logger.info(f"🎬 Creating MP4 fallback: {webm_path} -> {mp4_path}")
            
            # FFmpeg command for MP4 conversion
            cmd = [
                'ffmpeg',
                '-i', webm_path,
                '-c:v', 'libx264',              # H.264 codec for maximum compatibility
                '-preset', 'medium',             # Good balance of speed/quality
                '-crf', '23',                   # High quality
                '-c:a', 'aac',                  # AAC audio codec
                '-b:a', '128k',                 # Audio bitrate
                '-movflags', '+faststart',      # Optimize for web streaming
                '-y',                           # Overwrite output
                mp4_path
            ]
            
            logger.info(f"🔄 Running FFmpeg MP4 conversion: {' '.join(cmd)}")
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=Config.FFMPEG_TIMEOUT)
            
            if result.returncode == 0:
                logger.info(f"✅ MP4 fallback created: {mp4_path}")
                return True, mp4_path
            else:
                logger.error(f"❌ MP4 conversion failed: {result.stderr}")
                return False, ""
                
        except Exception as e:
            logger.error(f"❌ Error creating MP4 fallback: {e}")
            return False, ""

# Global instance
video_optimizer = VideoOptimizer()
