import asyncio
import os
import edge_tts
import soundfile as sf

voices_dir = "voices"
os.makedirs(voices_dir, exist_ok=True)
os.makedirs("temp", exist_ok=True)

adam_presets = [
    {
        "filename": "Adam (Deep Narration - ElevenLabs Style).wav",
        "voice": "en-US-BrianMultilingualNeural",
        "rate": "-2%",
        "pitch": "-4Hz",
        "text": "Hello, I am Adam. This is my deep narration voice, crafted for documentaries, audiobooks, and immersive storytelling."
    },
    {
        "filename": "Adam (Conversational & Podcast).wav",
        "voice": "en-US-BrianMultilingualNeural",
        "rate": "+1%",
        "pitch": "-1Hz",
        "text": "Hey everyone, welcome back. Today we are having an honest, grounded conversation about technology, creativity, and where the future is heading."
    },
    {
        "filename": "Adam (Cinematic & Dramatic Trailer).wav",
        "voice": "en-US-ChristopherNeural",
        "rate": "-5%",
        "pitch": "-5Hz",
        "text": "In a world where intelligence meets imagination... every secret has a price, and some truths can never stay hidden."
    },
    {
        "filename": "Adam (Commercial & Dynamic Pitch).wav",
        "voice": "en-US-AndrewMultilingualNeural",
        "rate": "+4%",
        "pitch": "+0Hz",
        "text": "Introducing the next generation of voice intelligence. Faster, sharper, and engineered to elevate your brand to the next level."
    },
    {
        "filename": "Adam (Late Night Chill & Whispering).wav",
        "voice": "en-US-BrianMultilingualNeural",
        "rate": "-8%",
        "pitch": "-2Hz",
        "text": "Take a deep breath and let the day drift away. It is time to slow down, relax, and quiet your mind."
    },
    {
        "filename": "Adam (Motivational & Energetic).wav",
        "voice": "en-US-GuyNeural",
        "rate": "+5%",
        "pitch": "+1Hz",
        "text": "Every single day is a new opportunity to push beyond your limits. Do not wait for chance — build the discipline that makes greatness inevitable."
    }
]

async def generate_all():
    temp_mp3 = os.path.join("temp", "temp_adam_gen.mp3")
    for p in adam_presets:
        filepath = os.path.join(voices_dir, p["filename"])
        name = p["filename"]
        print(f"Generating voice sample for: {name}")
        comm = edge_tts.Communicate(text=p["text"], voice=p["voice"], rate=p["rate"], pitch=p["pitch"])
        await comm.save(temp_mp3)
        data, sr = sf.read(temp_mp3)
        sf.write(filepath, data, sr, subtype="PCM_16")
        print(f"-> Successfully created: {filepath} ({len(data)} frames, {sr} Hz)")
    if os.path.exists(temp_mp3):
        os.remove(temp_mp3)
    print("All Adam voice reference files successfully generated!")

if __name__ == "__main__":
    asyncio.run(generate_all())
