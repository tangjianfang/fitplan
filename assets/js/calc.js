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

    // cut：默认 0.5 kg / 周脂肪（不超过 1% 体重/周；缺口下限 ≥ BMR）
    const maxWeeklyLossKg = weightKg * C.MAX_WEEKLY_FAT_LOSS_RATIO; // 1% 体重 / 周
    const targetWeeklyKg = Math.min(0.5, maxWeeklyLossKg);
    const dailyDeficit = (targetWeeklyKg * C.KCAL_PER_KG_FAT_LOSS) / 7;
    let kcal = Math.round(tdeeVal - dailyDeficit);
    const notes = [
      `每周减脂目标 ${targetWeeklyKg.toFixed(2)} kg（不超过当前体重 1% = ${maxWeeklyLossKg.toFixed(2)} kg/周）`,
      `${targetWeeklyKg.toFixed(2)} × 7700 ÷ 7 ≈ ${Math.round(dailyDeficit)} kcal/日 缺口`,
    ];
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

  // 食物推荐：每餐按目标三大量精准反算 + 餐间食材轮换 + 单一食材量过大时自动拆分
  // 餐次轮换池
  const PROTEIN_ROTATION = {
    cut:  [['鸡胸肉'], ['龙利鱼','巴沙鱼'], ['虾','鳕鱼'], ['牛腱子肉'], ['去皮鸡腿肉']],
    bulk: [['鸡胸肉'], ['瘦牛肉(牛里脊)'], ['三文鱼'], ['瘦猪肉(猪里脊)'], ['去皮鸡腿肉']],
    maintain: [['鸡胸肉'], ['瘦牛肉(牛里脊)'], ['龙利鱼','巴沙鱼'], ['虾'], ['去皮鸡腿肉']],
  };
  const CARB_ROTATION = {
    cut:  [['燕麦粥'], ['糙米饭','熟'], ['紫薯蒸','蒸'], ['土豆蒸','蒸'], ['全麦面包']],
    bulk: [['白米饭','熟'], ['全麦面包'], ['糙米饭','熟'], ['馒头'], ['土豆蒸','蒸']],
    maintain: [['糙米饭','熟'], ['白米饭','熟'], ['全麦馒头'], ['红薯蒸','蒸'], ['燕麦粥']],
  };
  const VEG_ROTATION = ['西兰花','菠菜','番茄','青椒','黄瓜','生菜','油麦菜','金针菇'];

  function pickFoodByName(name, raw) {
    return window.FOODS.find(f => f.name === name && (raw ? f.raw === raw : true))
        || window.FOODS.find(f => f.name === name);
  }

  // meal.idx 是该餐次序号（0/1/2），用于轮换
  function pickMealFoods(meal, goal) {
    const items = [];
    let { carbG, proteinG, fatG } = meal;
    const idx = meal.idx ?? 0;

    // 1) 蛋白质（轮换 + 大量自动拆分）
    if (proteinG > 0) {
      const pickList = PROTEIN_ROTATION[goal] || PROTEIN_ROTATION.maintain;
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
          items.push(`鸡蛋（整蛋）${eggs} 个 / 约 ${eggGrams} g`);
          proteinG -= eggGrams*egg.p/100;
          carbG    -= eggGrams*egg.c/100;
          fatG     -= eggGrams*egg.f/100;
        }
        // 主蛋白
        let grams = Math.round(proteinG / (main.p/100));
        // 单餐生肉 >300 g 时，拆分一部分给蛋类或豆制品
        if (grams > 300 && goal !== 'bulk') {
          const half = Math.round(grams / 2);
          items.push(`${main.name}（生）${half} g`);
          // 剩下用鸡蛋清/老豆腐
          const tofu = pickFoodByName('老豆腐(北豆腐)','即食');
          const remainP = proteinG - half*main.p/100;
          if (remainP > 0 && tofu) {
            const tg = Math.round(remainP / (tofu.p/100));
            items.push(`${tofu.name} ${tg} g`);
            proteinG = remainP - tg*tofu.p/100;
            carbG -= tg*tofu.c/100; fatG -= tg*tofu.f/100;
          }
          carbG -= half*main.c/100; fatG -= half*main.f/100;
        } else {
          items.push(`${main.name}（生）${grams} g`);
          carbG -= grams*main.c/100; fatG -= grams*main.f/100;
          proteinG = 0;
        }
      }
    }

    // 2) 碳水（轮换；减脂末餐少/无碳水已在 mealsPlan 中减量）
    if (carbG > 5) {
      const list = CARB_ROTATION[goal] || CARB_ROTATION.maintain;
      const choice = list[idx % list.length];
      const carb = pickFoodByName(choice[0], choice[1]);
      if (carb) {
        const grams = Math.round(carbG / (carb.c/100));
        items.push(`${carb.name}${carb.raw==='生'?'（生）':carb.raw==='熟'?'（熟）':''} ${grams} g`);
        proteinG -= grams*carb.p/100; fatG -= grams*carb.f/100;
      }
    } else if (meal.tag === 'last' && goal === 'cut') {
      items.push('（减脂期末餐）不安排主食或仅以低碳蔬菜替代');
    }

    // 3) 蔬菜轮换（每餐 200 g）
    const veg = VEG_ROTATION[idx % VEG_ROTATION.length];
    items.push(`${veg} 200 g（${goal==='cut'?'水焯/清蒸':'清炒/水焯'}）`);

    // 4) 脂肪补足
    if (fatG > 3) {
      const oil = pickFoodByName('橄榄油');
      const grams = Math.round(fatG / (oil.f/100));
      if (grams > 0) items.push(`烹饪用橄榄油 ${grams} g`);
    } else if (fatG < -3) {
      items.push('注：本餐蛋白源已含较多脂肪，烹饪请少油（喷油/刷油）');
    }

    // 5) 减脂期脂肪缺口 > 8 → 主动补充健康脂肪
    if (goal === 'cut' && fatG > 8) {
      items.push('额外补充健康脂肪：核桃 1 把 ≈15 g 或 牛油果 1/4 个 ≈40 g');
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
  function trainingNotes(goal, freq, hasResistance, actId) {
    const out = [];
    const a = window.ACTIVITY_LEVELS.find(x => x.id === actId);
    out.push(`已选活动水平：${a ? `${a.name}（${a.desc}）· ×${a.factor}` : '—'}`);
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

  // 总入口
  function buildReport(form) {
    const { sex, age, heightCm, weightKg, bodyFatPct, goal, activityId, freqPerWeek, hasResistance } = form;
    const bmrVal = bmr(sex, age, weightKg);
    const tdeeVal = tdee(bmrVal, activityId);
    const tgt = targetCalories({ goal, tdeeVal, bmrVal, weightKg });
    const M = macros(tgt.kcal, goal);
    const meals = mealsPlan(M, goal);
    const meal_foods = meals.map((m, idx) => ({ ...m, idx, foods: pickMealFoods({ ...m, idx }, goal) }));
    const fiber = fiberTarget(tgt.kcal, goal, sex);
    const water = waterPlan(weightKg);
    const bmiV = bmi(heightCm, weightKg);
    const cooking = cookingRules(goal);
    const training = trainingNotes(goal, freqPerWeek, hasResistance, activityId);
    const adjust = monthlyAdjust(goal);

    const leanMassKg = bodyFatPct ? +(weightKg * (1 - bodyFatPct/100)).toFixed(1) : null;
    const fatMassKg  = bodyFatPct ? +(weightKg * (bodyFatPct/100)).toFixed(1) : null;

    return {
      input: form, bmr: Math.round(bmrVal), tdee: Math.round(tdeeVal),
      target: tgt, macros: M, meals: meal_foods, fiber, water, bmi: bmiV,
      leanMassKg, fatMassKg, cooking, training, adjust,
      activity: window.ACTIVITY_LEVELS.find(a => a.id === activityId),
    };
  }

  window.CALC = { buildReport, bmr, tdee, targetCalories, macros, mealsPlan, fiberTarget, waterPlan, bmi };
})();
