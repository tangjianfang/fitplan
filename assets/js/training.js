// 训练动作库与分化方案 —— 参考主流健身 App（Hevy / Fitbod / 硬派健身）
// 每个动作：name 名 | grp 主肌群 | type compound/iso | eq 器械 | reps 默认次数 | sets 组数 | rest 组间(秒)
// goalSetsAdj：增肌+1组，减脂保持，维持-0
window.EXERCISES = {
  chest: [
    { name: '杠铃卧推', type: 'compound', eq: '杠铃', sets: 4, reps: '6-10', rest: 120, tip: '肩胛后缩下沉，杠铃下放到乳头连线' },
    { name: '上斜哑铃卧推', type: 'compound', eq: '哑铃+斜板', sets: 4, reps: '8-12', rest: 90, tip: '斜板 30°，肘略低于肩' },
    { name: '哑铃卧推', type: 'compound', eq: '哑铃', sets: 4, reps: '8-12', rest: 90 },
    { name: '双杠臂屈伸', type: 'compound', eq: '双杠', sets: 3, reps: '8-12', rest: 90, tip: '身体前倾偏胸，下放到上臂与地面平行' },
    { name: '俯卧撑', type: 'compound', eq: '徒手', sets: 4, reps: '12-20', rest: 60, home: true },
    { name: '哑铃飞鸟', type: 'iso', eq: '哑铃', sets: 3, reps: '12-15', rest: 60, tip: '肘微屈固定，画弧线' },
    { name: '绳索夹胸', type: 'iso', eq: '绳索', sets: 3, reps: '12-15', rest: 60 },
  ],
  back: [
    { name: '引体向上', type: 'compound', eq: '单杠', sets: 4, reps: '6-10', rest: 120, tip: '正握略宽于肩，胸口向杠靠近' },
    { name: '高位下拉', type: 'compound', eq: '高位下拉器', sets: 4, reps: '8-12', rest: 90 },
    { name: '杠铃划船', type: 'compound', eq: '杠铃', sets: 4, reps: '8-10', rest: 120, tip: '俯身约 45°，杠拉至下腹' },
    { name: '坐姿绳索划船', type: 'compound', eq: '绳索', sets: 4, reps: '10-12', rest: 90 },
    { name: '哑铃单臂划船', type: 'compound', eq: '哑铃+长凳', sets: 3, reps: '10-12', rest: 75 },
    { name: '直臂下压', type: 'iso', eq: '绳索', sets: 3, reps: '12-15', rest: 60, tip: '肘略屈固定，集中背阔发力' },
    { name: '硬拉', type: 'compound', eq: '杠铃', sets: 4, reps: '5-6', rest: 180, tip: '中立脊柱，髋膝同步发力，建议每周不超过 1 次' },
    { name: '反向划船', type: 'compound', eq: '徒手/低杠', sets: 3, reps: '10-15', rest: 75, home: true },
  ],
  legs: [
    { name: '杠铃深蹲', type: 'compound', eq: '杠铃+深蹲架', sets: 4, reps: '6-10', rest: 150, tip: '蹲到大腿与地面平行或更低，膝盖跟脚尖方向' },
    { name: '罗马尼亚硬拉', type: 'compound', eq: '杠铃/哑铃', sets: 4, reps: '8-10', rest: 120, tip: '腿微屈、屈髋后移，感受腘绳肌拉伸' },
    { name: '腿举', type: 'compound', eq: '腿举机', sets: 4, reps: '10-15', rest: 90 },
    { name: '保加利亚分腿蹲', type: 'compound', eq: '哑铃+长凳', sets: 3, reps: '10-12/侧', rest: 90 },
    { name: '臀冲（髋推）', type: 'compound', eq: '杠铃+长凳', sets: 4, reps: '8-12', rest: 90, tip: '顶峰收缩 1 秒，强化臀大肌' },
    { name: '腿屈伸', type: 'iso', eq: '腿屈伸机', sets: 3, reps: '12-15', rest: 60 },
    { name: '俯卧腿弯举', type: 'iso', eq: '腿弯举机', sets: 3, reps: '12-15', rest: 60 },
    { name: '站姿提踵', type: 'iso', eq: '提踵机/哑铃', sets: 4, reps: '15-20', rest: 45 },
    { name: '徒手深蹲', type: 'compound', eq: '徒手', sets: 4, reps: '15-25', rest: 60, home: true },
  ],
  shoulders: [
    { name: '坐姿哑铃推举', type: 'compound', eq: '哑铃+靠背', sets: 4, reps: '8-12', rest: 90, tip: '肘略前倾，避免肩峰撞击' },
    { name: '杠铃推举(站姿)', type: 'compound', eq: '杠铃', sets: 4, reps: '6-10', rest: 120 },
    { name: '哑铃侧平举', type: 'iso', eq: '哑铃', sets: 4, reps: '12-15', rest: 60, tip: '小拇指略高、肘领先；可配合慢速离心' },
    { name: '反向飞鸟', type: 'iso', eq: '哑铃/绳索', sets: 3, reps: '12-15', rest: 60, tip: '俯身或反向器械，重点后束三角' },
    { name: '面拉', type: 'iso', eq: '绳索+绳索把手', sets: 3, reps: '15-20', rest: 60, tip: '肘高于腕，外旋肩关节，护肩动作' },
    { name: '阿诺德推举', type: 'compound', eq: '哑铃', sets: 3, reps: '10-12', rest: 75 },
  ],
  arms: [
    { name: '杠铃弯举', type: 'iso', eq: '杠铃/EZ杠', sets: 3, reps: '8-12', rest: 75 },
    { name: '哑铃锤式弯举', type: 'iso', eq: '哑铃', sets: 3, reps: '10-12', rest: 60, tip: '中立握，兼顾肱桡肌' },
    { name: '上斜哑铃弯举', type: 'iso', eq: '哑铃+斜板', sets: 3, reps: '10-12', rest: 60 },
    { name: '绳索三头下压', type: 'iso', eq: '绳索', sets: 3, reps: '10-15', rest: 60 },
    { name: '仰卧屈臂伸', type: 'iso', eq: '杠铃/哑铃', sets: 3, reps: '8-12', rest: 75, tip: '俗称"骷髅推"，保护手腕慢速进行' },
    { name: '窄距俯卧撑', type: 'compound', eq: '徒手', sets: 3, reps: '10-15', rest: 60, home: true },
  ],
  core: [
    { name: '平板支撑', type: 'iso', eq: '徒手', sets: 3, reps: '30-60s', rest: 45, home: true },
    { name: '悬挂举腿', type: 'iso', eq: '单杠', sets: 3, reps: '8-12', rest: 60 },
    { name: '负重卷腹', type: 'iso', eq: '哑铃/片', sets: 3, reps: '12-15', rest: 45 },
    { name: '俄罗斯转体', type: 'iso', eq: '哑铃', sets: 3, reps: '20 次/侧', rest: 45, home: true },
    { name: '死虫式', type: 'iso', eq: '徒手', sets: 3, reps: '10/侧', rest: 30, home: true, tip: '强化深层核心，腰背贴地' },
  ],
  warmup: [
    '5 分钟有氧热身（椭圆/快走/动感单车）',
    '动态拉伸：肩绕环 ×10、髋绕环 ×10、弓步走 ×10/侧',
    '弹力带激活：肩外旋 ×15、臀桥 ×15',
    '主项空杆/轻重量热身组 2 组 ×8（递增到 50% 训练重量）',
  ],
  cooldown: [
    '5 分钟低强度有氧（慢走）放松',
    '静态拉伸所训练肌群，每个动作 30 秒，重复 2 次',
    '泡沫轴放松紧张部位（背、腿前后侧、臀）3-5 分钟',
  ],
};

