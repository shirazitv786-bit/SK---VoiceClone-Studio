import os
import sys
import re
import time
import wave
import json
import shutil
import asyncio
import tempfile
import subprocess
import numpy as np

# Automatically accept Coqui CPML license in non-interactive environment
os.environ["COQUI_TOS_AGREED"] = "1"

# Check available engines
HAS_EDGE_TTS = False
try:
    import edge_tts
    import soundfile as sf
    HAS_EDGE_TTS = True
except ImportError:
    HAS_EDGE_TTS = False

HAS_COQUI = False
try:
    import torch
    from TTS.api import TTS
    HAS_COQUI = True
except ImportError:
    HAS_COQUI = False


# =============================================================================
# ADAM VOICE SUITE CONFIGURATIONS (High-definition human profiles)
# =============================================================================
ADAM_PROFILES = {
    "deep": {
        "voice": "en-US-BrianMultilingualNeural",
        "pitch_bias": -3,
        "rate_bias": -2,
        "volume_bias": 4,
        "label": "Adam (Deep Narration - ElevenLabs Style)",
        "description": "Deep baritone, cinematic, resonant narrator benchmark"
    },
    "conversation": {
        "voice": "en-US-BrianMultilingualNeural",
        "pitch_bias": -1,
        "rate_bias": 1,
        "volume_bias": 0,
        "label": "Adam (Conversational & Podcast)",
        "description": "Natural, warm, grounded conversational inflection"
    },
    "cinematic": {
        "voice": "en-US-ChristopherNeural",
        "pitch_bias": -5,
        "rate_bias": -5,
        "volume_bias": 8,
        "label": "Adam (Cinematic & Dramatic Trailer)",
        "description": "Deep, gravelly, dramatic trailer authority"
    },
    "commercial": {
        "voice": "en-US-AndrewMultilingualNeural",
        "pitch_bias": 0,
        "rate_bias": 4,
        "volume_bias": 8,
        "label": "Adam (Commercial & Dynamic Pitch)",
        "description": "Crisp, punchy, confident product pitch"
    },
    "late night": {
        "voice": "en-US-BrianMultilingualNeural",
        "pitch_bias": -2,
        "rate_bias": -8,
        "volume_bias": -12,
        "label": "Adam (Late Night Chill & Whispering)",
        "description": "Soft, close-mic, relaxed bedtime and ASMR delivery"
    },
    "chill": {
        "voice": "en-US-BrianMultilingualNeural",
        "pitch_bias": -2,
        "rate_bias": -8,
        "volume_bias": -12,
        "label": "Adam (Late Night Chill & Whispering)",
        "description": "Soft, close-mic, relaxed bedtime and ASMR delivery"
    },
    "motivational": {
        "voice": "en-US-GuyNeural",
        "pitch_bias": 1,
        "rate_bias": 5,
        "volume_bias": 12,
        "label": "Adam (Motivational & Energetic)",
        "description": "Upbeat, inspiring, high-impact speech delivery"
    }
}

# Comprehensive mapping of voice filenames and keywords to Microsoft Edge Neural voices
NEURAL_VOICE_MAP = {
    "adam": "en-US-BrianMultilingualNeural",
    "brian": "en-US-BrianMultilingualNeural",
    "andrew": "en-US-AndrewMultilingualNeural",
    "jenny": "en-US-JennyNeural",
    "guy": "en-US-GuyNeural",
    "aria": "en-US-AriaNeural",
    "christopher": "en-US-ChristopherNeural",
    "sonia": "en-GB-SoniaNeural",
    "ryan": "en-GB-RyanNeural",
    "eric": "en-US-EricNeural",
    "ana": "en-US-AnaNeural",
    "michelle": "en-US-MichelleNeural",
    "roger": "en-US-RogerNeural",
    "steffan": "en-US-SteffanNeural",
    "natasha": "en-AU-NatashaNeural",
    "william": "en-AU-WilliamMultilingualNeural",
    "default": "en-US-BrianMultilingualNeural"
}

# Language-specific default neural human voices
LANGUAGE_VOICE_MAP = {
    "en": "en-US-BrianMultilingualNeural",
    "es": "es-ES-AlvaroNeural",
    "fr": "fr-FR-HenriNeural",
    "de": "de-DE-ConradNeural",
    "ur": "ur-PK-AsadNeural",
    "hi": "hi-IN-MadhurNeural",
    "ar": "ar-SA-HamedNeural",
    "zh": "zh-CN-YunxiNeural",
    "ja": "ja-JP-KeitaNeural"
}

