// @ts-nocheck
export interface Env {
  RENEW_KV: KVNamespace;
  ASSETS: Fetcher; // Cloudflare Assets binding
  AUTH_PASSWORD?: string;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_ID?: string;
  BARK_KEY?: string;
  PUSH_PLUS_TOKEN?: string;
  WEBHOOK_URL?: string;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // 1. Handle CORS Preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    // 2. Handle API Routes (/api/*)
    if (url.pathname.startsWith("/api/")) {
        return handleApiRequest(request, env, url);
    }

    // 3. Serve Static Assets (Frontend) with extension resolution
    try {
        // A. Try fetching exact path first (e.g. index.html, main.css)
        let assetResponse = await env.ASSETS.fetch(request);
        if (assetResponse.ok) return assetResponse;

        // B. If 404 and no extension (e.g. import App from './App'), try adding .tsx or .ts
        // This is crucial for browser-side Babel compilation of source files
        if (assetResponse.status === 404 && !url.pathname.split('/').pop().includes('.')) {
            // Try .tsx
            const tsxUrl = new URL(request.url);
            tsxUrl.pathname += ".tsx";
            const tsxResponse = await env.ASSETS.fetch(tsxUrl);
            if (tsxResponse.ok) return tsxResponse;

            // Try .ts
            const tsUrl = new URL(request.url);
            tsUrl.pathname += ".ts";
            const tsResponse = await env.ASSETS.fetch(tsUrl);
            if (tsResponse.ok) return tsResponse;
        }
        
        // C. SPA Fallback: If still not found and not a file request (e.g. /dashboard), return index.html
        // But avoid doing this for missing JS files to prevent infinite loops of HTML returned as JS
        if (assetResponse.status === 404 && !url.pathname.includes('.')) {
             const indexResponse = await env.ASSETS.fetch(new URL("/", request.url));
             return indexResponse;
        }

        return assetResponse;
    } catch (e) {
        return new Response("Internal Error or Asset Not Found", { status: 500 });
    }
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    await checkAndNotify(env);
  },
};

// --- API Handler ---

async function handleApiRequest(request: Request, env: Env, url: URL): Promise<Response> {
    const authHeader = request.headers.get("Authorization");
    const validPassword = env.AUTH_PASSWORD || 'admin';
    
    // Auth Check for API
    if (!authHeader || authHeader !== `Bearer ${validPassword}`) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json", ...CORS_HEADERS } });
    }

    // GET /api/data
    if (url.pathname.endsWith("/api/data") && request.method === "GET") {
      const events = await env.RENEW_KV.get("events", { type: "json" }) || [];
      const logs = await env.RENEW_KV.get("logs", { type: "json" }) || [];
      const settings = await env.RENEW_KV.get("settings", { type: "json" }) || {};
      return new Response(JSON.stringify({ events, logs, settings }), { headers: { "Content-Type": "application/json", ...CORS_HEADERS } });
    }

    // POST /api/data
    if (url.pathname.endsWith("/api/data") && request.method === "POST") {
      const body = await request.json();
      if (body.events) await env.RENEW_KV.put("events", JSON.stringify(body.events));
      if (body.logs) await env.RENEW_KV.put("logs", JSON.stringify(body.logs));
      if (body.settings) await env.RENEW_KV.put("settings", JSON.stringify(body.settings));
      return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json", ...CORS_HEADERS } });
    }

    // POST /api/trigger
    if (url.pathname.endsWith("/api/trigger") && request.method === "POST") {
      await checkAndNotify(env);
      return new Response(JSON.stringify({ success: true, message: "Triggered" }), { headers: { "Content-Type": "application/json", ...CORS_HEADERS } });
    }

    // POST /api/test-notify
    if (url.pathname.endsWith("/api/test-notify") && request.method === "POST") {
      const body = await request.json();
      const settings = body.settings || {};
      const type = body.type;
      
      try {
          await sendTestNotification(env, settings, type);
          return new Response(JSON.stringify({ success: true, message: `已发送测试消息到 ${type}` }), { headers: { "Content-Type": "application/json", ...CORS_HEADERS } });
      } catch(e) {
          return new Response(JSON.stringify({ success: false, message: "发送失败: " + e.message }), { status: 500, headers: { "Content-Type": "application/json", ...CORS_HEADERS } });
      }
    }

    return new Response("API Not Found", { status: 404, headers: CORS_HEADERS });
}

