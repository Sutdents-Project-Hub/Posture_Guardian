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

1. 使用者可選「房間自適應」、固定正面或固定側面，完成 10 秒個人校準；房間模式只支援固定鏡頭內的一位主要使用者。
2. 固定版本的 MediaPipe Pose Landmarker Full 擷取 33 個人體節點，辨識 `upper_body`／`full_body`；人物過小、多人、截斷或視角不明時拒絕分析。
3. 規則引擎以影像寬高校正 2D 幾何，半身依可見節點分析支援的頭頸、肩線與軀幹指標；全身依視角增加側面膝屈曲或正面髖線／膝線。
4. 偏移持續超過時間窗才提醒，避免每次小動作都打斷使用者。
5. PostgreSQL 只保存衍生指標、工作階段與 reminder sample；週報聚合狀態分布、四時段與提醒次數，預設不保存原始影像。
6. 已登入使用者的工作階段會由 API 依帳號權限保存；量界智算只讀取同一帳號的去識別摘要，產生「趨勢、下一步、下次目標」；資料不足或模型不可用時使用明確標示的規則式 fallback。

姿勢標準、初期／進階／加強介入條件與驗證方式以 [姿勢判定規格](docs/posture-evaluation.md) 為準。

## 目前狀態

| 項目 | 狀態 |
|---|---|
| Expo Android／iOS／Web | 未登入時只顯示登入／註冊；完成驗證後可進入房間自適應／固定視角、半身／全身品質引導、校準、即時偵測、摘要、週報、趨勢、AI 稽核資訊與外觀設定 |
| FastAPI | Argon2 密碼雜湊、可撤銷 bearer session、資料 ownership、MediaPipe Full、自動／固定視角、半身／全身與單人品質拒絕、aspect-corrected 指標、工作階段、週報、AI 摘要、提醒感受、歷史、刪除與健康檢查已實作 |
| 姿態事件與提醒 | 10 秒校準、5 秒滾動中位數、8 秒有效偏移累積、3 秒有效回正與分級 cooldown 已實作 |
| 新增姿態模式驗證 | 程式與自動化驗證納入本次候選版；房間支援區、人物最小尺寸、Full model 在決賽設備的效能與全身新門檻仍待 3–5 位知情同意真人測試 |
| 資料庫 | SQLAlchemy + Alembic baseline 已實作；本機預設 SQLite，Coolify 使用 PostgreSQL |
| 量界智算 | 可設定的 OpenAI-compatible Chat Completions／Responses adapter 已實作；真實 endpoint／model／key 待帳號文件確認 |
| Coolify／量界智算資源 | 尚未建立、未部署；目前只完成程式與本機驗證 |
| 本機 Git | `main` 已有候選版本歷史；GitHub remote 已設定為 `Sutdents-Project-Hub/Posture_Guardian` |

## 技術與元件

| 路徑 | 責任 | 已驗證技術 |
|---|---|---|
| `app` | Android、iOS 與響應式 Web 使用介面 | Expo 54、React Native 0.81.5、TypeScript、Expo Camera |
| `backend` | MediaPipe、規則引擎、週報資料與 AI provider | Python 3.12、FastAPI、SQLAlchemy、固定官方 Full model 的 MediaPipe 0.10.x |
| PostgreSQL | 工作階段與衍生指標 | async driver、密碼安全 URL 組合與 Alembic migration 已實作 |
| Coolify | 三個獨立的 Web、API 與 PostgreSQL Resources | 既有拓撲的 Dockerfile／本機三容器整合曾通過；Full model 與最新 migration 的候選版仍須重跑，外部 Resources 尚未建立 |
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

完成登入或註冊後，可在首頁選擇「試看展示模式」；它不需要相機或 MediaPipe 推論即可完成校準、提醒與摘要，適合作為決賽網路備援。展示模式只產生本地摘要，不建立、上傳或完成後端工作階段，也不寫入歷史；API 未啟動時仍可使用。

所有產品畫面都必須先以 Email／密碼登入或註冊；登入後可選擇正式相機觀察或展示模式。原生 App 將登入 token 存在系統安全儲存區，Web 只保存於當前瀏覽器 session。

## API 功能

| Method | Path | 用途 |
|---|---|---|
| `POST` | `/api/v1/auth/register` | 註冊帳號並取得可撤銷 bearer session |
| `POST` | `/api/v1/auth/login`／`logout` | 登入或立即撤銷目前 session |
| `GET` | `/api/v1/auth/me` | 讀取目前登入帳號 |
| `POST` | `/api/v1/posture/analyze` | 暫存影格轉 33 節點、解析視角、半身／全身、單人取景品質、aspect-corrected 角度與門檻結果 |
| `POST` | `/api/v1/sessions` | 為目前登入帳號建立校準後工作階段 |
| `POST` | `/api/v1/sessions/{id}/samples` | 儲存衍生角度、事件與 reminder sample 標記，不儲存影像 |
| `POST` | `/api/v1/sessions/{id}/complete` | 彙整比例、事件、建議與介入階段 |
| `POST` | `/api/v1/sessions/{id}/feedback` | 儲存不含自由文字的提醒感受分類 |
| `GET` | `/api/v1/sessions` | 讀取目前帳號的趨勢紀錄 |
| `GET` | `/api/v1/reports/weekly?timezone=Asia/Taipei` | 聚合目前帳號一週的狀態分布、四時段、提醒次數與安全建議 |
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
兩個 Dockerfile 與 `compose.coolify.yaml` 的既有拓撲曾在 Linux ARM64 驗證 Web、API、PostgreSQL 的建置、健康檢查、migration、restart persistence 與本機 backup／restore。改用 MediaPipe Full 與 `20260724_01` migration 後，候選版容器必須重新執行上述檢查；實際 Coolify 三個 Resources、domain、HTTPS、離機備份與量界智算真實呼叫仍必須在部署時驗收。

## 環境變數與敏感資訊

- 只提交 `.env.example`，真實 `.env`、API key、資料庫密碼與個資不得提交。
- `EXPO_PUBLIC_*` 會出現在公開 client bundle，不能保存秘密。
- 量界智算 key 與 PostgreSQL 密碼只放 Coolify runtime secret；Web build 只接收公開 API URL。
- `AUTH_SESSION_DAYS` 是 API runtime 設定（1–30，預設 14），不是前端設定或 secret。
- 原始相機畫面預設只在處理期間短暫存在，不寫入資料庫、log 或 AI prompt。

## 能力與限制

- `auto` 只會解析為正面或側面；半身／全身只計算當下節點足以支援的指標。
- 房間模式是單人、固定鏡頭與有限支援區，不保證任意距離；人物過小、多人、截斷、遮擋或視角不明會停止判定。
- 本系統使用 aspect-corrected 2D 姿態 proxy，不量測脊椎曲率、肩高公分、頸椎壓力倍數或疾病風險。
- 不使用腰帶、氣囊、馬達或按壓硬體；提醒只有低干擾視覺與可關閉的手機震動。
- Azure 只可作「概念對應（非實際使用服務）」說明；現行部署仍是 VPS／Coolify／PostgreSQL／量界智算，詳見 [整合文件](docs/integrations.md#azure-概念對應非實際使用服務)。

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
