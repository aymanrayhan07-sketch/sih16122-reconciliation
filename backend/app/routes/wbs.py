import csv
import io
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from fastapi.responses import Response
import sqlite3
from typing import List, Optional

from ..database import get_db
from ..models import WBSActivityResponse
from ..engine.seed_data import SEED_WBS_ACTIVITIES

router = APIRouter(prefix="/api/wbs", tags=["WBS Activities"])

@router.get("/locations", response_model=List[str])
def get_distinct_locations(db: sqlite3.Connection = Depends(get_db)):
    """Returns distinct non-null project locations/zones dynamically derived from current WBS activities."""
    cursor = db.cursor()
    cursor.execute("""
        SELECT DISTINCT location 
        FROM wbs_activities 
        WHERE location IS NOT NULL AND TRIM(location) != '' 
        ORDER BY location ASC
    """)
    rows = cursor.fetchall()
    return [r["location"] for r in rows]

@router.get("", response_model=List[WBSActivityResponse])
def get_all_activities(
    discipline: Optional[str] = None,
    location: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    db: sqlite3.Connection = Depends(get_db)
):
    query = "SELECT * FROM wbs_activities WHERE 1=1"
    params = []

    if discipline and discipline != "All":
        query += " AND discipline = ?"
        params.append(discipline)

    if location and location != "All":
        query += " AND location = ?"
        params.append(location)

    if status and status != "All":
        query += " AND status = ?"
        params.append(status)

    if search:
        query += " AND (code LIKE ? OR name LIKE ? OR location LIKE ?)"
        term = f"%{search}%"
        params.extend([term, term, term])

    query += " ORDER BY discipline, code"
    cursor = db.cursor()
    cursor.execute(query, params)
    rows = cursor.fetchall()
    return [dict(row) for row in rows]

@router.get("/{activity_id}", response_model=WBSActivityResponse)
def get_activity_by_id(activity_id: int, db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT * FROM wbs_activities WHERE id = ?", (activity_id,))
    row = cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Activity not found")
    return dict(row)

@router.post("/reset")
def reset_wbs_baseline(db: sqlite3.Connection = Depends(get_db)):
    """Resets the WBS schedule to the realistic 28-activity demo baseline with locations."""
    cursor = db.cursor()
    cursor.execute("DELETE FROM match_candidates")
    cursor.execute("DELETE FROM progress_updates")
    cursor.execute("DELETE FROM feedback_log")
    cursor.execute("DELETE FROM reports")
    cursor.execute("DELETE FROM wbs_activities")

    for act in SEED_WBS_ACTIVITIES:
        cursor.execute("""
            INSERT INTO wbs_activities (
                code, name, discipline, location, wbs_level, parent_code,
                planned_start, planned_end, progress_percent, status,
                unit, planned_qty, installed_qty
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            act["code"], act["name"], act["discipline"], act.get("location"),
            act["wbs_level"], act.get("parent_code"), act.get("planned_start"),
            act.get("planned_end"), act.get("progress_percent", 0.0),
            act.get("status", "NOT_STARTED"), act.get("unit", "%"),
            act.get("planned_qty", 100.0), act.get("installed_qty", 0.0)
        ))
    db.commit()
    return {"message": "WBS Baseline successfully reset", "total_activities": len(SEED_WBS_ACTIVITIES)}

@router.post("/import")
async def import_wbs_csv(file: UploadFile = File(...), db: sqlite3.Connection = Depends(get_db)):
    """Uploads and imports a Primavera or MS Project CSV schedule export, mapping location/zone/area/block."""
    content = await file.read()
    text = content.decode("utf-8", errors="ignore")
    reader = csv.DictReader(io.StringIO(text))

    cursor = db.cursor()
    count = 0
    for row in reader:
        code = row.get("code") or row.get("activity_id") or row.get("Activity ID")
        name = row.get("name") or row.get("activity_name") or row.get("Activity Name")
        discipline = row.get("discipline") or row.get("Discipline") or "General"
        
        # Check for location/zone/area/block headers
        location = (
            row.get("location") or row.get("Location") or
            row.get("zone") or row.get("Zone") or
            row.get("area") or row.get("Area") or
            row.get("block") or row.get("Block") or
            None
        )
        if location:
            location = location.strip()
            
        level = int(row.get("wbs_level") or row.get("level") or 5)
        p_start = row.get("planned_start") or row.get("Start")
        p_end = row.get("planned_end") or row.get("Finish")
        progress = float(row.get("progress_percent") or row.get("progress") or 0.0)
        status = row.get("status") or ("COMPLETED" if progress >= 100 else ("IN_PROGRESS" if progress > 0 else "NOT_STARTED"))
        
        if code and name:
            cursor.execute("""
                INSERT OR REPLACE INTO wbs_activities (
                    code, name, discipline, location, wbs_level, planned_start, planned_end,
                    progress_percent, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (code, name, discipline, location, level, p_start, p_end, progress, status))
            count += 1
    
    db.commit()
    return {"status": "success", "imported_count": count}

@router.get("/export/csv")
def export_wbs_csv(db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT code, name, discipline, location, wbs_level, planned_start, planned_end, progress_percent, status FROM wbs_activities")
    rows = cursor.fetchall()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["activity_id", "activity_name", "discipline", "location", "wbs_level", "planned_start", "planned_end", "progress_percent", "status"])
    for r in rows:
        writer.writerow(list(r))
    
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=primavera_wbs_export.csv"}
    )
