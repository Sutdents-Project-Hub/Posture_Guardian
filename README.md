# 姿勢守衛隊 Posture Guardian

> 決賽 MVP 已完成可操作垂直切片｜部署架構已轉為 VPS／Coolify／PostgreSQL／量界智算｜外部資源尚未建立

## 專案簡介

姿勢守衛隊是為長時間讀書的中學生設計的跨平台坐姿覺察系統。目標不是診斷疾病，而是透過相機姿態節點、個人中性坐姿基線與持續時間，讓使用者及早察覺姿勢偏移，再用雲端趨勢與 AI 建議協助養成習慣。

本專案已進入第六屆中學生黑客松決賽，主賽事日期為 2026-07-26。目前已具備一條穩定、可重現、可離線降級的展示流程。

## 命名對照

| 用途 | 名稱 |
|---|---|
| GitHub repository／本機根資料夾 | `Posture_Guardian` |
| Project slug／Coolify project | `posture-guardian` |
| 本機 Docker Compose project | `posture_guardian`（整合驗證） |
| Coolify Resources | `posture-guardian-web`、`posture-guardian-api`、`posture-guardian-postgres` |

正式 Coolify production 以三個獨立 Resources 部署：`app/Dockerfile` 建置 Web、`backend/Dockerfile` 建置 API，並使用受管 PostgreSQL Resource。`compose.coolify.yaml` 保留為本機三容器整合驗證，不作 Coolify production entrypoint。

## 核心方案

1. 使用者選擇正面或側面視角，完成 10 秒個人校準。
2. MediaPipe Pose Landmarker 擷取人體姿態節點；規則引擎計算可解釋角度與偏移。
3. 偏移持續超過時間窗才提醒，避免每次小動作都打斷使用者。
4. PostgreSQL 只保存衍生指標、工作階段與提醒事件，預設不保存原始影像。
5. 已登入使用者的工作階段會由 API 依帳號權限保存；量界智算只讀取同一帳號最近六次的去識別摘要，產生「趨勢、下一步、下次目標」；資料不足或模型不可用時使用明確標示的規則式 fallback。

姿勢標準、初期／進階／加強介入條件與驗證方式以 [姿勢判定規格](docs/posture-evaluation.md) 為準。

## 目前狀態

| 項目 | 狀態 |
|---|---|
| Expo Android／iOS／Web | AI 首頁、登入／註冊、相機設定、校準、即時偵測、摘要、合格工作階段趨勢、AI 稽核資訊，以及方角編輯式的跟隨系統／淺色／深色外觀已實作 |
| FastAPI | Argon2 密碼雜湊、可撤銷 bearer session、資料 ownership、MediaPipe 分析、嚴格輸入驗證、工作階段、長期 AI 摘要、提醒感受、歷史、刪除與存活／就緒檢查已實作 |
| 姿態事件與提醒 | 10 秒校準、5 秒滾動中位數、8 秒有效偏移累積、3 秒有效回正與分級 cooldown 已實作 |
| 資料庫 | SQLAlchemy + Alembic baseline 已實作；本機預設 SQLite，Coolify 使用 PostgreSQL |
| 量界智算 | 可設定的 OpenAI-compatible Chat Completions／Responses adapter 已實作；真實 endpoint／model／key 待帳號文件確認 |
| Coolify／量界智算資源 | 尚未建立、未部署；目前只完成程式與本機驗證 |
| 本機 Git | `main` 已有候選版本歷史；GitHub remote 已設定為 `Sutdents-Project-Hub/Posture_Guardian` |

## 技術與元件

| 路徑 | 責任 | 已驗證技術 |
|---|---|---|
| `app` | Android、iOS 與響應式 Web 使用介面 | Expo 54、React Native 0.81.5、TypeScript、Expo Camera |
| `backend` | MediaPipe、規則引擎、資料與 AI provider | Python 3.12、FastAPI、SQLAlchemy、MediaPipe 0.10.x |
| PostgreSQL | 工作階段與衍生指標 | async driver、密碼安全 URL 組合與 Alembic migration 已實作 |
| Coolify | 三個獨立的 Web、API 與 PostgreSQL Resources | Dockerfile 建置與本機三容器整合驗證已通過，外部 Resources 尚未建立 |
| 量界智算 | 去識別摘要的個人化建議 | adapter 與 fallback 已測試；正式 API 文件、模型、額度與資料政策待確認 |

本專案採固定 component roots：Expo 直接位於 `app/`，FastAPI 直接位於 `backend/`。`package.json`／`pyproject.toml` 直接位於 component 根目錄，不增加 project-name、framework-name 或其他分類包層。

## 快速開始

### Client

```bash
cd app
pnpm install
cp .env.example .env
pnpm web
```

實機可使用 Expo Go 掃描 `pnpm start` 顯示的 QR code。手機必須能連到開發電腦；API URL 需改成同一區網可連線的位址。

### API

