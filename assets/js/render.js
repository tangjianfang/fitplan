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

  const SECTION_GROUPS = [
    {
      id: 'overview',
      title: '核心概览',
      icon: '📊',
      report: true,
      items: [
        ['assess', '身体评估', '👤'],
        ['energy', '热量与营养', '🔥'],
      ],
    },
    {
      id: 'training-plan',
      title: '训练方案',
      icon: '🏋️',
      report: true,
      items: [
        ['training', '训练计划', '🏋️'],
        ['week', '周训练排程', '📅'],
      ],
    },
    {
      id: 'diet-plan',
      title: '饮食方案',
      icon: '🍱',
      report: true,
      items: [
        ['meals', '每日餐次', '🍱'],
        ['recipes', '推荐食谱', '👨‍🍳'],
      ],
    },
    {
      id: 'rules',
      title: '执行规则',
      icon: '🧭',
      report: true,
      items: [
        ['guidelines', '训练/饮食执行细则', '🧭'],
      ],
    },
    {
      id: 'reference',
      title: '参考资料',
      icon: '📚',
      report: false,
      items: [
        ['supps', '补剂参考', '💊'],
        ['eatout', '外食与聚餐', '🍽️'],
        ['recovery', '睡眠与恢复', '😴'],
        ['plateau', '平台期 & 复盘', '📈'],
      ],
    },
  ];
  const REPORT_GROUPS = SECTION_GROUPS.filter(group => group.report);
  const REPORT_SECTIONS = REPORT_GROUPS.flatMap(group => group.items.map(item => ({ groupId: group.id, groupTitle: group.title, id: item[0], title: item[1], icon: item[2] })));
  const REFERENCE_GROUP = SECTION_GROUPS.find(group => !group.report);

  function renderReport(form) {
    if (!form.sex || !form.age || !form.weightKg || !form.heightCm || !form.goal) {
      alert('请补全：性别 / 年龄 / 身高 / 体重 / 目标'); return false;
    }
    const r = window.CALC.buildReport(form);

    const wrap = $('#report');
    wrap.innerHTML = `
      <aside class="report-toc no-print" id="toc">
        <div class="toc-title">方案目录</div>
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
          ${group.report ? '' : '<span class="toc-tag">不导出</span>'}
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

    referenceArea.innerHTML = renderReferenceArea(r, form);

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

  function secAssess(r, form) {
    return `
      <div class="kv">
        <div class="stat"><div class="lbl">${form.sex==='male'?'男':'女'} · ${form.age} 岁</div><div class="val">${form.heightCm}/${form.weightKg}</div><div class="sub">cm / kg</div></div>
        <div class="stat"><div class="lbl">BMI</div><div class="val">${r.bmi?.value ?? '—'}</div><div class="sub">${r.bmi?.cat ?? ''}</div></div>
        <div class="stat"><div class="lbl">BMR</div><div class="val">${r.bmr}</div><div class="sub">kcal · 静息代谢</div></div>
        <div class="stat"><div class="lbl">TDEE</div><div class="val brand">${r.tdee}</div><div class="sub">×${r.activity.factor} ${esc(r.activity.name)}</div></div>
        ${r.leanMassKg!=null ? `<div class="stat"><div class="lbl">瘦体重 / 脂肪</div><div class="val">${r.leanMassKg}/${r.fatMassKg}</div><div class="sub">kg · 体脂 ${form.bodyFatPct}%</div></div>` : ''}
      </div>`;
  }

  function secEnergy(r, form) {
    const goalLabel = {bulk:'增肌', cut:'减脂', maintain:'维持'}[form.goal];
    const ratioLabel = window.MACRO_RATIOS[form.goal].label;
    const M = r.macros, kcal = r.target.kcal;
    return `
      <div class="kv">
        <div class="stat"><div class="lbl">每日目标 · ${goalLabel}</div><div class="val brand">${kcal}</div><div class="sub">kcal</div></div>
        <div class="stat"><div class="lbl">相较 TDEE</div><div class="val">${kcal>r.tdee?'+':''}${kcal - r.tdee}</div><div class="sub">kcal</div></div>
        <div class="stat"><div class="lbl">膳食纤维</div><div class="val">${r.fiber.min}${r.fiber.max!==r.fiber.min?'–'+r.fiber.max:''}</div><div class="sub">g/日</div></div>
      </div>
      <h3>三大营养素 · ${ratioLabel}</h3>
      <div class="kv">
        <div class="stat"><div class="lbl">碳水 ${pct(M.carbKcal,kcal)}</div><div class="val">${M.carbG}<span class="muted" style="font-size:12px;font-weight:400"> g</span></div><div class="sub">${M.carbKcal} kcal</div></div>
        <div class="stat"><div class="lbl">蛋白 ${pct(M.proteinKcal,kcal)}</div><div class="val">${M.proteinG}<span class="muted" style="font-size:12px;font-weight:400"> g</span></div><div class="sub">${M.proteinKcal} kcal</div></div>
        <div class="stat"><div class="lbl">脂肪 ${pct(M.fatKcal,kcal)}</div><div class="val">${M.fatG}<span class="muted" style="font-size:12px;font-weight:400"> g</span></div><div class="sub">${M.fatKcal} kcal</div></div>
      </div>
      <ul class="tight">${r.target.notes.map(n=>`<li>${esc(n)}</li>`).join('')}</ul>`;
  }

  function secTraining(r, form) {
    const tp = r.trainingPlan;
    const note = r.training.map(x=>`<li>${esc(x)}</li>`).join('');
    return `
      <div class="badge-row">
        <span class="bdg">${tp.freq} 天/周</span>
        <span class="bdg brand">${esc(tp.splitName)}</span>
        <span class="bdg ghost">组间 ${tp.tune.restDelta>=0?'+':''}${tp.tune.restDelta}s · 训练量 ${tp.tune.setsDelta>=0?'+':''}${tp.tune.setsDelta} 组</span>
      </div>
      ${renderPrefBadges('训练偏好', r.preferences.training, TRAIN_PREF_LABELS)}
      <p class="muted" style="margin:6px 0 10px">${esc(tp.splitDesc)}</p>
      <h3>训练原则</h3>
      <ul class="tight">${note}</ul>
      <h3>渐进超负荷（每周递增）</h3>
      <ul class="tight">
        <li><b>力量主项</b>：完成全部目标次数 → 下次 +2.5 kg（小肌群 +1 kg）</li>
        <li><b>辅助孤立</b>：先加次数到上限，再加重量（12 次满 → 加重重新从 8 次开始）</li>
        <li><b>RPE 控制</b>：主项 RPE 7-8（留 2-3 次预备），最后一组可冲到 RPE 9</li>
        <li><b>减载周</b>：每 6-8 周安排 1 周减半训练量（同重量、组数减半）</li>
      </ul>`;
  }

  function secWeek(r) {
    const tp = r.trainingPlan;
    const days = tp.days.map((d) => {
      if (d.sessionId === 'cardio') {
        return `<div class="day-card">
          <div class="day-head"><b>${esc(d.weekday)} · ${esc(d.title)}</b><span class="muted">约 ${d.minutes} min</span></div>
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
          <span class="muted">${d.totalSets} 组 · 约 ${d.minutes} min</span>
        </div>
        <details class="day-detail" open>
          <summary class="muted">展开/收起</summary>
          <h4>① 热身 5-10 min</h4>
          <ul class="tight">${d.warmup.map(w=>`<li>${esc(w)}</li>`).join('')}</ul>
          <h4>② 主训练</h4>
          <table class="tbl">
            <thead><tr><th>#</th><th>动作</th><th>组×次</th><th>休息</th></tr></thead>
            <tbody>${exHtml}</tbody>
          </table>
          <h4>③ 有氧</h4>
          <p class="muted" style="margin:6px 0">${esc(d.cardio)}</p>
          <h4>④ 放松拉伸 5-10 min</h4>
          <ul class="tight">${d.cooldown.map(w=>`<li>${esc(w)}</li>`).join('')}</ul>
        </details>
      </div>`;
    }).join('');
    return `
      <div class="badge-row">
        <span class="bdg">高强度日间隔 ≥48h</span>
        <span class="bdg ghost">训练前后留 30 min 餐</span>
      </div>
      <div class="day-grid">${days}</div>`;
  }

  function secMeals(r, form) {
    return renderPrefBadges('饮食偏好', r.preferences.diet, DIET_PREF_LABELS) + r.meals.map(m => `
      <div class="meal">
        <h4><span>${esc(m.name)}</span><span class="kcal">${m.kcal} kcal</span></h4>
        <div class="meta">碳水 ${m.carbG} g · 蛋白 ${m.proteinG} g · 脂肪 ${m.fatG} g</div>
        <ul>${m.foods.map(f=>`<li>${esc(f)}</li>`).join('')}</ul>
        ${m.tip ? `<div class="note">${esc(m.tip)}</div>` : ''}
      </div>`).join('') + `
      <div class="note">练后餐摄入最多；早餐次之；末餐最少且应在睡前 2 小时吃完${form.goal==='cut'?'，减脂期末餐尽量不摄入碳水':''}。</div>`;
  }

  function secRecipes(r, form) {
    const R = r.recipes;
    const block = (label, list) => `
      <h3>${label}</h3>
      <div class="recipe-grid">
        ${list.map(rc => `
          <div class="recipe">
            <div class="r-name">${esc(rc.name)}</div>
            <ul class="tight">${rc.items.map(i=>`<li>${esc(i)}</li>`).join('')}</ul>
            <div class="note">${esc(rc.how)}</div>
          </div>`).join('')}
      </div>`;
    return renderPrefBadges('饮食偏好', r.preferences.diet, DIET_PREF_LABELS)
      + block('早餐方案', R.early)
      + block('练后餐方案', R.post)
      + block('晚餐方案', R.last);
  }

  function secGuidelines(r, form) {
    return `
      <div class="subsec">
        <h3>训练营养</h3>
        ${secWorkoutNut(r, form)}
      </div>
      <div class="subsec">
        <h3>烹饪规则</h3>
        ${secCooking(r)}
      </div>
      <div class="subsec">
        <h3>水合补给</h3>
        ${secWater(r, form)}
      </div>`;
  }

  function secWorkoutNut(r) {
    const W = window.WORKOUT_NUTRITION;
    const card = w => `<div class="recipe">
      <div class="r-name">${esc(w.title)}</div>
      <ul class="tight">${w.items.map(i=>`<li>${esc(i)}</li>`).join('')}</ul></div>`;
    return `<div class="recipe-grid">${card(W.pre)}${card(W.intra)}${card(W.post)}</div>
      <div class="note">水：训前 2h 饮 ${r.water.preLo}-${r.water.preHi} ml；训中 ≤${r.water.midMaxPerHour} ml/h。</div>`;
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
        <div class="stat"><div class="lbl">日基础饮水</div><div class="val">${Math.round(form.weightKg*35)}</div><div class="sub">ml · 35 ml/kg</div></div>
        <div class="stat"><div class="lbl">训前 2h</div><div class="val">${r.water.preLo}-${r.water.preHi}</div><div class="sub">ml · 3-5 ml/kg</div></div>
        <div class="stat"><div class="lbl">训中</div><div class="val">≤${r.water.midMaxPerHour}</div><div class="sub">ml/h · 少量多次</div></div>
        <div class="stat"><div class="lbl">训后 6h</div><div class="val">×140%</div><div class="sub">补充流失体重</div></div>
      </div>
      <ul class="tight">
        <li>清水为主；训中 >60 min 可加电解质</li>
        <li>每天咖啡因 ≤400 mg（约 2-3 杯美式）</li>
        <li>少喝含糖饮料、果汁；含酒精饮料按 7 kcal/g 计入热量</li>
      </ul>`;
  }

  function secSupps(r, form) {
    const list = window.SUPPLEMENTS.filter(s => s.goal === 'all' || s.goal.includes(form.goal));
    return `
      <table class="tbl">
        <thead><tr><th>补剂</th><th>用法</th><th>剂量</th><th>证据</th></tr></thead>
        <tbody>${list.map(s=>`<tr>
          <td><b>${esc(s.name)}</b></td><td>${esc(s.use)}</td><td>${esc(s.dose)}</td><td>${esc(s.evidence)}</td>
        </tr>`).join('')}</tbody>
      </table>
      <div class="note">补剂 ≠ 必需。优先做好饮食、训练、睡眠；任何补剂都需查看自己的体检指标与药物相互作用。</div>`;
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
      <h3>每月复盘</h3>
      <ul class="tight">${r.adjust.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>
      <h3>平台期与策略</h3>
      <ul class="tight">${P.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`;
  }

  function renderReferenceArea(r, form) {
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
          <h2>参考资料</h2>
          <p>以下内容为补充参考，不纳入报告导出。</p>
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
