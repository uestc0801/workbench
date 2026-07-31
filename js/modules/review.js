/* ═══════════════════════════════════════════════
   今日复盘:四维可视化看板 + 每日三问存档 + 周/月历史汇总
   ═══════════════════════════════════════════════ */
(function () {
  'use strict';

  let tab = 'today';
  let curDate = WB.today();
  let weekOffset = 0;
  let monthOffset = 0;

  function dayData(ds) {
    const d = WB.data;
    const open = d.todos.filter(x => !x.done && !x.due ? true : !x.done);
    const doneOn = d.todos.filter(x => x.done && x.doneAt && x.doneAt.slice(0, 10) === ds);
    const dueOn = d.todos.filter(x => x.due === ds);
    const total = dueOn.length + doneOn.length;
    const el = d.english.learn[ds] || {};
    const water = d.water[ds] || 0;
    const readMin = (d.readLog[ds] || {}).min || 0;
    const readPages = (d.readLog[ds] || {}).pages || 0;
    const focus = (d.pomo[ds] || 0) + (el.wordsMin || 0) + (el.speakMin || 0);
    const exMin = (d.exercise[ds] || {}).min || 0;
    return { total, done: doneOn.length, water, goal: d.settings.waterGoal, readMin, readPages, focus, exMin };
  }

  function metric(el, value, total, label, color, unit) {
    const pct = total ? Math.round(value / total * 100) : 0;
    const box = document.createElement('div');
    box.style.position = 'relative';
    box.innerHTML = '<div class="ta-c" style="font-size:12px;color:var(--ink-3);margin-top:6px">' + label + '</div>';
    const wrap = document.createElement('div');
    box.appendChild(wrap);
    el.appendChild(box);
    WBChart.donut(wrap, { value: Math.min(value, total || 1), total: total || 1, size: 84, stroke: 9, color });
    wrap.insertAdjacentHTML('beforeend', '<div class="chart-center"><div class="num" style="font-size:15px">' + value + (unit || '') + '</div><div class="cap">/ ' + total + '</div></div>');
    return box;
  }

  function renderToday(body) {
    const d = WB.data;
    const dd = dayData(curDate);
    const rv = d.review[curDate] || { q1: '', q2: '', q3: '' };
    // 四维看板
    const board = '<div class="card mb16"><div class="card-title"><h3>' + (curDate === WB.today() ? '今日数据看板' : curDate + ' 数据看板') + '</h3>'
      + (curDate !== WB.today() ? '<span class="badge">历史</span>' : '') + '</div>'
      + '<div class="grid g4" id="metricGrid"></div>'
      + '<div class="row mt16 wrap" style="gap:10px">'
      + '<span class="chip blue">阅读 ' + WB.fmtMin(dd.readMin) + '</span>'
      + '<span class="chip orange">运动 ' + WB.fmtMin(dd.exMin) + '</span>'
      + '<span class="chip mint">已读 ' + dd.readPages + ' 页</span>'
      + (dd.readPages > 0 && dd.readPages < d.settings.readGoalPages ? '<span class="chip yellow">阅读目标差 ' + (d.settings.readGoalPages - dd.readPages) + ' 页</span>' : '')
      + '</div></div>';
    // 三问
    const three = '<div class="card"><div class="card-title"><h3>每日三问 · 自我反馈</h3><span class="small">三项必填,保存后永久存档</span></div>'
      + '<div class="grid" style="gap:14px">'
      + q3('q1', '① 今天完成了什么?', rv.q1, '用一两句话总结今天的成果')
      + q3('q2', '② 今天学到了什么新知识 / 感悟?', rv.q2, '记录今天的输入与思考')
      + q3('q3', '③ 明天需要改进的地方?', rv.q3, '给明天的自己一个小目标')
      + '</div>'
      + '<div class="row mt16"><button class="btn primary grow" id="rvSave">💾 保存今日复盘</button>'
      + (d.review[curDate] ? '<span class="chip mint">已存档</span>' : '<span class="chip">尚未填写</span>') + '</div></div>';
    body.innerHTML = board + three;

    const grid = document.getElementById('metricGrid');
    metric(grid, dd.done, dd.total, '待办完成', WBChart.getColor('accent'), '项');
    metric(grid, dd.water, dd.goal, '饮水完成', WBChart.getColor('mint'), 'ml');
    metric(grid, dd.readMin, d.settings.readGoalMin, '阅读时长', WBChart.getColor('orange'), '分');
    metric(grid, dd.focus, Math.max(dd.focus, 1), '专注时长', WBChart.getColor('yellow'), '分');

    // 保存三问
    body.querySelector('#rvSave').addEventListener('click', () => {
      const q1 = body.querySelector('[data-field="q1"]').value.trim();
      const q2 = body.querySelector('[data-field="q2"]').value.trim();
      const q3 = body.querySelector('[data-field="q3"]').value.trim();
      if (!q1 || !q2 || !q3) return WB.toast('三项都是必填,请填写完整', 'warn');
      WB.data.review[curDate] = { q1, q2, q3, savedAt: new Date().toISOString() };
      WB.save(); WB.toast('今日复盘已存档 🎯', 'ok');
      WB.forceRender('review');
    });
  }

  function q3(k, title, val, ph) {
    return '<div class="q3-box"><div class="q">' + title + '</div>'
      + '<textarea class="textarea" data-field="' + k + '" placeholder="' + ph + '" style="min-height:74px">' + WB.esc(val || '') + '</textarea></div>';
  }

  /* ── 周视图 ── */
  function renderWeek(root) {
    const d = WB.data;
    const base = WB.addDaysDate(WB.fromStr(WB.today()), weekOffset * 7);
    const ws = WB.dStr(base);
    const days = WB.weekDates(ws);
    const agg = days.reduce((a, ds) => {
      const dd = dayData(ds);
      a.done += dd.done; a.total += dd.total; a.water += dd.water; a.read += dd.readMin; a.focus += dd.focus;
      a.review += d.review[ds] ? 1 : 0;
      return a;
    }, { done: 0, total: 0, water: 0, read: 0, focus: 0, review: 0 });
    const rate = agg.total ? Math.round(agg.done / agg.total * 100) : 0;
    root.innerHTML = '<div class="card-title"><div class="row between"><h3 style="margin:0">周复盘汇总</h3>'
      + '<div class="row" style="gap:8px"><button class="iconbtn" id="wPrev"><svg viewBox="0 0 24 24" class="ic"><path d="M15 5l-7 7 7 7"/></svg></button>'
      + '<span class="semibold" id="wLabel" style="min-width:150px;text-align:center"></span>'
      + '<button class="iconbtn" id="wNext"><svg viewBox="0 0 24 24" class="ic"><path d="M9 5l7 7-7 7"/></svg></button></div></div></div>'
      + '<div class="grid g4 mb16">'
      + wTile('待办完成', agg.done + '/' + agg.total, rate + '%', 'var(--accent)')
      + wTile('饮水量', WB.fmtMl(agg.water), '近一周', 'var(--mint)')
      + wTile('阅读时长', WB.fmtMin(agg.read), '近一周', 'var(--orange)')
      + wTile('专注时长', WB.fmtMin(agg.focus), '番茄+英语', 'var(--yellow)')
      + '</div>'
      + '<div class="grid g2" style="grid-template-columns:minmax(0,1.2fr) minmax(0,1fr)">'
      + '<div class="card"><div class="card-title"><h3>每日一览</h3><span class="badge">' + agg.review + '/7 天已复盘</span></div>'
      + '<div class="list">' + days.map(ds => {
        const dd = dayData(ds);
        const r = d.review[ds];
        const isT = ds === WB.today();
        return '<div class="list-row" data-open="' + ds + '" style="' + (isT ? 'border-color:var(--accent)' : '') + '">'
          + '<span class="chip ' + (isT ? 'blue' : '') + '">' + ds.slice(5) + ' ' + WB.weekLabel(ds) + '</span>'
          + '<span class="grow small">完成 ' + dd.done + '/' + dd.total + ' · 水 ' + dd.water + 'ml</span>'
          + (r ? '<span class="chip mint">已复盘</span>' : '<span class="chip">未填写</span>')
          + (isT ? '<span class="chip blue">今天</span>' : '') + '</div>';
      }).join('') + '</div></div>'
      + '<div class="card"><div class="card-title"><h3>周复盘文字</h3></div>'
      + '<div style="font-size:13.5px;line-height:2">'
      + '<div>本周完成待办 <b>' + agg.done + '</b> 项' + (agg.total ? ',完成率 <b style="color:var(--accent)">' + rate + '%</b>' : '') + '。</div>'
      + '<div>累计饮水 <b>' + WB.fmtMl(agg.water) + '</b>,阅读 <b>' + WB.fmtMin(agg.read) + '</b>,专注 <b>' + WB.fmtMin(agg.focus) + '</b>。</div>'
      + '<div>' + (agg.review === 7 ? '一周七日全部复盘,非常自律 👏' : '还有 ' + (7 - agg.review) + ' 天未复盘,去补上吧。') + '</div>'
      + (rate >= 80 ? '<div class="mint semibold">保持这个节奏,下周继续!</div>' : rate >= 50 ? '<div class="orange semibold">整体不错,再提高一点完成率。</div>' : '<div class="small">下周把目标拆小一点,先从完成一件事开始。</div>')
      + '</div></div></div>';
    document.getElementById('wLabel').textContent = WB.weekLabel(days[0]) + ' ~ ' + WB.weekLabel(days[6]) + ' · ' + days[0].slice(5) + ' ~ ' + days[6].slice(5);
    root.querySelector('#wPrev').addEventListener('click', () => { weekOffset--; renderWeek(root); });
    root.querySelector('#wNext').addEventListener('click', () => { weekOffset++; renderWeek(root); });
    root.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', () => { curDate = b.dataset.open; tab = 'today'; render(root); }));
  }

  function wTile(l, v, sub, c) {
    return '<div class="card" style="padding:14px 16px;border-top:3px solid ' + c + '"><div class="stat-tile"><span class="lbl">' + l + '</span>'
      + '<span class="val" style="font-size:22px">' + v + '</span><span class="small">' + sub + '</span></div></div>';
  }

  /* ── 月视图 ── */
  function renderMonth(root) {
    const d = WB.data;
    const y = WB.fromStr(WB.today()).getFullYear(), mo = WB.fromStr(WB.today()).getMonth() + 1 + monthOffset;
    const ny = y + Math.floor((mo - 1) / 12), nm = ((mo - 1) % 12 + 12) % 12 + 1;
    const daysInMonth = new Date(ny, nm, 0).getDate();
    let agg = { done: 0, total: 0, water: 0, read: 0, focus: 0, review: 0, days: 0 };
    const bars = [];
    for (let dd = 1; dd <= daysInMonth; dd++) {
      const ds = WB.dStr(new Date(ny, nm - 1, dd));
      const dd2 = dayData(ds);
      agg.done += dd2.done; agg.total += dd2.total; agg.water += dd2.water; agg.read += dd2.readMin; agg.focus += dd2.focus;
      if (d.review[ds]) agg.review++; if (dd2.total || dd2.water || dd2.readMin) agg.days++;
      bars.push({ label: String(dd), value: dd2.total ? Math.round(dd2.done / dd2.total * 100) : 0 });
    }
    root.innerHTML = '<div class="card-title"><div class="row between"><h3 style="margin:0">月复盘汇总</h3>'
      + '<div class="row" style="gap:8px"><button class="iconbtn" id="mPrev"><svg viewBox="0 0 24 24" class="ic"><path d="M15 5l-7 7 7 7"/></svg></button>'
      + '<span class="semibold" id="mLabel" style="min-width:120px;text-align:center"></span>'
      + '<button class="iconbtn" id="mNext"><svg viewBox="0 0 24 24" class="ic"><path d="M9 5l7 7-7 7"/></svg></button></div></div></div>'
      + '<div class="grid g4 mb16">'
      + wTile('完成待办', agg.done + ' 项', '总 ' + agg.total, 'var(--accent)')
      + wTile('总饮水量', WB.fmtMl(agg.water), '全月累计', 'var(--mint)')
      + wTile('总阅读', WB.fmtMin(agg.read), '全月累计', 'var(--orange)')
      + wTile('复盘天数', agg.review + ' 天', '共 ' + daysInMonth + ' 天', 'var(--yellow)')
      + '</div>'
      + '<div class="card"><div class="card-title"><h3>每日待办完成率</h3><span class="small">绿色高亮为完成日</span></div>'
      + '<div id="mBars"></div><div class="legend mt8"><span><i class="sw" style="background:' + WBChart.getColor('accent') + '"></i>完成率 %</span></div></div>';
    document.getElementById('mLabel').textContent = ny + ' 年 ' + nm + ' 月';
    WBChart.bars(document.getElementById('mBars'), { data: bars, height: 200, unit: '%' });
    root.querySelector('#mPrev').addEventListener('click', () => { monthOffset--; renderMonth(root); });
    root.querySelector('#mNext').addEventListener('click', () => { monthOffset++; renderMonth(root); });
  }

  function render(root) {
    root.innerHTML = '<div class="page-head"><div class="page-title">今日复盘</div><div class="page-sub">全维度数据可视化 · 每日三问存档 · 周/月汇总</div>'
      + '<div class="seg-tabs mt12" id="rvTab">'
      + [['today', '今日复盘'], ['week', '周复盘'], ['month', '月复盘']].map(x => '<button class="stab ' + (tab === x[0] ? 'active' : '') + '" data-t="' + x[0] + '">' + x[1] + '</button>').join('')
      + '</div><div id="rvBody"></div></div>';
    root.querySelectorAll('#rvTab .stab').forEach(b => b.addEventListener('click', () => {
      tab = b.dataset.t;
      root.querySelectorAll('#rvTab .stab').forEach(x => x.classList.toggle('active', x === b));
      const body = document.getElementById('rvBody');
      if (tab === 'today') renderToday(root);
      else if (tab === 'week') renderWeek(body);
      else renderMonth(body);
    }));
    const body = document.getElementById('rvBody');
    if (tab === 'today') renderToday(body);
    else if (tab === 'week') renderWeek(body);
    else renderMonth(body);
  }

  WB.register('review', { render, refresh: render });
})();
