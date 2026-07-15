# 安全、身份與隱私

## 適用原因

本專案 concerns：ai, auth, database, external-api, personal-data, uploads。

## 必須確認

- 身份、角色、允許與拒絕邊界，以及敏感操作的可信任執行端。
- 個資或學生資料的來源、最小蒐集、用途、保存、刪除、去識別與公開展示限制。
- Secrets 只存在本機忽略檔或部署平台，不進入前端、文件、log 或 Git。
- 驗收需涵蓋未登入、越權、錯誤輸入與資料外洩情境。
