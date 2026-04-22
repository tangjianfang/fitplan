// NLP 抽取：从一段自然语言中提取核心字段
// 目标准确率 ≥90%（覆盖常见健身咨询表达）
(function () {
  const cn2num = { 一:1,二:2,两:2,三:3,四:4,五:5,六:6,七:7,八:8,九:9,十:10 };
  function cnToNum(s) {
    if (!s) return null;
    if (/^\d+$/.test(s)) return +s;
    if (s === '十') return 10;
    if (s.startsWith('十')) return 10 + (cn2num[s[1]] || 0);
    if (s.endsWith('十')) return (cn2num[s[0]] || 1) * 10;
    if (s.includes('十')) {
      const [a,b] = s.split('十');
      return (cn2num[a]||1)*10 + (cn2num[b]||0);
    }
    return cn2num[s] || null;
  }

  function extract(text) {
    const t = (text || '').replace(/\s+/g, ' ').trim();
    const r = { sex:null, age:null, heightCm:null, weightKg:null, bodyFatPct:null,
                goal:null, freqPerWeek:null, activityId:null, intensity:null,
                meals:3, hasResistance:null, notes:[] };

    // 性别
    if (/(?:^|[^子])(男(?!友|朋)|男生|男性|男士|先生)/.test(t)) r.sex = 'male';
    else if (/(女(?!友|朋)|女生|女性|女士|小姐|妹子|姐姐)/.test(t)) r.sex = 'female';

    // 年龄
    let m = t.match(/(\d{1,2})\s*(?:岁|周岁|y|yr|years?\s*old)/i);
    if (m) r.age = +m[1];
    else { m = t.match(/年龄[:：是]?\s*(\d{1,2})/); if (m) r.age = +m[1]; }

    // 身高 cm / m
    m = t.match(/(?:身高|高)[:：是约]?\s*(\d{2,3})(?:\s*(?:cm|厘米|公分))?/i);
    if (m) r.heightCm = +m[1];
    if (!r.heightCm) {
      m = t.match(/(\d{2,3})\s*(?:cm|厘米|公分)/i);
      if (m) r.heightCm = +m[1];
    }
    if (!r.heightCm) {
      m = t.match(/(1\.\d{2}|2\.\d{2})\s*(?:m|米)\b/i);
      if (m) r.heightCm = Math.round(parseFloat(m[1]) * 100);
    }
    if (!r.heightCm) {
      // 形如 "178" "175" 单独出现且大于身高合理范围 (140~210)
      const all = [...t.matchAll(/\b(1[4-9]\d|20\d)\b/g)].map(x=>+x[1]);
      if (all.length === 1) r.heightCm = all[0];
    }

    // 体重 kg
    m = t.match(/(?:体重|重)[:：是约]?\s*(\d{2,3}(?:\.\d+)?)\s*(?:kg|公斤|千克)?/i);
    if (m) r.weightKg = +m[1];
    if (!r.weightKg) {
      m = t.match(/(\d{2,3}(?:\.\d+)?)\s*(?:kg|公斤|千克)\b/i);
      if (m) r.weightKg = +m[1];
    }
    if (!r.weightKg) {
      m = t.match(/(\d{2,3})\s*斤/);
      if (m) r.weightKg = +m[1] / 2; // 1 kg = 2 斤
    }

    // 体脂率
    m = t.match(/(?:体脂(?:率)?|bf|body\s*fat)[^0-9]{0,4}(\d{1,2}(?:\.\d+)?)\s*%?/i);
    if (m) r.bodyFatPct = +m[1];
    if (!r.bodyFatPct) {
      m = t.match(/(\d{1,2}(?:\.\d+)?)\s*%\s*(?:体脂)?/);
      if (m && +m[1] >= 3 && +m[1] <= 60) r.bodyFatPct = +m[1];
    }

    // 目标
    if (/(增肌|增重|长肌肉|涨肌肉|bulk|gain)/i.test(t)) r.goal = 'bulk';
    else if (/(减脂|减肥|降体脂|刷脂|cut|lose)/i.test(t)) r.goal = 'cut';
    else if (/(维持|保持|塑形|maintain)/i.test(t)) r.goal = 'maintain';

    // 训练频率：一周X次 / 每周X次 / X次/周
    m = t.match(/(?:一周|每周|周)\s*([一二两三四五六七八九十\d]+)\s*次/);
    if (m) r.freqPerWeek = cnToNum(m[1]);
    if (r.freqPerWeek == null) {
      m = t.match(/([一二两三四五六七八九十\d]+)\s*次\s*\/\s*周/);
      if (m) r.freqPerWeek = cnToNum(m[1]);
    }
    if (r.freqPerWeek == null) {
      m = t.match(/(?:练|训练|健身)\s*([一二两三四五六七八九十\d]+)\s*(?:天|次)/);
      if (m) r.freqPerWeek = cnToNum(m[1]);
    }

    // 强度 / 抗阻
    if (/(高强度|大重量|力量|举铁|撸铁|抗阻|无氧)/.test(t)) { r.intensity = 'high'; r.hasResistance = true; }
    else if (/(中等强度|中强度)/.test(t)) r.intensity = 'mid';
    else if (/(轻度|低强度|散步|溜达)/.test(t)) r.intensity = 'low';
    if (/(不练|从不运动|久坐|完全不动|没运动)/.test(t)) { r.freqPerWeek = 0; r.intensity = 'none'; }

    // 餐次
    m = t.match(/(?:一日|每日|每天|一天)?\s*([一二三四五\d])\s*(?:餐|顿)/);
    if (m) {
      const n = cnToNum(m[1]);
      if (n >= 2 && n <= 6) r.meals = n;
    }

    // 推断活动系数
    r.activityId = inferActivity(r.freqPerWeek, r.intensity);

    return r;
  }

  function inferActivity(freq, intensity) {
    if (freq == null) return 'light_day'; // 默认轻日常
    if (freq === 0) return 'sedentary';
    if (freq <= 2) return 'micro';
    if (freq === 3) return 'light';
    if (freq <= 5) return 'moderate';
    if (freq === 6) return 'active';
    if (freq === 7) return intensity === 'high' ? 'very_active' : 'active';
    if (freq > 7) return intensity === 'high' ? 'athlete' : 'very_active';
    return 'moderate';
  }

  window.NLP = { extract };
})();
