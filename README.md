# SK - VoiceClone Studio 🎙️

An advanced, locally-hosted AI Voice Cloning & Neural Text-to-Speech Studio powered by **Coqui XTTS-v2** and natural prosody humanization. Built with a sleek, high-contrast monochrome design, customizable acoustic sliders, and a full suite of ElevenLabs Adam voice variations.

Developed by **SHIRAZ KHAN**.

---

## ✨ Features

- **Local Neural Voice Cloning**: Clone vocal timbre, cadence, and tone directly from any 5–10 second reference WAV sample using local Coqui XTTS-v2.
- **Adam Voice Suite**: Includes 6 calibrated variations of ElevenLabs' Adam voice:
  - *Deep Narration (ElevenLabs Style)*
  - *Conversational & Podcast*
  - *Cinematic & Dramatic Trailer*
  - *Commercial & Dynamic Pitch*
  - *Late Night Chill & Whispering*
  - *Motivational & Energetic*
- **Ultra-Human Delivery Engine**:
  - Deep Baritone baseline (`-4Hz`) default tuning.
  - Natural speech cadence (`-8%` speaking rate).
  - Punctuation breathing pause synthesis (`0.22s`).
  - Broadcast-level peak normalization (`-1.0 dBFS`) & click-free crossfades.
- **Studio Acoustics Controls**:
  - Fine-tune vocal pitch offset with instant presets (*Deep Baritone*, *Natural*, *Crisp High*).
  - Speaking rate adjustment slider.
  - Breath & pause duration slider.
  - Emotion style intensity slider.
- **Luxury Monochrome UI**:
  - High-contrast pure black & white design in both Day and Night modes.
  - Responsive 2-column layout (Studio Workspace + History Sidebar).
  - Instant in-browser voice sample preview before generating.
  - One-click script reuse, instant playback, and WAV downloading.
  - Custom voice WAV drag-and-drop uploader.

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js** (v18+)
- **Python** (3.10+ recommended)
- **PyTorch** & **TTS** (Coqui XTTS-v2) or Microsoft Edge TTS runtime

### 2. Installation

1. **Install backend dependencies:**
   ```bash
   npm install
   ```

2. **Install frontend dependencies:**
   ```bash
   cd frontend
   npm install
   cd ..
   ```

3. **Install Python dependencies:**
   ```bash
   pip install edge-tts pydub
   # For full local XTTS-v2 neural model:
   # pip install torch torchaudio TTS
   ```

### 3. Running the Studio

Start both the backend server and frontend development server with a single command:

```bash
npm run dev
```

- **Frontend App**: `http://localhost:5173`
- **Backend API**: `http://localhost:5000`

---

## 📁 Project Structure

```
├── audio/                   # Generated audio outputs
├── frontend/                # React + Vite frontend application
│   ├── src/
│   │   ├── App.jsx          # Studio Workspace & History UI
│   │   └── main.jsx
│   └── package.json
├── voices/                  # Reference voice WAV samples (Adam suite & studio voices)
├── server.js                # Express REST API & file management backend
├── tts_runner.py            # Local audio generation & human acoustic processing pipeline
├── package.json             # Root script orchestrator (concurrently)
└── README.md
```

---

## 📜 License
MIT License. Created by Shiraz Khan.
