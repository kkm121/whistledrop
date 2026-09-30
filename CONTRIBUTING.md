# Contributing

1. Fork and branch: `git checkout -b feat/my-change`.
2. Set up: `python -m venv .venv`, activate, `pip install -r requirements.txt`.
3. Train: `python scripts/train_model.py`. Run: `uvicorn app.main:app --reload`.
4. Verify: `python -m pytest tests/ -q` must be fully green.
5. Open a PR with the template. Original work only — recruitment plagiarism rules apply.
6. Never commit `.db` files, model artifacts, `.env` files, or secrets.