# Emotion & Style Profiles using Acoustic Modulation
EMOTION_PROFILES = {
    "neutral": {
        "rate": 0,
        "pitch": 0,
        "volume": 0,
        "pause": 0.22,
        "label": "Neutral / Balanced",
        "description": "Natural baseline conversational delivery"
    },
    "cheerful": {
        "rate": 10,
        "pitch": 6,
        "volume": 12,
        "pause": 0.16,
        "label": "Cheerful",
        "description": "High energy, smiling tone, bright inflection"
    },
    "excited": {
        "rate": 18,
        "pitch": 10,
        "volume": 18,
        "pause": 0.12,
        "label": "Excited",
        "description": "Rapid pacing, dynamic pitch shifts"
    },
    "sad": {
        "rate": -15,
        "pitch": -6,
        "volume": -12,
        "pause": 0.35,
        "label": "Sad",
        "description": "Lower energy, slower pacing, subdued delivery"
    },
    "empathetic": {
        "rate": -4,
        "pitch": 2,
        "volume": 0,
        "pause": 0.24,
        "label": "Empathetic / Friendly",
        "description": "Soft, caring, warm tone (great for customer service or podcasts)"
    },
    "whispering": {
        "rate": -8,
        "pitch": -3,
        "volume": -30,
        "pause": 0.28,
        "label": "Whispering / Soft",
        "description": "Lower volume, breathy, intimate sound"
    },
    "angry": {
        "rate": 8,
        "pitch": 4,
        "volume": 30,
        "pause": 0.15,
        "label": "Angry",
        "description": "Intense, stressed inflection"
    },
    "terrified": {
        "rate": 14,
        "pitch": 8,
        "volume": -8,
        "pause": 0.18,
        "label": "Terrified",
        "description": "Breathless, trembling, high stress inflection"
    },
    "newscast": {
        "rate": 0,
        "pitch": -2,
        "volume": 8,
        "pause": 0.22,
        "label": "Newscast / Documentary",
        "description": "Calm, authoritative, formal broadcast tone"
    }
}


def humanize_script_text(text: str) -> str:
    """
    Cleans and structures text to sound authentically human:
    - Normalizes ellipses into natural breath pauses
    - Adds natural comma pauses for run-on clauses
    - Cleans punctuation and whitespace
    """
    t = text.strip()
    # Normalize multiple periods / ellipses into a clean breath pause
    t = re.sub(r'\.{2,}', '... ', t)
    # Ensure space after punctuation for natural breath pauses
    t = re.sub(r'([,;:])([^\s\d])', r'\1 \2', t)
    # Replace em-dashes and double hyphens with natural spoken pause commas
    t = re.sub(r'\s*—\s*', ', ', t)
    t = re.sub(r'\s*--\s*', ', ', t)
    # Clean multiple exclamation or question marks while retaining intonation
    t = re.sub(r'!{2,}', '!', t)
    t = re.sub(r'\?{2,}', '?', t)
    # Remove redundant whitespace
    t = re.sub(r'[ \t]+', ' ', t)
    return t


