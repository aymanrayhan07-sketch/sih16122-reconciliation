from fastapi import APIRouter, Depends
import sqlite3
from typing import List, Dict, Any

from ..database import get_db
from ..models import DashboardStats, ProgressUpdateResponse, FeedbackLogResponse
from ..config import CONFIDENCE_THRESHOLD

router = APIRouter(prefix="/api/dashboard", tags=["Progress Analytics & History"])

@router.get("/stats", response_model=DashboardStats)
def get_dashboard_stats(db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()

    # Total activities summary
    cursor.execute("SELECT COUNT(*) as total FROM wbs_activities")
    total_acts = cursor.fetchone()["total"] or 0

    cursor.execute("SELECT COUNT(*) as cnt FROM wbs_activities WHERE progress_percent >= 100")
    completed_acts = cursor.fetchone()["cnt"] or 0

    cursor.execute("SELECT COUNT(*) as cnt FROM wbs_activities WHERE progress_percent > 0 AND progress_percent < 100")
    in_prog_acts = cursor.fetchone()["cnt"] or 0

    not_started_acts = total_acts - (completed_acts + in_prog_acts)

    cursor.execute("SELECT AVG(progress_percent) as avg_pct FROM wbs_activities")
    avg_row = cursor.fetchone()
    overall_progress = round(avg_row["avg_pct"] or 0.0, 1)

    # Pending reports
    cursor.execute("SELECT id FROM reports WHERE status = 'PENDING'")
    pending_rows = cursor.fetchall()
    pending_count = len(pending_rows)

    # Ambiguous pending reports (top candidate < threshold)
    ambiguous_count = 0
    for pr in pending_rows:
        cursor.execute("""
            SELECT confidence_score FROM match_candidates
            WHERE report_id = ? AND rank = 1
        """, (pr["id"],))
        top_cand = cursor.fetchone()
        if top_cand and top_cand["confidence_score"] < CONFIDENCE_THRESHOLD:
            ambiguous_count += 1

    # Discipline breakdown
    cursor.execute("""
        SELECT discipline,
               COUNT(*) as total,
               SUM(CASE WHEN progress_percent >= 100 THEN 1 ELSE 0 END) as completed,
               SUM(CASE WHEN progress_percent > 0 AND progress_percent < 100 THEN 1 ELSE 0 END) as in_progress,
               AVG(progress_percent) as avg_progress
        FROM wbs_activities
        GROUP BY discipline
        ORDER BY discipline
    """)
    disc_rows = cursor.fetchall()

    discipline_stats = []
    for r in disc_rows:
        discipline_stats.append({
            "discipline": r["discipline"],
            "total": r["total"],
            "completed": r["completed"],
            "in_progress": r["in_progress"],
            "avg_progress": round(r["avg_progress"] or 0.0, 1)
        })

    return DashboardStats(
        total_activities=total_acts,
        completed_activities=completed_acts,
        in_progress_activities=in_prog_acts,
        not_started_activities=not_started_acts,
        overall_progress_percent=overall_progress,
        pending_reports_count=pending_count,
        ambiguous_reports_count=ambiguous_count,
        discipline_stats=discipline_stats
    )


@router.get("/history", response_model=List[ProgressUpdateResponse])
def get_progress_history(db: sqlite3.Connection = Depends(get_db)):
    """Fetches chronological audit trail of all approved schedule updates."""
    cursor = db.cursor()
    cursor.execute("SELECT * FROM progress_updates ORDER BY id DESC")
    rows = cursor.fetchall()
    return [ProgressUpdateResponse(**dict(r)) for r in rows]


@router.get("/feedback", response_model=List[FeedbackLogResponse])
def get_feedback_learning_log(db: sqlite3.Connection = Depends(get_db)):
    """Fetches institutional memory log showing AI suggestions vs planner actions."""
    cursor = db.cursor()
    cursor.execute("SELECT * FROM feedback_log ORDER BY id DESC")
    rows = cursor.fetchall()
    return [FeedbackLogResponse(**dict(r)) for r in rows]
