# K' Space

Tinker Bell 主题的私人饮食、运动、体重、经期记录工作台。单文件 PWA，支持离线使用 + Supabase 云端同步 + AI 照片/文字解析。

## 文件说明

| 文件 | 作用 |
|------|------|
| `index.html` | 主应用（含所有 CSS/JS，单文件即可运行） |
| `sw.js` | Service Worker，缓存核心资源，支持离线启动 |
| `manifest.webmanifest` | PWA 配置（图标、主题色、启动方式） |
| `supabase-sync.js` | Supabase 云端同步层（零依赖，fetch 直连） |
| `icon.svg` / `icon-512.png` / `touch-icon.svg` | PWA/主屏幕图标 |
| `.nojekyll` | 告诉 GitHub Pages 不要跑 Jekyll，避免静态资源被误处理 |
| `supabase-schema.sql` | 云端同步所需的 Supabase 建表脚本 |

## 部署到 GitHub Pages（推荐）

1. 在 GitHub 新建仓库：
   - 如果希望网址是 `https://你的用户名.github.io/`，仓库名就填 `你的用户名.github.io`。
   - 如果仓库名是其他，网址会是 `https://你的用户名.github.io/仓库名/`。
2. 把本目录全部文件推送到仓库 `main` 分支。
3. 进入仓库 **Settings → Pages** → Source 选 **Deploy from a branch** → 选 `main` / `root` → Save。
4. 等 1~3 分钟，GitHub 会给出正式访问链接。
5. 用 iPhone/iPad/Safari 或 Chrome（Android/桌面）打开 → 添加到主屏幕 → 即可享受 PWA 独立 App 体验。

## 使用前配置

1. **云端同步**：去 [supabase.com](https://supabase.com) 新建免费项目 → SQL Editor 跑 `supabase-schema.sql` → Settings → API 复制 Project URL 和 anon key → 在 App「设置与备份」里连接。
2. **AI 解析**：推荐用 [OpenRouter](https://openrouter.ai) 获取 API Key，端点填 `https://openrouter.ai/api/v1/chat/completions`，模型填 `openai/gpt-4o-mini`，并勾选「启用 AI 自动解析照片」。

## 多端同步逻辑

- 数据以本地 localStorage 为源，刷新/断网都不丢。
- 登录云账号后，写入操作会后台同步到 Supabase；登录时从云端拉取并覆盖本地。
- 每位用户只能读写自己的数据（RLS 行级安全）。

## 平台说明

- iOS Safari：打开链接 → 分享按钮 →「添加到主屏幕」。建议使用 PNG 图标（已内置 `icon-512.png`）。
- Android Chrome：打开链接 → 菜单 →「添加到主屏幕」/「安装应用」。
- macOS Safari/Chrome：地址栏右侧可安装 PWA。
- 由于数据存在浏览器本地，换设备首次打开是空的，登录同一云账号即可同步。
