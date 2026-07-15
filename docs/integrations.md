# AI、MediaPipe 與外部整合

## 分工原則

姿勢事件必須可解釋且在外部生成式 AI 失效時仍能運作：

- **姿態節點**：MediaPipe Pose Landmarker。
- **姿勢判定**：本專案的個人基線、角度、品質與時間窗規則。
- **長期分析**：PostgreSQL 聚合與可重現的統計。
- **個人化語句**：Microsoft Foundry 模型或規則式 fallback。

生成式 AI 不直接看原始影像，也不單獨決定「良好／不良」。

## 整合清單

| 整合 | 目的 | 目前狀態 | 主要限制／fallback |
|---|---|---|---|
| MediaPipe Pose Landmarker | 33 個人體姿態節點與 visibility | 0.10.x 與 Lite model 已實作；本機 0.10.35、Linux ARM64 image 0.10.18 均可載入模型 | 無人體時回報相機品質，不猜測姿勢 |
| Microsoft Foundry Models | 由最近六次去識別摘要產生繁中改善建議，提供 Azure PoC | Responses API provider 與長期趨勢輸入已實作；資源／額度未確認 | provider=`fallback` 使用相同三段格式的固定規則建議 |
| PostgreSQL | 工作階段與衍生指標 | SQLAlchemy／asyncpg schema 與 Compose 已實作 | 本機可用 SQLite；DB 失效時顯示離線摘要 |
| Coolify | client、API、PostgreSQL 主要部署 | Dockerfile／Compose 已實作，未建立外部資源 | 本機展示仍可執行 |
| 「界智算」 | 使用者提出的 AI 選項 | 正式名稱與 API 未確認 | 先保留 OpenAI-compatible provider 邊界，不安裝未知 SDK |

## 為何不用 Azure Image Analysis 做骨架

Microsoft 官方列出的 Image Analysis 4.0 功能包括 OCR、caption、tags、object／people detection 與 smart crop，people detection 回傳的是 bounding box，不是人體骨架；官方亦公告 4.0 於 2028-09-25 退役。因此舊簡報的「Azure AI Vision 骨架辨識」不成立。

Azure 概念驗證改為：

1. 將去識別的工作階段摘要送到 Microsoft Foundry 模型。
2. 目前以 Responses API 產生 120 字內「趨勢｜下一步｜下次目標」中性繁中建議，資料不足時不得假設改善。
3. 工作階段保存 provider；模型、prompt version 與 latency audit 尚待 Azure PoC 補齊。
4. 決賽展示 Azure resource、一次真實呼叫與 log，而不是只展示 logo。

## AI 輸入／輸出契約

允許輸入：

- 介入階段、工作階段長度、有效資料比例。
- 良好坐姿比例、常見偏移類型、發生時段與近期變化。
- 同一匿名 profile 的合格資料數、最近三次／前三次平均與改善百分點。
- 使用者已選擇的提醒偏好。

禁止輸入：

- 原始照片／影片、姓名、學校、聯絡人、精確地址或未經同意的自由文字。
- 將姿勢分數包裝成疾病或傷害機率的要求。

輸出必須：

- 使用中性、不責備的繁體中文。
- 提供一項短時間可行調整與一項環境調整。
- 說明是生活習慣建議，不是醫療診斷。
- 解析失敗時不直接顯示 provider 原文，改用 fallback。

## 環境變數

client 公開設定：

- `EXPO_PUBLIC_API_BASE_URL`

API 私密／server-side 設定（程式已讀取）：

- `APP_ENV`
- `DATABASE_URL`
- `CORS_ORIGINS`
- `POSE_MODEL_PATH`
- `AI_PROVIDER`
- `AZURE_FOUNDRY_ENDPOINT`
- `AZURE_FOUNDRY_API_KEY`
- `AZURE_FOUNDRY_MODEL`

## 官方來源與授權

- [MediaPipe Pose Landmarker](https://ai.google.dev/edge/api/mediapipe/python/mp/tasks/vision/PoseLandmarker)
- [MediaPipe repository 與 Apache-2.0 license](https://github.com/google-ai-edge/mediapipe)
- [Microsoft Foundry documentation](https://learn.microsoft.com/en-us/azure/foundry/)
- [Azure Image Analysis 功能與退役公告](https://learn.microsoft.com/en-us/azure/ai-services/computer-vision/overview-image-analysis)
- [Coolify documentation](https://coolify.io/docs/)

加入實際模型檔、SDK、字型、圖片或資料集時，須再記錄精確版本、來源、license、成本與資料政策。
