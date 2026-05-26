// ════════════════════════════════════════════
// DASHBOARD
// ════════════════════════════════════════════
function renderDashboard(){
  const c=computeAll();
  const dk=getTodayKey();
  const day=getDay(dk);
  const todayIdx=(new Date().getDay()+6)%7;
  const hour=new Date().getHours();
  document.getElementById('dash-greet').textContent=(hour<11?'Guten Morgen':hour<18?'Guten Tag':'Guten Abend')+' — '+daysFull[todayIdx];

  let trainLabel,trainSub;
  if(trainingMode==='advanced'&&customPlan){
    trainLabel=customPlan[todayIdx]?customPlan[todayIdx].title:'Eigener Plan';
    trainSub='Dein eigener Trainingsplan';
  } else {
    const plan=weekPlanState||getWeekPlan(c.recovery);
    const wt=plan[todayIdx];
    const wp=workoutPlans[wt]||workoutPlans.rest;
    trainLabel=wt==='rest'?'Ruhetag':wt==='recovery'?'Aktive Erholung':wp.label;
    trainSub=wt==='rest'?'Heute regenerieren':wt==='recovery'?'Leichte Bewegung':c.recovery>=75?'Schwere Session — Push it!':'Moderate Session — kontrollierte Intensität';
  }
  document.getElementById('dash-training').textContent=trainLabel;
  document.getElementById('dash-training-sub').textContent=trainSub;

  const dxs={sleep:c.s.sleep+' / 10',hrv:c.s.hrv+' ms',rhr:c.s.rhr+' bpm',steps:c.s.steps.toLocaleString('de-DE'),stress:c.s.stress+' / 10'};
  Object.entries(dxs).forEach(([k,v])=>{const el=document.getElementById('dx-'+k);if(el)el.textContent=v;});
  if(document.getElementById('dh-rhr'))document.getElementById('dh-rhr').textContent=c.s.rhr+' bpm';
  if(document.getElementById('dh-hrv'))document.getElementById('dh-hrv').textContent=c.s.hrv+' ms';

  const meals=getDayMeals(dk);
  const eaten=meals.reduce((a,m)=>a+m.kcal,0);
  const burned=parseInt(day.burned)||0;
  const remain=Math.round(c.goalKcal-eaten);
  document.getElementById('k-goal').textContent=c.goalKcal.toLocaleString('de-DE');
  document.getElementById('k-eaten').textContent=eaten.toLocaleString('de-DE');
  document.getElementById('k-burned').textContent=burned>0?burned.toLocaleString('de-DE'):'—';
  document.getElementById('k-remain').textContent=remain.toLocaleString('de-DE');
  document.getElementById('k-remain').style.color=remain<0?'var(--danger)':'var(--info)';
  const eatenPct=Math.min(100,Math.round(eaten/c.goalKcal*100));
  document.getElementById('kcal-bar').innerHTML=`<div style="flex:${eatenPct};background:${eaten>c.goalKcal?'var(--danger)':'var(--accent)'};border-radius:6px 0 0 6px;min-width:2px;"></div><div style="flex:${100-eatenPct};background:var(--border);border-radius:0 6px 6px 0;"></div>`;

  renderWater();
  renderWeightTrend();

  const plan=trainingMode==='advanced'&&customPlan?customPlan.map(d=>d.title.split(' ')[0]):(weekPlanState||getWeekPlan(c.recovery)).map(wt=>(workoutPlans[wt]||workoutPlans.rest).short);
  document.getElementById('week-mini').innerHTML=plan.map((label,i)=>{
    const isT=i===todayIdx;
    return`<div class="day-mini-cell" style="${isT?'border-color:var(--accent);':''}"><div style="font-size:9px;color:var(--muted);font-family:'DM Mono',monospace;">${daysShort[i]}</div><div style="font-size:10px;font-weight:600;margin-top:3px;">${label}</div></div>`;
  }).join('');

  let aiMsg='';
  if(c.recovery>=75) aiMsg=`<strong>Recovery ${c.recovery}/100 — Top.</strong> Heute ist ${trainLabel} optimal. Kalorienziel ${c.goalKcal.toLocaleString('de-DE')} kcal. Noch ${remain.toLocaleString('de-DE')} kcal verfügbar.`;
  else if(c.recovery>=50) aiMsg=`<strong>Recovery ${c.recovery}/100 — Moderat.</strong> Session auf 80% Intensität. Kalorienziel ${c.goalKcal.toLocaleString('de-DE')} kcal.`;
  else aiMsg=`<strong>Recovery ${c.recovery}/100 — Kritisch.</strong> Heute Erholung statt schwerem Training. Kalorien auf Erhalt angepasst.`;
  document.getElementById('ai-recommendation').innerHTML=aiMsg;
}

