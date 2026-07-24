# AI、MediaPipe 與外部整合

## 分工原則

- **姿態節點**：固定版本的 MediaPipe Pose Landmarker Full 擷取 33 個節點。
- **姿勢判定**：自動／固定視角、半身／全身入鏡範圍、aspect-corrected 2D 幾何、個人基線、品質與時間窗規則；生成式 AI 不決定姿勢好壞。
- **長期分析**：PostgreSQL 聚合可重現的工作階段與週報統計。
- **個人化語句**：量界智算或明確標示的規則式 fallback。

原始影像只供姿態推論，不傳送給量界智算。

## 整合狀態

| 整合 | 目的 | 已實作 | 待外部驗證 |
|---|---|---|---|
| MediaPipe Pose Landmarker | 節點、visibility、視角與入鏡範圍 | Full model 固定版本、33 節點、`auto/front/side`、`upper_body/full_body`、單人品質拒絕與可解釋角度 | 決賽設備效能、房間支援區與真人小型驗證 |
| 量界智算 | 去識別趨勢轉為繁中行動建議 | OpenAI-compatible Chat Completions／Responses adapter、8 秒 timeout、零 SDK 重試、安全輸出契約與 fallback；2026-07-24 以測試帳號完成 `gpt-4o-mini` Chat Completions smoke test | production 帳號、額度、資料區域、保存政策、未成年條款與部署後工作階段驗收 |
| PostgreSQL | 工作階段與衍生指標 | asyncpg、Alembic baseline、Coolify managed persistent volume | VPS backup／restore 演練 |
| Coolify | Web、API、PostgreSQL 部署 | 三個獨立 Dockerfile／Database Resources、健康檢查、內部資料庫網路 | 真實 VPS、DNS、HTTPS 與資源量測 |

2026-07-16 的公開網路查詢未找到可驗證的量界智算正式 API 文件，因此程式不硬編 endpoint，也不安裝未知 SDK。2026-07-24 使用者提供的**暫時測試憑證**已成功對 `https://liangjiewis.com/v1` 的 OpenAI-compatible Chat Completions，以 `gpt-4o-mini` 送出一筆去識別姿勢摘要；回覆通過三段式、120 字、非醫療輸出契約，provider 記為 `liangjie`。此結果只證實一次 runtime smoke test，不代表 production 帳號、資料政策、額度或正式部署已驗收；測試 key 未寫入 repository、`.env` 或文件。

## 量界智算 adapter

Server-side 設定：

- `AI_PROVIDER=fallback|liangjie`
- `AI_BASE_URL`
- `AI_API_KEY`
- `AI_MODEL`
- `AI_API_MODE=chat_completions|responses`
- `AI_TIMEOUT_SECONDS`（1–30 秒，預設 8）

行為契約：

1. `AI_PROVIDER=fallback` 不建立外部 client。
2. `liangjie` 缺 URL、key 或 model 時拒絕啟動；production 外部 URL 必須是 HTTPS。
3. URL 依設定原樣交給 SDK，不猜測或附加路徑。
4. SDK 固定 `max_retries=0`，避免 timeout／429 時重複扣額度。
5. 少於 10 分鐘有效資料不花外部 AI 額度，直接產生規則式建議。
6. Chat Completions 只接受純文字 `choices[0].message.content`；Responses 只接受 `output_text`。
7. timeout、401、429、5xx、空值或格式不合都不阻斷姿勢功能，改為 provider=`fallback`。

## AI 輸入／輸出契約

允許輸入：視角、入鏡範圍、有效分鐘、良好坐姿率、提醒事件數、平均分數、主要偏移、介入階段、合格資料數與前後三次平均。這些值不含姓名、學校或聯絡方式。週報 GET 不呼叫模型，只重用最近一次已持久化的安全 session insight；沒有可用 insight 時使用 deterministic fallback。

禁止輸入：原始照片／影片、姓名、學校、聯絡人、精確地址、自由文字與醫療診斷要求。

模型輸出必須是 120 字內的繁體中文：

```text
趨勢：…｜下一步：…｜下次目標：…
```

含診斷、疾病、治療、療效或傷害機率等詞、缺少任一段、過長、空值或非純文字時，provider 原文不會顯示，改用安全 fallback。

## 可稽核證據

