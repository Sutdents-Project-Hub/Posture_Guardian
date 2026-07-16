# AGENTS.md

## 適用範圍與優先順序

- 本檔適用於整個 `姿勢守衛隊 Posture Guardian` repository；子目錄若有更具體的 `AGENTS.md`，只在該範圍內補充本檔。
- 依序遵守使用者當次指示、本檔、根目錄 `README.md`、`docs/` 與元件 README；內容衝突時先停止並確認。
- 目前階段：競賽／展示。部署目標：Coolify（尚未建立外部資源或正式部署）。
- Git repository 名稱：`Posture_Guardian`。全新專案的初始 branch 為 `main`。

- Project slug：`posture-guardian`
- 本機 Docker Compose project：`posture_guardian`；主要 `compose.coolify.yaml` 必須明確設定頂層 `name: posture_guardian`。
- Coolify project：`posture-guardian`；Coolify services：`posture-guardian-web`、`posture-guardian-api`、`posture-guardian-postgres`。
- Compose services 使用 `web`、`api`、`postgres`，不設定 `container_name`；容器名稱由 Compose project 與 service role 產生。
- 產品型態：`hybrid`
- Bootstrap 模式：`executable`

### 已確認功能領域

- 相機權限、拍攝視角選擇與個人中性坐姿校準
- 人體姿態節點擷取與偵測品質檢查
- 可解釋的頭頸、肩線與軀幹偏移指標
- 時間窗平滑、姿勢分數與低干擾提醒
- 依改善程度調整的初期、進階與加強介入階段
- 坐姿工作階段、改善趨勢與情緒體驗回饋
- PostgreSQL 衍生指標儲存與隱私控制
- 量界智算模型產生去識別個人化建議，失敗時規則式降級
- 可重現的決賽展示流程、限制說明與答辯證據

### 專案限制

- 主賽事決賽日期為 2026-07-26，必須優先完成可靠且可重現的垂直切片
- 決賽評分包含 Azure 概念驗證 25% 與簡報表達 35%
- 前端必須同時提供 APP 與網頁，並控制學生團隊的維護成本
- 主要部署方向為 Coolify，資料庫為 PostgreSQL
- 系統是姿勢覺察與習慣輔助工具，不作醫療診斷或治療宣稱
- 原始影像預設不得儲存，未成年使用者資料與聯絡人通知需要明確同意
- MVP 不依賴腰帶按壓等硬體，避免安全、製作與展示風險


## 專案事實與邊界

為中學生設計的跨平台坐姿覺察系統，使用姿態節點、個人基線與時間窗提供可解釋提醒，並以雲端資料與 AI 產生長期改善建議。

- `app`：行動應用程式；依 `Expo` 的官方慣例維護，不可把其他元件的秘密或責任移入此處。
- `backend`：後端／API；依 `FastAPI` 的官方慣例維護，不可把其他元件的秘密或責任移入此處。
- 專案結構採公司慣例的固定 component roots：`app/` 與 `backend/`；兩者本身就是 framework root，manifest 直接位於各 component，不得增加 project-name 或 framework-name wrapper。
- Expo SDK 54、pnpm、Python 3.12 與 FastAPI 是已實作且符合競賽展示需求的技術選型；除非另行核准遷移，不為了套用公司新專案基線而更換。

- 目前已有可操作的 MVP：Expo 相機／展示模式、10 秒校準、MediaPipe 姿態分析、持續時間事件、提醒、工作階段、SQLite／PostgreSQL 相容儲存、量界智算 OpenAI-compatible adapter 與 fallback。尚未建立 Coolify、PostgreSQL 或量界智算外部資源，不得把容器設定描述成已部署服務。
- 姿勢定義、起始門檻、時間窗、介入階段與驗證方式以 `docs/posture-evaluation.md` 為準；修改規則時同步文件與測試。
- `app/app/` 是 Expo Router 入口；`backend/src/posture_guardian_api/main.py` 是 FastAPI 入口。

- Repository 與新專案根目錄名稱維持 `Posture_Guardian`；技術資源優先使用 `posture-guardian` 或平台既有慣例。
- 新 component id、路徑與一般文件名使用簡短且能表達責任的 lowercase kebab-case；程式碼內命名遵守各 framework 慣例。
- 保留現有且可工作的專案結構與框架慣例；新增元件時才選擇清楚、簡短、符合責任的路徑。
- 不因範本而重新命名既有資料夾，不建立未使用的 `app/`、`web/`、`backend/`、`docs/` 或部署資源。
- 不把不同執行環境、依賴或部署生命週期硬塞進同一元件；需要共用程式碼時，先確認至少有兩個真實使用者。
- Scaffold 只代表已核准的結構與技術意圖；只有官方 initializer 產生的實際 manifest、lockfile 與必要品質 script 通過檢查後，才能稱為 executable skeleton。

