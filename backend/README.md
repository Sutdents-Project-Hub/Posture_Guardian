# API：FastAPI

## 元件責任

`backend` 承接 MediaPipe 姿態節點、可解釋規則、工作階段資料、PostgreSQL 與 AI provider。client 不得直接連資料庫或保存 provider secret。

已實作影像型態／5 MB／1,200 萬像素限制、33 節點推論、視角與有限數值輸入驗證、匿名工作階段、衍生 sample、六次趨勢 AI 輸入、不含自由文字的提醒感受、歷史、刪除、量界智算 OpenAI-compatible adapter 與 fallback。影格只存在請求記憶體，不會寫入資料表。

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

- Liveness：`http://127.0.0.1:8000/live`
- Readiness：`http://127.0.0.1:8000/health`（資料庫或模型未就緒時回傳 HTTP 503）
- OpenAPI：`http://127.0.0.1:8000/openapi.json`
- Swagger UI：`http://127.0.0.1:8000/docs`

`pyproject.toml` 的 `[tool.fastapi]` 已設定 `posture_guardian_api.main:app`。
`requirements.lock` 固定 production 容器的完整相依版本；更新 `pyproject.toml` 依賴後必須重新產生 lock，並重跑 API、姿態流程與容器驗證，不可只手動改其中一邊。

## 品質指令

2026-07-16 已通過：

```bash
.venv/bin/python -m ruff check .
.venv/bin/python -m mypy
.venv/bin/python -m pytest -q
```

## 環境變數

- `APP_ENV`
- `DATABASE_URL`
- `DB_HOST`、`DB_PORT`、`DB_NAME`、`DB_USER`、`DB_PASSWORD`
- `CORS_ORIGINS`
- `POSE_MODEL_PATH`
- `MIGRATION_ROOT`（Docker 固定為 `/app`；本機預設 component root）
- `AI_PROVIDER`
- `AI_BASE_URL`、`AI_API_KEY`、`AI_MODEL`
- `AI_API_MODE`、`AI_TIMEOUT_SECONDS`

本機預設使用 `backend/posture_guardian.db`；Coolify 以分離的 `DB_*` 欄位連 PostgreSQL，特殊密碼字元會由 SQLAlchemy 安全編碼。啟動時自動執行 Alembic migration。`AI_PROVIDER=liangjie` 必須同時具備完整 base URL、key 與 model；預設 Chat Completions，也可依正式文件切 Responses。外部呼叫預設 8 秒、SDK 零重試，少於 10 分鐘有效資料不呼叫付費 AI；輸出不符合三段式、字數或非醫療契約時改用 fallback。

## 部署限制

- Dockerfile、production dependency lock、Alembic、port 8000、`/live` 與 `/health` 已設定；本次架構轉換後的 Linux ARM64 container build、PostgreSQL migration 與健康檢查已驗證，實際 Coolify 環境仍待驗證。
- 不得保存原始影格或在 log 中輸出影像、secret、prompt 與個資。
- 外部 AI 失效不應阻擋核心姿勢判定。
