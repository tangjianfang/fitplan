// 数据层：完全来自《运动饮食指南》文档（表0~表8 + 文中规则）
// 1) BMR 公式（世卫组织静息代谢估算） —— 表0
window.BMR_FORMULAS = [
  { sex: 'male',   ageMin: 10, ageMax: 18, k: 17.686, b: 658.2 },
  { sex: 'male',   ageMin: 19, ageMax: 30, k: 15.057, b: 692.2 },
  { sex: 'male',   ageMin: 31, ageMax: 60, k: 11.472, b: 873.1 },
  { sex: 'male',   ageMin: 61, ageMax: 200, k: 11.711, b: 587.7 },
  { sex: 'female', ageMin: 10, ageMax: 18, k: 13.384, b: 692.6 },
  { sex: 'female', ageMin: 19, ageMax: 30, k: 14.818, b: 486.6 },
  { sex: 'female', ageMin: 31, ageMax: 60, k: 8.126,  b: 845.6 },
  { sex: 'female', ageMin: 61, ageMax: 200, k: 9.082,  b: 658.5 },
];

// 2) 活动系数对照表 —— 表1
window.ACTIVITY_LEVELS = [
  { id: 'sedentary',  factor: 1.10, name: '不运动',     desc: '步数<2000，几乎不动' },
  { id: 'light_day',  factor: 1.19, name: '轻日常',     desc: '办公室走动、取快递、简单家务' },
  { id: 'micro',      factor: 1.28, name: '微活动',     desc: '每周运动1-2次/经常散步、近距离步行通勤' },
  { id: 'light',      factor: 1.39, name: '轻度',       desc: '每周运动3次/长时间站立的工作' },
  { id: 'moderate',   factor: 1.50, name: '中度',       desc: '每周运动4-5次' },
  { id: 'active',     factor: 1.62, name: '积极',       desc: '每周中等强度运动6-7次' },
  { id: 'very_active',factor: 1.75, name: '活跃',       desc: '每周高强度运动7次' },
  { id: 'athlete',    factor: 1.90, name: '重度',       desc: '运动员或重体力工作者' },
];

// 3) 宏量营养素分配（碳:蛋:脂） —— 文档原文
window.MACRO_RATIOS = {
  bulk:    { carb: 5,   protein: 3, fat: 2,   label: '增肌期 5:3:2' },
  cut:     { carb: 4,   protein: 3, fat: 3,   label: '减脂期 4:3:3' },
  maintain:{ carb: 4.5, protein: 3, fat: 2.5, label: '维持期 4.5:3:2.5' },
};

// 4) 练后餐专属比例 —— 文档原文
window.POST_WORKOUT_RATIOS = {
  bulk: { carb: 5.5, protein: 3, fat: 1.5, label: '增肌练后餐 5.5:3:1.5' },
  cut:  { carb: 4.5, protein: 3, fat: 2.5, label: '减脂练后餐 4.5:3:2.5' },
};

// 5) 关键常数
window.CONSTANTS = {
  KCAL_PER_KG_LEAN_GAIN: 5555,   // 增加 1kg 瘦体重需要的额外热量
  KCAL_PER_KG_FAT_LOSS:  7700,   // 减少 1kg 体重需消耗
  CARB_KCAL: 4, PROTEIN_KCAL: 4, FAT_KCAL: 9, ALCOHOL_KCAL: 7,
  MAX_WEEKLY_FAT_LOSS_RATIO: 0.01, // 每周减脂≤当前体重1%
};

// 6) 增肌瘦体重月增长率（按体重分段） —— 文档原文
window.LEAN_GAIN_RATE = (weightKg) => {
  if (weightKg < 60) return 0.02;
  if (weightKg <= 80) return 0.015;
  return 0.01;
};

// 7) 膳食纤维 —— 文档原文
window.FIBER_RULE = {
  bulkMaintainMaleG: 38, bulkMaintainFemaleG: 25,
  cutPer1000Kcal: { min: 15, max: 20 },
};