// ════════════════════════════════════════════
// WASSER
// ════════════════════════════════════════════
function renderWater(){
  const dk=getTodayKey();const day=getDay(dk);const goal=getWaterGoal();
  const glasses=Math.round(goal/200);const filled=Math.round(day.water/200);
  document.getElementById('water-amount').textContent=(day.water/1000).toFixed(1).replace('.',',')+' L';
  document.getElementById('water-goal-lbl').textContent='/ '+(goal/1000).toFixed(1).replace('.',',')+' L';
  let html='';for(let i=0;i<glasses;i++)html+=`<div class="water-glass${i<filled?' filled':''}"></div>`;
  document.getElementById('water-glasses').innerHTML=html;
}
function addWater(ml){
  const dk=getTodayKey();const day=getDay(dk);
  day.water=Math.max(0,day.water+ml);saveDaily();renderWater();
}

// ════════════════════════════════════════════
// DELOAD BANNER (Dashboard-Slot)
// ════════════════════════════════════════════
function getDeloadWeeks(){return Math.floor((Date.now()-(appState.deloadStart||Date.now()))/(7*24*60*60*1000));}
function renderDeloadBanner(){
  const weeks=getDeloadWeeks();const slot=document.getElementById('deload-banner-slot');
  if(weeks>=6){
    const urgent=weeks>=8;
    slot.innerHTML=`<div class="deload-banner ${urgent?'urgent':''}"><div class="deload-icon">${urgent?'🛑':'⏰'}</div><div style="flex:1;"><div style="font-size:13px;font-weight:600;">${urgent?'Deload überfällig!':'Deload-Woche empfohlen'}</div><div style="font-size:12px;color:var(--text2);margin-top:2px;">Du trainierst seit ${weeks} Wochen ohne Deload. ${urgent?'ZNS dringend entlasten.':'−40% Volumen diese Woche.'}</div></div></div>`;
  }else slot.innerHTML='';
}

// ════════════════════════════════════════════
// UPDATE ALL
// ════════════════════════════════════════════
function updateAll(){
  const c=computeAll();
  if(document.getElementById('sleep-val')){
    document.getElementById('sleep-val').textContent=c.s.sleep+'/10';
    document.getElementById('hrv-val').textContent=c.s.hrv+' ms';
    document.getElementById('rhr-val').textContent=c.s.rhr+' bpm';
    document.getElementById('steps-val').textContent=c.s.steps.toLocaleString('de-DE');
    document.getElementById('stress-val').textContent=c.s.stress+'/10';
  }
  const circ=226,offset=circ-(circ*c.recovery/100);
  const rc=document.getElementById('recovery-circle');
  if(rc){
    rc.setAttribute('stroke-dashoffset',Math.round(offset));
    const rColor=c.recovery>=75?'#00E5A0':c.recovery>=50?'#FFAD33':'#FF5757';
    rc.setAttribute('stroke',rColor);
    document.getElementById('recovery-score').textContent=c.recovery;
    document.getElementById('recovery-score').style.color=rColor;
    document.getElementById('recovery-badge').innerHTML=c.recovery>=75?'<span class="badge badge-green">Optimal</span>':c.recovery>=50?'<span class="badge badge-yellow">Moderat</span>':'<span class="badge badge-red">Kritisch</span>';
  }
  let healthTxt,healthSub,healthColor;
  if(c.s.rhr<=60&&c.s.hrv>=50){healthTxt='Sehr gut';healthSub='Top Erholung';healthColor='var(--accent)';}
  else if(c.s.rhr<=70&&c.s.hrv>=40){healthTxt='Gut';healthSub='stabil';healthColor='var(--accent)';}
  else if(c.s.rhr<=78){healthTxt='Mäßig';healthSub='leicht belastet';healthColor='var(--warn)';}
  else{healthTxt='Achtung';healthSub='Puls erhöht';healthColor='var(--danger)';}
  const hv=document.getElementById('health-val');
  if(hv){hv.textContent=healthTxt;hv.style.color=healthColor;document.getElementById('health-sub').textContent=healthSub;}

  renderDashboard();
  renderNutrition();
  renderSupps(c.protein);
  if(typeof renderWeeklyReview==='function')renderWeeklyReview();
  renderWeekTab(c.recovery);

  if(document.getElementById('rmr-breakdown')){
    document.getElementById('rmr-breakdown').innerHTML=`
      <div class="stat-row"><span class="sr-label">Formel</span><span class="sr-val">Mifflin-St. Jeor</span></div>
      <div class="stat-row"><span class="sr-label">${c.p.weight}kg × 10</span><span class="sr-val">${c.p.weight*10}</span></div>
      <div class="stat-row"><span class="sr-label">${c.p.height}cm × 6.25</span><span class="sr-val">+${Math.round(c.p.height*6.25)}</span></div>
      <div class="stat-row"><span class="sr-label">${c.p.age}J × 5</span><span class="sr-val">−${c.p.age*5}</span></div>
      <div class="stat-row"><span class="sr-label">Geschlecht</span><span class="sr-val">${c.p.gender==='m'?'+5':'−161'}</span></div>
      <div class="stat-row"><span class="sr-label" style="color:var(--text);font-weight:600;">Grundumsatz</span><span class="sr-val" style="color:var(--accent);">${c.rmr} kcal</span></div>`;
  }

  renderDeloadBanner();
  saveAll();
}
