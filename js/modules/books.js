/* ═══════════════════════════════════════════════
   我的书架:阅读/想读双分类 + 进度可视化 + 摘抄感悟归档搜索
   + 每日阅读记录 + 跨模块:摘抄选中文字存生词本
   ═══════════════════════════════════════════════ */
(function () {
  'use strict';

  let tab = 'reading';
  let curId = null;
  let quoteQuery = '';

  function curBook(d) {
    const reading = d.books.filter(b => b.status === 'reading');
    if (!reading.length) return null;
    const cur = reading.find(b => b.id === curId) || reading[0];
    curId = cur.id;
    return cur;
  }
  function totalReadMin() {
    return Object.values(WB.data.readLog || {}).reduce((s, r) => s + (r.min || 0), 0);
  }
  function bookMin(id) {
    return Object.values(WB.data.readLog || {}).reduce((s, r) => s + (r.bookId === id ? (r.min || 0) : 0), 0);
  }

  function openBookModal(b) {
    b = b || {};
    const html = '<h4>' + (b.id ? '编辑书籍' : '添加书籍') + '</h4>'
      + '<div class="field"><label>书名</label><input class="input" data-field="title" value="' + WB.esc(b.title || '') + '" placeholder="书名"></div>'
      + '<div class="field"><label>作者</label><input class="input" data-field="author" value="' + WB.esc(b.author || '') + '" placeholder="作者"></div>'
      + '<div class="form-row">'
      + '<div class="field"><label>总页数</label><input class="input" type="number" data-field="totalPages" value="' + (b.totalPages || '') + '" min="1"></div>'
      + '<div class="field"><label>已读页数</label><input class="input" type="number" data-field="readPages" value="' + (b.readPages || 0) + '" min="0"></div></div>'
      + '<div class="field"><label>分类</label><div class="seg" id="bkStatus">'
      + '<button data-v="reading" class="' + (b.status !== 'want' ? 'active' : '') + '">正在阅读</button>'
      + '<button data-v="want" class="' + (b.status === 'want' ? 'active' : '') + '">想读清单</button></div></div>'
      + (b.id ? '<div class="m-actions" style="justify-content:space-between"><button class="btn danger" id="mDel">删除</button>'
        + '<div class="row" style="gap:10px"><button class="btn" id="mCancel">取消</button><button class="btn primary" id="mOk">保存</button></div></div>'
        : '<div class="m-actions"><button class="btn" id="mCancel">取消</button><button class="btn primary" id="mOk">添加</button></div>');
    const box = WB.openModal(html);
    let status = b.status === 'want' ? 'want' : 'reading';
    box.querySelectorAll('#bkStatus button').forEach(bt => bt.addEventListener('click', () => {
      status = bt.dataset.v;
      box.querySelectorAll('#bkStatus button').forEach(x => x.classList.toggle('active', x === bt));
    }));
    box.querySelector('#mCancel').addEventListener('click', WB.closeModal);
    box.querySelector('#mDel') && box.querySelector('#mDel').addEventListener('click', () => {
      WB.confirmBox('确定删除这本书及其记录?', ok => {
        if (!ok) return;
        WB.data.books = WB.data.books.filter(x => x.id !== b.id);
        WB.save(); WB.closeModal(); WB.forceRender('books');
      });
    });
    box.querySelector('#mOk').addEventListener('click', () => {
      const f = WB.readForm(box);
      if (!f.title.trim()) return WB.toast('请输入书名', 'warn');
      if (b.id) Object.assign(b, { title: f.title.trim(), author: f.author, totalPages: f.totalPages, readPages: f.readPages, status });
      else WB.data.books.push({ id: WB.uid('bk'), title: f.title.trim(), author: f.author, totalPages: f.totalPages, readPages: f.readPages, status, createdAt: WB.today() });
      WB.save(); WB.closeModal(); WB.toast('已保存 ✓', 'ok'); WB.forceRender('books');
    });
  }

  /* 今日阅读打卡 */
  function openReadLog() {
    const d = WB.data, t = WB.today();
    const cur = curBook(d);
    const today = d.readLog[t] || {};
    const html = '<h4>今日阅读打卡</h4>'
      + (cur ? '<div class="small mb12">当前书籍:『' + WB.esc(cur.title) + '』</div>' : '<div class="small mb12">书架暂无阅读中的书,先去添加吧</div>')
      + '<div class="form-row">'
      + '<div class="field"><label>今日阅读页数</label><input class="input" type="number" data-field="pages" value="' + (today.pages || 0) + '" min="0"></div>'
      + '<div class="field"><label>今日阅读分钟</label><input class="input" type="number" data-field="min" value="' + (today.min || 0) + '" min="0"></div></div>'
      + '<div class="m-actions"><button class="btn" id="mCancel">取消</button><button class="btn primary" id="mOk">保存</button></div>';
    const box = WB.openModal(html);
    box.querySelector('#mCancel').addEventListener('click', WB.closeModal);
    box.querySelector('#mOk').addEventListener('click', () => {
      const f = WB.readForm(box);
      if (!cur) { WB.closeModal(); return WB.toast('请先在书架添加书籍', 'warn'); }
      const prev = (d.readLog[t] || {}).min || 0;
      d.readLog[t] = { min: f.min, pages: f.pages, bookId: cur.id, quotes: (d.readLog[t] || {}).quotes || [], note: (d.readLog[t] || {}).note || '' };
      // 累计页数计入书籍
      cur.readPages = Math.min(cur.totalPages || f.pages, (cur.readPages || 0) + (f.pages - (today.pages || 0)));
      WB.save(); WB.closeModal(); WB.toast('阅读已记录 📖', 'ok'); WB.forceRender('books');
    });
  }

  /* 摘抄保存 */
  function saveQuote() {
    const ta = document.getElementById('bkQuote');
    const txt = (ta.value || '').trim();
    if (!txt) return WB.toast('先写点什么吧', 'warn');
    const d = WB.data, t = WB.today();
    d.readLog[t] = d.readLog[t] || { min: 0, pages: 0, quotes: [], note: '' };
    d.readLog[t].quotes = d.readLog[t].quotes || [];
    d.readLog[t].quotes.push({ id: WB.uid('q'), text: txt, at: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) });
    WB.save(); WB.toast('摘抄已归档 ✍️', 'ok');
    ta.value = '';
    WB.forceRender('books');
  }

  /* 选中文字存生词本 */
  function sendToWordbook() {
    const ta = document.getElementById('bkQuote');
    const sel = (ta.value || '').slice(ta.selectionStart, ta.selectionEnd).trim();
    if (!sel) return WB.toast('请先用光标选中要存入的英文单词', 'warn');
    if (typeof WBWord !== 'undefined' && WBWord.addOne) { WBWord.addOne(sel); }
    else WB.toast('单词本未就绪', 'err');
  }

  function render(root) {
    const d = WB.data, t = WB.today();
    const cur = curBook(d);
    const today = d.readLog[t] || {};
    const reading = d.books.filter(b => b.status === 'reading');
    const want = d.books.filter(b => b.status === 'want');

    root.innerHTML = '<div class="page-head"><div class="page-title">我的书架</div><div class="page-sub">阅读追踪 · 摘抄感悟 · 每日阅读目标 ' + d.settings.readGoalPages + ' 页</div></div>'
      // ── 阅读数据卡 ──
      + '<div class="grid g-main-side mb16">'
      + '<div class="card"><div class="card-title"><h3>' + (cur ? WB.esc(cur.title) : '正在阅读') + '</h3>'
      + (cur ? '<span class="badge">' + Math.round((cur.readPages || 0) / (cur.totalPages || 1) * 100) + '%</span>' : '')
      + '</div>'
      + (cur
        ? '<div class="row" style="gap:20px;align-items:center"><div id="bkDonut" style="position:relative"></div>'
          + '<div style="flex:1">'
          + '<div class="row mb8"><span class="lbl" style="font-size:12.5px;color:var(--ink-3)">作者</span><span class="grow semibold" style="font-size:14px">' + WB.esc(cur.author || '佚名') + '</span></div>'
          + '<div class="row mb8"><span class="lbl" style="font-size:12.5px;color:var(--ink-3)">进度</span><span class="grow semibold">' + (cur.readPages || 0) + ' / ' + (cur.totalPages || '—') + ' 页</span></div>'
          + '<div class="row mb8"><span class="lbl" style="font-size:12.5px;color:var(--ink-3)">本书累计</span><span class="grow semibold">' + WB.fmtMin(bookMin(cur.id)) + '</span></div>'
          + '<div class="row mb8"><span class="lbl" style="font-size:12.5px;color:var(--ink-3)">剩余</span><span class="grow semibold">' + Math.max(0, (cur.totalPages || 0) - (cur.readPages || 0)) + ' 页</span></div>'
          + '<div class="mt8"><button class="btn sm soft" id="bkRead">📖 今日阅读打卡</button></div>'
          + '</div></div>'
        : '<div class="empty"><p>书架还没有正在阅读的书</p><button class="btn sm soft mt12" id="bkAddEmpty">+ 添加书籍</button></div>')
      + '</div>'
      + '<div class="card"><div class="card-title"><h3>阅读数据</h3></div>'
      + '<div class="grid g2">'
      + '<div class="stat-tile"><span class="lbl">累计阅读</span><span class="val">' + WB.fmtMin(totalReadMin()) + '</span><div class="small">全部书籍累计时长</div></div>'
      + '<div class="stat-tile"><span class="lbl">今日阅读</span><span class="val">' + WB.fmtMin(today.min || 0) + '</span><div class="small">今日已读 ' + (today.pages || 0) + ' 页</div></div>'
      + '</div>'
      + '<div class="mt12 small mb4">近 7 天阅读趋势</div><div id="bkSpark"></div>'
      + '</div></div>'
      // ── 书目列表 ──
      + '<div class="card mb16"><div class="card-title"><h3>书架</h3>'
      + '<div class="right"><div class="seg" id="bkTab">'
      + '<button data-v="reading" class="' + (tab === 'reading' ? 'active' : '') + '">正在阅读 (' + reading.length + ')</button>'
      + '<button data-v="want" class="' + (tab === 'want' ? 'active' : '') + '">想读清单 (' + want.length + ')</button></div>'
      + '<button class="btn sm soft" id="bkAdd">+ 添加</button></div></div>'
      + '<div class="list">'
      + ((tab === 'reading' ? reading : want).map(b => {
        const pct = Math.round((b.readPages || 0) / (b.totalPages || 1) * 100);
        return '<div class="list-row" data-skey="' + b.id + '" data-open="' + b.id + '">'
          + '<span style="width:38px;height:50px;border-radius:8px;flex:none;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;background:linear-gradient(160deg,var(--accent),var(--mint));padding:2px">' + WB.esc(b.title.slice(0, 2)) + '</span>'
          + '<div class="grow" style="min-width:0"><div class="semibold" style="font-size:14.5px">' + WB.esc(b.title) + '</div>'
          + '<div class="small">' + WB.esc(b.author || '佚名') + (b.status === 'reading' ? ' · 已读 ' + pct + '%' : '') + '</div></div>'
          + (b.status === 'reading' ? '<span class="chip mint">' + pct + '%</span>' : '')
          + '<button class="iconbtn" data-edit="' + b.id + '" style="width:32px;height:32px"><svg viewBox="0 0 24 24" class="ic" style="width:16px;height:16px"><path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17z"/></svg></button></div>';
      }).join('') || '<div class="empty"><p>' + (tab === 'reading' ? '没有正在阅读的书' : '想读清单为空') + '</p></div>')
      + '</div></div>'
      // ── 摘抄感悟 ──
      + '<div class="card"><div class="card-title"><h3>摘抄 & 感悟</h3><span class="small">按日期自动归档 · 支持搜索</span></div>'
      + '<textarea class="textarea" id="bkQuote" placeholder="记录今天的读书摘抄、个人感悟…(选中英文单词可一键存入生词本)" style="min-height:100px"></textarea>'
      + '<div class="row mt12" style="gap:8px">'
      + '<button class="btn primary" id="bkSaveQuote">✍️ 保存摘抄</button>'
      + '<button class="btn" id="bkWord">📚 选中文字存入生词本</button></div>'
      + '<div class="row mt16" style="gap:8px"><svg viewBox="0 0 24 24" class="ic" style="width:16px;height:16px;color:var(--ink-3)"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.2 4.2"/></svg>'
      + '<input class="input grow" id="bkSearch" placeholder="搜索历史摘抄 / 感悟…" value="' + WB.esc(quoteQuery) + '"></div>'
      + '<div class="list mt12" id="bkQuotes"></div></div>';

    // ── 图表 ──
    if (cur) {
      const box = document.getElementById('bkDonut');
      WBChart.donut(box, { value: cur.readPages || 0, total: cur.totalPages || 1, size: 122, color: WBChart.getColor('mint') });
      box.insertAdjacentHTML('beforeend', '<div class="chart-center"><div class="num">' + Math.round((cur.readPages || 0) / (cur.totalPages || 1) * 100) + '%</div><div class="cap">进度</div></div>');
    }
    const sparkData = Array.from({ length: 7 }, (_, i) => (d.readLog[WB.addDays(t, i - 6)] || {}).min || 0);
    WBChart.spark(document.getElementById('bkSpark'), sparkData, WBChart.getColor('orange'));

    // ── 摘抄列表(含搜索) ──
    const quotesBox = document.getElementById('bkQuotes');
    const q = quoteQuery.trim().toLowerCase();
    const entries = Object.keys(d.readLog).sort().reverse();
    let shown = 0;
    quotesBox.innerHTML = '';
    entries.forEach(ds => {
      (d.readLog[ds].quotes || []).slice().reverse().forEach(qt => {
        if (q && !qt.text.toLowerCase().includes(q) && !ds.includes(q)) return;
        shown++;
        const div = document.createElement('div');
        div.className = 'q3-box';
        div.innerHTML = '<div class="row between mb8"><span class="chip blue">' + ds + ' ' + qt.at + '</span>'
          + '<button class="iconbtn" data-del style="width:26px;height:26px"><svg viewBox="0 0 24 24" class="ic" style="width:14px;height:14px"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>'
          + '<div style="font-size:13.5px;line-height:1.8">' + WB.esc(qt.text) + '</div>';
        div.querySelector('[data-del]').addEventListener('click', () => {
          d.readLog[ds].quotes = d.readLog[ds].quotes.filter(x => x.id !== qt.id);
          WB.save(); WB.forceRender('books');
        });
        quotesBox.appendChild(div);
      });
    });
    if (!shown) quotesBox.innerHTML = '<div class="empty"><p>暂无摘抄记录</p></div>';

    // ── 事件 ──
    const bkRead = root.querySelector('#bkRead');
    if (bkRead) bkRead.addEventListener('click', openReadLog);
    root.querySelector('#bkAdd').addEventListener('click', () => openBookModal());
    root.querySelector('#bkAddEmpty') && root.querySelector('#bkAddEmpty').addEventListener('click', () => openBookModal());
    root.querySelectorAll('#bkTab button').forEach(b => b.addEventListener('click', () => { tab = b.dataset.v; WB.forceRender('books'); }));
    root.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', e => {
      e.stopPropagation();
      openBookModal(d.books.find(x => x.id === b.dataset.edit));
    }));
    root.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', () => { curId = b.dataset.open; WB.forceRender('books'); }));
    root.querySelector('#bkSaveQuote').addEventListener('click', saveQuote);
    root.querySelector('#bkWord').addEventListener('click', sendToWordbook);
    root.querySelector('#bkSearch').addEventListener('input', e => { quoteQuery = e.target.value; render(root); });
  }

  WB.register('books', { render, refresh: render });
})();
