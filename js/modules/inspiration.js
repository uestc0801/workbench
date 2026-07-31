/* ═══════════════════════════════════════════════
   今日灵感:文字/语音双记录 + 网址收藏 + 分类标签
   + 每周深度思考(汇总本周灵感,思考笔记单独存档)
   ═══════════════════════════════════════════════ */
(function () {
  'use strict';

  let tab = 'note';
  let inputMode = 'text';
  let catFilter = 'all';
  let kw = '';

  const CATS = [
    { v: '创意', c: 'var(--accent)', s: 'var(--accent-soft)' },
    { v: '学习', c: 'var(--orange)', s: 'var(--orange-soft)' },
    { v: '写作', c: 'var(--mint)', s: 'var(--mint-soft)' },
    { v: '生活', c: 'var(--yellow)', s: 'var(--yellow-soft)' },
  ];
  function catOf(v) { return CATS.find(c => c.v === v) || CATS[0]; }

  /* ── 语音状态 ── */
  let listening = false;
  function toggleVoice() {
    const btn = document.getElementById('inVoice');
    if (listening) { WB.srStop(); listening = false; btn.classList.remove('active'); return; }
    if (!WB.srSupported()) return WB.toast('当前浏览器不支持语音识别,请用 Chrome/Edge', 'warn');
    listening = true;
    btn.classList.add('active');
    btn.textContent = '◉ 正在听… 点击停止';
    WB.srStart(txt => {
      const ta = document.getElementById('inText');
      ta.value = (ta.value ? ta.value + '\n' : '') + txt;
      listening = false; btn.classList.remove('active'); btn.textContent = '🎤 语音输入';
      WB.toast('已识别 ✓', 'ok');
    }, ok => {
      listening = false;
      if (btn) { btn.classList.remove('active'); btn.textContent = '🎤 语音输入'; }
      if (!ok) WB.toast('语音识别结束', 'warn');
    });
  }

  /* ── 保存文字灵感 ── */
  function saveText() {
    const ta = document.getElementById('inText');
    const v = (ta.value || '').trim();
    if (!v) return WB.toast('先写点什么吧', 'warn');
    const cat = (document.getElementById('inCat') || {}).value || '创意';
    WB.data.inspirations.unshift({ id: WB.uid('ins'), type: 'text', text: v, url: '', urlTitle: '', note: '', category: cat, fav: false, date: WB.today() });
    WB.save(); WB.toast('灵感已保存 ✨', 'ok');
    ta.value = '';
    WB.forceRender('inspiration');
  }

  /* ── 链接收藏 ── */
  async function saveLink() {
    const url = (document.getElementById('inUrl').value || '').trim();
    const note = (document.getElementById('inNote').value || '').trim();
    const cat = (document.getElementById('inLinkCat') || {}).value || '学习';
    if (!url) return WB.toast('请粘贴链接地址', 'warn');
    if (!/^https?:\/\//i.test(url)) return WB.toast('链接需以 http(s):// 开头', 'warn');
    let title = (document.getElementById('inLinkTitle').value || '').trim();
    if (!title) {
      WB.toast('正在提取标题…', 'warn');
      try {
        const res = await fetch(url);
        const html = await res.text();
        const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        title = m ? m[1].trim().slice(0, 80) : '';
      } catch (e) { title = ''; }
      document.getElementById('inLinkTitle').value = title;
      if (!title) { WB.toast('无法自动提取,请手动输入标题', 'warn'); return; }
    }
    WB.data.inspirations.unshift({ id: WB.uid('ins'), type: 'link', text: '', url, urlTitle: title, note, category: cat, fav: false, date: WB.today() });
    WB.save(); WB.toast('已收藏到灵感库 🔗', 'ok');
    WB.forceRender('inspiration');
  }

  function listItems(d) {
    return d.inspirations.filter(i => (catFilter === 'all' || i.category === catFilter)
      && (!kw || (i.text || '').toLowerCase().includes(kw) || (i.urlTitle || '').toLowerCase().includes(kw) || (i.note || '').toLowerCase().includes(kw)));
  }

  /* ── 灵感卡片列表 ── */
  function renderList(root, d) {
    const box = document.getElementById('inList');
    const items = listItems(d);
    box.innerHTML = items.map(it => {
      const c = catOf(it.category);
      const isLink = it.type === 'link';
      return '<div class="list-row" style="align-items:flex-start" data-skey="' + it.id + '">'
        + '<span style="flex:none;width:34px;height:34px;border-radius:11px;display:flex;align-items:center;justify-content:center;background:' + c.s + ';color:' + c.c + '">'
        + (isLink ? '<svg viewBox="0 0 24 24" class="ic" style="width:17px;height:17px"><path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1.5 1.5"/><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1.5-1.5"/></svg>'
          : it.type === 'voice' ? '<svg viewBox="0 0 24 24" class="ic" style="width:17px;height:17px"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>'
            : '<svg viewBox="0 0 24 24" class="ic" style="width:17px;height:17px"><path d="M5 6h14M5 12h14M5 18h9"/></svg>') + '</span>'
        + '<div class="grow" style="min-width:0">'
        + (isLink
          ? '<a class="semibold" style="font-size:14px;color:var(--accent)" href="' + WB.esc(it.url) + '" target="_blank" rel="noopener">' + WB.esc(it.urlTitle || it.url) + '</a>'
            + (it.note ? '<div class="small mt4" style="line-height:1.6">' + WB.esc(it.note) + '</div>' : '')
          : '<div style="font-size:14px;line-height:1.7">' + WB.esc(it.text) + '</div>')
        + '<div class="row mt6 wrap" style="gap:6px"><span class="chip" style="background:' + c.s + ';color:' + c.c + '">' + it.category + '</span>'
        + '<span class="small">' + it.date + '</span></div></div>'
        + '<div class="row" style="gap:2px;flex:none">'
        + '<button class="iconbtn" data-fav="' + it.id + '" style="width:30px;height:30px"><svg viewBox="0 0 24 24" class="ic" style="width:16px;height:16px;fill:' + (it.fav ? 'currentColor' : 'none') + ';color:' + (it.fav ? 'var(--yellow)' : '') + '"><path d="M12 4l1.9 3.9 4.3.6-3.1 3 .7 4.3L12 13.8l-3.8 2 .7-4.3-3.1-3 4.3-.6z"/></svg></button>'
        + '<button class="iconbtn" data-del="' + it.id + '" style="width:30px;height:30px"><svg viewBox="0 0 24 24" class="ic" style="width:15px;height:15px"><path d="M6 6l12 12M18 6L6 18"/></svg></button>'
        + '</div></div>';
    }).join('') || '<div class="empty"><p>没有匹配的灵感</p></div>';

    box.querySelectorAll('[data-fav]').forEach(b => b.addEventListener('click', () => {
      const it = d.inspirations.find(x => x.id === b.dataset.fav);
      if (it) { it.fav = !it.fav; WB.save(); WB.forceRender('inspiration'); }
    }));
    box.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => {
      WB.confirmBox('删除这条灵感?', ok => {
        if (!ok) return;
        d.inspirations = d.inspirations.filter(x => x.id !== b.dataset.del);
        WB.save(); WB.forceRender('inspiration');
      });
    }));
  }

  /* ── 深度思考 ── */
  function renderThink(root) {
    const d = WB.data;
    const t = WB.today();
    const ws = WB.weekStart(t);
    const weekIns = d.inspirations.filter(i => i.date >= ws && i.date <= t);
    root.innerHTML = '<div class="card"><div class="card-title"><h3>🧠 每周深度思考</h3><span class="small">每周自动提醒 · 汇总本周灵感 · 优质灵感沉淀为思考笔记</span></div>'
      + '<div class="q3-box"><div class="q">本周灵感(' + weekIns.length + ')</div>'
      + (weekIns.length ? '<div class="list mt8" style="max-height:260px;overflow-y:auto">'
        + weekIns.map(i => '<label class="list-row" style="cursor:pointer;padding:9px 12px"><input type="checkbox" data-pick="' + i.id + '" style="flex:none">'
          + '<span class="grow" style="font-size:13px">' + WB.esc((i.text || i.urlTitle || '').slice(0, 40)) + '</span>'
          + '<span class="small">' + i.category + '</span></label>').join('') + '</div>'
        : '<div class="small mt8">本周还没有灵感,先去记录一些吧。</div>')
      + '</div>'
      + '<div class="field mt16"><label>思考笔记</label><textarea class="textarea" id="tkNote" placeholder="挑几条优质灵感,写下你的深度思考…" style="min-height:120px"></textarea></div>'
      + '<button class="btn primary block" id="tkSave">💾 保存本周思考</button>'
      + '</div>'
      + '<div class="card mt16"><div class="card-title"><h3>历史思考存档</h3></div>'
      + '<div class="list">' + ((d.deepThink || []).slice().reverse().map(x => {
        const c = catOf('创意');
        return '<div class="q3-box"><div class="row between mb8"><span class="chip blue">' + x.date + '</span>'
          + '<button class="iconbtn" data-dtdel="' + x.id + '" style="width:26px;height:26px"><svg viewBox="0 0 24 24" class="ic" style="width:14px;height:14px"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>'
          + '<div style="font-size:13.5px;line-height:1.8">' + WB.esc(x.note) + '</div>'
          + (x.fromCount ? '<div class="small mt8">源于 ' + x.fromCount + ' 条灵感</div>' : '') + '</div>';
      }).join('') || '<div class="empty"><p>暂无深度思考记录</p></div>')
      + '</div></div>';

    root.querySelector('#tkSave').addEventListener('click', () => {
      const note = (root.querySelector('#tkNote').value || '').trim();
      const picked = weekIns.filter(i => root.querySelector('[data-pick="' + i.id + '"]') && root.querySelector('[data-pick="' + i.id + '"]').checked);
      if (!note && !picked.length) return WB.toast('请先写思考笔记', 'warn');
      d.deepThink.push({ id: WB.uid('tk'), date: t, note: note || '本周暂无文字思考', fromIds: picked.map(i => i.id), fromCount: picked.length });
      WB.save(); WB.toast('思考已存档 🧠', 'ok'); renderThink(root);
    });
    root.querySelectorAll('[data-dtdel]').forEach(b => b.addEventListener('click', () => {
      d.deepThink = d.deepThink.filter(x => x.id !== b.dataset.dtdel);
      WB.save(); renderThink(root);
    }));
  }

  /* ── 主渲染 ── */
  function render(root) {
    const d = WB.data;
    root.innerHTML = '<div class="page-head"><div class="page-title">今日灵感</div><div class="page-sub">文字 / 语音记录 · 网址收藏 · 每周深度思考</div></div>'
      + '<div class="seg-tabs mt12" id="inTab">'
      + '<button class="stab ' + (tab === 'note' ? 'active' : '') + '" data-t="note">灵感记录</button>'
      + '<button class="stab ' + (tab === 'think' ? 'active' : '') + '" data-t="think">深度思考</button></div>'
      + '<div id="inBody"></div>';
    root.querySelectorAll('#inTab .stab').forEach(b => b.addEventListener('click', () => {
      tab = b.dataset.t; render(root);
    }));

    if (tab === 'think') { renderThink(document.getElementById('inBody')); return; }

    const body = document.getElementById('inBody');
    body.innerHTML = ''
      // 记录卡
      + '<div class="card mb16"><div class="card-title"><h3>记录灵感</h3>'
      + '<div class="right"><div class="seg" id="inMode">'
      + '<button data-m="text" class="' + (inputMode === 'text' ? 'active' : '') + '">✍️ 文字</button>'
      + '<button data-m="voice" class="' + (inputMode === 'voice' ? 'active' : '') + '">🎤 语音</button></div></div></div>'
      + '<div class="row" style="gap:8px;margin-bottom:10px"><select class="select" id="inCat" style="flex:0 0 130px">'
      + CATS.map(c => '<option ' + (c.v === '创意' ? 'selected' : '') + '>' + c.v + '</option>').join('') + '</select>'
      + '<button class="btn" id="inVoice" style="display:' + (inputMode === 'voice' ? 'inline-flex' : 'none') + '">🎤 语音输入</button></div>'
      + '<textarea class="textarea" id="inText" placeholder="此刻的想法、灵感、顿悟…" style="min-height:90px"></textarea>'
      + '<div class="row mt12" style="gap:8px"><button class="btn primary grow" id="inSave">💾 保存灵感</button>'
      + '<button class="btn" id="inPlay">🔊 朗读</button></div>'
      + '</div>'
      // 链接收藏卡
      + '<div class="card mb16"><div class="card-title"><h3>收藏网络链接</h3><span class="small">粘贴视频 / 文章链接到灵感库</span></div>'
      + '<div class="field"><label>链接地址</label><input class="input" id="inUrl" placeholder="https://… 粘贴视频或文章链接"></div>'
      + '<div class="field"><label>标题(留空自动提取)</label><input class="input" id="inLinkTitle" placeholder="自动提取失败时手动输入"></div>'
      + '<div class="form-row"><div class="field"><label>分类</label><select class="select" id="inLinkCat">'
      + CATS.map(c => '<option>' + c.v + '</option>').join('') + '</select></div>'
      + '<div class="field"><label>备注</label><input class="input" id="inNote" placeholder="为什么值得收藏?"></div></div>'
      + '<button class="btn soft block" id="inLinkSave">🔗 收藏到灵感库</button></div>'
      // 列表
      + '<div class="card"><div class="card-title"><h3>灵感库 (' + d.inspirations.length + ')</h3></div>'
      + '<div class="row wrap mb12" style="gap:6px">'
      + [['all', '全部'], ...CATS.map(c => [c.v, c.v])].map(x =>
        '<button class="chip" data-c="' + x[0] + '" style="' + (catFilter === x[0] ? 'background:var(--accent);color:#fff' : '') + '">' + x[1] + '</button>').join('')
      + '</div>'
      + '<div class="row" style="gap:8px"><svg viewBox="0 0 24 24" class="ic" style="width:16px;height:16px;color:var(--ink-3)"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.2 4.2"/></svg>'
      + '<input class="input grow" id="inSearch" placeholder="搜索灵感 / 链接 / 备注…" value="' + WB.esc(kw) + '"></div>'
      + '<div class="list mt12" id="inList"></div></div>';

    // 模式切换
    body.querySelectorAll('#inMode button').forEach(b => b.addEventListener('click', () => {
      inputMode = b.dataset.m;
      body.querySelectorAll('#inMode button').forEach(x => x.classList.toggle('active', x === b));
      document.getElementById('inVoice').style.display = inputMode === 'voice' ? 'inline-flex' : 'none';
    }));
    body.querySelector('#inSave').addEventListener('click', saveText);
    body.querySelector('#inVoice').addEventListener('click', toggleVoice);
    body.querySelector('#inPlay').addEventListener('click', () => {
      const v = document.getElementById('inText').value.trim();
      if (v) WB.speak(v); else WB.toast('没有可朗读的内容', 'warn');
    });
    body.querySelector('#inLinkSave').addEventListener('click', saveLink);
    body.querySelectorAll('[data-c]').forEach(b => b.addEventListener('click', () => { catFilter = b.dataset.c; WB.forceRender('inspiration'); }));
    body.querySelector('#inSearch').addEventListener('input', e => { kw = e.target.value.trim().toLowerCase(); renderList(root, d); });
    renderList(root, d);
  }

  WB.register('inspiration', { render, refresh: render });
})();
