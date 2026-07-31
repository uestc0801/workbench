/* ═══════════════════════════════════════════════
   日历模块:月度日历(标记日) + 道教黄历 + 星座运势
   + 配套:新建待办 / 设置定时提醒
   ═══════════════════════════════════════════════ */
(function () {
  'use strict';

  let cur = new Date();
  let sel = WB.today();

  function marks(dateStr) {
    const d = WB.data;
    const m = { todo: false, read: false, exercise: false };
    if ((d.todos || []).some(t => t.due === dateStr && !t.done)) m.todo = true;
    if (d.readLog[dateStr]) m.read = true;
    if (d.exercise[dateStr] && d.exercise[dateStr].min) m.exercise = true;
    return m;
  }

  function renderCal(root, month) {
    const y = month.getFullYear(), mo = month.getMonth();
    const first = new Date(y, mo, 1);
    const startOffset = (first.getDay() + 6) % 7; // 周一为首
    const daysInMonth = new Date(y, mo + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(WB.dStr(new Date(y, mo, d)));
    while (cells.length % 7) cells.push(null);
    const t = WB.today();
    const box = document.getElementById('calGrid');
    box.innerHTML = '<div class="cal-week">' + ['一', '二', '三', '四', '五', '六', '日'].map(w => '<span>' + w + '</span>').join('') + '</div>'
      + '<div class="cal-grid">' + cells.map(cs => {
        if (!cs) return '<div class="cal-cell other"></div>';
        const dnum = Number(cs.slice(8));
        const lunar = Lunar.solar2lunar(WB.fromStr(cs));
        const isToday = cs === t;
        const isSel = cs === sel;
        const mk = marks(cs);
        return '<div class="cal-cell' + (isToday ? ' today' : '') + (isSel ? ' selected' : '') + '" data-date="' + cs + '">'
          + dnum + '<div class="cn">' + (lunar && lunar.day === 1 ? '·' + (lunar.isLeap ? '闰' : '') + MON[lunar.month - 1].slice(0, 1) : (lunar ? lunar.day === 15 ? '·十五' : '' : '')) + '</div>'
          + (mk.todo || mk.read || mk.exercise ? '<div class="cal-dots">'
            + (mk.todo ? '<i style="background:var(--red)"></i>' : '')
            + (mk.read ? '<i style="background:var(--mint)"></i>' : '')
            + (mk.exercise ? '<i style="background:var(--orange)"></i>' : '')
            + '</div>' : '')
          + '</div>';
      }).join('') + '</div>';
    document.getElementById('calMonthLabel').textContent = WB.monthLabel(WB.dStr(month)) + ' · ' + Lunar.solar2lunar(first).lunarStr.split('月')[0] + '月';
    box.querySelectorAll('.cal-cell[data-date]').forEach(c => {
      c.addEventListener('click', () => { sel = c.dataset.date; renderCal(root, month); renderAlmanac(root, sel); });
    });
  }

  const MON = ['正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '冬月', '腊月'];

  function renderAlmanac(root, dateStr) {
    const date = WB.fromStr(dateStr);
    const lunar = Lunar.daily(date);
    const box = document.getElementById('almanacBox');
    if (!lunar) { box.innerHTML = '<div class="empty">暂不支持</div>'; return; }
    const d = Lunar.solar2lunar(date);
    const zodiac = Lunar.signFortune(WB.data.settings.sign || '白羊座', dateStr);
    box.innerHTML = ''
      // ── 黄历 ──
      + '<div class="card fade-in"><div class="card-title"><h3>📜 黄历 · ' + dateStr + '</h3>'
      + '<span class="badge" style="background:' + (lunar.dao.isHuang ? 'var(--mint-soft)' : 'var(--red-soft)') + ';color:' + (lunar.dao.isHuang ? 'var(--mint)' : 'var(--red)') + '">' + (lunar.dao.isHuang ? '黄道吉日' : '黑道日') + '</span></div>'
      + '<div class="almanac">'
      + aItem('农历', lunar.lunarStr + (lunar.term ? ' · ' + lunar.term : ''))
      + aItem('干支', lunar.gzYear + '年 ' + lunar.gzMonth + '月 ' + lunar.gzDay + '日')
      + aItem('生肖', lunar.animal + '年')
      + aItem('值日', lunar.dao.name + ' · ' + (lunar.dao.isHuang ? '宜行事' : '宜静养'))
      + aItem('冲煞', lunar.chong + ' · ' + lunar.sha)
      + aItem('财神', lunar.caishen + '方')
      + '</div>'
      + '<div class="row mt12 wrap"><span class="chip mint">宜</span>' + lunar.yi.map(x => '<span class="yi">' + x + '</span>').join('')
      + '</div><div class="row mt8 wrap"><span class="chip red">忌</span>' + lunar.ji.map(x => '<span class="ji">' + x + '</span>').join('') + '</div>'
      + '</div>'
      // ── 星座运势 ──
      + '<div class="card mt16 fade-in"><div class="card-title"><h3>🔮 ' + zodiac.sign + ' · 今日运势</h3><span class="badge">幸运色 ' + zodiac.luckyColor + ' · 幸运数字 ' + zodiac.luckyNum + '</span></div>'
      + '<div class="grid g2">'
      + horo('整体', zodiac.overall, 'var(--accent)')
      + horo('事业', zodiac.career, 'var(--orange)')
      + horo('学习', zodiac.study, 'var(--mint)')
      + horo('健康', zodiac.health, 'var(--yellow)')
      + '</div><div class="mt12 small">今日宜投缘星座:' + zodiac.match + ' · 可在设置中更换你的星座</div></div>';
  }

  function aItem(k, v) { return '<div class="a-item"><div class="k">' + k + '</div><div class="v">' + v + '</div></div>'; }
  function horo(t, txt, c) {
    return '<div class="q3-box" style="border-left:3px solid ' + c + '"><div class="q">' + t + '</div><div style="font-size:13px;line-height:1.7">' + txt + '</div></div>';
  }

  /* ── 新建待办 modal ── */
  function openTodoModal() {
    const html = '<h4>新建待办</h4>'
      + '<div class="field"><label>任务内容</label><input class="input" data-field="text" placeholder="要做什么?" maxlength="60"></div>'
      + '<div class="form-row">'
      + '<div class="field"><label>优先级</label><select class="select" data-field="pri">'
      + '<option value="1">🔴 紧急重要</option><option value="2">🟠 重要不紧急</option>'
      + '<option value="3" selected>🔵 紧急不重要</option><option value="4">⚪ 普通琐事</option></select></div>'
      + '<div class="field"><label>截止时间</label><input class="input" type="date" data-field="due" value="' + sel + '"></div>'
      + '</div>'
      + '<div class="field"><label>标签</label><input class="input" data-field="tag" placeholder="如:工作 / 学习 / 生活" maxlength="12"></div>'
      + '<div class="field"><label>备注</label><textarea class="textarea" data-field="note" placeholder="补充说明(可选)"></textarea></div>'
      + '<div class="m-actions"><button class="btn" id="mCancel">取消</button><button class="btn primary" id="mOk">创建</button></div>';
    const box = WB.openModal(html);
    box.querySelector('#mCancel').addEventListener('click', WB.closeModal);
    box.querySelector('#mOk').addEventListener('click', () => {
      const f = WB.readForm(box);
      if (!f.text.trim()) return WB.toast('请输入任务内容', 'warn');
      WB.data.todos.unshift({ id: WB.uid('t'), text: f.text.trim(), tag: f.tag, note: f.note, due: f.due, pri: Number(f.pri), color: '', done: false, doneAt: null, createdAt: WB.today() });
      WB.save(); WB.closeModal(); WB.toast('待办已创建 ✓', 'ok');
      WB.forceRender('calendar');
    });
  }

  /* ── 提醒设置 modal ── */
  function openRemindModal() {
    const d = WB.data;
    const list = d.settings.reminders.filter(r => r.type !== 'deep');
    const html = '<h4>每日定时提醒</h4><div class="small mb12" style="line-height:1.6">保持页面打开时生效(30 秒内检测);已授权系统通知则额外推送。</div>'
      + list.map(r => '<div class="row mb8" style="gap:10px">'
        + '<span class="grow" style="font-size:13.5px">' + WB.esc(r.label) + '</span>'
        + '<input type="time" data-time="' + r.id + '" value="' + r.time + '" style="font-size:13px">'
        + '<input type="checkbox" data-on="' + r.id + '" ' + (r.enabled ? 'checked' : '') + '></div>').join('')
      + '<div class="m-actions"><button class="btn" id="mCancel">取消</button><button class="btn primary" id="mOk">保存</button></div>';
    const box = WB.openModal(html);
    box.querySelector('#mCancel').addEventListener('click', WB.closeModal);
    box.querySelector('#mOk').addEventListener('click', () => {
      box.querySelectorAll('[data-time]').forEach(el => { const r = d.settings.reminders.find(x => x.id === el.dataset.time); if (r) r.time = el.value; });
      box.querySelectorAll('[data-on]').forEach(el => { const r = d.settings.reminders.find(x => x.id === el.dataset.on); if (r) r.enabled = el.checked; });
      WB.save(); WB.closeModal(); WB.toast('提醒已保存 🔔', 'ok');
    });
  }

  function render(root) {
    root.innerHTML = '<div class="page-head"><div class="page-title">日历</div><div class="page-sub">标记待办截止 · 阅读计划 · 运动打卡日</div></div>'
      // 月度日历
      + '<div class="card"><div class="card-title">'
      + '<button class="iconbtn" id="calPrev"><svg viewBox="0 0 24 24" class="ic"><path d="M15 5l-7 7 7 7"/></svg></button>'
      + '<h3 id="calMonthLabel"></h3>'
      + '<div class="right"><button class="btn sm" id="calToday">今天</button>'
      + '<button class="iconbtn" id="calNext"><svg viewBox="0 0 24 24" class="ic"><path d="M9 5l7 7-7 7"/></svg></button></div></div>'
      + '<div id="calGrid"></div>'
      + '<div class="row mt12 wrap" style="gap:14px;font-size:12px;color:var(--ink-2)">'
      + '<span><i style="width:8px;height:8px;border-radius:50%;background:var(--accent);display:inline-block"></i> 今日</span>'
      + '<span><i style="width:8px;height:8px;border-radius:50%;background:var(--red);display:inline-block"></i> 待办截止</span>'
      + '<span><i style="width:8px;height:8px;border-radius:50%;background:var(--mint);display:inline-block"></i> 阅读日</span>'
      + '<span><i style="width:8px;height:8px;border-radius:50%;background:var(--orange);display:inline-block"></i> 运动日</span></div>'
      + '</div>'
      + '<div class="row mt16" style="gap:10px">'
      + '<button class="btn primary grow" id="calAddTodo">+ 新建待办</button>'
      + '<button class="btn grow" id="calRemind">🔔 定时提醒设置</button>'
      + '</div>'
      + '<div id="almanacBox" class="mt16"></div>';

    renderCal(root, cur);
    renderAlmanac(root, sel);

    root.querySelector('#calPrev').addEventListener('click', () => { cur = new Date(cur.getFullYear(), cur.getMonth() - 1, 1); renderCal(root, cur); });
    root.querySelector('#calNext').addEventListener('click', () => { cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1); renderCal(root, cur); });
    root.querySelector('#calToday').addEventListener('click', () => { cur = new Date(); sel = WB.today(); renderCal(root, cur); renderAlmanac(root, sel); });
    root.querySelector('#calAddTodo').addEventListener('click', openTodoModal);
    root.querySelector('#calRemind').addEventListener('click', openRemindModal);
  }

  WB.register('calendar', { render, refresh: render });
})();
