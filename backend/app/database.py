import sqlite3
from typing import Optional, List, Dict, Any
from .config import DB_PATH

def get_db_connection() -> sqlite3.Connection:
    """Returns a direct SQLite connection with row factory and WAL mode."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")
    return conn

def get_db():
    """FastAPI dependency for database session management."""
    conn = get_db_connection()
    try:
        yield conn
    finally:
        conn.close()

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. WBS Baseline Schedule Activities
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS wbs_activities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        discipline TEXT NOT NULL,
        wbs_level INTEGER NOT NULL DEFAULT 5,
        parent_code TEXT,
        planned_start TEXT,
        planned_end TEXT,
        actual_start TEXT,
        actual_end TEXT,
        progress_percent REAL NOT NULL DEFAULT 0.0,
        status TEXT NOT NULL DEFAULT 'NOT_STARTED',
        unit TEXT DEFAULT '%',
        planned_qty REAL DEFAULT 100.0,
        installed_qty REAL DEFAULT 0.0
    );
    """)

    # 2. Field Reports (Supervisor Submissions)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reporter_name TEXT,
        language TEXT DEFAULT 'English',
        raw_text TEXT NOT NULL,
        normalized_text TEXT,
        extracted_intent TEXT,
        photo_url TEXT,
        status TEXT NOT NULL DEFAULT 'PENDING',
        created_at TEXT NOT NULL,
        approved_wbs_id INTEGER,
        approved_wbs_code TEXT,
        delta_percent REAL DEFAULT 0.0,
        FOREIGN KEY (approved_wbs_id) REFERENCES wbs_activities (id)
    );
    """)

    # 3. AI Match Candidates (Top 3 per report)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS match_candidates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        report_id INTEGER NOT NULL,
        wbs_id INTEGER NOT NULL,
        wbs_code TEXT NOT NULL,
        wbs_name TEXT NOT NULL,
        wbs_discipline TEXT NOT NULL,
        confidence_score REAL NOT NULL,
        rank INTEGER NOT NULL,
        reasoning TEXT,
        FOREIGN KEY (report_id) REFERENCES reports (id) ON DELETE CASCADE,
        FOREIGN KEY (wbs_id) REFERENCES wbs_activities (id)
    );
    """)

    # 4. Progress Updates Audit Log
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS progress_updates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        report_id INTEGER,
        wbs_id INTEGER NOT NULL,
        wbs_code TEXT NOT NULL,
        wbs_name TEXT NOT NULL,
        reporter_name TEXT,
        previous_percent REAL NOT NULL,
        new_percent REAL NOT NULL,
        delta_percent REAL NOT NULL,
        planner_notes TEXT,
        timestamp TEXT NOT NULL,
        photo_url TEXT,
        FOREIGN KEY (report_id) REFERENCES reports (id),
        FOREIGN KEY (wbs_id) REFERENCES wbs_activities (id)
    );
    """)

    # 5. Planner Feedback & Learning Log (Institutional Memory)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS feedback_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        report_id INTEGER,
        report_text TEXT NOT NULL,
        ai_top_code TEXT NOT NULL,
        ai_confidence REAL NOT NULL,
        chosen_code TEXT NOT NULL,
        action TEXT NOT NULL, -- 'CONFIRMED' or 'OVERRIDDEN'
        planner_notes TEXT,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (report_id) REFERENCES reports (id)
    );
    """)

    conn.commit()
    conn.close()
