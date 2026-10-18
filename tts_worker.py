import sys
import json
import asyncio
import threading
import os
from tts_runner import synthesize_speech_async

stdout_lock = threading.Lock()


async def handle_job(req, loop):
    req_id = req.get("id")
    text = req.get("text", "")
    reference_voice = req.get("referenceVoice", "")
    language = req.get("language", "en")
    output_path = req.get("outputPath", "")
    options = req.get("options", {})

    try:
        res = await synthesize_speech_async(
            text=text,
            reference_wav_path=reference_voice,
            language=language,
            output_file_path=output_path,
            options=options
        )
        res["id"] = req_id
        res["outputPath"] = output_path
        res["success"] = True
    except Exception as err:
        res = {
            "id": req_id,
            "success": False,
            "error": str(err)
        }

    with stdout_lock:
        sys.stdout.write(json.dumps(res) + "\n")
        sys.stdout.flush()


def main():
    """
    High-Speed Persistent Concurrent Warm TTS Daemon.
    Uses unbuffered line-by-line reading (readline) to guarantee instant task dispatch,
    preventing iterator read-ahead stalls on Windows standard input pipes.
    """
    sys.stdout.write("READY\n")
    sys.stdout.flush()

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    # Dedicated background thread running the event loop
    loop_thread = threading.Thread(target=loop.run_forever, daemon=True)
    loop_thread.start()

    # Read stdin strictly line-by-line without iterator chunk buffering
    while True:
        line = sys.stdin.readline()
        if not line:
            break

        line = line.strip()
        if not line:
            continue

        try:
            req = json.loads(line)
            # Dispatch task concurrently to the running event loop
            asyncio.run_coroutine_threadsafe(handle_job(req, loop), loop)
        except Exception as e:
            err_res = {"success": False, "error": f"Invalid JSON input: {e}"}
            with stdout_lock:
                sys.stdout.write(json.dumps(err_res) + "\n")
                sys.stdout.flush()

    loop.call_soon_threadsafe(loop.stop)
    loop_thread.join(timeout=2.0)


if __name__ == "__main__":
    main()