// 训练分化方案：根据周训练频率自动选择
window.TRAINING_SPLITS = {
  1: { name: '全身入门', desc: '每周 1 次：以全身复合动作为主，建立基础', sessions: ['fullbody'] },
  2: { name: '上下分化(2)', desc: '每周 2 次：上肢日 + 下肢日', sessions: ['upper', 'lower'] },
  3: { name: '全身 A/B/A', desc: '每周 3 次：经典全身循环，新手到中阶最优', sessions: ['fullA', 'fullB', 'fullA'] },
  4: { name: '上下分化(4)', desc: '每周 4 次：Upper/Lower × 2，平衡训练量', sessions: ['upper', 'lower', 'upper', 'lower'] },
  5: { name: '推/拉/腿+上/下', desc: '每周 5 次：兼顾分化与频率', sessions: ['push', 'pull', 'legs', 'upper', 'lower'] },
  6: { name: 'PPL × 2', desc: '每周 6 次：进阶玩家高频高量', sessions: ['push', 'pull', 'legs', 'push', 'pull', 'legs'] },
  7: { name: 'PPL × 2 + 有氧', desc: '每周 7 次：6 抗阻 + 1 有氧/恢复日', sessions: ['push', 'pull', 'legs', 'push', 'pull', 'legs', 'cardio'] },
};

