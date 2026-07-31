/* ═══════════════════════════════════════════════
   图表库:SVG 环形图 / 柱状图 / 折线图 / 迷你图 / 进度条
   遵循数据可视化规范:薄线条、圆角数据端、surface ring、hover tooltip
   ═══════════════════════════════════════════════ */
(function () {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  function svg(tag, attrs, parent) {
    const el = document.createElementNS(NS, tag);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(el);
    return el;
  }
  function getColor(name) {
    const light = { accent: '#2a78d6', orange: '#eb6834', mint: '#1baf7a', yellow: '#eda100', red: '#e34948' };
    const dark = { accent: '#3987e5', orange: '#d95926', mint: '#199e70', yellow: '#c98500', red: '#e66767' };
    return (document.documentElement.getAttribute('data-theme') === 'dark' ? dark : light)[name] || name;
  }
  function ink(muted) { // 文字色始终用 ink 变量
    return getComputedStyle(document.documentElement).getPropertyValue(muted ? '--ink-3' : '--ink-2').trim() || '#8b93a5';
  }
  function surface() { return getComputedStyle(document.documentElement).getPropertyValue('--bg-1').trim() || '#f2f5fa'; }

  // 全局复用 tooltip
  let tip = null;
  function getTip() {
    if (!tip || !tip.isConnected) {
      tip = document.createElement('div');
      tip.className = 'chart-tip';
      document.body.appendChild(tip);
    }
    return tip;
  }
  function showTip(x, y, html) {
    const t = getTip();
    t.innerHTML = html;
    t.classList.add('show');
    t.style.left = x + 'px';
    t.style.top = y + 'px';
  }
  function hideTip() { if (tip) tip.classList.remove('show'); }

  /* ───────── 环形图 ───────── */
  function donut(el, opts) {
    opts = opts || {};
    const size = opts.size || 150;
    const stroke = opts.stroke || 13;
    const color = opts.color || getColor('accent');
    const trackColor = opts.track || 'var(--line-strong)';
    el.innerHTML = '';
    el.style.width = size + 'px';
    el.style.height = size + 'px';
    const sv = svg('svg', { viewBox: '0 0 ' + size + ' ' + size, width: size, height: size });
    el.appendChild(sv);
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const cx = size / 2, cy = size / 2;
    const track = svg('circle', { cx, cy, r, fill: 'none', stroke: trackColor, 'stroke-width': stroke });
    const ring = svg('circle', { cx, cy, r, fill: 'none', stroke: color, 'stroke-width': stroke, 'stroke-linecap': 'round',
      'stroke-dasharray': c, 'stroke-dashoffset': c, transform: 'rotate(-90 ' + cx + ' ' + cy + ')' });
    sv.appendChild(track); sv.appendChild(ring);
    function set(v, total) {
      const p = total > 0 ? Math.min(1, Math.max(0, v / total)) : 0;
      requestAnimationFrame(() => {
        ring.style.transition = 'stroke-dashoffset 1s ' + opts.ease || 'cubic-bezier(.32,.72,.38,1)';
        ring.setAttribute('stroke-dashoffset', c * (1 - p));
      });
      return p;
    }
    set(opts.value || 0, opts.total || 0);
    return { el: sv, set };
  }

  /* ───────── 横向进度条 ───────── */
  function meter(el, opts) {
    opts = opts || {};
    el.classList.add('meter');
    el.innerHTML = '<div class="meter-track"><div class="meter-fill"></div></div>';
    const fill = el.querySelector('.meter-fill');
    fill.style.background = opts.color || getColor('accent');
    const set = (v, total) => {
      const p = total > 0 ? Math.min(1, Math.max(0, v / total)) : 0;
      requestAnimationFrame(() => { fill.style.width = (p * 100) + '%'; });
      return p;
    };
    set(opts.value || 0, opts.total || 0);
    return { set };
  }

  /* ───────── 柱状图 ───────── */
  function bars(el, opts) {
    opts = opts || {};
    const data = opts.data || [];
    const h = opts.height || 180;
    const unit = opts.unit || '';
    const colors = opts.colors || {};
    el.innerHTML = '';
    const w = Math.max(el.clientWidth || 320, 160);
    const ml = 8, mr = 8, mt = 16, mb = 26;
    const plotW = w - ml - mr, plotH = h - mt - mb;
    const sv = svg('svg', { width: w, height: h, viewBox: '0 0 ' + w + ' ' + h });
    el.appendChild(sv);
    if (!data.length) { svg('text', { x: w / 2, y: h / 2, 'text-anchor': 'middle', fill: ink(true), 'font-size': 12 }, sv); return; }
    const max = Math.max(1, ...data.map(d => d.value));
    const n = data.length;
    const slot = plotW / n;
    const bw = Math.min(24, slot * 0.56);
    const gap = Math.max(2, (slot - bw) * 0.6); // 2px surface gap 规则
    // 网格
    [0.25, 0.5, 0.75].forEach(frac => {
      const y = mt + plotH * (1 - frac);
      svg('line', { x1: ml, x2: w - mr, y1: y, y2: y, stroke: 'var(--line)', 'stroke-width': 1 }, sv);
      const tl = svg('text', { x: ml - 5, y: y + 4, 'text-anchor': 'end', fill: ink(true), 'font-size': 10, class: 'axis-label' }, sv);
      tl.textContent = Math.round(max * frac) + unit;
    });
    // baseline
    svg('line', { x1: ml, x2: w - mr, y1: mt + plotH, y2: mt + plotH, stroke: 'var(--line-strong)', 'stroke-width': 1 }, sv);
    const hit = svg('rect', { x: ml, y: mt, width: plotW, height: plotH, fill: 'transparent' }, sv);
    const marks = data.map((d, i) => {
      const x = ml + i * slot + (slot - bw) / 2;
      const bh = Math.max(2, (d.value / max) * plotH);
      const y = mt + plotH - bh;
      const color = colors[d.key || d.label] || (d.color) || getColor('accent');
      const rect = svg('rect', { x, y, width: bw, height: bh, rx: 4, fill: color, opacity: 0.92 });
      sv.appendChild(rect);
      // 下轴标签
      const xl = svg('text', { x: x + bw / 2, y: h - 8, 'text-anchor': 'middle', fill: ink(true), 'font-size': 10.5 }, sv);
      xl.textContent = String(d.label);
      return { d, x, y, bw, bh, rect };
    });
    hit.addEventListener('mousemove', ev => {
      const rect = el.getBoundingClientRect();
      const mx = ev.clientX - rect.left - ml;
      const idx = Math.max(0, Math.min(n - 1, Math.floor(mx / slot)));
      marks.forEach((m, i) => { m.rect.setAttribute('opacity', i === idx ? 1 : 0.45); });
      const m = marks[idx];
      showTip(ev.clientX, ev.clientY, '<b>' + m.d.label + '</b> · ' + m.d.value + unit);
      sv.setAttribute('style', 'cursor:pointer');
    });
    hit.addEventListener('mouseleave', () => {
      marks.forEach(m => m.rect.setAttribute('opacity', 0.92));
      hideTip();
    });
    return sv;
  }

  /* ───────── 折线图 ───────── */
  function line(el, opts) {
    opts = opts || {};
    let data = opts.data || [];
    const h = opts.height || 200;
    const color = opts.color || getColor('accent');
    const unit = opts.unit || '';
    const fill = opts.fill !== false;
    const dots = opts.dots !== false;
    el.innerHTML = '';
    if (!data.length) {
      el.innerHTML = '<div class="empty"><p>暂无数据</p></div>';
      return;
    }
    const w = Math.max(el.clientWidth || 320, 160);
    const ml = 8, mr = 10, mt = 18, mb = 26;
    const plotW = w - ml - mr, plotH = h - mt - mb;
    const sv = svg('svg', { width: w, height: h, viewBox: '0 0 ' + w + ' ' + h });
    el.appendChild(sv);
    const vals = data.map(d => d.value);
    const max = Math.max(...vals), min = Math.min(...vals);
    const pad = Math.max((max - min) * 0.18, max * 0.08, 1);
    const top = min - pad, span = Math.max(max + pad - top, 0.0001);
    const X = i => ml + (data.length === 1 ? plotW / 2 : (i / (data.length - 1)) * plotW);
    const Y = v => mt + plotH - ((v - top) / span) * plotH;
    // 网格 + y 刻度
    [0, 0.5, 1].forEach(frac => {
      const y = mt + plotH * frac;
      const v = top + (1 - frac) * span;
      svg('line', { x1: ml, x2: w - mr, y1: y, y2: y, stroke: 'var(--line)', 'stroke-width': 1 }, sv);
      const tl = svg('text', { x: ml - 5, y: y + 4, 'text-anchor': 'end', fill: ink(true), 'font-size': 10, class: 'axis-label' }, sv);
      tl.textContent = Math.round(v) + unit;
    });
    // x 轴标签(稀疏)
    const step = Math.max(1, Math.ceil(data.length / 6));
    data.forEach((d, i) => {
      if (i % step === 0 || i === data.length - 1) {
        const xl = svg('text', { x: X(i), y: h - 8, 'text-anchor': 'middle', fill: ink(true), 'font-size': 10.5 }, sv);
        xl.textContent = String(d.label);
      }
    });
    // area + line path
    const pts = data.map((d, i) => X(i) + ',' + Y(d.value)).join(' ');
    if (fill && data.length > 1) {
      const area = ml + ' ' + (mt + plotH) + ' ' + pts + ' ' + (w - mr) + ' ' + (mt + plotH);
      svg('polygon', { points: area, fill: color, opacity: 0.1 }, sv);
    }
    if (data.length > 1) {
      svg('polyline', { points: pts, fill: 'none', stroke: color, 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, sv);
    }
    // 数据点(surface ring)
    const dotEls = data.map((d, i) => {
      if (!dots) return null;
      const g = svg('g', {}, sv);
      svg('circle', { cx: X(i), cy: Y(d.value), r: 4.5, fill: color, stroke: surface(), 'stroke-width': 2.5 }, g);
      svg('circle', { cx: X(i), cy: Y(d.value), r: 8, fill: 'transparent' }, g);
      return g;
    });
    // hover 十字线
    const vline = svg('line', { x1: 0, y1: mt, x2: 0, y2: mt + plotH, stroke: 'var(--ink-3)', 'stroke-width': 1, opacity: 0, 'stroke-dasharray': '3 3' }, sv);
    const hline = svg('line', { x1: ml, y1: 0, x2: w - mr, y2: 0, stroke: 'var(--ink-3)', 'stroke-width': 1, opacity: 0 }, sv);
    const hit = svg('rect', { x: ml, y: mt, width: plotW, height: plotH, fill: 'transparent' }, sv);
    hit.addEventListener('mousemove', ev => {
      const rect = el.getBoundingClientRect();
      const mx = ev.clientX - rect.left - ml;
      let idx = Math.round((mx / plotW) * (data.length - 1));
      idx = Math.max(0, Math.min(data.length - 1, idx));
      const d = data[idx], x = X(idx), y = Y(d.value);
      vline.setAttribute('x1', x); vline.setAttribute('x2', x); vline.setAttribute('opacity', 1);
      hline.setAttribute('y1', y); hline.setAttribute('y2', y); hline.setAttribute('opacity', 1);
      svg('circle', { cx: x, cy: y, r: 7, fill: color, stroke: surface(), 'stroke-width': 3 });
      dotEls.forEach((g, i) => { if (g) g.setAttribute('opacity', i === idx ? 1 : 0.55); });
      showTip(ev.clientX, ev.clientY, '<b>' + d.label + '</b> · ' + d.value + unit);
    });
    hit.addEventListener('mouseleave', () => {
      vline.setAttribute('opacity', 0); hline.setAttribute('opacity', 0);
      dotEls.forEach(g => g && g.setAttribute('opacity', 1));
      hideTip();
    });
    return sv;
  }

  /* ───────── 迷你图 ───────── */
  function spark(el, data, color) {
    el.innerHTML = '';
    if (!data || !data.length) return;
    const w = el.clientWidth || 120, h = 34;
    const sv = svg('svg', { width: w, height: h, viewBox: '0 0 ' + w + ' ' + h, preserveAspectRatio: 'none' });
    el.appendChild(sv);
    const max = Math.max(...data), min = Math.min(...data);
    const span = Math.max(max - min, 0.0001);
    const X = i => (i / (data.length - 1)) * w;
    const Y = v => h - 4 - ((v - min) / span) * (h - 8);
    const pts = data.map((v, i) => X(i) + ',' + Y(v)).join(' ');
    svg('polyline', { points: pts, fill: 'none', stroke: color, 'stroke-width': 1.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, sv);
    const last = data[data.length - 1];
    svg('circle', { cx: X(data.length - 1), cy: Y(last), r: 3, fill: color }, sv);
  }

  /* ───────── 多系列折线(周趋势) ───────── */
  function multiLine(el, opts) {
    opts = opts || {};
    const series = opts.series || [];
    const h = opts.height || 200;
    const unit = opts.unit || '';
    el.innerHTML = '';
    const all = series.flatMap(s => s.data);
    if (!all.length) { el.innerHTML = '<div class="empty"><p>暂无数据</p></div>'; return; }
    const n = all.length;
    const w = Math.max(el.clientWidth || 320, 160);
    const ml = 34, mr = 12, mt = 16, mb = 26;
    const plotW = w - ml - mr, plotH = h - mt - mb;
    const sv = svg('svg', { width: w, height: h, viewBox: '0 0 ' + w + ' ' + h });
    el.appendChild(sv);
    const vals = series.flatMap(s => s.data.map(d => d.value));
    const max = Math.max(...vals), min = Math.min(...vals);
    const pad = Math.max((max - min) * 0.18, max * 0.08, 1);
    const top = min - pad, span = Math.max(max + pad - top, 0.0001);
    const X = i => ml + (i / (n - 1)) * plotW;
    const Y = v => mt + plotH - ((v - top) / span) * plotH;
    [0, 0.5, 1].forEach(frac => {
      const y = mt + plotH * frac;
      svg('line', { x1: ml, x2: w - mr, y1: y, y2: y, stroke: 'var(--line)', 'stroke-width': 1 }, sv);
      const tl = svg('text', { x: ml - 5, y: y + 4, 'text-anchor': 'end', fill: ink(true), 'font-size': 10 }, sv);
      tl.textContent = Math.round(top + (1 - frac) * span) + unit;
    });
    // 用第一系列的标签
    const labels = series[0].data.map(d => d.label);
    const step = Math.max(1, Math.ceil(n / 6));
    labels.forEach((l, i) => {
      if (i % step === 0 || i === n - 1) { const xl = svg('text', { x: X(i), y: h - 8, 'text-anchor': 'middle', fill: ink(true), 'font-size': 10.5 }, sv); xl.textContent = String(l); }
    });
    series.forEach(s => {
      const color = s.color || getColor('accent');
      const pts = s.data.map((d, i) => X(i) + ',' + Y(d.value)).join(' ');
      svg('polygon', { points: ml + ' ' + (mt + plotH) + ' ' + pts + ' ' + (w - mr) + ' ' + (mt + plotH), fill: color, opacity: 0.07 }, sv);
      svg('polyline', { points: pts, fill: 'none', stroke: color, 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, sv);
      s.data.forEach((d, i) => svg('circle', { cx: X(i), cy: Y(d.value), r: 4, fill: color, stroke: surface(), 'stroke-width': 2 }, sv));
    });
    return sv;
  }

  window.WBChart = { donut, meter, bars, line, spark, multiLine, showTip, hideTip, getColor };
})();
