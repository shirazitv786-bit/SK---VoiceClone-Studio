# Production Dockerfile for SK - VoiceClone Studio on Railway
FROM node:20-bookworm-slim

# Prevent interactive prompts during apt installs
ENV DEBIAN_FRONTEND=noninteractive

# Install Python 3, pip, venv, ffmpeg, libsndfile1 and certificates
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    ffmpeg \
    libsndfile1 \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set up isolated Python virtual environment
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
ENV PYTHON_PATH="/opt/venv/bin/python"

# Symlink system python commands to the virtual environment
RUN ln -sf /opt/venv/bin/python /usr/bin/python && \
    ln -sf /opt/venv/bin/python3 /usr/bin/python3

# App workspace
WORKDIR /app

# Install Python dependencies first for caching
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy package files
COPY package*.json ./
COPY frontend/package*.json ./frontend/

# Install root dependencies
RUN npm install

# Copy application source code
COPY . .

# Build the frontend production assets
RUN npm run build

# Application environment configuration
ENV NODE_ENV=production
ENV PORT=5000

# Expose port (Railway overrides PORT via environment variable)
EXPOSE 5000

# Start Express server
CMD ["node", "server.js"]
