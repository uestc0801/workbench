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

  // 内置精选热点池(离线可用)
  const POOL = {
    dy: [
      '街头采访:年轻人下班后的生活状态',
      '大学生用 3D 打印自制机械臂走红网络',
      '今日份城市晚霞刷屏,你拍到了吗',
      '手工达人复原宋代点茶技艺全程',
      '深夜食堂:一碗面带来的治愈瞬间',
      '全民健身热潮下的公园夜跑日常',
      '萌宠当道:这只橘猫学会了开门',
      '打工人省钱指南:一周便当合集',
    ],
    bl: [
      '【科普】为什么夏天的晚霞格外好看',
      '硬核拆解:一块电池的 48 小时',
      '沉浸式自习:和 20 万人一起专注学习',
      'UP 主解析手机快充究竟怎么工作',
      '年度纪录片混剪,每一帧都是热爱',
      '零基础学画画:三个月进步记录',
      '从零搭建一个智能台灯有多快乐',
      '太空视角:空间站里的 24 小时',
    ],
    zh: [
      '长时间专注后,如何快速恢复精力?',
      '有哪些相见恨晚的高效学习方法?',
      '如何利用碎片时间进行有效阅读?',
      '给刚毕业的年轻人,有什么职业建议?',
      '怎样养成早起的习惯并坚持下去?',
      '一个人独居时,如何保持自律?',
      '读书笔记应该怎么做才有用?',
      '每日复盘真的有用吗?如何开始?',
    ],
  };

  function seedFor(plat, i) { return (new Date().getFullYear() * 372 + (new Date().getMonth() + 1) * 31 + new Date().getDate()) * 13 + plat.charCodeAt(0) + i; }

  function buildList() {
    const out = [];
    Object.keys(POOL).forEach(plat => {
      POOL[plat].forEach((title, i) => {
        const item = { plat, title, rank: i + 1, url: PLAT[plat].url, deep: PLAT[plat].deep, hot: 80 + ((seedFor(plat, i) * 7) % 20) * 10 };
        // 内置池为话题/平台首页;标记来源为"平台"
        item.sourceType = 'platform';
        out.push(item);
      });
    });
    return out;
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

  /* 抖音:官方公开接口不稳定,尽力抓取热搜标题;
     拿到标题后构造"抖音综合搜索"深链,能定位到相关视频而非仅首页 */
  async function tryFetchDouyin() {
    const srcs = [
      'https://www.douyin.com/aweme/v1/web/hot/search/list/',
      'https://api.amemv.com/aweme/v1/hot/search/list/',
    ];
    for (const src of srcs) {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 3000);
        const res = await fetch(src, { signal: ctrl.signal });
        clearTimeout(t);
        const json = await res.json();
        const list = json && json.data && json.data.word_list;
        if (list && list.length) {
          dyLive = list.slice(0, 8).map((w, i) => {
            const q = encodeURIComponent((w.word || w.sentence || '').slice(0, 20));
            return {
              plat: 'dy', title: w.word || w.sentence, rank: i + 1,
              url: 'https://www.douyin.com/search/' + q,
              contentUrl: 'https://www.douyin.com/search/' + q,
              deep: 'snssdk1128://search?keyword=' + q,
              contentDeep: 'snssdk1128://search?keyword=' + q,
              hot: w.hot_value ? Math.round(w.hot_value / 10000) * 10000 : 0,
              sourceType: 'content',
            };
          });
          break;
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
    head.innerHTML = '<div class="card-title"><h3>🔥 今日热点</h3><div class="right"><span class="small">来源:抖音 · B站 · 知乎</span></div></div>'
      + '<div class="seg-tabs" id="hotFilter">'
      + [['all', '全部'], ['dy', '抖音'], ['bl', 'B站'], ['zh', '知乎']].map(f =>
        '<button class="stab ' + (filter === f[0] ? 'active' : '') + '" data-f="' + f[0] + '">' + f[1] + '</button>').join('') + '</div>';
    container.appendChild(head);
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

  function boot() {
    Promise.all([tryFetchBili(), tryFetchDouyin()]).then(() => {
      let live = buildList();
      if (biliLive) live = live.filter(i => i.plat !== 'bl').concat(biliLive);
      if (dyLive) live = live.filter(i => i.plat !== 'dy').concat(dyLive);
      list = live.sort((a, b) => a.plat.localeCompare(b.plat));
      const host = document.getElementById('ovHot');
      if (host && !host.classList.contains('hide') && host.children.length) {
        render(host);
      }
    });
  }
  boot();

  window.WBHot = { render };
})();
