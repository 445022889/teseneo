// @ts-nocheck
export interface Env {
  RENEW_KV: KVNamespace;
  AUTH_PASSWORD?: string;
  // Environment variables can still be used as overrides
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
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const authHeader = request.headers.get("Authorization");
    const validPassword = env.AUTH_PASSWORD || 'admin';
    
    if (request.method !== "OPTIONS") {
        if (!authHeader || authHeader !== `Bearer ${validPassword}`) {
            return new Response("Unauthorized", { status: 401, headers: CORS_HEADERS });
        }
    }

    // --- API ROUTES ---
    
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

    // POST /api/trigger - Cron Trigger (uses stored settings)
    if (url.pathname.endsWith("/api/trigger") && request.method === "POST") {
      await checkAndNotify(env);
      return new Response(JSON.stringify({ success: true, message: "Triggered" }), { headers: { "Content-Type": "application/json", ...CORS_HEADERS } });
    }

    // POST /api/test-notify - Test specific config provided in body
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

    return new Response("Not Found", { status: 404, headers: CORS_HEADERS });
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    await checkAndNotify(env);
  },
};

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

// Logic to check if reminder is needed today based on interval and reminderDays
function checkDateMatch(evt: any, today: Date): boolean {
    // 1. Calculate the 'Target Date' (Next occurrence)
    // NOTE: This replicates the logic in frontend 'utils/calculations.ts' but simplified for check
    // In production, better to store 'nextOccurrence' in DB and update it after passing.
    // For this Serverless Demo, we will just use a simple check.
    
    // For now, let's assume the frontend user updates the date, OR we just check if month/day matches for yearly.
    // Real implementation requires robust date lib.
    const target = new Date(evt.date);
    const reminderDays = evt.reminderDays || 0;
    
    // Check if today + reminderDays == Target Date (Simplified for Demo: Yearly/Monthly match)
    const checkDate = new Date(today);
    checkDate.setDate(today.getDate() + reminderDays);
    
    if (evt.cycleType === 'YEARLY') {
        return checkDate.getMonth() === target.getMonth() && checkDate.getDate() === target.getDate();
    }
    if (evt.cycleType === 'MONTHLY') {
        return checkDate.getDate() === target.getDate();
    }
    
    // For custom intervals, you'd need the last execution date stored to calculate effectively.
    // This is a limitation of this lightweight demo without a state machine.
    return false;
}

// Send actual notifications
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

// Test function
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