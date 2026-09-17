"""
AI Semantic Matching Engine for SIH16122.
Reconciles normalized supervisor reports against Primavera/MS Project WBS baseline activities.
Combines subword TF-IDF n-grams, dense semantic vectors, domain equipment tag matching,
and discipline gating to compute transparent confidence scores (0 - 100%).
"""

import re
import math
from typing import List, Dict, Any, Tuple, Optional
from difflib import SequenceMatcher
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from ..config import CONFIDENCE_THRESHOLD

# Optional dense sentence transformer model (graceful fallback)
_dense_model = None
_dense_model_attempted = False

def get_dense_model():
    global _dense_model, _dense_model_attempted
    if not _dense_model_attempted:
        _dense_model_attempted = True
        try:
            from sentence_transformers import SentenceTransformer
            # Prioritize local cached files so it never hangs on stage without Wi-Fi
            _dense_model = SentenceTransformer("all-MiniLM-L6-v2", local_files_only=True)
        except Exception:
            try:
                from sentence_transformers import SentenceTransformer
                _dense_model = SentenceTransformer("all-MiniLM-L6-v2")
            except Exception:
                # Fall back to high-precision TF-IDF + tag matching engine
                _dense_model = None
    return _dense_model


class WBSScheduleMatcher:
    """
    Evaluates supervisor field observations against WBS activities.
    Produces ranked top-3 candidate matches with confidence scores and explainable reasoning.
    """

    def __init__(self, activities: List[Dict[str, Any]], threshold: float = CONFIDENCE_THRESHOLD):
        self.activities = activities
        self.threshold = threshold
        self.vectorizer: Optional[TfidfVectorizer] = None
        self.tfidf_matrix = None
        self.activity_corpus: List[str] = []
        self._build_index()

    def _build_index(self):
        if not self.activities:
            return

        # Prepare rich indexing text for each WBS activity
        self.activity_corpus = [
            f"{act['code']} {act['discipline']} {act['name']} Level {act.get('wbs_level', 5)}"
            for act in self.activities
        ]

        # Use character subword n-grams (3-5 chars) to match engineering tags, typos, and abbreviations
        self.vectorizer = TfidfVectorizer(
            analyzer="char_wb",
            ngram_range=(3, 5),
            lowercase=True
        )
        self.tfidf_matrix = self.vectorizer.fit_transform(self.activity_corpus)

    def _token_overlap_score(self, query: str, target: str) -> float:
        """Calculates token overlap and maximum substring ratio."""
        q_tokens = set(re.findall(r"\w+", query.lower()))
        t_tokens = set(re.findall(r"\w+", target.lower()))
        if not q_tokens or not t_tokens:
            return 0.0
        intersection = q_tokens.intersection(t_tokens)
        return len(intersection) / max(len(q_tokens), 1)

    def match_report(self, raw_text: str, normalized_text: str = "", extracted_intent: Optional[Dict[str, Any]] = None, location: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Calculates confidence scores for WBS activities and returns the top 3 matches.
        If a location is specified and matching activities exist, narrows candidate pool first.
        """
        if not self.activities or self.tfidf_matrix is None:
            return []

        if extracted_intent is None:
            extracted_intent = {}
        if not normalized_text:
            normalized_text = raw_text

        # Determine candidate pool indices (narrow by location if specified and found)
        candidate_indices = list(range(len(self.activities)))
        location_applied = False
        if location and location.strip():
            loc_clean = location.strip().lower()
            matching_indices = [
                i for i, act in enumerate(self.activities)
                if act.get("location") and act["location"].strip().lower() == loc_clean
            ]
            if matching_indices:
                candidate_indices = matching_indices
                location_applied = True

        # 1. TF-IDF subword cosine similarity
        query_text = f"{normalized_text} {raw_text}"
        query_vec = self.vectorizer.transform([query_text])
        tfidf_scores = cosine_similarity(query_vec, self.tfidf_matrix)[0]

        # 2. Dense transformer similarity if available
        dense_scores = None
        model = get_dense_model()
        if model is not None:
            try:
                import torch
                q_emb = model.encode([query_text], convert_to_tensor=True)
                act_embs = model.encode(self.activity_corpus, convert_to_tensor=True)
                dense_sims = cosine_similarity(q_emb.cpu().numpy(), act_embs.cpu().numpy())[0]
                dense_scores = dense_sims
            except Exception:
                dense_scores = None

        target_discipline = extracted_intent.get("inferred_discipline")
        detected_tags = extracted_intent.get("equipment_tags", [])
        
        candidates = []
        for idx in candidate_indices:
            act = self.activities[idx]
            act_code = act["code"]
            act_name = act["name"]
            act_disc = act["discipline"]

            # Base similarity score
            sim_score = float(tfidf_scores[idx])
            if dense_scores is not None:
                sim_score = 0.5 * sim_score + 0.5 * float(dense_scores[idx])

            # Discipline alignment bonus/penalty
            discipline_bonus = 0.0
            if target_discipline and target_discipline != "General":
                if act_disc.lower() == target_discipline.lower():
                    discipline_bonus = 0.12
                else:
                    discipline_bonus = -0.15

            # Tag alignment bonus (e.g. Line 24, SWGR-01, JB-101, 11kV, 33kV, BFW-102)
            tag_bonus = 0.0
            act_full_text = f"{act_code} {act_name}".lower()
            
            # Check direct tag numbers in code or name
            for tag in detected_tags:
                tag_lower = tag.lower()
                if "line 24" in tag_lower or "24-inch" in tag_lower:
                    if "24" in act_full_text:
                        tag_bonus += 0.30
                elif "swgr-01" in tag_lower or "11kv" in tag_lower:
                    if "swgr-01" in act_full_text or "11kv" in act_full_text:
                        tag_bonus += 0.30
                elif "jb-101" in tag_lower or "junction" in tag_lower:
                    if "jb-101" in act_full_text or "junction" in act_full_text:
                        tag_bonus += 0.30
                elif "bfw-102" in tag_lower or "8-inch" in tag_lower:
                    if "bfw-102" in act_full_text or "8" in act_full_text:
                        tag_bonus += 0.30
                elif "pedestal" in tag_lower or "turbine" in tag_lower:
                    if "pedestal" in act_full_text or "turbine" in act_full_text:
                        tag_bonus += 0.30
                elif "drainage" in tag_lower or "trench" in tag_lower:
                    if "drainage" in act_full_text or "manhole" in act_full_text:
                        tag_bonus += 0.25

            # Token overlap boost
            token_score = self._token_overlap_score(normalized_text, f"{act_code} {act_name}")
            
            # Composite raw confidence (0.0 to 1.0)
            raw_confidence = (0.50 * sim_score) + (0.25 * token_score) + tag_bonus + discipline_bonus
            # Clamp between 0.05 and 0.98
            clamped = max(0.05, min(0.98, raw_confidence))
            
            # Convert to 0 - 100 percentage with 1 decimal place
            confidence_pct = round(clamped * 100.0, 1)

            # Build explainable reasoning
            reasons = []
            if location_applied and act.get("location"):
                reasons.append(f"Zone filtered: {act.get('location')}")
            if tag_bonus > 0:
                reasons.append(f"Tag match ({', '.join(detected_tags)})")
            if target_discipline and target_discipline.lower() == act_disc.lower():
                reasons.append(f"Discipline match ({act_disc})")
            if sim_score > 0.4:
                reasons.append("Strong semantic phrase similarity")
            elif sim_score > 0.2:
                reasons.append("Partial terminology overlap")
            else:
                reasons.append("Low contextual similarity")

            reason_str = "; ".join(reasons)

            candidates.append({
                "wbs_id": act["id"],
                "wbs_code": act_code,
                "wbs_name": act_name,
                "wbs_discipline": act_disc,
                "location": act.get("location"),
                "confidence_score": confidence_pct,
                "reasoning": reason_str,
            })

        # Sort descending by confidence score
        candidates.sort(key=lambda x: x["confidence_score"], reverse=True)
        top_3 = candidates[:3]

        # Assign ranks and recommendation flag
        for rank, cand in enumerate(top_3, start=1):
            cand["rank"] = rank
            cand["is_recommended"] = (rank == 1 and cand["confidence_score"] >= self.threshold)

        return top_3
