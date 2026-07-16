# 資料與儲存

## 目前狀態

- SQLAlchemy 已建立 `posture_sessions`、`posture_samples` 與 `session_feedback` schema；本機預設 SQLite，Coolify 使用 PostgreSQL。
- API 已能建立、追加衍生 sample、完成、查詢及刪除匿名工作階段。
- Alembic initial migration `20260716_01` 已加入；API 啟動前升級 schema，舊版完整 MVP schema 會保留資料並標記 baseline。
- 原始相機影格不寫入資料庫；處理完成後即釋放。

## 預定資料最小集

| 資料 | 用途 | 敏感性 | 是否含影像 |
|---|---|---|---|
| `posture_sessions`（已實作） | 匿名 profile、基線、時間、比例、提醒、建議 | 行為／人體衍生資料 | 否 |
| `posture_samples`（已實作） | 約每影格的角度、偏移、分數與事件狀態 | 人體衍生資料 | 否 |
| 本機 AsyncStorage（已實作） | 匿名識別碼、提醒階段與震動偏好 | 個人偏好 | 否 |
| AI provider audit（部分已實作） | session provider、model／API mode／prompt version 與去敏結構化 log；正式同意與長期稽核表仍待實作 | 法務／AI 稽核 | 否 |

正式實作前需再決定是否真的需要帳號；若決賽 MVP 使用單機匿名模式，就不建立不必要的使用者身份表。

## 資料流

1. client 取得相機權限並擷取影格。
2. 影格只在記憶體／請求生命週期中供姿態節點推論使用。
3. API 回傳姿態節點品質、衍生角度、門檻與事件狀態。
4. 資料庫只寫入聚合指標與工作階段摘要。
5. 合格工作階段達 10 分鐘時，量界智算只接收去識別摘要，例如視角、良好比例、常見偏移與介入階段；短資料固定在本地 fallback。

## 保存與刪除

- 競賽測試資料：只保留完成驗證所需期間，決賽後由團隊人工確認刪除或取得新的使用同意。
- 未來產品的詳細指標與摘要保存期尚未決定，不在初始化階段猜測固定天數。
- 設定頁已提供 API 端全部紀錄刪除；重設本機匿名識別碼與資料匯出尚未實作。
- 不做不可逆 migration 或批次刪除，除非已有備份、還原與人工確認。
- PostgreSQL named volume 不是備份；部署前需完成 `pg_dump`／`pg_restore` 演練與離機保存。

## 測試資料

- 只使用團隊自製、已取得知情同意、可用於本競賽的影像／影片。
- Repository 只放不含可識別人體的合成 fixtures 或姿態節點 JSON。
- 不下載或使用來源、授權、人物同意不明的坐姿資料集。

## 待實作決策

- production backup 保存期限、還原責任人與定期演練頻率。
- production 是否維持匿名 profile，或另加成熟身份服務。
- sample 聚合與 production 保存期限。
- 資料匯出、刪除與聯絡人通知的審計紀錄。
