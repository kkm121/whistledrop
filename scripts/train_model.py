"""Usage: python scripts/train_model.py  (also runs on Kaggle as-is)"""
import sys
from app.config import get_settings
from app.ml.train import train

if __name__ == "__main__":
    s = get_settings()
    info = train(s.seed_csv, s.model_path)
    print(f"Trained on {info['n_samples']} samples -> {info['path']}")
    print(f"Holdout accuracy: {info['accuracy']}")
    sys.exit(0)
