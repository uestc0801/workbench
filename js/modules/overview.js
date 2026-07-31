/* ═══════════════════════════════════════════════
   工作台概览(默认首页):聚合可视化 + 八大快捷入口 + 热点子分页
   ═══════════════════════════════════════════════ */
(function () {
  'use strict';

  let ovTab = 'home';
  let readIdx = 0;

  const ICONS = {
    calendar: '<path d="M7 3.5v3M17 3.5v3M4.5 9.5h15M5.5 4.5h13a1 1 0 0 1 1 1V19a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1V5.5a1 1 0 0 1 1-1z"/>',
    todo: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8.5 12l2.4 2.4L15.6 9.5"/>',
    books: '<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h6v16h-6A1.5 1.5 0 0 1 4 18.5zM12.5 4h6A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-6z"/>',
    water: '<path d="M12 3.5c3.2 3.6 6 6.7 6 10a6 6 0 0 1-12 0c0-3.3 2.8-6.4 6-10z"/>',
    review: '<path d="M6 3.5h9l3.5 3.5v13.5H6z"/><path d="M9 9h6M9 12.5h6M9 16h3"/>',
    exercise: '<path d="M4 13h3l2-3.5L11.5 16 14 8l1.6 4H20"/>',
    inspiration: '<path d="M9 18h6M10.5 21h3M8.5 15a5.5 5.5 0 1 1 7 0c-.9.7-1.5 1.6-1.5 2.6v.4h-4V17c0-1-.6-1.9-1.5-2.6z"/>',
    english: '<path d="M4 5h7M7.5 3.5V8M14 5h6M17 3.5V10M14.5 10h5M16.5 12v8.5"/>',
  };

  const QUICK = [
    { r: 'calendar', name: '日历', ic: 'calendar', c: 'var(--accent)', s: 'var(--accent-soft)' },
    { r: 'todo', name: '待办', ic: 'todo', c: 'var(--orange)', s: 'var(--orange-soft)' },
    { r: 'books', name: '书架', ic: 'books', c: 'var(--mint)', s: 'var(--mint-soft)' },
    { r: 'water', name: '喝水', ic: 'water', c: 'var(--accent)', s: 'var(--accent-soft)' },
    { r: 'review', name: '复盘', ic: 'review', c: 'var(--orange)', s: 'var(--orange-soft)' },
    { r: 'exercise', name: '运动', ic: 'exercise', c: 'var(--mint)', s: 'var(--mint-soft)' },
    { r: 'inspiration', name: '灵感', ic: 'inspiration', c: 'var(--yellow)', s: 'var(--yellow-soft)' },
    { r: 'english', name: '英语', ic: 'english', c: 'var(--red)', s: 'var(--red-soft)' },
  ];

  function ic(path) { return '<svg viewBox="0 0 24 24" class="ic">' + path + '</svg>'; }

  function todayStats() {
    const d = WB.data, t = WB.today();
    const open = (d.todos || []).filter(x => !x.done);
    const doneToday = (d.todos || []).filter(x => x.done && x.doneAt && x.doneAt.slice(0, 10) === t);
    const total = open.length + doneToday.length;
    const done = doneToday.length;
    const water = d.water[t] || 0;
    const readMin = (d.readLog[t] || {}).min || 0;
    const focus = (d.pomo[t] || 0) + ((d.english.learn[t] || {}).wordsMin || 0) + ((d.english.learn[t] || {}).speakMin || 0);
    return { open, doneToday, total, done, water, readMin, focus };
  }

  function renderHome(root) {
    const d = WB.data, t = WB.today(), st = todayStats();
    // ── 四格数据摘要(方正卡片 2×2) ──
    const stats = '<div class="grid g2 g4d mb16">'
      + statTile('今日待办', st.done + '/' + st.total, '完成率 ' + (st.total ? Math.round(st.done / st.total * 100) : 0) + '%', 'var(--accent)', 'var(--accent-soft)', 'M12 4v.2M12 9v.2M12 14v.2M12 19v.2' + 'M4 4l8 8 8-8M4 12l8 8 8-8')
      + statTile('饮水量', WB.fmtMl(st.water), '目标 ' + WB.fmtMl(d.settings.waterGoal), 'var(--mint)', 'var(--mint-soft)', 'M12 3.5c3.2 3.6 6 6.7 6 10a6 6 0 0 1-12 0c0-3.3 2.8-6.4 6-10z')
      + statTile('阅读时长', WB.fmtMin(st.readMin), '今日累计', 'var(--orange)', 'var(--orange-soft)', 'M4 5.5A1.5 1.5 0 0 1 5.5 4h6v16h-6A1.5 1.5 0 0 1 4 18.5zM12.5 4h6A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-6z')
      + statTile('专注时长', WB.fmtMin(st.focus), '番茄 + 英语', 'var(--yellow)', 'var(--yellow-soft)', 'M12 21s-7-4.6-9-9.5C1.8 8 4 4.5 7.5 4.5c2 0 3.4 1 4.5 2.6 1.1-1.6 2.5-2.6 4.5-2.6C20 4.5 22.2 8 21 11.5 19 16.4 12 21 12 21z')
      + '</div>';
    // ── 待办环形图卡 ──
    const pct = st.total ? Math.round(st.done / st.total * 100) : 0;
    const todoCard = '<div class="card"><div class="card-title"><h3>今日待办</h3><span class="badge">' + st.open.length + ' 项待完成</span></div>'
      + '<div class="row" style="gap:20px;align-items:center"><div id="ovDonut"></div>'
      + '<div style="flex:1;min-width:0">'
      + (st.open.length
        ? '<div class="list" style="max-height:220px;overflow-y:auto">' + st.open.slice(0, 6).map(x => {
          const pri = ['', 'var(--pri-1)', 'var(--pri-2)', 'var(--pri-3)', 'var(--pri-4)'][x.pri || 4];
          return '<div class="list-row" style="gap:10px;padding:9px 12px"><span style="width:4px;height:26px;border-radius:3px;background:' + (x.color || pri) + ';flex:none"></span><span style="font-size:13.5px" class="grow">' + WB.esc(x.text) + '</span>'
            + (x.due ? '<span class="small">' + x.due.slice(5) + '</span>' : '') + '</div>';
        }).join('') : '<div class="empty" style="padding:8px 0"><p>全部完成 🎉 太棒了!</p></div>')
      + '</div></div><div class="row mt12"><button class="btn sm soft" data-go="todo">去待办</button></div></div>';
    // ── 饮水卡 ──
    const wg = d.settings.waterGoal;
    const waterCard = '<div class="card"><div class="card-title"><h3>饮水量</h3></div>'
      + '<div class="row between mb8"><span class="semibold" style="font-size:20px">' + st.water + '<small class="small"> / ' + wg + ' ml</small></span><span class="chip mint">' + Math.round(st.water / wg * 100) + '%</span></div>'
      + '<div id="ovMeter"></div>'
      + '<div class="row mt12" style="gap:8px">' + [200, 300, 500].map(v => '<button class="btn sm soft grow" data-water="' + v + '">+' + v + 'ml</button>').join('') + '</div>'
      + '<div class="row mt12"><button class="btn sm" data-go="water">喝水打卡</button></div></div>';
    // ── 阅读卡 ──
    const reading = (d.books || []).filter(b => b.status === 'reading');
    const cur = reading[Math.min(readIdx, Math.max(0, reading.length - 1))];
    let readCard = '<div class="card mt16"><div class="card-title"><h3>正在阅读</h3>'
      + (reading.length > 1 ? '<div class="right"><button class="iconbtn sm" data-nav="book" data-d="-1"><svg viewBox="0 0 24 24" class="ic" style="width:16px;height:16px"><path d="M15 5l-7 7 7 7"/></svg></button><button class="iconbtn sm" data-nav="book" data-d="1"><svg viewBox="0 0 24 24" class="ic" style="width:16px;height:16px"><path d="M9 5l7 7-7 7"/></svg></button></div>' : '')
      + '</div>'
      + (cur
        ? '<div class="row" style="gap:20px;align-items:center"><div id="ovBook"></div><div style="flex:1">'
          + '<div class="semibold" style="font-size:15px">' + WB.esc(cur.title) + '</div>'
          + '<div class="small mt8">' + WB.esc(cur.author || '佚名') + '</div>'
          + '<div class="row mt8 wrap"><span class="chip blue">已读 ' + (cur.readPages || 0) + ' / ' + (cur.totalPages || '—') + ' 页</span></div>'
          + '<div class="mt12 small">今日已读 ' + WB.fmtMin(st.readMin) + '</div>'
          + '<div class="mt12"><button class="btn sm soft" data-go="books">去书架阅读</button></div>'
          + '</div></div>'
        : '<div class="empty"><p>书架还没有正在阅读的书</p><button class="btn sm soft mt12" data-go="books">去添加</button></div>')
      + '</div>';
    // ── 灵感快捷记录 ──
    const last = d.inspirations[0];
    const insCard = '<div class="card mt16"><div class="card-title"><h3>灵感速记</h3><span class="small">回车即存</span></div>'
      + '<div class="row" style="gap:10px"><input class="input grow" id="ovIdea" placeholder="此刻的想法,一句话记下来…" maxlength="120">'
      + '<button class="btn primary" id="ovSaveIdea">保存</button></div>'
      + (last ? '<div class="mt12 small" style="line-height:1.6"><b>最近一条:</b> ' + WB.esc((last.text || last.urlTitle || '').slice(0, 40)) + '</div>' : '')
      + '</div>';

    const home = document.getElementById('ovHome');
    home.innerHTML = stats
      + '<div class="grid g-card2"><div>' + todoCard + '</div><div>' + waterCard + '</div><div>' + readCard + '</div></div>'
      + insCard;

    // ── 图表 ──
    WBChart.donut(document.getElementById('ovDonut'), { value: st.done, total: st.total || 1, size: 128, color: WBChart.getColor('accent') });
    WBChart.meter(document.getElementById('ovMeter'), { value: st.water, total: wg, color: WBChart.getColor('mint') });
    if (cur) {
      const tp = cur.totalPages || 1;
      const box = document.createElement('div');
      document.getElementById('ovBook').appendChild(box);
      box.style.width = '128px'; box.style.height = '128px';
      WBChart.donut(box, { value: cur.readPages || 0, total: tp, size: 128, color: WBChart.getColor('orange') });
      box.insertAdjacentHTML('beforeend', '<div class="chart-center"><div class="num">' + Math.round((cur.readPages || 0) / tp * 100) + '%</div><div class="cap">阅读进度</div></div>');
      box.style.position = 'relative';
    }
    // ── 事件 ──
    home.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => WB.nav(b.dataset.go)));
    home.querySelectorAll('[data-water]').forEach(b => b.addEventListener('click', () => {
      const d = WB.data, t = WB.today();
      d.water[t] = (d.water[t] || 0) + Number(b.dataset.water);
      WB.save(); WB.toast('+' + b.dataset.water + ' ml', 'ok');
      WB.forceRender('overview');
    }));
    home.querySelectorAll('[data-nav="book"]').forEach(b => b.addEventListener('click', () => {
      const reading = (WB.data.books || []).filter(x => x.status === 'reading');
      readIdx = (readIdx + Number(b.dataset.d) + reading.length) % reading.length;
      renderHome(root);
    }));
    const idea = document.getElementById('ovIdea');
    const saveIdea = () => {
      const v = (idea.value || '').trim();
      if (!v) return WB.toast('先输入一点内容吧', 'warn');
      const d = WB.data;
      d.inspirations.unshift({ id: WB.uid('ins'), type: 'text', text: v, url: '', urlTitle: '', note: '', category: '创意', fav: false, date: WB.today() });
      WB.save(); WB.toast('灵感已保存 ✨', 'ok');
      WB.forceRender('overview');
    };
    idea.addEventListener('keydown', e => { if (e.key === 'Enter') saveIdea(); });
    document.getElementById('ovSaveIdea').addEventListener('click', saveIdea);
  }

  function statTile(lbl, val, sub, c, s, iconPath) {
    return '<div class="stat-tile card" style="padding:16px 18px;border-left:4px solid ' + c + ';background:linear-gradient(150deg,' + s + ',var(--card))">'
      + '<div class="row between"><span class="lbl" style="font-size:12.5px;color:var(--ink-2);font-weight:600">' + lbl + '</span>'
      + '<svg viewBox="0 0 24 24" class="ic" style="width:18px;height:18px;color:' + c + '"><path d="' + iconPath + '"/></svg></div>'
      + '<span class="val" style="font-size:28px;line-height:1.2;display:block;margin-top:6px">' + val + '</span>'
      + '<span class="small" style="display:block;margin-top:6px">' + sub + '</span></div>';
  }

  function stat(lbl, val, sub, cls) {
    return '<div class="card" style="padding:14px 16px"><div class="stat-tile"><span class="lbl">' + lbl + '</span>'
      + '<span class="val">' + val + '</span><span class="small">' + sub + '</span></div></div>';
  }

  function render(root) {
    const d = WB.data, t = WB.today();
    const lunar = Lunar.daily(new Date());
    const greet = (() => {
      const h = new Date().getHours();
      return h < 6 ? '夜深了' : h < 11 ? '早上好' : h < 14 ? '中午好' : h < 18 ? '下午好' : '晚上好';
    })();
    const name = d.settings.name || '朋友';
    const subBits = [WB.todayCN(), WB.zhWeek(t)];
    if (lunar) subBits.push('农历' + lunar.lunarStr + ' · ' + lunar.gzDay + '日 · ' + lunar.dao.name);
    root.innerHTML = '<div class="page-head">'
      + '<div class="page-title">' + greet + ', ' + WB.esc(name) + ' 👋</div>'
      + '<div class="page-sub">' + subBits.join(' · ') + '</div>'
      + '<div class="seg-tabs mt12" id="ovTabs">'
      + '<button class="stab active" data-ov="home">工作台概览</button>'
      + '<button class="stab" data-ov="hot">今日热点</button></div>'
      + '</div>'
      + '<div id="ovHome"></div><div id="ovHot" class="hide"></div>';

    root.querySelectorAll('#ovTabs .stab').forEach(b => b.addEventListener('click', () => {
      ovTab = b.dataset.ov;
      root.querySelectorAll('#ovTabs .stab').forEach(x => x.classList.toggle('active', x === b));
      document.getElementById('ovHome').classList.toggle('hide', ovTab !== 'home');
      document.getElementById('ovHot').classList.toggle('hide', ovTab !== 'hot');
      if (ovTab === 'hot') WBHot.render(document.getElementById('ovHot'));
    }));
    if (ovTab === 'hot') {
      root.querySelectorAll('#ovTabs .stab')[1].click();
    } else {
      renderHome(root);
    }
  }

  WB.register('overview', {
    render,
    refresh: render,
  });
})();
