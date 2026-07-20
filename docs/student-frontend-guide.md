# Posture Guardian 學生前端協作教學

> 這份教學給第一次參與軟體專案、第一次使用 GitHub 的同學。請照順序做；看到「請交給帶隊者」時，不要自行猜測或修改後端。

## 你會負責什麼？不需要負責什麼？

你在這個專案的角色是**前端協作者**：使用 VS Code 修改畫面、文案、版面、色彩、圖示與互動呈現，然後以自己的分支送出 Pull Request（PR）讓帶隊者檢查與合併。

你**不需要**安裝 Docker、Python、PostgreSQL、MediaPipe、量界智算，也不需要啟動 `backend/`。以下內容都屬於帶隊者負責的後端、資料庫或部署範圍，請不要修改：

- `backend/`、`compose.coolify.yaml`、`Dockerfile`、`migrations/` 與任何資料庫檔案。
- `.env`、API key、密碼、token、正式網址或任何秘密；這些不能放進 GitHub。
- `pnpm-lock.yaml`、`package.json`、`app.json`、`nginx.conf`，除非帶隊者明確指派你調整。
- 姿勢門檻、校準秒數、提醒秒數、API 路徑與資料格式；這些會影響功能與安全性，先交給帶隊者判斷。

即使 API 沒有啟動，你仍可在首頁按「試看展示模式」檢查大部分畫面、流程、文案、主題與排版。真實相機偵測、歷史紀錄與 AI 洞察需要後端，請以展示模式做前端驗收，並把需要後端驗證的事項寫在 PR 裡。

## 先認識協作名詞

| 名詞 | 白話意思 | 你要做的事 |
|---|---|---|
| Repository（repo） | GitHub 上的一個專案資料夾 | 這個專案是 `Sutdents-Project-Hub/Posture_Guardian`。 |
| Git | 記錄檔案版本與變更的工具 | 在自己的電腦留下可追蹤的修改紀錄。 |
| GitHub | 放置 Git 專案、討論與審查的平台 | 推送分支、開 PR、回覆 review。 |
| `main` | 團隊共同的穩定主線 | **只讀取、同步；不要直接修改或推送。** |
| branch（分支） | 從 `main` 分出的一條個人工作線 | 每一個小任務建立一條新分支。 |
| commit | 一個有意義的變更存檔點 | 例如「完成首頁按鈕間距修正」。 |
| push | 將本機分支上傳到 GitHub | 讓其他人看得到你的工作。 |
| Pull Request（PR） | 請求把你的分支變更併入 `main` 的審查單 | 請帶隊者確認後再合併；你沒有合併權限是正常且正確的設定。 |
| review | 對 PR 的檢查與留言 | 依留言修正、再次 push；同一張 PR 會自動更新。 |

最重要的原則是：**一個任務、一條分支、一張 PR。** 不同畫面或不同目的不要混在同一張 PR，這樣比較容易檢查，也比較不會互相弄壞程式。

## 開始前的設備與帳號

準備一台可連網的 Windows 10/11 或 macOS 電腦、現代瀏覽器（Chrome、Edge 或 Safari）與自己的 GitHub 帳號。請勿共用帳號；每個人都應能看出是哪位同學做了哪項修改。

請先向帶隊者確認你已被加入 GitHub 組織或此 repository，且權限可以：讀取 repo、建立 branch、push 自己的 branch、建立 PR。你不需要也不應該要求 `main` 的直接寫入或合併權限。

