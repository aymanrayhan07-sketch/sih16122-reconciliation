import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import get_db_connection
from app.routes.dashboard import get_dashboard_stats
from app.routes.reports import get_pending_reports

conn = get_db_connection()
cursor = conn.cursor()

cursor.execute("""
    SELECT r.id, r.language, r.raw_text, mc.wbs_code, mc.wbs_name, mc.confidence_score, mc.rank, mc.reasoning
    FROM reports r
    JOIN match_candidates mc ON r.id = mc.report_id
    WHERE mc.rank = 1
    ORDER BY r.id ASC
""")
rows = cursor.fetchall()
print("\n--- AI MATCHING RECONCILIATION TEST RESULTS ---")
for r in rows:
    conf = r["confidence_score"]
    status_tag = "[AUTO-SUGGEST]" if conf >= 85.0 else "[AMBIGUOUS - REVIEW NEEDED]"
    print(f"ID {r['id']} | Lang: {r['language']}")
    print(f"  Input: \"{r['raw_text']}\"")
    print(f"  Matched: {r['wbs_code']} - {r['wbs_name']}")
    print(f"  Confidence: {conf}% {status_tag}")
    print(f"  Reasoning: {r['reasoning']}\n")

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
