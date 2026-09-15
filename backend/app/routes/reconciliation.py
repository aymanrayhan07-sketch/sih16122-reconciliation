from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
import sqlite3
from typing import Optional

from ..database import get_db
from ..models import ReconcileRequest

router = APIRouter(prefix="/api/reconcile", tags=["Planner Reconciliation & Approval"])

@router.post("/{report_id}")
def reconcile_report(
    report_id: int,
    req: ReconcileRequest,
    db: sqlite3.Connection = Depends(get_db)
):
    """
    Executes human-in-the-loop planner approval or override:
    1. Updates WBS activity % complete, actual start/finish dates, and status.
    2. Marks report as APPROVED or REJECTED.
    3. Records progress audit record.
    4. Logs decision into institutional feedback memory (tracking planner overrides).
    """
    cursor = db.cursor()

    # 1. Fetch report details
    cursor.execute("SELECT * FROM reports WHERE id = ?", (report_id,))
    report = cursor.fetchone()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    if report["status"] != "PENDING":
        raise HTTPException(status_code=400, detail=f"Report already reconciled (status: {report['status']})")

    # 2. If rejected
    if req.action == "REJECT":
        cursor.execute("UPDATE reports SET status = 'REJECTED' WHERE id = ?", (report_id,))
        db.commit()
        return {"status": "success", "message": "Report rejected by planner"}

    # 3. Fetch selected WBS activity
    cursor.execute("SELECT * FROM wbs_activities WHERE id = ?", (req.selected_wbs_id,))
    activity = cursor.fetchone()
    if not activity:
        raise HTTPException(status_code=404, detail="Selected WBS activity not found")

    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    today_date = datetime.now().strftime("%Y-%m-%d")

    current_pct = float(activity["progress_percent"] or 0.0)
    planned_qty = float(activity["planned_qty"] or 100.0)

    # Compute new percentage
    if req.new_total_percent is not None:
        new_pct = max(0.0, min(100.0, float(req.new_total_percent)))
        delta_pct = new_pct - current_pct
    else:
        delta_pct = float(req.delta_percent or 25.0)
        new_pct = max(0.0, min(100.0, current_pct + delta_pct))

    new_installed_qty = round((new_pct / 100.0) * planned_qty, 1)

    # Status update
    if new_pct >= 100.0:
        new_status = "COMPLETED"
    elif new_pct > 0.0:
        new_status = "IN_PROGRESS"
    else:
        new_status = "NOT_STARTED"

    actual_start = activity["actual_start"] or (today_date if new_pct > 0 else None)
    actual_end = today_date if new_pct >= 100.0 else activity["actual_end"]

    # 4. Update WBS Activity
    cursor.execute("""
        UPDATE wbs_activities
        SET progress_percent = ?,
            status = ?,
            installed_qty = ?,
            actual_start = ?,
            actual_end = ?
        WHERE id = ?
    """, (new_pct, new_status, new_installed_qty, actual_start, actual_end, req.selected_wbs_id))

    # 5. Update Report
    cursor.execute("""
        UPDATE reports
        SET status = 'APPROVED',
            approved_wbs_id = ?,
            approved_wbs_code = ?,
            delta_percent = ?
        WHERE id = ?
    """, (req.selected_wbs_id, activity["code"], delta_pct, report_id))

    # 6. Record in Progress Updates Audit Log
    cursor.execute("""
        INSERT INTO progress_updates (
            report_id, wbs_id, wbs_code, wbs_name, reporter_name,
            previous_percent, new_percent, delta_percent,
            planner_notes, timestamp, photo_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        report_id,
        activity["id"],
        activity["code"],
        activity["name"],
        report["reporter_name"],
        current_pct,
        new_pct,
        delta_pct,
        req.planner_notes,
        now_str,
        report["photo_url"]
    ))

    # 7. Check if planner agreed with Rank 1 match or overrode it (Institutional Memory)
    cursor.execute("""
        SELECT * FROM match_candidates
        WHERE report_id = ? AND rank = 1
    """, (report_id,))
    top_candidate = cursor.fetchone()

    ai_top_code = top_candidate["wbs_code"] if top_candidate else "NONE"
    ai_confidence = top_candidate["confidence_score"] if top_candidate else 0.0

    if top_candidate and top_candidate["wbs_id"] != req.selected_wbs_id:
        feedback_action = "OVERRIDDEN"
        reason = req.planner_notes or f"Planner manually selected {activity['code']} over AI suggestion {ai_top_code}"
    else:
        feedback_action = "CONFIRMED"
        reason = req.planner_notes or "Planner approved AI top suggestion"

    cursor.execute("""
        INSERT INTO feedback_log (
            report_id, report_text, ai_top_code, ai_confidence,
            chosen_code, action, planner_notes, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        report_id,
        report["raw_text"],
        ai_top_code,
        ai_confidence,
        activity["code"],
        feedback_action,
        reason,
        now_str
    ))

    db.commit()

    return {
        "status": "success",
        "message": f"Activity {activity['code']} updated to {new_pct}% ({new_status})",
        "wbs_code": activity["code"],
        "previous_percent": current_pct,
        "new_percent": new_pct,
        "delta_percent": delta_pct,
        "action": feedback_action
    }
