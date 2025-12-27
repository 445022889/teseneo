# Memo-Brutal (纪念日助手) 📅

基于 Neo-Brutalism 设计风格的纪念日、订阅与节日追踪工具。支持农历/公历循环，支持记账与日志功能。
**Serverless 架构：完全运行在 Cloudflare Workers 上，利用 KV 存储数据，无需购买 VPS。**

![UI Preview](https://via.placeholder.com/800x400?text=Neo-Brutalism+UI+Preview)

## ✨ 功能特性

- **新丑主义 (Neo-Brutalism) UI**：高对比度、粗边框、个性鲜明。
- **全托管 (Serverless)**：后端运行在 Cloudflare Workers，数据存储在 Cloudflare KV。
- **双历法支持**：支持公历 (Solar) 和 农历 (Lunar) 周期计算。
- **记账与日志**：关联日志和费用记录。
- **多渠道推送**：Telegram, Bark, PushPlus, Webhook。

## 🚀 自动一键部署 (推荐)

点击下方按钮，将项目部署到您的 Cloudflare 账户。

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/445022889/teseneo)

> **注意**：如果部署失败，请检查您的 GitHub 仓库是否包含 `wrangler.toml` 文件（本项目已包含）。

**部署步骤：**

1.  **点击上方按钮**。
2.  **授权** Cloudflare 访问您的 GitHub 账户。
3.  Cloudflare 会自动识别 `wrangler.toml` 并建议创建 KV 命名空间。
4.  **重要配置：** 部署完成后，请进入 [Cloudflare Dashboard](https://dash.cloudflare.com) -> `Workers & Pages` -> `您的项目` -> `Settings` -> `Variables`。

### 必填配置 (Variables)

您**必须**设置以下内容才能正常运行：

1.  **KV Namespace Bindings (KV 绑定)**
    *   变量名 Variable name: `RENEW_KV` (**必须完全一致**)
    *   命名空间 KV Namespace: 选择部署时创建的那个。

2.  **Environment Variables (环境变量)**
    *   `AUTH_PASSWORD`: 您的登录密码（建议设置复杂一点）。如果不填，默认为 `admin`。

## 💡 使用说明

1.  打开部署后的 Worker 地址（例如 `https://memo-brutal.your-name.workers.dev`）。
2.  输入您设置的 `AUTH_PASSWORD` 进行登录。
3.  点击 **"新建"** 添加纪念日或订阅。
4.  在设置中配置推送渠道并点击“测试连接”。

### 为什么我的页面加载稍慢？
本项目为了简化部署流程，采用了**浏览器端编译** (Babel Standalone)。这意味着不需要复杂的构建步骤，上传即可运行，但首次加载可能会有轻微延迟，适合个人使用。

## License

MIT