// 每个 session 包含哪些动作（取自 EXERCISES）
// 选择策略：复合动作优先，每个肌群 2-3 个动作（1-2 复合 + 1 孤立）
window.SESSION_TEMPLATES = {
  fullbody: { name: '全身', items: [
    { grp: 'legs', name: '杠铃深蹲' }, { grp: 'chest', name: '杠铃卧推' },
    { grp: 'back', name: '杠铃划船' }, { grp: 'shoulders', name: '坐姿哑铃推举' },
    { grp: 'core', name: '平板支撑' },
  ]},
  fullA: { name: '全身 A · 推+下肢', items: [
    { grp: 'legs', name: '杠铃深蹲' }, { grp: 'chest', name: '杠铃卧推' },
    { grp: 'shoulders', name: '坐姿哑铃推举' }, { grp: 'arms', name: '绳索三头下压' },
    { grp: 'core', name: '平板支撑' },
  ]},
  fullB: { name: '全身 B · 拉+下肢后链', items: [
    { grp: 'legs', name: '罗马尼亚硬拉' }, { grp: 'back', name: '高位下拉' },
    { grp: 'back', name: '坐姿绳索划船' }, { grp: 'shoulders', name: '哑铃侧平举' },
    { grp: 'arms', name: '杠铃弯举' }, { grp: 'core', name: '悬挂举腿' },
  ]},
  upper: { name: '上肢日', items: [
    { grp: 'chest', name: '上斜哑铃卧推' }, { grp: 'back', name: '引体向上' },
    { grp: 'chest', name: '哑铃飞鸟' }, { grp: 'back', name: '坐姿绳索划船' },
    { grp: 'shoulders', name: '哑铃侧平举' }, { grp: 'arms', name: '杠铃弯举' },
    { grp: 'arms', name: '绳索三头下压' },
  ]},
  lower: { name: '下肢日', items: [
    { grp: 'legs', name: '杠铃深蹲' }, { grp: 'legs', name: '罗马尼亚硬拉' },
    { grp: 'legs', name: '腿举' }, { grp: 'legs', name: '俯卧腿弯举' },
    { grp: 'legs', name: '臀冲（髋推）' }, { grp: 'legs', name: '站姿提踵' },
    { grp: 'core', name: '负重卷腹' },
  ]},
  push: { name: '推日（胸/肩/三头）', items: [
    { grp: 'chest', name: '杠铃卧推' }, { grp: 'shoulders', name: '坐姿哑铃推举' },
    { grp: 'chest', name: '上斜哑铃卧推' }, { grp: 'shoulders', name: '哑铃侧平举' },
    { grp: 'chest', name: '绳索夹胸' }, { grp: 'arms', name: '绳索三头下压' },
    { grp: 'arms', name: '仰卧屈臂伸' },
  ]},
  pull: { name: '拉日（背/二头/后束）', items: [
    { grp: 'back', name: '引体向上' }, { grp: 'back', name: '杠铃划船' },
    { grp: 'back', name: '高位下拉' }, { grp: 'back', name: '哑铃单臂划船' },
    { grp: 'shoulders', name: '面拉' }, { grp: 'arms', name: '杠铃弯举' },
    { grp: 'arms', name: '哑铃锤式弯举' },
  ]},
  legs: { name: '腿日（股四/腘绳/臀/小腿）', items: [
    { grp: 'legs', name: '杠铃深蹲' }, { grp: 'legs', name: '罗马尼亚硬拉' },
    { grp: 'legs', name: '保加利亚分腿蹲' }, { grp: 'legs', name: '腿举' },
    { grp: 'legs', name: '俯卧腿弯举' }, { grp: 'legs', name: '臀冲（髋推）' },
    { grp: 'legs', name: '站姿提踵' },
  ]},
  cardio: { name: '有氧/恢复日', items: [], cardioOnly: true },
};

// 按目标调整：增肌→训练量+1组、组间休息+15s；减脂→组间-15s、增加 superset
window.GOAL_TRAINING_TUNE = {
  bulk:    { setsDelta: +1, restDelta: +15, cardioMin: 10, cardioType: 'LISS（低强度匀速）保护体能恢复' },
  cut:     { setsDelta:  0, restDelta: -15, cardioMin: 25, cardioType: 'HIIT 4×4 或 LISS 25-30 min（HR 60-70%）' },
  maintain:{ setsDelta:  0, restDelta:   0, cardioMin: 15, cardioType: '每周 2-3 次 LISS 20 min' },
};

// 周排程（建议把高强度日错开，给 24-48h 恢复）
window.WEEK_LAYOUTS = {
  1: ['周三'],
  2: ['周一','周四'],
  3: ['周一','周三','周五'],
  4: ['周一','周二','周四','周五'],
  5: ['周一','周二','周四','周五','周六'],
  6: ['周一','周二','周三','周五','周六','周日'],
  7: ['周一','周二','周三','周四','周五','周六','周日'],
};
