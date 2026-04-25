// 入口 + 本地缓存
(function () {
  const $ = s => document.querySelector(s);
  const KEY = 'fitness-plan-v1';
  const examples = [
    '男 32岁 178 78kg 体脂20% 增肌 一周4次',
    '女 26岁 162 52kg 体脂25% 减脂 每周3次',
    '男 40 175 85kg 28%体脂 减肥 久坐',
  ];

  const store = {
    save(p) { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch(e){} },
    load() { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch(e){ return {}; } },
  };

  function systemMetaText() {
    const m = window.SYSTEM_META || {};
    return `当前系统版本：${m.version || '—'} · 更新日期：${m.updatedAt || '—'}`;
  }

  /* ─── Dark Theme ─── */
  function initTheme() {
    const saved = (() => { try { return localStorage.getItem('fitplan-theme'); } catch(e){ return null; } })();
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme:dark)').matches;
    const theme = saved || (prefersDark ? 'dark' : 'light');
    applyTheme(theme);
  }
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('fitplan-theme', theme); } catch(e){}
    const moon = document.getElementById('icon-moon');
    const sun = document.getElementById('icon-sun');
    if (moon) moon.style.display = theme === 'dark' ? 'none' : '';
    if (sun) sun.style.display = theme === 'dark' ? '' : 'none';
  }
  function toggleTheme() {
    const cur = document.documentElement.getAttribute('data-theme') || 'light';
    applyTheme(cur === 'dark' ? 'light' : 'dark');
  }

  /* ─── QR Code ─── */
  let _qrDone = false;
  function showQrModal() {
    const modal = document.getElementById('qr-modal');
    if (!_qrDone) {
      const container = document.getElementById('qr-canvas');
      container.innerHTML = '';
      const url = 'https://tangjianfang.github.io/fitplan/';
      if (typeof QRCode !== 'undefined') {
        new QRCode(container, {
          text: url, width: 200, height: 200,
          colorDark: document.documentElement.getAttribute('data-theme') === 'dark' ? '#14b8a6' : '#0f766e',
          colorLight: document.documentElement.getAttribute('data-theme') === 'dark' ? '#1e293b' : '#ffffff',
        });
      } else {
        const img = document.createElement('img');
        img.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}&color=0f766e`;
        img.alt = 'QR Code'; img.style.cssText = 'width:200px;height:200px;border-radius:8px';
        container.appendChild(img);
      }
      _qrDone = true;
    }
    modal.classList.remove('hidden');
  }

  /* ─── Info Modal ─── */
  function showInfoModal(key, dataset) {
    const modal = document.getElementById('info-modal');
    const titleEl = document.getElementById('info-title');
    const contentEl = document.getElementById('info-content');
    titleEl.textContent = window.t(`info_${key}_title`);
    contentEl.innerHTML = buildInfoContent(key, dataset);
    modal.classList.remove('hidden');
  }

  function buildInfoContent(key, ds) {
    const esc = s => String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const p = (k) => `<p>${esc(window.t(k))}</p>`;

    switch (key) {
      case 'bmi': {
        const bmiVal = parseFloat(ds.bmiVal);
        return `${p('info_bmi_desc')}
          ${bmiGaugeSvg(isNaN(bmiVal) ? null : bmiVal)}
          <table class="info-zone-table">
            <tr><td style="color:#60a5fa">●</td><td>${esc(window.t('info_bmi_z1'))}</td></tr>
            <tr><td style="color:#22c55e">●</td><td>${esc(window.t('info_bmi_z2'))}</td></tr>
            <tr><td style="color:#f59e0b">●</td><td>${esc(window.t('info_bmi_z3'))}</td></tr>
            <tr><td style="color:#ef4444">●</td><td>${esc(window.t('info_bmi_z4'))}</td></tr>
          </table>
          <p class="note">${esc(window.t('info_bmi_note'))}</p>`;
      }
      case 'bmr':
        return `${p('info_bmr_desc')}
          <div class="info-formula">
            <span>${esc(window.t('info_bmr_formula'))}</span>
            <code>${esc(window.t('info_bmr_male'))}</code>
            <code>${esc(window.t('info_bmr_female'))}</code>
          </div>`;
      case 'tdee':
        return `${p('info_tdee_desc')}
          <p>${esc(window.t('info_tdee_factors'))}</p>
          <ul class="tight">
            <li>${esc(window.t('info_tdee_a1'))}</li>
            <li>${esc(window.t('info_tdee_a2'))}</li>
            <li>${esc(window.t('info_tdee_a3'))}</li>
            <li>${esc(window.t('info_tdee_a4'))}</li>
          </ul>`;
      case 'bf': {
        const bfPct = parseFloat(ds.bfPct);
        const sex = ds.sex || 'male';
        return `${p('info_bf_desc')}
          ${!isNaN(bfPct) ? bodyFatBarSvg(bfPct, sex) : ''}
          <div class="info-bf-grid">
            <div>
              <b>♂</b>
              <ul class="tight" style="font-size:12px">
                <li style="color:#60a5fa">${esc(window.t('info_bf_m1'))}</li>
                <li style="color:#22c55e">${esc(window.t('info_bf_m2'))}</li>
                <li style="color:#f59e0b">${esc(window.t('info_bf_m3'))}</li>
                <li style="color:#ef4444">${esc(window.t('info_bf_m4'))}</li>
              </ul>
            </div>
            <div>
              <b>♀</b>
              <ul class="tight" style="font-size:12px">
                <li style="color:#60a5fa">${esc(window.t('info_bf_f1'))}</li>
                <li style="color:#22c55e">${esc(window.t('info_bf_f2'))}</li>
                <li style="color:#f59e0b">${esc(window.t('info_bf_f3'))}</li>
                <li style="color:#ef4444">${esc(window.t('info_bf_f4'))}</li>
              </ul>
            </div>
          </div>`;
      }
      case 'macros': {
        const c = parseFloat(ds.carbG), pr = parseFloat(ds.proteinG), f = parseFloat(ds.fatG);
        return `${p('info_macro_desc')}
          ${(!isNaN(c) && !isNaN(pr) && !isNaN(f)) ? macroPieSvg(c, pr, f) : ''}
          <ul class="tight">
            <li>${esc(window.t('info_macro_p'))}</li>
            <li>${esc(window.t('info_macro_c'))}</li>
            <li>${esc(window.t('info_macro_f'))}</li>
          </ul>`;
      }
      case 'burn':
        return `${p('info_burn_desc')}
          <div class="info-formula"><code>${esc(window.t('info_burn_formula'))}</code></div>
          <p class="note">${esc(window.t('info_burn_note'))}</p>`;
      case 'hw':
        return `${p('info_hw_desc')}
          <div class="info-formula"><code>${esc(window.t('info_hw_formula'))}</code></div>
          <p class="note">${esc(window.t('info_hw_note'))}</p>`;
      default:
        return '';
    }
  }

  /* ─── SVG chart helpers ─── */
  function bmiGaugeSvg(bmiVal) {
    const W = 300, barY = 30, barH = 18, min = 14, max = 34;
    const toX = v => +((Math.min(Math.max(v, min), max) - min) / (max - min) * W).toFixed(1);
    const zones = [
      { lo:14,  hi:18.5, color:'#60a5fa' },
      { lo:18.5,hi:23.9, color:'#22c55e' },
      { lo:23.9,hi:27.9, color:'#f59e0b' },
      { lo:27.9,hi:34,   color:'#ef4444' },
    ];
    const rects = zones.map(z => {
      const x1 = toX(z.lo), w = toX(z.hi) - x1;
      return `<rect x="${x1}" y="${barY}" width="${w}" height="${barH}" fill="${z.color}" rx="3"/>`;
    }).join('');
    let marker = '';
    if (bmiVal != null) {
      const mx = Math.max(6, Math.min(W-6, toX(bmiVal)));
      marker = `<line x1="${mx}" y1="${barY-5}" x2="${mx}" y2="${barY+barH+5}" stroke="#0f172a" stroke-width="2.5" stroke-linecap="round"/>
        <circle cx="${mx}" cy="${barY-9}" r="6" fill="#0f172a"/>
        <text x="${mx}" y="${barY-18}" text-anchor="middle" class="chart-text" style="font-size:12px;font-weight:700">${bmiVal}</text>`;
    }
    const labels = [
      { x: toX(14)+2, label:'偏瘦', color:'#60a5fa' },
      { x: toX(18.5)+2, label:'正常', color:'#22c55e' },
      { x: toX(23.9)+2, label:'超重', color:'#f59e0b' },
      { x: toX(27.9)+2, label:'肥胖', color:'#ef4444' },
    ];
    const lsvg = labels.map(l => `<text x="${l.x}" y="${barY+barH+14}" class="chart-text" style="font-size:10px;fill:${l.color}">${l.label}</text>`).join('');
    return `<div class="chart-wrap"><svg viewBox="0 0 ${W} 65" style="width:100%;max-width:${W}px">${rects}${marker}${lsvg}</svg></div>`;
  }

  function bodyFatBarSvg(bfPct, sex) {
    const zones = sex === 'female'
      ? [{lo:10,hi:20,color:'#60a5fa'},{lo:20,hi:24,color:'#22c55e'},{lo:24,hi:32,color:'#f59e0b'},{lo:32,hi:45,color:'#ef4444'}]
      : [{lo:2, hi:13,color:'#60a5fa'},{lo:13,hi:17,color:'#22c55e'},{lo:17,hi:25,color:'#f59e0b'},{lo:25,hi:40,color:'#ef4444'}];
    const min = zones[0].lo, max = zones[zones.length-1].hi;
    const W = 300, barY = 30, barH = 18;
    const toX = v => +((Math.min(Math.max(v,min),max)-min)/(max-min)*W).toFixed(1);
    const rects = zones.map(z => `<rect x="${toX(z.lo)}" y="${barY}" width="${toX(z.hi)-toX(z.lo)}" height="${barH}" fill="${z.color}" rx="3"/>`).join('');
    const mx = Math.max(6,Math.min(W-6,toX(bfPct)));
    const marker = `<line x1="${mx}" y1="${barY-5}" x2="${mx}" y2="${barY+barH+5}" stroke="#0f172a" stroke-width="2.5" stroke-linecap="round"/>
      <circle cx="${mx}" cy="${barY-9}" r="6" fill="#0f172a"/>
      <text x="${mx}" y="${barY-18}" text-anchor="middle" class="chart-text" style="font-size:12px;font-weight:700">${bfPct}%</text>`;
    const lsvg = zones.map((z,i) => `<text x="${toX(z.lo)+2}" y="${barY+barH+14}" class="chart-text" style="font-size:10px;fill:${z.color}">${['运动员','健康','普通','超重'][i]}</text>`).join('');
    return `<div class="chart-wrap"><svg viewBox="0 0 ${W} 65" style="width:100%;max-width:${W}px">${rects}${marker}${lsvg}</svg></div>`;
  }

  function macroPieSvg(carbG, proteinG, fatG) {
    const cK = carbG*4, pK = proteinG*4, fK = fatG*9, tot = cK+pK+fK;
    if (!tot) return '';
    const data = [
      {label: window.t('lbl_carb'), kcal:cK, g:carbG,    color:'#f59e0b'},
      {label: window.t('lbl_protein'), kcal:pK, g:proteinG, color:'#3b82f6'},
      {label: window.t('lbl_fat'),  kcal:fK, g:fatG,    color:'#a78bfa'},
    ];
    const R=58, r=30, cx=72, cy=72;
    let ang = -Math.PI/2;
    const paths = data.map(d => {
      const sw = d.kcal/tot*Math.PI*2;
      const x1=cx+R*Math.cos(ang), y1=cy+R*Math.sin(ang);
      const x2=cx+R*Math.cos(ang+sw), y2=cy+R*Math.sin(ang+sw);
      const ix1=cx+r*Math.cos(ang), iy1=cy+r*Math.sin(ang);
      const ix2=cx+r*Math.cos(ang+sw), iy2=cy+r*Math.sin(ang+sw);
      const lg=sw>Math.PI?1:0;
      const path=`<path d="M${f(x1)} ${f(y1)} A${R} ${R} 0 ${lg} 1 ${f(x2)} ${f(y2)} L${f(ix2)} ${f(iy2)} A${r} ${r} 0 ${lg} 0 ${f(ix1)} ${f(iy1)}Z" fill="${d.color}"/>`;
      const mid=ang+sw/2;
      const pct=Math.round(d.kcal/tot*100);
      const lx=cx+(R+16)*Math.cos(mid), ly=cy+(R+16)*Math.sin(mid);
      const lbl=`<text x="${f(lx)}" y="${f(ly)}" text-anchor="middle" dominant-baseline="middle" class="chart-text" style="font-size:11px;font-weight:700">${pct}%</text>`;
      ang+=sw;
      return path+lbl;
    }).join('');
    const legend = data.map((d,i) => {
      const ly = 18+i*22;
      return `<rect x="152" y="${ly}" width="12" height="12" rx="3" fill="${d.color}"/>
        <text x="168" y="${ly+10}" class="chart-text" style="font-size:12px">${d.label} ${Math.round(d.kcal)} kcal / ${d.g}g</text>`;
    }).join('');
    return `<div class="chart-wrap"><svg viewBox="0 0 300 144" style="width:100%;max-width:300px">${paths}${legend}</svg></div>`;
  }
  function f(v){ return v.toFixed(1); }

  /* expose for render.js use */
  window._APP_CHARTS = { bmiGaugeSvg, bodyFatBarSvg, macroPieSvg };

  function fillExamples() {
    const w = $('#chips');
    examples.forEach(t => {
      const c = document.createElement('span');
      c.className = 'ex'; c.textContent = t;
      c.onclick = () => { $('#nl').value = t; saveAll(); doExtract(); };
      w.appendChild(c);
    });
  }

  function fillActivity() {
    const sel = $('#activity');
    window.ACTIVITY_LEVELS.forEach(a => {
      const o = document.createElement('option');
      o.value = a.id; o.textContent = `${a.name} ×${a.factor} · ${a.desc}`;
      sel.appendChild(o);
    });
  }

  function doExtract() {
    const text = $('#nl').value.trim();
    if (!text) { alert('请先输入描述'); return; }
    const parsed = window.NLP.extract(text);
    window.UI.renderForm(parsed);
    $('#form-card').classList.remove('hidden');
    saveAll();
    $('#form-card').scrollIntoView({behavior:'smooth', block:'start'});
  }

  function doGenerate() {
    const form = window.UI.readForm();
    if (window.UI.renderReport(form)) saveAll(true);
  }

  function saveAll(withReport=false) {
    const p = {
      nl: $('#nl').value,
      form: window.UI.readForm(),
      formShown: !$('#form-card').classList.contains('hidden'),
      reportShown: withReport || !$('#report-wrap').classList.contains('hidden'),
      ts: Date.now(),
    };
    store.save(p);
  }

  function restore() {
    const p = store.load();
    if (p.nl) $('#nl').value = p.nl;
    if (p.form && p.form.sex) {
      window.UI.renderForm({
        sex: p.form.sex, age: p.form.age, heightCm: p.form.heightCm,
        weightKg: p.form.weightKg, bodyFatPct: p.form.bodyFatPct,
        goal: p.form.goal, activityId: p.form.activityId,
        freqPerWeek: p.form.freqPerWeek,
        trainingPrefs: p.form.trainingPrefs,
        dietPrefs: p.form.dietPrefs,
      });
      if (p.formShown) $('#form-card').classList.remove('hidden');
      if (p.reportShown && p.form.age && p.form.weightKg && p.form.heightCm) {
        window.UI.renderReport(p.form);
      }
    }
  }

  function clearAll() {
    if (!confirm('清空所有输入与缓存？')) return;
    localStorage.removeItem(KEY);
    $('#nl').value = '';
    $('#form-card').classList.add('hidden');
    $('#report-wrap').classList.add('hidden');
    $('#report').innerHTML = '';
    $('#nl').focus();
  }

  window.addEventListener('DOMContentLoaded', () => {
    // Init i18n + theme
    initTheme();
    window.applyI18n();

    fillActivity();
    fillExamples();
    const homeMeta = document.getElementById('home-build-meta');
    if (homeMeta) homeMeta.textContent = systemMetaText();

    // Header buttons
    $('#btn-theme').onclick = toggleTheme;
    $('#btn-qr').onclick = showQrModal;
    $('#btn-lang').onclick = () => {
      window.setLang(window.LANG === 'zh' ? 'en' : 'zh');
    };

    // Close modals
    document.getElementById('info-close').onclick = () => document.getElementById('info-modal').classList.add('hidden');
    document.getElementById('qr-close').onclick = () => document.getElementById('qr-modal').classList.add('hidden');
    document.querySelectorAll('.modal-overlay').forEach(el => {
      el.addEventListener('click', e => { if (e.target === el) el.classList.add('hidden'); });
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
    });

    // Copy URL button
    document.getElementById('btn-copy-url').onclick = function() {
      const url = 'https://tangjianfang.github.io/fitplan/';
      navigator.clipboard.writeText(url).then(() => {
        this.textContent = window.t('qr_copied');
        setTimeout(() => { this.textContent = window.t('qr_copy'); }, 1800);
      }).catch(() => {
        prompt('复制此链接：', url);
      });
    };

    // Delegated info button clicks (rendered by render.js)
    document.addEventListener('click', e => {
      const btn = e.target.closest('.info-btn');
      if (btn) {
        showInfoModal(btn.dataset.info, btn.dataset);
      }
    });

    $('#btn-extract').onclick = doExtract;
    $('#btn-clear').onclick = clearAll;
    $('#btn-gen').onclick = doGenerate;

    $('#btn-print').onclick = () => window.UI.exportPdf();
    $('#btn-png').onclick = () => window.UI.exportPng();
    $('#btn-back').onclick = () => $('#input-card').scrollIntoView({behavior:'smooth'});

    // 输入实时缓存
    ['#nl','#sex','#age','#height','#weight','#bodyFat','#goal','#activity','#freq'].forEach(sel => {
      const e = $(sel);
      if (!e) return;
      e.addEventListener('input', () => saveAll());
      e.addEventListener('change', () => saveAll());
    });

    document.querySelectorAll('input[name="trainingPref"], input[name="dietPref"]').forEach((input) => {
      input.addEventListener('change', () => saveAll());
    });

    $('#nl').addEventListener('keydown', e => {
      if ((e.ctrlKey||e.metaKey) && e.key === 'Enter') doExtract();
    });

    restore();
  });
})();
