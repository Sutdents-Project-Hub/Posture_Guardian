# 資料與儲存

## 適用原因

本專案 concerns：ai, auth, database, external-api, personal-data, uploads。

## 必須確認

- Schema、資料來源、擁有元件、測試資料與 production 資料邊界。
- Migration、seed、刪除、修復、備份與還原方式；不得用不可回復操作處理學生成果。
- Upload、媒體或文件的儲存位置、存取權限、容量、保留期與部署持久性。
- README 與元件文件只記錄安全的資料契約，不放真實資料或 credentials。
