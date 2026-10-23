import os
import sys
import re
import time
import json
import shutil
import asyncio
import tempfile
import subprocess

# Automatically accept Coqui CPML license in non-interactive environment
os.environ["COQUI_TOS_AGREED"] = "1"

# Check available engines without heavy imports
HAS_EDGE_TTS = True
try:
    import edge_tts
except ImportError:
    HAS_EDGE_TTS = False

# Lazy flag for Coqui - DO NOT import torch or TTS at module level!
# Importing torch takes 30-45+ seconds on Windows and is only needed for custom voice cloning.
HAS_COQUI = None

# Load Full 120-Voice Studio Registry
VOICES_REGISTRY = []
try:
    reg_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "voices_registry.json")
    if os.path.isfile(reg_path):
        with open(reg_path, "r", encoding="utf-8") as f:
            VOICES_REGISTRY = json.load(f)
except Exception as _e:
    VOICES_REGISTRY = []


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


def humanize_script_text(text: str) -> str:
    """
    Cleans and structures text to sound authentically human:
    - Normalizes ellipses into natural breath pauses
    - Adds natural comma pauses for run-on clauses
    - Cleans punctuation and whitespace
    """
    t = text.strip()
    t = re.sub(r'\.{2,}', '... ', t)
    t = re.sub(r'([,;:])([^\s\d])', r'\1 \2', t)
    t = re.sub(r'\s*—\s*', ', ', t)
    t = re.sub(r'\s*--\s*', ', ', t)
    t = re.sub(r'!{2,}', '!', t)
    t = re.sub(r'\?{2,}', '?', t)
    t = re.sub(r'[ \t]+', ' ', t)
    return t


def log_msg(msg: str):
    try:
        sys.stderr.write(f"{msg}\n")
        sys.stderr.flush()
    except Exception:
        pass


def compute_acoustic_params(
    user_speed: int = -8,
    user_pitch: int = -4,
    user_pause: float = None,
    voice_bias: dict = None
):
    """
    Computes modulated acoustic speech parameters (rate, pitch, volume, pause)
    by combining voice-specific timbre biases and user manual sliders.
    """
    vb_pitch = voice_bias.get("pitch_bias", 0) if voice_bias else 0
    vb_rate = voice_bias.get("rate_bias", 0) if voice_bias else 0
    vb_vol = voice_bias.get("volume_bias", 0) if voice_bias else 0

    eff_rate = int(round(user_speed + vb_rate))
    eff_rate = max(-50, min(100, eff_rate))

    eff_pitch = int(round(user_pitch + vb_pitch))
    eff_pitch = max(-40, min(40, eff_pitch))

    eff_vol = int(round(vb_vol))
    eff_vol = max(-50, min(50, eff_vol))

    if user_pause is not None and user_pause > 0:
        eff_pause = float(user_pause)
    else:
        eff_pause = 0.22

    eff_pause = max(0.08, min(1.2, eff_pause))

    rate_str = f"{'+' if eff_rate >= 0 else ''}{eff_rate}%"
    pitch_str = f"{'+' if eff_pitch >= 0 else ''}{eff_pitch}Hz"
    vol_str = f"{'+' if eff_vol >= 0 else ''}{eff_vol}%"

    return rate_str, pitch_str, vol_str, eff_pause


