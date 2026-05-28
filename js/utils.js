// ════════════════════════════════════════════
// UTILS — DOM + Datum + Mahlzeit-Helfer
// ════════════════════════════════════════════
function val(id){const e=document.getElementById(id);return e?e.value:'';}
function setVal(id,v){const e=document.getElementById(id);if(e&&v!==undefined&&v!=='')e.value=v;}

function getTodayKey(){return new Date().toISOString().slice(0,10);}
function getDateKey(offset){const d=new Date();d.setDate(d.getDate()+(offset||0));return d.toISOString().slice(0,10);}
function formatDateLabel(offset){if(offset===0)return'Heute';if(offset===-1)return'Gestern';const d=new Date();d.setDate(d.getDate()+offset);return d.toLocaleDateString('de-DE',{weekday:'short',day:'numeric',month:'short'});}

function getDay(dk){if(!dailyData[dk])dailyData[dk]={water:0,meals:[],burned:0,mood:null,sleepHours:null};return dailyData[dk];}

function normalizeMeal(m){
  if(typeof m==='number')return{name:'Mahlzeit',kcal:parseInt(m)||0,protein:0,carbs:0,fat:0};
  if(!m||typeof m!=='object')return{name:'?',kcal:0,protein:0,carbs:0,fat:0};
  return{
    name:m.name||'Mahlzeit',
    kcal:parseInt(m.kcal)||0,
    protein:parseInt(m.protein)||0,
    carbs:parseInt(m.carbs)||0,
    fat:parseInt(m.fat)||0,
  };
}
function getDayMeals(dk){return(getDay(dk).meals||[]).map(normalizeMeal);}
function getDayKcal(dk){return getDayMeals(dk).reduce((a,m)=>a+m.kcal,0);}

// ════════════════════════════════════════════
// TRAINING STATS
// ════════════════════════════════════════════
function getTrainingStreak(){
  let streak=0;
  for(let i=0;i>=-365;i--){
    const dk=getDateKey(i);
    const d=logData[dk];
    const trained=d?.exercises?.some(ex=>ex.sets?.some(s=>s.kg||s.reps));
    if(trained)streak++;
    else if(i<0)break;
  }
  return streak;
}

function getWeekTrainingDays(){
  let count=0;
  for(let i=-6;i<=0;i++){
    const dk=getDateKey(i);
    const d=logData[dk];
    if(d?.exercises?.some(ex=>ex.sets?.some(s=>s.kg||s.reps)))count++;
  }
  return count;
}

function getBestLiftThisWeek(){
  let best={name:null,kg:0};
  for(let i=-6;i<=0;i++){
    const d=logData[getDateKey(i)];
    if(!d)continue;
    d.exercises.forEach(ex=>{
      const maxKg=ex.sets.length?Math.max(...ex.sets.map(s=>parseFloat(s.kg)||0)):0;
      if(maxKg>best.kg)best={name:ex.name,kg:maxKg};
    });
  }
  return best;
}

// ════════════════════════════════════════════
// NUTRITION STATS
// ════════════════════════════════════════════
function proteinGoalReached(){
  const c=computeAll();
  const target=c.protein;
  const meals=getDayMeals(getTodayKey());
  const eaten=meals.reduce((a,m)=>a+(m.protein||0),0);
  return{eaten,target,reached:eaten>=target*0.9};
}

// ════════════════════════════════════════════
// MOOD + SLEEP MANUAL ENTRY
// ════════════════════════════════════════════
function saveMood(stars){
  const dk=getTodayKey();
  if(!dailyData[dk])dailyData[dk]={water:0,meals:[],burned:0,mood:null,sleepHours:null};
  dailyData[dk].mood=stars;
  saveDaily();
  renderDashboard();
}

function saveSleepHours(h){
  const dk=getTodayKey();
  if(!dailyData[dk])dailyData[dk]={water:0,meals:[],burned:0,mood:null,sleepHours:null};
  dailyData[dk].sleepHours=parseFloat(h)||null;
  saveDaily();
  renderDashboard();
}

function getWaterGoal(){
  const base=Math.round((parseFloat(val('p-weight'))||80)*35);
  return Math.max(2000,Math.min(4000,base));
}
