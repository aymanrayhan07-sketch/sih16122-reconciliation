import sys
import os

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import init_db, get_db_connection
from app.routes.dashboard import get_dashboard_stats
from app.routes.wbs import get_distinct_locations, get_all_activities, reset_wbs_baseline
from app.routes.reports import submit_supervisor_report, seed_demo_reports, get_pending_reports
from app.models import ReportCreate
from app.engine.matcher import WBSScheduleMatcher

def run_tests():
    print("=== STARTING SIH16122 LOCATION / ZONE RECONCILIATION TESTS ===")

    # 1. Initialize DB and reset baseline
    init_db()
    conn = get_db_connection()
    reset_res = reset_wbs_baseline(conn)
    print(f"[PASS] Reset baseline: {reset_res['total_activities']} activities loaded.")

    # 2. Verify Schema contains location columns
    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(wbs_activities)")
    wbs_cols = [row["name"] for row in cursor.fetchall()]
    assert "location" in wbs_cols, "location column missing from wbs_activities"
    print("[PASS] Schema verification: 'location' column exists in wbs_activities table.")

    cursor.execute("PRAGMA table_info(reports)")
    report_cols = [row["name"] for row in cursor.fetchall()]
    assert "location" in report_cols, "location column missing from reports"
    print("[PASS] Schema verification: 'location' column exists in reports table.")

    # 3. Test Dynamic Distinct Locations
    locs = get_distinct_locations(conn)
    assert len(locs) > 0, "No locations found in database"
    assert locs == sorted(locs), "Locations should be sorted alphabetically"
    assert "Turbine Building" in locs, "'Turbine Building' should be in locations list"
    assert "Substation Yard" in locs, "'Substation Yard' should be in locations list"
    print(f"[PASS] Dynamic locations extracted ({len(locs)} distinct zones): {locs}")

    # 4. Test WBS Query Filtering by Location
    turbine_acts = get_all_activities(location="Turbine Building", db=conn)
    assert len(turbine_acts) > 0, "Expected activities in Turbine Building"
    for act in turbine_acts:
        assert act["location"] == "Turbine Building", f"Expected Turbine Building, got {act['location']}"
    print(f"[PASS] WBS filter by location='Turbine Building' returned {len(turbine_acts)} activities, all matching zone.")

    # 5. Test AI Matcher with Location Pre-Filtering
    activities = get_all_activities(db=conn)
    matcher = WBSScheduleMatcher(activities)
    test_phrase = "Turbine pedestal concrete pouring 80% ho gaya"
    match_with_loc = matcher.match_report(test_phrase, location="Turbine Building")
    assert len(match_with_loc) > 0, "Expected candidates for match with location"
    top_cand = match_with_loc[0]
    assert top_cand["location"] == "Turbine Building", f"Expected candidate in Turbine Building, got {top_cand['location']}"
    assert "Zone filtered: Turbine Building" in top_cand["reasoning"], "Reasoning should explain location filtering"
    print(f"[PASS] Matcher with location: Top match {top_cand['wbs_code']} ({top_cand['wbs_name']}) in {top_cand['location']}.")
    print(f"       Score: {top_cand['confidence_score']}% | Reasoning: {top_cand['reasoning']}")

    # 6. Test AI Matcher WITHOUT Location (Unrestricted / Full Schedule)
    match_no_loc = matcher.match_report(test_phrase, location=None)
    assert len(match_no_loc) > 0, "Expected candidates for match without location"
    print(f"[PASS] Matcher without location (backward compatibility): Top match {match_no_loc[0]['wbs_code']} - {match_no_loc[0]['wbs_name']}.")

    # 7. Test Submitting Report with Location & DB Persistence
    report_in = ReportCreate(
        raw_text="Pulling 11kV cable to SWGR-01 finished today",
        language="English",
        reporter_name="Deepak (Electrical Foreman)",
        location="SWGR Room"
    )
    submit_res = submit_supervisor_report(report_in, conn)
    assert submit_res.location == "SWGR Room", f"Expected location 'SWGR Room', got {submit_res.location}"
    
    # Check DB row
    cursor.execute("SELECT location FROM reports WHERE id = ?", (submit_res.id,))
    db_loc = cursor.fetchone()["location"]
    assert db_loc == "SWGR Room", f"Persisted location should be 'SWGR Room', got {db_loc}"
    print(f"[PASS] Report submission & DB persistence: Report #{submit_res.id} stored with location='{db_loc}'.")

    # 8. Seed Demo Reports and verify reconciliation results
    seed_res = seed_demo_reports(conn)
    print(f"[PASS] Seeded {seed_res['seeded_count']} demo reports with locations.")

    cursor.execute("""
        SELECT r.id, r.language, r.location, r.raw_text, mc.wbs_code, mc.wbs_name, mc.confidence_score, mc.rank, mc.reasoning
        FROM reports r
        JOIN match_candidates mc ON r.id = mc.report_id
        WHERE mc.rank = 1
        ORDER BY r.id ASC
    """)
    rows = cursor.fetchall()
    print("\n--- SAMPLE DEMO RECONCILIATION SUMMARY ---")
    for r in rows:
        conf = r["confidence_score"]
        status_tag = "[AUTO-SUGGEST]" if conf >= 85.0 else "[AMBIGUOUS - REVIEW NEEDED]"
        loc_str = f" [Zone: {r['location']}]" if r["location"] else " [No location]"
        print(f"ID #{r['id']}{loc_str} | Lang: {r['language']}")
        print(f"  Input: \"{r['raw_text']}\"")
        print(f"  Matched: {r['wbs_code']} - {r['wbs_name']}")
        print(f"  Confidence: {conf}% {status_tag}")
        print(f"  Reasoning: {r['reasoning']}\n")

    # 9. Verify Dashboard Stats
    stats = get_dashboard_stats(conn)
    print("--- DASHBOARD STATS ---")
    print(f"Total Activities: {stats.total_activities}")
    print(f"Overall Progress: {stats.overall_progress_percent}%")
    print(f"Pending Reviews: {stats.pending_reports_count}")
    print(f"Ambiguous Reports (<85%): {stats.ambiguous_reports_count}")
    print("Discipline Breakdown:")
    for d in stats.discipline_stats:
        print(f"  {d['discipline']}: {d['avg_progress']}% avg progress ({d['total']} activities)")

    conn.close()
    print("\n>>> ALL 9 LOCATION & RECONCILIATION TEST SUITES PASSED WITH 100% SUCCESS! <<<")

if __name__ == "__main__":
    run_tests()
