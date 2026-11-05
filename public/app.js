/* ============ 每日 SOP 数据（来自「每日sop3.0.xls」，内置） ============ */
const STEPS = [
  { loc: '卧室', text: '转小猫 🐱' },
  { loc: '卧室', text: '自然醒、睁眼、戴眼镜、坐起来喝水、拉窗帘' },
  { loc: '卧室', text: '收拾床上东西、卧室复原' },
  { loc: '卧室', text: '拿工具盒、水杯去客厅' },
  { loc: '客厅', text: '工具盒、水杯放电脑桌' },
  { loc: '客厅', text: '烧水' },
  { loc: '客厅', text: '拿笔去厕所' },
  { loc: '厕所', text: '转小猫 🐱' },
  { loc: '厕所', text: '计时10分钟：拉屎、写 todo、想当天吃啥、当天日程' },
  { loc: '厕所', text: '写 todo：（记一下今天要做的）' },
  { loc: '厕所', text: '写当日菜谱：（记一下今天吃啥）' },
  { loc: '厕所', text: '称体重，今日体重：___' },
  { loc: '厕所', text: '洗脸刷牙' },
  {
    loc: '客厅', text: '换衣服', branch: [
      { label: '不出门', steps: [{ loc: '客厅', text: '锻炼\n转小猫 🐱\n洗澡' }] },
      {
        label: '出门', steps: [
          { loc: '客厅', text: '倒垃圾' },
          { loc: '客厅', text: '锻炼 / 购物' },
          { loc: '客厅', text: '拆快递、东西放门口' },
          { loc: '厕所', text: '洗手、洗鼻、漱口、冲澡' },
          { loc: '客厅', text: '归整东西' },
        ]
      },
    ]
  },
  { loc: '厨房', text: '做早饭（牛奶+燕麦 / 酸奶+煎蛋 / 别的肉类 / 蔬菜）' },
  { loc: '客厅', text: '吃早饭（定时30分钟）\n到点起来收拾，午饭预备，定时煮饭' },
  { loc: '厕所', text: '刷牙、收拾卫生间' },
  { loc: '自由活动', text: '09:00-10:00 自由活动 / 转小猫 🐱' },
  { loc: '自由活动', text: '10:00-11:00 自由活动' },
  { loc: '自由活动', text: '11:00-12:00 打扫卫生' },
  { loc: '喝水', text: '第1杯，第2杯，洗衣服，第3杯' },
  { loc: '厨房', text: '做午饭' },
  { loc: '客厅', text: '吃午饭（定时30分钟）\n洗碗，晚饭预备，清冰箱，倒垃圾' },
  { loc: '厕所', text: '刷牙' },
  { loc: '卧室', text: '午睡半小时' },
  { loc: '自由活动', text: '14:00-15:00 自由活动 / 转小猫 🐱' },
  { loc: '自由活动', text: '15:00-16:00 自由活动' },
  { loc: '自由活动', text: '16:00-17:00 自由活动' },
  { loc: '客厅', text: '吃晚饭（定时30分钟）' },
  { loc: '厨房', text: '洗碗，收垃圾（厨房、厕所、化妆桌、电脑桌、卧室），洗衣' },
  { loc: '下楼', text: '倒垃圾，遛弯？' },
  { loc: '下楼', text: '拿快递，拆，洗手，收拾好' },
  { loc: '自由活动', text: '19:00-20:00 自由活动 / 转小猫 🐱' },
  { loc: '自由活动', text: '20:00-21:00 自由活动' },
  { loc: '厕所', text: '21:00 刷牙、洗脸、冲澡、身体乳、护肤、面膜' },
  { loc: '巡逻', text: '巡逻复原（完毕转猫 🐱）：厕所、化妆桌、电脑桌、厨房' },
  { loc: '卧室', text: '保温杯热水放床头、小阳光、看书' },
  { loc: '卧室', text: '23:00 睡觉 💤' },
];

/* ============ 状态 ============ */
let current = 0;
let subscription = null;
let voiceOn = localStorage.getItem('sop_voice') === '1';
const activeReminders = new Map(); // id -> {min, timer}

/* ============ DOM ============ */
const $ = (id) => document.getElementById(id);
const startScreen = $('start'), guideScreen = $('guide');
const locBadge = $('locBadge'), stepText = $('stepText'), branchBox = $('branch');
const progressEl = $('progress'), voiceBtn = $('voiceBtn');
const remindersEl = $('reminders'), toastEl = $('toast');

/* ============ 语音 ============ */
function speak(text) {
  if (!voiceOn || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/\n/g, '，').replace(/[🐱💤]/g, ''));
    u.lang = 'zh-CN'; u.rate = 0.95;
    window.speechSynthesis.speak(u);
  } catch (_) {}
}
function updateVoiceBtn() {
  voiceBtn.textContent = voiceOn ? '🔊' : '🔇';
}
voiceBtn.addEventListener('click', () => {
  voiceOn = !voiceOn;
  localStorage.setItem('sop_voice', voiceOn ? '1' : '0');
  updateVoiceBtn();
  if (voiceOn) speak('语音已开启');
});

