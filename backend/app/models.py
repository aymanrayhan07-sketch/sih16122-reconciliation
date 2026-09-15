from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class WBSActivityBase(BaseModel):
    code: str
    name: str
    discipline: str
    wbs_level: int = 5
    parent_code: Optional[str] = None
    planned_start: Optional[str] = None
    planned_end: Optional[str] = None
    actual_start: Optional[str] = None
    actual_end: Optional[str] = None
    progress_percent: float = 0.0
    status: str = "NOT_STARTED"
    unit: Optional[str] = "%"
    planned_qty: float = 100.0
    installed_qty: float = 0.0

class WBSActivityResponse(WBSActivityBase):
    id: int

class MatchCandidateResponse(BaseModel):
    id: Optional[int] = None
    wbs_id: int
    wbs_code: str
    wbs_name: str
    wbs_discipline: str
    confidence_score: float
    rank: int
    reasoning: Optional[str] = None
    is_recommended: bool = False

class ReportCreate(BaseModel):
    raw_text: str
    language: Optional[str] = "English"
    reporter_name: Optional[str] = "Field Supervisor"
    photo_url: Optional[str] = None

class ReportResponse(BaseModel):
    id: int
    reporter_name: Optional[str] = None
    language: str = "English"
    raw_text: str
    normalized_text: Optional[str] = None
    extracted_intent: Optional[Dict[str, Any]] = None
    photo_url: Optional[str] = None
    status: str = "PENDING"
    created_at: str
    approved_wbs_id: Optional[int] = None
    approved_wbs_code: Optional[str] = None
    delta_percent: Optional[float] = 0.0
    candidates: List[MatchCandidateResponse] = []
    top_confidence: float = 0.0
    is_ambiguous: bool = False

class ReconcileRequest(BaseModel):
    selected_wbs_id: int
    delta_percent: float = 0.0
    new_total_percent: Optional[float] = None
    action: str = "APPROVE"  # "APPROVE", "REJECT", "OVERRIDE"
    planner_notes: Optional[str] = None

class ProgressUpdateResponse(BaseModel):
    id: int
    report_id: Optional[int] = None
    wbs_id: int
    wbs_code: str
    wbs_name: str
    reporter_name: Optional[str] = None
    previous_percent: float
    new_percent: float
    delta_percent: float
    planner_notes: Optional[str] = None
    timestamp: str
    photo_url: Optional[str] = None

class FeedbackLogResponse(BaseModel):
    id: int
    report_id: Optional[int] = None
    report_text: str
    ai_top_code: str
    ai_confidence: float
    chosen_code: str
    action: str
    planner_notes: Optional[str] = None
    timestamp: str

class DashboardStats(BaseModel):
    total_activities: int
    completed_activities: int
    in_progress_activities: int
    not_started_activities: int
    overall_progress_percent: float
    pending_reports_count: int
    ambiguous_reports_count: int
    discipline_stats: List[Dict[str, Any]]
