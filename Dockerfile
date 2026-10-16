# Production Dockerfile for SK - VoiceClone Studio on Railway
FROM node:20-bookworm-slim

# Prevent interactive prompts during apt installs
ENV DEBIAN_FRONTEND=noninteractive

# Install Python 3, pip, venv, ffmpeg, libsndfile1, build tools and certificates
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    ffmpeg \
    libsndfile1 \
    ca-certificates \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Set up isolated Python virtual environment
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
ENV PYTHON_PATH="/opt/venv/bin/python"

# App workspace
WORKDIR /app

# Install Python dependencies first for layer caching
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy all application files before npm install so postinstall build succeeds
COPY . .

# Install Node dependencies (postinstall automatically builds frontend/dist)
RUN npm install

# Build frontend production bundle
RUN npm run build

# Application environment configuration
ENV NODE_ENV=production
ENV PORT=5000

# Expose port (Railway dynamically injects PORT)
EXPOSE 5000

# Start Express server
CMD ["node", "server.js"]
