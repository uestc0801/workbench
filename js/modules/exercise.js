/* ═══════════════════════════════════════════════
   今日运动:体重折线图(7/30天) + 运动打卡 + 减脂鼓励语
   ═══════════════════════════════════════════════ */
(function () {
  'use strict';

  const ENCOURAGE = [
    '今天流的每一滴汗,都在雕刻更喜欢的自己 💪',
    '不必急于求成,慢慢来,身体会记住你的坚持。',
    '每一次迈步,都是在和更好的自己相遇。',
    '别小看今天的 20 分钟,它是明天的底气。',
    '你想要的轻盈,藏在每一天的自律里 🌱',
    '减脂是场持久战,温柔地坚持,别太苛责自己。',
    '动起来的那一刻,你已经赢了大多数人。',
    '把运动变成习惯,而不是任务。',
    '汗水不会辜负你,时间会给你答案 ⏳',
    '今天的自己,比昨天多努力一点点就好。',
    '健康的身体,是对未来最好的投资。',
    '累了就休息,但别放弃,明天继续。',
  ];
  const TYPES = ['跑步', '快走', '跳绳', '瑜伽', '力量训练', '游泳', '骑行', '球类', '拉伸', '其他'];

  function pickLine(dateStr) {
    return WB.pick(ENCOURAGE, WB.hashStr(dateStr));
  }

  function weightSeries(d, n) {
    const t = WB.today();
    const out = [];
    for (let i = n - 1; i >= 0; i--) {
      const ds = WB.addDays(t, -i);
      const w = (d.exercise[ds] || {}).weight;
      if (w) out.push({ label: ds.slice(5), value: w });
    }
    return out;
  }

  function render(root) {
    const d = WB.data, t = WB.today();
    const today = d.exercise[t] || {};
    const target = d.settings.exerciseGoalWeight;
    const latest = weightSeries(d, 30).slice(-1)[0];
    const diff = target && latest ? (latest.value - target).toFixed(1) : null;

    root.innerHTML = '<div class="page-head"><div class="page-title">今日运动</div><div class="page-sub">体重追踪 · 运动打卡 · 每日鼓励</div></div>'
      // 鼓励语
      + '<div class="card mb16" style="background:linear-gradient(135deg,var(--orange-soft),var(--mint-soft));border-color:transparent">'
      + '<div class="row" style="gap:12px"><svg viewBox="0 0 24 24" class="ic" style="width:30px;height:30px;color:var(--orange)"><path d="M12 21s-7-4.6-9-9.5C1.8 8 4 4.5 7.5 4.5c2 0 3.4 1 4.5 2.6 1.1-1.6 2.5-2.6 4.5-2.6C20 4.5 22.2 8 21 11.5 19 16.4 12 21 12 21z"/></svg>'
      + '<div class="grow"><div class="semibold" style="font-size:15px;line-height:1.7">' + pickLine(t) + '</div>'
      + '<div class="small mt4">今日份治愈 · 每天自动轮换</div></div></div></div>'
      // 数据卡
      + '<div class="grid g2 mb16">'
      + '<div class="card"><div class="card-title"><h3>当前体重</h3><span class="badge">最近记录</span></div>'
      + (latest
        ? '<div class="stat-tile"><span class="val" style="font-size:34px">' + latest.value + '<small> kg</small></span>'
          + '<span class="small">' + latest.label + ' 记录</span></div>'
          + (diff !== null ? '<div class="mt8"><span class="chip ' + (diff <= 0 ? 'mint' : 'orange') + '">' + (diff <= 0 ? '已达标 ↓ ' + Math.abs(diff) : '距离目标还差 ' + diff) + ' kg</span></div>' : '')
        : '<div class="empty"><p>还没有体重记录</p></div>')
      + '<div class="form-row mt12"><div class="field"><label>记录今日体重(kg)</label><input class="input" type="number" id="exWeight" step="0.1" value="' + (today.weight || '') + '"></div>'
      + '<div class="field"><label>目标体重(kg)</label><input class="input" type="number" id="exTarget" step="0.1" value="' + (target || '') + '"></div></div>'
      + '<button class="btn primary block" id="exSaveWeight">保存体重</button>'
      + '</div>'
      // 运动打卡
      + '<div class="card"><div class="card-title"><h3>今日运动打卡</h3><span class="badge">' + WB.fmtMin(today.min || 0) + '</span></div>'
      + '<div class="field"><label>运动类型</label><select class="select" id="exType">' + TYPES.map(x => '<option ' + (today.type === x ? 'selected' : '') + '>' + x + '</option>').join('') + '</select></div>'
      + '<div class="field"><label>运动时长(分钟)</label><input class="input" type="number" id="exMin" value="' + (today.min || 0) + '" min="0"></div>'
      + '<div class="row" style="gap:8px;flex-wrap:wrap">' + [15, 30, 45, 60].map(v => '<button class="btn sm" data-q="' + v + '">+' + v + ' 分钟</button>').join('') + '</div>'
      + '<button class="btn primary block mt12" id="exSave">打卡保存</button>'
      + '<div class="q3-box mt16"><div class="q">运动提醒</div>'
      + '<div class="row mt8" style="gap:8px"><input class="input" type="time" id="exTime" value="' + ((d.settings.reminders.find(x => x.type === 'exercise') || {}).time || '19:00') + '" style="flex:0 0 110px">'
      + '<label class="grow" style="display:flex;align-items:center;gap:8px;font-size:13px"><input type="checkbox" id="exOn" ' + ((d.settings.reminders.find(x => x.type === 'exercise') || {}).enabled ? 'checked' : '') + '> 启用</label></div>'
      + '<button class="btn sm soft mt8" id="exSaveRemind">保存提醒</button></div>'
      + '</div></div>'
      // 折线图
      + '<div class="card"><div class="card-title"><h3>体重变化</h3>'
      + '<div class="right"><div class="seg" id="exRange"><button data-n="7" class="active">近 7 天</button><button data-n="30">近 30 天</button></div></div></div>'
      + '<div id="exLine"></div>'
      + (target ? '<div class="legend mt8"><span><i class="sw" style="background:' + WBChart.getColor('accent') + '"></i>体重(kg)</span><span class="small">目标 ' + target + ' kg</span></div>' : '')
      + '</div>';

    // 折线图
    const drawLine = n => {
      const data = weightSeries(d, n);
      const c = document.getElementById('exLine');
      WBChart.line(c, { data, height: 240, unit: 'kg', color: WBChart.getColor('accent') });
    };
    drawLine(7);
    root.querySelectorAll('#exRange button').forEach(b => b.addEventListener('click', () => {
      root.querySelectorAll('#exRange button').forEach(x => x.classList.toggle('active', x === b));
      drawLine(Number(b.dataset.n));
    }));

    // 事件
    root.querySelector('#exSaveWeight').addEventListener('click', () => {
      const w = Number(root.querySelector('#exWeight').value);
      const tg = Number(root.querySelector('#exTarget').value);
      if (!w || w <= 20) return WB.toast('请输入正确的体重', 'warn');
      d.exercise[t] = Object.assign({}, d.exercise[t] || {}, { weight: w });
      if (tg > 0) d.settings.exerciseGoalWeight = tg;
      WB.save(); WB.toast('体重已记录 ⚖️', 'ok'); WB.forceRender('exercise');
    });
    root.querySelectorAll('[data-q]').forEach(b => b.addEventListener('click', () => {
      root.querySelector('#exMin').value = (Number(root.querySelector('#exMin').value) || 0) + Number(b.dataset.q);
    }));
    root.querySelector('#exSave').addEventListener('click', () => {
      const min = Number(root.querySelector('#exMin').value) || 0;
      const type = root.querySelector('#exType').value;
      if (!min && !today.min) return WB.toast('请输入运动时长', 'warn');
      d.exercise[t] = Object.assign({}, d.exercise[t] || {}, { min: min || 0, type });
      WB.save(); WB.toast('运动打卡成功 🎽', 'ok'); WB.forceRender('exercise');
    });
    root.querySelector('#exSaveRemind').addEventListener('click', () => {
      const r = d.settings.reminders.find(x => x.type === 'exercise');
      if (r) { r.time = root.querySelector('#exTime').value; r.enabled = root.querySelector('#exOn').checked; }
      WB.save(); WB.toast('提醒已保存 🔔', 'ok');
    });
  }

  WB.register('exercise', { render, refresh: render });
})();