## 工作方式

- 修改前先讀根 README、相關文件、manifest、設定與實際程式碼；不得只依資料夾名稱猜測。
- 使用者要求修改 UI、功能、修正問題或其他實作時，先自行檢查脈絡並做合理假設，直接完成實作、驗證與必要視覺檢查；只有資訊會明顯改變成果、操作不可逆、涉及外部發布／付費／帳號／敏感資料，或已無法安全繼續時才詢問。
- 規劃放在簡短進度或既有專案文件；除非使用者明確要求，不建立只供流程審閱的 spec、plan 或 todo 檔案，也不重複要求已明確同意的方向。
- 小型文案或單點修正可直接處理；一般功能先說明假設、範圍與驗證；登入、權限、個資、資料庫、刪除、AI 外部服務、部署或跨元件變更先提出計畫與成功標準。
- 只做完成任務所需的最小一致修改；不要混入無關重構、格式化、重新命名、移檔或依賴升級。
- 發現不在範圍內的問題時記錄並回報，不要順手修。
- 以可觀察結果驗證：優先執行現有的 lint、typecheck、test、build 或實際操作；無法執行時明確回報原因與剩餘風險。
- 不得聲稱未實際執行的測試、部署、外部操作或人工驗收已完成。

## 變更分類與文件同步

- 工作中新增或發現功能、需求、流程、既有行為變更、缺陷、測試結果或實作事實時，先分類為釐清、缺陷修正、已核准範圍調整、範圍變更或新能力。
- 使用者當次明確要求即代表目前敘述方向已獲核准；一般範圍內實作與文件同步不需額外等待批准。只有結果會實質改變架構、權限／安全、保存資料、破壞性行為、外部服務／成本／授權、production／部署、姿勢／醫療安全邊界或競賽驗收時才停止確認。
- 實作前辨識受影響的權威文件，完成前在同一任務同步；文件同步是完成條件，不是之後再補的工作。
- 產品定位、功能範圍、實作順序與驗收更新 `docs/project-overview.md`；專案分類、元件或部署狀態改變時同步 `docs/project-profile.md`。
- 姿勢規則、校準、門檻、時間窗、介入階段或驗證方法更新 `docs/posture-evaluation.md` 與對應測試；資料、安全、AI／MediaPipe 或外部整合更新 `docs/data-and-storage.md`、`docs/security-and-privacy.md`、`docs/integrations.md` 及受影響的 `app/README.md`／`backend/README.md`。
- 啟動、指令、環境變數、Compose、Coolify、資料庫或 rollback 改變時，更新根 `README.md`、元件 README、`.env.example` 與 `docs/deployment.md` 中實際受影響的文件。
- Demo、競賽評分證據、Azure 概念驗證或限制改變時同步 `docs/competition.md`；不把規劃、假設或未執行結果寫成已實作或已驗證。
- 優先更新既有權威文件，不為了形式新增空 Markdown。
- 完成回報列出變更分類與同步文件；若沒有文件需要變更，說明文件仍與實作一致的具體理由。

## Superpowers 手動啟用

- Superpowers plugin 預設不得使用。
- 只有使用者訊息明確包含 `[@superpowers](plugin://superpowers@openai-curated-remote)` 時，才可在該工作範圍使用 Superpowers skills；任務完成或切換要求後自動恢復停用。
- 未啟用時仍可使用 Codex 原生能力、原生子代理與其他適用的非 Superpowers skills。

## README 與文件同步

- `README.md` 是專案入口，內容只記錄已確認的目標、功能、結構、技術、啟動、測試、環境變數名稱、部署狀態與文件連結。
- 未驗證的指令、port、URL、帳號、部署值或 healthcheck 必須標示為尚未驗證，不得猜測。
- 功能、架構、依賴、指令、環境變數、資料、部署或限制改變時，同步更新根 README、相關元件 README 與 `docs/`。
- 競賽專案若有 `docs/competition.md`，同步維護問題、對象、展示流程、證據來源、限制與提交清單。

## 資料、秘密與授權

