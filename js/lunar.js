/* ═══════════════════════════════════════════════
   农历换算 / 黄历(黄道黑道·吉凶宜忌·冲煞·财神) / 星座运势
   全部本地算法,离线可用;星座运势用确定性种子生成
   ═══════════════════════════════════════════════ */
(function () {
  'use strict';
  const WB = window.WB || {};

  /* 农历数据表 1900-2099(每位表示当年月份信息) */
  const lunarInfo = [
    0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,
    0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,
    0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,
    0x06566,0x0d4a0,0x0ea50,0x06e95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,
    0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557,
    0x06ca0,0x0b550,0x15355,0x04da0,0x0a5b0,0x14573,0x052b0,0x0a9a8,0x0e950,0x06aa0,
    0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0,
    0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b6a0,0x195a6,
    0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570,
    0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,0x055c0,0x0ab60,0x096d5,0x092e0,
    0x0c960,0x0d954,0x0d4a0,0x0da50,0x07552,0x056a0,0x0abb7,0x025d0,0x092d0,0x0cab5,
    0x0a950,0x0b4a0,0x0baa4,0x0ad50,0x055d9,0x04ba0,0x0a5b0,0x15176,0x052b0,0x0a930,
    0x07954,0x06aa0,0x0ad50,0x05b52,0x04b60,0x0a6e6,0x0a4e0,0x0d260,0x0ea65,0x0d530,
    0x05aa0,0x076a3,0x096d0,0x04afb,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,0x0dd45,
    0x0b5a0,0x056d0,0x055b2,0x049b0,0x0a577,0x0a4b0,0x0aa50,0x1b255,0x06d20,0x0ada0,
    0x14b63,0x09370,0x049f8,0x04970,0x064b0,0x168a6,0x0ea50,0x06b20,0x1a6c4,0x0aae0,
    0x0a2e0,0x0d2e3,0x0c960,0x0d557,0x0d4a0,0x0da50,0x05d55,0x056a0,0x0a6d0,0x055d4,
    0x052d0,0x0a9b8,0x0a950,0x0b4a0,0x0b6a6,0x0ad50,0x055a0,0x0aba4,0x0a5b0,0x052b0,
    0x0b273,0x06930,0x07337,0x06aa0,0x0ad50,0x14b55,0x04b60,0x0a570,0x054e4,0x0d160,
    0x0e968,0x0d520,0x0daa0,0x16aa6,0x056d0,0x04ae0,0x0a9d4,0x0a2d0,0x0d150,0x0f252,
    0x0d520];

  const TianGan = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  const DiZhi = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  const Zodiac = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];
  const MONTH_CN = ['正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '冬月', '腊月'];
  const DAY_CN = ['初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
    '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
    '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'];

  function leapMonth(y) { return lunarInfo[y - 1900] & 0xf; }
  function leapDays(y) { if (leapMonth(y)) return ((lunarInfo[y - 1900] & 0x10000) ? 30 : 29); return 0; }
  function monthDays(y, m) { return (lunarInfo[y - 1900] & (0x10000 >> m)) ? 30 : 29; }
  function yearDays(y) {
    let sum = 348;
    for (let i = 0x8000; i > 0x8; i >>= 1) sum += (lunarInfo[y - 1900] & i) ? 1 : 0;
    return sum + leapDays(y);
  }

  function leapYear(y) { return leapMonth(y) ? true : false; }

  /* 农历月日(1月起)及闰月标记 */
  function lunarMonthDay(offsetDays) {
    let y = 1900, tmp = offsetDays;
    while (tmp >= yearDays(y)) { tmp -= yearDays(y); y++; }
    let m = 1, isLeap = false;
    for (; m < 13; m++) {
      const d = monthDays(y, m); // 正常月
      if (tmp < d) break;
      tmp -= d;
      if (leapYear(y) && m === leapMonth(y)) { // 正常 m 月之后跟闰 m 月
        const ld = leapDays(y);
        if (tmp < ld) { isLeap = true; break; }
        tmp -= ld;
      }
    }
    return { y, m, d: tmp + 1, isLeap };
  }

  function cyclical(gzNum) {
    gzNum = ((gzNum % 60) + 60) % 60;
    return TianGan[gzNum % 10] + DiZhi[gzNum % 12];
  }

  /* 公历 -> 农历对象 */
  function solar2lunar(date) {
    // 1900-01-31 = 农历 1900 正月初一
    const base = new Date(1900, 0, 31);
    const offset = Math.round((date - base) / 86400000);
    if (offset < 0) return null;
    const lmd = lunarMonthDay(offset);
    const lunarYear = lmd.y, lunarMonth = lmd.m, lunarDay = lmd.d;
    // 年干支
    const ygz = cyclical(lunarYear - 4);
    const animal = Zodiac[((lunarYear - 4) % 12 + 12) % 12];
    // 月干支(近似,农历月 -> 月支:正月寅)
    const monthGanZhi = monthGz(lunarYear, lunarMonth);
    // 日干支:2000-01-07 为甲子日
    const dayOffset = Math.round((date - new Date(2000, 0, 7)) / 86400000);
    const dgz = cyclical(dayOffset);
    const isLeap = lmd.isLeap;
    return {
      year: lunarYear, month: lunarMonth, day: lunarDay, isLeap,
      lunarStr: (isLeap ? '闰' : '') + MONTH_CN[lunarMonth - 1] + DAY_CN[lunarDay - 1],
      gzYear: ygz, gzMonth: monthGanZhi, gzDay: dgz, animal,
    };
  }

  /* 月柱(五虎遁) */
  function monthGz(year, lm) {
    const yG = cyclical(year - 4)[0];
    const base = { '甲': '丙', '乙': '戊', '丙': '庚', '丁': '壬', '戊': '甲', '己': '丙', '庚': '戊', '辛': '庚', '壬': '壬', '癸': '甲' }[yG];
    const idx = TianGan.indexOf(base);
    // 农历月 -> 月支:正月=寅(2), 依次
    const zhiIdx = ((lm + 1) % 12 + 12) % 12; // 正月(1) -> 寅(2)
    return TianGan[(idx + lm - 1) % 10] + DiZhi[zhiIdx];
  }

  /* ── 十二建除(黄道黑道) ── */
  const JIANCHU = ['建', '除', '满', '平', '定', '执', '破', '危', '成', '收', '开', '闭'];
  const HUANG_HEI = { '建': 0, '除': 1, '满': 1, '平': 1, '定': 1, '执': 1, '破': 0, '危': 0, '成': 1, '收': 1, '开': 1, '闭': 0 };
  // 每月建日 = 月支对应日支
  function jianChu(date) {
    const lunar = solar2lunar(date);
    if (!lunar) return { name: '开', isHuang: true };
    const monthZhi = (lunar.month + 1) % 12; // 正月=寅(2) -> 0-index 2
    const dayZhi = DiZhi.indexOf(lunar.gzDay[1]);
    const offset = (dayZhi - monthZhi + 12) % 12;
    const name = JIANCHU[offset];
    return { name, isHuang: !!HUANG_HEI[name] };
  }

  /* ── 宜忌 ── */
  const YI_POOL = ['祭祀', '祈福', '出行', '嫁娶', '入宅', '开市', '动土', '安床', '赴任', '纳财', '交易', '签约', '订盟', '修造', '会友', '入学', '求财', '沐浴', '扫舍', '移徙', '理髮', '牧养'];
  const JI_POOL = ['安葬', '破土', '开仓', '词讼', '远行', '上梁', '动土', '婚嫁', '开市', '搬迁', '入宅', '求医', '伐木', '作灶', '立券', '出行'];
  function yiJi(date) {
    const jc = jianChu(date);
    const lunar = solar2lunar(date);
    const seed = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
    let count = jc.isHuang ? 5 : 2;
    const yi = WB.shuffle(YI_POOL, seed).slice(0, count);
    count = jc.isHuang ? 2 : 5;
    const ji = WB.shuffle(JI_POOL, seed + 7).slice(0, count);
    // 建除特例
    if (jc.name === '破') { ji.push('开市', '出行'); yi.length = Math.min(yi.length, 1); }
    if (jc.name === '开') { yi.push('开业', '出行'); }
    if (jc.name === '闭') { ji.push('开市'); }
    return { yi: [...new Set(yi)], ji: [...new Set(ji)], seed };
  }

  /* ── 冲煞 / 财神 ── */
  function chongSha(date) {
    const lunar = solar2lunar(date);
    const dayZhi = DiZhi.indexOf(lunar.gzDay[1]);
    const chongZhi = (dayZhi + 6) % 12;
    // 三煞方位
    const shaGroup = [[0, 1, 2, '正北'], [3, 4, 5, '正东'], [6, 7, 8, '正南'], [9, 10, 11, '正西']];
    const g = shaGroup.find(g => g.slice(0, 3).includes(dayZhi));
    return { chong: '冲' + Zodiac[chongZhi], sha: '煞' + g[3] };
  }
  const CAI = {
    '甲': '东北', '乙': '西南', '丙': '正西', '丁': '正西', '戊': '正北', '己': '正北',
    '庚': '正南', '辛': '正南', '壬': '正东', '癸': '东南',
  };
  function caishen(date) {
    const lunar = solar2lunar(date);
    return CAI[lunar.gzDay[0]] || '正北';
  }

  /* ── 星座 ── */
  const SIGNS = [
    ['摩羯座', 1, 19], ['水瓶座', 2, 18], ['双鱼座', 3, 20], ['白羊座', 4, 19],
    ['金牛座', 5, 20], ['双子座', 6, 21], ['巨蟹座', 7, 22], ['狮子座', 8, 22],
    ['处女座', 9, 22], ['天秤座', 10, 23], ['天蝎座', 11, 22], ['射手座', 12, 21], ['摩羯座', 12, 31],
  ];
  function xingzuo(date) {
    const m = date.getMonth() + 1, d = date.getDate();
    const cut = [20, 19, 21, 20, 21, 22, 23, 23, 23, 24, 23, 22]; // 每月星座切换日
    const S = ['摩羯座', '水瓶座', '双鱼座', '白羊座', '金牛座', '双子座', '巨蟹座', '狮子座', '处女座', '天秤座', '天蝎座', '射手座'];
    if (d < cut[m - 1]) return m === 1 ? S[0] : S[m - 2];
    return S[m - 1];
  }

  /* ── 星座运势(种子生成) ── */
  const FORTUNE_POOL = {
    overall: ['整体状态不错,适合推进重要计划。', '今天精力平稳,适合按部就班完成手头任务。', '状态在线,灵感与执行力都不错。', '节奏稍缓,给自己留一点缓冲时间。', '运势上扬,主动一点会有收获。'],
    career: ['适合处理需要耐心的长期事项。', '沟通效率高,适合洽谈与协作。', '工作中易有新想法,不妨记下来。', '注意细节,重要文件多核对一遍。', '适合学习新技能,为下一步蓄力。'],
    study: ['记忆效果佳,适合背诵与复习。', '理解力强,适合攻克难点知识。', '保持专注,远离手机干扰效率更高。', '适合整理笔记,把知识结构化。', '好奇心旺盛,适合拓展阅读。'],
    health: ['保持规律作息,状态会很稳定。', '适当走动,久坐之后拉伸一下。', '注意补充水分,今天多喝水。', '睡个好觉,比任何补品都有效。', '心情舒畅,适合轻量运动。'],
  };
  const LUCKY_COLOR = ['浅蓝', '奶橙', '薄荷绿', '暖黄', '浅紫', '粉白', '淡青', '米白'];
  function signFortune(sign, date) {
    const seed = WB.hashStr(sign + date);
    const r = WB.seedRand(seed);
    const pickA = arr => arr[Math.floor(r() * arr.length)];
    const luckyColor = LUCKY_COLOR[Math.floor(r() * LUCKY_COLOR.length)];
    const luckyNum = Math.floor(r() * 9) + 1;
    return {
      sign,
      overall: pickA(FORTUNE_POOL.overall),
      career: pickA(FORTUNE_POOL.career),
      study: pickA(FORTUNE_POOL.study),
      health: pickA(FORTUNE_POOL.health),
      luckyColor,
      luckyNum,
      match: pickA(['白羊座', '狮子座', '天秤座', '水瓶座', '双子座', '射手座']),
    };
  }

  /* ── 节气(近似,用于农历信息补充) ── */
  function term(date) {
    // 简化:C=20.xxx 公式近似,仅取当日是否节气
    const y = date.getFullYear(), m = date.getMonth() + 1, d = date.getDate();
    const table = [ // 每月两个节气日(小寒~冬至),按公历日近似
      [5, 20], [4, 19], [6, 21], [5, 20], [6, 21], [6, 22], [7, 23], [8, 23], [8, 23], [8, 23], [7, 22], [7, 22]
    ];
    const names = ['小寒', '大寒', '立春', '雨水', '惊蛰', '春分', '清明', '谷雨', '立夏', '小满', '芒种', '夏至', '小暑', '大暑', '立秋', '处暑', '白露', '秋分', '寒露', '霜降', '立冬', '小雪', '大雪', '冬至'];
    if (d === table[m - 1][0]) return names[(m - 1) * 2];
    if (d === table[m - 1][1]) return names[(m - 1) * 2 + 1];
    return null;
  }

  /* ── 每日黄历聚合 ── */
  function daily(date) {
    const lunar = solar2lunar(date);
    if (!lunar) return null;
    const jc = jianChu(date);
    const yj = yiJi(date);
    const cs = chongSha(date);
    return {
      date: WB.dStr(date),
      lunarStr: lunar.lunarStr,
      gzYear: lunar.gzYear, gzMonth: lunar.gzMonth, gzDay: lunar.gzDay,
      animal: lunar.animal,
      term: term(date),
      dao: { name: jc.name + '日', isHuang: jc.isHuang },
      yi: yj.yi, ji: yj.ji,
      chong: cs.chong, sha: cs.sha,
      caishen: caishen(date),
    };
  }

  window.Lunar = {
    solar2lunar, xingzuo, signFortune, daily, cyclical, DiZhi, TianGan, Zodiac,
  };
})();
