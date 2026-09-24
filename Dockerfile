# Multi-stage Dockerfile for SIH16122 Full-Stack Deployment
# Stage 1: Build React Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Python FastAPI Backend + Bundled Frontend
FROM python:3.11-slim

WORKDIR /app

# Install system utilities
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python backend dependencies (CPU-only PyTorch wheel first to reduce image size)
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Pre-cache SentenceTransformer model into container image for instant offline startup
ENV HF_HOME=/app/cache/huggingface
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"

# Copy Backend Application
COPY backend/ ./backend/

# Copy compiled Frontend from Stage 1 into /app/frontend/dist
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Ensure data, uploads, and cache directories exist with full permissions for non-root (UID 1000) execution
RUN mkdir -p /app/backend/data /app/backend/uploads /app/cache && chmod -R 777 /app

# Set offline and performance environment variables
ENV PYTHONUNBUFFERED=1
ENV HF_HUB_OFFLINE=1
ENV TRANSFORMERS_OFFLINE=1
ENV PORT=8000

WORKDIR /app/backend

EXPOSE 8000

CMD ["python", "run_backend.py"]