- 真實 API key、token、secret、password、private key、cookie、憑證、Webhook URL、production `.env`、個資與未公開資料不得寫入程式、文件、log、commit 或範例。
- `.env.example` 只保留變數名稱與安全 placeholder；前端或 App 可見的設定不得被當成秘密，敏感操作必須由可信任後端或平台執行。
- 合約、協議、報價、法務／商業文件、客戶或學生個資預設不提交；若專案確實需要公開的競賽文件，先逐檔確認內容與授權。
- 使用資料集、模型、圖片、字型、套件或程式碼前確認來源、授權與競賽規則；README 記錄必要 attribution，不自行選擇 LICENSE。

## Git、Commit 與 Pull Request

- 目前 repository 已在 `main` 建立初始化 commit `71a3b1d`，並設定 GitHub remote；決賽 MVP 的程式與文件變更未經使用者要求不得自行提交。
- 全新專案初始化的固定例外是：執行 `git init -b main`，安全掃描通過後只 stage 初始化產物，並建立 `chore(init): 初始化學生專案結構`。既有 Git repository 不適用此例外。
- 除上述固定初始 commit 外，只有使用者明確要求時才可 commit、push、建立 PR、merge、release 或部署；各項授權彼此獨立。
- 每次 branch、commit、merge、push 或 PR 前，先執行 `git status --short --branch`、`git branch --show-current` 與 `git remote -v`，確認目前分支、working tree、變更範圍、remote 與本次授權。
- **未設定 remote**：只執行本機 branch、commit 與 merge；不得虛構 push 或 PR，也不得自行建立 remote 或 GitHub repository。
- **已設定 remote**：遵守遠端保護規則；GitHub 團隊專案預設推送任務 branch、建立 Pull Request、完成檢查後 squash merge，再同步本機 `main`，不得直接 push `main`。
- 使用者只要求 `commit` 時，只提交目前任務中可獨立理解的 checkpoint，並**維持在目前分支**；不得 merge、刪除 branch、push、建立 PR、release 或 deployment。
- 使用者要求**合併進 `main`**時，視為目前任務收尾；安全檢查後可提交同一任務必要且範圍清楚的剩餘變更，再安全合併並驗證 `main`。若混有無關或不明變更，停止並詢問。
- 「合併進 `main` 並 push」可授權必要 commit、merge 與遠端同步，但**不代表已授權部署**或 release；仍須依 remote 模式使用既有安全流程。
- 合併成功、`main` 驗證通過，且任務 branch 已完整合併、沒有獨有 commit 或待續工作時，才使用 `git branch -d <branch>`；**不得使用 `git branch -D`**。Conflict、驗證失敗、dirty worktree 或任務未完成時保留 branch。
- 成功關閉後回到 `main`；**下一個獨立任務**從最新 `main` 建立新 branch，不混入已完成任務。
- commit 採 Conventional Commits：`<type>(<scope>): <繁體中文描述>`；`type`／`scope` 維持英文，Commit subject 描述與 Commit body 預設使用繁體中文，一次提交只包含一個可理解、可回滾的目的。
- Pull Request title 使用 `<type>(<scope>): <繁體中文描述>`，Pull Request 內文使用繁體中文並記錄目的、範圍、驗證、文件同步、風險、資料／環境、部署與 rollback 影響。
- 建議類型：`feat`、`fix`、`docs`、`chore`、`refactor`、`test`、`build`、`ci`、`style`、`perf`、`revert`。
- 提交前必須檢查 staged、unstaged、untracked 與 diff，排除秘密、`.env`、憑證、個資、內部文件、合約、報價與其他不應提交內容。
- 發現敏感內容時不得 commit 或 push：先 unstage、更新 `.gitignore`、改用 `.env.example`／placeholder；疑似外洩的憑證需提醒輪替。不確定檔案性質時先詢問。
- 只 stage 明確路徑，不使用 `git add .`；不得直接 push 到 `main`，團隊專案以短期 branch、PR 與通過的檢查交接。

## 部署與交接

- 部署不是初始化的一部分；未經明確要求，不建立 Coolify／雲端資源、資料庫、DNS、bucket、secret、release 或 production 連線。
- 有 `docs/deployment.md` 時以其為部署依據；設定尚未驗證時保持「尚未驗證」，不得複製其他專案的 port、domain、Docker 或 healthcheck。
- 交接給學生前，確認 README 能說明目前能做什麼、如何啟動與驗證、已知限制、環境變數來源、部署狀態及下一步。

## 完成回報

- 回報變更分類、變更檔案、行為差異、實際執行的驗證與結果、同步文件、未驗證事項、剩餘風險及需要人工決定的項目；若沒有文件變更，說明理由。
