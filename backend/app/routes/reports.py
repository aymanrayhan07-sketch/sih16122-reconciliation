import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
import sqlite3
from typing import List, Optional

from ..database import get_db
from ..models import ReportCreate, ReportResponse, MatchCandidateResponse
from ..engine.normalizer import normalize_field_text
from ..engine.matcher import WBSScheduleMatcher
from ..engine.seed_data import SAMPLE_DEMO_REPORTS
from ..config import CONFIDENCE_THRESHOLD

router = APIRouter(prefix="/api/reports", tags=["Supervisor Reports & AI Matching"])

def _format_report_response(report_row: sqlite3.Row, db: sqlite3.Connection) -> ReportResponse:
    report_dict = dict(report_row)
    # Parse JSON extracted intent if present
    if report_dict.get("extracted_intent"):
        try:
            report_dict["extracted_intent"] = json.loads(report_dict["extracted_intent"])
        except Exception:
            pass

    # Fetch top candidates
    cursor = db.cursor()
    cursor.execute("""
        SELECT * FROM match_candidates
        WHERE report_id = ?
        ORDER BY rank ASC
    """, (report_dict["id"],))
    candidate_rows = cursor.fetchall()

    candidates = []
    top_score = 0.0
    for c in candidate_rows:
        cand_dict = dict(c)
        cand_dict["is_recommended"] = (cand_dict["rank"] == 1 and cand_dict["confidence_score"] >= CONFIDENCE_THRESHOLD)
        if cand_dict["rank"] == 1:
            top_score = cand_dict["confidence_score"]
        candidates.append(MatchCandidateResponse(**cand_dict))

    report_dict["candidates"] = candidates
    report_dict["top_confidence"] = top_score
    report_dict["is_ambiguous"] = (top_score < CONFIDENCE_THRESHOLD)

    return ReportResponse(**report_dict)


@router.post("", response_model=ReportResponse)
def submit_supervisor_report(report_in: ReportCreate, db: sqlite3.Connection = Depends(get_db)):
    """
    Submits a supervisor daily report, normalizes multilingual/slang input,
    runs semantic matching against WBS activities, and ranks top 3 candidate matches.
    """
    cursor = db.cursor()

    # 1. Normalize multilingual site vernacular & extract structured engineering intent
    normalized_text, extracted_intent = normalize_field_text(report_in.raw_text)

    # 2. Query all WBS activities
    cursor.execute("SELECT id, code, name, discipline, location, wbs_level FROM wbs_activities")
    wbs_rows = cursor.fetchall()
    activities = [dict(r) for r in wbs_rows]

    if not activities:
        raise HTTPException(status_code=400, detail="WBS schedule is empty. Please reset or import WBS first.")

    # 3. Run semantic AI matching engine (passing location for optional narrowing)
    matcher = WBSScheduleMatcher(activities, threshold=CONFIDENCE_THRESHOLD)
    top_candidates = matcher.match_report(
        report_in.raw_text,
        normalized_text,
        extracted_intent,
        location=report_in.location
    )

    # 4. Insert report record
    created_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cursor.execute("""
        INSERT INTO reports (
            reporter_name, language, location, raw_text, normalized_text,
            extracted_intent, photo_url, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)
    """, (
        report_in.reporter_name,
        report_in.language,
        report_in.location,
        report_in.raw_text,
        normalized_text,
        json.dumps(extracted_intent),
        report_in.photo_url,
        created_at
    ))
    report_id = cursor.lastrowid

    # 5. Insert candidate matches
    for cand in top_candidates:
        cursor.execute("""
            INSERT INTO match_candidates (
                report_id, wbs_id, wbs_code, wbs_name, wbs_discipline,
                confidence_score, rank, reasoning
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            report_id,
            cand["wbs_id"],
            cand["wbs_code"],
            cand["wbs_name"],
            cand["wbs_discipline"],
            cand["confidence_score"],
            cand["rank"],
            cand["reasoning"]
        ))

    db.commit()

    # Fetch and return formatted response
    cursor.execute("SELECT * FROM reports WHERE id = ?", (report_id,))
    new_report = cursor.fetchone()
    return _format_report_response(new_report, db)


@router.get("/pending", response_model=List[ReportResponse])
def get_pending_reports(db: sqlite3.Connection = Depends(get_db)):
    """Fetches all reports awaiting planner review with top 3 candidates and ambiguity warnings."""
    cursor = db.cursor()
    cursor.execute("SELECT * FROM reports WHERE status = 'PENDING' ORDER BY id DESC")
    rows = cursor.fetchall()
    return [_format_report_response(r, db) for r in rows]


@router.get("", response_model=List[ReportResponse])
def get_all_reports(db: sqlite3.Connection = Depends(get_db)):
    """Fetches all field reports across all statuses."""
    cursor = db.cursor()
    cursor.execute("SELECT * FROM reports ORDER BY id DESC")
    rows = cursor.fetchall()
    return [_format_report_response(r, db) for r in rows]


@router.get("/{report_id}", response_model=ReportResponse)
def get_report_by_id(report_id: int, db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT * FROM reports WHERE id = ?", (report_id,))
    row = cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Report not found")
    return _format_report_response(row, db)


@router.post("/seed-demo")
def seed_demo_reports(db: sqlite3.Connection = Depends(get_db)):
    """Populates the 8 realistic multilingual demo reports for quick hackathon presentation."""
    # Check if activities exist first
    cursor = db.cursor()
    cursor.execute("SELECT COUNT(*) as cnt FROM wbs_activities")
    if cursor.fetchone()["cnt"] == 0:
        raise HTTPException(status_code=400, detail="Please reset/seed WBS activities first")

    # Clear previous reports to keep demo clean
    cursor.execute("DELETE FROM match_candidates")
    cursor.execute("DELETE FROM reports")
    db.commit()

    seeded_reports = []
    for sample in SAMPLE_DEMO_REPORTS:
        report_in = ReportCreate(**sample)
        res = submit_supervisor_report(report_in, db)
        seeded_reports.append(res)

    return {"status": "success", "seeded_count": len(seeded_reports)}