```bash
cd backend
python3.12 -m venv .venv
.venv/bin/python -m pip install -e ".[dev]"
.venv/bin/python scripts/download_pose_model.py
.venv/bin/uvicorn posture_guardian_api.main:app --host 127.0.0.1 --port 8000
```

- Bootstrap status：`http://127.0.0.1:8000/`
- Process liveness：`http://127.0.0.1:8000/live`
- Dependency readiness：`http://127.0.0.1:8000/health`（依賴退化時回傳 HTTP 503）
- OpenAPI 文件：`http://127.0.0.1:8000/docs`

首頁的「試看展示模式」不需要相機或 MediaPipe 推論即可完成校準、提醒與摘要，適合作為決賽網路備援。展示模式只產生本地摘要，不建立、上傳或完成後端工作階段，也不寫入歷史；API 未啟動時仍可使用。

正式相機觀察、歷史與趨勢需要先以 Email／密碼登入；展示模式不需要帳號。原生 App 將登入 token 存在系統安全儲存區，Web 只保存於當前瀏覽器 session。

## API 功能

| Method | Path | 用途 |
|---|---|---|
| `POST` | `/api/v1/auth/register` | 註冊帳號並取得可撤銷 bearer session |
| `POST` | `/api/v1/auth/login`／`logout` | 登入或立即撤銷目前 session |
| `GET` | `/api/v1/auth/me` | 讀取目前登入帳號 |
| `POST` | `/api/v1/posture/analyze` | 暫存影格轉 33 節點、角度、品質與門檻結果 |
| `POST` | `/api/v1/sessions` | 為目前登入帳號建立校準後工作階段 |
| `POST` | `/api/v1/sessions/{id}/samples` | 儲存衍生角度與事件，不儲存影像 |
| `POST` | `/api/v1/sessions/{id}/complete` | 彙整比例、事件、建議與介入階段 |
| `POST` | `/api/v1/sessions/{id}/feedback` | 儲存不含自由文字的提醒感受分類 |
| `GET` | `/api/v1/sessions` | 讀取目前帳號的趨勢紀錄 |
| `DELETE` | `/api/v1/account/data` | 刪除目前帳號的全部姿勢紀錄 |

## 測試與品質

以下指令用於目前版本的完整驗證：

```bash
cd app
pnpm lint
pnpm typecheck
pnpm build

cd ../backend
.venv/bin/python -m ruff check .
.venv/bin/python -m mypy
.venv/bin/python -m pytest -q
```

Expo Web 靜態輸出位於 `app/dist/`；該資料夾已忽略，不提交 Git。
兩個 Dockerfile 與 `compose.coolify.yaml` 已在 Linux ARM64 重驗 Web、API、PostgreSQL 的建置、健康檢查、migration、restart persistence 與本機 backup／restore 演練。實際 Coolify 三個 Resources、domain、HTTPS、離機備份與量界智算真實呼叫仍必須在部署時驗收。

## 環境變數與敏感資訊

- 只提交 `.env.example`，真實 `.env`、API key、資料庫密碼與個資不得提交。
- `EXPO_PUBLIC_*` 會出現在公開 client bundle，不能保存秘密。
- 量界智算 key 與 PostgreSQL 密碼只放 Coolify runtime secret；Web build 只接收公開 API URL。
- `AUTH_SESSION_DAYS` 是 API runtime 設定（1–30，預設 14），不是前端設定或 secret。
- 原始相機畫面預設只在處理期間短暫存在，不寫入資料庫、log 或 AI prompt。

## 文件索引

- [學生前端開發與 GitHub 協作教學](docs/student-frontend-guide.md)（新手請先從這份開始；不需要 Docker、後端或資料庫）
- [專案 Profile](docs/project-profile.md)
- [專案範圍、架構與實作順序](docs/project-overview.md)
- [姿勢判定與介入階段](docs/posture-evaluation.md)
- [競賽策略與展示流程](docs/competition.md)
- [資料與儲存](docs/data-and-storage.md)
- [安全、未成年使用者與隱私](docs/security-and-privacy.md)
- [AI、MediaPipe 與外部整合](docs/integrations.md)
- [Coolify 部署邊界](docs/deployment.md)
- [現行架構概念驗證簡報](outputs/Posture_Guardian_概念驗證_現行架構版.pptx)
- [Client 元件](app/README.md)
- [API 元件](backend/README.md)

## Git 與授權邊界

- 初始化器已建立本機 `main` 與 `chore(init): 初始化學生專案結構`。
- GitHub remote 已設定為 `https://github.com/Sutdents-Project-Hub/Posture_Guardian.git`；未建立 PR、release 或部署。
- 專案程式碼採 MIT License，詳見 [LICENSE](LICENSE)；第三方模型、資料、圖片、字型與套件仍依各自授權及 attribution 要求處理。
- 後續 Git 操作遵守 [AGENTS.md](AGENTS.md)，尤其是精確 staging 與敏感資料檢查。
