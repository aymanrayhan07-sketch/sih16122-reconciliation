"""
Multilingual Vernacular Normalizer & Construction Intent Extractor for SIH26122.
Normalizes site diaries, voice notes, and WhatsApp-style field reports in Telugu,
Hindi, Tamil, Hinglish, and construction field slang into standardized engineering terms.
"""

import re
from typing import Dict, Any, Tuple, Optional

# Vernacular action words to standardized intent
ACTION_TRANSLATIONS = {
    # Telugu
    "aipoyindi": "completed",
    "ayipoyindi": "completed",
    "chesamu": "completed",
    "jarigindi": "in progress",
    "jaruguthundi": "in progress",
    "avvaledu": "not completed",
    "cheyali": "pending",
    "mottham": "all 100%",

    # Hindi / Hinglish
    "ho gaya": "completed",
    "khatam": "completed",
    "khatam ho gaya": "completed",
    "pura ho gaya": "completed",
    "pura hua": "completed",
    "chal raha hai": "in progress",
    "chalu hai": "in progress",
    "aage badh raha": "in progress",
    "kar diya": "completed",
    "baki hai": "pending",
    "shuru hua": "started",

    # Tamil
    "mudichachu": "completed",
    "mudinjithu": "completed",
    "nadakkuthu": "in progress",
    "aachu": "completed",
    "aarambichom": "started",

    # Informal Site Slang
    "done": "completed",
    "finished": "completed",
    "wrapped up": "completed",
    "completed": "completed",
    "pouring": "pour concrete",
    "poured": "pour concrete completed",
    "erected": "erection completed",
    "pulled": "pull cable completed",
    "welded": "welding completed",
    "torqued": "bolt torquing completed",
    "tested": "pressure test completed",
}

# Vernacular construction terms to Primavera WBS terminology
CONSTRUCTION_TERMINOLOGY_MAP = {
    # Slang & colloquial
    "mud": "mass concrete pour",
    "mud pour": "pour mass concrete slab",
    "dhalai": "concrete pouring",
    "sariya": "steel rebar reinforcement formwork",
    "khudai": "excavate foundation trench",
    "kombu": "steel rebar",
    "taar": "cable wire",
    "pedestal": "turbine generator pedestal slab foundation",
    "mat": "mat foundation rebar formwork",
    "spool": "line spool segments pipe rack",
    "spools": "line spool segments pipe rack",
    "swgr": "switchgear SWGR-01 medium voltage",
    "mcc": "motor control center MCC-02 415V",
    "jb": "junction box JB-101",
    "jb-101": "junction box JB-101 Area 20",
    "jb101": "junction box JB-101 Area 20",
    "jb-102": "junction box JB-102 Area 20",
    "jb102": "junction box JB-102 Area 20",
    "grout": "grout baseplates steam turbine skids",
    "grouting": "grout baseplates steam turbine skids",
    "feeder": "11kV medium voltage feeder cable SWGR-01",
    "megger": "megger insulation resistance testing 11kV loop",
    "hydro": "hydrostatic pressure test underground firewater header",
    "hydrotest": "hydrostatic pressure test underground firewater header",
    "ndt": "radiographic NDT inspection of welds",
    "x-ray": "radiographic NDT inspection of welds",
    "drainage": "perimeter drainage trench and manholes",
    "ditch": "drainage trench and manholes",
    "trench": "excavate foundation trench",
    "bushings": "33kV step-up transformer bushings",
    "earthing": "grounding grid copper tape substation yard",
    "grounding": "grounding grid copper tape substation yard",
    "copper tape": "grounding grid copper tape substation yard",
    "impulse": "impulse tubing to pressure transmitters",
    "tubing": "impulse tubing to pressure transmitters",
    "firewater": "underground firewater header FW-01",
    "fw-01": "underground firewater header FW-01",
    "fw01": "underground firewater header FW-01",
    "bfw": "boiler feedwater high pressure bypass line 8-inch BFW-102",
    "bfw-102": "boiler feedwater high pressure bypass line 8-inch BFW-102",
    "bfw102": "boiler feedwater high pressure bypass line 8-inch BFW-102",
    "steam line": "thermal insulation and jacketing on steam line",
    "insulation": "apply exterior thermal insulation and jacketing on steam line",
    "loop check": "loop checking and DCS signal verification turbine",
    "dcs": "loop checking and DCS signal verification turbine",
}

