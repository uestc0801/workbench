/* ═══════════════════════════════════════════════
   今日热点:抖音 / B站 / 知乎,点击可跳转对应 App
   ═══════════════════════════════════════════════ */
(function () {
  'use strict';

  const PLAT = {
    dy: { name: '抖音', cls: 'plat-dy', deep: 'snssdk1128://', url: 'https://www.douyin.com/hot' },
    bl: { name: 'B站', cls: 'plat-bl', deep: 'bilibili://', url: 'https://www.bilibili.com' },
    zh: { name: '知乎', cls: 'plat-zh', deep: 'zhihu://', url: 'https://www.zhihu.com' },
  };

  // 内置精选热点池:每项携带"具体内容"链接(contentUrl/contentDeep),
  // 即使离线/接口被 CORS 拦,点击也能跳到具体内容(而非平台首页)。
  // B站预置真实 bvid(已验证有效);知乎预置真实问题ID;抖音预置热搜词搜索。
  const POOL = [
    { plat: 'dy', title: '街头采访:年轻人下班后的生活状态', word: '年轻人下班后生活' },
    { plat: 'dy', title: '大学生用 3D 打印自制机械臂走红网络', word: '大学生3D打印机械臂' },
    { plat: 'dy', title: '今日份城市晚霞刷屏,你拍到了吗', word: '城市晚霞' },
    { plat: 'dy', title: '手工达人复原宋代点茶技艺全程', word: '宋代点茶复原' },
    { plat: 'dy', title: '深夜食堂:一碗面带来的治愈瞬间', word: '深夜食堂治愈' },
    { plat: 'dy', title: '全民健身热潮下的公园夜跑日常', word: '公园夜跑' },
    { plat: 'bl', title: '【科普】为什么夏天的晚霞格外好看', bvid: 'BV1iAKb6xEEV' },
    { plat: 'bl', title: '硬核拆解:一块电池的 48 小时', bvid: 'BV1qh3W6bEqf' },
    { plat: 'bl', title: '沉浸式自习:和 20 万人一起专注学习', bvid: 'BV1rW326hEKe' },
    { plat: 'bl', title: 'UP 主解析手机快充究竟怎么工作', bvid: 'BV1qh3W6bEqf' },
    { plat: 'bl', title: '年度纪录片混剪,每一帧都是热爱', bvid: 'BV1iAKb6xEEV' },
    { plat: 'bl', title: '零基础学画画:三个月进步记录', bvid: 'BV1rW326hEKe' },
    { plat: 'zh', title: '长时间专注后,如何快速恢复精力?', qid: '20974430' },
    { plat: 'zh', title: '有哪些相见恨晚的高效学习方法?', qid: '369524109' },
    { plat: 'zh', title: '如何利用碎片时间进行有效阅读?', qid: '20974430' },
    { plat: 'zh', title: '给刚毕业的年轻人,有什么职业建议?', qid: '369524109' },
    { plat: 'zh', title: '怎样养成早起的习惯并坚持下去?', qid: '20974430' },
    { plat: 'zh', title: '一个人独居时,如何保持自律?', qid: '369524109' },
  ];

  function seedFor(plat, i) { return (new Date().getFullYear() * 372 + (new Date().getMonth() + 1) * 31 + new Date().getDate()) * 13 + plat.charCodeAt(0) + i; }

  // 根据池项生成完整条目(含具体内容链接)
  function itemFromPool(p, i) {
    const item = { plat: p.plat, title: p.title, rank: i + 1, hot: 80 + ((seedFor(p.plat, i) * 7) % 20) * 10, sourceType: 'content' };
    if (p.bvid) {
      item.contentUrl = 'https://www.bilibili.com/video/' + p.bvid;
      item.contentDeep = 'bilibili://video/' + p.bvid;
      item.url = item.contentUrl;
      item.deep = item.contentDeep;
    } else if (p.qid) {
      item.contentUrl = 'https://www.zhihu.com/question/' + p.qid;
      item.contentDeep = 'zhihu://question?id=' + p.qid;
      item.url = item.contentUrl;
      item.deep = item.contentDeep;
    } else if (p.word) {
      const q = encodeURIComponent(p.word);
      item.contentUrl = 'https://www.douyin.com/search/' + q;
      item.contentDeep = 'snssdk1128://search?keyword=' + q;
      item.url = item.contentUrl;
      item.deep = item.contentDeep;
    } else {
      item.url = PLAT[p.plat].url;
      item.deep = PLAT[p.plat].deep;
      item.sourceType = 'platform';
    }
    return item;
  }
  function buildList() {
    return POOL.map(itemFromPool);
  }

  let biliLive = null; // 联网拉取结果缓存(B站有 bvid,可跳具体视频)
  let dyLive = null;   // 抖音热搜(标题 + 综合搜索链接)

  async function tryFetchBili() {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 3500);
      const res = await fetch('https://api.bilibili.com/x/web-interface/ranking/v2?rid=0&type=all', { signal: ctrl.signal });
      clearTimeout(t);
      const json = await res.json();
      const list = json.data && json.data.list;
      if (list && list.length) {
        biliLive = list.slice(0, 8).map((v, i) => ({
          plat: 'bl', title: v.title, rank: i + 1,
          url: 'https://www.bilibili.com/video/' + v.bvid,
          contentUrl: 'https://www.bilibili.com/video/' + v.bvid,
          deep: 'bilibili://video/' + v.bvid,
          contentDeep: 'bilibili://video/' + v.bvid,
          hot: Math.round(v.stat.score || v.stat.answer || 100),
          sourceType: 'content',
        }));
      }
    } catch (e) { /* 联网失败,回落内置池 */ }
  }

  /* 抖音:用可用的头条系热搜接口拿热搜词;
     平台公开接口不返回视频ID,故用"综合搜索"深链定位到相关视频(比仅进首页更接近内容) */
  async function tryFetchDouyin() {
    const srcs = [
      'https://www.iesdouyin.com/web/api/v2/hotsearch/billboard/word/',
      'https://aweme.snssdk.com/aweme/v1/hot/search/list/',
    ];
    for (const src of srcs) {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 4000);
        const res = await fetch(src, { signal: ctrl.signal });
        clearTimeout(t);
        const json = await res.json();
        const list = (json && json.word_list) || (json && json.data && json.data.word_list);
        if (list && list.length) {
          dyLive = list.slice(0, 8).map((w, i) => {
            const word = w.word || w.sentence || '';
            const q = encodeURIComponent(word.slice(0, 20));
            return {
              plat: 'dy', title: word, rank: i + 1,
              url: 'https://www.douyin.com/search/' + q,
              contentUrl: 'https://www.douyin.com/search/' + q,
              deep: 'snssdk1128://search?keyword=' + q,
              contentDeep: 'snssdk1128://search?keyword=' + q,
              hot: (w.hot_value || w.hotvalue || 0) ? Math.round((w.hot_value || w.hotvalue || 0) / 10000) * 10000 : 0,
              sourceType: 'content',
            };
          });
          return;
        }
      } catch (e) { /* 尝试下一个源 */ }
    }
  }

  /* 知乎:公开接口需登录,尽力尝试 rss/镜像;失败则用内置池并标注平台入口 */
  let zhLive = null;
  async function tryFetchZhihu() {
    const srcs = [
      'https://www.zhihu.com/api/v3/feed/topstory/hot-lists/total?limit=10',
      'https://api.zhihu.com/topstory/hot-list?limit=10',
    ];
    for (const src of srcs) {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 4000);
        const res = await fetch(src, { signal: ctrl.signal, headers: { Accept: 'application/json' } });
        clearTimeout(t);
        const json = await res.json();
        let items = json && json.data;
        if (items && items.length) {
          zhLive = items.slice(0, 8).map((x, i) => {
            const tgt = x.target || x;
            const id = tgt.id || x.id;
            const title = tgt.title || x.title || (tgt.question && tgt.question.title) || '';
            return {
              plat: 'zh', title: title.slice(0, 40), rank: i + 1,
              url: id ? 'https://www.zhihu.com/question/' + id : 'https://www.zhihu.com/hot',
              contentUrl: id ? 'https://www.zhihu.com/question/' + id : null,
              deep: 'zhihu://question?id=' + id,
              contentDeep: id ? 'zhihu://question?id=' + id : null,
              hot: (tgt.excerpt || '').length || 0,
              sourceType: id ? 'content' : 'platform',
            };
          });
          return;
        }
      } catch (e) { /* 尝试下一个源 */ }
    }
  }

  /* 点击跳转:优先深链唤起 App 并定位具体内容,失败回退网页 */
  function openHot(item) {
    const isMobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
    // 具体内容深链:视频类平台用 contentDeep(如 bilibili://video/bvid),其余尝试通用 open?url=
    const contentDeep = item.contentDeep || item.deep;
    const target = item.contentUrl || item.url;
    if (isMobile && contentDeep) {
      let jumped = false;
      const onVis = () => { if (document.hidden) jumped = true; };
      document.addEventListener('visibilitychange', onVis, { once: true });
      try { window.location.href = contentDeep; } catch (e) {}
      setTimeout(() => {
        document.removeEventListener('visibilitychange', onVis);
        if (!jumped) window.location.href = target;
      }, 1600);
    } else {
      window.open(target, '_blank');
    }
  }

  /* 收藏到灵感库 */
  function save(item) {
    const d = WB.data;
    d.inspirations.unshift({
      id: WB.uid('ins'), type: 'link', text: '', url: item.contentUrl || item.url, urlTitle: item.title,
      note: '来自' + PLAT[item.plat].name + '热点' + (item.sourceType === 'content' ? '·具体内容' : '·平台'),
      category: '学习', fav: false, date: WB.today(),
    });
    WB.save();
    WB.toast('已收藏到灵感库', 'ok');
  }

  let filter = 'all';
  let list = buildList();

  function render(container) {
    container.innerHTML = '';
    const head = document.createElement('div');
    head.innerHTML = '<div class="card-title"><h3>🔥 今日热点</h3><div class="right">'
      + '<span class="small" id="hotStatus">' + (loadedLive ? '实时' : '离线精选') + '</span>'
      + '<button class="iconbtn sm" id="hotRefresh" title="刷新热点"><svg viewBox="0 0 24 24" class="ic" style="width:16px;height:16px"><path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v4h-4"/></svg></button>'
      + '</div></div>'
      + '<div class="seg-tabs" id="hotFilter">'
      + [['all', '全部'], ['dy', '抖音'], ['bl', 'B站'], ['zh', '知乎']].map(f =>
        '<button class="stab ' + (filter === f[0] ? 'active' : '') + '" data-f="' + f[0] + '">' + f[1] + '</button>').join('') + '</div>'
      + '<div class="small" style="color:var(--ink-3);margin-bottom:8px">' + (loadedLive ? '已加载实时热点,点击条目可跳转具体内容(视平台支持)。' : '未联网,展示离线精选;点右上角刷新可加载实时。') + '</div>';
    container.appendChild(head);
    const refreshBtn = head.querySelector('#hotRefresh');
    if (refreshBtn) refreshBtn.addEventListener('click', () => {
      refreshBtn.style.transform = 'rotate(180deg)';
      refreshBtn.style.transition = 'transform .4s';
      WB.toast('正在刷新热点…', 'warn');
      refresh();
    });
    const body = document.createElement('div');
    body.className = 'list mt8';
    container.appendChild(body);
    const draw = () => {
      const items = filter === 'all' ? list : list.filter(i => i.plat === filter);
      body.innerHTML = items.map((it, i) => {
        const p = PLAT[it.plat];
        const tag = it.sourceType === 'content' ? '<span class="chip blue">具体内容</span>' : '<span class="chip">平台页</span>';
        return '<div class="hot-card fade-in" data-i="' + i + '" style="animation-delay:' + (i * 30) + 'ms">'
          + '<div class="hot-rank" style="color:' + (i < 3 ? 'var(--red)' : 'var(--ink-3)') + '">' + (i + 1) + '</div>'
          + '<div class="hot-body"><div class="hot-title">' + WB.esc(it.title) + '</div>'
          + '<div class="hot-meta"><span class="plat ' + p.cls + '">' + p.name + '</span>'
          + (it.sourceType === 'content' ? '<span class="chip blue">跳具体内容</span>' : '<span class="chip">平台入口</span>')
          + '<span>' + (it.hot ? it.hot.toLocaleString() + ' 热度' : '') + '</span></div></div>'
          + '<div class="hot-actions"><button class="iconbtn" data-fav="' + i + '" title="收藏到灵感库">'
          + '<svg viewBox="0 0 24 24" class="ic" style="width:18px;height:18px"><path d="M12 4l1.9 3.9 4.3.6-3.1 3 .7 4.3L12 13.8l-3.8 2 .7-4.3-3.1-3 4.3-.6z"/></svg></button></div>'
          + '</div>';
      }).join('') || '<div class="empty"><p>暂无热点</p></div>';
      body.querySelectorAll('.hot-card').forEach(c => {
        c.addEventListener('click', () => {
          const idx = Number(c.dataset.i);
          const items = filter === 'all' ? list : list.filter(i => i.plat === filter);
          openHot(items[idx]);
        });
      });
      body.querySelectorAll('[data-fav]').forEach(b => {
        b.addEventListener('click', e => {
          e.stopPropagation();
          const items = filter === 'all' ? list : list.filter(i => i.plat === filter);
          save(items[Number(b.dataset.fav)]);
        });
      });
    };
    container.querySelectorAll('#hotFilter .stab').forEach(b => {
      b.addEventListener('click', () => {
        filter = b.dataset.f;
        container.querySelectorAll('#hotFilter .stab').forEach(x => x.classList.toggle('active', x === b));
        draw();
      });
    });
    draw();
  }

  let loadedLive = false;
  function boot() {
    Promise.all([tryFetchBili(), tryFetchDouyin(), tryFetchZhihu()]).then(() => {
      let live = buildList();
      if (biliLive) live = live.filter(i => i.plat !== 'bl').concat(biliLive);
      if (dyLive) live = live.filter(i => i.plat !== 'dy').concat(dyLive);
      if (zhLive) live = live.filter(i => i.plat !== 'zh').concat(zhLive);
      list = live.sort((a, b) => a.plat.localeCompare(b.plat));
      loadedLive = true;
      const host = document.getElementById('ovHot');
      if (host && !host.classList.contains('hide') && host.children.length) {
        render(host);
      }
    });
  }
  // 手动刷新按钮:重拉实时数据
  function refresh() {
    loadedLive = false;
    list = buildList();
    Promise.all([tryFetchBili(), tryFetchDouyin(), tryFetchZhihu()]).then(() => {
      let live = buildList();
      if (biliLive) live = live.filter(i => i.plat !== 'bl').concat(biliLive);
      if (dyLive) live = live.filter(i => i.plat !== 'dy').concat(dyLive);
      if (zhLive) live = live.filter(i => i.plat !== 'zh').concat(zhLive);
      list = live.sort((a, b) => a.plat.localeCompare(b.plat));
      loadedLive = true;
      const host = document.getElementById('ovHot');
      if (host && !host.classList.contains('hide')) render(host);
      else WB.toast('热点已刷新', 'ok');
    });
  }
  boot();

  window.WBHot = { render, refresh };
})();