- 工作階段保存實際 `insight_provider`，可區分 `liangjie`、`fallback` 與舊資料的 `foundry`。
- `/health` 只顯示 provider 是否設定完整、API mode、model ID 與 prompt version，不呼叫外部模型，也不回傳 key 或 base URL。
- 成功 log 只含 provider、API mode、model、prompt version、latency 與 request ID；失敗只加受控 error type。
- log 不記錄 key、base URL、prompt、摘要輸入、provider 回應原文或個資。

## 資料政策未決事項

量界智算的資料區域、保存期限、是否用於模型訓練、未成年資料條款、刪除機制與 subprocessor 尚未由可驗證官方文件確認。在確認前只傳去識別摘要，不傳原始影像或自由文字；若政策不符合競賽或未成年使用情境，維持本地 fallback。

## MediaPipe 推論契約

- 模型檔固定使用官方 `pose_landmarker_full/float16/1/pose_landmarker_full.task`，SHA-256 為 `5134a3aad27a58b93da0088d431f366da362b44e3ccfbe3462b3827a839011b1`；`POSE_MODEL_PATH` 指向 `pose_landmarker_full.task`。不得在 production 啟動時默默切回 Lite 或下載「最新版」。
- `auto` 優先用 MediaPipe world landmarks 的左右肩 x／depth 關係解析正面或側面，缺少 world landmarks 時才以 2D 肩寬／軀幹比例降級；成功時輸出 `front` 或 `side`，中間斜角不明時 resolved view 為 null 且回傳無效品質狀態。固定 `front`／`side` 使用使用者指定規則，但仍執行人物大小、多人、截斷、節點 visibility 與支援指標品質檢查。
- `coverage_mode` 只接受 `upper_body` 或 `full_body`；頭肩以下嚴重截斷、人物過小、多人或必要節點不足不是第三種可分析姿勢，而是明確無效。
- 半身沿用頭頸、肩線與軀幹指標；全身側面增加 `knee_flexion`，全身正面增加 `hip_tilt` 與 `knee_tilt`。不支援的指標不得用 0 補值。
- 角度以實際影像寬高校正正規化座標後再計算；這只能降低畫面長寬比造成的 2D 誤差，不會產生真實深度、公分或脊椎曲率。
- 房間模式是固定鏡頭、單人、有限支援區的取景策略，不做人臉辨識或多人跨畫面追蹤。人物過小、多人、截斷與超出支援區時拒絕分析。

## Azure 概念對應（非實際使用服務）

本表只用於說明若把相同工作負載放到 Azure，會對應到哪類能力；本專案目前仍使用 VPS／Coolify／PostgreSQL／量界智算，不得把此表當成 Azure deployment 或成功呼叫證據。

| 現行技術與責任 | Azure 概念對應 | 限制 |
|---|---|---|
| MediaPipe Full + FastAPI 自訂姿態推論 | 自訂電腦視覺模型／容器推論工作負載 | 不是 Azure AI Vision 已提供或本專案已使用的骨架辨識 |
| Coolify 的 Web／API containers | App Service／Container Apps 類型的應用託管角色 | 目前沒有 Azure App Service 或 Functions Resource |
| PostgreSQL + SQLAlchemy + Alembic | Azure Database for PostgreSQL 類型的關聯式持久化角色 | 不是 Cosmos DB |
| 量界智算 OpenAI-compatible adapter | Azure OpenAI 在去識別摘要轉建議的產品角色 | 不是 Azure OpenAI endpoint 或模型 |
| Argon2 + 可撤銷 bearer session + ownership | Microsoft Entra 類型的身分與存取控制角色 | 不是 Azure AD／Entra SSO |
| App 內視覺提示與手機震動 | 通知／介入體驗角色 | 不是 Azure Notification Hubs 或遠端推播 |

簡報與畫面應標示「概念對應（非實際使用服務）」，不得使用「Powered by Azure」、Azure 成功部署、Azure AI Vision 骨架辨識、Cosmos DB 儲存或 Azure OpenAI 已呼叫等措辭。

## 來源與授權

- [MediaPipe Pose Landmarker](https://ai.google.dev/edge/api/mediapipe/python/mp/tasks/vision/PoseLandmarker)
- [MediaPipe repository 與 Apache-2.0 license](https://github.com/google-ai-edge/mediapipe)
- [OpenAI Python SDK（僅作 OpenAI-compatible transport）](https://github.com/openai/openai-python)
- [Coolify documentation](https://coolify.io/docs/)

取得量界智算正式文件後，需在此補上官方連結、協定、模型版本、價格與資料政策，再做一次真實 smoke test。
