// ════════════════════════════════════════════
// PERSISTENCE
// ════════════════════════════════════════════
function saveLog(){lsSet('hc_log',logData);lsSet('hc_pr',prData);}
function saveMeasureData(){lsSet('hc_measure',measureData);}
function saveCustomPlan(){lsSet('hc_customplan',customPlan);}
function saveDaily(){
  // Ensure mood + sleepHours exist on every entry (backward compat)
  Object.values(dailyData).forEach(d=>{
    if(d.mood===undefined)d.mood=null;
    if(d.sleepHours===undefined)d.sleepHours=null;
  });
  lsSet('hc_daily',dailyData);
}
function saveMealTemplates(){lsSet('hc_meal_templates',mealTemplates);}

function saveAll(){
  appState={
    goal:currentGoal,slidersLocked,trainingMode,
    sleep:val('sleep'),hrv:val('hrv'),rhr:val('rhr'),steps:val('steps'),stress:val('stress'),
    weight:val('p-weight'),height:val('p-height'),age:val('p-age'),gender:val('p-gender'),
    vd_skin:val('vd-skin'),vd_sun:val('vd-sun'),vd_season:val('vd-season'),vd_level:val('vd-level'),
    m_neck:val('m-neck'),m_waist:val('m-waist'),m_hip:val('m-hip'),
    m_chest:val('m-chest'),m_arm:val('m-arm'),m_thigh:val('m-thigh'),
    askBeforeChange:document.getElementById('ask-before-change').checked,
    painMap,deloadStart:appState.deloadStart||Date.now(),
    lastHealthImportDate,lastHealthImportValues,healthEnergyUnit,
    vitdComputed,vitdOpen,
  };
  lsSet('hc_state',appState);
}

function loadState(){
  if(!appState||!Object.keys(appState).length){appState={deloadStart:Date.now()};lsSet('hc_state',appState);setTimeout(()=>{if(typeof showToast==='function')showToast('Deload-Daten zurückgesetzt – Timer startet neu.');},800);return;}
  currentGoal=appState.goal||'bulk';
  slidersLocked=appState.slidersLocked||false;
  trainingMode=appState.trainingMode||'beginner';
  vitdComputed=appState.vitdComputed||null;
  vitdOpen=appState.vitdOpen!==undefined?appState.vitdOpen:true;
  lastHealthImportDate=appState.lastHealthImportDate||null;
  lastHealthImportValues=appState.lastHealthImportValues||null;
  healthEnergyUnit=appState.healthEnergyUnit||'kcal';
  ['sleep','hrv','rhr','steps','stress'].forEach(k=>setVal(k,appState[k]));
  setVal('p-weight',appState.weight);setVal('p-height',appState.height);setVal('p-age',appState.age);setVal('p-gender',appState.gender);
  ['vd-skin','vd-sun','vd-season','vd-level'].forEach(k=>setVal(k,appState[k.replace('-','_')]));
  setVal('m-neck',appState.m_neck);setVal('m-waist',appState.m_waist);setVal('m-hip',appState.m_hip);
  setVal('m-chest',appState.m_chest);setVal('m-arm',appState.m_arm);setVal('m-thigh',appState.m_thigh);
  if(appState.askBeforeChange===false)document.getElementById('ask-before-change').checked=false;
  painMap=appState.painMap||{};
  ['bulk','maintain','cut'].forEach(x=>{const btn=document.getElementById('goal-'+x);if(btn)btn.className='goal-btn'+(x===currentGoal?' active-'+x:'');});
  applyLockState();applyTrainingModeUI();
  // Derive watch/stages availability from loaded import state
  watchAvailable=(lastHealthImportDate!==null);
  stagesAvailable=!!(lastHealthImportValues?.sleepStages);
  // Backward compat: null-fill missing mood/sleepHours in loaded daily entries
  Object.values(dailyData).forEach(d=>{
    if(d.mood===undefined)d.mood=null;
    if(d.sleepHours===undefined)d.sleepHours=null;
  });
}