若還沒有 GitHub 帳號：開啟 [GitHub](https://github.com/)，以自己的常用信箱註冊、驗證信箱、設定密碼與兩步驟驗證。GitHub 的個人帳號名稱會出現在 commit 與 PR，請使用可辨識但不暴露不必要個資的名稱。

## 第一次安裝環境

這些只要在每台電腦做一次。安裝後若系統要求重新開機，請重新開機再繼續。

### 1. 安裝 Git

Git 是下載專案、建立分支與送出 PR 前置資料的工具。

**Windows**

1. 開啟 [Git for Windows](https://git-scm.com/download/win) 下載安裝程式並執行。
2. 安裝精靈大多維持預設選項即可。若出現「PATH」選項，選擇讓 Git 能從命令列使用的建議選項。
3. 安裝完成後，打開 Windows PowerShell：按 `Windows` 鍵，輸入 `PowerShell`，按 Enter。
4. 輸入下列指令並按 Enter；顯示版本號代表成功：

   ```powershell
   git --version
   ```

**macOS**

1. 開啟「終端機」（按 `Command + Space`，輸入「終端機」）。
2. 輸入：

   ```bash
   git --version
   ```

3. 如果 macOS 詢問是否安裝 Command Line Tools，選擇「安裝」，等它完成後重新輸入一次。也可從 [Git 官方網站](https://git-scm.com/download/mac) 取得安裝方式。

### 2. 安裝 Visual Studio Code（VS Code）

1. 從 [VS Code 官方下載頁](https://code.visualstudio.com/Download) 下載符合你的 Windows 或 macOS 版本的安裝程式。
2. 依畫面完成安裝。Windows 安裝時，若有「Add to PATH」或「Add \"Open with Code\" action」選項，可以勾選，之後會較方便。
3. 開啟 VS Code；第一次看到 Welcome 頁是正常的。
4. 在左側點選最下方帳號圖示，選擇 **Sign in with GitHub**，瀏覽器會開啟 GitHub 授權頁。確認是自己的帳號後按授權，再回到 VS Code。

登入可讓 VS Code 幫你使用 GitHub，但它不會替你取得合併 `main` 的權限。

### 3. 安裝 Node.js 24

這個前端已以 **Node.js 24.14.0**、pnpm 11.7.0、Expo 54 驗證。請使用 Node.js 24 的 LTS 版本，不要使用太舊的 Node，也不要同時安裝多套來源不明的 Node。

1. 前往 [Node.js 官方下載頁](https://nodejs.org/en/download)，選擇 Node.js **24 LTS** 的 Windows 或 macOS 安裝程式。
2. 依預設選項安裝。Windows 若出現要安裝額外 build tools，不必為這個專案勾選；我們只執行 Web 前端。
3. **完全關閉並重新開啟** PowerShell／終端機，輸入：

   ```bash
   node --version
   npm --version
   ```

4. 第一行應以 `v24.` 開頭；第二行會顯示 npm 版本。若顯示「找不到命令」，通常是安裝後沒有重開終端機，請先重開；仍不行再重新安裝 Node.js。

### 4. 啟用 pnpm 11.7.0

這個專案使用 `pnpm`，**不要改用** `npm install` 或 `yarn install`。在 PowerShell 或終端機輸入：

```bash
corepack enable
corepack prepare pnpm@11.7.0 --activate
pnpm --version
```

最後一行應顯示 `11.7.0`。若第一行說找不到 `corepack`，請先確認 `node --version` 是 v24；如果仍無法使用，請把完整錯誤畫面截圖傳給帶隊者，不要自行下載不明來源的套件管理工具。

### 5. 設定 Git 的作者資訊（每台電腦只做一次）

在終端機輸入，請把引號中的文字改成你自己的姓名與**已驗證的 GitHub 信箱**：

```bash
git config --global user.name "王小明"
git config --global user.email "your-github-email@example.com"
git config --global --list
```

最後一行會列出設定。信箱若與 GitHub 驗證過的信箱不同，GitHub 可能無法把 commit 正確顯示在你的帳號上。

## 第一次下載專案並開啟

### 用 VS Code 下載（最推薦）

1. 開啟 VS Code，選擇 Welcome 頁的 **Clone Git Repository**；若沒看到，按 `Command + Shift + P`（macOS）或 `Ctrl + Shift + P`（Windows），輸入並選擇 `Git: Clone`。
2. 貼上本專案網址：

   ```text
   https://github.com/Sutdents-Project-Hub/Posture_Guardian.git
   ```

3. 選擇你自己容易找到的本機位置，例如「文件/Documents」下的 `projects` 資料夾。不要選 iCloud Drive、OneDrive、Dropbox 或 USB 隨身碟同步資料夾，以免同步軟體干擾 Git。
4. 等 VS Code 顯示 clone 完成後，按 **Open** 開啟 `Posture_Guardian` 資料夾。
5. 若出現「Do you trust the authors?」，確認這是上述團隊 repo 後選擇信任。這樣 VS Code 才能使用終端機與 Git 功能。
6. 左邊檔案總管最外層應是 `Posture_Guardian`，且能看到 `app`、`backend`、`docs`。如果最外層是 `app`，先用 **File → Open Folder** 改開 `Posture_Guardian`。

### 用終端機下載（知道自己在做什麼時使用）

**Windows PowerShell**

```powershell
cd $HOME\Documents
git clone https://github.com/Sutdents-Project-Hub/Posture_Guardian.git
cd Posture_Guardian
```

**macOS 終端機**

```bash
cd ~/Documents
git clone https://github.com/Sutdents-Project-Hub/Posture_Guardian.git
cd Posture_Guardian
```

之後在 VS Code 選擇 **File → Open Folder**，開啟剛下載的 `Posture_Guardian`。不要每次工作又 clone 一份；同一台電腦保留一份乾淨的工作資料夾即可。

## 安裝這個專案的前端套件

1. 在 VS Code 上方選 **Terminal → New Terminal**。下方出現終端機後，確認提示文字最後是在 `Posture_Guardian`，不是 `app` 或其他專案。
2. 輸入：

   ```bash
   cd app
   pnpm install
   ```

3. 第一次會下載套件，依網路狀況需要幾分鐘。完成後應回到提示字元而沒有紅色錯誤。
4. 這會產生 `app/node_modules/`；它是電腦本機需要的套件，已被 Git 忽略，**絕對不要加入 commit**。

本專案只需在 `app/` 安裝前端套件。不要在 `backend/` 內執行指令、不要建立 Python 虛擬環境，也不要執行任何 Docker 指令。

## 前端設定：何時需要 `.env`？

前端只有一個公開設定：`EXPO_PUBLIC_API_BASE_URL`，它是瀏覽器連到 API 的網址。凡是 `EXPO_PUBLIC_*` 開頭的內容都會打包到公開前端，所以**不能放密碼、token 或 API key**。

只檢查展示模式與一般 UI 時，**不必建立 `.env`**；程式會使用預設本機 API 位址，連不上時仍可使用展示模式。若帶隊者已提供可用的公開測試 API 位址，才建立設定檔：

**macOS／Linux 終端機（目前在 `app/`）**

```bash
cp .env.example .env
```

**Windows PowerShell（目前在 `app/`）**

```powershell
Copy-Item .env.example .env
```

接著在 VS Code 的 `app/.env` 填入帶隊者提供的公開 URL，例如：

```dotenv
EXPO_PUBLIC_API_BASE_URL=https://由帶隊者提供的測試網址
```

存檔後必須停止並重新啟動前端，設定才會生效。`.env` 已被忽略，不會上傳 GitHub；若 VS Code 的 Source Control 出現它，立刻停止並請帶隊者協助。

## 啟動與檢查前端 Web

在 VS Code 終端機中，位置必須是 `Posture_Guardian/app`，輸入：

```bash
pnpm web
```

Expo 會顯示開發伺服器資訊，通常會自動開啟瀏覽器；若沒有，請複製終端機**實際顯示**的 Web 網址到瀏覽器開啟。不要猜測或手動填別人的 port。

另一種方式是：

```bash
pnpm start
```

然後在 Expo 終端機的互動選單按 `w` 開啟 Web。對剛開始的同學，直接用 `pnpm web` 最簡單。

打開後請先：

1. 看首頁、AI 洞察、趨勢、設定四個分頁是否都能切換。
2. 在首頁按「試看展示模式」，完成一次引導與摘要，確認不用相機與 API 也能顯示核心畫面。
3. 在「設定」切換淺色／深色／跟隨系統，檢查文字和按鈕對比是否清楚。
4. 修改檔案後按 `Command + S` 或 `Ctrl + S`；瀏覽器通常會自動更新。若沒有更新，按瀏覽器重新整理一次。

停止開發伺服器時，回到該終端機按 `Ctrl + C`。不需要關閉 VS Code。

### 可選：用自己的手機預覽（不是必要環境）

日常改畫面用 Web 就足夠；不需要安裝 Android Studio 或 Xcode。若想確認手機的字體、觸控和版面，可在手機安裝官方 **Expo Go**：iPhone 從 App Store、Android 從 Google Play 下載。然後在 `app/` 輸入：

```bash
pnpm start
```

依 Expo 終端機顯示的 QR code 操作：iPhone 用相機掃描後選擇開啟 Expo Go；Android 在 Expo Go 內掃描。手機和電腦通常要在同一個 Wi-Fi。若手機顯示不能連線，先回到 Web 預覽，並把 Expo 終端機的完整錯誤傳給帶隊者；不要因此改動後端或路由器設定。

手機中的 `localhost` 是**手機自己**，不是你的電腦。因此真實 API 串接必須由帶隊者提供手機可連到的公開或區網 API 位址；展示模式則不受此限制。

### Web 相機的限制

相機功能在 Web 需要瀏覽器權限，而且通常只在 `localhost` 或 HTTPS 環境可用。沒有後端或模型時，真實偵測無法完整驗收；這不是前端同學的錯誤。請改測展示模式，並在 PR 的「未驗證」欄註明「真實相機／API 由帶隊者驗收」。

## 前端專案結構：要去哪裡改？

所有日常前端工作都在 `app/`。以下是常用位置；先用 VS Code 的左側檔案總管找到檔案，再閱讀附近既有寫法，不要整份重寫。

```text
Posture_Guardian/
├── app/                         # 你主要工作的前端根目錄
│   ├── app/                     # Expo Router 頁面與路由
│   │   ├── _layout.tsx          # 全站根設定與頁面容器；通常不必改
│   │   ├── (tabs)/              # 底部四個分頁
│   │   │   ├── index.tsx        # 首頁
│   │   │   ├── insights.tsx     # AI 洞察頁
│   │   │   ├── history.tsx      # 趨勢頁
│   │   │   └── settings.tsx     # 設定頁
│   │   └── session.tsx          # 校準、相機與展示模式流程；修改前先找帶隊者確認
│   ├── components/              # 可重複使用的按鈕、卡片、圖表與視覺元件
│   ├── constants/design.ts      # 色票、字級、間距、圓角等設計 token
│   ├── hooks/                   # 主題、畫面寬度等可重複行為
│   ├── context/app-context.tsx  # 裝置端偏好設定；修改資料行為前先確認
│   ├── lib/                     # 格式化、展示資料與前端邏輯
│   ├── assets/images/           # 已授權的 App 圖示與圖片
│   ├── .env.example             # 公開設定範例，不能填真實秘密
│   ├── package.json             # 前端指令與套件清單，不要自行改版本
│   └── pnpm-lock.yaml           # 鎖定套件版本，不要手動編輯
├── backend/                     # 帶隊者負責；不要修改
├── docs/                        # 專案說明與本教學
└── compose.coolify.yaml         # 部署設定；不要修改
```

### 常見工作對照表

| 想做的事 | 優先查看的位置 | 注意事項 |
|---|---|---|
| 改首頁文案、區塊順序或首頁排版 | `app/app/(tabs)/index.tsx` | 先在 Web 的窄、寬視窗都看一次。 |
| 改 AI 洞察、趨勢或設定頁 UI | 對應的 `app/app/(tabs)/*.tsx` | 不要改 API 回傳資料的欄位名稱。 |
| 改共用按鈕、卡片、儀表板外觀 | `app/components/` | 先搜尋此元件在哪些頁面使用，避免意外影響全站。 |
| 改全站顏色、間距、字級 | `app/constants/design.ts` | 優先使用現有 token，改前先在 PR 說明會影響哪些頁面。 |
| 新增已授權的圖片或圖示 | `app/assets/images/` | 只放可公開使用的素材，PR 註明來源與授權。 |
| 調整展示模式的畫面資料 | `app/lib/demo.ts` | 只能使用合成資料，不能放真實學生、同學或相機影像。 |
| 看 API 怎麼被前端呼叫 | `app/lib/api.ts` | 閱讀可以；變更網址、path、timeout 或資料格式前，先交給帶隊者。 |

### 修改 UI 時的安全檢查

1. 優先沿用 `PageShell`、`Surface`、`AppButton` 等既有元件與 `Spacing`、`Typography`、`Radius`、色票 token，避免每頁各寫一套風格。
2. UI 可顯示「姿勢覺察／習慣輔助」，不可寫成醫療診斷、治療承諾或保證改善。
3. 不要把真實姓名、照片、學號、健康資訊或相機截圖放入程式、展示資料、commit、PR 描述或公開 Issue。
4. 每次調整都在瀏覽器用窄視窗與寬視窗檢查，並分別試淺色與深色主題。
5. 若不確定應修改哪個檔案，在 VS Code 按 `Command + Shift + F`（macOS）或 `Ctrl + Shift + F`（Windows）搜尋畫面上的現有文字，再從搜尋結果找對位置；不要盲目新增重複頁面。

## 接到任務後，先把需求說清楚

開始前先把你理解的內容貼到 GitHub Issue、Discord／群組或 PR 草稿中，格式可以很簡單：

```text
我要改：首頁的「開始側面偵測」區塊。
目的：讓第一次使用者更容易找到展示模式。
預計修改：app/app/(tabs)/index.tsx，必要時使用既有 AppButton。
不會修改：API、相機流程、資料格式、後端與部署。
完成標準：桌機與窄螢幕可讀；淺色／深色皆清楚；展示模式可正常進入。
需要確認：按鈕文案是否維持「試看展示模式」。
```

這種說明能讓帶隊者在你花很多時間前指出範圍或設計方向。遇到不清楚的 API、資料、相機、登入、權限、隱私或安全問題，請附上截圖、你正在看的檔案路徑與錯誤文字，直接交給帶隊者；不要為了「先做出來」而改後端。

## 每次工作的標準流程（終端機版）

以下命令都在 VS Code 的終端機使用。先回到 repository 根目錄：如果你現在在 `app/`，先輸入 `cd ..`。

### A. 每天開工：先同步 `main`

開始新任務前，確認自己沒有未完成修改，再輸入：

```bash
git status --short --branch
git switch main
git pull --ff-only origin main
```

第一行如果沒有列出檔案，才表示工作區乾淨。`git pull --ff-only` 下載帶隊者已合併的內容，且遇到複雜情況會停下來，不會偷偷製造合併 commit。

如果第一行列出檔案，**不要**急著切換分支或 pull：可能是昨天未完成的工作。先完成昨天的 commit／PR，或把畫面和 `git status --short --branch` 結果傳給帶隊者詢問。

### B. 建立自己的任務分支

從最新 `main` 建立分支。分支名稱使用小寫英文、數字與連字號，建議用工作類型開頭：

```bash
git switch -c feat/home-demo-cta
```

其他例子：

```text
fix/settings-dark-text
style/history-card-spacing
docs/guide-typo
```

確認終端機或 VS Code 左下角已顯示你的分支名稱，而不是 `main`。接下來的所有修改都只在這條分支。

### C. 修改、即時檢查、看差異

1. 進入前端並啟動 Web：

   ```bash
   cd app
   pnpm web
   ```

2. 以小步修改一個畫面；每次存檔都看瀏覽器是否如預期。
3. 結束伺服器按 `Ctrl + C`，回到 repository 根目錄：

   ```bash
   cd ..
   git status --short
   git diff -- app/app/(tabs)/index.tsx
   ```

最後一行只是範例；請改成你實際修改的檔案。它會讓你在 commit 前逐行確認，避免把測試檔、圖片或不該上傳的內容一起送出。

### D. 跑前端檢查

先在 `app/` 執行：

```bash
pnpm lint
pnpm typecheck
```

UI 修改完成、時間允許時再執行：

```bash
pnpm build
```

`pnpm build` 只建立 Web 靜態輸出並檢查是否可編譯，產生的 `dist/` 不要 commit。若指令失敗，不要略過紅字；複製完整錯誤、記下剛修改的檔案，先嘗試修正自己的 UI 變更。若錯誤明顯和 API、相機、資料格式或既有程式有關，請交給帶隊者。

### E. 只暫存這次應交的檔案，建立 commit

回到 repository 根目錄後，使用明確檔案路徑；**不要使用 `git add .`**。

```bash
git add app/app/(tabs)/index.tsx
git status --short
git diff --staged
git commit -m "feat(app): 改善首頁展示模式入口"
```

commit 訊息格式是：`類型(範圍): 簡短繁中描述`。常用類型有：

| 類型 | 用途 | 例子 |
|---|---|---|
| `feat` | 新的使用者看得到的功能／區塊 | `feat(app): 新增首頁提示卡` |
| `fix` | 修正錯誤或跑版 | `fix(app): 修正深色模式按鈕文字` |
| `style` | 不改功能的視覺調整 | `style(app): 統一卡片間距` |
| `docs` | 只改文件 | `docs: 補充前端操作說明` |
| `refactor` | 不改外觀但整理程式 | 先和帶隊者確認再使用。 |

commit 後再輸入 `git status --short --branch`。理想結果是沒有列出檔案，並顯示你的分支比遠端多一個 commit。

### F. 推送分支並建立 PR

第一次推送這條分支時輸入：

```bash
git push -u origin feat/home-demo-cta
```

請把最後的分支名換成你真正建立的名字。成功後，終端機通常會顯示 GitHub 連結；也可以前往本專案的 [Pull Requests 頁](https://github.com/Sutdents-Project-Hub/Posture_Guardian/pulls)。GitHub 出現 **Compare & pull request** 時按下去。

建立 PR 時逐項確認：

1. **base** 是 `main`；**compare** 是你自己的 `feat/...`、`fix/...` 或 `style/...` 分支。
2. 標題和 commit 一樣清楚，例如 `feat(app): 改善首頁展示模式入口`。
3. 內文填寫下方範本，並附上改動前後截圖或短影片（不可含真實個資或相機畫面）。
4. 選擇帶隊者作為 reviewer；不要按 Merge，即使按鈕出現也不需要處理。

PR 內文範本：

```markdown
## 目的
讓第一次使用者更容易找到展示模式。

## 修改內容
- 調整首頁展示模式按鈕的位置與說明文字。
- 沿用既有 AppButton 與設計 token，未改 API 或資料格式。

## 我如何檢查
- [x] Web 首頁、展示模式、四個分頁可開啟。
- [x] 已查看窄／寬畫面與淺色／深色主題。
- [x] `pnpm lint` 通過。
- [x] `pnpm typecheck` 通過。
- [ ] 真實相機與 API：由帶隊者驗收。

## 截圖／影片
（貼上不含個資的截圖或連結）

## 風險或需要確認
- 請確認展示模式按鈕文案是否採用目前版本。
```

### G. 收到 review 後怎麼做？

1. 讀懂留言再開始改；不確定意思時，直接在該留言下提問，不要猜。
2. 仍留在**同一條分支**修改並測試。
3. 再次只暫存需要的檔案、commit、push：

   ```bash
   git add app/實際修改的檔案.tsx
   git commit -m "fix(app): 依 review 調整展示模式按鈕"
   git push
   ```

4. 不必新開 PR；`git push` 後同一張 PR 會自動更新。
5. 在 GitHub 的 review 留言下回覆你改了什麼；帶隊者會決定何時核准與合併。

### H. PR 要求更新 `main` 或出現衝突時

先完成或 commit 目前的修改，再從 repository 根目錄輸入：

```bash
git fetch origin
git rebase origin/main
```

如果沒有衝突，重新推送：

```bash
git push --force-with-lease
```

這個指令只安全地更新**你自己的已推送分支**，不能用在 `main`；請再次確認左下角不是 `main`。

若 Git 指出衝突：

1. 在 VS Code 左側 Source Control 打開衝突檔，使用 Conflict Editor 比較「目前分支」與「傳入的 `main`」。
2. 保留兩邊都需要的內容；不要因為想快點完成就整段選一邊。看不懂時截圖詢問帶隊者。
3. 修好後存檔、執行 `git add 衝突檔路徑`，再輸入：

   ```bash
   git rebase --continue
   ```

4. 重複直到 rebase 完成，再跑 `pnpm lint` 和 `pnpm typecheck`，最後 `git push --force-with-lease`。
5. 如果發現自己走錯或不能安全處理，輸入 `git rebase --abort` 回到 rebase 前，不會丟掉原本分支，然後找帶隊者。

## 同一套流程的 VS Code 圖形操作版

不想一直輸入 Git 指令時，可以用左側第三個圖示 **Source Control**（分支圖示）。核心規則仍相同：不要在 `main` 改、只暫存自己的檔案、push 分支、用 GitHub 網頁開 PR。

1. **建立分支：** 先點 VS Code 左下角的 branch 名稱（初次是 `main`），選 **Create new branch**，輸入如 `feat/home-demo-cta`。建立前先確認 `main` 是最新；可在 Source Control 的 `...` 選單使用 **Pull**。
2. **看變更：** 存檔後，Source Control 的 **Changes** 會列出檔案。點檔名可看左右差異，確認沒有 `.env`、`node_modules` 或不相關檔案。
3. **暫存：** 每個要交的檔案右側按 `+`。不要按「Stage All Changes」；它容易把無關檔案一起送出。
4. **commit：** 在上方訊息框輸入，例如 `style(app): 調整首頁卡片間距`，按 **Commit**。如果 VS Code 詢問是否自動 stage 全部，選擇取消，回頭逐檔 stage。
5. **push：** 第一次按 **Publish Branch**，之後按左下角的同步／push 圖示。VS Code 若要開瀏覽器登入 GitHub，使用自己的帳號完成授權。
6. **開 PR：** 最穩妥方式是點 GitHub 網頁上的 **Compare & pull request**，填完 PR 範本、指定 base `main` 與 reviewer。也可以安裝官方的「GitHub Pull Requests and Issues」擴充功能，但它只是方便工具，不是必要環境。
7. **回應 review：** 在 GitHub 網頁看留言，回到同一分支改檔、在 Source Control stage／commit／push；PR 不會消失，會自動加入新 commit。

即使使用圖形介面，也建議在每天開始與提交前偶爾輸入 `git status --short --branch`，它最清楚顯示自己在哪條分支、有哪些檔案尚未提交。

## 常見問題與安全處理

### `pnpm: command not found` 或「不是可辨識的命令」

先關閉並重新開啟 VS Code，再在新終端機依序輸入：

```bash
node --version
corepack enable
corepack prepare pnpm@11.7.0 --activate
pnpm --version
```

若 `node --version` 不是 v24 或找不到 Node，重新依上方步驟安裝 Node.js 24。不要用 `sudo`、不要亂改系統路徑。

### `pnpm install` 失敗或套件看起來損壞

先確認網路穩定、目前位置是 `Posture_Guardian/app`，再重新執行 `pnpm install`。若帶隊者確認可以清除本機套件，才刪除**精確的** `app/node_modules` 資料夾後再次 `pnpm install`；不要刪除 `pnpm-lock.yaml`，也不要刪除整個專案資料夾。

### 瀏覽器顯示空白、紅字或沒有自動更新

1. 看 Expo 終端機是否有第一個紅色錯誤；複製完整文字。
2. 打開瀏覽器開發者工具（F12 或右鍵「檢查」）看 Console，但不要把不懂的錯誤隨便改掉。
3. 先還原你剛才很小的 UI 修改或用 `git diff` 比較，確認是否由自己的變更造成。
4. 重新整理瀏覽器；仍不行就停止 `pnpm web` 後重啟。
5. 將錯誤文字、畫面截圖、分支名與最近修改的檔案傳給帶隊者。

### 顯示「目前無法連線到姿勢分析服務」

這通常表示 API 沒有啟動、前端 `.env` 的網址不正確，或帶隊者尚未提供測試服務。你不需要啟動後端；請測「試看展示模式」。若要串測，將你的公開 `EXPO_PUBLIC_API_BASE_URL` 設定交給帶隊者確認。

### GitHub 不讓我 push、看不到 repo 或開不了 PR

確認 VS Code／瀏覽器登入的是自己的 GitHub 帳號，且 repository 是 `Sutdents-Project-Hub/Posture_Guardian`。把 GitHub 的錯誤訊息截圖傳給帶隊者，請他確認組織邀請、repo 權限或分支保護規則。不要向同學索取帳號密碼，也不要要求把 `main` 解鎖。

### 不小心在 `main` 改了檔案

立刻停止，不要 commit、不要 push。先輸入：

```bash
git status --short --branch
```

把結果傳給帶隊者。他會依你是否已 commit、是否有未追蹤檔案，指示最安全的處理方式。不要自行執行 `git reset --hard`、`git clean` 或大量刪除指令，這些可能永久刪掉工作。

### PR 顯示不能自動合併

這通常是預期的保護規則：你可以建立 PR，但不能合併到 `main`。確認 PR 內容、測試與截圖都完成，等待 reviewer；如果 PR 提示需要更新分支，依「PR 要求更新 `main`」步驟處理或找帶隊者協助。

## 每日清單

### 開工前

- [ ] VS Code 登入的是自己的 GitHub 帳號。
- [ ] 在 repo 根目錄執行 `git status --short --branch`，沒有未完成檔案。
- [ ] 回到 `main` 並執行 `git pull --ff-only origin main`。
- [ ] 從最新 `main` 建立新的任務分支；左下角不是 `main`。
- [ ] 再確認今天只改前端 UI，沒有後端、秘密或部署工作。

### 送 PR 前

- [ ] 用 `pnpm web` 實際看過修改；展示模式可完成流程。
- [ ] 看過窄／寬視窗、淺色／深色主題，文字沒有被切掉。
- [ ] 執行 `pnpm lint`、`pnpm typecheck`；可行時也執行 `pnpm build`。
- [ ] `git diff` 已檢查，只有這次任務需要的檔案。
- [ ] `.env`、`node_modules`、秘密、真實個資、未授權素材都沒有出現在 Changes。
- [ ] commit 和 PR 標題能清楚說明改了什麼，PR 有測試結果、截圖與未驗證事項。
- [ ] PR 的 base 是 `main`，compare 是自己的分支；沒有自行 merge。

### PR 合併後

- [ ] 確認 GitHub 顯示 PR 已由帶隊者合併。
- [ ] 切回本機 `main`，執行 `git pull --ff-only origin main`。
- [ ] 下個任務再從最新 `main` 建立新分支；不要繼續使用已合併的舊分支。

## 最後提醒

遇到問題時，最有幫助的求救訊息包含：你在哪個專案與分支、想做什麼、實際做了哪些步驟、完整錯誤文字、VS Code／瀏覽器截圖，以及是否已執行 `pnpm lint` 或 `pnpm typecheck`。這比只說「不能跑」更容易讓帶隊者快速協助你。

你只要守住三件事，就能安全協作：**不在 `main` 修改、每個任務用自己的 branch 和 PR、不要把秘密或真實個資放上 GitHub。**
