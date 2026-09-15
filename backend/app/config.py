import os
from pathlib import Path

# Base Paths
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
UPLOADS_DIR = BASE_DIR / "uploads"

DATA_DIR.mkdir(parents=True, exist_ok=True)
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

DB_PATH = str(DATA_DIR / "sih16122.db")

# AI Confidence Threshold for SIH16122
# Matches >= 85.0% are auto-suggested for 1-click approval
# Matches < 85.0% are flagged with an Ambiguous Match warning
CONFIDENCE_THRESHOLD = 85.0

# Pre-trained embedding model
EMBEDDING_MODEL_NAME = "all-MiniLM-L6-v2"

# Optional External API Keys
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
