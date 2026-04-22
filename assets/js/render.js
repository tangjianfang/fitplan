// 报告渲染（移动优先 · 极简）
(function () {
  const $ = (s, p=document) => p.querySelector(s);
  const el = (tag, attrs={}, html='') => {
    const x = document.createElement(tag);
    Object.entries(attrs).forEach(([k,v])=>x.setAttribute(k,v));
    if (html != null) x.innerHTML = html;
    return x;
  };

  function renderForm(parsed) {
    $('#sex').value = parsed.sex || 'male';
    $('#age').value = parsed.age ?? '';
    $('#height').value = parsed.heightCm ?? '';
    $('#weight').value = parsed.weightKg ?? '';
    $('#bodyFat').value = parsed.bodyFatPct ?? '';
    $('#goal').value = parsed.goal || 'cut';
    $('#activity').value = parsed.activityId || 'light_day';
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
      hasResistance: true,
    };
  }

  function pct(part, total) { return total ? `${(part/total*100).toFixed(0)}%` : ''; }

  function renderReport(form) {
    if (!form.sex || !form.age || !form.weightKg || !form.heightCm || !form.goal) {
      alert('请补全：性别 / 年龄 / 身高 / 体重 / 目标'); return false;
    }
    const r = window.CALC.buildReport(form);
    const root = $('#report');
    root.innerHTML = '';

    const ratioLabel = window.MACRO_RATIOS[form.goal].label;
    const goalLabel = {bulk:'增肌', cut:'减脂', maintain:'维持'}[form.goal];

    root.appendChild(card('1', '身体评估 · 总能量', `
      <div class="kv">
        <div class="stat"><div class="lbl">${form.sex==='male'?'男':'女'} · ${form.age} 岁</div><div class="val">${form.heightCm}/${form.weightKg}</div><div class="sub">cm / kg</div></div>
        <div class="stat"><div class="lbl">BMI</div><div class="val">${r.bmi?.value ?? '—'}</div><div class="sub">${r.bmi?.cat ?? ''}</div></div>
        <div class="stat"><div class="lbl">BMR 静息代谢</div><div class="val">${r.bmr}</div><div class="sub">kcal · 世卫公式</div></div>
        <div class="stat"><div class="lbl">TDEE 总消耗</div><div class="val brand">${r.tdee}</div><div class="sub">×${r.activity.factor} ${r.activity.name}</div></div>
        ${r.leanMassKg!=null ? `<div class="stat"><div class="lbl">瘦体重 / 脂肪</div><div class="val">${r.leanMassKg}/${r.fatMassKg}</div><div class="sub">kg · 体脂 ${form.bodyFatPct}%</div></div>` : ''}
      </div>
    `));

    root.appendChild(card('2', `每日热量 · ${goalLabel}`, `
      <div class="kv">
        <div class="stat"><div class="lbl">目标摄入</div><div class="val brand">${r.target.kcal}</div><div class="sub">kcal/日</div></div>
        <div class="stat"><div class="lbl">相较 TDEE</div><div class="val">${r.target.kcal>r.tdee?'+':''}${r.target.kcal - r.tdee}</div><div class="sub">kcal</div></div>
      </div>
      <ul class="tight">${r.target.notes.map(n=>`<li>${n}</li>`).join('')}</ul>
    `));

    const M = r.macros;
    root.appendChild(card('3', `三大营养素 · ${ratioLabel}`, `
      <div class="kv">
        <div class="stat"><div class="lbl">碳水 ${pct(M.carbKcal,r.target.kcal)}</div><div class="val">${M.carbG}<span class="muted" style="font-size:12px;font-weight:400"> g</span></div><div class="sub">${M.carbKcal} kcal</div></div>
        <div class="stat"><div class="lbl">蛋白 ${pct(M.proteinKcal,r.target.kcal)}</div><div class="val">${M.proteinG}<span class="muted" style="font-size:12px;font-weight:400"> g</span></div><div class="sub">${M.proteinKcal} kcal</div></div>
        <div class="stat"><div class="lbl">脂肪 ${pct(M.fatKcal,r.target.kcal)}</div><div class="val">${M.fatG}<span class="muted" style="font-size:12px;font-weight:400"> g</span></div><div class="sub">${M.fatKcal} kcal</div></div>
        <div class="stat"><div class="lbl">膳食纤维</div><div class="val">${r.fiber.min}${r.fiber.max!==r.fiber.min?'–'+r.fiber.max:''}<span class="muted" style="font-size:12px;font-weight:400"> g</span></div><div class="sub">${r.fiber.text}</div></div>
      </div>
    `));

    const mealHtml = r.meals.map(m => `
      <div class="meal">
        <h4><span>${m.name}</span><span class="kcal">${m.kcal} kcal</span></h4>
        <div class="meta">碳水 ${m.carbG} g · 蛋白 ${m.proteinG} g · 脂肪 ${m.fatG} g</div>
        <ul>${m.foods.map(f=>`<li>${f}</li>`).join('')}</ul>
        ${m.tip ? `<div class="note">${m.tip}</div>` : ''}
      </div>
    `).join('');
    root.appendChild(card('4', '餐次与食物', mealHtml + `
      <div class="note">练后餐摄入最多；早餐次之；末餐最少且应在睡前 2 小时吃完${form.goal==='cut'?'，减脂期末餐尽量不摄入碳水':''}。</div>
    `));

    root.appendChild(card('5', `烹饪规则 · ${r.cooking.cls}`, `
      <ul class="tight">
        <li><b>方式：</b>${r.cooking.methods}</li>
        <li><b>用油：</b>${r.cooking.oil}</li>
        <li><b>调味：</b>${r.cooking.salt}</li>
      </ul>
    `));

    root.appendChild(card('6', '训练与复盘', `
      <h3>训练参考</h3>
      <ul class="tight">${r.training.map(x=>`<li>${x}</li>`).join('')}</ul>
      <h3>每月复盘</h3>
      <ul class="tight">${r.adjust.map(x=>`<li>${x}</li>`).join('')}</ul>
    `));

    root.appendChild(card('7', '水合', `
      <ul class="tight">
        <li>训前 2h 起：${r.water.preLo}–${r.water.preHi} ml（${form.weightKg} kg × 3–5 ml/kg）</li>
        <li>训中：少量多次，≤ ${r.water.midMaxPerHour} ml/h</li>
        <li>训后 6h 内：补充流失体重 × 140%</li>
      </ul>
    `));

    $('#report-wrap').classList.remove('hidden');
    $('#report-wrap').scrollIntoView({behavior:'smooth', block:'start'});
    return true;
  }

  function card(num, title, html) {
    return el('section', {class:'r-card'}, `<h2><span class="num">${num}</span>${title}</h2>${html}`);
  }

  async function exportPng() {
    if (!window.html2canvas) { alert('图片导出库加载中，请稍后再试'); return; }
    const node = $('#report');
    const canvas = await html2canvas(node, {scale:2, backgroundColor:'#ffffff', useCORS:true});
    const a = document.createElement('a');
    a.download = `健身饮食方案_${new Date().toISOString().slice(0,10)}.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();
  }

  window.UI = { renderForm, readForm, renderReport, exportPng };
})();
