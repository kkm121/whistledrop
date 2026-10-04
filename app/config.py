"""Central configuration, all overridable via environment variables."""
import os
from functools import lru_cache


class Settings:
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./whistledrop.db")
    moderator_api_key: str = os.getenv(
        "MODERATOR_API_KEY", "dev-moderator-key-CHANGE-ME"
    )
    model_path: str = os.getenv("MODEL_PATH", "models/whistledrop_clf.joblib")
    seed_csv: str = os.getenv("SEED_CSV", "data/seed_reports.csv")
    suggest_threshold: float = float(os.getenv("SUGGEST_THRESHOLD", "0.45"))
    duplicate_threshold: float = float(os.getenv("DUPLICATE_THRESHOLD", "0.72"))


@lru_cache
def get_settings() -> Settings:
    return Settings()