def resolve_neural_voice(reference_wav_path: str, language: str = "en") -> tuple:
    """
    Resolves the best matching neural human voice based on the reference voice
    file name, metadata registry, or selected language.
    Returns (voice_id, voice_bias_dict).
    """
    basename = os.path.basename(reference_wav_path).lower()

    # 1. Exact or partial match from the 120-Voice Studio Registry
    if VOICES_REGISTRY:
        for item in VOICES_REGISTRY:
            if item.get("filename", "").lower() == basename:
                try:
                    pb = int(str(item.get("pitchBias", "0")).replace("Hz", "").replace("+", "").strip())
                except: pb = 0
                try:
                    rb = int(str(item.get("rateBias", "0")).replace("%", "").replace("+", "").strip())
                except: rb = 0
                try:
                    vb = int(str(item.get("volumeBias", "0")).replace("%", "").replace("+", "").strip())
                except: vb = 0
                bias = {
                    "pitch_bias": pb,
                    "rate_bias": rb,
                    "volume_bias": vb,
                    "label": item.get("name", ""),
                    "description": item.get("description", ""),
                    "language": item.get("languageCode", "en")
                }
                return item["neuralVoice"], bias

        for item in VOICES_REGISTRY:
            clean_name = item.get("name", "").lower()
            clean_id = item.get("id", "").lower()
            if clean_name in basename or clean_id in basename:
                try:
                    pb = int(str(item.get("pitchBias", "0")).replace("Hz", "").replace("+", "").strip())
                except: pb = 0
                try:
                    rb = int(str(item.get("rateBias", "0")).replace("%", "").replace("+", "").strip())
                except: rb = 0
                try:
                    vb = int(str(item.get("volumeBias", "0")).replace("%", "").replace("+", "").strip())
                except: vb = 0
                bias = {
                    "pitch_bias": pb,
                    "rate_bias": rb,
                    "volume_bias": vb,
                    "label": item.get("name", ""),
                    "description": item.get("description", ""),
                    "language": item.get("languageCode", "en")
                }
                return item["neuralVoice"], bias

    # 2. Check for Adam voice variations
    if "adam" in basename:
        for style_key, config in ADAM_PROFILES.items():
            if style_key in basename:
                return config["voice"], config
        return ADAM_PROFILES["deep"]["voice"], ADAM_PROFILES["deep"]

    for key, voice_id in NEURAL_VOICE_MAP.items():
        if key in basename:
            return voice_id, {}

    if any(k in basename for k in ["female", "woman", "girl", "lady"]):
        return "en-US-JennyNeural", {}
    if any(k in basename for k in ["male", "man", "boy", "gent"]):
        return "en-US-BrianMultilingualNeural", {}

    return LANGUAGE_VOICE_MAP.get(language[:2].lower(), "en-US-BrianMultilingualNeural"), {}


