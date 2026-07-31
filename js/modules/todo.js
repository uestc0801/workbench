/* ═══════════════════════════════════════════════
   今日待办:四色优先级 + 标签备注截止 + 逾期标红
   + 番茄专注计时器(屏蔽弹窗)+ 柔和消散动画
   ═══════════════════════════════════════════════ */
(function () {
  'use strict';

  let filter = 'all';
  const PRI = [
    { v: 1, name: '紧急重要', c: 'var(--pri-1)', s: 'var(--red-soft)' },
    { v: 2, name: '重要不紧急', c: 'var(--pri-2)', s: 'var(--orange-soft)' },
    { v: 3, name: '紧急不重要', c: 'var(--pri-3)', s: 'var(--accent-soft)' },
    { v: 4, name: '普通琐事', c: 'var(--pri-4)', s: 'var(--gray-soft)' },
  ];
  const COLORS = ['#ff5c5c', '#ff9d47', '#3f8cff', '#34c79a', '#aab2c3', '#8a6cff', '#f05bb5', '#5ad1d6'];

  function priInfo(t) { return PRI.find(p => p.v === t.pri) || PRI[3]; }

  function filtered(d) {
    const t = WB.today();
    const all = d.todos || [];
    switch (filter) {
      case 'open': return all.filter(x => !x.done);
      case 'done': return all.filter(x => x.done);
      case 'overdue': return all.filter(x => !x.done && x.due && x.due < t);
      default: return all;
    }
  }

  /* ── 动画:单个完成 ── */
  function animateDone(el, cb) {
    const txt = el.querySelector('.todo-text');
    txt.innerHTML = '<span class="todo-strike"></span>' + txt.textContent;
    el.classList.add('todo-done');
    txt.style.color = 'var(--ink-3)';
    setTimeout(() => { el.classList.add('dissolve'); setTimeout(cb, 520); }, 260);
  }

  /* ── 编辑 modal ── */
  function openEdit(t, cb) {
    const pi = priInfo(t);
    const html = '<h4>编辑待办</h4>'
      + '<div class="field"><label>任务内容</label><input class="input" data-field="text" value="' + WB.esc(t.text) + '" maxlength="60"></div>'
      + '<div class="field"><label>优先级</label><div class="row wrap" id="priPick" style="gap:8px">'
      + PRI.map(p => '<button class="chip" data-pri="' + p.v + '" style="background:' + p.s + ';color:' + p.c + ';padding:7px 14px">' + p.name + '</button>').join('') + '</div></div>'
      + '<div class="field"><label>自定义颜色</label><div class="row wrap" id="colorPick" style="gap:8px">'
      + COLORS.map(c => '<button class="dot" data-c="' + c + '" style="background:' + c + '"></button>').join('')
      + '<button class="dot clear" title="使用优先级色">↺</button></div></div>'
      + '<div class="form-row">'
      + '<div class="field"><label>标签</label><input class="input" data-field="tag" value="' + WB.esc(t.tag || '') + '" maxlength="12"></div>'
      + '<div class="field"><label>截止时间</label><input class="input" type="date" data-field="due" value="' + (t.due || '') + '"></div></div>'
      + '<div class="field"><label>备注</label><textarea class="textarea" data-field="note">' + WB.esc(t.note || '') + '</textarea></div>'
      + '<div class="m-actions" style="justify-content:space-between"><button class="btn danger" id="mDel">删除</button>'
      + '<div class="row" style="gap:10px"><button class="btn" id="mCancel">取消</button><button class="btn primary" id="mOk">保存</button></div></div>';
    const box = WB.openModal(html);
    let pri = t.pri, color = t.color || '';
    box.querySelectorAll('#priPick .chip').forEach(b => b.addEventListener('click', () => {
      pri = Number(b.dataset.pri);
      box.querySelectorAll('#priPick .chip').forEach(x => x.style.opacity = x === b ? 1 : 0.45);
    }));
    box.querySelectorAll('#priPick .chip').forEach(x => x.style.opacity = x.dataset.pri == pri ? 1 : 0.45);
    box.querySelectorAll('#colorPick .dot').forEach(b => {
      if (b.classList.contains('clear')) { b.addEventListener('click', () => { color = ''; }); return; }
      b.addEventListener('click', () => { color = b.dataset.c; });
    });
    box.querySelector('#mCancel').addEventListener('click', WB.closeModal);
    box.querySelector('#mDel').addEventListener('click', () => {
      WB.confirmBox('确定删除这条待办?', ok => {
        if (!ok) return;
        WB.data.todos = WB.data.todos.filter(x => x.id !== t.id);
        WB.save(); WB.closeModal(); WB.toast('已删除', 'ok'); WB.forceRender('todo');
      });
    });
    box.querySelector('#mOk').addEventListener('click', () => {
      const f = WB.readForm(box);
      if (!f.text.trim()) return WB.toast('请输入任务内容', 'warn');
      Object.assign(t, { text: f.text.trim(), tag: f.tag, note: f.note, due: f.due, pri, color });
      WB.save(); WB.closeModal(); WB.toast('已保存 ✓', 'ok'); WB.forceRender('todo');
    });
  }

  /* ── 快速新增 ── */
  function openAdd() {
    const html = '<h4>新建待办</h4>'
      + '<div class="field"><label>任务内容</label><input class="input" data-field="text" placeholder="要做什么?" maxlength="60"></div>'
      + '<div class="field"><label>优先级</label><div class="row wrap" id="priPick" style="gap:8px">'
      + PRI.map(p => '<button class="chip" data-pri="' + p.v + '" style="background:' + p.s + ';color:' + p.c + ';padding:7px 14px">' + p.name + '</button>').join('') + '</div></div>'
      + '<div class="form-row">'
      + '<div class="field"><label>标签</label><input class="input" data-field="tag" placeholder="工作/学习/生活…" maxlength="12"></div>'
      + '<div class="field"><label>截止时间</label><input class="input" type="date" data-field="due" value="' + WB.today() + '"></div></div>'
      + '<div class="field"><label>备注</label><textarea class="textarea" data-field="note" placeholder="补充说明(可选)"></textarea></div>'
      + '<div class="m-actions"><button class="btn" id="mCancel">取消</button><button class="btn primary" id="mOk">创建</button></div>';
    const box = WB.openModal(html);
    let pri = 3;
    box.querySelectorAll('#priPick .chip').forEach(b => b.addEventListener('click', () => {
      pri = Number(b.dataset.pri);
      box.querySelectorAll('#priPick .chip').forEach(x => x.style.opacity = x === b ? 1 : 0.45);
    }));
    box.querySelectorAll('#priPick .chip').forEach(x => x.style.opacity = x.dataset.pri == pri ? 1 : 0.45);
    box.querySelector('#mCancel').addEventListener('click', WB.closeModal);
    box.querySelector('#mOk').addEventListener('click', () => {
      const f = WB.readForm(box);
      if (!f.text.trim()) return WB.toast('请输入任务内容', 'warn');
      WB.data.todos.unshift({ id: WB.uid('t'), text: f.text.trim(), tag: f.tag, note: f.note, due: f.due, pri, color: '', done: false, doneAt: null, createdAt: WB.today() });
      WB.save(); WB.closeModal(); WB.toast('待办已创建 ✓', 'ok');
      WB.forceRender('todo');
    });
  }

  /* ── 完成全部 / 清除已完成 ── */
  function completeAll() {
    const d = WB.data;
    const list = d.todos.filter(x => !x.done);
    if (!list.length) return WB.toast('没有未完成任务', 'warn');
    const rows = document.querySelectorAll('.todo-row:not(.done-row)');
    list.forEach((t, i) => {
      const el = rows[i];
      if (el) setTimeout(() => animateDone(el, () => { t.done = true; t.doneAt = new Date().toISOString(); WB.save(); WB.forceRender('todo'); }), i * 90);
      else { t.done = true; t.doneAt = new Date().toISOString(); }
    });
    setTimeout(() => { WB.save(); }, list.length * 90 + 400);
    WB.toast('全部完成 🎉', 'ok');
  }
  function clearDone() {
    const d = WB.data;
    const done = d.todos.filter(x => x.done);
    if (!done.length) return WB.toast('没有已完成的待办', 'warn');
    const rows = document.querySelectorAll('.todo-row.done-row');
    done.forEach((t, i) => {
      const el = rows[i];
      if (el) setTimeout(() => { el.classList.add('remove'); setTimeout(() => { WB.data.todos = WB.data.todos.filter(x => x.id !== t.id); }, 400); }, i * 60);
    });
    setTimeout(() => { WB.save(); WB.forceRender('todo'); }, done.length * 60 + 480);
  }

  /* ── 番茄专注 ── */
  let fm = null;
  function stopFocus() {
    if (fm) { clearInterval(fm.timer); fm = null; }
    WB.setFocus(false);
    document.getElementById('focusLayer').hidden = true;
    WB.forceRender('todo');
  }
  function startFocus(focusMin, breakMin) {
    const layer = document.getElementById('focusLayer');
    const d = WB.data;
    layer.hidden = false;
    WB.setFocus(true);
    let phase = 'focus', remain = focusMin * 60, paused = false;
    const fmt = s => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
    layer.innerHTML = '<div class="f-phase" id="fPhase">专注中</div><div class="f-num" id="fNum">' + fmt(remain) + '</div>'
      + '<div class="f-note">沉浸当下,其余提醒暂被静音</div>'
      + '<div class="f-btns"><button class="f-btn" id="fPause" title="暂停"><svg viewBox="0 0 24 24" class="ic"><path d="M8 5v14M16 5v14"/></svg></button>'
      + '<button class="f-btn" id="fSkip" title="跳过"><svg viewBox="0 0 24 24" class="ic"><path d="M6 5l10 7-10 7z"/></svg></button>'
      + '<button class="f-btn" id="fStop" title="结束"><svg viewBox="0 0 24 24" class="ic"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>';
    const num = document.getElementById('fNum'), ph = document.getElementById('fPhase');
    const paint = () => {
      num.textContent = fmt(remain);
      ph.textContent = phase === 'focus' ? '专注中' : '休息一下';
      ph.style.color = phase === 'focus' ? '#7ab8ff' : '#6fe0b8';
    };
    function done() {
      if (phase === 'focus') {
        d.pomo[WB.today()] = (d.pomo[WB.today()] || 0) + focusMin;
        WB.save();
        WB.toast('专注完成 ' + focusMin + ' 分钟 🍅', 'ok');
        phase = 'break'; remain = breakMin * 60;
      } else {
        WB.toast('休息结束,开始下一个番茄', 'ok');
        phase = 'focus'; remain = focusMin * 60;
      }
      paint();
    }
    fm = { timer: setInterval(() => {
      if (paused) return;
      remain--;
      if (remain <= 0) done();
      paint();
    }, 1000) };
    paint();
    document.getElementById('fPause').addEventListener('click', () => {
      paused = !paused;
      document.getElementById('fPause').querySelector('path').setAttribute('d', paused ? 'M8 5v14M16 5v14'.replace('M16 5v14', 'M16 10v4') : 'M8 5v14M16 5v14');
    });
    document.getElementById('fSkip').addEventListener('click', done);
    document.getElementById('fStop').addEventListener('click', stopFocus);
  }

  function render(root) {
    const d = WB.data, t = WB.today();
    const open = d.todos.filter(x => !x.done);
    const doneCnt = d.todos.filter(x => x.done).length;
    const focusMin = d.pomo[t] || 0;
    root.innerHTML = '<div class="page-head"><div class="page-title">今日待办</div><div class="page-sub">轻重缓急四色分类 · 逾期自动标红 · 番茄专注</div></div>'
      // 快速新增
      + '<div class="card mb16"><div class="row" style="gap:10px">'
      + '<input class="input grow" id="todoQuick" placeholder="快速记下一个待办…" maxlength="60">'
      + '<button class="btn primary" id="todoAdd">添加</button>'
      + '<button class="btn" id="todoAddFull">详细 +</button></div>'
      + '<div class="row mt12" style="gap:8px">'
      + [['all', '全部'], ['open', '进行中'], ['done', '已完成'], ['overdue', '已逾期']].map(f =>
        '<button class="chip" data-f="' + f[0] + '" style="' + (filter === f[0] ? 'background:var(--accent);color:#fff' : '') + '">' + f[1] + '</button>').join('')
      + '</div>'
      + '<div class="row mt12" style="gap:8px">'
      + '<button class="btn sm grow" id="todoCompleteAll">✓ 全部完成</button>'
      + '<button class="btn sm grow" id="todoClearDone">清除已完成 (' + doneCnt + ')</button></div>'
      + '</div>'
      // 列表
      + '<div class="card"><div class="card-title"><h3>' + { all: '全部待办', open: '进行中', done: '已完成', overdue: '已逾期' }[filter] + '</h3>'
      + '<span class="badge">' + open.length + ' 项进行中</span></div>'
      + '<div class="list" id="todoList"></div></div>'
      // 番茄专注
      + '<div class="card mt16"><div class="card-title"><h3>🍅 番茄专注</h3><span class="badge">今日 ' + WB.fmtMin(focusMin) + '</span></div>'
      + '<div class="row" style="gap:20px;align-items:center">'
      + '<div id="pomoDonut" style="position:relative"></div>'
      + '<div style="flex:1;min-width:0">'
      + '<div class="form-row">'
      + '<div class="field"><label>专注(分钟)</label><input class="input" type="number" id="pmFocus" value="' + d.settings.pomodoroFocus + '" min="1" max="90"></div>'
      + '<div class="field"><label>休息(分钟)</label><input class="input" type="number" id="pmBreak" value="' + d.settings.pomodoroBreak + '" min="1" max="30"></div></div>'
      + '<button class="btn primary block" id="pmStart">开始专注</button>'
      + '<div class="small mt8">专注期间将屏蔽其他弹窗提醒,完成后自动计入今日复盘。</div>'
      + '</div></div></div>';

    // 番茄环形图
    const goal = 120; // 每日番茄目标 2 小时
    const box = document.getElementById('pomoDonut');
    WBChart.donut(box, { value: Math.min(focusMin, goal), total: goal, size: 118, color: WBChart.getColor('yellow') });
    box.insertAdjacentHTML('beforeend', '<div class="chart-center"><div class="num">' + focusMin + '</div><div class="cap">分钟 / ' + goal + '</div></div>');

    // 列表
    const listEl = document.getElementById('todoList');
    const items = filtered(d);
    if (!items.length) listEl.innerHTML = '<div class="empty"><svg viewBox="0 0 24 24" class="ic"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9.5"/></svg><p>' + (filter === 'done' ? '暂无已完成任务' : '这里空空如也') + '</p></div>';
    items.forEach(it => {
      const pi = priInfo(it);
      const overdue = !it.done && it.due && it.due < t;
      const row = document.createElement('div');
      row.className = 'list-row todo-row' + (it.done ? ' done-row' : '');
      row.dataset.skey = it.id;
      const bar = it.color || pi.c;
      row.innerHTML = '<button class="checkbox' + (it.done ? ' done' : '') + '" data-check><svg viewBox="0 0 24 24"><path d="M5 12l5 5 9-10"/></svg></button>'
        + '<span style="width:4px;height:30px;border-radius:3px;background:' + bar + ';flex:none"></span>'
        + '<div class="grow" style="min-width:0">'
        + '<div class="todo-text" style="font-size:14.5px;' + (it.done ? 'color:var(--ink-3)' : '') + (overdue ? ';color:var(--red);font-weight:600' : '') + '">' + WB.esc(it.text) + '</div>'
        + '<div class="row mt4 wrap" style="gap:6px">'
        + (it.tag ? '<span class="chip">#' + WB.esc(it.tag) + '</span>' : '')
        + (it.due ? '<span class="small">📅 ' + it.due + '</span>' : '')
        + (overdue ? '<span class="chip red">⚠ 已逾期 ' + WB.diffDaysFromToday(it.due) + ' 天</span>' : '')
        + (it.note ? '<span class="small">💬 ' + WB.esc(it.note.slice(0, 18)) + '</span>' : '')
        + '</div></div>'
        + '<button class="iconbtn" data-edit style="width:32px;height:32px"><svg viewBox="0 0 24 24" class="ic" style="width:16px;height:16px"><path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17z"/></svg></button>';
      // 勾选完成(动画)
      row.querySelector('[data-check]').addEventListener('click', () => {
        if (it.done) { // 撤销完成
          it.done = false; it.doneAt = null; WB.save(); WB.forceRender('todo'); return;
        }
        animateDone(row, () => { it.done = true; it.doneAt = new Date().toISOString(); WB.save(); WB.forceRender('todo'); });
      });
      row.querySelector('[data-edit]').addEventListener('click', e => { e.stopPropagation(); openEdit(it); });
      row.addEventListener('click', e => { if (!e.target.closest('.checkbox')) openEdit(it); });
      listEl.appendChild(row);
    });

    // 事件
    root.querySelector('#todoQuick').addEventListener('keydown', e => { if (e.key === 'Enter') quickAdd(); });
    root.querySelector('#todoAdd').addEventListener('click', quickAdd);
    root.querySelector('#todoAddFull').addEventListener('click', openAdd);
    root.querySelectorAll('[data-f]').forEach(b => b.addEventListener('click', () => { filter = b.dataset.f; WB.forceRender('todo'); }));
    root.querySelector('#todoCompleteAll').addEventListener('click', completeAll);
    root.querySelector('#todoClearDone').addEventListener('click', clearDone);
    root.querySelector('#pmStart').addEventListener('click', () => {
      const f = Math.max(1, Math.min(90, Number(root.querySelector('#pmFocus').value) || 25));
      const b = Math.max(1, Math.min(30, Number(root.querySelector('#pmBreak').value) || 5));
      d.settings.pomodoroFocus = f; d.settings.pomodoroBreak = b; WB.save();
      startFocus(f, b);
    });

    function quickAdd() {
      const v = (root.querySelector('#todoQuick').value || '').trim();
      if (!v) return WB.toast('输入内容后回车添加', 'warn');
      d.todos.unshift({ id: WB.uid('t'), text: v, tag: '', note: '', due: t, pri: 3, color: '', done: false, doneAt: null, createdAt: t });
      WB.save(); WB.toast('已添加 ✓', 'ok');
      root.querySelector('#todoQuick').value = '';
      WB.forceRender('todo');
    }
  }

  WB.register('todo', { render, refresh: render });
})();