// --- LOGIC ---

async function checkAndNotify(env: Env) {
  const events: any[] = await env.RENEW_KV.get("events", { type: "json" }) || [];
  const settings: any = await env.RENEW_KV.get("settings", { type: "json" }) || {};
  
  if (!events.length) return;

  const today = new Date();
  const notifications: string[] = [];

  for (const evt of events) {
    const isMatch = checkDateMatch(evt, today);
    if (isMatch) {
      notifications.push(`📅 [Memo-Brutal] 提醒：${evt.name} 即将到来！\n备注：${evt.description || '无'}`);
    }
  }

  if (notifications.length > 0) {
    await sendNotifications(env, settings, notifications.join("\n\n"));
  }
}

function checkDateMatch(evt: any, today: Date): boolean {
    const target = new Date(evt.date);
    const reminderDays = evt.reminderDays || 0;
    
    // Check Date = Today + ReminderDays
    const checkDate = new Date(today);
    checkDate.setDate(today.getDate() + reminderDays);
    
    // Simple logic:
    // If Yearly: Check Month/Day
    if (evt.cycleType === 'YEARLY') {
        return checkDate.getMonth() === target.getMonth() && checkDate.getDate() === target.getDate();
    }
    // If Monthly: Check Day
    if (evt.cycleType === 'MONTHLY') {
        return checkDate.getDate() === target.getDate();
    }
    // If Once: Check Full Date
    if (evt.cycleType === 'ONCE') {
        return checkDate.getFullYear() === target.getFullYear() && 
               checkDate.getMonth() === target.getMonth() && 
               checkDate.getDate() === target.getDate();
    }
    
    return false;
}

async function sendNotifications(env: Env, settings: any, message: string) {
    const telegramBotToken = settings.telegramBotToken || env.TELEGRAM_BOT_TOKEN;
    const telegramChatId = settings.telegramChatId || env.TELEGRAM_CHAT_ID;
    const barkKey = settings.barkKey || env.BARK_KEY;
    const pushPlusToken = settings.pushPlusToken || env.PUSH_PLUS_TOKEN;
    const webhookUrl = settings.webhookUrl || env.WEBHOOK_URL;

    if (telegramBotToken && telegramChatId) {
        await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: telegramChatId, text: message }),
        });
    }
    if (barkKey) {
        await fetch(`https://api.day.app/${barkKey}/${encodeURIComponent(message)}`);
    }
    if (pushPlusToken) {
         await fetch('http://www.pushplus.plus/send', {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ token: pushPlusToken, title: 'Memo-Brutal', content: message })
        });
    }
    if (webhookUrl) {
         await fetch(webhookUrl, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message }),
        });
    }
}

async function sendTestNotification(env: Env, settings: any, type: string) {
    const msg = "🔔 Memo-Brutal 测试消息 / Test Message";
    if (type.includes('telegram')) {
         if (!settings.telegramBotToken || !settings.telegramChatId) throw new Error("缺少 Telegram 配置");
         await fetch(`https://api.telegram.org/bot${settings.telegramBotToken}/sendMessage`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: settings.telegramChatId, text: msg }),
        });
    } else if (type.includes('bark')) {
        if (!settings.barkKey) throw new Error("缺少 Bark Key");
        await fetch(`https://api.day.app/${settings.barkKey}/${encodeURIComponent(msg)}`);
    } else if (type.includes('pushplus')) {
         if (!settings.pushPlusToken) throw new Error("缺少 PushPlus Token");
         await fetch('http://www.pushplus.plus/send', {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ token: settings.pushPlusToken, title: '测试', content: msg })
        });
    } else if (type.includes('webhook')) {
         if (!settings.webhookUrl) throw new Error("缺少 Webhook URL");
         await fetch(settings.webhookUrl, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: msg }),
        });
    } else {
        throw new Error("未知类型");
    }
}