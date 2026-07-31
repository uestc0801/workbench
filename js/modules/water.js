/* ═══════════════════════════════════════════════
   喝水时间:目标水量圆环 + 快捷打卡 + 近7天柱状图 + 定时提醒
   ═══════════════════════════════════════════════ */
(function () {
  'use strict';

  function render(root) {
    const d = WB.data, t = WB.today();
    const goal = d.settings.waterGoal || 2000;
    const now = d.water[t] || 0;
    const pct = Math.min(100, Math.round(now / goal * 100));
    const r = d.settings.reminders.find(x => x.type === 'water');

    root.innerHTML = '<div class="page-head"><div class="page-title">喝水时间</div><div class="page-sub">目标 ' + WB.fmtMl(goal) + ' · 数据自动同步至每日复盘</div></div>'
      + '<div class="grid g-main-side mb16">'
      // 圆环
      + '<div class="card"><div class="card-title"><h3>今日饮水进度</h3><span class="badge">' + pct + '%</span></div>'
      + '<div class="row" style="gap:26px;align-items:center;justify-content:center;flex-wrap:wrap">'
      + '<div id="wtDonut" style="position:relative"></div>'
      + '<div style="min-width:150px">'
      + '<div class="stat-tile mb8"><span class="lbl">已摄入</span><span class="val" style="font-size:28px">' + now + '</span><span class="small">ml</span></div>'
      + '<div class="stat-tile"><span class="lbl">还需</span><span class="val" style="font-size:22px;color:var(--mint)">' + Math.max(0, goal - now) + '</span><span class="small">ml</span></div>'
      + '</div></div>'
      + '<div class="row mt16" style="gap:8px">'
      + [200, 300, 500].map(v => '<button class="btn grow" data-add="' + v + '" style="background:var(--mint-soft);border-color:transparent;color:var(--mint)">+ ' + v + ' ml</button>').join('')
      + '</div>'
      + '<div class="row mt12" style="gap:8px"><input class="input grow" type="number" id="wtManual" placeholder="手动输入 ml" min="1">'
      + '<button class="btn" id="wtAdd">记录</button></div>'
      + '</div>'
      // 目标 & 提醒
      + '<div class="card"><div class="card-title"><h3>目标 & 提醒</h3></div>'
      + '<div class="field"><label>每日目标饮水量(ml)</label><div class="row" style="gap:8px"><input class="input grow" type="number" id="wtGoal" value="' + goal + '" min="100" step="100">'
      + '<button class="btn" id="wtSaveGoal">保存</button></div></div>'
      + '<div class="q3-box mt12"><div class="q">定时喝水提醒</div>'
      + '<div class="row mt8" style="gap:8px"><input class="input" type="time" id="wtTime" value="' + (r ? r.time : '09:30') + '" style="flex:0 0 110px">'
      + '<label class="grow" style="display:flex;align-items:center;gap:8px;font-size:13px"><input type="checkbox" id="wtOn" ' + (r && r.enabled ? 'checked' : '') + '> 启用提醒</label></div>'
      + '<button class="btn sm soft mt8" id="wtSaveRemind">保存提醒</button>'
      + '<div class="small mt8">到点弹窗提醒,需保持页面打开。</div></div>'
      + '<div class="q3-box mt12"><div class="q">喝水小贴士</div><div class="small" style="line-height:1.8">每次约 200-300ml,少量多次;运动后、久坐后记得补水;可以早起先喝一杯温水唤醒身体。</div></div>'
      + '</div></div>'
      // 近 7 天
      + '<div class="card"><div class="card-title"><h3>近 7 天饮水量</h3></div><div id="wtBars"></div>'
      + '<div class="legend mt8"><span><i class="sw" style="background:' + WBChart.getColor('accent') + '"></i>每日摄入(ml)</span></div></div>';

    // 圆环
    const box = document.getElementById('wtDonut');
    WBChart.donut(box, { value: now, total: goal, size: 150, color: WBChart.getColor('mint') });
    box.insertAdjacentHTML('beforeend', '<div class="chart-center"><div class="num" style="color:var(--mint)">' + pct + '%</div><div class="cap">今日目标</div></div>');
    // 柱状图
    const bars = [];
    for (let i = 6; i >= 0; i--) {
      const ds = WB.addDays(t, -i);
      bars.push({ label: ds.slice(5).replace('-', '/'), value: d.water[ds] || 0 });
    }
    WBChart.bars(document.getElementById('wtBars'), { data: bars, height: 200, unit: 'ml', colors: { __: WBChart.getColor('accent') } });

    // 事件
    const addW = v => {
      d.water[t] = (d.water[t] || 0) + v;
      WB.save(); WB.toast('+' + v + ' ml 💧', 'ok'); WB.forceRender('water');
    };
    root.querySelectorAll('[data-add]').forEach(b => b.addEventListener('click', () => addW(Number(b.dataset.add))));
    root.querySelector('#wtAdd').addEventListener('click', () => {
      const v = Number(root.querySelector('#wtManual').value);
      if (!v || v <= 0) return WB.toast('请输入正确的毫升数', 'warn');
      addW(v); root.querySelector('#wtManual').value = '';
    });
    root.querySelector('#wtSaveGoal').addEventListener('click', () => {
      const v = Number(root.querySelector('#wtGoal').value);
      if (v < 100) return WB.toast('目标至少 100ml', 'warn');
      d.settings.waterGoal = v; WB.save(); WB.toast('目标已更新 ✓', 'ok'); WB.forceRender('water');
    });
    root.querySelector('#wtSaveRemind').addEventListener('click', () => {
      const r = d.settings.reminders.find(x => x.type === 'water');
      if (r) { r.time = root.querySelector('#wtTime').value; r.enabled = root.querySelector('#wtOn').checked; }
      WB.save(); WB.toast('提醒已保存 🔔', 'ok');
    });
  }

  WB.register('water', { render, refresh: render });
})();
