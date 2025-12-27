# Memo-Brutal (纪念日助手) 📅

基于 Neo-Brutalism 设计风格的纪念日、订阅与节日追踪工具。支持农历/公历循环，支持记账与日志功能。
**Serverless 架构：完全运行在 Cloudflare Workers 上，利用 KV 存储数据，无需购买 VPS，免费额度通常足够个人使用。**

![UI Preview](https://via.placeholder.com/800x400?text=Neo-Brutalism+UI+Preview)

## ✨ 功能特性

- **新丑主义 (Neo-Brutalism) UI**：高对比度、粗边框、个性鲜明。
- **全托管 (Serverless)**：后端运行在 Cloudflare Workers，数据存储在 Cloudflare KV。
- **双历法支持**：支持公历 (Solar) 和 农历 (Lunar) 周期计算（目前演示版为简化算法）。
- **记账与日志**：每个纪念日都可以关联日志和费用记录（例如：记录每年生日发了多少红包、服务器续费多少钱）。
- **多渠道推送**：
  - Telegram
  - Bark (iOS)
  - PushPlus
  - 自定义 Webhook

## 🚀 自动一键部署 (推荐)

点击下方按钮，将项目部署到您的 Cloudflare 账户。

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/your-username/memo-brutal)

**部署步骤：**

1.  **点击上方按钮**。
2.  **授权** Cloudflare 访问您的 GitHub 账户（用于 Fork 仓库）。
3.  按照指引完成部署，Cloudflare 会自动为您创建 Worker 和 KV 命名空间。
4.  **重要配置：** 部署完成后，请进入 [Cloudflare Dashboard](https://dash.cloudflare.com) -> `Workers & Pages` -> `您的项目` -> `Settings/设置` -> `Variables/变量`。

### 必填配置 (Variables)

您**必须**设置以下内容才能正常运行：

1.  **KV Namespace Bindings (KV 命名空间绑定)**
    *   变量名 Variable name: `RENEW_KV` (**不能改！**)
    *   命名空间 KV Namespace: 选择一个现有的或新建一个（例如叫 `memo-brutal-db`）。

2.  **Environment Variables (环境变量)**
    *   `AUTH_PASSWORD`: 您的登录密码（建议设置复杂一点）。如果不填，默认为 `admin`。

### 可选推送配置

根据需要添加以下环境变量：

| 变量名 | 描述 |
| :--- | :--- |
| `TELEGRAM_BOT_TOKEN` | Telegram 机器人的 Token |
| `TELEGRAM_CHAT_ID` | 接收消息的 Chat ID |
| `BARK_KEY` | Bark App 的 Key (iOS) |
| `PUSH_PLUS_TOKEN` | PushPlus 的 Token |
| `WEBHOOK_URL` | 自定义 Webhook 地址 |

## 💡 使用说明

1.  打开部署后的 Worker 地址（例如 `https://your-project.your-name.workers.dev`）。
2.  输入您设置的 `AUTH_PASSWORD` 进行登录。
3.  点击 **"新建"** 添加纪念日或订阅。
4.  点击卡片上的 **书本图标** 📖 进入日志模式，记录该事项相关的收支或备忘。
5.  系统会每天定时（由 Cloudflare Cron Triggers 触发）检查并推送提醒。

## 🛠 本地开发

如果您想进行二次开发：

1.  克隆仓库。
2.  安装依赖：`npm install`
3.  启动本地开发：`npm start` (仅前端)。
4.  若要测试 Worker 逻辑，请使用 Wrangler：`npx wrangler dev`。

## License

MIT
