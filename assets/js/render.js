// 报告渲染 · TOC 侧栏 + 丰富分区
(function () {
  const $ = (s, p=document) => p.querySelector(s);
  const el = (tag, attrs={}, html='') => {
    const x = document.createElement(tag);
    Object.entries(attrs).forEach(([k,v])=>x.setAttribute(k,v));
    if (html != null) x.innerHTML = html;
    return x;
  };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  // i18n shortcut – falls back gracefully if i18n.js not loaded yet
  const t = (k) => (window.t ? window.t(k) : k);

  function setChecks(name, values) {
    const picked = new Set(Array.isArray(values) ? values : []);
    document.querySelectorAll(`input[name="${name}"]`).forEach((input) => {
      input.checked = picked.has(input.value);
    });
  }

  function getChecks(name) {
    return [...document.querySelectorAll(`input[name="${name}"]:checked`)].map((input) => input.value);
  }

  const TRAIN_PREF_LABELS = {
    home: '居家可练优先',
    machine: '器械稳定优先',
    cardio: '多一点有氧',
  };
  const DIET_PREF_LABELS = {
    rice: '米饭/薯类主食',
    oat: '燕麦/面包主食',
    seafood: '海鲜优先',
    no_beef: '不吃牛肉',
    low_lactose: '低乳糖',
  };

  function renderPrefBadges(title, values, labels) {
    if (!Array.isArray(values) || !values.length) return '';
    return `<div class="badge-row"><span class="bdg">${esc(title)}</span>${values.map((value) => `<span class="bdg ghost">${esc(labels[value] || value)}</span>`).join('')}</div>`;
  }

  function renderKcalList(items) {
    return `<ul class="kcal-list">${items.map((raw) => {
      const item = typeof raw === 'string' ? { text: raw, kcal: null } : raw;
      return `<li><span>${esc(item.text)}</span>${item.kcal != null ? `<span class="item-kcal">${item.kcal} kcal</span>` : ''}</li>`;
    }).join('')}</ul>`;
  }

  function renderForm(parsed) {
    $('#sex').value = parsed.sex || 'male';
    $('#age').value = parsed.age ?? '';
    $('#height').value = parsed.heightCm ?? '';
    $('#weight').value = parsed.weightKg ?? '';
    $('#bodyFat').value = parsed.bodyFatPct ?? '';
    $('#goal').value = parsed.goal || 'cut';
    $('#activity').value = parsed.activityId || 'light_day';
    if ($('#freq')) $('#freq').value = parsed.freqPerWeek ?? '';
    setChecks('trainingPref', parsed.trainingPrefs);
    setChecks('dietPref', parsed.dietPrefs);
    const need = ['sex','age','heightCm','weightKg','goal'];
    const got = need.filter(k => parsed[k] != null && parsed[k] !== '').length;
    $('#confidence').textContent = `抽取 ${got}/${need.length}`;
  }

  function readForm() {
    return {
      sex: $('#sex').value,
      age: +$('#age').value,
      heightCm: +$('#height').value,
      weightKg: +$('#weight').value,
      bodyFatPct: $('#bodyFat').value ? +$('#bodyFat').value : null,
      goal: $('#goal').value,
      activityId: $('#activity').value,
      freqPerWeek: $('#freq') && $('#freq').value ? +$('#freq').value : null,
      trainingPrefs: getChecks('trainingPref'),
      dietPrefs: getChecks('dietPref'),
      hasResistance: true,
    };
  }

  function pct(part, total) { return total ? `${(part/total*100).toFixed(0)}%` : ''; }

  function getSectionGroups() {
    return [
      {
        id: 'overview',
        title: t('grp_overview'),
        icon: '📊',
        report: true,
        items: [
          ['assess', t('sec_assess'), '👤'],
          ['energy', t('sec_energy'), '🔥'],
        ],
      },
      {
        id: 'training-plan',
        title: t('grp_training_plan'),
        icon: '🏋️',
        report: true,
        items: [
          ['training', t('sec_training'), '🏋️'],
          ['week', t('sec_week'), '📅'],
        ],
      },
      {
        id: 'diet-plan',
        title: t('grp_diet_plan'),
        icon: '🍱',
        report: true,
        items: [
          ['meals', t('sec_meals'), '🍱'],
          ['recipes', t('sec_recipes'), '👨‍🍳'],
        ],
      },
      {
        id: 'rules',
        title: t('grp_rules'),
        icon: '🧭',
        report: true,
        items: [
          ['guidelines', t('sec_guidelines'), '🧭'],
        ],
      },
      {
        id: 'reference',
        title: t('grp_reference'),
        icon: '📚',
        report: false,
        items: [
          ['supps', t('sec_supps'), '💊'],
          ['eatout', t('sec_eatout'), '🍽️'],
          ['recovery', t('sec_recovery'), '😴'],
          ['plateau', t('sec_plateau'), '📈'],
        ],
      },
    ];
  }

  function renderReport(form) {
    if (!form.sex || !form.age || !form.weightKg || !form.heightCm || !form.goal) {
      alert('请补全：性别 / 年龄 / 身高 / 体重 / 目标'); return false;
    }
    const r = window.CALC.buildReport(form);

    const SECTION_GROUPS = getSectionGroups();
    const REFERENCE_GROUP = SECTION_GROUPS.find(group => !group.report);

    const wrap = $('#report');
    wrap.innerHTML = `
      <aside class="report-toc no-print" id="toc">
        <div class="toc-title">${t('toc_title')}</div>
        <ol id="toc-list"></ol>
      </aside>
      <div class="report-column">
        <div class="report-main" id="report-main"></div>
        <section class="ref-panel no-print" id="reference-area"></section>
      </div>
    `;
    const tocList = $('#toc-list');
    const main = $('#report-main');
    const referenceArea = $('#reference-area');
    let reportIndex = 0;

    SECTION_GROUPS.forEach((group) => {
      const groupEl = el('li', { class: 'toc-group' });
      groupEl.innerHTML = `
        <div class="toc-group-title">
          <span class="ti">${group.icon}</span>
          <span>${esc(group.title)}</span>
          ${group.report ? '' : `<span class="toc-tag">${esc(t('toc_no_export'))}</span>`}
        </div>
        <ol class="toc-sublist"></ol>
      `;
      const sublist = $('.toc-sublist', groupEl);

      group.items.forEach(([id, title, icon]) => {
        const num = group.report ? String(++reportIndex) : '参';
        const li = el('li', { class: 'toc-subitem' }, `
          <a href="#sec-${id}" data-target="sec-${id}">
            <span class="toc-num">${esc(num)}</span>
            <span class="ti">${icon}</span>
            <span>${esc(title)}</span>
          </a>
        `);
        sublist.appendChild(li);

        if (group.report) {
          const sec = el('section', { id: `sec-${id}`, class: 'r-card', 'data-sec': id });
          sec.innerHTML = `<h2><span class="num">${reportIndex}</span>${esc(title)}</h2>` + renderSectionBody(id, r, form);
          main.appendChild(sec);
        }
      });

      tocList.appendChild(groupEl);
    });

    referenceArea.innerHTML = renderReferenceArea(r, form, REFERENCE_GROUP);

    bindScrollSpy();
    bindTocClick();

    $('#report-wrap').classList.remove('hidden');
    $('#report-wrap').scrollIntoView({behavior:'smooth', block:'start'});
    return true;
  }

  function renderSectionBody(id, r, form) {
    switch (id) {
      case 'assess':   return secAssess(r, form);
      case 'energy':   return secEnergy(r, form);
      case 'training': return secTraining(r, form);
      case 'week':     return secWeek(r, form);
      case 'meals':    return secMeals(r, form);
      case 'recipes':  return secRecipes(r, form);
      case 'guidelines': return secGuidelines(r, form);
      case 'supps':    return secSupps(r, form);
      case 'eatout':   return secEatout();
      case 'recovery': return secRecovery();
      case 'plateau':  return secPlateau(r, form);
    }
    return '';
  }

  function infoBtn(key, dataset) {
    const attrs = Object.entries(dataset).map(([k,v]) => `data-${k}="${esc(String(v||''))}"`).join(' ');
    return `<button class="info-btn" data-info="${key}" ${attrs} aria-label="说明">?</button>`;
  }

  function bmiColorClass(cat) {
    if (!cat) return '';
    const c = cat.toLowerCase();
    if (c.includes('偏瘦') || c.includes('under')) return 'val-under';
    if (c.includes('正常') || c.includes('normal')) return 'val-normal';
    if (c.includes('超重') || c.includes('over')) return 'val-over';
    return 'val-obese';
  }

  function secAssess(r, form) {
    const guide = r.progress;
    const bmi = r.bmi;
    const bmiCls = bmiColorClass(bmi?.cat);
    const bmiGauge = window._APP_CHARTS ? window._APP_CHARTS.bmiGaugeSvg(bmi?.value ?? null) : '';
    return `
      <div class="kv">
        <div class="stat"><div class="lbl">${t(form.sex==='male'?'opt_male':'opt_female')} · ${form.age} 岁</div><div class="val">${form.heightCm}/${form.weightKg}</div><div class="sub">cm / kg</div></div>
        <div class="stat"><div class="lbl">BMI ${infoBtn('bmi',{bmiVal:bmi?.value??''})}</div><div class="val ${bmiCls}">${bmi?.value ?? '—'}</div><div class="sub">${esc(bmi?.cat ?? '')}</div></div>
        <div class="stat"><div class="lbl">BMR ${infoBtn('bmr',{})}</div><div class="val">${r.bmr}</div><div class="sub">kcal · 静息代谢</div></div>
        <div class="stat"><div class="lbl">TDEE ${infoBtn('tdee',{})}</div><div class="val brand">${r.tdee}</div><div class="sub">×${r.activity.factor} ${esc(r.activity.name)}</div></div>
        ${r.leanMassKg!=null ? `<div class="stat"><div class="lbl">${t('lbl_lean_fat')} ${infoBtn('bf',{bfPct:form.bodyFatPct??'',sex:form.sex||'male'})}</div><div class="val">${r.leanMassKg}/${r.fatMassKg}</div><div class="sub">kg · ${t('unit_lean')} ${form.bodyFatPct}%</div></div>` : ''}
        <div class="stat"><div class="lbl">${t('lbl_healthy_range')} ${infoBtn('hw',{})}</div><div class="val">${guide.healthy.low}-${guide.healthy.high}</div><div class="sub">kg · ${t('unit_bmi_range')}</div></div>
        <div class="stat"><div class="lbl">${esc(guide.actionLabel)}</div><div class="val brand">${esc(guide.actionValue)}</div><div class="sub">${esc(guide.actionSub)}</div></div>
        <div class="stat"><div class="lbl">${esc(guide.paceLabel)}</div><div class="val">${esc(guide.paceValue)}</div><div class="sub">${esc(guide.paceSub)}</div></div>
      </div>
      ${bmiGauge}
      <ul class="tight">${guide.notes.map((note) => `<li>${esc(note)}</li>`).join('')}</ul>`;
  }

  function secEnergy(r, form) {
    const goalLabel = {bulk:t('opt_bulk'), cut:t('opt_cut'), maintain:t('opt_maintain')}[form.goal];
    const ratioLabel = window.MACRO_RATIOS[form.goal].label;
    const M = r.macros, kcal = r.target.kcal;
    const diff = kcal - r.tdee;
    const isDeficit = diff < 0;
    const fillPct = Math.min(100, Math.max(4, Math.abs(diff) / Math.max(1,r.tdee) * 100 * 4)).toFixed(1);
    const fillClass = diff > 50 ? 'surplus' : diff < -50 ? 'deficit' : 'neutral';
    const macroBars = [
      { label: t('lbl_carb'),    g: M.carbG,    kcal: M.carbKcal,    color:'#f59e0b', p: pct(M.carbKcal, kcal) },
      { label: t('lbl_protein'), g: M.proteinG, kcal: M.proteinKcal, color:'#3b82f6', p: pct(M.proteinKcal, kcal) },
      { label: t('lbl_fat'),     g: M.fatG,     kcal: M.fatKcal,     color:'#a78bfa', p: pct(M.fatKcal, kcal) },
    ];
    const macroBarRows = macroBars.map(mb => `
      <div class="macro-bar-row">
        <span class="lbl">${esc(mb.label)} ${mb.p}</span>
        <div class="macro-bar-track"><div class="macro-bar-fill" style="width:${mb.p};background:${mb.color}"></div></div>
        <span class="val">${mb.g}<span class="muted" style="font-size:11px"> g</span></span>
      </div>`).join('');
    const macroPieChart = window._APP_CHARTS ? window._APP_CHARTS.macroPieSvg(M.carbG, M.proteinG, M.fatG) : '';
    return `
      <div class="kv">
        <div class="stat"><div class="lbl">${t('lbl_daily_target')} · ${goalLabel}</div><div class="val brand">${kcal}</div><div class="sub">kcal</div></div>
        <div class="stat"><div class="lbl">${t('lbl_vs_tdee')}</div><div class="val ${diff>=0?'val-normal':'val-over'}">${diff>=0?'+':''}${diff}</div><div class="sub">kcal</div></div>
        <div class="stat"><div class="lbl">${t('lbl_fiber')}</div><div class="val">${r.fiber.min}${r.fiber.max!==r.fiber.min?'–'+r.fiber.max:''}</div><div class="sub">g/日</div></div>
      </div>
      <div class="cal-balance">
        <div class="cal-balance-label"><span>TDEE ${r.tdee} kcal</span><span>目标 ${kcal} kcal (${isDeficit?'缺额':'盈余'} ${Math.abs(diff)} kcal)</span></div>
        <div class="cal-balance-track"><div class="cal-balance-fill ${fillClass}" style="width:${fillPct}%"></div></div>
      </div>
      <h3>${t('h3_macros')} · ${ratioLabel} ${infoBtn('macros',{carbG:M.carbG,proteinG:M.proteinG,fatG:M.fatG})}</h3>
      <div class="macro-bars">${macroBarRows}</div>
      ${macroPieChart}
      <ul class="tight">${r.target.notes.map(n=>`<li>${esc(n)}</li>`).join('')}</ul>`;
  }

  function secTraining(r, form) {
    const tp = r.trainingPlan;
    const note = r.training.map(x=>`<li>${esc(x)}</li>`).join('');
    const avgBurn = Math.round(tp.weeklyBurnKcal / Math.max(1, tp.days.length));
    return `
      <div class="badge-row">
        <span class="bdg">${tp.freq} ${t('lbl_days_week')}</span>
        <span class="bdg brand">${esc(tp.splitName)}</span>
        <span class="bdg ghost">组间 ${tp.tune.restDelta>=0?'+':''}${tp.tune.restDelta}s · 训练量 ${tp.tune.setsDelta>=0?'+':''}${tp.tune.setsDelta} 组</span>
      </div>
      ${renderPrefBadges('训练偏好', r.preferences.training, TRAIN_PREF_LABELS)}
      <div class="kv training-kv">
        <div class="stat"><div class="lbl">${t('lbl_avg_burn')} ${infoBtn('burn',{})}</div><div class="val brand">${avgBurn}</div><div class="sub">${t('lbl_kcal_per')}</div></div>
        <div class="stat"><div class="lbl">${t('lbl_weekly_burn')}</div><div class="val">${tp.weeklyBurnKcal}</div><div class="sub">${t('lbl_kcal_wk')}</div></div>
      </div>
      <p class="muted" style="margin:6px 0 10px">${esc(tp.splitDesc)}</p>
      <h3>${t('h3_train_principle')}</h3>
      <ul class="tight">${note}</ul>
      <h3>${t('h3_progressive')}</h3>
      <ul class="tight">
        <li>${t('tip_main_lift')}</li>
        <li>${t('tip_accessory')}</li>
        <li>${t('tip_rpe')}</li>
        <li>${t('tip_deload')}</li>
      </ul>`;
  }

  function secWeek(r) {
    const tp = r.trainingPlan;
    const days = tp.days.map((d) => {
      if (d.sessionId === 'cardio') {
        return `<div class="day-card">
          <div class="day-head"><b>${esc(d.weekday)} · ${esc(d.title)}</b><span class="muted">约 ${d.minutes} min · ≈ ${d.burnKcal} kcal</span></div>
          <div class="muted" style="margin-top:6px">${esc(d.cardio)}</div>
        </div>`;
      }
      const exHtml = d.exercises.map((e, idx) => `
        <tr>
          <td class="num-td">${idx+1}</td>
          <td><b>${esc(e.name)}</b><div class="muted" style="font-size:11px">${esc(e.eq)}${e.tip?' · '+esc(e.tip):''}</div></td>
          <td class="ctr">${e.sets}×${esc(e.reps)}</td>
          <td class="ctr muted">${e.rest}s</td>
        </tr>`).join('');
      return `<div class="day-card">
        <div class="day-head">
          <b>${esc(d.weekday)} · ${esc(d.title)}</b>
          <span class="muted">${d.totalSets} 组 · 约 ${d.minutes} min · ≈ ${d.burnKcal} kcal</span>
        </div>
        <details class="day-detail" open>
          <summary class="muted">${t('lbl_expand_collapse')}</summary>
          <h4>${t('lbl_warmup')}</h4>
          <ul class="tight">${d.warmup.map(w=>`<li>${esc(w)}</li>`).join('')}</ul>
          <h4>${t('lbl_main_train')}</h4>
          <table class="tbl">
            <thead><tr><th>${t('tbl_no')}</th><th>${t('tbl_ex')}</th><th>${t('tbl_sets')}</th><th>${t('tbl_rest')}</th></tr></thead>
            <tbody>${exHtml}</tbody>
          </table>
          <h4>${t('lbl_cardio_sec')}</h4>
          <p class="muted" style="margin:6px 0">${esc(d.cardio)}</p>
          <h4>${t('lbl_cooldown')}</h4>
          <ul class="tight">${d.cooldown.map(w=>`<li>${esc(w)}</li>`).join('')}</ul>
        </details>
      </div>`;
    }).join('');
    return `
      <div class="badge-row">
        <span class="bdg">${t('note_gap')}</span>
        <span class="bdg ghost">${t('note_meal_timing')}</span>
      </div>
      <div class="day-grid">${days}</div>`;
  }

  function secMeals(r, form) {
    return renderPrefBadges('饮食偏好', r.preferences.diet, DIET_PREF_LABELS) + r.meals.map(m => `
      <div class="meal">
        <h4><span>${esc(m.name)}</span><span class="kcal">${m.kcal} kcal</span></h4>
        <div class="meta">碳水 ${m.carbG} g · 蛋白 ${m.proteinG} g · 脂肪 ${m.fatG} g</div>
        ${renderKcalList(m.foods)}
        ${m.tip ? `<div class="note">${esc(m.tip)}</div>` : ''}
      </div>`).join('') + `
      <div class="note">${t('note_meals_main')}${form.goal==='cut'?t('note_meals_cut'):''}。</div>`;
  }

  function secRecipes(r, form) {
    const R = r.recipes;
    const block = (label, list) => `
      <h3>${label}</h3>
      <div class="recipe-grid">
        ${list.map(rc => `
          <div class="recipe">
            <div class="r-head"><div class="r-name">${esc(rc.name)}</div>${rc.kcal != null ? `<span class="item-kcal">约 ${rc.kcal} kcal</span>` : ''}</div>
            ${renderKcalList(rc.itemsDetailed || rc.items.map((text) => ({ text, kcal: null })))}
            <div class="note">${esc(rc.how)}</div>
          </div>`).join('')}
      </div>`;
    return renderPrefBadges('饮食偏好', r.preferences.diet, DIET_PREF_LABELS)
      + block(t('lbl_breakfast_r'), R.early)
      + block(t('lbl_post_r'), R.post)
      + block(t('lbl_dinner_r'), R.last);
  }

  function secGuidelines(r, form) {
    return `
      <div class="subsec">
        <h3>${t('h3_workout_nut')}</h3>
        ${secWorkoutNut(r, form)}
      </div>
      <div class="subsec">
        <h3>${t('h3_cooking')}</h3>
        ${secCooking(r)}
      </div>
      <div class="subsec">
        <h3>${t('h3_water')}</h3>
        ${secWater(r, form)}
      </div>`;
  }

  function secWorkoutNut(r) {
    const W = window.WORKOUT_NUTRITION;
    const card = w => `<div class="recipe">
      <div class="r-name">${esc(w.title)}</div>
      <ul class="tight">${w.items.map(i=>`<li>${esc(i)}</li>`).join('')}</ul></div>`;
    return `<div class="recipe-grid">${card(W.pre)}${card(W.intra)}${card(W.post)}</div>
      <div class="note">${t('note_pre_water')} ${r.water.preLo}-${r.water.preHi} ${t('note_mid_water_sep')}${r.water.midMaxPerHour} ${t('note_mid_water_end')}</div>`;
  }

  function secCooking(r) {
    return `
      <div class="badge-row"><span class="bdg brand">${esc(r.cooking.cls)}</span></div>
      <ul class="tight">
        <li><b>方式：</b>${esc(r.cooking.methods)}</li>
        <li><b>用油：</b>${esc(r.cooking.oil)}</li>
        <li><b>调味：</b>${esc(r.cooking.salt)}</li>
      </ul>`;
  }

  function secWater(r, form) {
    return `
      <div class="kv">
        <div class="stat"><div class="lbl">${t('water_lbl_day')}</div><div class="val">${Math.round(form.weightKg*35)}</div><div class="sub">${t('water_sub_day')}</div></div>
        <div class="stat"><div class="lbl">${t('water_lbl_pre')}</div><div class="val">${r.water.preLo}-${r.water.preHi}</div><div class="sub">${t('water_sub_pre')}</div></div>
        <div class="stat"><div class="lbl">${t('water_lbl_mid')}</div><div class="val">≤${r.water.midMaxPerHour}</div><div class="sub">${t('water_sub_mid')}</div></div>
        <div class="stat"><div class="lbl">${t('water_lbl_post')}</div><div class="val">×140%</div><div class="sub">${t('water_sub_post')}</div></div>
      </div>
      <ul class="tight">
        <li>${t('water_tip1')}</li>
        <li>${t('water_tip2')}</li>
        <li>${t('water_tip3')}</li>
      </ul>`;
  }

  function secSupps(r, form) {
    const list = window.SUPPLEMENTS.filter(s => s.goal === 'all' || s.goal.includes(form.goal));
    return `
      <table class="tbl">
        <thead><tr><th>${t('tbl_supp')}</th><th>${t('tbl_use')}</th><th>${t('tbl_dose')}</th><th>${t('tbl_evidence')}</th></tr></thead>
        <tbody>${list.map(s=>`<tr>
          <td><b>${esc(s.name)}</b></td><td>${esc(s.use)}</td><td>${esc(s.dose)}</td><td>${esc(s.evidence)}</td>
        </tr>`).join('')}</tbody>
      </table>
      <div class="note">${t('note_supps')}</div>`;
  }

  function secEatout() {
    return `<div class="recipe-grid">${window.EATING_OUT.map(o=>`
      <div class="recipe">
        <div class="r-name">${esc(o.scene)}</div>
        <ul class="tight">${o.tips.map(t=>`<li>${esc(t)}</li>`).join('')}</ul>
      </div>`).join('')}</div>`;
  }

  function secRecovery() {
    return `<ul class="tight">${window.RECOVERY_TIPS.map(t=>`<li>${esc(t)}</li>`).join('')}</ul>`;
  }

  function secPlateau(r, form) {
    const P = window.PLATEAU_TIPS[form.goal] || window.PLATEAU_TIPS.maintain;
    return `
      <h3>${t('h3_monthly')}</h3>
      <ul class="tight">${r.adjust.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>
      <h3>${t('h3_plateau')}</h3>
      <ul class="tight">${P.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`;
  }

  function renderReferenceArea(r, form, REFERENCE_GROUP) {
    if (!REFERENCE_GROUP) return '';
    const details = REFERENCE_GROUP.items.map(([id, title, icon]) => `
      <details class="ref-detail" id="sec-${id}" data-sec="${id}">
        <summary>
          <span class="ti">${icon}</span>
          <span>${esc(title)}</span>
        </summary>
        <div class="ref-body">${renderSectionBody(id, r, form)}</div>
      </details>
    `).join('');
    return `
      <div class="ref-head">
        <div>
          <h2>${t('ref_title')}</h2>
          <p>${t('ref_not_exported')}</p>
        </div>
      </div>
      <div class="ref-list">${details}</div>`;
  }

  // —— 滚动监听 + TOC 高亮
  let _spy;
  function bindScrollSpy() {
    if (_spy) _spy.disconnect();
    const items = [...document.querySelectorAll('#toc-list a')];
    const map = new Map(items.map(a => [a.dataset.target, a]));
    _spy = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (en.isIntersecting) {
          items.forEach(a => a.classList.remove('active'));
          const a = map.get(en.target.id);
          if (a) a.classList.add('active');
        }
      });
    }, { rootMargin: '-25% 0px -60% 0px', threshold: 0 });
    document.querySelectorAll('#report-main > section, #reference-area > .ref-list > .ref-detail').forEach(s => _spy.observe(s));
  }

  function bindTocClick() {
    const links = [...document.querySelectorAll('#toc-list a')];
    links.forEach(a => {
      a.addEventListener('click', e => {
        e.preventDefault();
        const id = a.dataset.target;
        const sec = document.getElementById(id);
        links.forEach(link => link.classList.remove('active'));
        a.classList.add('active');
        if (sec && sec.tagName === 'DETAILS') sec.open = true;
        if (sec) sec.scrollIntoView({behavior:'smooth', block:'start'});
      });
    });
  }

  async function exportPng() {
    if (!window.html2canvas) { alert('图片导出库加载中，请稍后再试'); return; }
    const node = $('#report-main') || $('#report');
    const canvas = await html2canvas(node, {scale:2, backgroundColor:'#ffffff', useCORS:true});
    const a = document.createElement('a');
    a.download = `健身饮食方案_${new Date().toISOString().slice(0,10)}.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();
  }

  window.UI = { renderForm, readForm, renderReport, exportPng };
})();
