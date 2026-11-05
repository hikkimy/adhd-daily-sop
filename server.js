const express = require('express');
const webpush = require('web-push');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });
const VAPID_FILE = path.join(DATA_DIR, 'vapid.json');
const SUBS_FILE = path.join(DATA_DIR, 'subs.json');
const SCHED_FILE = path.join(DATA_DIR, 'sched.json');

// --- VAPID 密钥（优先用环境变量，稳定；否则首次启动生成并持久化）---
let vapidKeys;
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  vapidKeys = { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY };
} else if (fs.existsSync(VAPID_FILE)) {
  vapidKeys = JSON.parse(fs.readFileSync(VAPID_FILE));
} else {
  vapidKeys = webpush.generateVAPIDKeys();
  fs.writeFileSync(VAPID_FILE, JSON.stringify(vapidKeys));
}
webpush.setVapidDetails(
  'mailto:adhd-sop@example.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

// --- 持久化读写 ---
const load = (f, def) => { try { return JSON.parse(fs.readFileSync(f)); } catch { return def; } };
const save = (f, d) => fs.writeFileSync(f, JSON.stringify(d, null, 2));

let subscriptions = load(SUBS_FILE, []);   // 所有推送订阅（用于清理失效订阅）
let scheduled = load(SCHED_FILE, []);       // 待发送提醒 [{id, fireAt, title, body, subscription}]

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/vapid-public-key', (req, res) => res.json({ publicKey: vapidKeys.publicKey }));

app.post('/api/subscribe', (req, res) => {
  const sub = req.body;
  if (!sub || !sub.endpoint) return res.status(400).json({ ok: false });
  if (!subscriptions.find(s => s.endpoint === sub.endpoint)) subscriptions.push(sub);
  save(SUBS_FILE, subscriptions);
  res.json({ ok: true });
});

app.post('/api/schedule', (req, res) => {
  const { subscription, minutes, title, body } = req.body || {};
  if (!subscription || !minutes) return res.status(400).json({ ok: false });
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const fireAt = Date.now() + Math.max(1, Number(minutes)) * 60 * 1000;
  scheduled.push({ id, fireAt, title: title || '⏰ 回主线提醒', body: body || '该回到今日 SOP 了', subscription });
  save(SCHED_FILE, scheduled);
  res.json({ ok: true, id, fireAt });
});

app.post('/api/cancel', (req, res) => {
  const { id } = req.body || {};
  if (id) scheduled = scheduled.filter(s => s.id !== id);
  save(SCHED_FILE, scheduled);
  res.json({ ok: true });
});

// --- 到点发送（每 10 秒检查一次；重启后补发过期未发的）---
async function sendPush(sub, payload) {
  try {
    await webpush.sendNotification(sub, JSON.stringify(payload));
  } catch (e) {
    if (e.statusCode === 404 || e.statusCode === 410) {
      subscriptions = subscriptions.filter(s => s.endpoint !== sub.endpoint);
      save(SUBS_FILE, subscriptions);
    }
  }
}
setInterval(() => {
  const now = Date.now();
  const due = scheduled.filter(s => s.fireAt <= now);
  if (!due.length) return;
  scheduled = scheduled.filter(s => s.fireAt > now);
  save(SCHED_FILE, scheduled);
  for (const d of due) sendPush(d.subscription, { title: d.title, body: d.body });
}, 10 * 1000);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`ADHD SOP 服务已启动: http://localhost:${PORT}`));
