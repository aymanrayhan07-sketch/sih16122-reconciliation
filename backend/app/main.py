import os
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import UPLOADS_DIR, BASE_DIR
from .database import init_db, get_db, get_db_connection
from .engine.seed_data import SEED_WBS_ACTIVITIES, SAMPLE_DEMO_REPORTS
from .models import ReportCreate
from .routes import wbs, reports, reconciliation, dashboard, uploads

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite tables
    init_db()
    
    # Auto-seed WBS activities and demo reports if DB is empty
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) as count FROM wbs_activities")
    row = cursor.fetchone()
    if row["count"] == 0:
        print("🌱 Auto-seeding 28 WBS Baseline Activities...")
        wbs.reset_wbs_baseline(conn)
        
        print("🌱 Auto-seeding 8 Multilingual Demo Reports...")
        reports.seed_demo_reports(conn)
    conn.close()
    
    try:
        yield
    finally:
        pass

app = FastAPI(
    title="SIH26122 Construction Progress Reconciliation API",
    description="AI-powered semantic matching of informal site reports to Primavera/MS Project WBS L5/L6 activities with human-in-the-loop review.",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for React Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static uploads directory for evidence photos
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

# Include Routers
app.include_router(wbs.router)
app.include_router(reports.router)
app.include_router(reconciliation.router)
app.include_router(dashboard.router)
app.include_router(uploads.router)

@app.get("/api/health")
def health():
    return {"status": "ok"}

# Mount frontend production build if available (enables single-service cloud deployment)
FRONTEND_DIST = BASE_DIR.parent / "frontend" / "dist"
if FRONTEND_DIST.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIST), html=True), name="frontend")
else:
    @app.get("/")
    def root():
        return {
            "project": "SIH26122 AI-Powered Construction Progress Reconciliation System",
            "status": "online",
            "documentation": "/docs"
        }
