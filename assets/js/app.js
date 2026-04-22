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
    fillActivity();
    fillExamples();

    $('#btn-extract').onclick = doExtract;
    $('#btn-clear').onclick = clearAll;
    $('#btn-gen').onclick = doGenerate;

    $('#btn-print').onclick = () => window.print();
    $('#btn-png').onclick = () => window.UI.exportPng();
    $('#btn-back').onclick = () => $('#input-card').scrollIntoView({behavior:'smooth'});

    // 输入实时缓存
    ['#nl','#sex','#age','#height','#weight','#bodyFat','#goal','#activity','#freq'].forEach(sel => {
      const e = $(sel);
      if (!e) return;
      e.addEventListener('input', () => saveAll());
      e.addEventListener('change', () => saveAll());
    });

    $('#nl').addEventListener('keydown', e => {
      if ((e.ctrlKey||e.metaKey) && e.key === 'Enter') doExtract();
    });

    restore();
  });
})();