// 8) 食物数据库 —— 来自文档附录 7 张表（每100g可食部分）
window.FOODS = [
  // 主食类
  {cat:'staple',name:'白米饭',raw:'生',kcal:345,c:78.6,p:7.4,f:0.8,fiber:1.3},
  {cat:'staple',name:'糙米饭',raw:'生',kcal:340,c:75.1,p:8.3,f:2.0,fiber:3.5},
  {cat:'staple',name:'玉米鲜',raw:'生',kcal:106,c:22.8,p:4.0,f:1.2,fiber:2.4},
  {cat:'staple',name:'紫薯',raw:'生',kcal:86,c:19.8,p:2.3,f:0.2,fiber:2.5},
  {cat:'staple',name:'红薯',raw:'生',kcal:86,c:20.1,p:1.6,f:0.1,fiber:2.2},
  {cat:'staple',name:'燕麦片纯',raw:'生',kcal:389,c:66.9,p:16.9,f:6.9,fiber:10.6},
  {cat:'staple',name:'荞麦面',raw:'生',kcal:340,c:72.2,p:10.6,f:2.5,fiber:5.5},
  {cat:'staple',name:'藜麦',raw:'生',kcal:368,c:64.2,p:14.1,f:6.1,fiber:7.0},
  {cat:'staple',name:'小米',raw:'生',kcal:361,c:75.1,p:9.0,f:3.1,fiber:3.4},
  {cat:'staple',name:'山药',raw:'生',kcal:57,c:12.4,p:1.9,f:0.2,fiber:1.0},
  {cat:'staple',name:'芋头',raw:'生',kcal:79,c:18.1,p:2.2,f:0.2,fiber:2.2},
  {cat:'staple',name:'南瓜',raw:'生',kcal:26,c:5.3,p:0.7,f:0.1,fiber:1.1},
  {cat:'staple',name:'小麦粉(中筋)',raw:'生',kcal:364,c:76.3,p:10.3,f:1.1,fiber:2.7},
  {cat:'staple',name:'全麦粉',raw:'生',kcal:340,c:69.9,p:13.7,f:2.5,fiber:8.1},
  {cat:'staple',name:'荞麦米',raw:'生',kcal:343,c:71.5,p:9.3,f:2.4,fiber:6.5},
  {cat:'staple',name:'土豆',raw:'生',kcal:77,c:17.2,p:2.0,f:0.1,fiber:1.8},
  {cat:'staple',name:'藕',raw:'生',kcal:70,c:16.4,p:2.6,f:0.1,fiber:2.8},
  {cat:'staple',name:'白米饭',raw:'熟',kcal:116,c:25.9,p:2.6,f:0.3,fiber:0.4},
  {cat:'staple',name:'糙米饭',raw:'熟',kcal:110,c:23.7,p:2.6,f:0.9,fiber:1.0},
  {cat:'staple',name:'馒头',raw:'熟',kcal:223,c:49.8,p:7.0,f:1.1,fiber:1.3},
  {cat:'staple',name:'全麦馒头',raw:'熟',kcal:200,c:43.0,p:8.5,f:1.8,fiber:3.0},
  {cat:'staple',name:'花卷',raw:'熟',kcal:211,c:45.6,p:6.4,f:1.0,fiber:1.2},
  {cat:'staple',name:'白面包',raw:'熟',kcal:265,c:49.7,p:9.0,f:3.2,fiber:2.7},
  {cat:'staple',name:'全麦面包',raw:'熟',kcal:240,c:41.0,p:13.0,f:3.0,fiber:6.0},
  {cat:'staple',name:'玉米水煮',raw:'熟',kcal:112,c:24.0,p:4.2,f:1.3,fiber:2.5},
  {cat:'staple',name:'红薯蒸',raw:'熟',kcal:90,c:21.0,p:1.7,f:0.1,fiber:2.0},
  {cat:'staple',name:'紫薯蒸',raw:'熟',kcal:90,c:20.5,p:2.4,f:0.2,fiber:2.2},
  {cat:'staple',name:'燕麦粥',raw:'熟',kcal:68,c:11.7,p:2.9,f:1.2,fiber:1.8},
  {cat:'staple',name:'小米粥',raw:'熟',kcal:46,c:10.0,p:1.4,f:0.1,fiber:0.5},
  {cat:'staple',name:'土豆蒸',raw:'熟',kcal:87,c:20.1,p:2.3,f:0.1,fiber:1.6},
  {cat:'staple',name:'方便面(含调料)',raw:'熟',kcal:473,c:61.6,p:9.5,f:20.1,fiber:3.0,bad:true},
  {cat:'staple',name:'方便面(不含调料)',raw:'熟',kcal:436,c:59.0,p:8.8,f:17.6,fiber:2.2,bad:true},
  // 低糖水果
  {cat:'fruit',name:'蓝莓',raw:'生',kcal:57,c:14.5,p:1.4,f:0.3,fiber:2.4},
  {cat:'fruit',name:'草莓',raw:'生',kcal:32,c:7.9,p:1.0,f:0.2,fiber:2.0},
  {cat:'fruit',name:'苹果',raw:'生',kcal:52,c:13.5,p:0.2,f:0.2,fiber:2.4},
  {cat:'fruit',name:'柚子',raw:'生',kcal:38,c:9.5,p:0.8,f:0.2,fiber:1.0},
  {cat:'fruit',name:'猕猴桃',raw:'生',kcal:61,c:14.5,p:1.1,f:0.3,fiber:2.6},
  {cat:'fruit',name:'圣女果',raw:'生',kcal:22,c:4.8,p:1.0,f:0.2,fiber:1.2},
  {cat:'fruit',name:'橙子',raw:'生',kcal:47,c:11.1,p:1.1,f:0.2,fiber:2.2},
  {cat:'fruit',name:'梨',raw:'生',kcal:50,c:13.3,p:0.4,f:0.2,fiber:3.1},
  // 低脂蔬菜
  {cat:'veg',name:'菠菜',raw:'生',kcal:28,c:4.5,p:2.6,f:0.3,fiber:2.2},
  {cat:'veg',name:'西兰花',raw:'生',kcal:34,c:6.6,p:2.8,f:0.4,fiber:2.4},
  {cat:'veg',name:'黄瓜',raw:'生',kcal:16,c:2.9,p:0.8,f:0.2,fiber:0.5},
  {cat:'veg',name:'番茄',raw:'生',kcal:18,c:4.0,p:0.9,f:0.2,fiber:1.2},
  {cat:'veg',name:'生菜',raw:'生',kcal:15,c:2.1,p:1.4,f:0.2,fiber:1.0},
  {cat:'veg',name:'芹菜',raw:'生',kcal:16,c:3.3,p:1.2,f:0.2,fiber:1.6},
  {cat:'veg',name:'油麦菜',raw:'生',kcal:15,c:2.1,p:1.4,f:0.2,fiber:1.0},
  {cat:'veg',name:'娃娃菜',raw:'生',kcal:13,c:2.6,p:1.4,f:0.1,fiber:1.0},
  {cat:'veg',name:'金针菇',raw:'生',kcal:32,c:6.0,p:2.4,f:0.4,fiber:2.7},
  {cat:'veg',name:'杏鲍菇',raw:'生',kcal:31,c:6.1,p:1.3,f:0.1,fiber:1.0},
  {cat:'veg',name:'冬瓜',raw:'生',kcal:12,c:2.6,p:0.4,f:0.2,fiber:0.7},
  {cat:'veg',name:'青椒',raw:'生',kcal:22,c:5.4,p:1.0,f:0.2,fiber:1.4},
  // 健康脂肪
  {cat:'fat',name:'牛油果',raw:'生',kcal:160,c:8.5,p:2.0,f:14.7,fiber:6.7},
  {cat:'fat',name:'核桃',raw:'生',kcal:646,c:19.1,p:15.2,f:65.2,fiber:6.7},
  {cat:'fat',name:'杏仁',raw:'生',kcal:575,c:21.7,p:21.2,f:49.4,fiber:12.5},
  {cat:'fat',name:'亚麻籽',raw:'生',kcal:534,c:27.3,p:18.3,f:42.2,fiber:27.3},
  {cat:'fat',name:'橄榄油',raw:'即食',kcal:900,c:0,p:0,f:100,fiber:0},
  {cat:'fat',name:'花生(原味)',raw:'生',kcal:574,c:21.7,p:25.8,f:44.3,fiber:8.5},
  {cat:'fat',name:'奇亚籽',raw:'生',kcal:486,c:42.1,p:16.5,f:30.7,fiber:34.4},
  {cat:'fat',name:'无糖花生酱',raw:'即食',kcal:598,c:20.0,p:25.0,f:50.0,fiber:6.0},
  // 即食类
  {cat:'instant',name:'全麦吐司',raw:'即食',kcal:240,c:41.0,p:13.0,f:3.0,fiber:5.0},
  {cat:'instant',name:'白吐司',raw:'即食',kcal:265,c:49.7,p:9.0,f:3.2,fiber:2.4},
  {cat:'instant',name:'低脂苏打饼干',raw:'即食',kcal:408,c:70.0,p:8.0,f:10.0,fiber:2.0},
  {cat:'instant',name:'即食鸡胸肉',raw:'即食',kcal:110,c:0,p:23.0,f:1.5,fiber:0},
  {cat:'instant',name:'鸡胸肉肠',raw:'即食',kcal:120,c:2.0,p:15.0,f:5.0,fiber:0},
  {cat:'instant',name:'卤蛋',raw:'即食',kcal:143,c:0.7,p:12.6,f:9.9,fiber:0},
  {cat:'instant',name:'五香豆干',raw:'即食',kcal:140,c:4.5,p:16.0,f:7.0,fiber:1.0},
  // 植物蛋白 / 蛋奶
  {cat:'plant_protein',name:'鸡蛋(整蛋)',raw:'生',kcal:143,c:0.7,p:12.6,f:9.9,fiber:0},
  {cat:'plant_protein',name:'鸡蛋清',raw:'生',kcal:60,c:0.1,p:11.6,f:0.1,fiber:0},
  {cat:'plant_protein',name:'低脂纯牛奶',raw:'即食',kcal:43,c:5.0,p:3.2,f:1.5,fiber:0},
  {cat:'plant_protein',name:'低脂无糖酸奶',raw:'即食',kcal:72,c:9.3,p:3.5,f:1.2,fiber:0},
  {cat:'plant_protein',name:'嫩豆腐(南豆腐)',raw:'即食',kcal:57,c:2.6,p:6.2,f:3.7,fiber:0.5},
  {cat:'plant_protein',name:'老豆腐(北豆腐)',raw:'即食',kcal:76,c:3.0,p:8.5,f:4.8,fiber:0.6},
  {cat:'plant_protein',name:'豆腐丝(干)',raw:'即食',kcal:201,c:18.8,p:21.6,f:10.5,fiber:1.0},
  {cat:'plant_protein',name:'鹰嘴豆(水煮)',raw:'熟',kcal:164,c:27.4,p:8.9,f:2.7,fiber:7.6},
  {cat:'plant_protein',name:'毛豆(水煮)',raw:'熟',kcal:123,c:10.5,p:13.1,f:5.0,fiber:4.0},
  {cat:'plant_protein',name:'无糖豆浆',raw:'即食',kcal:16,c:1.1,p:1.8,f:0.7,fiber:0.2},
  {cat:'plant_protein',name:'豆干',raw:'熟',kcal:140,c:4.5,p:16.0,f:7.0,fiber:1.0},
  {cat:'plant_protein',name:'腐竹(干)',raw:'即食',kcal:459,c:22.3,p:44.6,f:21.8,fiber:1.0},
  // 瘦肉蛋白
  {cat:'meat',name:'鸡胸肉',raw:'生',kcal:118,c:2.5,p:20.8,f:2.9,fiber:0},
  {cat:'meat',name:'瘦牛肉(牛里脊)',raw:'生',kcal:106,c:0,p:20.2,f:2.3,fiber:0},
  {cat:'meat',name:'瘦猪肉(猪里脊)',raw:'生',kcal:110,c:0,p:20.3,f:2.4,fiber:0},
  {cat:'meat',name:'龙利鱼',raw:'生',kcal:88,c:0,p:19.8,f:0.8,fiber:0},
  {cat:'meat',name:'巴沙鱼',raw:'生',kcal:115,c:0,p:23.8,f:1.1,fiber:0},
  {cat:'meat',name:'三文鱼',raw:'生',kcal:142,c:0,p:20.4,f:7.1,fiber:0},
  {cat:'meat',name:'鲈鱼',raw:'生',kcal:105,c:0,p:18.6,f:3.4,fiber:0},
  {cat:'meat',name:'青虾',raw:'生',kcal:80,c:0,p:18.3,f:0.6,fiber:0},
  {cat:'meat',name:'去皮鸡腿肉',raw:'生',kcal:135,c:0,p:22.4,f:5.0,fiber:0},
  {cat:'meat',name:'去皮鸭胸肉',raw:'生',kcal:100,c:0,p:19.7,f:1.5,fiber:0},
  {cat:'meat',name:'牛腱子肉',raw:'生',kcal:96,c:0,p:21.4,f:1.6,fiber:0},
  {cat:'meat',name:'鳕鱼',raw:'生',kcal:82,c:0,p:17.5,f:0.9,fiber:0},
  {cat:'meat',name:'鸡胸肉(水煮)',raw:'熟',kcal:165,c:0,p:31.0,f:3.6,fiber:0},
  {cat:'meat',name:'瘦牛肉(清炖)',raw:'熟',kcal:250,c:0,p:28.0,f:15.0,fiber:0},
  {cat:'meat',name:'瘦猪肉(清炖)',raw:'熟',kcal:242,c:0,p:29.0,f:13.0,fiber:0},
  {cat:'meat',name:'龙利鱼(清蒸)',raw:'熟',kcal:105,c:0,p:23.6,f:1.0,fiber:0},
  {cat:'meat',name:'巴沙鱼(清蒸)',raw:'熟',kcal:138,c:0,p:28.6,f:1.3,fiber:0},
  {cat:'meat',name:'三文鱼(煎)',raw:'熟',kcal:208,c:0,p:29.7,f:10.4,fiber:0},
  {cat:'meat',name:'鲈鱼(清蒸)',raw:'熟',kcal:126,c:0,p:22.3,f:4.1,fiber:0},
  {cat:'meat',name:'虾(白灼)',raw:'熟',kcal:99,c:0,p:22.6,f:0.7,fiber:0},
  {cat:'meat',name:'香肠(猪肉肠)',raw:'熟',kcal:310,c:2.0,p:11.0,f:28.0,fiber:0,bad:true},
  {cat:'meat',name:'火腿肠(鸡肉肠)',raw:'熟',kcal:217,c:11.2,p:10.5,f:16.0,fiber:0,bad:true},
  {cat:'meat',name:'午餐肉',raw:'熟',kcal:335,c:1.5,p:9.4,f:31.5,fiber:0,bad:true},
  {cat:'meat',name:'水浸金枪鱼罐头',raw:'熟',kcal:116,c:0,p:26.0,f:0.8,fiber:0},
];