def split_text_into_chunks(text: str, max_chars: int = 2500) -> list:
    """
    Splits very long scripts into natural sentence-level chunks when needed.
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


def concat_mp3_files(mp3_paths: list, output_path: str):
    """
    Concatenates multiple MP3 files into a single valid MP3 stream.
    MP3 files consist of independent MPEG audio frames and concatenate seamlessly.
    """
    with open(output_path, "wb") as outfile:
        for p in mp3_paths:
            if os.path.isfile(p):
                with open(p, "rb") as infile:
                    shutil.copyfileobj(infile, outfile)


def generate_windows_native_tts_fallback(text: str, output_path: str):
    """
    Emergency offline fallback using System.Speech.Synthesis + ffmpeg with safe temporary text file.
    """
    temp_txt = output_path + ".temp.txt"
    temp_wav = output_path + ".temp.wav"

    try:
        with open(temp_txt, "w", encoding="utf-8") as f:
            f.write(text[:1200])

        escaped_txt = temp_txt.replace("'", "''")
        escaped_wav = temp_wav.replace("'", "''")

        ps_script = (
            f"$ErrorActionPreference = 'Stop'; "
            f"[void][System.Reflection.Assembly]::LoadWithPartialName('System.Speech'); "
            f"$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer; "
            f"$synth.SetOutputToWaveFile('{escaped_wav}'); "
            f"$script = [System.IO.File]::ReadAllText('{escaped_txt}', [System.Text.Encoding]::UTF8); "
            f"$synth.Speak($script); "
            f"$synth.Dispose()"
        )

        subprocess.run(
            ["powershell", "-NoProfile", "-Command", ps_script],
            capture_output=True,
            text=True,
            timeout=30
        )
    except Exception as e:
        log_msg(f"[Windows Native TTS Exception]: {e}")
    finally:
        if os.path.isfile(temp_txt):
            try:
                os.unlink(temp_txt)
            except:
                pass

    if os.path.isfile(temp_wav) and os.path.getsize(temp_wav) > 0:
        # Convert to mp3 via ffmpeg if available
        try:
            conv = subprocess.run(
                ["ffmpeg", "-y", "-i", temp_wav, "-b:a", "192k", output_path],
                capture_output=True,
                timeout=20
            )
            if conv.returncode == 0 and os.path.isfile(output_path) and os.path.getsize(output_path) > 0:
                try:
                    os.unlink(temp_wav)
                except:
                    pass
                return
        except Exception:
            pass
        # If ffmpeg wasn't available, move directly
        shutil.move(temp_wav, output_path)
    else:
        raise RuntimeError("Windows Native TTS was unable to synthesize audio for this prompt.")


async def synthesize_speech_async(
    text: str,
    reference_wav_path: str,
    language: str,
    output_file_path: str,
    options: dict = None
) -> dict:
    """
    High-performance async speech synthesis engine:
    1. Direct MP3 streaming for instant output (sub-2s)
    2. Concurrent chunk synthesis for long texts
    3. Lazy-loaded Coqui fallback only for custom voice samples
    4. Emergency Windows Native TTS fallback
    """
    t_start = time.time()
    if options is None:
        options = {}

    user_speed = int(options.get("speed", -8))
    user_pitch = int(options.get("pitch", -4))
    user_pause = options.get("pause", 0.22)
    if user_pause is not None:
        try:
            user_pause = float(user_pause)
        except:
            user_pause = 0.22

    # Humanize script text
    clean_text = humanize_script_text(text)
    if not clean_text:
        raise ValueError("Text input is empty.")

    # Resolve target neural voice & voice bias
    neural_voice_id, voice_bias = resolve_neural_voice(reference_wav_path, language)
    rate_str, pitch_str, vol_str, eff_pause = compute_acoustic_params(
        user_speed=user_speed,
        user_pitch=user_pitch,
        user_pause=user_pause,
        voice_bias=voice_bias
    )

    # Check if custom voice cloning via Coqui is required
    ref_basename = os.path.basename(reference_wav_path).lower()
    known_presets = ["adam", "jenny", "guy", "aria", "christopher", "sonia", "ryan", "brian", "andrew", "default"]
    is_in_registry = any(
        ref_basename == item.get("filename", "").lower() or
        item.get("id", "").lower() in ref_basename or
        item.get("name", "").lower() in ref_basename
        for item in VOICES_REGISTRY
    )
    is_custom_cloning = not is_in_registry and not any(k in ref_basename for k in known_presets)

    global HAS_COQUI
    if HAS_COQUI is None:
        try:
            import importlib.util
            HAS_COQUI = importlib.util.find_spec("TTS") is not None
        except Exception:
            HAS_COQUI = False

    if is_custom_cloning and HAS_COQUI:
        try:
            log_msg("[ENGINE] Attempting Coqui XTTS-v2 for custom uploaded voice...")
            # Lazy import torch & TTS only when custom voice cloning is explicitly requested
            import torch
            from TTS.api import TTS
            use_cuda = torch.cuda.is_available()
            device = "cuda" if use_cuda else "cpu"
            tts = TTS(model_name="tts_models/multilingual/multi-dataset/xtts_v2", progress_bar=False).to(device)
            tts.tts_to_file(
                text=clean_text[:400],
                speaker_wav=reference_wav_path,
                language=language[:2].lower(),
                file_path=output_file_path
            )
            if os.path.isfile(output_file_path) and os.path.getsize(output_file_path) > 0:
                return {
                    "success": True,
                    "engine": "coqui_xtts",
                    "voice": "custom_clone",
                    "time": f"{time.time() - t_start:.2f}s"
                }
        except Exception as e:
            log_msg(f"[COQUI NOTICE] Custom cloning fallback to Neural Voice: {e}")

    # Primary: Fast Neural Speech Engine via edge-tts
    if HAS_EDGE_TTS:
        os.makedirs(os.path.dirname(os.path.abspath(output_file_path)), exist_ok=True)

        # Fast path for prompts up to 2500 chars: direct single stream without chunking overhead
        if len(clean_text) <= 2500:
            saved_ok = False
            last_err = None
            for attempt in range(2):
                try:
                    comm = edge_tts.Communicate(
                        text=clean_text,
                        voice=neural_voice_id,
                        rate=rate_str,
                        pitch=pitch_str,
                        volume=vol_str
                    )
                    await asyncio.wait_for(comm.save(output_file_path), timeout=45.0)
                    if os.path.isfile(output_file_path) and os.path.getsize(output_file_path) > 0:
                        saved_ok = True
                        break
                except Exception as e:
                    last_err = e
                    log_msg(f"[EDGE-TTS Notice] Cloud attempt {attempt + 1} notice: {e or type(e).__name__}. Retrying...")
                    await asyncio.sleep(0.3)

            if saved_ok:
                elapsed = time.time() - t_start
                return {
                    "success": True,
                    "engine": "edge_neural",
                    "voice": neural_voice_id,
                    "time": f"{elapsed:.2f}s"
                }
            else:
                log_msg(f"[EDGE-TTS Notice] Single stream attempt failed ({last_err}). Seamlessly trying sentence chunk synthesis...")

        # Ultra-fast concurrent multi-chunk synthesis for long scripts (7k - 14k+ chars):
        # Uses 2500-char natural sentence chunks + concurrent semaphore for 5x-8x faster generation
        chunks = split_text_into_chunks(clean_text, max_chars=2500)
        temp_dir = tempfile.mkdtemp(prefix="fast_tts_chunks_")
        chunk_files = [os.path.join(temp_dir, f"chunk_{i:04d}.mp3") for i in range(len(chunks))]
        semaphore = asyncio.Semaphore(4)  # Concurrently process up to 4 chunks simultaneously

        async def fetch_chunk(index, chunk_text, dest_path):
            async with semaphore:
                for attempt in range(2):
                    try:
                        c = edge_tts.Communicate(
                            text=chunk_text,
                            voice=neural_voice_id,
                            rate=rate_str,
                            pitch=pitch_str,
                            volume=vol_str
                        )
                        await asyncio.wait_for(c.save(dest_path), timeout=50.0)
                        if os.path.isfile(dest_path) and os.path.getsize(dest_path) > 0:
                            return True
                    except Exception as ce:
                        log_msg(f"[EDGE-TTS Notice] Chunk {index + 1}/{len(chunks)} attempt {attempt + 1} notice: {ce or type(ce).__name__}. Retrying...")
                        await asyncio.sleep(0.3)
                return False

        try:
            tasks = [fetch_chunk(i, c_text, chunk_files[i]) for i, c_text in enumerate(chunks)]
            results = await asyncio.gather(*tasks, return_exceptions=False)
            all_chunks_ok = all(results) and all(os.path.isfile(p) and os.path.getsize(p) > 0 for p in chunk_files)

            if all_chunks_ok and chunk_files:
                concat_mp3_files(chunk_files, output_file_path)
                shutil.rmtree(temp_dir, ignore_errors=True)

                if os.path.isfile(output_file_path) and os.path.getsize(output_file_path) > 0:
                    elapsed = time.time() - t_start
                    return {
                        "success": True,
                        "engine": "edge_neural_multichunk",
                        "voice": neural_voice_id,
                        "chunks": len(chunks),
                        "time": f"{elapsed:.2f}s"
                    }
            else:
                shutil.rmtree(temp_dir, ignore_errors=True)
                log_msg("[EDGE-TTS Multichunk Notice]: One or more chunks failed. Falling back to offline synthesizer...")
        except Exception as e:
            shutil.rmtree(temp_dir, ignore_errors=True)
            log_msg(f"[EDGE-TTS Multichunk Notice]: {e}. Falling back to offline synthesizer...")


    # Fallback: Windows Native TTS
    if sys.platform == "win32":
        log_msg("[NOTICE] Using Emergency Windows Native Fallback.")
        try:
            generate_windows_native_tts_fallback(clean_text, output_file_path)
            if os.path.isfile(output_file_path) and os.path.getsize(output_file_path) > 0:
                return {
                    "success": True,
                    "engine": "windows_native",
                    "voice": "System.Speech (Offline Fallback)",
                    "time": f"{time.time() - t_start:.2f}s"
                }
        except Exception as fb_err:
            log_msg(f"[FALLBACK ERROR]: {fb_err}")

    raise RuntimeError("Speech synthesis failed on all available engines.")


def main():
    """
    AI Voice Engine CLI Runner
    Usage: python tts_runner.py "<text or path_to_text>" "<reference_wav>" [lang] [output_path] [options_json]
    """
    if len(sys.argv) < 3:
        sys.stderr.write("Usage: python tts_runner.py \"<text or path_to_text>\" \"<reference_wav>\" [lang] [output_path] [options_json]\n")
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

    project_root = os.path.dirname(os.path.abspath(__file__))
    if len(sys.argv) > 4 and sys.argv[4].strip():
        output_file_path = os.path.abspath(sys.argv[4].strip())
    else:
        output_file_path = os.path.join(project_root, "output.mp3")

    options = {}
    if len(sys.argv) > 5 and sys.argv[5].strip():
        opts_arg = sys.argv[5].strip()
        try:
            if os.path.isfile(opts_arg):
                with open(opts_arg, 'r', encoding='utf-8') as f:
                    options = json.load(f)
            else:
                options = json.loads(opts_arg)
        except Exception:
            options = {}

    try:
        res = asyncio.run(synthesize_speech_async(
            text=text_input,
            reference_wav_path=reference_wav_path,
            language=language,
            output_file_path=output_file_path,
            options=options
        ))
        print(f"SUCCESS: Voice generated successfully in {res.get('time', 'N/A')} [{res.get('engine', 'TTS')}]: {output_file_path}")
        sys.exit(0)
    except Exception as err:
        sys.stderr.write(f"Voice generation failed: {err}\n")
        sys.exit(1)


if __name__ == "__main__":
    main()
