# AI、MediaPipe 與外部整合

## 分工原則

- **姿態節點**：MediaPipe Pose Landmarker 擷取 33 個節點。
- **姿勢判定**：個人基線、角度、品質與時間窗規則；生成式 AI 不決定姿勢好壞。
- **長期分析**：PostgreSQL 聚合與可重現統計。
- **個人化語句**：量界智算或明確標示的規則式 fallback。

原始影像只供姿態推論，不傳送給量界智算。

## 整合狀態

| 整合 | 目的 | 已實作 | 待外部驗證 |
|---|---|---|---|
| MediaPipe Pose Landmarker | 節點與 visibility | Lite model、33 節點、品質拒絕與可解釋角度 | 決賽設備與真人小型驗證 |
| 量界智算 | 去識別趨勢轉為繁中行動建議 | OpenAI-compatible Chat Completions／Responses adapter、8 秒 timeout、零 SDK 重試、安全輸出契約與 fallback | 正式 base URL、驗證方式、model ID、token 參數、額度、資料區域與保存政策 |
| PostgreSQL | 工作階段與衍生指標 | asyncpg、Alembic baseline、Compose persistent volume | VPS backup／restore 演練 |
| Coolify | Web、API、PostgreSQL 部署 | Compose、Dockerfiles、健康檢查、網路隔離與 log rotation | 真實 VPS、DNS、HTTPS 與資源量測 |

2026-07-16 的公開網路查詢未找到可驗證的量界智算正式 API 文件。因此程式不硬編 endpoint、不安裝未知 SDK，也不宣稱已完成真實呼叫。部署操作者必須從實際帳號後台或官方文件取得正確值。

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

允許輸入：視角、有效分鐘、良好坐姿率、提醒事件數、平均分數、主要偏移、介入階段、合格資料數與前後三次平均。這些值不含姓名、學校或聯絡方式。

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

## 來源與授權

- [MediaPipe Pose Landmarker](https://ai.google.dev/edge/api/mediapipe/python/mp/tasks/vision/PoseLandmarker)
- [MediaPipe repository 與 Apache-2.0 license](https://github.com/google-ai-edge/mediapipe)
- [OpenAI Python SDK（僅作 OpenAI-compatible transport）](https://github.com/openai/openai-python)
- [Coolify documentation](https://coolify.io/docs/)

取得量界智算正式文件後，需在此補上官方連結、協定、模型版本、價格與資料政策，再做一次真實 smoke test。
