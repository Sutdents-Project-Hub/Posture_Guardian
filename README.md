# 姿勢守衛隊 Posture Guardian

> 目前階段：競賽／展示｜部署：Coolify

## 專案簡介

為中學生設計的跨平台坐姿覺察系統，使用姿態節點、個人基線與時間窗提供可解釋提醒，並以雲端資料與 AI 產生長期改善建議。


## 專案資訊

- Repository：`Posture_Guardian`
- Project slug：`posture-guardian`
- 產品型態：`hybrid`
- Bootstrap 模式：`executable`


## 目標與主要功能

- 相機權限、拍攝視角選擇與個人中性坐姿校準
- 人體姿態節點擷取與偵測品質檢查
- 可解釋的頭頸、肩線與軀幹偏移指標
- 時間窗平滑、姿勢分數與低干擾提醒
- 依改善程度調整的初期、進階與加強介入階段
- 坐姿工作階段、改善趨勢與情緒體驗回饋
- PostgreSQL 衍生指標儲存與隱私控制
- Microsoft Foundry 模型產生個人化建議與競賽 Azure 概念驗證
- 可重現的決賽展示流程、限制說明與答辯證據

- 只列入本階段已確認、可展示或可驗收的功能；構想與未來功能請明確標示為非本階段範圍。

## 技術與元件

| 路徑 | 責任 | 技術 | 狀態 |
|---|---|---|---|
| `apps/client` | 行動應用程式 | Expo | 已要求實體 bootstrap；以 manifest 與 lockfile 驗證 |
| `services/api` | 後端／API | FastAPI | 已要求實體 bootstrap；以 manifest 與 lockfile 驗證 |

## 專案結構

- 目前只記錄實際存在的元件；不建立未使用的空資料夾。
- 每個獨立元件依自己的 manifest、README 與框架慣例安裝、啟動、測試及建置。

## 快速開始

初始化器已確認 framework manifest、選定的 lockfile 與 Profile 要求的品質 script 存在；這不代表指令已執行成功。請實際執行元件 README 列出的檢查，然後補上已驗證的前置需求、安裝、啟動、port 與本機 URL。

## 測試與品質

只記錄實際存在且已執行成功的 lint、typecheck、test、build 或手動驗收方式。若目前沒有自動化測試，請明確記錄主要人工驗收流程與限制。

## 環境變數與敏感資訊

- 真實值只存放於本機或部署平台，不提交 `.env`。
- 以 `.env.example` 記錄必要的變數名稱、用途與安全 placeholder；公開前端設定不可用來保存秘密。

## 部署狀態

目前狀態：Coolify。只有在設定與流程實際驗證後，才補上平台、base directory、build/start command、port、healthcheck、資料與回滾方式。

## Git 與版本控制

- Repository 名稱：`Posture_Guardian`
- 全新專案由初始化器建立本機 `main` branch，並在安全掃描後以 `chore(init): 初始化學生專案結構` 提交本次初始化產物。
- 既有 Git repository 保留原 branch 與歷史，不自動 commit。
- 初始化不設定 `user.name`／`user.email`，不建立 remote，也不 push；後續 Git 操作遵守 [AGENTS.md](AGENTS.md)。
- 後續操作先以 `git remote -v` 判斷本機或遠端模式；只要求 commit 時維持目前分支，獲准合併並驗證 `main` 後才安全關閉已完整合併的任務 branch。

## 文件索引

- [專案 Profile](docs/project-profile.md)
- [專案範圍與驗收](docs/project-overview.md)
- [競賽與展示準備](docs/competition.md)
- [部署說明](docs/deployment.md)
- [安全、身份與隱私](docs/security-and-privacy.md)
- [資料與儲存](docs/data-and-storage.md)
- [外部整合與 AI](docs/integrations.md)
- [apps/client 元件說明](apps/client/README.md)
- [services/api 元件說明](services/api/README.md)

## 維護與交接

- 開發規則請見 [AGENTS.md](AGENTS.md)。
- 功能、架構、指令、環境變數、部署或限制改變時，需同步更新相關文件。
- LICENSE、資料集、模型與素材授權須依作者、學校及競賽規則確認，不由初始化工具自行決定。