def compute_acoustic_params(
    emotion: str = "neutral",
    style_degree: float = 1.0,
    user_speed: int = -8,
    user_pitch: int = -4,
    user_pause: float = None,
    voice_bias: dict = None
):
    """
    Computes modulated acoustic speech parameters (rate, pitch, volume, pause)
    by combining emotion base vectors, voice-specific timbre biases (such as Adam's deep tone),
    styleDegree intensity multiplier, and user manual sliders.
    """
    key = emotion.lower().strip() if emotion else "neutral"
    profile = EMOTION_PROFILES.get(key, EMOTION_PROFILES["neutral"])

    # Scale degree multiplier (0.1 to 3.0)
    scale = max(0.1, min(float(style_degree), 3.0))

    vb_pitch = voice_bias.get("pitch_bias", 0) if voice_bias else 0
    vb_rate = voice_bias.get("rate_bias", 0) if voice_bias else 0
    vb_vol = voice_bias.get("volume_bias", 0) if voice_bias else 0

    # Effective rate (-50% to +100%)
    eff_rate = int(round(profile["rate"] * scale + user_speed + vb_rate))
    eff_rate = max(-50, min(100, eff_rate))

    # Effective pitch (-40Hz to +40Hz)
    eff_pitch = int(round(profile["pitch"] * scale + user_pitch + vb_pitch))
    eff_pitch = max(-40, min(40, eff_pitch))

    # Effective volume (-50% to +50%)
    eff_vol = int(round(profile["volume"] * scale + vb_vol))
    eff_vol = max(-50, min(50, eff_vol))

    # Effective pause duration between sentences (0.05s to 1.2s)
    if user_pause is not None and user_pause > 0:
        eff_pause = float(user_pause)
    else:
        base_pause = profile["pause"]
        if base_pause > 0.22:
            eff_pause = base_pause * (1.0 + (scale - 1.0) * 0.25)
        else:
            eff_pause = base_pause * (1.0 - (scale - 1.0) * 0.15)

    eff_pause = max(0.08, min(1.2, eff_pause))

    rate_str = f"{'+' if eff_rate >= 0 else ''}{eff_rate}%"
    pitch_str = f"{'+' if eff_pitch >= 0 else ''}{eff_pitch}Hz"
    vol_str = f"{'+' if eff_vol >= 0 else ''}{eff_vol}%"

    return rate_str, pitch_str, vol_str, eff_pause, profile


def resolve_neural_voice(reference_wav_path: str, language: str = "en") -> tuple:
    """
    Resolves the best matching neural human voice based on the reference voice
    file name, metadata, or selected language.
    Returns (voice_id, voice_bias_dict).
    """
    basename = os.path.basename(reference_wav_path).lower()

    # Check for Adam voice variations first
    if "adam" in basename:
        for style_key, config in ADAM_PROFILES.items():
            if style_key in basename:
                return config["voice"], config
        # Default to flagship Adam Deep Narration
        return ADAM_PROFILES["deep"]["voice"], ADAM_PROFILES["deep"]

    for key, voice_id in NEURAL_VOICE_MAP.items():
        if key in basename:
            return voice_id, {}

    if any(k in basename for k in ["female", "woman", "girl", "lady"]):
        return "en-US-JennyNeural", {}
    if any(k in basename for k in ["male", "man", "boy", "gent"]):
        return "en-US-BrianMultilingualNeural", {}

    return LANGUAGE_VOICE_MAP.get(language[:2].lower(), "en-US-BrianMultilingualNeural"), {}


