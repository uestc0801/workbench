/* ═══════════════════════════════════════════════
   入口:导航构建 / 初始化 / 启动调度
   ═══════════════════════════════════════════════ */
(function () {
  'use strict';

  const NAV = [
    { r: 'overview', n: '概览', d: 'M3.5 3.5h7v7h-7zM13.5 3.5h7v7h-7zM3.5 13.5h7v7h-7zM13.5 13.5h7v7h-7z' },
    { r: 'calendar', n: '日历', d: 'M7 3.5v3M17 3.5v3M4.5 9.5h15M5.5 4.5h13a1 1 0 0 1 1 1V19a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1V5.5a1 1 0 0 1 1-1z' },
    { r: 'todo', n: '待办', d: 'M4 4h16v16H4z M8.5 12l2.4 2.4L15.6 9.5' },
    { r: 'books', n: '书架', d: 'M4 5.5A1.5 1.5 0 0 1 5.5 4h6v16h-6A1.5 1.5 0 0 1 4 18.5zM12.5 4h6A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-6z' },
    { r: 'water', n: '喝水', d: 'M12 3.5c3.2 3.6 6 6.7 6 10a6 6 0 0 1-12 0c0-3.3 2.8-6.4 6-10z' },
    { r: 'review', n: '复盘', d: 'M6 3.5h9l3.5 3.5v13.5H6z M9 9h6 M9 12.5h6 M9 16h3' },
    { r: 'exercise', n: '运动', d: 'M4 13h3l2-3.5L11.5 16 14 8l1.6 4H20' },
    { r: 'inspiration', n: '灵感', d: 'M9 18h6M10.5 21h3M8.5 15a5.5 5.5 0 1 1 7 0c-.9.7-1.5 1.6-1.5 2.6v.4h-4V17c0-1-.6-1.9-1.5-2.6z' },
    { r: 'english', n: '英语', d: 'M4 5h7M7.5 3.5V8M14 5h6M17 3.5V10M14.5 10h5M16.5 12v8.5' },
    { r: 'settings', n: '设置', d: 'M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.4 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7 7 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.4-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.2-.8.2-1.2z' },
  ];

  function navItem(n) {
    return '<button class="navitem" data-route="' + n.r + '">'
      + '<svg viewBox="0 0 24 24" class="ic">' + n.d + '</svg><span>' + n.n + '</span></button>';
  }
  function tabItem(n) {
    return '<button class="tab" data-route="' + n.r + '">'
      + '<svg viewBox="0 0 24 24" class="ic">' + n.d + '</svg><span>' + n.n + '</span></button>';
  }

  function buildNav() {
    document.getElementById('sideNav').innerHTML = NAV.map(navItem).join('');
    document.getElementById('tabbar').innerHTML = NAV.map(tabItem).join('');
    document.querySelectorAll('.navitem, .tab').forEach(b => b.addEventListener('click', () => WB.nav(b.dataset.route)));
  }

  function updateSideDate() {
    const el = document.getElementById('sideDate');
    if (!el) return;
    const lunar = Lunar.daily(new Date());
    el.innerHTML = WB.todayCN() + '<br>' + (lunar ? '农历' + lunar.lunarStr + ' · ' + lunar.gzYear : '');
  }

  function bindTheme() {
    document.getElementById('themeBtn').addEventListener('click', () => {
      const cur = WB.themeMode();
      WB.setTheme(cur === 'dark' ? 'light' : 'dark');
    });
    document.querySelectorAll('#themeSeg [data-theme]').forEach(b => b.addEventListener('click', () => WB.setTheme(b.dataset.theme)));
    // 跟随系统
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (WB.data.settings.theme === 'auto') WB.applyTheme(); });
  }

  document.addEventListener('DOMContentLoaded', () => {
    WB.load();
    WB.applyTheme();
    buildNav();
    bindTheme();
    WB.bindSearch();
    updateSideDate();
    WB.archiveYesterday();
    WB.startReminders();
    WB.syncStart();
    WB.requestNotify();
    WB.nav('overview');

    // 窗口尺寸变化时,刷新当前页以重绘自适应图表
    // 但手机软键盘弹起也会触发 resize —— 若此刻有输入框聚焦,跳过重渲染,避免重建 DOM 导致键盘收起
    let rt = null;
    window.addEventListener('resize', () => {
      const activeInput = document.activeElement && /^(input|textarea|select)$/i.test(document.activeElement.tagName);
      if (activeInput) return;
      clearTimeout(rt);
      rt = setTimeout(() => { const r = document.querySelector('.page.active')?.dataset.page; if (r) WB.forceRender(r); }, 300);
    });
  });
})();
