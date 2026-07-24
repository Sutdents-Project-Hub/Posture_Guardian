# API：FastAPI

## 元件責任

`backend` 承接固定版本 MediaPipe Pose Landmarker Full、自動／固定視角、半身／全身入鏡範圍、單人房間品質、aspect-corrected 2D 規則、工作階段／週報資料、PostgreSQL 與 AI provider。client 不得直接連資料庫或保存 provider secret。

已實作 Argon2 密碼雜湊、可撤銷 opaque bearer session、每筆工作階段的帳號 ownership、影像型態／5 MB／1,200 萬像素限制、33 節點推論、`auto/front/side`、`upper_body/full_body`、人物過小／多人／出框品質拒絕、有限數值輸入驗證、衍生 sample 與 reminder 標記、週報、六次趨勢 AI 輸入、不含自由文字的提醒感受、歷史、刪除、量界智算 OpenAI-compatible adapter 與 fallback。影格只存在請求記憶體，不會寫入資料表。

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
.venv/bin/python -m uvicorn posture_guardian_api.main:app --host 127.0.0.1 --port 8000
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
- `AUTH_SESSION_DAYS`（1–30，預設 14）

本機預設使用 `backend/posture_guardian.db`；Coolify 的獨立 `posture-guardian-api` Resource 以分離的 `DB_*` 欄位連同 environment 的 `posture-guardian-postgres` internal host，特殊密碼字元會由 SQLAlchemy 安全編碼。`POSE_MODEL_PATH` 預設為 `./models/pose_landmarker_full.task`；下載 script 固定官方 `pose_landmarker_full/float16/1` 並驗證 SHA-256 `5134a3aad27a58b93da0088d431f366da362b44e3ccfbe3462b3827a839011b1`。`DB_PASSWORD` 與 `AI_API_KEY` 是 runtime secrets，`CORS_ORIGINS` 只能填完整 HTTPS Web origin。啟動時自動執行 Alembic migration。註冊只儲存 Email 與 Argon2 hash，server 只保存 SHA-256 digest 的隨機 bearer token；未登入、過期 token 或他人 session ID 都不能讀寫工作階段。`AI_PROVIDER=liangjie` 必須同時具備完整 base URL、key 與 model；預設 Chat Completions，也可依正式文件切 Responses。外部呼叫預設 8 秒、SDK 零重試，少於 10 分鐘有效資料不呼叫付費 AI；輸出不符合三段式、字數或非醫療契約時改用 fallback。

## 姿態與週報契約

- `/api/v1/posture/analyze` 的 requested view 接受 `auto|front|side`，回傳解析後的 `front|side|null`（auto 無法可靠判定時為 null）、`coverage_mode=upper_body|full_body`、`image_width`、`image_height`、`pose_count`、`subject_scale`、`distance=near|recommended|far|unknown`、`framing=complete|partial|out_of_frame` 與 `quality_issues`。
- `auto` 視角不確定、人物過小／過遠、多人、必要節點出框或截斷時回傳 invalid；不以低品質骨架產生姿勢事件。
- 2D 角度先用實際影像寬高校正。半身使用頭頸、肩線、軀幹；全身側面增加 `knee_flexion` 15°，全身正面增加 `hip_tilt` 6° 與 `knee_tilt` 8°，全部都是相對個人基線的產品起始門檻。
- session 建立時保存 `coverage_mode` 與 `room_mode`；sample 的 `reminder_triggered` 只標記實際提醒，避免週報把 cooldown 內每個超標影格重複計數。
- session summary 另回傳 `coverage_mode`、`room_mode`、`attention_seconds`、`poor_seconds` 與 `reminder_count`。
- `GET /api/v1/reports/weekly?timezone=Asia/Taipei` 僅回傳目前 bearer 帳號，依 sample duration 加權聚合本週 `good/attention/poor/invalid` 秒數、整體良好率、凌晨 `00–06`／上午 `06–12`／下午 `12–18`／晚上 `18–24`、提醒次數與主要偏移；client 可由狀態秒數呈現比例。GET 不呼叫外部 AI，只重用最新已持久化 session insight 與 provider；沒有 insight 時回傳 deterministic fallback。

上述指標是 2D 姿勢 proxy，不是脊椎曲率、公分、頸椎壓力或醫療判定。房間模式只支援固定鏡頭的單人區域，不承諾任意距離或多人追蹤。

## 部署限制

- Dockerfile、production dependency lock、Alembic、port 8000、`/live` 與 `/health` 已設定；正式 Coolify 以 `/backend` Dockerfile Resource 部署。既有 Linux ARM64 container／PostgreSQL 拓撲曾通過整合驗證；Full model 與 `20260724_01` migration 的候選版須重新建置與驗證，實際 Coolify Resource 仍待驗證。
- 不得保存原始影格或在 log 中輸出影像、secret、prompt 與個資。
- 外部 AI 失效不應阻擋核心姿勢判定。
- Full model 的正式 VPS CPU／記憶體、決賽裝置延遲、房間支援區、auto 視角與全身新指標尚待真人與 production 驗證；通過單元測試不能替代這些證據。
