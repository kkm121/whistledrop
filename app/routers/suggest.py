"""Additive ML endpoints. Suggestions never mutate reports."""
from fastapi import APIRouter

from ..schemas import Category, SuggestIn, SuggestOut
from ..ml import service as ml

router = APIRouter(tags=["suggest"])


@router.post("/suggest/category", response_model=SuggestOut)
def suggest_category(body: SuggestIn):
    label, confidence, abstained = ml.suggest_category(body.description)
    return SuggestOut(
        label=Category(label) if label else None,
        confidence=round(confidence, 4),
        abstained=abstained,
        hint=(
            "Confidence below threshold; a moderator should pick the category."
            if abstained
            else "Machine suggestion only; the reporter-chosen category stands."
        ),
    )
