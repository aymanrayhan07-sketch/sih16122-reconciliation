import uvicorn
import os
import sys

# Ensure offline mode so no network calls are attempted on stage
os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["TRANSFORMERS_OFFLINE"] = "1"

if __name__ == "__main__":
    # Ensure current directory is in pythonpath
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=False)