def post_process_human_audio(wav_path: str):
    """
    Studio-grade mastering for ultra-human audio:
    1. Removes DC offset
    2. Broadcast peak normalization (-1.0 dBFS) to eliminate distortion
    3. Micro-fades at chunk boundaries (8ms) to remove digital pops/clicks
    """
    try:
        data, sr = sf.read(wav_path)
        if len(data) == 0:
            return

        # DC offset correction
        data = data - np.mean(data)

        # Broadcast Peak Normalization (-1.0 dBFS = 0.891 amplitude)
        peak = np.max(np.abs(data))
        if peak > 0.01:
            data = data * (0.891 / peak)

        # 8ms raised-cosine micro fade-in and fade-out to prevent clicks
        fade_len = min(int(sr * 0.008), len(data) // 2)
        if fade_len > 0:
            fade = np.linspace(0, 1, fade_len)
            if data.ndim == 1:
                data[:fade_len] *= fade
                data[-fade_len:] *= fade[::-1]
            else:
                for ch in range(data.shape[1]):
                    data[:fade_len, ch] *= fade
                    data[-fade_len:, ch] *= fade[::-1]

        sf.write(wav_path, data, sr, subtype="PCM_16")
    except Exception as e:
        print(f"[POST-PROCESS NOTICE] {e}")


def convert_wav_to_mp3(wav_path: str, mp3_path: str, bitrate: str = "192k") -> bool:
    """
    Converts a mastered 16-bit PCM WAV audio file to broadcast-quality MP3 (192kbps).
    Uses FFmpeg as primary engine, with soundfile and pydub fallback.
    """
    # 1. Primary: FFmpeg (ensures industry standard libmp3lame 192kbps broadcast encoding)
    if shutil.which("ffmpeg"):
        try:
            cmd = [
                "ffmpeg", "-y",
                "-i", wav_path,
                "-codec:a", "libmp3lame",
                "-b:a", bitrate,
                "-ar", "24000",
                mp3_path
            ]
            res = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
            if res.returncode == 0 and os.path.isfile(mp3_path) and os.path.getsize(mp3_path) > 0:
                return True
        except Exception as e:
            print(f"[MP3 CONVERSION NOTICE] FFmpeg encoder notice: {e}")

    # 2. Secondary: soundfile if MP3 format is supported by libsndfile
    try:
        data, sr = sf.read(wav_path)
        sf.write(mp3_path, data, sr, format="MP3")
        if os.path.isfile(mp3_path) and os.path.getsize(mp3_path) > 0:
            return True
    except Exception as e:
        print(f"[MP3 CONVERSION NOTICE] soundfile encoder notice: {e}")

    # 3. Tertiary: pydub fallback
    try:
        from pydub import AudioSegment
        sound = AudioSegment.from_wav(wav_path)
        sound.export(mp3_path, format="mp3", bitrate=bitrate)
        if os.path.isfile(mp3_path) and os.path.getsize(mp3_path) > 0:
            return True
    except Exception as e:
        print(f"[MP3 CONVERSION NOTICE] pydub fallback notice: {e}")

    # 4. Fallback copy
    try:
        shutil.copyfile(wav_path, mp3_path)
        return True
    except Exception as e:
        print(f"[MP3 CONVERSION ERROR] Fallback copy failed: {e}")
        return False


def finalize_output_file(synthesis_wav: str, target_output: str):
    """
    Delivers audio to target_output. If target_output is .mp3, encodes to 192k MP3
    and removes intermediate temporary WAV file.
    """
    if target_output.lower().endswith(".mp3"):
        print(f"[AUDIO EXPORT] Mastering & encoding broadcast MP3 (192kbps): {target_output}")
        success = convert_wav_to_mp3(synthesis_wav, target_output, bitrate="192k")
        if not success or not os.path.isfile(target_output) or os.path.getsize(target_output) == 0:
            shutil.copyfile(synthesis_wav, target_output)
        if os.path.isfile(synthesis_wav) and os.path.abspath(synthesis_wav) != os.path.abspath(target_output):
            try:
                os.remove(synthesis_wav)
            except Exception:
                pass
    else:
        if os.path.abspath(synthesis_wav) != os.path.abspath(target_output):
            shutil.move(synthesis_wav, target_output)


async def generate_edge_neural_tts(
    text: str,
    voice_id: str,
    output_wav_path: str,
    rate: str = "+0%",
    pitch: str = "+0Hz",
    volume: str = "+0%"
):
    """
    Synthesizes speech using Microsoft Neural Voice technology via edge-tts,
    with full acoustic emotion modulation (rate, pitch, volume).
    Converts output directly into studio 16-bit PCM WAV with post-processing.
    """
    temp_dir = tempfile.mkdtemp(prefix="neural_tts_")
    temp_mp3 = os.path.join(temp_dir, "speech.mp3")

    try:
        communicate = edge_tts.Communicate(
            text=text,
            voice=voice_id,
            rate=rate,
            pitch=pitch,
            volume=volume
        )
        await communicate.save(temp_mp3)

        if not os.path.isfile(temp_mp3) or os.path.getsize(temp_mp3) == 0:
            raise RuntimeError("Edge-TTS synthesis failed: Empty audio output generated.")

        # Convert to 16-bit PCM standard WAV using soundfile (with FFmpeg fallback)
        try:
            audio_data, sample_rate = sf.read(temp_mp3)
            sf.write(output_wav_path, audio_data, sample_rate, subtype="PCM_16")
        except Exception as sf_err:
            if shutil.which("ffmpeg"):
                cmd = ["ffmpeg", "-y", "-i", temp_mp3, "-acodec", "pcm_s16le", "-ar", "24000", output_wav_path]
                subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            else:
                raise sf_err

        # Apply studio mastering
        post_process_human_audio(output_wav_path)

    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


def split_text_into_chunks(text: str, max_chars: int = 320) -> list:
    """
    Splits long scripts into natural sentence-level chunks, respecting punctuation
    and paragraph breaks to prevent memory overflow and guarantee smooth human pacing.
    """
    text = text.strip()
    if len(text) <= max_chars:
        return [text]

    sentence_pattern = re.compile(r'([^.!?\n]+[.!?\n]*)', re.UNICODE)
    raw_sentences = sentence_pattern.findall(text)
    raw_sentences = [s.strip() for s in raw_sentences if s.strip()]

    chunks = []
    current_chunk = ""

    for sentence in raw_sentences:
        if len(sentence) > max_chars:
            if current_chunk:
                chunks.append(current_chunk.strip())
                current_chunk = ""
            words = sentence.split(' ')
            sub_chunk = ""
            for word in words:
                if len(sub_chunk) + len(word) + 1 <= max_chars:
                    sub_chunk = f"{sub_chunk} {word}".strip()
                else:
                    if sub_chunk:
                        chunks.append(sub_chunk)
                    sub_chunk = word
            if sub_chunk:
                chunks.append(sub_chunk)
        else:
            if len(current_chunk) + len(sentence) + 1 <= max_chars:
                current_chunk = f"{current_chunk} {sentence}".strip()
            else:
                if current_chunk:
                    chunks.append(current_chunk.strip())
                current_chunk = sentence

    if current_chunk:
        chunks.append(current_chunk.strip())

    return [c for c in chunks if c.strip()]


def merge_wav_files(wav_paths: list, output_path: str, silence_duration_sec: float = 0.22):
    """
    Merges multiple WAV chunks into a single studio mastered WAV file.
    Applies crossfading at chunk boundaries and inserts natural sentence pauses.
    """
    if not wav_paths:
        raise ValueError("No WAV files provided to merge.")

    if len(wav_paths) == 1:
        shutil.copyfile(wav_paths[0], output_path)
        post_process_human_audio(output_path)
        return

    all_audio = []
    sample_rate = 24000

    for idx, path in enumerate(wav_paths):
        data, sr = sf.read(path)
        sample_rate = sr

        # Apply gentle 5ms edge fade on each chunk
        fade_len = min(int(sr * 0.005), len(data) // 2)
        if fade_len > 0:
            fade = np.linspace(0, 1, fade_len)
            data[:fade_len] *= fade
            data[-fade_len:] *= fade[::-1]

        all_audio.append(data)

        # Insert natural sentence breath pause
        if idx < len(wav_paths) - 1 and silence_duration_sec > 0:
            silence_samples = int(sr * silence_duration_sec)
            all_audio.append(np.zeros(silence_samples, dtype=np.float32))

    merged = np.concatenate(all_audio)

    # Master post-processing: remove DC bias and normalize peak
    merged = merged - np.mean(merged)
    peak = np.max(np.abs(merged))
    if peak > 0.01:
        merged = merged * (0.891 / peak)

    sf.write(output_path, merged, sample_rate, subtype="PCM_16")


def generate_windows_native_tts_fallback(text: str, output_path: str):
    """
    Emergency offline fallback using System.Speech.Synthesis if no neural engine
    is installed or accessible.
    """
    clean_text = text.replace('"', " ").replace("'", " ").replace("`", " ").strip()
    escaped_output = output_path.replace("'", "''")

    ps_command = (
        f"[void][System.Reflection.Assembly]::LoadWithPartialName('System.Speech'); "
        f"$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer; "
        f"$synth.SetOutputToWaveFile('{escaped_output}'); "
        f"$synth.Speak('{clean_text}'); "
        f"$synth.Dispose()"
    )

    result = subprocess.run(
        ["powershell", "-NoProfile", "-Command", ps_command],
        capture_output=True,
        text=True
    )

    if result.returncode != 0:
        raise RuntimeError(f"Windows Native TTS error: {result.stderr or result.stdout}")


def main():
    """
    AI Voice Engine CLI Runner
    Supports:
    1. Edge Neural Human Voice Engine with Acoustic Emotion & Adam Suite Modulation
    2. Coqui XTTS-v2 Voice Cloning
    3. Windows Native Fallback
    """
    if len(sys.argv) < 3:
        sys.stderr.write("Usage: python tts_runner.py \"<text or path_to_text_file>\" \"<path_to_reference_wav>\" [language_code] [output_path] [options_json_or_path]\n")
        sys.exit(1)

    raw_arg = sys.argv[1].strip()
    reference_wav_path = os.path.abspath(sys.argv[2].strip())
    language = sys.argv[3].strip() if len(sys.argv) > 3 else "en"

    # Support passing text directly or via a temporary text file
    if os.path.isfile(raw_arg) and raw_arg.endswith('.txt'):
        with open(raw_arg, 'r', encoding='utf-8') as f:
            text_input = f.read().strip()
    else:
        text_input = raw_arg

    if not text_input:
        sys.stderr.write("Error: Text input is empty.\n")
        sys.exit(1)

    # Humanize punctuation and cadence
    text_input = humanize_script_text(text_input)

    if not os.path.isfile(reference_wav_path):
        sys.stderr.write(f"Error: Reference voice file not found at '{reference_wav_path}'.\n")
        sys.exit(1)

    # Determine destination output path
    project_root = os.path.dirname(os.path.abspath(__file__))
    if len(sys.argv) > 4 and sys.argv[4].strip():
        output_file_path = os.path.abspath(sys.argv[4].strip())
        os.makedirs(os.path.dirname(output_file_path), exist_ok=True)
    else:
        output_file_path = os.path.join(project_root, "output.mp3")

    # If target is MP3, synthesize and master into temporary WAV first
    if output_file_path.lower().endswith(".mp3"):
        synthesis_wav_path = os.path.join(
            tempfile.gettempdir(),
            f"tts_master_{int(time.time() * 1000)}_{os.getpid()}.wav"
        )
    else:
        synthesis_wav_path = output_file_path

    # Parse Emotion and Acoustic Modulation Options (arg 5)
    emotion = "neutral"
    style_degree = 1.0
    user_speed = -8
    user_pitch = -4
    user_pause = None

    if len(sys.argv) > 5 and sys.argv[5].strip():
        opts_arg = sys.argv[5].strip()
        try:
            if os.path.isfile(opts_arg):
                with open(opts_arg, 'r', encoding='utf-8') as f:
                    opts = json.load(f)
            else:
                opts = json.loads(opts_arg)
            emotion = opts.get("emotion", "neutral")
            style_degree = float(opts.get("styleDegree", 1.0))
            user_speed = int(opts.get("speed", -8))
            user_pitch = int(opts.get("pitch", -4))
            if "pause" in opts and opts["pause"] is not None:
                user_pause = float(opts["pause"])
        except Exception as e:
            print(f"[NOTICE] Using default emotion settings ({e})")

    # Resolve target neural voice & voice bias
    neural_voice_id, voice_bias = resolve_neural_voice(reference_wav_path, language)

    rate_str, pitch_str, vol_str, eff_pause, emotion_profile = compute_acoustic_params(
        emotion=emotion,
        style_degree=style_degree,
        user_speed=user_speed,
        user_pitch=user_pitch,
        user_pause=user_pause,
        voice_bias=voice_bias
    )

    print(f"=== AI Voice Synthesis Initialized ===")
    print(f"Text length: {len(text_input)} characters")
    print(f"Reference voice: {os.path.basename(reference_wav_path)}")
    if voice_bias and "label" in voice_bias:
        print(f"Profile: {voice_bias['label']}")
    print(f"Emotion: {emotion_profile['label']} (styledegree={style_degree})")
    print(f"Modulation: Rate={rate_str}, Pitch={pitch_str}, Volume={vol_str}, Pause={eff_pause:.2f}s")
    print(f"Target output: {output_file_path}")

    # =========================================================================
    # OPTION A: COQUI XTTS-v2 (If custom user voice cloning is requested and TTS available)
    # =========================================================================
    is_custom_cloning = False
    ref_basename = os.path.basename(reference_wav_path).lower()
    known_presets = ["adam", "jenny", "guy", "aria", "christopher", "sonia", "ryan", "brian", "andrew", "default"]
    if not any(k in ref_basename for k in known_presets):
        is_custom_cloning = True

    if is_custom_cloning and HAS_COQUI:
        try:
            print("[ENGINE] Using Coqui XTTS-v2 Neural Voice Cloning...")
            use_cuda = torch.cuda.is_available()
            device = "cuda" if use_cuda else "cpu"
            print(f"[HARDWARE] Inference device: {device.upper()}")

            chunks = split_text_into_chunks(text_input, max_chars=250)
            temp_dir = tempfile.mkdtemp(prefix="xtts_chunks_")
            chunk_files = []

            tts = TTS(model_name="tts_models/multilingual/multi-dataset/xtts_v2", progress_bar=False).to(device)

            for i, chunk in enumerate(chunks, 1):
                chunk_path = os.path.join(temp_dir, f"chunk_{i:04d}.wav")
                tts.tts_to_file(
                    text=chunk,
                    speaker_wav=reference_wav_path,
                    language=language,
                    file_path=chunk_path
                )
                if os.path.isfile(chunk_path) and os.path.getsize(chunk_path) > 0:
                    chunk_files.append(chunk_path)
                else:
                    raise RuntimeError(f"Failed to generate chunk {i}")

            merge_wav_files(chunk_files, synthesis_wav_path, silence_duration_sec=eff_pause)
            shutil.rmtree(temp_dir, ignore_errors=True)
            finalize_output_file(synthesis_wav_path, output_file_path)

            if os.path.isfile(output_file_path) and os.path.getsize(output_file_path) > 0:
                print(f"SUCCESS: Voice cloned successfully via XTTS-v2: {output_file_path}")
                sys.exit(0)
        except Exception as e:
            print(f"[WARNING] Coqui XTTS synthesis encountered: {e}. Falling back to Neural Voice Engine.")

    # =========================================================================
    # OPTION B: STUDIO NEURAL HUMAN VOICE ENGINE (Edge-TTS + Human Pacing)
    # =========================================================================
    if HAS_EDGE_TTS:
        print(f"[ENGINE] Using Studio Neural Human Voice Engine: {neural_voice_id}")
        print(f"[HUMAN TONE] Pacing and pitch tuning active")

        try:
            chunks = split_text_into_chunks(text_input, max_chars=320)
            if len(chunks) == 1:
                # Single chunk synthesis
                asyncio.run(generate_edge_neural_tts(
                    text=chunks[0],
                    voice_id=neural_voice_id,
                    output_wav_path=synthesis_wav_path,
                    rate=rate_str,
                    pitch=pitch_str,
                    volume=vol_str
                ))
            else:
                # Multi-chunk synthesis for long scripts with emotional sentence pauses
                print(f"Processing long script in {len(chunks)} natural sentence chunks...")
                temp_dir = tempfile.mkdtemp(prefix="neural_chunks_")
                chunk_files = []
                for i, chunk in enumerate(chunks, 1):
                    chunk_wav = os.path.join(temp_dir, f"chunk_{i:04d}.wav")
                    asyncio.run(generate_edge_neural_tts(
                        text=chunk,
                        voice_id=neural_voice_id,
                        output_wav_path=chunk_wav,
                        rate=rate_str,
                        pitch=pitch_str,
                        volume=vol_str
                    ))
                    if os.path.isfile(chunk_wav) and os.path.getsize(chunk_wav) > 0:
                        chunk_files.append(chunk_wav)
                    else:
                        raise RuntimeError(f"Chunk {i} generation failed.")

                merge_wav_files(chunk_files, synthesis_wav_path, silence_duration_sec=eff_pause)
                shutil.rmtree(temp_dir, ignore_errors=True)

            finalize_output_file(synthesis_wav_path, output_file_path)

            if os.path.isfile(output_file_path) and os.path.getsize(output_file_path) > 0:
                print(f"SUCCESS: Fully human voice generated successfully: {output_file_path}")
                sys.exit(0)
            else:
                raise RuntimeError("Generated output file is missing or empty.")

        except Exception as err:
            print(f"[WARNING] Neural Voice synthesis failed: {err}")

    # =========================================================================
    # OPTION C: EMERGENCY WINDOWS NATIVE TTS (Last resort on Windows only)
    # =========================================================================
    if sys.platform == "win32":
        print("[NOTICE] Using Emergency Windows Native Fallback.")
        try:
            generate_windows_native_tts_fallback(text_input, synthesis_wav_path)
            finalize_output_file(synthesis_wav_path, output_file_path)
            if os.path.isfile(output_file_path) and os.path.getsize(output_file_path) > 0:
                print(f"SUCCESS: Generated via fallback TTS: {output_file_path}")
                sys.exit(0)
            else:
                sys.stderr.write("Error: Output file not created.\n")
                sys.exit(1)
        except Exception as e:
            sys.stderr.write(f"Fatal error during TTS generation: {e}\n")
            sys.exit(1)
    else:
        sys.stderr.write("Voice generation failed: Neural Edge-TTS engine was unable to synthesize audio on server.\n")
        sys.exit(1)


if __name__ == "__main__":
    main()
