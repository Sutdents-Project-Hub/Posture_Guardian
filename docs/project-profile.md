# 學生專案 Profile

## 基本資訊

- Project name：姿勢守衛隊 Posture Guardian
- Repository name：`Posture_Guardian`
- Project slug：`posture-guardian`
- Local Docker Compose project：`posture_guardian`（整合驗證）
- Coolify project：`posture-guardian`
- Coolify Resources：`posture-guardian-web`、`posture-guardian-api`、`posture-guardian-postgres`
- Stage：`competition`
- Product type：`hybrid`
- Bootstrap mode：`executable`
- Deployment：`coolify`
- Team collaboration：`true`

## 結構與技術決策

- `structure_exception`：無。採固定 component roots：`app/` 與 `backend/`。
- Framework root 證據：`app/package.json` 與 `backend/pyproject.toml` 直接位於 component 根目錄，沒有 project-name／framework-name wrapper，也沒有巢狀 `.git/`。
- `technology_source`：`existing-project`。Expo SDK 54、pnpm、Python 3.12 與 FastAPI 是競賽展示、相機支援與姿態分析需求下已實作且可驗證的選型；公司基線只作未指定技術之新專案預設，不自動觸發遷移。

## 摘要

為中學生設計的跨平台坐姿覺察系統，使用姿態節點、個人基線與時間窗提供可解釋提醒，並以雲端資料與 AI 產生長期改善建議。

## 元件

- `client`：path=`app`，kind=`app`，framework=`Expo`，package_manager=`pnpm`，quality=lint, typecheck, build
- `api`：path=`backend`，kind=`backend`，framework=`FastAPI`，package_manager=`pip`，quality=lint, typecheck, test

## 功能領域

- 相機權限、自動／固定拍攝視角、房間單人支援區與個人中性姿勢校準
- MediaPipe Full 人體姿態節點、半身／全身入鏡範圍與人物過小／多人／截斷品質拒絕
- aspect-corrected 2D 頭頸、肩線、軀幹、髖線、膝線與膝屈曲偏移指標
- 時間窗平滑、姿勢分數與低干擾提醒
- 依改善程度調整的初期、進階與加強介入階段
- 姿勢工作階段、改善趨勢、狀態／四時段／提醒次數週報與情緒體驗回饋
- PostgreSQL 衍生指標儲存與隱私控制
- 量界智算產生去識別個人化建議，失敗時規則式降級
- 可重現的決賽展示流程、限制說明與答辯證據

## 專案限制

- 主賽事決賽日期為 2026-07-26，必須優先完成可靠且可重現的垂直切片
- 決賽評分包含 Azure 概念驗證 25% 與簡報表達 35%
- 前端必須同時提供 APP 與網頁，並控制學生團隊的維護成本
- 主要部署方向為 Coolify，資料庫為 PostgreSQL
- 系統是姿勢覺察與習慣輔助工具，不作醫療診斷或治療宣稱
- 原始影像預設不得儲存，未成年使用者資料與聯絡人通知需要明確同意
- MVP 不依賴腰帶按壓等硬體，避免安全、製作與展示風險
- 房間模式只支援固定鏡頭的單人區域，不保證任意距離、不分析多人，也不做人臉辨識或跨房間追蹤

## 關注事項

- ai
- auth
- database
- external-api
- personal-data
- uploads

## 假設

- 使用 Expo SDK 54 以支援決賽現場透過 Expo Go 進行實機展示
- 同一個 Expo client 以響應式畫面支援 Android、iOS 與 Web
- Python 3.12 與 FastAPI 作為影像分析、規則引擎與資料 API 邊界
- 固定版本與 checksum 的 MediaPipe Pose Landmarker Full 作為開源姿態節點來源，不把 Azure AI Vision 誤稱為目前使用的骨架辨識服務
- 姿勢判定採個人校準、視角專屬指標與持續時間，不使用未驗證的單一公分閾值
- 自動視角只解析正面／側面；半身與全身只計算各自支援指標，非正方形畫面以影像寬高校正 2D 角度
- 週報狀態分布、四時段與 reminder count 由 PostgreSQL 衍生 samples 聚合，生成式 AI 不計算或改寫統計
- 初期、進階與加強是提醒介入階段而非醫療嚴重度，允許使用者手動調整
- 量界智算只接收至少 10 分鐘的摘要指標；adapter 依正式文件選 Chat Completions 或 Responses，失敗時使用明確 fallback
- 目前以團隊協作與 Pull Request 工作方式準備後續開發

## 未決定事項

- 使用者於 2026-07-16 告知官方 Azure 已關閉；主辦方是否接受 VPS／量界智算作 25% 替代證據仍待書面確認
- 量界智算的正式 API 文件、base URL、model ID、額度、資料區域、保存與訓練政策仍待確認
- 決賽展示手機的 Android 或 iOS 型號、相機位置與網路條件仍待確認
- 半身／全身、自動視角、全身新增指標、人物最小尺寸與房間單人支援區仍需以合法且具同意的真人素材，在決賽設備完成校準與小型驗證
- Email 驗證、忘記密碼與聯絡人通知是否納入決賽 MVP，仍需依剩餘時程與同意流程裁切
- 專案程式碼採 MIT License（見根目錄 `LICENSE`）；模型、資料與素材仍須依各自授權及 attribution 要求處理
