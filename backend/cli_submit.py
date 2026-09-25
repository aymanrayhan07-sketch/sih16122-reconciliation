"""
Interactive Terminal CLI for Submitting Supervisor Reports (SIH26122).
Allows site supervisors or judges to submit progress updates directly from the command line.
"""

import sys
import argparse
import json
import urllib.request
import urllib.error

# Force UTF-8 on Windows stdout if possible
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

API_URL = "http://127.0.0.1:8000/api/reports"

def submit_from_terminal(text: str, language: str = "English", reporter: str = "Terminal Supervisor"):
    payload = {
        "raw_text": text,
        "language": language,
        "reporter_name": reporter
    }

    req = urllib.request.Request(
        API_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )

    try:
        with urllib.request.urlopen(req) as response:
            res = json.loads(response.read().decode("utf-8"))
    except urllib.error.URLError as e:
        print(f"\n[ERROR] Could not connect to backend at {API_URL}.")
        print("Please make sure the backend server is running (`python run_backend.py`).")
        return

    print("\n" + "="*65)
    print(" [SIH26122] AI RECONCILIATION RESULT")
    print("="*65)
    print(f" Report ID     : #{res['id']}")
    print(f" Reporter      : {res['reporter_name']} ({res['language']})")
    print(f" Input Text    : \"{res['raw_text']}\"")
    print(f" Normalized    : {res['normalized_text']}")
    
    top_cand = res["candidates"][0] if res["candidates"] else None
    conf = res.get("top_confidence", 0.0)
    is_ambiguous = res.get("is_ambiguous", False)

    print("\n" + "-"*65)
    if not is_ambiguous:
        print(f" [OK] AUTO-SUGGEST MATCH (Confidence: {conf}% >= 85%)")
    else:
        print(f" [!] AMBIGUOUS MATCH DETECTED (Confidence: {conf}% < 85%)")
        print("     [Planner Verification Required in Dashboard]")
    print("-"*65)

    if top_cand:
        print(f" Primary Match : {top_cand['wbs_code']} - {top_cand['wbs_name']}")
        print(f" Discipline    : {top_cand['wbs_discipline']}")
        print(f" AI Reasoning  : {top_cand['reasoning']}")

    print("\n Top 3 Candidate Matches:")
    for cand in res["candidates"]:
        mark = "[*]" if cand["rank"] == 1 else "   "
        print(f"  {mark} #{cand['rank']} [{cand['confidence_score']}%] {cand['wbs_code']} ({cand['wbs_discipline']}): {cand['wbs_name']}")

    print("\n -> View in Planner Review Dashboard: http://localhost:5173")
    print("="*65 + "\n")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Submit field progress report to SIH26122 AI Engine")
    parser.add_argument("text", nargs="?", help="Progress report text (e.g. '24 inch spool erection aipoyindi')")
    parser.add_argument("--lang", default="Regional / Slang", help="Language or dialect")
    parser.add_argument("--reporter", default="Field Supervisor", help="Supervisor name")

    args = parser.parse_args()

    if args.text:
        submit_from_terminal(args.text, args.lang, args.reporter)
    else:
        # Interactive mode
        print("\n=== SIH26122 Field Report Terminal Ingestion ===")
        print("Type your observation below (or Ctrl+C to exit):")
        try:
            user_text = input("\nEnter site observation: ").strip()
            if user_text:
                submit_from_terminal(user_text)
            else:
                print("No text entered.")
        except KeyboardInterrupt:
            print("\nExited.")
