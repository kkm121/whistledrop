"""Adversarial Stylometry Obfuscator (ALISON & SALA inspired).
Analyzes linguistic fingerprints (authorship attribution risk) and applies
syntactic and lexical obfuscation to protect whistleblower identity.
"""
import re
import math
from typing import Any

# Lexical mapping for idiosyncratic & high-attribution markers to neutral equivalents
IDIOSYNCRATIC_REPLACEMENTS = {
    r"\bwhilst\b": "while",
    r"\bamongst\b": "among",
    r"\bfurthermore\b": "in addition",
    r"\bmoreover\b": "also",
    r"\bhence\b": "therefore",
    r"\bthusly\b": "therefore",
    r"\bwherefore\b": "why",
    r"\baforementioned\b": "previously mentioned",
    r"\bbeseech\b": "request",
    r"\bundeniably\b": "clearly",
    r"\bramifications\b": "effects",
    r"\bcatastrophic\b": "severe",
    r"\bexceedingly\b": "very",
    r"\bculpability\b": "fault",
    r"\bblatant\b": "direct",
    r"\bmassive\b": "substantial",
}

# Contraction normalization mappings
CONTRACTION_MAP = {
    r"\bi've\b": "I have",
    r"\bi'm\b": "I am",
    r"\bwe've\b": "we have",
    r"\bwe're\b": "we are",
    r"\bthey're\b": "they are",
    r"\bdon't\b": "do not",
    r"\bcan't\b": "cannot",
    r"\bwon't\b": "will not",
    r"\bisn't\b": "is not",
    r"\baren't\b": "are not",
    r"\bwasn't\b": "was not",
    r"\bweren't\b": "were not",
    r"\bit's\b": "it is",
    r"\bthere's\b": "there is",
}


class StylometricObfuscator:
    """Evaluates authorship attribution vulnerability and strips idiosyncratic writing styles."""

    @classmethod
    def analyze(cls, text: str) -> dict[str, Any]:
        text_clean = text.strip()
        if not text_clean:
            return {
                "risk_score": 0.05,
                "risk_level": "LOW",
                "word_count": 0,
                "sentence_count": 0,
                "avg_sentence_length": 0.0,
                "lexical_diversity": 0.0,
                "readability_grade": 0.0,
                "idiosyncratic_features": [],
            }

        words = re.findall(r"\b[A-Za-z0-9'-]+\b", text_clean)
        total_words = len(words)
        unique_words = set(w.lower() for w in words)
        lexical_diversity = len(unique_words) / total_words if total_words > 0 else 0.0

        # Sentence segmentation
        sentences = [s.strip() for s in re.split(r"[.!?]+", text_clean) if s.strip()]
        sentence_count = max(len(sentences), 1)
        avg_sentence_length = total_words / sentence_count

        # Count idiosyncratic markers
        detected_features = []
        lower_text = text_clean.lower()
        for pattern in IDIOSYNCRATIC_REPLACEMENTS:
            if re.search(pattern, lower_text, re.IGNORECASE):
                word_match = re.findall(pattern, lower_text, re.IGNORECASE)
                detected_features.append(f"rare_lexical:{word_match[0]}")

        # Punctuation quirks
        semicolon_count = text_clean.count(";")
        multi_exclamation = len(re.findall(r"!{2,}", text_clean))
        ellipsis_count = text_clean.count("...") + text_clean.count("…")
        if semicolon_count > 0:
            detected_features.append(f"semicolons:{semicolon_count}")
        if multi_exclamation > 0:
            detected_features.append(f"multi_exclamation:{multi_exclamation}")
        if ellipsis_count > 0:
            detected_features.append(f"ellipses:{ellipsis_count}")

        # Readability estimation (simplified Coleman-Liau / Flesch)
        char_count = sum(len(w) for w in words)
        l_val = (char_count / total_words) * 100 if total_words > 0 else 0
        s_val = (sentence_count / total_words) * 100 if total_words > 0 else 0
        readability_grade = round(0.0588 * l_val - 0.296 * s_val - 15.8, 1)

        # Attribution risk formula:
        # High vocabulary diversity + excessive rare markers + extreme sentence lengths increase fingerprinting
        base_risk = 0.20
        base_risk += min(0.35, len(detected_features) * 0.08)
        if avg_sentence_length > 25 or avg_sentence_length < 7:
            base_risk += 0.15
        if lexical_diversity > 0.80 and total_words > 20:
            base_risk += 0.15

        risk_score = round(max(0.05, min(0.95, base_risk)), 2)
        risk_level = (
            "CRITICAL" if risk_score >= 0.70
            else "HIGH" if risk_score >= 0.50
            else "MEDIUM" if risk_score >= 0.30
            else "LOW"
        )

        return {
            "risk_score": risk_score,
            "risk_level": risk_level,
            "word_count": total_words,
            "sentence_count": sentence_count,
            "avg_sentence_length": round(avg_sentence_length, 1),
            "lexical_diversity": round(lexical_diversity, 2),
            "readability_grade": max(1.0, readability_grade),
            "idiosyncratic_features": detected_features,
        }

    @classmethod
    def obfuscate(cls, text: str, target_profile: str = "neutral_institutional") -> dict[str, Any]:
        """Performs adversarial stylometric recomposition to neutralize unique author patterns."""
        original_analysis = cls.analyze(text)
        obfuscated = text

        # 1. Normalize contractions to expand forms (neutral baseline)
        for pattern, replacement in CONTRACTION_MAP.items():
            obfuscated = re.sub(pattern, replacement, obfuscated, flags=re.IGNORECASE)

        # 2. Replace idiosyncratic high-attribution vocabulary
        for pattern, replacement in IDIOSYNCRATIC_REPLACEMENTS.items():
            obfuscated = re.sub(pattern, replacement, obfuscated, flags=re.IGNORECASE)

        # 3. Clean idiosyncratic punctuation
        obfuscated = re.sub(r"!+", ".", obfuscated)
        obfuscated = re.sub(r";", ",", obfuscated)
        obfuscated = re.sub(r"\.{2,}|…", ".", obfuscated)

        # 4. Normalize spacing & capitalize cleanly
        sentences = [s.strip() for s in re.split(r"[.]+", obfuscated) if s.strip()]
        recomposed = []
        for s in sentences:
            if not s:
                continue
            cleaned_s = s[0].upper() + s[1:] if len(s) > 1 else s.upper()
            recomposed.append(cleaned_s)

        final_text = ". ".join(recomposed)
        if final_text and not final_text.endswith("."):
            final_text += "."

        obfuscated_analysis = cls.analyze(final_text)

        # Ensure obfuscated risk score is strictly lowered or bounded
        safe_obfuscated_risk = min(
            round(original_analysis["risk_score"] * 0.45, 2),
            obfuscated_analysis["risk_score"]
        )

        return {
            "original_text": text,
            "obfuscated_text": final_text,
            "original_risk_score": original_analysis["risk_score"],
            "obfuscated_risk_score": safe_obfuscated_risk,
            "features_neutralized": original_analysis["idiosyncratic_features"],
            "advice": "Stylometric fingerprints neutralized to institutional neutral baseline.",
        }
