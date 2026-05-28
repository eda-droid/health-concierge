// ════════════════════════════════════════════
// STATE
// ════════════════════════════════════════════
let watchAvailable=false;
let stagesAvailable=false;

let currentGoal='bulk';
let logDateOffset=0;
let painMap={};
let slidersLocked=false;
let trainingMode='beginner';
let vitdOpen=true;
let weekPlanState=null;
let logPlanDay=null;
let vitdComputed=null;
let lastHealthImportDate=null;
let lastHealthImportValues=null;
let healthEnergyUnit='kcal';
let editingMeasureDate=null;
let measureHistoryFilter='30d';
let measureHistoryShown=5;
let mealTemplates=lsGet('hc_meal_templates',null);
let editingTemplateIdx=null;
let globalUIMode=lsGet('vitale_ui_mode','beginner');

// Safe localStorage
function lsGet(k,def){try{const v=localStorage.getItem(k);return v?JSON.parse(v):def;}catch(e){return def;}}
function lsSet(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){console.warn('Storage full');}}

let logData=lsGet('hc_log',{});
let prData=lsGet('hc_pr',{});
let measureData=lsGet('hc_measure',[]);
let appState=lsGet('hc_state',{});
let customPlan=lsGet('hc_customplan',null);
let dailyData=lsGet('hc_daily',{});
