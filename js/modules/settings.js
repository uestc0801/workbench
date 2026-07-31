/* ═══════════════════════════════════════════════
   设置中心:个性化(主题/背景/透明度)+ 目标 + 统一提醒
   + 用户信息 + 数据导出导入
   ═══════════════════════════════════════════════ */
(function () {
  'use strict';

  const SIGNS = ['白羊座', '金牛座', '双子座', '巨蟹座', '狮子座', '处女座', '天秤座', '天蝎座', '射手座', '摩羯座', '水瓶座', '双鱼座'];
  const WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

  function render(root) {
    const d = WB.data, s = d.settings;
    root.innerHTML = '<div class="page-head"><div class="page-title">设置</div><div class="page-sub">个性化定制 · 目标管理 · 提醒 · 数据安全</div></div>'
      // 个性化
      + '<div class="card mb16"><div class="card-title"><h3>🎨 个性化</h3></div>'
      + '<div class="field"><label>外观模式</label><div class="seg" id="stTheme">'
      + [['light', '浅色'], ['dark', '深色'], ['auto', '跟随系统']].map(x => '<button data-v="' + x[0] + '" class="' + (s.theme === x[0] ? 'active' : '') + '">' + x[1] + '</button>').join('')
      + '</div></div>'
      + '<div class="field"><label>背景风格</label><div class="seg" id="stBg">'
      + [['gradient', '柔和渐变'], ['solid', '纯色'], ['image', '自定义图片']].map(x => '<button data-v="' + x[0] + '" class="' + (s.bgType === x[0] ? 'active' : '') + '">' + x[1] + '</button>').join('')
      + '</div></div>'
      + '<div class="row" style="gap:10px" id="bgOpts">'
      + (s.bgType === 'solid' ? '<div class="field grow"><label>背景颜色</label><div class="row" style="gap:8px"><input type="color" id="stBgColor" value="' + (s.bgColor || '#2a78d6') + '"></div></div>' : '')
      + (s.bgType === 'image' ? '<div class="field grow"><label>选择背景图片</label><input type="file" id="stBgImg" accept="image/*">'
        + '<div class="small mt4">本地图片将存为数据,不依赖网络</div></div>' : '')
      + '</div>'
      + '<div class="field"><label>卡片透明度: <span id="alphaVal">' + Math.round(s.cardA * 100) + '%</span></label>'
      + '<input type="range" id="stAlpha" min="30" max="95" value="' + Math.round(s.cardA * 100) + '"></div>'
      + '<button class="btn sm" id="stSaveTheme">应用外观</button></div>'
      // 用户信息
      + '<div class="card mb16"><div class="card-title"><h3>👤 用户信息</h3></div>'
      + '<div class="form-row">'
      + '<div class="field"><label>称呼</label><input class="input" data-field="name" value="' + WB.esc(s.name || '') + '" placeholder="昵称(用于首页问候)"></div>'
      + '<div class="field"><label>星座(用于运势)</label><select class="select" data-field="sign">' + SIGNS.map(x => '<option ' + (s.sign === x ? 'selected' : '') + '>' + x + '</option>').join('') + '</select></div></div>'
      + '<div class="field"><label>每周深度思考日</label><select class="select" data-field="deepDay">' + WEEK.map((x, i) => '<option value="' + i + '" ' + (s.deepThinkDay === i ? 'selected' : '') + '>' + x + '</option>').join('') + '</select></div>'
      + '<button class="btn" id="stSaveUser">保存</button></div>'
      // 云端同步
      + '<div class="card mb16" id="syncCard"><div class="card-title"><h3>☁️ 云端同步(跨设备 / 云备份)</h3>'
      + '<label class="small" style="display:flex;align-items:center;gap:6px"><input type="checkbox" id="syEnabled" ' + (s.sync.enabled ? 'checked' : '') + '> 启用自动同步</label></div>'
      + '<div class="small mb12" style="line-height:1.7">数据存到你的 <b>Git 私有仓库</b>(如 Gitee/GitHub)中的 <code>wb-data.json</code>。电脑、手机连同一个仓库即可互通与备份。令牌仅存本浏览器,不会上传第三方。</div>'
      + '<div class="form-row">'
      + '<div class="field"><label>平台</label><select class="select" data-field="sync.platform"><option ' + (s.sync.platform === 'gitee' ? 'selected' : '') + ' value="gitee">Gitee 码云(国内快)</option><option ' + (s.sync.platform === 'github' ? 'selected' : '') + ' value="github">GitHub</option></select></div>'
      + '<div class="field"><label>仓库全名(owner/repo)</label><input class="input" data-field="sync.repo" value="' + WB.esc(s.sync.repo) + '" placeholder="如 myname/workbench-data"></div></div>'
      + '<div class="form-row">'
      + '<div class="field"><label>分支</label><input class="input" data-field="sync.branch" value="' + WB.esc(s.sync.branch) + '"></div>'
      + '<div class="field"><label>自动同步间隔(分钟)</label><input class="input" type="number" data-field="sync.intervalMin" value="' + (s.sync.intervalMin || 30) + '" min="10" max="120"></div></div>'
      + '<div class="field"><label>个人访问令牌(Token)</label><input class="input" data-field="sync.token" type="password" value="' + WB.esc(s.sync.token || '') + '" placeholder="粘贴你的 Token" autocomplete="off">'
      + '<div class="small mt4">在 Gitee「设置 → 私人令牌」或 GitHub「Settings → Developer settings → Personal access tokens」生成(权限:仓库读写)。</div></div>'
      + '<div class="row wrap" style="gap:8px">'
      + '<button class="btn soft" id="syTest">🔌 测试连接</button>'
      + '<button class="btn" id="syPull">⬇ 立即下载(云端覆盖本地)</button>'
      + '<button class="btn primary" id="syPush">⬆ 立即上传(本地到云端)</button></div>'
      + '<div class="mt12" id="syStatus" style="font-size:12.5px;color:var(--ink-3);line-height:1.7"></div>'
      + '<details class="mt12"><summary class="semibold" style="cursor:pointer;font-size:12.5px;color:var(--accent)">📖 首次配置图文教程(必看)</summary>'
      + '<div class="small mt8" style="line-height:1.9"><b>Gitee:</b><br>1. 登录 gitee.com 注册(免费);<br>2. 新建<b>私有</b>仓库,填个名字如 workbench-data;<br>3. 右上头像 → 设置 → 私人令牌 → 生成新令牌,勾选 projects 权限;<br>4. 把仓库全名(如 myname/workbench-data)和令牌填到上面。<br><br><b>GitHub:</b><br>1. 注册并新建<b>Private</b>仓库;<br>2. Settings → Developer settings → Personal access tokens → Generate new token(classic),勾选 repo;<br>3. 填入仓库名与令牌。Token 只存本浏览器,别发给他人。</div></details>'
      + '</div>'
      // GitHub Pages 在线发布
      + '<div class="card mb16" id="pagesCard"><div class="card-title"><h3>🌐 在线版(发布到 GitHub Pages)</h3>'
      + '<span class="badge">一次配置,以后一键更新</span></div>'
      + '<div class="small mb12" style="line-height:1.7">把程序发布到 GitHub 仓库后,手机/电脑浏览器直接打开网址即可使用,更新只需再点一次「发布」。数据仍走上方云端同步。</div>'
      + '<div class="form-row">'
      + '<div class="field"><label>GitHub 用户名</label><input class="input" data-field="gh.owner" value="' + WB.esc((s.ghPages||{}).owner||'') + '" placeholder="你的 GitHub 用户名"></div>'
      + '<div class="field"><label>仓库名</label><input class="input" data-field="gh.repo" value="' + WB.esc((s.ghPages||{}).repo||'') + '" placeholder="如 workbench"></div></div>'
      + '<div class="field"><label>GitHub 令牌(PAT)</label><input class="input" data-field="gh.token" type="password" value="' + WB.esc((s.ghPages||{}).token||'') + '" placeholder="Settings → Developer settings → Personal access tokens" autocomplete="off">'
      + '<div class="small mt4">令牌需勾选 <b>repo</b> 权限。仅存本浏览器。</div></div>'
      + '<div class="row wrap" style="gap:8px">'
      + '<button class="btn soft" id="ghTest">🔌 测试连接</button>'
      + '<button class="btn primary" id="ghPublish">🚀 发布到 GitHub Pages</button></div>'
      + '<div class="mt12" id="ghStatus" style="font-size:12.5px;color:var(--ink-3);line-height:1.7"></div>'
      + '<details class="mt12"><summary class="semibold" style="cursor:pointer;font-size:12.5px;color:var(--accent)">📖 首次配置教程</summary>'
      + '<div class="small mt8" style="line-height:1.9">'
      + '<b>1. 注册 GitHub</b>(github.com,免费),登录。<br>'
      + '<b>2. 新建仓库</b>:右上角 + → New repository,仓库名填 <code>workbench</code>,<b>Public</b>,不勾任何初始化,创建。<br>'
      + '<b>3. 开启 Pages</b>:仓库 → Settings → 左侧 Pages → Branch 选 <code>main</code> → Save。<br>'
      + '<b>4. 生成令牌</b>:头像 → Settings → Developer settings → Personal access tokens → Generate new token(classic) → 勾选 <code>repo</code> → 生成并复制。<br>'
      + '<b>5. 把用户名 / 仓库名 / 令牌填到上面 → 点「🚀 发布」</b>。<br>'
      + '<b>6. 访问</b>:https://&lt;你的用户名&gt;.github.io/workbench/ 就是你的在线工作台!<br>'
      + '<span style="color:var(--orange)">以后我改了代码,你只需再点一次「🚀 发布」,网页版即更新。</span></div></details>'
      + '</div>'
      // 目标管理
      + '<div class="card mb16"><div class="card-title"><h3>🎯 每日目标</h3></div>'
      + '<div class="grid g2">'
      + numField('waterGoal', '饮水量目标(ml)', s.waterGoal)
      + numField('readGoalPages', '阅读页数目标', s.readGoalPages)
      + numField('readGoalMin', '阅读分钟目标', s.readGoalMin)
      + numField('exerciseGoalMin', '运动分钟目标', s.exerciseGoalMin)
      + numField('englishGoalMin', '英语学习目标(分钟)', s.englishGoalMin)
      + numField('pomodoroFocus', '番茄专注(分钟)', s.pomodoroFocus)
      + numField('pomodoroBreak', '番茄休息(分钟)', s.pomodoroBreak)
      + numField('englishWords', '每日单词数', s.englishWords)
      + '</div><button class="btn mt12" id="stSaveGoals">保存目标</button></div>'
      // 提醒管理
      + '<div class="card mb16"><div class="card-title"><h3>🔔 统一提醒</h3><span class="small">保持页面打开即生效</span></div>'
      + '<div class="list" id="rmList"></div>'
      + '<button class="btn soft block mt12" id="rmAdd">+ 添加自定义提醒</button></div>'
      // 数据
      + '<div class="card"><div class="card-title"><h3>💾 数据管理</h3><span class="small">全部数据本地永久存储,支持导出备份</span></div>'
      + '<div class="row wrap" style="gap:8px">'
      + '<button class="btn" id="stExport">导出数据</button>'
      + '<button class="btn" id="stImport">导入数据</button>'
      + '<button class="btn danger" id="stClear">清空全部数据</button>'
      + '</div><input type="file" id="stImportFile" accept="application/json" hidden>'
      + '<div class="small mt12" style="line-height:1.7">数据存储于浏览器 localStorage(键 wb.data.v1)。导出 JSON 文件即可跨设备备份/迁移;导入会覆盖当前数据。启动时已自动修复历史编码乱码。</div>'
      + '</div>';

    /* 提醒列表 */
    const rmBox = root.querySelector('#rmList');
    const list = s.reminders.filter(r => r.type !== 'deep');
    rmBox.innerHTML = list.map(r => '<div class="list-row" style="padding:10px 12px">'
      + '<span class="grow" style="font-size:13.5px">' + WB.esc(r.label) + '</span>'
      + '<input type="time" data-time="' + r.id + '" value="' + r.time + '" style="font-size:13px">'
      + '<input type="checkbox" data-on="' + r.id + '" ' + (r.enabled ? 'checked' : '') + '>'
      + (r.type === 'custom' ? '<button class="iconbtn" data-rmdel="' + r.id + '" style="width:28px;height:28px"><svg viewBox="0 0 24 24" class="ic" style="width:14px;height:14px"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' : '')
      + '</div>').join('') || '<div class="empty"><p>暂无提醒</p></div>';
    rmBox.querySelectorAll('[data-time]').forEach(el => {
      el.addEventListener('change', () => { const r = s.reminders.find(x => x.id === el.dataset.time); if (r) { r.time = el.value; WB.save(); } });
    });
    rmBox.querySelectorAll('[data-on]').forEach(el => {
      el.addEventListener('change', () => { const r = s.reminders.find(x => x.id === el.dataset.on); if (r) { r.enabled = el.checked; WB.save(); } });
    });
    rmBox.querySelectorAll('[data-rmdel]').forEach(el => el.addEventListener('click', () => {
      s.reminders = s.reminders.filter(x => x.id !== el.dataset.rmdel);
      WB.save(); render(root);
    }));
    root.querySelector('#rmAdd').addEventListener('click', () => {
      WB.openModal('<h4>添加自定义提醒</h4>'
        + '<div class="field"><label>提醒内容</label><input class="input" data-field="label" placeholder="如:站起来活动一下" maxlength="30"></div>'
        + '<div class="field"><label>时间</label><input class="input" type="time" data-field="time" value="15:00"></div>'
        + '<div class="m-actions"><button class="btn" id="mCancel">取消</button><button class="btn primary" id="mOk">添加</button></div>');
      const box = document.getElementById('modalBox');
      box.querySelector('#mCancel').addEventListener('click', WB.closeModal);
      box.querySelector('#mOk').addEventListener('click', () => {
        const f = WB.readForm(box);
        if (!f.label.trim()) return WB.toast('请输入提醒内容', 'warn');
        s.reminders.push({ id: WB.uid('rm'), type: 'custom', label: f.label.trim(), time: f.time, enabled: true });
        WB.save(); WB.closeModal(); WB.toast('提醒已添加 🔔', 'ok'); render(root);
      });
    });

    /* 外观 */
    root.querySelectorAll('#stTheme button').forEach(b => b.addEventListener('click', () => { WB.setTheme(b.dataset.v); render(root); }));
    const renderBg = () => {
      root.querySelector('#bgOpts').innerHTML = s.bgType === 'solid'
        ? '<div class="field grow"><label>背景颜色</label><div class="row" style="gap:8px"><input type="color" id="stBgColor" value="' + (s.bgColor || '#2a78d6') + '"></div></div>'
        : s.bgType === 'image'
          ? '<div class="field grow"><label>选择背景图片</label><input type="file" id="stBgImg" accept="image/*"><div class="small mt4">本地图片将存为数据,不依赖网络</div></div>'
          : '<div class="small" style="color:var(--ink-3)">柔和渐变将跟随深浅色自动适配。</div>';
      const bc = root.querySelector('#stBgColor');
      if (bc) bc.addEventListener('input', () => { s.bgColor = bc.value; WB.applyTheme(); });
      const bi = root.querySelector('#stBgImg');
      if (bi) bi.addEventListener('change', () => {
        const file = bi.files[0];
        if (!file) return;
        const rd = new FileReader();
        rd.onload = () => { s.bgImage = rd.result; WB.save(); WB.applyTheme(); WB.toast('背景已更新 🖼', 'ok'); };
        rd.readAsDataURL(file);
      });
    };
    root.querySelectorAll('#stBg button').forEach(b => b.addEventListener('click', () => { s.bgType = b.dataset.v; WB.save(); WB.applyTheme(); renderBg(); render(root); }));
    renderBg();
    root.querySelector('#stAlpha').addEventListener('input', e => {
      s.cardA = Number(e.target.value) / 100;
      document.getElementById('alphaVal').textContent = e.target.value + '%';
      WB.applyTheme();
    });
    root.querySelector('#stSaveTheme').addEventListener('click', () => { WB.save(); WB.toast('外观已保存 ✓', 'ok'); });

    /* 用户 */
    root.querySelector('#stSaveUser').addEventListener('click', () => {
      const f = WB.readForm(root);
      s.name = f.name; s.sign = f.sign; s.deepThinkDay = Number(f.deepDay);
      WB.save(); WB.toast('用户信息已保存 ✓', 'ok'); render(root);
    });

    /* 云端同步 */
    const setSync = (k, v) => { s.sync[k] = v; WB.save(); };
    root.querySelector('#syEnabled').addEventListener('change', e => { s.sync.enabled = e.target.checked; WB.save(); });
    root.querySelector('[data-field="sync.platform"]').addEventListener('change', e => setSync('platform', e.target.value));
    root.querySelector('[data-field="sync.repo"]').addEventListener('change', e => setSync('repo', e.target.value.trim()));
    root.querySelector('[data-field="sync.branch"]').addEventListener('change', e => setSync('branch', e.target.value.trim() || 'main'));
    root.querySelector('[data-field="sync.intervalMin"]').addEventListener('change', e => setSync('intervalMin', Math.max(10, Math.min(120, Number(e.target.value) || 30))));
    root.querySelector('[data-field="sync.token"]').addEventListener('change', e => setSync('token', e.target.value.trim()));
    const syncStatus = document.getElementById('syStatus');
    const renderSyncStatus = () => {
      const last = s.sync.lastSync ? new Date(s.sync.lastSync).toLocaleString('zh-CN') : '从未同步';
      syncStatus.innerHTML = '状态:未同步开关' + (s.sync.enabled ? ' <b style="color:var(--mint)">已启用</b>' : ' <b>已停用</b>') + ' · 上次同步:' + last + (s.sync.dirty ? ' · 有本地改动待上传' : '');
    };
    renderSyncStatus();
    root.querySelector('#syTest').addEventListener('click', async () => {
      WB.toast('正在测试连接…', 'warn');
      try { await WB.syncTest(); WB.toast('连接成功 ✓ 仓库可读写', 'ok'); renderSyncStatus(); }
      catch (e) { WB.toast('连接失败:' + e.message, 'err'); }
    });
    root.querySelector('#syPush').addEventListener('click', async () => {
      WB.toast('正在上传…', 'warn');
      try { await WB.syncPush(); WB.toast('已上传到云端 ✓', 'ok'); renderSyncStatus(); }
      catch (e) { WB.toast('上传失败:' + e.message, 'err'); }
    });
    root.querySelector('#syPull').addEventListener('click', async () => {
      WB.confirmBox('下载会以云端数据覆盖本地当前数据,确定继续?', async ok => {
        if (!ok) return;
        WB.toast('正在下载…', 'warn');
        try {
          const remote = await WB.syncPull();
          if (!remote) { WB.toast('云端还没有数据,先上传一次', 'warn'); return; }
          const localToken = s.sync.token, localCfg = s.sync;
          const merged = Object.assign(WB.defaults(), remote, { settings: Object.assign(WB.defaults().settings, remote.settings || {}) });
          merged.settings.sync = localCfg;
          WB.importJSON(JSON.stringify(merged));
          WB.toast('已下载并应用云端数据 ✓', 'ok');
          setTimeout(() => location.reload(), 400);
        } catch (e) { WB.toast('下载失败:' + e.message, 'err'); }
      });
    });

    /* GitHub Pages 发布 */
    if (!s.ghPages) s.ghPages = { owner: '', repo: '', token: '', branch: 'main' };
    const setGh = (k, v) => { s.ghPages[k] = v; WB.save(); };
    root.querySelector('[data-field="gh.owner"]').addEventListener('change', e => setGh('owner', e.target.value.trim()));
    root.querySelector('[data-field="gh.repo"]').addEventListener('change', e => setGh('repo', e.target.value.trim()));
    root.querySelector('[data-field="gh.token"]').addEventListener('change', e => setGh('token', e.target.value.trim()));
    const ghStatus = document.getElementById('ghStatus');
    ghStatus.innerHTML = (s.ghPages.owner && s.ghPages.repo)
      ? '在线地址:https://' + WB.esc(s.ghPages.owner) + '.github.io/' + WB.esc(s.ghPages.repo) + '/'
      : '配置后即可一键发布在线版。';
    root.querySelector('#ghTest').addEventListener('click', async () => {
      WB.toast('正在测试连接…', 'warn');
      try { const b = await WB.ghTest(); s.ghPages.branch = b; WB.save(); WB.toast('连接成功 ✓ 默认分支 ' + b, 'ok'); }
      catch (e) { WB.toast('连接失败:' + e.message, 'err'); }
    });
    root.querySelector('#ghPublish').addEventListener('click', async () => {
      WB.toast('正在发布…', 'warn');
      ghStatus.innerHTML = '发布中…';
      try {
        const r = await WB.publishToPages(msg => { ghStatus.textContent = msg; });
        WB.toast('发布成功!共 ' + r.total + ' 个文件 ✓', 'ok');
        ghStatus.innerHTML = '✅ 已发布 ' + r.ok + ' 个文件。打开 https://' + WB.esc(s.ghPages.owner) + '.github.io/' + WB.esc(s.ghPages.repo) + '/ 查看<br>'
          + '<span class="small">首次发布后 Pages 需几分钟生效,刷新几次即可。</span>';
      } catch (e) { WB.toast('发布失败:' + e.message, 'err'); ghStatus.textContent = '失败:' + e.message; }
    });

    /* 目标 */
    root.querySelector('#stSaveGoals').addEventListener('click', () => {
      const f = WB.readForm(root);
      ['waterGoal', 'readGoalPages', 'readGoalMin', 'exerciseGoalMin', 'englishGoalMin', 'pomodoroFocus', 'pomodoroBreak', 'englishWords'].forEach(k => {
        const v = Number(f[k]);
        if (v > 0) s[k] = v;
      });
      WB.save(); WB.toast('目标已保存 ✓', 'ok');
    });

    /* 数据 */
    root.querySelector('#stExport').addEventListener('click', () => {
      const blob = new Blob([WB.exportJSON()], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = '工作台数据备份-' + WB.today() + '.json';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      WB.toast('已导出数据文件 📦', 'ok');
    });
    root.querySelector('#stImport').addEventListener('click', () => document.getElementById('stImportFile').click());
    root.querySelector('#stImportFile').addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      const rd = new FileReader();
      rd.onload = () => {
        try { WB.importJSON(rd.result); WB.toast('数据导入成功 ✓', 'ok'); location.reload(); }
        catch (err) { WB.toast('导入失败:' + err.message, 'err'); }
      };
      rd.readAsText(file);
    });
    root.querySelector('#stClear').addEventListener('click', () => {
      WB.confirmBox('确定清空全部数据?此操作不可恢复,建议先导出备份。', ok => {
        if (!ok) return;
        WB.wipe(); WB.toast('数据已清空', 'ok'); setTimeout(() => location.reload(), 600);
      });
    });
  }

  function numField(k, label, val) {
    return '<div class="field"><label>' + label + '</label><input class="input" type="number" data-field="' + k + '" value="' + val + '" min="1"></div>';
  }

  WB.register('settings', { render, refresh: render });
})();