/* ============ 渲染 ============ */
function render() {
  const step = STEPS[current];
  if (!step) { finish(); return; }
  locBadge.textContent = step.loc;
  stepText.textContent = step.text;
  progressEl.textContent = `第 ${current + 1} / ${STEPS.length} 步`;

  if (step.branch) {
    branchBox.classList.remove('hidden');
    branchBox.innerHTML = '';
    step.branch.forEach((opt) => {
      const b = document.createElement('button');
      b.textContent = opt.label;
      b.addEventListener('click', () => {
        STEPS.splice(current, 1, ...opt.steps); // 用所选分支替换当前步
        render();
        speak(stepText.textContent);
      });
      branchBox.appendChild(b);
    });
    $('nextBtn').classList.add('hidden');
  } else {
    branchBox.classList.add('hidden');
    branchBox.innerHTML = '';
    $('nextBtn').classList.remove('hidden');
    speak(step.text);
  }
}

function finish() {
  startScreen.classList.add('hidden');
  guideScreen.classList.remove('hidden');
  locBadge.textContent = '完成';
  stepText.textContent = '今天的 SOP 全部完成 🎉\n好好休息，转小猫 🐱';
  branchBox.classList.add('hidden');
  $('nextBtn').classList.add('hidden');
  $('timerRow') && ($('timerRow').style.display = 'none');
  speak('今天的任务全部完成，辛苦了');
}

$('nextBtn').addEventListener('click', () => {
  current++;
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

/* ============ 提醒：原生本地通知（Capacitor）为主，网页兜底 ============ */
const isNative = !!(window.Capacitor && Capacitor.isPluginAvailable && Capacitor.isPluginAvailable('LocalNotifications'));
const LN = isNative ? Capacitor.Plugins.LocalNotifications : null;

async function ensureNotifyPermission() {
  if (!LN) return true; // 网页走浏览器 Notification API
  try {
    let p = await LN.checkPermissions();
    if (p.display !== 'granted') p = await LN.requestPermissions();
    return p.display === 'granted';
  } catch (e) { return false; }
}

async function setReminder(minutes) {
  const next = STEPS[current + 1];
  const body = next ? `该回主线了 👉 ${next.text.replace(/\n/g, ' ')}` : '该回到今日 SOP 了';
  if (LN) {
    // 原生：在手机系统层排精确闹钟，关掉 App / 锁屏也会响（不依赖 FCM）
    const ok = await ensureNotifyPermission();
    if (!ok) toast('未授权通知，提醒可能不响');
    const id = Math.floor(Math.random() * 1e9);
    await LN.schedule({
      notifications: [{
        id,
        title: '⏰ 回主线提醒',
        body,
        schedule: { at: new Date(Date.now() + minutes * 60000), allowWhileIdle: true, exact: true },
      }],
    });
    activeReminders.set(String(id), { min: minutes });
    renderReminders();
    toast(`已设定 ${minutes} 分钟提醒：回到主线`);
  } else {
    // 网页兜底：需保持页面打开（无服务端时只能如此）
    if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
    const id = 'w' + Date.now();
    const timer = setTimeout(() => {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('⏰ 回主线提醒', { body });
      } else { toast(body); }
      activeReminders.delete(id);
      renderReminders();
    }, minutes * 60000);
    activeReminders.set(id, { min: minutes, timer });
    renderReminders();
    toast(`已设定 ${minutes} 分钟提醒（网页版需保持页面打开）`);
  }
}

async function cancelReminder(id) {
  if (LN) {
    try { await LN.cancel({ notifications: [{ id: Number(id) }] }); } catch (e) {}
  } else {
    const r = activeReminders.get(id);
    if (r && r.timer) clearTimeout(r.timer);
  }
  activeReminders.delete(id);
  renderReminders();
}

function renderReminders() {
  remindersEl.innerHTML = '';
  for (const [id, { min }] of activeReminders) {
    const row = document.createElement('div');
    row.className = 'reminder';
    row.innerHTML = `<span>⏱ ${min} 分钟后提醒回主线</span>`;
    const btn = document.createElement('button');
    btn.textContent = '取消';
    btn.addEventListener('click', () => cancelReminder(id));
    row.appendChild(btn);
    remindersEl.appendChild(row);
  }
}

document.querySelectorAll('.chip[data-min]').forEach((b) => {
  b.addEventListener('click', () => setReminder(Number(b.dataset.min)));
});
$('customBtn').addEventListener('click', () => {
  const v = parseInt($('customMin').value, 10);
  if (v > 0) setReminder(v);
});

/* ============ 吐司 ============ */
let toastTimer;
function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.add('hidden'), 2500);
}

/* ============ 启动 ============ */
$('today').textContent = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
updateVoiceBtn();
const startHint = document.querySelector('#start .hint');
if (startHint) startHint.textContent = isNative
  ? '这是已安装的 App，关掉也能准时收到提醒。'
  : '提示：手机 Chrome 打开后点 ⋮ →「安装应用」，才能切后台收到提醒。';

$('startBtn').addEventListener('click', () => {
  startScreen.classList.add('hidden');
  guideScreen.classList.remove('hidden');
  render();
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
