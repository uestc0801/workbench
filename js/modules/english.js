/* ═══════════════════════════════════════════════
   英语学习:30分钟拆分(单词10 + 口语20)+ 艾宾浩斯复习
   + 我的单词本(多本 · A-Z排序 · 批量导入 · 与每日词隔离)
   ═══════════════════════════════════════════════ */
(function () {
  'use strict';

  let sub = 'today';
  let dlgTab = 'life';
  let bookName = null;
  let wq = '';
  let wUn = false;

  /* ═══ 内置每日口语词库(40 词,按日期种子每日取 20) ═══ */
  const WORDS = [
    ['appreciate', '/əˈpriːʃieɪt/', '感激;欣赏', "I really appreciate your help."],
    ['recommend', '/ˌrekəˈmend/', '推荐', "Can you recommend a good book?"],
    ['available', '/əˈveɪləbl/', '可用的;有空的', "I'm available this afternoon."],
    ['efficient', '/ɪˈfɪʃnt/', '高效的', "She is an efficient worker."],
    ['schedule', '/ˈʃedjuːl/', '日程安排', "Let's check your schedule."],
    ['accomplish', '/əˈkʌmplɪʃ/', '完成;实现', "He accomplished his goal."],
    ['confident', '/ˈkɒnfɪdənt/', '自信的', "Be confident in yourself."],
    ['improve', '/ɪmˈpruːv/', '改进;提高', "I want to improve my English."],
    ['benefit', '/ˈbenɪfɪt/', '益处;受益', "Exercise benefits your health."],
    ['challenge', '/ˈtʃælɪndʒ/', '挑战', "It's a real challenge for me."],
    ['opportunity', '/ˌɒpəˈtjuːnəti/', '机会', "This is a great opportunity."],
    ['balance', '/ˈbæləns/', '平衡', "Keep a balance between work and rest."],
    ['familiar', '/fəˈmɪliə(r)/', '熟悉的', "This song sounds familiar."],
    ['essential', '/ɪˈsenʃl/', '必要的', "Water is essential for life."],
    ['grateful', '/ˈɡreɪtfl/', '感激的', "I'm grateful for your advice."],
    ['patience', '/ˈpeɪʃns/', '耐心', "Learning needs patience."],
    ['progress', '/ˈprəʊɡres/', '进步', "You've made great progress."],
    ['attitude', '/ˈætɪtjuːd/', '态度', "A positive attitude matters."],
    ['habit', '/ˈhæbɪt/', '习惯', "Reading is a good habit."],
    ['focus', '/ˈfəʊkəs/', '专注;焦点', "Focus on one thing at a time."],
    ['notice', '/ˈnəʊtɪs/', '注意到', "I noticed the difference."],
    ['manage', '/ˈmænɪdʒ/', '设法做到;管理', "I can manage it by myself."],
    ['provide', '/prəˈvaɪd/', '提供', "They provide free Wi-Fi."],
    ['expect', '/ɪkˈspekt/', '期待', "I expect to hear from you."],
    ['prefer', '/prɪˈfɜː(r)/', '更喜欢', "I prefer coffee to tea."],
    ['wonder', '/ˈwʌndə(r)/', '想知道', "I wonder why he left."],
    ['suggest', '/səˈdʒest/', '建议', "I suggest taking a break."],
    ['realize', '/ˈrɪəlaɪz/', '意识到', "I realized my mistake."],
    ['maintain', '/meɪnˈteɪn/', '维持;保持', "Maintain a healthy lifestyle."],
    ['achieve', '/əˈtʃiːv/', '达到;实现', "You can achieve anything."],
    ['effort', '/ˈefət/', '努力', "Great effort leads to success."],
    ['support', '/səˈpɔːt/', '支持', "Thanks for your support."],
    ['encourage', '/ɪnˈkʌrɪdʒ/', '鼓励', "My teacher encouraged me."],
    ['comfortable', '/ˈkʌmftəbl/', '舒适的', "This chair is comfortable."],
    ['healthy', '/ˈhelθi/', '健康的', "Eat healthy food every day."],
    ['discuss', '/dɪˈskʌs/', '讨论', "Let's discuss the plan."],
    ['decide', '/dɪˈsaɪd/', '决定', "I decided to study abroad."],
    ['prepare', '/prɪˈpeə(r)/', '准备', "Prepare well before the exam."],
    ['remember', '/rɪˈmembə(r)/', '记得', "Remember to drink water."],
    ['forget', '/fəˈɡet/', '忘记', "Don't forget the meeting."],
  ];

  /* ═══ 内置口语对话 ═══ */
  const DIALOGS = {
    life: { title: '生活 · 点餐', lines: [
      ['A', 'Can I have the menu, please?'],
      ['B', 'Sure, here you are.'],
      ['A', "I'd like a cheeseburger and fries."],
      ['B', 'For here or to go?'],
      ['A', 'To go, please.'],
      ['B', "That'll be 9 dollars."],
    ] },
    work: { title: '工作 · 开会', lines: [
      ['A', 'Shall we start the meeting?'],
      ['B', "Yes, let's begin."],
      ['A', 'What do you think about the proposal?'],
      ['B', "I think it's feasible."],
      ['A', 'Any other questions?'],
      ['B', 'Let me think about it first.'],
    ] },
    study: { title: '学习 · 请教', lines: [
      ['A', 'Could you explain this point again?'],
      ['B', 'Of course. It is simple.'],
      ['A', "I don't quite understand."],
      ['B', 'Let me give you an example.'],
      ['A', 'That makes sense now. Thanks!'],
      ['B', "You're welcome."],
    ] },
  };

  function todayWords(d) {
    const seed = WB.hashStr(WB.today());
    return WB.shuffle(WORDS, seed).slice(0, 20);
  }
  function yesterdayWords(d) {
    const y = WB.addDays(WB.today(), -1);
    const seed = WB.hashStr(y);
    return WB.shuffle(WORDS, seed).slice(0, 20);
  }

  function invested(d) {
    const l = d.english.learn[WB.today()] || {};
    return (l.wordsMin || 0) + (l.speakMin || 0);
  }

  /* ═══ 自动补全:内置词库 + 在线词典兜底 ═══ */
  const AUTO_DICT = {
    'mosfet': ['/ˈmɒsfet/', '金属氧化物半导体场效应晶体管(功率器件)', 'A MOSFET is widely used in power electronics and switching converters.'],
    'op-amp': ['/ˌəʊp ˈæmp/', '运算放大器', 'An op-amp is the basic building block of analog IC design.'],
    'inductor': ['/ɪnˈdʌktə(r)/', '电感器', 'The inductor stores energy in its magnetic field.'],
    'capacitor': ['/kəˈpæsɪtə(r)/', '电容器', 'The capacitor smooths the voltage ripple.'],
    'resistor': ['/rɪˈzɪstə(r)/', '电阻器', 'A resistor limits the current in the circuit.'],
    'transistor': ['/trænˈzɪstə(r)/', '晶体管', 'The transistor acts as a switch or an amplifier.'],
    'diode': ['/ˈdaɪəʊd/', '二极管', 'A diode only conducts current in one direction.'],
    'rectifier': ['/ˈrektɪfaɪə(r)/', '整流器', 'The rectifier converts AC to DC.'],
    'amplifier': ['/ˈæmplɪfaɪə(r)/', '放大器', 'The amplifier boosts the small input signal.'],
    'feedback': ['/ˈfiːdbæk/', '反馈', 'Negative feedback stabilizes the amplifier gain.'],
    'voltage': ['/ˈvəʊltɪdʒ/', '电压', 'The voltage across the resistor is 5 volts.'],
    'current': ['/ˈkʌrənt/', '电流', 'The current flows through the load.'],
    'synchronous': ['/ˈsɪŋkrənəs/', '同步的', 'Synchronous rectification improves efficiency.'],
    'switching': ['/ˈswɪtʃɪŋ/', '开关;切换', 'Switching frequency affects the inductor size.'],
    'converter': ['/kənˈvɜːtə(r)/', '转换器', 'The DC-DC converter steps down the voltage.'],
    'inverter': ['/ɪnˈvɜːtə(r)/', '逆变器', 'The inverter changes DC to AC for solar systems.'],
    'saturation': ['/ˌsætʃəˈreɪʃn/', '饱和', 'The transistor enters saturation when fully on.'],
    'threshold': ['/ˈθreʃhəʊld/', '阈值;临界值', 'The gate threshold voltage turns the device on.'],
    'impedance': ['/ɪmˈpiːdns/', '阻抗', 'High input impedance prevents loading the source.'],
    'bandwidth': ['/ˈbændwɪdθ/', '带宽', 'The op-amp bandwidth is limited by gain.'],
    'clamp': ['/klæmp/', '钳位', 'A clamp circuit limits the output voltage.'],
    'ripple': ['/ˈrɪpl/', '纹波', 'The output ripple is reduced by the filter.'],
    'efficiency': ['/ɪˈfɪʃnsi/', '效率', 'Higher efficiency means less power loss.'],
    'latency': ['/ˈleɪtnsi/', '延迟', 'Low latency is critical for real-time control.'],
    'gate': ['/ɡeɪt/', '栅极;门', 'The gate is driven by the PWM signal.'],
    'drain': ['/dreɪn/', '漏极', 'Current flows from drain to source.'],
    'source': ['/sɔːs/', '源极;来源', 'The source terminal connects to ground.'],
    'body': ['/ˈbɒdi/', '体;主体', 'The body diode is inherent in a MOSFET.'],
    'parasitic': ['/ˌpærəˈsɪtɪk/', '寄生的', 'Parasitic capacitance causes switching loss.'],
    'topology': ['/təˈpɒlədʒi/', '拓扑结构', 'The buck converter is a common topology.'],
    'compensation': ['/ˌkɒmpenˈseɪʃn/', '补偿', 'Compensation stabilizes the control loop.'],
    'thermal': ['/ˈθɜːml/', '热量的', 'Thermal management is key in power design.'],
    'snubber': ['/ˈsnʌbə(r)/', '缓冲电路', 'The snubber reduces voltage spikes.'],
    'reliability': ['/rɪˌlaɪəˈbɪləti/', '可靠性', 'Reliability matters in industrial applications.'],
    'oscillation': ['/ˌɒsɪˈleɪʃn/', '振荡', 'The control loop may cause oscillation.'],
    'application': ['/ˌæplɪˈkeɪʃn/', '应用', 'This chip is suitable for automotive applications.'],
    'analog': ['/ˈænəlɒɡ/', '模拟的', 'Analog ICs process continuous signals.'],
    'digital': ['/ˈdɪdʒɪtl/', '数字的', 'Digital circuits work with discrete levels.'],
    'integrated': ['/ˈɪntɪɡreɪtɪd/', '集成的', 'An integrated circuit packs many transistors.'],
    'semiconductor': ['/ˌsemikənˈdʌktə(r)/', '半导体', 'Silicon is the most common semiconductor.'],
    'appreciate': ['/əˈpriːʃieɪt/', '感激;欣赏', "I really appreciate your help."],
    'recommend': ['/ˌrekəˈmend/', '推荐', "Can you recommend a good book?"],
    'available': ['/əˈveɪləbl/', '可用的;有空的', "I'm available this afternoon."],
    'efficient': ['/ɪˈfɪʃnt/', '高效的', 'She is an efficient worker.'],
    'schedule': ['/ˈʃedjuːl/', '日程安排', "Let's check your schedule."],
    'accomplish': ['/əˈkʌmplɪʃ/', '完成;实现', 'He accomplished his goal.'],
    'confident': ['/ˈkɒnfɪdənt/', '自信的', 'Be confident in yourself.'],
    'improve': ['/ɪmˈpruːv/', '改进;提高', 'I want to improve my English.'],
    'benefit': ['/ˈbenɪfɪt/', '益处;受益', 'Exercise benefits your health.'],
    'challenge': ['/ˈtʃælɪndʒ/', '挑战', "It's a real challenge for me."],
    'opportunity': ['/ˌɒpəˈtjuːnəti/', '机会', 'This is a great opportunity.'],
    'balance': ['/ˈbæləns/', '平衡', 'Keep a balance between work and rest.'],
    'familiar': ['/fəˈmɪliə(r)/', '熟悉的', 'This song sounds familiar.'],
    'essential': ['/ɪˈsenʃl/', '必要的', 'Water is essential for life.'],
    'grateful': ['/ˈɡreɪtfl/', '感激的', "I'm grateful for your advice."],
    'patience': ['/ˈpeɪʃns/', '耐心', 'Learning needs patience.'],
    'progress': ['/ˈprəʊɡres/', '进步', "You've made great progress."],
    'attitude': ['/ˈætɪtjuːd/', '态度', 'A positive attitude matters.'],
    'habit': ['/ˈhæbɪt/', '习惯', 'Reading is a good habit.'],
    'focus': ['/ˈfəʊkəs/', '专注;焦点', 'Focus on one thing at a time.'],
    'notice': ['/ˈnəʊtɪs/', '注意到', 'I noticed the difference.'],
    'manage': ['/ˈmænɪdʒ/', '设法做到;管理', 'I can manage it by myself.'],
    'provide': ['/prəˈvaɪd/', '提供', 'They provide free Wi-Fi.'],
    'expect': ['/ɪkˈspekt/', '期待', 'I expect to hear from you.'],
    'prefer': ['/prɪˈfɜː(r)/', '更喜欢', 'I prefer coffee to tea.'],
    'wonder': ['/ˈwʌndə(r)/', '想知道', 'I wonder why he left.'],
    'suggest': ['/səˈdʒest/', '建议', 'I suggest taking a break.'],
    'realize': ['/ˈrɪəlaɪz/', '意识到', 'I realized my mistake.'],
    'maintain': ['/meɪnˈteɪn/', '维持;保持', 'Maintain a healthy lifestyle.'],
    'achieve': ['/əˈtʃiːv/', '达到;实现', 'You can achieve anything.'],
    'effort': ['/ˈefət/', '努力', 'Great effort leads to success.'],
    'support': ['/səˈpɔːt/', '支持', "Thanks for your support."],
    'encourage': ['/ɪnˈkʌrɪdʒ/', '鼓励', 'My teacher encouraged me.'],
    'comfortable': ['/ˈkʌmftəbl/', '舒适的', 'This chair is comfortable.'],
    'healthy': ['/ˈhelθi/', '健康的', 'Eat healthy food every day.'],
    'discuss': ['/dɪˈskʌs/', '讨论', "Let's discuss the plan."],
    'decide': ['/dɪˈsaɪd/', '决定', 'I decided to study abroad.'],
    'prepare': ['/prɪˈpeə(r)/', '准备', 'Prepare well before the exam.'],
    'remember': ['/rɪˈmembə(r)/', '记得', 'Remember to drink water.'],
    'forget': ['/fəˈɡet/', '忘记', "Don't forget the meeting."],
    'learn': ['/lɜːn/', '学习', 'We learn something new every day.'],
    'study': ['/ˈstʌdi/', '学习;研究', 'I study English for 30 minutes daily.'],
    'practice': ['/ˈpræktɪs/', '练习', 'Practice makes perfect.'],
    'speak': ['/spiːk/', '说;讲', 'Speak clearly and confidently.'],
    'listen': ['/ˈlɪsn/', '听', 'Listen carefully to the pronunciation.'],
    'read': ['/riːd/', '阅读', 'Read the passage aloud.'],
    'write': ['/raɪt/', '写', 'Write down the new words.'],
    'translate': ['/trænzˈleɪt/', '翻译', 'Translate this sentence into Chinese.'],
    'pronounce': ['/prəˈnaʊns/', '发音', 'How do you pronounce this word?'],
    'vocabulary': ['/vəˈkæbjələri/', '词汇', 'Build your vocabulary step by step.'],
    'fluent': ['/ˈfluːənt/', '流利的', 'She is fluent in English.'],
    'grammar': ['/ˈɡræmə(r)/', '语法', 'Grammar rules help you express clearly.'],
    'sentence': ['/ˈsentəns/', '句子', 'Make a sentence with this word.'],
    'pronunciation': ['/prəˌnʌnsiˈeɪʃn/', '发音', 'Practice your pronunciation every day.'],
    'meaning': ['/ˈmiːnɪŋ/', '意思', 'What is the meaning of this word?'],
    'synonym': ['/ˈsɪnənɪm/', '同义词', 'Look for a synonym to enrich your writing.'],
    'antonym': ['/ˈæntənɪm/', '反义词', "Happy's antonym is sad."],
    'context': ['/ˈkɒntekst/', '语境;上下文', 'Understand the word in context.'],
    'communication': ['/kəˌmjuːnɪˈkeɪʃn/', '沟通', 'Good communication builds trust.'],
    'conversation': ['/ˌkɒnvəˈseɪʃn/', '对话', 'Practice conversation with a partner.'],
  };
  async function autoComplete(box) {
    const word = (box.querySelector('[data-field="word"]').value || '').trim();
    if (!word) return WB.toast('先输入单词', 'warn');
    const key = word.toLowerCase();
    let res = AUTO_DICT[key];
    if (!res) {
      // 在线词典兜底:dict.youdao 免费接口
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 3500);
        const r = await fetch('https://dict.youdao.com/suggest?q=' + encodeURIComponent(word) + '&num=1&doctype=json', { signal: ctrl.signal });
        clearTimeout(t);
        const j = await r.json();
        const item = j.data && j.data.entries && j.data.entries[0];
        const ex = j.data && j.data.entries && j.data.entries[0] && j.data.entries[0].ex || '';
        if (item) {
          res = [
            item.phonetic ? '/' + item.phonetic + '/' : '',
            (item.explain && item.explain[0]) || '',
            ex || '',
          ];
        }
      } catch (e) { /* 网络失败 */ }
    }
    if (!res) return WB.toast('未找到,请手动填写', 'warn');
    box.querySelector('[data-field="phone"]').value = res[0] || '';
    box.querySelector('[data-field="mean"]').value = res[1] || '';
    box.querySelector('[data-field="note"]').value = res[2] || '';
    WB.toast('已自动补全 ✓ 可再编辑', 'ok');
  }

  /* ═══ 我的单词本 ═══ */
  function wbList(d) { return Object.keys(d.english.wordbook || {}); }
  function wbArr(d, name) { return d.english.wordbook[name] || []; }
  function sortWords(arr) { return arr.slice().sort((a, b) => a.word.toLowerCase().localeCompare(b.word.toLowerCase())); }
  function ensureBooks(d) {
    if (!d.english.wordbook['电力电子']) d.english.wordbook['电力电子'] = [];
    if (!d.english.wordbook['模拟IC']) d.english.wordbook['模拟IC'] = [];
    if (!d.english.wordbook['日常积累']) d.english.wordbook['日常积累'] = [];
  }

  function openWordModal(pre) {
    pre = pre || {};
    const d = WB.data;
    ensureBooks(d);
    const books = wbList(d);
    const target = bookName && books.includes(bookName) ? bookName : books[0];
    const html = '<h4>添加单词</h4>'
      + '<div class="field"><label>单词</label><div class="row" style="gap:8px"><input class="input grow" data-field="word" value="' + WB.esc(pre.word || '') + '" placeholder="如 MOSFET" autofocus>'
      + '<button class="btn sm soft" id="wAuto" type="button" style="white-space:nowrap">✨ 自动补全</button></div>'
      + '<div class="small mt4">输入英文单词后点「自动补全」,自动填充音标、释义、例句</div></div>'
      + '<div class="form-row">'
      + '<div class="field"><label>音标</label><input class="input" data-field="phone" value="' + WB.esc(pre.phone || '') + '" placeholder="/…/">'
      + '<div class="small mt4"><a href="javascript:void 0" id="wAutoPhone">手动生成音标</a></div></div>'
      + '<div class="field"><label>单词本</label><select class="select" data-field="book">'
      + books.map(b => '<option ' + (b === target ? 'selected' : '') + '>' + b + '</option>').join('') + '</select></div></div>'
      + '<div class="field"><label>释义</label><input class="input" data-field="mean" value="' + WB.esc(pre.mean || '') + '" placeholder="中文释义"></div>'
      + '<div class="field"><label>备注 / 例句</label><textarea class="textarea" data-field="note" placeholder="记忆点、例句、来源上下文…">' + WB.esc(pre.note || '') + '</textarea></div>'
      + '<div class="field"><label>来源</label><input class="input" data-field="source" value="' + WB.esc(pre.source || '') + '" placeholder="在哪遇到的(文章/书籍/对话)"></div>'
      + '<div class="m-actions"><button class="btn" id="mCancel">取消</button><button class="btn primary" id="mOk">保存</button></div>';
    const box = WB.openModal(html);
    box.querySelector('#mCancel').addEventListener('click', WB.closeModal);
    box.querySelector('#wAuto').addEventListener('click', () => autoComplete(box));
    box.querySelector('#wAutoPhone').addEventListener('click', () => {
      const w = box.querySelector('[data-field="word"]').value.trim();
      if (!w) return WB.toast('先输入单词', 'warn');
      box.querySelector('[data-field="phone"]').value = '/ˈ' + w.replace(/e$/, '').toLowerCase() + '/';
    });
    box.querySelector('#mOk').addEventListener('click', () => {
      const f = WB.readForm(box);
      const w = (f.word || '').trim();
      if (!w) return WB.toast('请输入单词', 'warn');
      d.english.wordbook[f.book] = d.english.wordbook[f.book] || [];
      d.english.wordbook[f.book].push({ id: WB.uid('w'), word: w, phone: f.phone, mean: f.mean, note: f.note, source: f.source, mastered: false, createdAt: WB.today() });
      WB.save(); WB.closeModal(); WB.toast('已加入「' + f.book + '」✓', 'ok');
      WB.forceRender('english');
    });
  }

  function openImport() {
    const d = WB.data;
    ensureBooks(d);
    const books = wbList(d);
    const html = '<h4>批量导入单词</h4>'
      + '<div class="small mb12" style="line-height:1.7">每行一个,格式:<b>单词|音标|释义|备注</b>。释义必填,其余可留空。</div>'
      + '<div class="field"><label>导入到</label><select class="select" id="impBook">' + books.map(b => '<option>' + b + '</option>').join('') + '</select></div>'
      + '<div class="field"><label>内容</label><textarea class="textarea" id="impText" placeholder="MOSFET|/ˈmɒsfet/|金属氧化物半导体场效应管|电力电子核心器件&#10;op-amp|/ɒp æmp/|运算放大器|模拟IC基础" style="min-height:160px"></textarea></div>'
      + '<div class="m-actions"><button class="btn" id="mCancel">取消</button><button class="btn primary" id="mOk">导入</button></div>';
    const box = WB.openModal(html);
    box.querySelector('#mCancel').addEventListener('click', WB.closeModal);
    box.querySelector('#mOk').addEventListener('click', () => {
      const bn = box.querySelector('#impBook').value;
      const text = box.querySelector('#impText').value;
      const lines = text.split('\n').map(s => s.trim()).filter(Boolean);
      if (!lines.length) return WB.toast('内容为空', 'warn');
      let ok = 0, skip = 0;
      lines.forEach(line => {
        const parts = line.split('|').map(s => s.trim());
        if (!parts[0]) return;
        if (wbArr(d, bn).some(x => x.word.toLowerCase() === parts[0].toLowerCase())) { skip++; return; }
        d.english.wordbook[bn].push({ id: WB.uid('w'), word: parts[0], phone: parts[1] || '', mean: parts[2] || '', note: parts[3] || '', source: '', mastered: false, createdAt: WB.today() });
        ok++;
      });
      WB.save(); WB.closeModal(); WB.toast('导入 ' + ok + ' 个' + (skip ? ',跳过重复 ' + skip : '') + ' ✓', 'ok');
      WB.forceRender('english');
    });
  }

  /* 供书架跨模块调用 */
  window.WBWord = {
    addOne(word) { openWordModal({ word, source: '书架摘抄' }); },
  };

  function renderBook(root, d) {
    ensureBooks(d);
    const books = wbList(d);
    const cur = bookName && books.includes(bookName) ? bookName : books[0];
    bookName = cur;
    const arr = wbArr(d, cur);
    const shown = sortWords(arr.filter(x => (!wq || (x.word + ' ' + x.mean + ' ' + x.note).toLowerCase().includes(wq)) && (!wUn || !x.mastered)));
    root.innerHTML = '<div class="card mb16"><div class="card-title"><h3>📖 我的单词本</h3>'
      + '<div class="right"><button class="btn sm" id="wbImport">📥 批量导入</button>'
      + '<button class="btn sm primary" id="wbAdd">+ 添加单词</button></div></div>'
      + '<div class="small mb12" style="line-height:1.7">专业词汇与每日 20 词完全隔离,自动按 <b>A–Z</b> 排序,支持编辑、发音、搜索。预置「电力电子」「模拟IC」,可自建。</div>'
      + '<div class="row wrap mb12" style="gap:6px">'
      + books.map(b => '<button class="chip ' + (b === cur ? 'blue' : '') + '" data-bk="' + b + '">' + b + ' (' + wbArr(d, b).length + ')</button>').join('')
      + '<button class="chip" id="wbNew" style="border-style:dashed">+ 新建单词本</button>'
      + (books.length > 1 ? '<button class="chip red" id="wbDel">删除当前</button>' : '')
      + '</div>'
      + '<div class="row" style="gap:8px"><svg viewBox="0 0 24 24" class="ic" style="width:16px;height:16px;color:var(--ink-3)"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.2 4.2"/></svg>'
      + '<input class="input grow" id="wbSearch" placeholder="中文 / 英文快速查找…" value="' + WB.esc(wq) + '">'
      + '<label class="small" style="display:flex;align-items:center;gap:5px;white-space:nowrap"><input type="checkbox" id="wbUn" ' + (wUn ? 'checked' : '') + '> 只看未掌握</label></div>'
      + '</div>'
      + '<div class="card"><div class="card-title"><h3>「' + cur + '」 · ' + shown.length + ' 词</h3>'
      + '<span class="badge">已掌握 ' + wbArr(d, cur).filter(x => x.mastered).length + '</span></div>'
      + '<div class="list">'
      + shown.map(x => '<div class="word-row" data-skey="' + x.id + '">'
        + '<button class="checkbox' + (x.mastered ? ' done' : '') + '" data-master="' + x.id + '" style="width:20px;height:20px;border-radius:6px"><svg viewBox="0 0 24 24" style="width:11px;height:11px"><path d="M5 12l5 5 9-10"/></svg></button>'
        + '<div class="grow" style="min-width:0">'
        + '<div class="row" style="gap:8px"><span class="w">' + WB.esc(x.word) + '</span>'
        + (x.phone ? '<span class="ph">' + WB.esc(x.phone) + '</span>' : '')
        + '<button class="iconbtn" data-speak="' + WB.esc(x.word) + '" style="width:26px;height:26px"><svg viewBox="0 0 24 24" class="ic" style="width:15px;height:15px"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 8.5a4 4 0 0 1 0 7"/></svg></button></div>'
        + (x.mean ? '<div class="mn">' + WB.esc(x.mean) + '</div>' : '')
        + (x.note ? '<div class="small mt4" style="line-height:1.6">' + WB.esc(x.note) + '</div>' : '')
        + (x.source ? '<div class="src mt4">📍 ' + WB.esc(x.source) + '</div>' : '')
        + '</div>'
        + '<button class="iconbtn" data-edit="' + x.id + '" style="width:30px;height:30px"><svg viewBox="0 0 24 24" class="ic" style="width:15px;height:15px"><path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17z"/></svg></button>'
        + '</div>').join('')
      || '<div class="empty"><p>' + (wbArr(d, cur).length ? '没有匹配的单词' : '这个单词本还是空的,点击「+ 添加单词」开始') + '</p></div>'
      + '</div></div>';

    root.querySelectorAll('[data-bk]').forEach(b => b.addEventListener('click', () => { bookName = b.dataset.bk; WB.forceRender('english'); }));
    root.querySelector('#wbAdd').addEventListener('click', () => openWordModal());
    root.querySelector('#wbImport').addEventListener('click', openImport);
    root.querySelector('#wbNew').addEventListener('click', () => {
      WB.openModal('<h4>新建单词本</h4><div class="field"><label>单词本名称</label><input class="input" id="nbName" placeholder="如:论文生词" maxlength="12"></div>'
        + '<div class="m-actions"><button class="btn" id="mCancel">取消</button><button class="btn primary" id="mOk">创建</button></div>');
      const box = document.getElementById('modalBox');
      box.querySelector('#mCancel').addEventListener('click', WB.closeModal);
      box.querySelector('#mOk').addEventListener('click', () => {
        const n = box.querySelector('#nbName').value.trim();
        if (!n) return WB.toast('请输入名称', 'warn');
        if (d.english.wordbook[n]) return WB.toast('已存在同名单词本', 'warn');
        d.english.wordbook[n] = [];
        bookName = n; WB.save(); WB.closeModal(); WB.toast('已创建「' + n + '」', 'ok'); WB.forceRender('english');
      });
    });
    root.querySelector('#wbDel').addEventListener('click', () => {
      WB.confirmBox('删除单词本「' + cur + '」及其全部单词?', ok => {
        if (!ok) return;
        delete d.english.wordbook[cur];
        bookName = null; WB.save(); WB.forceRender('english');
      });
    });
    root.querySelector('#wbSearch').addEventListener('input', e => { wq = e.target.value.trim().toLowerCase(); renderBook(root, d); });
    root.querySelector('#wbUn').addEventListener('change', e => { wUn = e.target.checked; renderBook(root, d); });
    root.querySelectorAll('[data-master]').forEach(b => b.addEventListener('click', () => {
      const x = wbArr(d, cur).find(v => v.id === b.dataset.master);
      if (x) { x.mastered = !x.mastered; WB.save(); WB.forceRender('english'); }
    }));
    root.querySelectorAll('[data-speak]').forEach(b => b.addEventListener('click', () => WB.speakEn(b.dataset.speak)));
    root.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => {
      const x = wbArr(d, cur).find(v => v.id === b.dataset.edit);
      const html = '<h4>编辑单词</h4>'
        + '<div class="field"><label>单词</label><input class="input" data-field="word" value="' + WB.esc(x.word) + '"></div>'
        + '<div class="field"><label>音标</label><input class="input" data-field="phone" value="' + WB.esc(x.phone || '') + '"></div>'
        + '<div class="field"><label>释义</label><input class="input" data-field="mean" value="' + WB.esc(x.mean || '') + '"></div>'
        + '<div class="field"><label>备注 / 例句</label><textarea class="textarea" data-field="note">' + WB.esc(x.note || '') + '</textarea></div>'
        + '<div class="field"><label>来源</label><input class="input" data-field="source" value="' + WB.esc(x.source || '') + '"></div>'
        + '<div class="m-actions" style="justify-content:space-between"><button class="btn danger" id="mDel">删除</button>'
        + '<div class="row" style="gap:10px"><button class="btn" id="mCancel">取消</button><button class="btn primary" id="mOk">保存</button></div></div>';
      const box = WB.openModal(html);
      box.querySelector('#mCancel').addEventListener('click', WB.closeModal);
      box.querySelector('#mDel').addEventListener('click', () => {
        d.english.wordbook[cur] = wbArr(d, cur).filter(v => v.id !== x.id);
        WB.save(); WB.closeModal(); WB.forceRender('english');
      });
      box.querySelector('#mOk').addEventListener('click', () => {
        const f = WB.readForm(box);
        if (!f.word.trim()) return WB.toast('单词不能为空', 'warn');
        Object.assign(x, { word: f.word.trim(), phone: f.phone, mean: f.mean, note: f.note, source: f.source });
        WB.save(); WB.closeModal(); WB.toast('已保存 ✓', 'ok'); WB.forceRender('english');
      });
    }));
  }

  /* ═══ 今日学习 ═══ */
  function renderToday(root, d) {
    const t = WB.today();
    const l = d.english.learn[t] = d.english.learn[t] || { wordsMin: 0, speakMin: 0, doneWords: false, doneDialog: false };
    const inv = invested(d);
    const goal = d.settings.englishGoalMin || 30;
    const words = todayWords(d);
    const yw = yesterdayWords(d);
    root.innerHTML = '<div class="card mb16"><div class="card-title"><h3>今日学习总时长</h3><span class="badge">' + WB.fmtMin(inv) + ' / ' + goal + ' 分钟</span></div>'
      + '<div id="enMeter"></div>'
      + '<div class="row mt8 wrap" style="gap:8px">'
      + '<span class="chip blue">单词 ' + l.wordsMin + ' 分' + (l.doneWords ? ' ✓' : '') + '</span>'
      + '<span class="chip orange">口语 ' + l.speakMin + ' 分' + (l.doneDialog ? ' ✓' : '') + '</span>'
      + (inv >= goal ? '<span class="chip mint">今日目标已达成 🎉</span>' : '<span class="chip yellow">还差 ' + (goal - inv) + ' 分钟</span>')
      + '</div></div>'
      // 单词 10 分钟
      + '<div class="card mb16"><div class="card-title"><h3>🔵 单词记忆 · 10 分钟</h3>'
      + '<div class="right"><button class="btn sm ' + (l.doneWords ? 'soft' : 'primary') + '" id="enWordsDone">' + (l.doneWords ? '✓ 今日已完成' : '标记完成(计入 10 分钟)') + '</button>'
      + '<button class="btn sm" id="enWordsPlus">+10 分</button></div></div>'
      + '<div class="small mb12">每日 20 个实用口语词 · 内置 <b>艾宾浩斯复习</b>:次日自动复习前一天单词</div>'
      // 复习昨日
      + '<details class="q3-box mb12"><summary class="semibold" style="cursor:pointer;font-size:13px;color:var(--accent)">📌 艾宾浩斯复习 · 昨日 ' + yw.length + ' 词(点开复习)</summary>'
      + '<div class="list mt8" style="max-height:280px;overflow-y:auto">' + yw.map(w => '<div class="word-row" style="padding:9px 12px">'
        + '<span class="w" style="font-size:14px">' + w[0] + '</span><span class="ph">' + w[1] + '</span>'
        + '<span class="mn">' + w[2] + '</span><button class="iconbtn" data-sy="' + w[0] + '" style="width:28px;height:28px"><svg viewBox="0 0 24 24" class="ic" style="width:15px;height:15px"><path d="M4 9v6h4l5 4V5L8 9z"/></svg></button></div>').join('') + '</div></details>'
      // 今日词
      + '<div class="list" style="max-height:420px;overflow-y:auto">' + words.map(w => '<div class="word-row" style="padding:10px 12px">'
        + '<span class="w" style="font-size:15px">' + w[0] + '</span><span class="ph">' + w[1] + '</span>'
        + '<span class="mn">' + w[2] + '</span>'
        + '<button class="iconbtn" data-sy="' + w[0] + '" style="width:30px;height:30px"><svg viewBox="0 0 24 24" class="ic" style="width:16px;height:16px"><path d="M4 9v6h4l5 4V5L8 9z"/></svg></button></div>')
        .join('') + '</div>'
      + '<div class="small mt8" style="line-height:1.7">💡 今日例句:</div><div class="q3-box mt8"><div class="q">' + WB.esc(words[0][3]) + '</div><div class="small">' + WB.esc(words[0][2]) + ' · 点击上方扬声器可跟读</div></div>'
      + '</div>'
      // 口语 20 分钟
      + '<div class="card"><div class="card-title"><h3>🟠 口语练习 · 20 分钟</h3>'
      + '<div class="right"><div class="seg" id="dlgTab">'
      + [['life', '生活'], ['work', '工作'], ['study', '学习']].map(x => '<button data-v="' + x[0] + '" class="' + (dlgTab === x[0] ? 'active' : '') + '">' + x[1] + '</button>').join('')
      + '</div><button class="btn sm primary" id="enSpeakDone">标记完成(+20 分)</button></div></div>'
      + '<div class="q3-box mb12"><div class="q">情景 · ' + DIALOGS[dlgTab].title + '</div>'
      + '<div class="mt8">' + DIALOGS[dlgTab].lines.map(l => '<div class="row mt8" style="gap:8px;align-items:flex-start">'
        + '<span class="chip ' + (l[0] === 'A' ? 'blue' : 'orange') + '" style="flex:none;min-width:26px;justify-content:center">' + l[0] + '</span>'
        + '<span class="grow" style="font-size:14px;line-height:1.7">' + l[1] + '</span>'
        + '<button class="iconbtn" data-dl="' + WB.esc(l[1]) + '" style="width:30px;height:30px;flex:none"><svg viewBox="0 0 24 24" class="ic" style="width:16px;height:16px"><path d="M4 9v6h4l5 4V5L8 9z"/></svg></button></div>').join('') + '</div>'
      + '<div class="small mt12" style="line-height:1.7">跟读技巧:先整句听 → 模仿停顿与重音 → 自己开口读一遍并录下对比。每日 20 分钟,坚持 30 天见成效。</div></div>'
      + '</div>';

    WBChart.meter(document.getElementById('enMeter'), { value: inv, total: goal, color: WBChart.getColor('accent') });
    root.querySelectorAll('[data-sy]').forEach(b => b.addEventListener('click', () => WB.speakEn(b.dataset.sy)));
    root.querySelectorAll('[data-dl]').forEach(b => b.addEventListener('click', () => WB.speakEn(b.dataset.dl)));
    root.querySelectorAll('#dlgTab button').forEach(b => b.addEventListener('click', () => { dlgTab = b.dataset.v; render(root); }));
    root.querySelector('#enWordsPlus').addEventListener('click', () => { l.wordsMin += 10; WB.save(); WB.toast('单词 +10 分钟 ⏱', 'ok'); render(root); });
    root.querySelector('#enWordsDone').addEventListener('click', () => {
      if (l.doneWords) return WB.toast('今日单词已完成', 'warn');
      l.doneWords = true; l.wordsMin = Math.max(l.wordsMin, 10); WB.save(); WB.toast('单词学习完成 ✓ 计 10 分钟', 'ok'); render(root);
    });
    root.querySelector('#enSpeakDone').addEventListener('click', () => {
      l.doneDialog = true; l.speakMin = Math.max(l.speakMin, 20); WB.save(); WB.toast('口语练习完成 ✓ 计 20 分钟', 'ok'); render(root);
    });
  }

  /* ═══ 学习统计 ═══ */
  function renderStats(root, d) {
    const t = WB.today();
    const weekly = [];
    for (let i = 6; i >= 0; i--) {
      const ds = WB.addDays(t, -i);
      const l = d.english.learn[ds] || {};
      weekly.push({ label: ds.slice(5).replace('-', '/'), value: (l.wordsMin || 0) + (l.speakMin || 0) });
    }
    const totalWeek = weekly.reduce((s, x) => s + x.value, 0);
    const totalAll = Object.values(d.english.learn).reduce((s, l) => s + (l.wordsMin || 0) + (l.speakMin || 0), 0);
    root.innerHTML = '<div class="grid g2 mb16">'
      + '<div class="card"><div class="stat-tile"><span class="lbl">近 7 天英语学习</span><span class="val">' + WB.fmtMin(totalWeek) + '</span><span class="small">目标 ' + (d.settings.englishGoalMin * 7) + ' 分钟/周</span></div></div>'
      + '<div class="card"><div class="stat-tile"><span class="lbl">累计学习时长</span><span class="val">' + WB.fmtMin(totalAll) + '</span><span class="small">全部记录合计</span></div></div>'
      + '</div>'
      + '<div class="card"><div class="card-title"><h3>近 7 天每日英语时长</h3></div>'
      + '<div id="stBars"></div><div class="legend mt8"><span><i class="sw" style="background:' + WBChart.getColor('orange') + '"></i>每日分钟数</span></div></div>';
    WBChart.bars(document.getElementById('stBars'), { data: weekly, height: 210, unit: '分', colors: { __: WBChart.getColor('orange') } });
  }

  /* ═══ 主渲染 ═══ */
  function render(root) {
    const d = WB.data;
    ensureBooks(d);
    const todayMin = invested(d);
    root.innerHTML = '<div class="page-head"><div class="page-title">英语学习</div><div class="page-sub">30 分钟拆解 · 每日 20 词 + 口语跟读 · 自定义单词本</div>'
      + '<div class="seg-tabs mt12" id="enTab">'
      + [['today', '今日学习'], ['book', '我的单词本'], ['stats', '学习统计']].map(x =>
        '<button class="stab ' + (sub === x[0] ? 'active' : '') + '" data-t="' + x[0] + '">' + x[1] + '</button>').join('')
      + '</div><div id="enBody"></div></div>';
    root.querySelectorAll('#enTab .stab').forEach(b => b.addEventListener('click', () => { sub = b.dataset.t; render(root); }));
    const body = document.getElementById('enBody');
    if (sub === 'book') renderBook(body, d);
    else if (sub === 'stats') renderStats(body, d);
    else renderToday(body, d);
  }

  WB.register('english', { render, refresh: render });
})();
