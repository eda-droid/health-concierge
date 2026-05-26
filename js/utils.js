// ════════════════════════════════════════════
// UTILS — DOM + Datum + Mahlzeit-Helfer
// ════════════════════════════════════════════
function val(id){const e=document.getElementById(id);return e?e.value:'';}
function setVal(id,v){const e=document.getElementById(id);if(e&&v!==undefined&&v!=='')e.value=v;}

function getTodayKey(){return new Date().toISOString().slice(0,10);}
function getDateKey(offset){const d=new Date();d.setDate(d.getDate()+(offset||0));return d.toISOString().slice(0,10);}
function formatDateLabel(offset){if(offset===0)return'Heute';if(offset===-1)return'Gestern';const d=new Date();d.setDate(d.getDate()+offset);return d.toLocaleDateString('de-DE',{weekday:'short',day:'numeric',month:'short'});}

function getDay(dk){if(!dailyData[dk])dailyData[dk]={water:0,meals:[],burned:0};return dailyData[dk];}

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

function getWaterGoal(){
  const base=Math.round((parseFloat(val('p-weight'))||80)*35);
  return Math.max(2000,Math.min(4000,base));
}
