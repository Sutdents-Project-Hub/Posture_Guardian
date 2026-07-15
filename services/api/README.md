# API：FastAPI

## 元件責任

`services/api` 承接 MediaPipe 姿態節點、可解釋規則、工作階段資料、PostgreSQL 與 AI provider。client 不得直接連資料庫或保存 provider secret。

已實作影像型態／5 MB 限制、33 節點推論、視角指標、匿名工作階段、衍生 sample、歷史、刪除、Foundry Responses API 與 fallback。影格只存在請求記憶體，不會寫入資料表。

## 已驗證環境

- Python 3.12.13
- FastAPI 0.139.0
- Ruff 0.15.21
- mypy 1.20.2
- pytest 9.1.1

## 本機開發

```bash
python3.12 -m venv .venv
.venv/bin/python -m pip install -e ".[dev]"
.venv/bin/python scripts/download_pose_model.py
.venv/bin/uvicorn posture_guardian_api.main:app --host 127.0.0.1 --port 8000
```

- Health：`http://127.0.0.1:8000/health`
- OpenAPI：`http://127.0.0.1:8000/openapi.json`
- Swagger UI：`http://127.0.0.1:8000/docs`

`pyproject.toml` 的 `[tool.fastapi]` 已設定 `posture_guardian_api.main:app`。

## 品質指令

2026-07-15 已通過：

```bash
.venv/bin/ruff check .
.venv/bin/mypy
.venv/bin/pytest -q
```

## 環境變數

- `APP_ENV`
- `DATABASE_URL`
- `CORS_ORIGINS`
- `POSE_MODEL_PATH`
- `AI_PROVIDER`
- `AZURE_FOUNDRY_ENDPOINT`
- `AZURE_FOUNDRY_API_KEY`
- `AZURE_FOUNDRY_MODEL`

本機預設使用 `services/api/posture_guardian.db`；Coolify 以 `DATABASE_URL` 切換到 async PostgreSQL driver。`AI_PROVIDER=foundry` 且 endpoint、key、model 都存在時才呼叫 Foundry，否則固定 fallback。

## 部署限制

- Dockerfile、port 8000 與 `/health` 已設定；容器 build 與實際 Coolify 環境仍待外部部署驗證。
- 不得保存原始影格或在 log 中輸出影像、secret、prompt 與個資。
- 外部 AI 失效不應阻擋核心姿勢判定。
