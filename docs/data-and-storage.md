# 資料與儲存

## 目前狀態

- SQLAlchemy 已建立 `users`、`auth_sessions`、`posture_sessions`、`posture_samples` 與 `session_feedback` schema；本機預設 SQLite，Coolify 使用 PostgreSQL。姿勢 session 保存請求視角、`upper_body/full_body` 入鏡範圍與房間模式；sample 保存提醒標記，供可重現週報使用。逐影格解析視角只在分析回應中使用，不另建人物移動軌跡。
- API 已能註冊／登入、建立、追加衍生 sample、完成、查詢及刪除目前帳號的工作階段。
- Alembic migrations `20260716_01`、`20260722_01` 與 `20260724_01` 已加入；最新 migration 增加視角／入鏡範圍、房間模式、狀態秒數、提醒標記與週報查詢索引。API 啟動前升級 schema。舊匿名工作階段保留但不會自動歸屬到新帳號，避免以舊識別碼冒領資料。
- 原始相機影格不寫入資料庫；處理完成後即釋放。
- 內建展示模式只在 client 產生模擬分析與本地摘要，不建立、上傳或完成後端工作階段，因此不會污染正式歷史、趨勢或 AI 輸入。

## 預定資料最小集

| 資料 | 用途 | 敏感性 | 是否含影像 |
|---|---|---|---|
| `users`（已實作） | 正規化 Email、Argon2 密碼 hash、建立時間 | 直接識別資料／驗證資料 | 否 |
| `auth_sessions`（已實作） | token 的 SHA-256 digest、到期與撤銷狀態 | 身份驗證資料 | 否 |
| `posture_sessions`（已實作） | 帳號 ownership、請求視角、入鏡範圍、房間模式、基線、時間、比例、提醒、建議 | 行為／人體衍生資料 | 否 |
| `posture_samples`（已實作） | 約每影格的角度、偏移、分數、姿勢狀態、事件與 reminder sample 標記 | 人體衍生資料 | 否 |
| 週報 API 聚合（已實作程式） | 指定週的狀態分布、四時段、提醒次數與本週安全建議；由 sessions／samples 查詢計算，不保存第二份影像或生成式 AI 猜測值 | 行為聚合資料 | 否 |
| 本機儲存（已實作） | AsyncStorage 的提醒階段／震動／主題；原生 SecureStore 的 bearer token；Web 當前 tab 的 sessionStorage token | 個人偏好／登入憑證 | 否 |
| AI provider audit（部分已實作） | session provider、model／API mode／prompt version 與去敏結構化 log；正式同意與長期稽核表仍待實作 | 法務／AI 稽核 | 否 |

## 資料流

1. client 以 Email／密碼註冊或登入，API 回傳隨機 bearer token；server 只保存其 digest。
2. client 取得相機權限並擷取影格；展示模式跳過帳號與 API 寫入。
3. 影格只在記憶體／請求生命週期中供姿態節點推論使用。
4. API 依 bearer session 取得帳號，回傳解析後的正面／側面、半身／全身、單人品質狀態、衍生角度、門檻與事件狀態；只寫入該帳號的衍生 sample 與工作階段摘要。
5. sample 以 capture timestamp 與 reminder sample 標記支援週報；後端依使用者時區聚合狀態分布、四時段與提醒次數，無資料時回傳資料不足，不把缺值當成良好。
6. 合格工作階段達 10 分鐘時，量界智算只接收該 session 的去識別摘要，例如視角、入鏡範圍、良好比例、常見偏移與介入階段；短資料固定在本地 fallback。讀取週報不建立新的外部 AI 請求。

## 週報資料契約

- 狀態分布至少區分 `good`、`attention`、`poor` 與 `invalid` 的秒數；分母與無效時間必須可見。
- `GET /api/v1/reports/weekly?timezone=Asia/Taipei` 依 IANA 時區查詢目前帳號的週報；四時段固定為凌晨 `00:00–06:00`、上午 `06:00–12:00`、下午 `12:00–18:00`、晚上 `18:00–24:00`。每個 bucket 回傳其資料量與狀態，不能只回一段 AI 敘述。
- `reminder_count` 只統計實際 reminder sample／事件，不把每個超標影格都算一次。
- 週報統計以 sample `duration_seconds` 加權。GET 只重用最近一次已持久化的 session insight 與實際 provider；沒有可用 insight 時回傳 deterministic fallback，不因重新整理週報重複呼叫外部 AI。週報數字永遠由 SQL／程式聚合，不由模型生成。
- API 查詢只能讀取 bearer session 所屬帳號；週報不能接受任意 user id 查詢他人資料。

## 保存與刪除

- 競賽測試資料：只保留完成驗證所需期間，決賽後由團隊人工確認刪除或取得新的使用同意。
- 未來產品的詳細指標與摘要保存期尚未決定，不在初始化階段猜測固定天數。
- 設定頁已提供目前登入帳號的 API 端全部姿勢紀錄刪除；帳號刪除與資料匯出尚未實作。
- 刪除帳號下的姿勢 sessions 時，週報來源 samples 與提醒標記會一起刪除；週報沒有獨立影像副本。
- 不做不可逆 migration 或批次刪除，除非已有備份、還原與人工確認。
- Coolify PostgreSQL persistent volume 不是備份；部署前需完成 `pg_dump`／`pg_restore` 演練與離機保存。

## 測試資料

- 只使用團隊自製、已取得知情同意、可用於本競賽的影像／影片。
- Repository 只放不含可識別人體的合成 fixtures 或姿態節點 JSON。
- 不下載或使用來源、授權、人物同意不明的坐姿資料集。

## 待實作決策

- production backup 保存期限、還原責任人與定期演練頻率。
- Email 驗證、忘記密碼、帳號刪除與未成年使用者同意流程。
- sample 聚合與 production 保存期限。
- 週報時區來源、跨時區行為與長期週報是否快取；目前以查詢時聚合為邊界。
- 資料匯出、刪除與聯絡人通知的審計紀錄。