# Equipment & Tag regex patterns for engineering specificity
TAG_PATTERNS = [
    (r"\b(line\s*24|\b24[\"\']?\b|24\s*inch)\b", "24-inch Cooling Water Line"),
    (r"\b(11\s*kv|mv|medium\s*voltage)\b", "11kV MV Feeder"),
    (r"\b(swgr[-_ ]?01|switchgear)\b", "SWGR-01 Switchgear"),
    (r"\b(mcc[-_ ]?02|415\s*v)\b", "MCC-02 Motor Control Center"),
    (r"\b(jb[-_ ]?10[12]|junction\s*box)\b", "JB-101/102 Field Junction Box"),
    (r"\b(fw[-_ ]?01|firewater)\b", "FW-01 Underground Firewater Header"),
    (r"\b(bfw[-_ ]?102|boiler\s*feedwater|8\s*inch)\b", "8-inch BFW-102 Line"),
    (r"\b(tg|turbine\s*generator|pedestal)\b", "Turbine Generator Pedestal"),
    (r"\b(33\s*kv|transformer|bushings)\b", "33kV Transformer"),
    (r"\b(drainage|trench|manholes?)\b", "Drainage Trench & Manholes"),
    (r"\b(ndt|x-ray|radiographic)\b", "Radiographic NDT Inspection"),
    (r"\b(hydrostatic|hydrotest)\b", "Hydrostatic Pressure Test"),
]

def normalize_field_text(raw_text: str) -> Tuple[str, Dict[str, Any]]:
    """
    Normalizes multilingual field text into an enriched English construction representation
    and extracts structured intent entities (action, equipment tags, progress percentage).
    """
    clean_text = raw_text.strip()
    lower_text = clean_text.lower()
    
    # 1. Extract progress percentage if present (e.g. "80%", "75 %", "100%")
    pct_match = re.search(r"(\d{1,3})\s*%", lower_text)
    progress_pct: Optional[float] = None
    if pct_match:
        val = float(pct_match.group(1))
        if 0 <= val <= 100:
            progress_pct = val

    # 2. Extract quantity and units (e.g. "50m", "50 meters", "10 joints", "4 spools")
    qty_match = re.search(r"(\d+(?:\.\d+)?)\s*(meters?|m|joints?|spools?|nos?|tonnes?|t)\b", lower_text)
    extracted_qty = None
    extracted_unit = None
    if qty_match:
        extracted_qty = float(qty_match.group(1))
        extracted_unit = qty_match.group(2)

    # 3. Detect vernacular action / completion status
    detected_status = "IN_PROGRESS"
    detected_actions = []
    for phrase, std_term in ACTION_TRANSLATIONS.items():
        if re.search(r"\b" + re.escape(phrase) + r"\b", lower_text):
            detected_actions.append(std_term)
            if std_term == "completed" or std_term == "all 100%":
                detected_status = "COMPLETED"
                if progress_pct is None:
                    progress_pct = 100.0

    # 4. Detect tags / equipment
    detected_tags = []
    for pattern, tag_label in TAG_PATTERNS:
        if re.search(pattern, lower_text, re.IGNORECASE):
            detected_tags.append(tag_label)

    # 5. Build enriched normalized semantic text
    normalized_tokens = []
    # Replace multi-word terms first
    temp_text = lower_text
    for phrase, std_term in ACTION_TRANSLATIONS.items():
        temp_text = re.sub(r"\b" + re.escape(phrase) + r"\b", f" {std_term} ", temp_text)
    for term, exp in CONSTRUCTION_TERMINOLOGY_MAP.items():
        temp_text = re.sub(r"\b" + re.escape(term) + r"\b", f" {exp} ", temp_text)

    # Clean redundant whitespaces
    normalized_str = " ".join(temp_text.split())
    
    # Append detected tags to ensure strong semantic indexing
    if detected_tags:
        normalized_str += " | Tags: " + ", ".join(detected_tags)

    # Infer discipline
    discipline = "General"
    if any(k in normalized_str.lower() for k in ["pipe", "spool", "welding", "hydro", "fw-01", "bfw", "ndt"]):
        discipline = "Piping"
    elif any(k in normalized_str.lower() for k in ["concrete", "excavate", "foundation", "pedestal", "trench", "grout", "rebar"]):
        discipline = "Civil"
    elif any(k in normalized_str.lower() for k in ["cable", "swgr", "mcc", "11kv", "feeder", "transformer", "grounding", "megger"]):
        discipline = "Electrical"
    elif any(k in normalized_str.lower() for k in ["junction box", "jb-101", "impulse tubing", "transmitter", "dcs", "loop check"]):
        discipline = "Instrumentation"
    elif any(k in normalized_str.lower() for k in ["safety", "gas audit", "barrier", "hazard"]):
        discipline = "HSE"

    extracted_intent = {
        "status": detected_status,
        "progress_percent": progress_pct if progress_pct is not None else (100.0 if detected_status == "COMPLETED" else 25.0),
        "inferred_discipline": discipline,
        "equipment_tags": detected_tags,
        "quantity": extracted_qty,
        "unit": extracted_unit,
        "actions_detected": list(set(detected_actions))
    }

    return normalized_str, extracted_intent
