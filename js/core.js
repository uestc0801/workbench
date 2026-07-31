/* ═══════════════════════════════════════════════
   核心层:数据存储 / 日期工具 / 提醒调度 / 全局UI / 搜索 / 语音
   ═══════════════════════════════════════════════ */
(function () {
  'use strict';
  const LS_KEY = 'wb.data.v1';

  /* ───────── 默认数据 ───────── */
  function defaults() {
    return {
      settings: {
        name: '', sign: '白羊座', theme: 'auto', bgType: 'gradient', bgColor: '#2a78d6', bgImage: '', cardA: 0.62,
        waterGoal: 2000, readGoalPages: 20, readGoalMin: 30, exerciseGoalMin: 30, englishGoalMin: 30,
        pomodoroFocus: 25, pomodoroBreak: 5, deepThinkDay: 6, englishWords: 20,
        sync: { enabled: false, platform: 'gitee', repo: '', branch: 'main', token: '', intervalMin: 30, lastSync: '', dirty: false },
        ghPages: { owner: '', repo: '', token: '', branch: 'main' },
        reminders: [
          { id: 'r-water', type: 'water', label: '喝水提醒', time: '09:30', enabled: false },
          { id: 'r-read', type: 'read', label: '阅读提醒', time: '21:00', enabled: false },
          { id: 'r-english', type: 'english', label: '英语学习 30 分钟', time: '20:00', enabled: false },
          { id: 'r-exercise', type: 'exercise', label: '运动打卡', time: '19:00', enabled: false },
        ],
      },
      todos: [],
      pomo: {},
      books: [],
      readLog: {},
      water: {},
      exercise: {},
      review: {},
      inspirations: [],
      deepThink: [],
      english: { learn: {}, wordbook: {} },
      archive: {},
    };
  }

  let data = null;
  let saveTimer = null;

  /* ───────── 存储 ───────── */
  /* 修复 mojibake:旧版同步用 btoa(unescape(encodeURIComponent())) 在部分浏览器
     会把 UTF-8 中文污染成多层乱码(实测最多 3 层)。这里是迭代解码 + 修 key。 */
  function hasMojibake(s) {
    // 只有含这些 latin 扩展字符才可能是污染,避免误伤正常英文
    return /[çÃÂæåéç½]/i.test(s);
  }
  function fixOne(s) {
    if (typeof s !== 'string' || !s.length) return s;
    if (!hasMojibake(s)) return s; // 纯英文/无乱码特征直接返回
    let cur = s;
    for (let i = 0; i < 6; i++) {
      let out = null;
      try {
        const bytes = [];
        for (let j = 0; j < cur.length; j++) bytes.push(cur.charCodeAt(j) & 0xff);
        if (typeof TextDecoder !== 'undefined') {
          out = new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(bytes));
        } else {
          out = decodeURIComponent(escape(cur));
        }
      } catch (e) { break; }
      if (out === null || out === cur) break;
      // 修复后含中文字符 -> 认为成功,继续可能还有更深层
      cur = out;
      if (!hasMojibake(cur) && !/[一-鿿]/.test(cur)) { break; } // 不再像乱码且无中文 -> 停(避免把正常英文越解越乱)
      if (!hasMojibake(cur)) break; // 乱码特征消失即停
    }
    return cur;
  }
  function fixKey(k) {
    const f = fixOne(k);
    return f === k ? null : f;
  }
  function fixAllMojibake(obj) {
    if (!obj || typeof obj !== 'object') return;
    // 先修 key(对象键名也可能被污染,如单词本名)
    for (const k of Object.keys(obj)) {
      const newKey = fixKey(k);
      if (newKey !== null && newKey !== k && !(newKey in obj)) {
        obj[newKey] = obj[k];
        delete obj[k];
      }
    }
    for (const k in obj) {
      const v = obj[k];
      if (typeof v === 'string') {
        const fixed = fixOne(v);
        if (fixed !== v) obj[k] = fixed;
      } else if (Array.isArray(v)) {
        for (let i = 0; i < v.length; i++) {
          const item = v[i];
          if (typeof item === 'string') {
            const f = fixOne(item);
            if (f !== item) v[i] = f;
          } else if (item && typeof item === 'object') fixAllMojibake(item);
        }
      } else if (v && typeof v === 'object') fixAllMojibake(v);
    }
  }

  function load() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) { data = JSON.parse(raw); }
    } catch (e) {
      // 数据损坏:先备份损坏内容,避免用户数据直接丢失
      try { localStorage.setItem(LS_KEY + '.corrupt.' + Date.now(), String(raw || '')); } catch (e2) {}
      console.warn('存储读取失败,已备份损坏数据', e);
    }
    if (!data) { data = defaults(); }
    // 补缺失字段(版本升级兼容)
    const d = defaults();
    for (const k in d) if (!(k in data)) data[k] = d[k];
    for (const k in d.settings) if (!(k in data.settings)) data.settings[k] = d.settings[k];
    if (!data.settings.sync) data.settings.sync = defaults().settings.sync;
    if (!data.english.wordbook) data.english.wordbook = {};
    if (!data.english.learn) data.english.learn = {};
    // 自动修复被旧版错误编码污染的中文乱码(mojibake)
    fixAllMojibake(data);
    // 若发生了修复,立即写回,避免每次刷新重复处理
    try {
      const snap = JSON.stringify(data);
      if (snap !== localStorage.getItem(LS_KEY)) localStorage.setItem(LS_KEY, snap);
    } catch (e) {}
    return data;
  }
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { localStorage.setItem(LS_KEY, JSON.stringify(data)); }
      catch (e) { console.warn('存储写入失败', e); }
      if (data.settings.sync && data.settings.sync.enabled) { data.settings.sync.dirty = true; syncSchedulePush(); }
    }, 120);
  }

  /* ═══════════ Git 云存储适配器(Gitee / GitHub 单文件 API) ═══════════
     把整库序列化到远端仓库的 wb-data.json,实现跨设备同步 + 云端备份。
     令牌仅存本浏览器 localStorage。 */
  const SYNC_FILE = 'wb-data.json';
  function syncCfg() { return data.settings.sync || {}; }
  function syncApiBase() {
    const c = syncCfg();
    const [owner, repo] = (c.repo || '').split('/').map(s => s.trim());
    if (!owner || !repo) return null;
    if (c.platform === 'gitee') return { api: 'https://gitee.com/api/v5/repos/' + encodeURIComponent(owner) + '/' + encodeURIComponent(repo) };
    return { api: 'https://api.github.com/repos/' + encodeURIComponent(owner) + '/' + encodeURIComponent(repo) };
  }
  // 分支自适应:Gitee 默认分支常为 master,用户配置可能填 main —— 自动探测仓库默认分支
  let defaultBranchCache = null;
  async function resolveBranch() {
    const base = syncApiBase();
    const c = syncCfg();
    if (defaultBranchCache) return defaultBranchCache;
    if (base) {
      try {
        const r = await fetch(base.api, { headers: { Authorization: 'token ' + c.token } });
        if (r.ok) { const j = await r.json(); if (j.default_branch) { defaultBranchCache = j.default_branch; return defaultBranchCache; } }
      } catch (e) {}
    }
    const configured = (c.branch || '').trim();
    return configured || 'master';
  }
  // 尝试读取远端文件当前 sha(GitHub/Gitee 更新文件都需要)。空仓库/无文件返回 null
  async function fetchFileSha(ref) {
    const base = syncApiBase();
    const c = syncCfg();
    try {
      const r = await fetch(base.api + '/contents/' + SYNC_FILE + '?ref=' + encodeURIComponent(ref),
        { headers: { Authorization: 'token ' + c.token, Accept: 'application/vnd.github.v3+json' } });
      if (r.ok) { const j = await r.json(); return j.sha || null; }
      return null;
    } catch (e) { return null; }
  }
  async function fetchErr(res, tag) {
    let msg = '';
    try { msg = (await res.text()).slice(0, 180); } catch (e) {}
    return new Error(tag + ' HTTP ' + res.status + (msg ? ' · ' + msg : ''));
  }
  // 拉取:读取远端 wb-data.json
  async function syncPull() {
    const base = syncApiBase();
    const c = syncCfg();
    if (!base || !c.token) throw new Error('未配置同步信息');
    const ref = await resolveBranch();
    const url = base.api + '/contents/' + SYNC_FILE + '?ref=' + encodeURIComponent(ref);
    const res = await fetch(url, { headers: { Authorization: 'token ' + c.token, Accept: 'application/vnd.github.v3+json' } });
    if (res.status === 404) return null; // 远端还没有数据
    if (!res.ok) throw await fetchErr(res, '拉取失败');
    const j = await res.json();
    const jsonStr = b64ToUtf8(j.content);
    return JSON.parse(jsonStr);
  }
  /* UTF-8 安全的 base64 编解码:
     btoa/atob 只支持 Latin-1,对中文会乱码;
     改用 TextEncoder/Blob,彻底避免编码问题 */
  function utf8ToB64(str) {
    if (typeof TextEncoder !== 'undefined') {
      const bytes = new TextEncoder().encode(str);
      let bin = '';
      bytes.forEach(b => { bin += String.fromCharCode(b); });
      return btoa(bin);
    }
    return btoa(unescape(encodeURIComponent(str)));
  }
  function b64ToUtf8(b64) {
    const bin = atob(b64);
    if (typeof TextDecoder !== 'undefined') {
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return new TextDecoder().decode(bytes);
    }
    return decodeURIComponent(escape(bin));
  }

  // 推送:分“更新(带 sha)”与“创建(无 sha,空仓库首次)”两种情况,失败自动回退另一方式
  async function syncPush() {
    const base = syncApiBase();
    const c = syncCfg();
    if (!base || !c.token) throw new Error('未配置同步信息');
    const ref = await resolveBranch();
    // 若配置分支与仓库默认分支不同,自动修正
    if (ref && (c.branch || 'main') !== ref) c.branch = ref;
    const content = utf8ToB64(JSON.stringify(data));
    const url = base.api + '/contents/' + SYNC_FILE;
    const message = 'wb sync ' + new Date().toISOString();

    if (c.platform === 'gitee') {
      // 先查当前文件 sha;空仓库时为 null
      let sha = null;
      const cur = await fetch(url + '?ref=' + encodeURIComponent(ref), { headers: { Authorization: 'token ' + c.token, Accept: 'application/vnd.github.v3+json' } });
      if (cur.ok) { try { const cj = await cur.json(); sha = cj.sha || null; } catch (e) {} }
      const H = { 'Content-Type': 'application/json;charset=UTF-8' };
      // 尝试方式1:PUT 更新(需要 sha)。空仓库/无 sha 时 Gitee 会报 "sha is missing" -> 转创建
      if (sha) {
        const r1 = await fetch(url, { method: 'PUT', headers: H, body: JSON.stringify({ access_token: c.token, content, message, branch: ref, sha }) });
        if (r1.ok) { finishPush(); return true; }
      }
      // 尝试方式2:POST 创建文件(空仓库首次提交用,Gitee 支持;带 access_token)
      const r2 = await fetch(url, { method: 'POST', headers: H, body: JSON.stringify({ access_token: c.token, content, message, branch: ref, ...(sha ? { sha } : {}) }) });
      if (r2.ok) { finishPush(); return true; }
      // 方式2 也失败(例如仍要求 sha)则抛带详情的错
      throw await fetchErr(r2, '推送失败');
    } else {
      // GitHub contents API:更新需先取当前文件 sha
      let sha = null;
      const cur = await fetch(url + '?ref=' + encodeURIComponent(ref), { headers: { Authorization: 'token ' + c.token, Accept: 'application/vnd.github.v3+json' } });
      if (cur.ok) { const cj = await cur.json(); sha = cj.sha; }
      const body = JSON.stringify({ message, content, branch: ref, ...(sha ? { sha } : {}) });
      const res = await fetch(url, { method: 'PUT', headers: { Authorization: 'token ' + c.token, 'Content-Type': 'application/json;charset=UTF-8' }, body });
      if (!res.ok) throw await fetchErr(res, '推送失败');
    }
    function finishPush() {
      c.lastSync = new Date().toISOString();
      c.dirty = false;
      saveQuiet();
    }
    return true;
  }
  function saveQuiet() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch (e) {}
  }
  // 测试连接:验证令牌 + 仓库 + 探测默认分支
  async function syncTest() {
    const base = syncApiBase();
    const c = syncCfg();
    if (!base || !c.token) throw new Error('请先填写仓库与令牌');
    const res = await fetch(base.api, { headers: { Authorization: 'token ' + c.token } });
    if (res.status === 401) throw new Error('令牌无效或已过期');
    if (res.status === 404) throw new Error('仓库不存在或令牌无权限,请检查 owner/repo 与令牌权限');
    if (!res.ok) throw await fetchErr(res, '连接失败');
    const j = await res.json();
    const branch = j.default_branch || (c.branch || 'master');
    if (j.private === true) console.log('[同步] 私有仓库 ✓ 默认分支=' + branch);
    return branch;
  }
  /* ═══════════ GitHub Pages 发布(把程序文件推送到 GitHub 仓库) ═══════════
     用户填 GitHub 用户名/仓库名 + PAT(存本地浏览器),
     点击后把当前程序文件(index.html / css/* / js/* / README.md)用 contents API 推上去。 */
  function ghConfig() { if (!data.settings.ghPages) data.settings.ghPages = { owner: '', repo: '', token: '', branch: 'main' }; return data.settings.ghPages; }
  function githubApiBase() {
    const gh = ghConfig();
    const owner = (gh.owner || '').trim(), repo = (gh.repo || '').trim();
    if (!owner || !repo) return null;
    return 'https://api.github.com/repos/' + encodeURIComponent(owner) + '/' + encodeURIComponent(repo);
  }
  // 读取本地程序文件为 base64(相对当前页面 URL)
  async function fileToB64(rel) {
    const res = await fetch(rel);
    if (!res.ok) throw new Error('读取文件失败 ' + rel);
    const buf = await res.arrayBuffer();
    let bin = '';
    new Uint8Array(buf).forEach(b => { bin += String.fromCharCode(b); });
    return btoa(bin);
  }
  // 推送单个文件(带 sha 更新或创建)
  async function ghPutFile(base, gh, path, contentB64) {
    const url = base + '/contents/' + path;
    let sha = null;
    const cur = await fetch(url, { headers: { Authorization: 'token ' + gh.token, Accept: 'application/vnd.github.v3+json' } });
    if (cur.ok) { try { const cj = await cur.json(); sha = cj.sha || null; } catch (e) {} }
    const body = JSON.stringify({ message: 'wb deploy ' + new Date().toISOString(), content: contentB64, branch: gh.branch || 'main', ...(sha ? { sha } : {}) });
    const res = await fetch(url, { method: 'PUT', headers: { Authorization: 'token ' + gh.token, 'Content-Type': 'application/json;charset=UTF-8' }, body });
    if (!res.ok) { let m = ''; try { m = (await res.text()).slice(0, 140); } catch (e) {} throw new Error(path + ' 推送失败 HTTP ' + res.status + (m ? ' · ' + m : '')); }
    return true;
  }
  // 发布全部程序文件到 GitHub Pages 仓库
  async function publishToPages(onProgress) {
    const gh = ghConfig();
    const base = githubApiBase();
    if (!base) throw new Error('请先填写 GitHub 用户名 / 仓库名');
    if (!gh.token) throw new Error('请填写 GitHub 令牌(PAT)');
    const files = ['index.html', 'css/style.css', 'README.md',
      'js/core.js', 'js/charts.js', 'js/lunar.js', 'js/main.js',
      'js/modules/overview.js', 'js/modules/hottopics.js', 'js/modules/calendar.js',
      'js/modules/todo.js', 'js/modules/books.js', 'js/modules/water.js',
      'js/modules/exercise.js', 'js/modules/review.js', 'js/modules/inspiration.js',
      'js/modules/english.js', 'js/modules/settings.js'];
    let ok = 0;
    for (const f of files) {
      try {
        const b64 = await fileToB64(f);
        await ghPutFile(base, gh, f, b64);
        ok++;
        onProgress && onProgress('已上传 ' + f + ' (' + ok + '/' + files.length + ')');
      } catch (e) {
        onProgress && onProgress('失败 ' + f + ': ' + e.message);
        throw e;
      }
    }
    return { ok, total: files.length };
  }
  // 测试 GitHub 连接 + 探测默认分支
  async function ghTest() {
    const gh = ghConfig();
    const base = githubApiBase();
    if (!base) throw new Error('请先填写 GitHub 用户名 / 仓库名');
    if (!gh.token) throw new Error('请填写 GitHub 令牌');
    const res = await fetch(base, { headers: { Authorization: 'token ' + gh.token } });
    if (res.status === 401) throw new Error('令牌无效或已过期');
    if (res.status === 404) throw new Error('仓库不存在,请检查用户名/仓库名');
    if (!res.ok) throw new Error('连接失败 HTTP ' + res.status);
    const j = await res.json();
    const branch = j.default_branch || 'main';
    if (j.private === true) { /* Pages 对私有仓库需手动开启 */ }
    return branch;
  }

  // 自动同步调度
  let syncTimer = null;
  function syncSchedulePush() {
    if (syncTimer) return; // 已有定时,由定时统一处理
    syncTimer = setTimeout(async () => {
      syncTimer = null;
      try { if (syncCfg().enabled && syncCfg().dirty) await syncPush(); }
      catch (e) { /* 失败静默,下次再试 */ }
    }, 8000);
  }
  function syncStart() {
    const c = syncCfg();
    if (!c.enabled || !c.token || !c.repo) return;
    // 启动时先拉取云端数据(以云端为准)
    syncPull().then(remote => {
      if (remote) {
        // 合并策略:以云端为准(简单可靠);本地有而未同步的改动通过 dirty 标记下次推送
        const localDirty = c.dirty;
        data = Object.assign(defaults(), remote, { settings: Object.assign(defaults().settings, remote.settings || {}) });
        // 保留本地令牌与开关配置
        data.settings.sync = c;
        if (!localDirty) c.dirty = false;
        saveQuiet();
        applyTheme && applyTheme();
      }
    }).catch(() => {});
    // 定时自动推送
    const mins = Math.max(10, Math.min(120, Number(c.intervalMin) || 30));
    setInterval(async () => {
      try { if (syncCfg().enabled && syncCfg().dirty) await syncPush(); } catch (e) {}
    }, mins * 60000);
  }
  function exportJSON() { return JSON.stringify(data, null, 2); }
  function importJSON(str) {
    const obj = JSON.parse(str);
    if (!obj || !obj.settings) throw new Error('文件格式不正确');
    data = obj; save(); return data;
  }
  function wipe() { data = defaults(); save(); }

  /* ───────── 日期工具 ───────── */
  const pad = n => String(n).padStart(2, '0');
  function dStr(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function today() { return dStr(new Date()); }
  function todayCN() {
    const d = new Date();
    return d.getFullYear() + ' 年 ' + (d.getMonth() + 1) + ' 月 ' + d.getDate() + ' 日';
  }
  function fromStr(s) { const [y, m, dd] = s.split('-').map(Number); return new Date(y, m - 1, dd); }
  function addDays(s, n) { const d = fromStr(s); d.setDate(d.getDate() + n); return dStr(d); }
  function addDaysDate(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function weekStart(s) { const d = fromStr(s); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return dStr(d); }
  function monthStart(s) { return s.slice(0, 8) + '01'; }
  function daysBetween(a, b) { return Math.round((fromStr(b) - fromStr(a)) / 86400000); }
  function weekDates(s) { const ws = weekStart(s); return Array.from({ length: 7 }, (_, i) => addDays(ws, i)); }
  function diffDaysFromToday(s) { return daysBetween(today(), s); }
  function fmtMin(min) {
    if (min < 60) return min + ' 分钟';
    const h = Math.floor(min / 60), m = min % 60;
    return m ? h + ' 小时 ' + m + ' 分' : h + ' 小时';
  }
  function fmtMl(ml) { return ml >= 1000 ? (ml / 1000).toFixed(1).replace(/\.0$/, '') + ' L' : ml + ' ml'; }
  function zhWeek(s) { return '日一二三四五六'[fromStr(s).getDay()] + '曜日'; }
  const WEEK_CN = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  function weekLabel(s) { return WEEK_CN[fromStr(s).getDay()]; }
  function monthLabel(s) { const d = fromStr(s); return d.getFullYear() + ' 年 ' + (d.getMonth() + 1) + ' 月'; }
  function nowHM() {
    const d = new Date();
    return pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  function clock() {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  }

  /* ───────── 小工具 ───────── */
  let uidSeed = 1;
  function uid(p) { return (p || 'x') + '-' + Date.now().toString(36) + '-' + (uidSeed++); }
  function debounce(fn, ms) { let t; return function () { const a = arguments, c = this; clearTimeout(t); t = setTimeout(() => fn.apply(c, a), ms); }; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function hashStr(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }
  // 确定性伪随机(用于星座/鼓励语)
  function seedRand(seed) {
    let t = (seed || 1) >>> 0;
    return function () { t = (t * 1664525 + 1013904223) >>> 0; return t / 4294967296; };
  }
  function pick(arr, seed) { return arr[Math.floor(seedRand(seed)() * arr.length)]; }
  function shuffle(arr, seed) {
    const a = arr.slice(); const r = seedRand(seed);
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  /* ───────── CSS 变量读取 / 主题 ───────── */
  function cssVar(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
  function cssColor(name) { // 解析 rgb(r g b / a) -> rgba()
    const v = cssVar(name);
    const m = v.match(/^[\s]*([\d.]+)[\s]+([\d.]+)[\s]+([\d.]+)(?:\s*\/\s*([\d.]+))?/);
    if (m) return 'rgba(' + m[1] + ',' + m[2] + ',' + m[3] + ',' + (m[4] ?? 1) + ')';
    return v;
  }
  function applyTheme() {
    const s = data.settings;
    let mode = s.theme;
    if (mode === 'auto') mode = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', mode);
    // 背景
    document.body.setAttribute('data-bg', s.bgType || 'gradient');
    if (s.bgType === 'solid') document.body.style.setProperty('--bg-1', s.bgColor);
    if (s.bgType === 'image') document.body.style.setProperty('--bg-img', s.bgImage ? 'url(' + s.bgImage + ')' : 'none');
    document.documentElement.style.setProperty('--card-a', clamp(s.cardA, 0.3, 0.95));
    // 同步分段控件
    document.querySelectorAll('#themeSeg [data-theme]').forEach(b => b.classList.toggle('active', b.dataset.theme === s.theme));
  }
  function setTheme(t) { data.settings.theme = t; save(); applyTheme(); }
  function themeMode() { return document.documentElement.getAttribute('data-theme'); }

  /* ───────── Toast ───────── */
  function toast(msg, type) {
    const wrap = document.getElementById('toastWrap');
    const el = document.createElement('div');
    el.className = 'toast ' + (type || 'ok');
    const ic = type === 'err' ? 'M12 4 4 20h16z M12 10v4 M12 16.5v.2'
      : type === 'warn' ? 'M12 3 2.5 19.5h19L12 3z M12 9v4.5 M12 16.5v.2'
        : 'M4 12.5l5 5L20 7';
    el.innerHTML = '<svg viewBox="0 0 24 24" class="ic"><path d="' + ic + '"/></svg><span>' + esc(msg) + '</span>';
    wrap.appendChild(el);
    setTimeout(() => { el.classList.add('hide'); setTimeout(() => el.remove(), 320); }, 2400);
  }

  /* ───────── Modal ───────── */
  function openModal(html) {
    const mask = document.getElementById('modalMask');
    const box = document.getElementById('modalBox');
    box.innerHTML = html;
    mask.hidden = false;
    const first = box.querySelector('input,textarea,select,button');
    if (first) setTimeout(() => first.focus(), 60);
    return box;
  }
  function closeModal() { document.getElementById('modalMask').hidden = true; document.getElementById('modalBox').innerHTML = ''; }
  document.addEventListener('DOMContentLoaded', () => {
    const mask = document.getElementById('modalMask');
    mask.addEventListener('click', e => { if (e.target === mask) closeModal(); });
    document.getElementById('confirmMask').addEventListener('click', e => { if (e.target.id === 'confirmMask') closeConfirm(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeModal(); closeConfirm(); } });
  });
  // 表单辅助:将 .field 序列化为对象
  function readForm(root) {
    const o = {};
    root.querySelectorAll('[data-field]').forEach(el => {
      let v = el.value;
      if (el.type === 'checkbox') v = el.checked;
      if (el.type === 'number') v = Number(v) || 0;
      o[el.dataset.field] = v;
    });
    return o;
  }

  /* ───────── Confirm ───────── */
  let confirmCb = null;
  function confirmBox(msg, cb) {
    const box = document.getElementById('confirmBox');
    box.innerHTML = '<div class="msg">' + esc(msg) + '</div><div class="btns">'
      + '<button class="btn" id="cfNo">取消</button><button class="btn primary" id="cfYes">确定</button></div>';
    document.getElementById('confirmMask').hidden = false;
    confirmCb = cb;
  }
  function closeConfirm() { document.getElementById('confirmMask').hidden = true; confirmCb = null; }
  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('confirmBox').addEventListener('click', e => {
      if (e.target.id === 'cfYes' && confirmCb) { const cb = confirmCb; closeConfirm(); cb(true); }
      else if (e.target.id === 'cfNo') { const cb = confirmCb; closeConfirm(); cb && cb(false); }
    });
  });

  /* ───────── 番茄专注模式 ───────── */
  let focusMode = false;
  const pendingNotices = [];
  function isFocus() { return focusMode; }
  function setFocus(v) { focusMode = v; if (!v && pendingNotices.length) { pendingNotices.splice(0).forEach(n => fireNotice(n)); } }

  /* ───────── 提醒调度 ───────── */
  let reminderTimer = null;
  let firedToday = {};
  const FIRED_KEY = 'wb.fired.' + today();
  function loadFired() {
    try { firedToday = JSON.parse(localStorage.getItem(FIRED_KEY)) || {}; }
    catch (e) { firedToday = {}; }
  }
  function requestNotify() {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') Notification.requestPermission();
  }
  function fireNotice(r) {
    if (focusMode) { pendingNotices.push(r); return; }
    const msg = r.label || r.text || '提醒';
    toast(msg, 'warn');
    if ('Notification' in window && Notification.permission === 'granted') {
      try { new Notification('工作台提醒', { body: msg, tag: r.id }); } catch (e) {}
    }
  }
  function scanReminders() {
    const now = nowHM();
    const s = data.settings;
    const list = (s.reminders || []).concat(
      { id: 'r-deep', type: 'deep', label: '本周深度思考时间到啦,去灵感库汇总一下吧', time: '20:30', enabled: true, onlyWeekday: s.deepThinkDay }
    );
    for (const r of list) {
      if (!r.enabled) continue;
      if (r.onlyWeekday != null && new Date().getDay() !== r.onlyWeekday) continue;
      if (r.time !== now) continue;
      if (firedToday[r.id]) continue;
      firedToday[r.id] = 1;
      try { localStorage.setItem(FIRED_KEY, JSON.stringify(firedToday)); } catch (e) {}
      fireNotice(r);
    }
  }
  function startReminders() {
    loadFired();
    // 跨天重置
    setInterval(() => {
      const k = 'wb.fired.' + today();
      if (k !== FIRED_KEY) { location.reload(); }
    }, 60000);
    scanReminders();
    reminderTimer = setInterval(scanReminders, 30000);
  }

  /* ───────── 每日归档 ───────── */
  function archiveYesterday() {
    const y = addDays(today(), -1);
    if (data.archive[y]) return;
    const log = data.english.learn[y] || {};
    const done = (data.todos || []).filter(t => t.done && t.doneAt && t.doneAt.slice(0, 10) === y).length;
    const all = (data.todos || []).filter(t => t.doneAt && t.doneAt.slice(0, 10) === y).length || done;
    data.archive[y] = {
      todoDone: done, todoAll: all,
      water: data.water[y] || 0,
      readMin: (data.readLog[y] || {}).min || 0, readPages: (data.readLog[y] || {}).pages || 0,
      focusMin: (data.english.learn[y] && (log.wordsMin || 0)) + (log.speakMin || 0),
      exerciseMin: (data.exercise[y] || {}).min || 0,
      review: data.review[y] ? 1 : 0,
    };
    save();
  }

  /* ───────── 全局搜索 ───────── */
  function searchAll(q) {
    q = (q || '').trim().toLowerCase();
    if (!q) return [];
    const out = [];
    const push = (kind, title, sub, route, key) => {
      const low = title.toLowerCase();
      const idx = low.indexOf(q);
      if (idx < 0 && !(sub || '').toLowerCase().includes(q)) return;
      out.push({ kind, title, sub, route, key });
    };
    (data.todos || []).forEach(t => push('待办', t.text, (t.tag || '') + ' · ' + (t.due || ''), 'todo', t.id));
    (data.books || []).forEach(b => push('书籍', b.title, b.author + ' · ' + (b.status === 'reading' ? '阅读中' : '想读'), 'books', b.id));
    (data.inspirations || []).forEach(i => push('灵感', (i.text || i.urlTitle || '').slice(0, 40), i.category, 'inspiration', i.id));
    Object.keys(data.review || {}).forEach(d => {
      const r = data.review[d];
      ['q1', 'q2', 'q3'].forEach(k => { if (r[k]) push('复盘', (r[k] || '').slice(0, 40), d, 'review', d + '-' + k); });
    });
    (data.deepThink || []).forEach(t => push('深度思考', (t.note || '').slice(0, 40), t.date, 'inspiration', t.id));
    Object.keys(data.english.wordbook || {}).forEach(bn => {
      (data.english.wordbook[bn] || []).forEach(w => push('单词·' + bn, w.word, w.mean, 'english', w.id));
    });
    Object.keys(data.readLog || {}).forEach(d => {
      const r = data.readLog[d];
      if (r.note && r.note.trim()) push('摘抄', d, r.note.slice(0, 60), 'books', d);
    });
    return out.slice(0, 14);
  }
  function bindSearch() {
    const input = document.getElementById('globalSearchInput');
    const pop = document.getElementById('searchPop');
    if (!input) return;
    const render = debounce(() => {
      const res = searchAll(input.value);
      if (!input.value.trim()) { pop.classList.remove('show'); return; }
      if (!res.length) {
        pop.innerHTML = '<div class="s-item" style="color:var(--ink-3)">无匹配结果</div>';
      } else {
        const group = {};
        res.forEach(r => { (group[r.kind] = group[r.kind] || []).push(r); });
        pop.innerHTML = Object.keys(group).map(k =>
          '<div class="s-group">' + k + '</div>' +
          group[k].map(r => '<div class="s-item" data-route="' + r.route + '" data-key="' + r.key + '">'
            + '<span class="kind">' + k.split('·')[0] + '</span>'
            + '<span class="grow">' + esc(r.title) + '<div class="small">' + esc(r.sub || '') + '</div></span></div>'
          ).join('')).join('');
      }
      pop.classList.add('show');
      pop.querySelectorAll('.s-item[data-route]').forEach(el => {
        el.addEventListener('click', () => {
          pop.classList.remove('show');
          input.value = '';
          WB.nav(el.dataset.route);
          setTimeout(() => WB.scrollToItem(el.dataset.key), 260);
        });
      });
    }, 160);
    input.addEventListener('input', render);
    input.addEventListener('focus', render);
    document.addEventListener('click', e => {
      // 点击输入控件(及它们在的 .field 容器)时不关闭搜索下拉,避免手机端抢焦点导致键盘收起
      if (e.target.closest('.searchbox')) return;
      if (e.target.closest('input, textarea, select, .field')) return;
      pop.classList.remove('show');
    });
  }

  /* ───────── 语音(转写 / 合成) ───────── */
  let recognizer = null;
  function srSupported() { return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window; }
  function srStart(onResult, onEnd) {
    if (!srSupported()) { onEnd && onEnd(false); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognizer = new SR();
    recognizer.lang = 'zh-CN';
    recognizer.interimResults = false;
    recognizer.onresult = e => onResult(e.results[0][0].transcript);
    recognizer.onerror = () => onEnd && onEnd(false);
    recognizer.onend = () => onEnd && onEnd(true);
    try { recognizer.start(); } catch (e) { onEnd && onEnd(false); }
  }
  function srStop() { if (recognizer) try { recognizer.stop(); } catch (e) {} }

  /* 语音合成:兼容小米自带浏览器 / Chrome
     - 需在用户手势(点击)内首次调用才能出声
     - 中文强制 zh-CN、英文 en-US;设置 rate/pitch/volume
     - 小米等浏览器 voices 可能加载慢,等待 voiceschanged 再朗读 */
  let voicesReady = false;
  function ensureVoices(cb) {
    if (!('speechSynthesis' in window)) { cb && cb(); return; }
    if (speechSynthesis.getVoices && speechSynthesis.getVoices().length) { voicesReady = true; cb && cb(); return; }
    let done = false;
    const onCh = () => { if (done) return; done = true; voicesReady = true; speechSynthesis.removeEventListener('voiceschanged', onCh); cb && cb(); };
    if (speechSynthesis.addEventListener) speechSynthesis.addEventListener('voiceschanged', onCh);
    setTimeout(onCh, 800); // 兜底:即使浏览器不触发 voiceschanged 也继续
  }
  function speak(text, lang) {
    if (!('speechSynthesis' in window)) { WB.toast && WB.toast('当前浏览器不支持语音朗读', 'warn'); return; }
    const doSpeak = () => {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(String(text));
      u.lang = lang || 'zh-CN';
      u.rate = 0.92;
      u.pitch = 1;
      u.volume = 1;
      // 尝试匹配系统可用语音,避免"静音"
      const voices = speechSynthesis.getVoices ? speechSynthesis.getVoices() : [];
      if (voices.length) {
        const want = lang === 'en-US' ? ['en-US', 'en'] : ['zh-CN', 'zh', 'cmn'];
        const v = voices.find(v => want.some(p => (v.lang || '').toLowerCase().startsWith(p) && !/es|fr|de|ja/i.test(v.lang || '')))
          || voices.find(v => (v.lang || '').toLowerCase().startsWith(want[0]))
          || voices.find(v => v.default);
        if (v) u.voice = v;
      }
      speechSynthesis.speak(u);
    };
    // 首次调用在用户手势内,直接读;否则先确保 voices 就绪再读
    if (!voicesReady) ensureVoices(doSpeak);
    else doSpeak();
  }
  function speakEn(text) { speak(text, 'en-US'); }

  /* ───────── 导航辅助 ───────── */
  function nav(route) {
    const pages = document.querySelectorAll('.page');
    pages.forEach(p => p.classList.toggle('active', p.dataset.page === route));
    document.querySelectorAll('.navitem').forEach(n => n.classList.toggle('active', n.dataset.route === route));
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.route === route));
    window.scrollTo({ top: 0 });
    const sub = document.getElementById('overviewSub');
    if (route === 'overview' && sub) { sub.classList.remove('hide'); document.getElementById('hotSub')?.classList.add('hide'); }
    WB.renderCurrent(route);
  }
  let scrollCache = {};
  function scrollToItem(key) {
    if (!key) return;
    const el = document.querySelector('[data-skey="' + key + '"]');
    if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  /* ───────── 日期累计工具 ───────── */
  function rangeSum(map, from, to) {
    let sum = 0;
    for (let d = from; d <= to; d = addDays(d, 1)) { sum += (map[d] || 0); }
    return sum;
  }

  /* ───────── 模块注册 ───────── */
  const modules = {};
  const rendered = {};
  function register(name, fn) { modules[name] = fn; }
  function renderCurrent(route) {
    const el = document.querySelector('.page[data-page="' + route + '"]');
    if (!el) return;
    if (rendered[route]) { modules[route] && modules[route].refresh && modules[route].refresh(el); }
    else { rendered[route] = true; modules[route] && modules[route].render(el); }
  }
  function forceRender(route) { rendered[route] = false; const el = document.querySelector('.page[data-page="' + route + '"]'); if (el) renderCurrent(route); }
  function rerenderCurrent() { renderCurrent(currentRoute()); }
  function currentRoute() {
    return document.querySelector('.page.active')?.dataset.page || 'overview';
  }
  function refreshOthers() { Object.keys(rendered).forEach(k => { rendered[k] = false; }); }

  /* ───────── 暴露 ───────── */
  window.WB = {
    get data() { return data; },
    save, load, defaults, exportJSON, importJSON, wipe,
    syncPull, syncPush, syncTest, syncStart, syncCfg,
    publishToPages, ghTest,
    dStr, today, todayCN, fromStr, addDays, addDaysDate, weekStart, monthStart, daysBetween, weekDates,
    diffDaysFromToday, fmtMin, fmtMl, zhWeek, weekLabel, monthLabel, nowHM, clock, WEEK_CN,
    uid, debounce, clamp, esc, hashStr, seedRand, pick, shuffle,
    cssVar, cssColor, applyTheme, setTheme, themeMode,
    toast, openModal, closeModal, readForm, confirmBox,
    isFocus, setFocus, requestNotify,
    startReminders, scanReminders, archiveYesterday,
    searchAll, bindSearch,
    srSupported, srStart, srStop, speak, speakEn,
    nav, scrollToItem, register, renderCurrent, forceRender, rerenderCurrent, refreshOthers,
    rangeSum,
  };
})();
