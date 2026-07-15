# 外部整合與 AI

## 適用原因

本專案 concerns：ai, auth, database, external-api, personal-data, uploads。

## 必須確認

- API、模型或服務的官方來源、授權、成本、rate limit、timeout、錯誤與替代流程。
- Key 與敏感請求由可信任環境管理；不得將 production secret 放入 App 或公開 Web。
- AI 功能需記錄模型用途、輸入資料、限制、錯誤可能性、人工覆核與競賽揭露方式。
- 外部服務失效、回傳不完整或不可用時，demo 與主要流程應有可理解的降級行為。
