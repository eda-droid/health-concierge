// ════════════════════════════════════════════
// COMPUTE — Berechnungen: RMR, Recovery-Score, Wochenplan, TDEE & Makro-Ziele
// Reine Funktionen, keine onclick-Funktionen
// ════════════════════════════════════════════
function getProfile(){return{weight:parseFloat(val('p-weight'))||80,height:parseFloat(val('p-height'))||178,age:parseFloat(val('p-age'))||25,gender:val('p-gender')||'m'};}
function calcRMR(p){return p.gender==='m'?Math.round(10*p.weight+6.25*p.height-5*p.age+5):Math.round(10*p.weight+6.25*p.height-5*p.age-161);}
function getStatus(){return{sleep:parseInt(val('sleep'))||7,hrv:parseInt(val('hrv'))||55,rhr:parseInt(val('rhr'))||58,steps:parseInt(val('steps'))||8000,stress:parseInt(val('stress'))||4};}

// Gewichtung basierend auf Forschungsdaten: Schlaf 35%, HRV 30%, Stress 20%, Schritte 8%, RHR 7%
function calcRecovery(s){
  let r=0;
  r+=(s.sleep/10)*35;
  r+=((s.hrv-20)/180)*30;
  r+=Math.max(0,(10-s.stress)/10)*20;
  r+=Math.min(1,s.steps/10000)*8;
  r+=Math.max(0,(90-s.rhr)/50)*7;
  return Math.max(0,Math.min(100,Math.round(r)));
}

function getWeekPlan(r){
  if(r>=75)return['heavy_push','heavy_pull','rest','legs','shoulders','rest','heavy_pull'];
  if(r>=50)return['heavy_pull','shoulders','rest','heavy_push','recovery','rest','legs'];
  return['recovery','rest','recovery','rest','recovery','rest','rest'];
}
function getGoalKcal(tdee){return currentGoal==='bulk'?tdee+300:currentGoal==='cut'?tdee-400:tdee;}
function getGoalColor(){return currentGoal==='bulk'?'var(--accent)':currentGoal==='cut'?'var(--danger)':'var(--info)';}
function getGoalLabel(){return currentGoal==='bulk'?'kcal Bulk':currentGoal==='cut'?'kcal Cut':'kcal Erhalt';}

// Schätzt Trainingskalorien aus dem Log: kcal pro abgeschlossenem Satz je nach Session-Typ
function _estimateTrainingKcal(dk){
  const dayLog=logData[dk];if(!dayLog||!dayLog.exercises)return 0;
  let totalSets=0;
  dayLog.exercises.forEach(ex=>{
    (ex.sets||[]).forEach(s=>{if(isWorkSet(s))totalSets++;});
  });
  if(totalSets===0)return 0;
  const planDay=dayLog.planDay||'';
  let kcalPerSet=9;
  if(['heavy_push','heavy_pull','legs'].includes(planDay))kcalPerSet=12;
  else if(planDay==='shoulders')kcalPerSet=8;
  else if(planDay==='recovery')kcalPerSet=5;
  return Math.min(600,Math.max(50,totalSets*kcalPerSet));
}

function computeAll(){
  const s=getStatus(),p=getProfile();
  const recovery=calcRecovery(s);
  const rmr=calcRMR(p);
  const neat=Math.round(s.steps*0.038);

  const today=getTodayKey();
  const day=getDay(today);
  let activityKcal=0,activitySource='none';
  if(lastHealthImportDate===today&&(day.burned||0)>0){
    activityKcal=day.burned;
    activitySource='watch';
  } else {
    const todayLog=logData[today];
    const hasLoggedSets=todayLog&&todayLog.exercises&&
      todayLog.exercises.some(ex=>(ex.sets||[]).some(isWorkSet));
    if(hasLoggedSets){
      activityKcal=_estimateTrainingKcal(today);
      activitySource='training-log';
    }
  }

  // NEAT fließt nur in TDEE ein wenn kein Watch-Import — Watch Active Energy deckt Schritte ab
  const neatInTdee=activitySource!=='watch';
  const tdeeBase=neatInTdee?rmr+neat+activityKcal:rmr+activityKcal;
  const tef=Math.round(tdeeBase*0.10);
  const tdee=tdeeBase+tef;
  const isTrainingDay=activitySource!=='none';

  const rawGoal=getGoalKcal(tdee);
  const goalKcal=Math.max(1200,Math.min(6000,rawGoal));
  const protPerKg=currentGoal==='cut'?2.3:2.1;
  const protein=Math.round(p.weight*protPerKg);
  const fat=Math.round(p.weight*(currentGoal==='cut'?0.8:0.9));
  const carbs=Math.max(0,Math.round((goalKcal-protein*4-fat*9)/4));
  return{s,p,recovery,rmr,neat,neatInTdee,activityKcal,activitySource,tef,tdee,goalKcal,protein,fat,carbs,isTrainingDay};
}
