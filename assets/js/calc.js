// 计算引擎：严格按文档公式与规则
(function () {
  const C = window.CONSTANTS;

  function pickBmrFormula(sex, age) {
    return window.BMR_FORMULAS.find(x => x.sex === sex && age >= x.ageMin && age <= x.ageMax);
  }
  function bmr(sex, age, weightKg) {
    const f = pickBmrFormula(sex, age);
    if (!f) return null;
    return f.k * weightKg + f.b;
  }
  function bmrMifflin(sex, age, heightCm, weightKg) {
    if (!sex || !age || !heightCm || !weightKg) return null;
    const sexAdj = sex === 'male' ? 5 : -161;
    return 10 * weightKg + 6.25 * heightCm - 5 * age + sexAdj;
  }
  function bmrHarrisBenedict(sex, age, heightCm, weightKg) {
    if (!sex || !age || !heightCm || !weightKg) return null;
    if (sex === 'male') return 88.362 + 13.397 * weightKg + 4.799 * heightCm - 5.677 * age;
    return 447.593 + 9.247 * weightKg + 3.098 * heightCm - 4.33 * age;
  }
  function bmrKatchMcardle(leanMassKg) {
    if (!leanMassKg || leanMassKg <= 0) return null;
    return 370 + 21.6 * leanMassKg;
  }
  function getBmrComparison({ sex, age, heightCm, weightKg, bodyFatPct }) {
    const leanMassKg = bodyFatPct != null ? +(weightKg * (1 - bodyFatPct / 100)).toFixed(1) : null;
    const models = {
      mifflin: {
        key: 'mifflin',
        label: 'Mifflin-St Jeor',
        bmr: bmrMifflin(sex, age, heightCm, weightKg),
        note: '通用人群首选',
      },
      harris: {
        key: 'harris',
        label: 'Harris-Benedict（修正版）',
        bmr: bmrHarrisBenedict(sex, age, heightCm, weightKg),
        note: '经典公式，通常偏高',
      },
      katch: {
        key: 'katch',
        label: 'Katch-McArdle',
        bmr: bmrKatchMcardle(leanMassKg),
        note: leanMassKg ? '体脂已知时更贴近瘦体重' : '需要体脂率',
      },
      guide: {
        key: 'guide',
        label: '指南公式（分年龄段）',
        bmr: bmr(sex, age, weightKg),
        note: '遵循当前内置指南口径',
      },
    };

    Object.values(models).forEach((m) => {
      m.bmr = m.bmr == null ? null : Math.round(m.bmr);
    });

    // 自动策略：有体脂且有效时优先 Katch；否则 Mifflin；两者缺失回退指南公式。
    let selected = models.mifflin;
    if (bodyFatPct != null && bodyFatPct >= 5 && bodyFatPct <= 60 && models.katch.bmr != null) {
      selected = models.katch;
    }
    if (selected.bmr == null) selected = models.mifflin.bmr != null ? models.mifflin : models.guide;
    if (selected.bmr == null) selected = models.guide;

    return {
      selectedKey: selected.key,
      selectedLabel: selected.label,
      selectedBmr: selected.bmr,
      leanMassKg,
      models,
    };
  }
  function activityFactor(id) {
    const a = window.ACTIVITY_LEVELS.find(x => x.id === id);
    return a ? a.factor : 1.5;
  }
  function tdee(bmrVal, actId) { return bmrVal * activityFactor(actId); }

  // 目标日热量（含安全下限：减脂期 ≥ BMR；每周减重 ≤ 当前体重1%）
  function targetCalories({ goal, tdeeVal, bmrVal, weightKg }) {
    if (goal === 'maintain') return { kcal: Math.round(tdeeVal), notes: ['维持期：摄入≈每日总消耗。'] };

    if (goal === 'bulk') {
      const rate = window.LEAN_GAIN_RATE(weightKg); // 月增长率
      const monthlyLeanKg = +(weightKg * rate).toFixed(2);
      const dailySurplus = (monthlyLeanKg * C.KCAL_PER_KG_LEAN_GAIN) / 30;
      const kcal = Math.round(tdeeVal + dailySurplus);
      return {
        kcal,
        notes: [
          `按体重 ${weightKg} kg → 每月瘦体重增长目标 ${(rate*100).toFixed(1)}% = ${monthlyLeanKg} kg`,
          `${monthlyLeanKg} × 5555 ÷ 30 ≈ ${Math.round(dailySurplus)} kcal/日 盈余`,
        ],
      };
    }

    // cut：采用缺口区间 + 安全阈值（下限≥BMR；周减重不超过体重1%）
    const maxWeeklyLossKg = weightKg * C.MAX_WEEKLY_FAT_LOSS_RATIO; // 1% 体重 / 周
    const maxDailyDeficit = (maxWeeklyLossKg * C.KCAL_PER_KG_FAT_LOSS) / 7;
    const deficitPct = 0.20;
    const minPct = 0.15;
    const maxPct = 0.25;
    let kcal = Math.round(tdeeVal * (1 - deficitPct));
    const lowKcal = Math.round(tdeeVal * (1 - maxPct));
    const highKcal = Math.round(tdeeVal * (1 - minPct));
    const notes = [
      `减脂建议缺口区间 15%–25%，当前按 20% 缺口估算`,
      `对应摄入区间约 ${lowKcal}-${highKcal} kcal/日（以当前活动水平估算）`,
      `每周减重上限按当前体重 1%：${maxWeeklyLossKg.toFixed(2)} kg/周`,
    ];
    const minByWeeklyLoss = Math.round(tdeeVal - maxDailyDeficit);
    if (kcal < minByWeeklyLoss) {
      kcal = minByWeeklyLoss;
      notes.push(`触发减重速度保护：摄入不低于 ${minByWeeklyLoss} kcal/日，避免周降重超过上限`);
    }
    if (kcal < bmrVal) {
      kcal = Math.round(bmrVal);
      notes.push(`触发安全下限：每日摄入不得低于静息代谢 ${Math.round(bmrVal)} kcal，已按下限取值`);
    }
    return { kcal, notes };
  }

  // 宏量分配
  function macros(kcal, goal) {
    const r = window.MACRO_RATIOS[goal];
    const total = r.carb + r.protein + r.fat;
    const cKcal = kcal * r.carb / total, pKcal = kcal * r.protein / total, fKcal = kcal * r.fat / total;
    return {
      ratio: r,
      carbG: +(cKcal / 4).toFixed(1), proteinG: +(pKcal / 4).toFixed(1), fatG: +(fKcal / 9).toFixed(1),
      carbKcal: Math.round(cKcal), proteinKcal: Math.round(pKcal), fatKcal: Math.round(fKcal),
    };
  }

  // 餐次分配（练后餐最多→早餐次之→末餐最少）
  // 默认 3 餐：早 / 午（练后餐） / 晚
  function mealsPlan(macroTotals, goal) {
    const post = window.POST_WORKOUT_RATIOS[goal] || window.POST_WORKOUT_RATIOS.cut;
    // 比例：练后 0.45 / 早 0.32 / 末 0.23
    const w = { post: 0.45, early: 0.32, last: 0.23 };
    const meals = [
      { name: '早餐（次多）', tag: 'early', ratio: w.early, mix: window.MACRO_RATIOS[goal] },
      { name: '午餐（练后餐 · 最多）', tag: 'post', ratio: w.post, mix: post, postWorkout: true,
        tip: '建议在抗阻训练后 30–60 分钟内进食（黄金吸收窗口期）。' },
      { name: '晚餐（最少）' + (goal==='cut' ? ' · 减脂期少/无碳水' : ''), tag: 'last', ratio: w.last,
        mix: window.MACRO_RATIOS[goal], lowCarb: goal === 'cut' },
    ];
    return meals.map(m => {
      const t = m.mix.carb + m.mix.protein + m.mix.fat;
      let cG = macroTotals.carbG  * m.ratio * (m.mix.carb / t) / (window.MACRO_RATIOS[goal].carb / (window.MACRO_RATIOS[goal].carb+window.MACRO_RATIOS[goal].protein+window.MACRO_RATIOS[goal].fat));
      // 简化：直接按该餐次比例总宏量再按本餐 mix 重新分配
      const mealKcal = (macroTotals.carbG*4 + macroTotals.proteinG*4 + macroTotals.fatG*9) * m.ratio;
      const carbG = +(mealKcal * m.mix.carb / t / 4).toFixed(0);
      const proteinG = +(mealKcal * m.mix.protein / t / 4).toFixed(0);
      let fatG = +(mealKcal * m.mix.fat / t / 9).toFixed(0);
      let carbAdj = carbG;
      if (m.lowCarb) { // 减脂晚餐降低碳水（移一半到脂肪+蛋白）
        carbAdj = Math.round(carbG * 0.35);
      }
      return { ...m, kcal: Math.round(mealKcal), carbG: carbAdj, proteinG, fatG };
    });
  }

  // 膳食纤维
  function fiberTarget(kcal, goal, sex) {
    if (goal === 'cut') {
      const lo = (kcal/1000) * 15, hi = (kcal/1000) * 20;
      return { min: Math.round(lo), max: Math.round(hi),
        text: `每 1000 kcal 配 15–20 g → ${Math.round(lo)}–${Math.round(hi)} g/日` };
    }
    const v = sex === 'male' ? 38 : 25;
    return { min: v, max: v, text: `${sex==='male'?'男性':'女性'}基础值 ${v} g/日` };
  }

  // 水（运动场景）：基于体重
  function waterPlan(weightKg) {
    return {
      preLo: Math.round(weightKg*3), preHi: Math.round(weightKg*5),
      midMaxPerHour: 800,
      postRatio: 1.4,
    };
  }

  // BMI
  function bmi(heightCm, weightKg) {
    if (!heightCm || !weightKg) return null;
    const h = heightCm/100;
    const v = weightKg / (h*h);
    let cat = '';
    if (v < 18.5) cat = '偏瘦';
    else if (v < 24) cat = '正常';
    else if (v < 28) cat = '超重';
    else cat = '肥胖';
    return { value: +v.toFixed(1), cat };
  }

  const HEALTHY_BMI_RANGE = { min: 18.5, max: 23.9 };
  const GOAL_BODY_FAT_RANGE = {
    male: {
      cut: [12, 16],
      maintain: [14, 18],
      bulk: [13, 17],
    },
    female: {
      cut: [20, 24],
      maintain: [22, 27],
      bulk: [21, 26],
    },
  };

  function round1(v) { return +v.toFixed(1); }

  function healthyWeightRange(heightCm) {
    const h2 = Math.pow(heightCm / 100, 2);
    return {
      low: round1(HEALTHY_BMI_RANGE.min * h2),
      high: round1(HEALTHY_BMI_RANGE.max * h2),
    };
  }

  function bodyFatWeightRange(leanMassKg, range) {
    if (!leanMassKg || !range) return null;
    return {
      low: round1(leanMassKg / (1 - range[0] / 100)),
      high: round1(leanMassKg / (1 - range[1] / 100)),
    };
  }

  function formatRange(low, high, unit='') {
    if (low == null || high == null) return '—';
    const tail = unit ? ` ${unit}` : '';
    return low === high ? `${low}${tail}` : `${low}-${high}${tail}`;
  }

  function buildProgressGuide({ sex, heightCm, weightKg, goal, bodyFatPct, leanMassKg }) {
    const healthy = healthyWeightRange(heightCm);
    const bfRange = GOAL_BODY_FAT_RANGE[sex]?.[goal] || GOAL_BODY_FAT_RANGE[sex]?.maintain || null;
    const bfWeight = bodyFatWeightRange(leanMassKg, bfRange);

    let targetRange = { ...healthy };
    if (goal === 'cut' && bfWeight) {
      const low = Math.max(healthy.low, Math.min(bfWeight.low, bfWeight.high));
      const high = Math.min(healthy.high, Math.max(bfWeight.low, bfWeight.high));
      targetRange = low <= high ? { low: round1(low), high: round1(high) } : { ...healthy };
    } else if (goal === 'maintain' && bfWeight) {
      const low = Math.max(healthy.low, Math.min(bfWeight.low, bfWeight.high));
      const high = Math.min(healthy.high, Math.max(bfWeight.low, bfWeight.high));
      targetRange = low <= high ? { low: round1(low), high: round1(high) } : { ...healthy };
    } else if (goal === 'bulk' && bfWeight) {
      targetRange = {
        low: round1(Math.min(bfWeight.low, bfWeight.high)),
        high: round1(Math.max(bfWeight.low, bfWeight.high)),
      };
    }

    const notes = [
      `健康体重参考 ${formatRange(healthy.low, healthy.high, 'kg')}（BMI ${HEALTHY_BMI_RANGE.min}-${HEALTHY_BMI_RANGE.max}）`,
    ];
    if (bodyFatPct != null && bfRange && bfWeight) {
      notes.push(`按 ${sex === 'male' ? '男性' : '女性'} ${goal === 'cut' ? '减脂' : goal === 'bulk' ? '增肌' : '维持'}可持续体脂 ${bfRange[0]}-${bfRange[1]}%，体重大致会落在 ${formatRange(targetRange.low, targetRange.high, 'kg')}`);
    }

    if (goal === 'cut') {
      const minLoss = round1(Math.max(0, weightKg - targetRange.high));
      const maxLoss = round1(Math.max(0, weightKg - targetRange.low));
      const weeklyLoss = round1(Math.min(0.5, weightKg * C.MAX_WEEKLY_FAT_LOSS_RATIO));
      const weeksLow = minLoss > 0 ? Math.ceil(minLoss / weeklyLoss) : 0;
      const weeksHigh = maxLoss > 0 ? Math.ceil(maxLoss / weeklyLoss) : 0;
      if (maxLoss > 0) notes.push(`更建议先减到 ${formatRange(targetRange.low, targetRange.high, 'kg')}，大约需要减少 ${formatRange(minLoss, maxLoss, 'kg')}`);
      else notes.push('当前体重已接近建议区间，重点放在体脂、围度和训练质量。');
      return {
        healthy, bfRange, bfWeight, targetRange,
        actionLabel: '建议先减重',
        actionValue: maxLoss > 0 ? formatRange(minLoss, maxLoss, 'kg') : '0-2 kg',
        actionSub: maxLoss > 0 ? `先回到 ${formatRange(targetRange.low, targetRange.high, 'kg')}` : '无需大幅减重，优先减脂提质',
        paceLabel: '合理速度',
        paceValue: maxLoss > 0 ? formatRange(weeksLow, weeksHigh, '周') : '维持当前',
        paceSub: `按每周 ${weeklyLoss} kg 减重更稳妥`,
        notes,
      };
    }

    if (goal === 'bulk') {
      const monthlyGain = round1(weightKg * window.LEAN_GAIN_RATE(weightKg));
      notes.push(`干净增肌更建议控制在每月 +${monthlyGain} kg 左右，过快更容易转成脂肪。`);
      return {
        healthy, bfRange, bfWeight, targetRange,
        actionLabel: '建议增速',
        actionValue: `${monthlyGain} kg/月`,
        actionSub: '慢增肌优先，减少脂肪连带增长',
        paceLabel: '季度上限',
        paceValue: `${round1(monthlyGain * 3)} kg`,
        paceSub: '先看力量、围度和镜子反馈，不只看体重',
        notes,
      };
    }

    const toHealthy = weightKg > targetRange.high ? round1(weightKg - targetRange.high) : weightKg < targetRange.low ? round1(targetRange.low - weightKg) : 0;
    if (toHealthy > 0) notes.push(`若想进入更舒服的健康区间，可把体重调整约 ${toHealthy} kg。`);
    else notes.push('当前体重已在建议区间内，重点看围度、体脂和训练恢复。');
    return {
      healthy, bfRange, bfWeight, targetRange,
      actionLabel: '建议维持区间',
      actionValue: formatRange(targetRange.low, targetRange.high, 'kg'),
      actionSub: '体重周波动 ±1 kg 通常都属正常',
      paceLabel: '跟踪重点',
      paceValue: bodyFatPct != null ? `${bodyFatPct}% 体脂` : `${weightKg} kg`,
      paceSub: '每周固定 1-2 次称重，配合腰围/镜子更有意义',
      notes,
    };
  }

  function normalizePrefs(form) {
    return {
      training: Array.isArray(form.trainingPrefs) ? form.trainingPrefs : [],
      diet: Array.isArray(form.dietPrefs) ? form.dietPrefs : [],
    };
  }

  function hasPref(list, key) {
    return Array.isArray(list) && list.includes(key);
  }

  function isHomeFriendlyExercise(ex) {
    return !!ex.home || /徒手|哑铃|单杠|长凳/.test(ex.eq || '');
  }

  function isMachineFriendlyExercise(ex) {
    return /绳索|机|下拉器|腿举|提踵|靠背|哑铃/.test(ex.eq || '');
  }

  function scoreExercise(ex, base, prefs) {
    let score = ex.name === base.name ? 6 : 0;
    if (ex.type === base.type) score += 2;
    if (hasPref(prefs.training, 'home')) score += isHomeFriendlyExercise(ex) ? 12 : -8;
    if (hasPref(prefs.training, 'machine')) score += isMachineFriendlyExercise(ex) ? 10 : -4;
    return score;
  }

  function pickSessionExercise(item, prefs, usedNames) {
    const pool = window.EXERCISES[item.grp] || [];
    const base = pool.find(ex => ex.name === item.name) || pool[0];
    if (!base) return null;
    const scored = pool
      .map(ex => ({ ex, score: scoreExercise(ex, base, prefs) }))
      .sort((a, b) => b.score - a.score);
    const picked = scored.find(({ ex }) => !usedNames.has(ex.name))?.ex || scored[0]?.ex || base;
    usedNames.add(picked.name);
    return picked;
  }

  // 食物推荐：每餐按目标三大量精准反算 + 餐间食材轮换 + 单一食材量过大时自动拆分
  // 餐次轮换池
  const PROTEIN_ROTATION = {
    cut:  [['鸡胸肉'], ['龙利鱼'], ['巴沙鱼'], ['虾'], ['鳕鱼'], ['牛腱子肉'], ['去皮鸡腿肉'], ['去皮鸭胸肉'], ['三文鱼']],
    bulk: [['鸡胸肉'], ['瘦牛肉(牛里脊)'], ['三文鱼'], ['瘦猪肉(猪里脊)'], ['去皮鸡腿肉'], ['去皮鸭胸肉'], ['龙利鱼'], ['鳕鱼']],
    maintain: [['鸡胸肉'], ['瘦牛肉(牛里脊)'], ['龙利鱼'], ['虾'], ['去皮鸡腿肉'], ['去皮鸭胸肉'], ['瘦猪肉(猪里脊)'], ['巴沙鱼']],
  };
  const CARB_ROTATION = {
    cut:  [['燕麦粥','熟'], ['糙米饭','熟'], ['紫薯蒸','熟'], ['土豆蒸','熟'], ['全麦面包','熟'], ['玉米水煮','熟']],
    bulk: [['白米饭','熟'], ['全麦面包','熟'], ['糙米饭','熟'], ['馒头','熟'], ['土豆蒸','熟'], ['玉米水煮','熟']],
    maintain: [['糙米饭','熟'], ['白米饭','熟'], ['全麦馒头','熟'], ['红薯蒸','熟'], ['燕麦粥','熟'], ['玉米水煮','熟']],
  };
  const VEG_ROTATION = ['西兰花','菠菜','番茄','青椒','黄瓜','生菜','油麦菜','金针菇','杏鲍菇','冬瓜','芹菜','娃娃菜'];

  function dedupeChoices(list) {
    const seen = new Set();
    return list.filter((choice) => {
      const key = choice.join('|');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function getProteinRotation(goal, prefs, mealTag) {
    const base = (PROTEIN_ROTATION[goal] || PROTEIN_ROTATION.maintain).map(choice => choice.slice());
    const front = [];
    if (hasPref(prefs.diet, 'seafood') && mealTag !== 'early') {
      front.push(['三文鱼'], ['龙利鱼','巴沙鱼'], ['虾','鳕鱼']);
    }
    let merged = dedupeChoices([...front, ...base]);
    if (hasPref(prefs.diet, 'no_beef')) {
      merged = merged.map(choice => choice.filter(name => !/牛/.test(name))).filter(choice => choice.length);
    }
    return merged.length ? merged : base;
  }

  function getCarbRotation(goal, prefs) {
    const base = (CARB_ROTATION[goal] || CARB_ROTATION.maintain).map(choice => choice.slice());
    const front = [];
    if (hasPref(prefs.diet, 'rice')) {
      front.push(['白米饭','熟'], ['糙米饭','熟'], ['紫薯蒸','熟'], ['土豆蒸','熟']);
    }
    if (hasPref(prefs.diet, 'oat')) {
      front.push(['燕麦粥','熟'], ['全麦面包','熟']);
    }
    return front.length ? dedupeChoices([...front, ...base]) : base;
  }

  function recipeFlags(recipe) {
    const text = `${recipe.name} ${(recipe.items || []).join(' ')}`;
    return {
      seafood: /虾|鱼|三文鱼|鲈鱼|龙利鱼|巴沙鱼/.test(text),
      beef: /牛肉|牛里脊|牛腱|牛排|牛腩/.test(text),
      lactose: /牛奶|酸奶|奶酪/.test(text),
      rice: /米饭|土豆|紫薯|藜麦/.test(text),
      oat: /燕麦|面包|吐司/.test(text),
    };
  }

  function scoreRecipe(recipe, prefs) {
    const flags = recipeFlags(recipe);
    if (hasPref(prefs.diet, 'low_lactose') && flags.lactose) return -99;
    if (hasPref(prefs.diet, 'no_beef') && flags.beef) return -99;
    let score = 0;
    if (hasPref(prefs.diet, 'seafood') && flags.seafood) score += 4;
    if (hasPref(prefs.diet, 'rice') && flags.rice) score += 3;
    if (hasPref(prefs.diet, 'oat') && flags.oat) score += 3;
    return score;
  }

  function pickPreferredRecipes(goal, prefs) {
    const base = window.RECIPES[goal] || window.RECIPES.maintain;
    const pickSlot = (slot) => {
      const items = base[slot] || [];
      const ranked = items
        .map((recipe, idx) => ({ recipe, idx, score: scoreRecipe(recipe, prefs) }))
        .filter(({ score }) => score > -99)
        .sort((a, b) => (b.score - a.score) || (a.idx - b.idx))
        .map(({ recipe }) => recipe);
      return (ranked.length ? ranked : items).slice(0, Math.min(3, items.length));
    };
    return { early: pickSlot('early'), post: pickSlot('post'), last: pickSlot('last') };
  }

  function pickFoodByName(name, raw) {
    return window.FOODS.find(f => f.name === name && (raw ? f.raw === raw : true))
        || window.FOODS.find(f => f.name === name);
  }

  function roundKcal(v) {
    return Math.max(0, Math.round(v || 0));
  }

  function pushFoodItem(items, text, grams, food, note) {
    if (!food || !grams || grams <= 0) {
      items.push({ text, kcal: null, note: !!note });
      return;
    }
    items.push({ text, kcal: roundKcal(grams * food.kcal / 100), note: !!note });
  }

  function formatProteinServingText(food, rawGrams) {
    if (!food) return `${rawGrams} g`;
    // 内部仍按数据库口径（生重）核算营养，展示改为更符合饮食习惯的熟重参考。
    const isMeat = food.cat === 'meat';
    if (!isMeat) return `${food.name} ${rawGrams} g`;
    const cookedRatio = /鱼|虾/.test(food.name) ? 0.8 : 0.75;
    const cookedGrams = Math.max(1, Math.round(rawGrams * cookedRatio));
    return `${food.name}（熟）约 ${cookedGrams} g`;
  }

  const RECIPE_NAME_ALIASES = [
    ['燕麦片', '燕麦片纯', '生'],
    ['燕麦', '燕麦片纯', '生'],
    ['低脂牛奶', '低脂纯牛奶', '即食'],
    ['牛奶', '低脂纯牛奶', '即食'],
    ['无糖豆浆', '无糖豆浆', '即食'],
    ['低脂无糖酸奶', '低脂无糖酸奶', '即食'],
    ['无糖酸奶', '低脂无糖酸奶', '即食'],
    ['全麦吐司', '全麦吐司', '即食'],
    ['全麦面包', '全麦面包', '熟'],
    ['全麦吐司', '全麦吐司', '即食'],
    ['鸡蛋清', '鸡蛋清', '生'],
    ['鸡蛋', '鸡蛋(整蛋)', '生'],
    ['紫薯', '紫薯蒸', '熟'],
    ['蒸紫薯', '紫薯蒸', '熟'],
    ['糙米饭', '糙米饭', '熟'],
    ['白米饭', '白米饭', '熟'],
    ['藜麦', '藜麦', '生'],
    ['熟藜麦', '藜麦', '熟'],
    ['土豆', '土豆蒸', '熟'],
    ['蒸土豆', '土豆蒸', '熟'],
    ['香蕉', '香蕉', '生'],
    ['蓝莓', '蓝莓', '生'],
    ['草莓', '草莓', '生'],
    ['苹果', '苹果', '生'],
    ['杏仁', '杏仁', '生'],
    ['奇亚籽', '奇亚籽', '生'],
    ['鸡胸肉', '鸡胸肉', '生'],
    ['熟鸡胸肉', '鸡胸肉(水煮)', '熟'],
    ['即食鸡胸', '即食鸡胸肉', '即食'],
    ['去皮鸡腿肉', '去皮鸡腿肉', '生'],
    ['瘦牛里脊', '瘦牛肉(牛里脊)', '生'],
    ['瘦牛肉', '瘦牛肉(牛里脊)', '生'],
    ['牛腱子', '牛腱子肉', '生'],
    ['三文鱼', '三文鱼', '生'],
    ['巴沙鱼', '巴沙鱼', '生'],
    ['龙利鱼', '龙利鱼', '生'],
    ['鲈鱼', '鲈鱼', '生'],
    ['虾仁', '青虾', '生'],
    ['青虾', '青虾', '生'],
    ['老豆腐', '老豆腐(北豆腐)', '即食'],
    ['嫩豆腐', '嫩豆腐(南豆腐)', '即食'],
    ['去皮鸭胸肉', '去皮鸭胸肉', '生'],
    ['鳕鱼', '鳕鱼', '生'],
    ['鳕鱼', '鳕鱼', '生'],
    ['西兰花', '西兰花', '生'],
    ['菠菜', '菠菜', '生'],
    ['番茄', '番茄', '生'],
    ['生菜', '生菜', '生'],
    ['黄瓜', '黄瓜', '生'],
    ['金针菇', '金针菇', '生'],
    ['青椒', '青椒', '生'],
    ['彩椒', '青椒', '生'],
    ['冬瓜', '冬瓜', '生'],
    ['小白菜', '娃娃菜', '生'],
    ['青菜', '油麦菜', '生'],
    ['杏鲍菇', '杏鲍菇', '生'],
    ['橄榄油', '橄榄油', '即食'],
    ['坚果', '杏仁', '生'],
    ['小米', '小米', '生'],
    ['山药', '山药', '生'],
    ['玉米水煮', '玉米水煮', '熟'],
    ['猕猴桃', '猕猴桃', '生'],
    ['芹菜', '芹菜', '生'],
    ['娃娃菜', '娃娃菜', '生'],
    ['香蕉', '香蕉', '生'],
    ['芹菜', '芹菜', '生'],
    ['娃娃菜', '娃娃菜', '生'],
    ['猎猎鱼', '鳥魗鱼', '生'],
    ['猪里脊', '瘦猪肉(猪里脊)', '生'],
    ['鱼米', '白米饭', '熟'],
    ['猪肉', '瘦猪肉(猪里脊)', '生'],
  ];

  const RECIPE_UNIT_DEFAULTS = {
    '鸡蛋(整蛋)': 50,
    '鸡蛋清': 33,
    '香蕉': 120,
    '苹果': 180,
    '番茄': 150,
    '低脂纯牛奶': 250,
    '低脂无糖酸奶': 200,
    '全麦吐司': 35,
    '全麦面包': 35,
  };

  const RECIPE_DIRECT_KCAL = [
    [/奶酪 1 片/, 55],
    [/低脂奶酪 1 片/, 45],
    [/紫菜/, 8],
    [/少量香油/, 20],
    [/酱油少许/, 5],
    [/黑胡椒/, 0],
    [/柠檬/, 5],
    [/姜片|姜丝/, 3],
    [/蒸鱼豉油/, 10],
    [/葱花|洋葱/, 10],
    [/虾米少许/, 8],
    [/枸杞少许/, 5],
  ];

  const RECIPE_MET = {
    resistance: { bulk: 4.8, cut: 5.0, maintain: 4.9 },
    cardio: { bulk: 6.0, cut: 7.0, maintain: 6.5 },
    warmup: 3.3,
  };

  function findRecipeFood(text) {
    for (const [needle, name, raw] of RECIPE_NAME_ALIASES) {
      if (text.includes(needle)) return pickFoodByName(name, raw);
    }
    return null;
  }

  function parseRecipeAmount(text, food) {
    const gramMatch = text.match(/(\d+(?:\.\d+)?)\s*g/);
    if (gramMatch) return +gramMatch[1];
    const mlMatch = text.match(/(\d+(?:\.\d+)?)\s*ml/);
    if (mlMatch) return +mlMatch[1];
    const pieceMatch = text.match(/(\d+(?:\.\d+)?)\s*(个|根|片)/);
    if (pieceMatch) {
      const count = +pieceMatch[1];
      const unit = pieceMatch[2];
      const per = RECIPE_UNIT_DEFAULTS[food?.name] || (unit === '片' ? 35 : 100);
      return count * per;
    }
    const comboEgg = text.match(/鸡蛋清\s*(\d+)\s*个\+整蛋\s*(\d+)\s*个/);
    if (comboEgg && food?.name === '鸡蛋清') return (+comboEgg[1]) * RECIPE_UNIT_DEFAULTS['鸡蛋清'];
    if (comboEgg && food?.name === '鸡蛋(整蛋)') return (+comboEgg[2]) * RECIPE_UNIT_DEFAULTS['鸡蛋(整蛋)'];
    if (/生菜\/番茄/.test(text)) return 150;
    if (/彩椒\/菠菜/.test(text)) return 200;
    if (/西兰花\/胡萝卜/.test(text)) return 200;
    if (/冬瓜\/番茄\/菠菜/.test(text)) return 250 / 3;
    if (/杏鲍菇\/生菜/.test(text)) return 200 / 2;
    if (/金针菇\/杏鲍菇/.test(text)) return 200;
    return RECIPE_UNIT_DEFAULTS[food?.name] || null;
  }

  function estimateRecipeIngredient(text) {
    for (const [rule, kcal] of RECIPE_DIRECT_KCAL) {
      if (rule.test(text)) return { text, kcal };
    }
    if (/生菜\/番茄/.test(text)) {
      return { text, kcal: roundKcal(75 * pickFoodByName('生菜', '生').kcal / 100 + 75 * pickFoodByName('番茄', '生').kcal / 100) };
    }
    if (/彩椒\/菠菜/.test(text)) {
      return { text, kcal: roundKcal(100 * pickFoodByName('青椒', '生').kcal / 100 + 100 * pickFoodByName('菠菜', '生').kcal / 100) };
    }
    if (/西兰花\/胡萝卜/.test(text)) {
      return { text, kcal: roundKcal(100 * pickFoodByName('西兰花', '生').kcal / 100 + 100 * 41 / 100) };
    }
    if (/冬瓜\/番茄\/菠菜/.test(text)) {
      return { text, kcal: roundKcal((250 / 3) * (pickFoodByName('冬瓜', '生').kcal + pickFoodByName('番茄', '生').kcal + pickFoodByName('菠菜', '生').kcal) / 100) };
    }
    if (/杏鲍菇\/生菜/.test(text)) {
      return { text, kcal: roundKcal(100 * pickFoodByName('杏鲍菇', '生').kcal / 100 + 100 * pickFoodByName('生菜', '生').kcal / 100) };
    }
    const food = findRecipeFood(text);
    if (!food) return { text, kcal: null };
    const grams = parseRecipeAmount(text, food);
    if (!grams) return { text, kcal: null };
    let kcal = grams * food.kcal / 100;
    if (food.name === '藜麦' && text.includes('熟藜麦')) kcal = grams * 120 / 100;
    return { text, kcal: roundKcal(kcal) };
  }

  function estimateRecipe(recipe) {
    const items = (recipe.items || []).map(estimateRecipeIngredient);
    const known = items.filter(item => item.kcal != null);
    return {
      ...recipe,
      itemsDetailed: items,
      kcal: known.length ? known.reduce((sum, item) => sum + item.kcal, 0) : null,
    };
  }

  function kcalFromMet(weightKg, minutes, met) {
    return roundKcal((met * 3.5 * weightKg / 200) * minutes);
  }

  function estimateTrainingBurn({ weightKg, goal, minutes, cardioMinutes, cardioOnly }) {
    const warmupMinutes = cardioOnly ? 0 : 12;
    const resistanceMinutes = cardioOnly ? 0 : Math.max(0, minutes - warmupMinutes - cardioMinutes);
    const resistanceMet = RECIPE_MET.resistance[goal] || RECIPE_MET.resistance.maintain;
    const cardioMet = RECIPE_MET.cardio[goal] || RECIPE_MET.cardio.maintain;
    return kcalFromMet(weightKg, resistanceMinutes, resistanceMet)
      + kcalFromMet(weightKg, cardioMinutes, cardioMet)
      + kcalFromMet(weightKg, warmupMinutes, RECIPE_MET.warmup);
  }

  // meal.idx 是该餐次序号（0/1/2），用于轮换
  function pickMealFoods(meal, goal, prefs) {
    const items = [];
    let { carbG, proteinG, fatG } = meal;
    const idx = meal.idx ?? 0;

    // 1) 蛋白质（轮换 + 大量自动拆分）
    if (proteinG > 0) {
      const pickList = getProteinRotation(goal, prefs, meal.tag);
      const choice = pickList[idx % pickList.length];
      const main = pickFoodByName(choice[0], '生');
      if (main) {
        // 早餐 / 末餐 优先用鸡蛋拆一部分
        let useEgg = (meal.tag === 'early' || meal.tag === 'last') && goal !== 'cut';
        if (meal.tag === 'early' && goal === 'cut') useEgg = true; // 减脂早餐也加鸡蛋（控脂少加）
        if (useEgg && proteinG >= 12) {
          const egg = pickFoodByName('鸡蛋(整蛋)','生');
          const eggs = goal === 'cut' ? 1 : Math.min(2, Math.floor(proteinG/15));
          const eggGrams = eggs * 50;
          pushFoodItem(items, `鸡蛋（整蛋）${eggs} 个 / 约 ${eggGrams} g`, eggGrams, egg);
          proteinG -= eggGrams*egg.p/100;
          carbG    -= eggGrams*egg.c/100;
          fatG     -= eggGrams*egg.f/100;
        }
        // 主蛋白：单餐单一食材上限 200 g（大众饮食习惯 + 蛋白合成效率），超出自动拆分
        let grams = Math.round(proteinG / (main.p/100));
        if (grams > 200) {
          const capped = Math.min(Math.round(grams / 2), 200);
          pushFoodItem(items, formatProteinServingText(main, capped), capped, main);
          // 剩余蛋白优先用即食鸡胸肉（蛋白密度高）或老豆腐补足
          const secFood = pickFoodByName('即食鸡胸肉', '即食') || pickFoodByName('老豆腐(北豆腐)', '即食');
          const remainP = proteinG - capped * main.p / 100;
          if (remainP > 0 && secFood) {
            const tg = Math.min(Math.round(remainP / (secFood.p / 100)), 250);
            if (tg > 0) {
              pushFoodItem(items, `${secFood.name} ${tg} g`, tg, secFood);
              proteinG = remainP - tg * secFood.p / 100;
              carbG -= tg * secFood.c / 100; fatG -= tg * secFood.f / 100;
            }
          }
          carbG -= capped * main.c / 100; fatG -= capped * main.f / 100;
        } else {
          pushFoodItem(items, formatProteinServingText(main, grams), grams, main);
          carbG -= grams*main.c/100; fatG -= grams*main.f/100;
          proteinG = 0;
        }
      }
    }

    // 2) 碳水（轮换；减脂末餐少/无碳水已在 mealsPlan 中减量；单餐熟食上限 350 g）
    if (carbG > 5) {
      const list = getCarbRotation(goal, prefs);
      const choice = list[idx % list.length];
      const carb = pickFoodByName(choice[0], choice[1]);
      if (carb) {
        let grams = Math.round(carbG / (carb.c/100));
        const MAX_CARB_GRAMS = 350;
        if (grams > MAX_CARB_GRAMS) {
          const remainC = carbG - MAX_CARB_GRAMS * carb.c / 100;
          grams = MAX_CARB_GRAMS;
          pushFoodItem(items, `${carb.name}${carb.raw==='生'?'（生）':carb.raw==='熟'?'（熟）':''} ${grams} g`, grams, carb);
          if (remainC > 8) {
            const bananaPer100 = 22.8;
            const bananaG = Math.round(remainC / bananaPer100 * 100);
            items.push({ text: `香蕉 约 ${bananaG} g（${Math.round(bananaG/120)} 根）补充剩余碳水`, kcal: Math.round(bananaG * 0.91), note: true });
          }
        } else {
          pushFoodItem(items, `${carb.name}${carb.raw==='生'?'（生）':carb.raw==='熟'?'（熟）':''} ${grams} g`, grams, carb);
        }
        proteinG -= grams*carb.p/100; fatG -= grams*carb.f/100;
      }
    } else if (meal.tag === 'last' && goal === 'cut') {
      items.push({ text: '（减脂期末餐）不安排主食或仅以低碳蔬菜替代', kcal: null, note: true });
    }

    // 3) 蔬菜轮换（每餐 200 g）
    const veg = VEG_ROTATION[idx % VEG_ROTATION.length];
    const vegFood = pickFoodByName(veg, '生');
    pushFoodItem(items, `${veg} 200 g（${goal==='cut'?'水焯/清蒸':'清炒/水焯'}）`, 200, vegFood);

    // 4) 脂肪补足
    if (fatG > 3) {
      const oil = pickFoodByName('橄榄油');
      const grams = Math.round(fatG / (oil.f/100));
      if (grams > 0) pushFoodItem(items, `烹饪用橄榄油 ${grams} g`, grams, oil);
    } else if (fatG < -3) {
      items.push({ text: '注：本餐蛋白源已含较多脂肪，烹饪请少油（喷油/刷油）', kcal: null, note: true });
    }

    // 5) 减脂期脂肪缺口 > 8 → 主动补充健康脂肪
    if (goal === 'cut' && fatG > 8) {
      items.push({ text: '额外补充健康脂肪：核桃 1 把 ≈15 g 或 牛油果 1/4 个 ≈40 g', kcal: 97, note: true });
    }

    return items;
  }

  // 烹饪与用油规则
  function cookingRules(goal) {
    if (goal === 'cut') return {
      cls: 'B 类（减脂）',
      methods: '必须以蒸/煮/焯/清炖/无油或少油空气炸为主（≥80%）；允许少油快炒（喷油/刷油）；禁止：油炸、酥炸、油焖、蜜汁、重油重糖红烧',
      oil: '烹饪用油单餐 ≤8 g、全天 ≤25 g；若按此用油不达每日脂肪目标，必须主动补充健康脂肪（坚果、橄榄油直接淋、牛油果、蛋黄）',
      salt: '盐 全天 ≤5 g、单餐 ≤1 g；减脂尽量 0 添加蔗糖',
    };
    return {
      cls: 'A 类（增肌 / 维持）',
      methods: '蒸、煮、炖、烤、少油炒、空气炸优先；允许正常少油煎炒、不禁红烧/卤制（不额外大量加糖）',
      oil: '正常家用油量即可，不必抠克数；先满足每日脂肪总目标',
      salt: '盐 全天 ≤5 g、单餐 ≤1 g；可少量糖',
    };
  }

  // 训练参考（仅文档涉及部分：抗阻训练对维持肌肉/代谢的作用 + 频率与活动系数对应）
  function trainingNotes(goal, freq, hasResistance, actId, prefs) {
    const out = [];
    const a = window.ACTIVITY_LEVELS.find(x => x.id === actId);
    out.push(`已选活动水平：${a ? `${a.name}（${a.desc}）· ×${a.factor}` : '—'}`);
    if (hasPref(prefs.training, 'home')) out.push('已按“居家可练优先”尽量替换为徒手、哑铃、单杠友好动作。');
    if (hasPref(prefs.training, 'machine')) out.push('已按“器械稳定优先”提高哑铃、绳索、固定器械动作占比。');
    if (hasPref(prefs.training, 'cardio')) out.push('已按“多一点有氧”在每次训练收尾额外增加约 10 分钟有氧。');
    if (goal === 'cut') {
      out.push('减脂期务必结合抗阻训练，并保证蛋白摄入，以维持肌肉与力量水平、避免基础代谢下降（文档：代谢适应规避要点 2）。');
      out.push('代谢适应触发条件：两个月内脂肪量下降 >当前总体重 10%。可每月安排 4–5 次"高热量日"（不超过当前每日总消耗）。');
    } else if (goal === 'bulk') {
      out.push('增肌期通过对热量的精准把握使脂肪不增长或尽量少增长（文档原文）。');
      out.push('刚开始抗阻训练或复训前 1–2 周肌肉糖原+水分会增多，体重短期上升与盈亏无关。');
    } else {
      out.push('维持期保持有规律的抗阻训练有助于维持肌肉量与基础代谢。');
    }
    return out;
  }

  // 月度复盘建议
  function monthlyAdjust(goal) {
    if (goal === 'cut') return [
      '若实际下降速度 < 预期 → 再削减热量（仍不得低于 BMR 安全下限）',
      '若实际下降速度 > 预期 → 适当增加热量，避免过快减脂导致肌肉流失',
      '减脂期每周脂肪量减少 ≤ 当前体重 1%（仅指脂肪重量，水分波动不算）',
    ];
    if (goal === 'bulk') return [
      '若肌肉/体重增长 < 预期 → 增加每日摄入',
      '若体重增长超预期且增加的多为脂肪 → 减少每日摄入',
      `本体重段每月瘦体重增长目标 ${(window.LEAN_GAIN_RATE(0)===0.02?'2% (<60kg) / 1.5% (60–80kg) / 1% (>80kg)':'')}`,
    ];
    return ['维持期以体重/腰围/体脂保持稳定为目标，每周称重 1–2 次，固定时间与状态。'];
  }

  // —— 详细周训练计划（Hevy / Fitbod 风格）
  function buildTrainingPlan(form) {
    const prefs = normalizePrefs(form);
    const goal = form.goal;
    const weightKg = form.weightKg;
    let freq = form.freqPerWeek;
    if (!freq || freq < 1) {
      // 从 activityId 推断
      const map = { sedentary:1, light_day:2, micro:2, light:3, moderate:4, active:5, very_active:6, athlete:6 };
      freq = map[form.activityId] || 3;
    }
    freq = Math.max(1, Math.min(7, +freq));
    const split = window.TRAINING_SPLITS[freq];
    const layout = window.WEEK_LAYOUTS[freq];
    const tune = window.GOAL_TRAINING_TUNE[goal] || window.GOAL_TRAINING_TUNE.maintain;
    const cardioBonus = hasPref(prefs.training, 'cardio') ? 10 : 0;

    const days = split.sessions.map((sessionId, i) => {
      const tpl = window.SESSION_TEMPLATES[sessionId];
      const cardioMinutes = sessionId === 'cardio' ? 38 + cardioBonus : tune.cardioMin + cardioBonus;
      if (tpl.cardioOnly) {
        const minutes = 35 + cardioBonus;
        return {
          weekday: layout[i], title: tpl.name, sessionId,
          warmup: ['5 分钟动态拉伸'],
          exercises: [],
          cardio: `中低强度有氧 ${30 + cardioBonus}-${45 + cardioBonus} 分钟（慢跑/骑行/游泳/快走）`,
          cooldown: window.EXERCISES.cooldown.slice(0,2),
          totalSets: 0,
          cardioMinutes,
          minutes,
          burnKcal: estimateTrainingBurn({ weightKg, goal, minutes, cardioMinutes, cardioOnly: true }),
        };
      }
      const usedNames = new Set();
      const exercises = tpl.items.map(it => {
        const ex = pickSessionExercise(it, prefs, usedNames);
        if (!ex) return null;
        const sets = Math.max(1, ex.sets + tune.setsDelta);
        const rest = Math.max(30, ex.rest + tune.restDelta);
        return { ...ex, grp: it.grp, sets, rest };
      }).filter(Boolean);
      const totalSets = exercises.reduce((s,e)=>s+e.sets, 0);
      // 每组工作时长 ≈ 40s + 休息
      const baseMinutes = Math.round(exercises.reduce((s,e)=> s + e.sets*(40+e.rest)/60, 0)) + 12;
      const minutes = baseMinutes + cardioMinutes;
      return {
        weekday: layout[i],
        title: tpl.name,
        sessionId,
        warmup: window.EXERCISES.warmup,
        exercises,
        cardio: `${tune.cardioMin + cardioBonus} 分钟 ${tune.cardioType}`,
        cooldown: window.EXERCISES.cooldown,
        totalSets,
        cardioMinutes,
        minutes,
        burnKcal: estimateTrainingBurn({ weightKg, goal, minutes, cardioMinutes, cardioOnly: false }),
      };
    });
    const weeklyBurnKcal = days.reduce((sum, day) => sum + (day.burnKcal || 0), 0);
    return { freq, splitName: split.name, splitDesc: split.desc, days, tune: { ...tune, cardioMin: tune.cardioMin + cardioBonus }, weeklyBurnKcal, prefs };
  }

  // 总入口
  function buildReport(form) {
    const { sex, age, heightCm, weightKg, bodyFatPct, goal, activityId, freqPerWeek, hasResistance } = form;
    const prefs = normalizePrefs(form);
    const bmrStrategy = getBmrComparison({ sex, age, heightCm, weightKg, bodyFatPct });
    const bmrVal = bmrStrategy.selectedBmr;
    const tdeeVal = tdee(bmrVal, activityId);
    const tgt = targetCalories({ goal, tdeeVal, bmrVal, weightKg });
    const M = macros(tgt.kcal, goal);
    const meals = mealsPlan(M, goal);
    const meal_foods = meals.map((m, idx) => ({ ...m, idx, foods: pickMealFoods({ ...m, idx }, goal, prefs) }));
    const fiber = fiberTarget(tgt.kcal, goal, sex);
    const water = waterPlan(weightKg);
    const bmiV = bmi(heightCm, weightKg);
    const cooking = cookingRules(goal);
    const training = trainingNotes(goal, freqPerWeek, hasResistance, activityId, prefs);
    const trainingPlan = buildTrainingPlan(form);
    const recipes = Object.fromEntries(Object.entries(pickPreferredRecipes(goal, prefs)).map(([slot, list]) => [slot, list.map(estimateRecipe)]));
    const adjust = monthlyAdjust(goal);

    const leanMassKg = bmrStrategy.leanMassKg;
    const fatMassKg  = bodyFatPct ? +(weightKg * (bodyFatPct/100)).toFixed(1) : null;
    const progress = buildProgressGuide({ sex, heightCm, weightKg, goal, bodyFatPct, leanMassKg });

    return {
      input: form, bmr: Math.round(bmrVal), tdee: Math.round(tdeeVal),
      target: tgt, macros: M, meals: meal_foods, fiber, water, bmi: bmiV,
      leanMassKg, fatMassKg, progress, cooking, training, trainingPlan, recipes, preferences: prefs, adjust,
      bmrStrategy,
      activity: window.ACTIVITY_LEVELS.find(a => a.id === activityId),
    };
  }

  window.CALC = { buildReport, buildTrainingPlan, bmr, tdee, targetCalories, macros, mealsPlan, fiberTarget, waterPlan, bmi };
})();
