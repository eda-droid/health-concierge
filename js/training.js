// ════════════════════════════════════════════
// TRAINING MODE
// ════════════════════════════════════════════
function setTrainingMode(mode){
  if(mode==='advanced'&&!customPlan){
    customPlan=getWeekPlan(75).map(wt=>{const wp=workoutPlans[wt];return{title:wp.label,ex:wp.ex.map(e=>({name:e[0],scheme:e[2]}))};});
    saveCustomPlan();
  }
  trainingMode=mode;applyTrainingModeUI();saveAll();renderWeekTab();
}
function applyTrainingModeUI(){
  const mb=document.getElementById('mode-beginner'),ma=document.getElementById('mode-advanced');
  if(mb){
    mb.classList.toggle('active',trainingMode==='beginner');
    ma.classList.toggle('active',trainingMode==='advanced');
    document.getElementById('mode-desc').innerHTML=trainingMode==='beginner'
      ?'Im Einsteiger-Modus erstellt die KI automatisch einen Push/Pull/Legs-Plan basierend auf deiner Recovery.'
      :'Im Fortgeschritten-Modus kannst du jeden Tag individuell anpassen — Übungen, Sätze, Reps.';
  }
}

// ════════════════════════════════════════════
// WEEK PLAN
// ════════════════════════════════════════════
function renderWeekTab(recoveryOverride){
  const el=document.getElementById('week-grid');if(!el)return;
  const c=computeAll();
  const recovery=recoveryOverride!==undefined?recoveryOverride:c.recovery;
  if(trainingMode==='advanced'&&customPlan){renderCustomWeekGrid();return;}
  const plan=getWeekPlan(recovery);
  const todayIdx=(new Date().getDay()+6)%7;
  el.innerHTML=plan.map((wt,i)=>{
    const wp=workoutPlans[wt]||workoutPlans.rest;
    const isT=i===todayIdx;
    const blocked=getBlockedExercises();
    const hasBlock=wp.ex.some(e=>blocked.includes(e[0]));
    return`<div class="day-card${isT?' today-card':''}" onclick="showDayDetail(${i},'${wt}')">
      <div class="day-name">${daysShort[i]}</div>
      <div class="day-type" style="color:${wt==='rest'?'var(--muted)':wt==='recovery'?'var(--warn)':'var(--accent)'}">${wp.short}</div>
      ${hasBlock?'<div style="font-size:9px;color:var(--danger);">⚠</div>':''}
    </div>`;
  }).join('');

  const ws=document.getElementById('week-status');
  if(ws)ws.innerHTML=recovery>=75?`<strong>Optimale Woche.</strong> 5 Trainingseinheiten geplant.`:recovery>=50?`<strong>Moderate Woche.</strong> 4 Einheiten, kürzere Sessions.`:`<strong>Erholungswoche.</strong> 2–3 leichte Einheiten.`;
}
function showDayDetail(i,wt){
  document.querySelectorAll('#week-grid .day-card').forEach((c,j)=>c.classList.toggle('today-card',j===i));
  const wp=workoutPlans[wt]||workoutPlans.rest;
  const blocked=getBlockedExercises();
  let rows='';
  if(wp.ex.length){
    rows=`<table class="workout-table">${wp.ex.map(e=>{const isBlocked=blocked.includes(e[0]);return`<tr style="${isBlocked?'opacity:.4;text-decoration:line-through;':''}">`+`<td>${e[0]}${isBlocked?' ⚠':''}</td><td>${e[1]}</td><td>${e[2]}</td></tr>`;}).join('')}</table>`;
  } else{rows='<p style="font-size:13px;color:var(--muted);">Heute: Aktive Regeneration oder Ruhetag.</p>';}
  document.getElementById('selected-workout').innerHTML=`<div class="card-label" style="margin-bottom:12px;">${daysFull[i]} — ${wp.label}</div>${rows}${blocked.length?`<p style="font-size:11px;color:var(--danger);margin-top:10px;">⚠ Gesperrt wegen Schmerzen: ${blocked.join(', ')}</p>`:''}`;
}
function renderCustomWeekGrid(){
  const todayIdx=(new Date().getDay()+6)%7;
  document.getElementById('week-grid').innerHTML=customPlan.map((day,i)=>{
    const isT=i===todayIdx;
    return`<div class="day-card${isT?' today-card':''}" onclick="editCustomDay(${i})"><div class="day-name">${daysShort[i]}</div><div class="day-type">${day.title.split(' ').slice(0,2).join(' ')}</div><span class="badge badge-blue" style="font-size:8px;padding:2px 4px;">Eigen</span></div>`;
  }).join('');
}
function editCustomDay(dayIdx){
  document.querySelectorAll('#week-grid .day-card').forEach((c,i)=>c.classList.toggle('today-card',i===dayIdx));
  const day=customPlan[dayIdx];const blocked=getBlockedExercises();
  let rows=day.ex.map((e,ei)=>`<div class="custom-ex-row">
    <input class="log-input" style="text-align:left;font-family:'DM Sans',sans-serif;font-size:13px;" value="${e.name}" onblur="updateCustomEx(${dayIdx},${ei},'name',this.value)" placeholder="Übung">
    <input class="log-input" style="font-size:12px;" value="${e.scheme||''}" onblur="updateCustomEx(${dayIdx},${ei},'scheme',this.value)" placeholder="4×8">
    <button class="del-btn" onclick="removeCustomEx(${dayIdx},${ei})">✕</button>
  </div>`).join('');
  document.getElementById('selected-workout').innerHTML=`
    <div class="card-label" style="margin-bottom:12px;">${daysFull[dayIdx]} — Eigener Plan</div>
    <div class="form-group" style="margin-bottom:14px;"><label>TAG-NAME / FOKUS</label><input id="custom-day-title" value="${day.title}" onblur="updateCustomDayTitle(${dayIdx},this.value)"></div>
    <div style="display:grid;grid-template-columns:1fr 90px 28px;gap:7px;margin-bottom:6px;"><span class="log-col-label" style="text-align:left;">Übung</span><span class="log-col-label">Sätze×Reps</span><span></span></div>
    ${rows}
    <button class="btn-dashed" onclick="addCustomEx(${dayIdx})" style="margin-top:8px;">+ Übung hinzufügen</button>
    ${blocked.length?`<p style="font-size:11px;color:var(--danger);margin-top:12px;">⚠ Schmerz-Bypass: ${blocked.join(', ')}</p>`:''}`;
}
function updateCustomEx(d,e,field,v){customPlan[d].ex[e][field]=v;saveCustomPlan();}
function updateCustomDayTitle(d,v){customPlan[d].title=v;saveCustomPlan();renderCustomWeekGrid();}
function addCustomEx(d){customPlan[d].ex.push({name:'',scheme:''});saveCustomPlan();editCustomDay(d);}
function removeCustomEx(d,e){customPlan[d].ex.splice(e,1);saveCustomPlan();editCustomDay(d);}

// ════════════════════════════════════════════
// TRAININGS-LOG
// ════════════════════════════════════════════
function changeLogDate(dir){logDateOffset+=dir;if(logDateOffset>0)logDateOffset=0;logPlanDay=null;renderLog();}
function getPlanDayOptions(){
  if(trainingMode==='advanced'&&customPlan)return customPlan.map((d,i)=>({key:'c'+i,label:daysShort[i]+' — '+d.title,exercises:d.ex.map(e=>e.name).filter(Boolean)}));
  const plan=weekPlanState||getWeekPlan(75);const seen={};const opts=[];
  plan.forEach((wt,i)=>{if(wt==='rest')return;const wp=workoutPlans[wt];if(seen[wt])return;seen[wt]=1;opts.push({key:wt,label:wp.label,exercises:wp.ex.map(e=>e[0])});});
  return opts;
}
function renderLog(){
  const dk=getDateKey(logDateOffset);
  document.getElementById('log-date-label').textContent=formatDateLabel(logDateOffset);
  if(!logData[dk])logData[dk]={exercises:[],planDay:null};
  const opts=getPlanDayOptions();
  const todayIdx=(new Date().getDay()+6)%7;
  let suggested;
  if(trainingMode==='advanced'&&customPlan)suggested='c'+todayIdx;
  else{const plan=weekPlanState||getWeekPlan(75);suggested=plan[todayIdx];if(suggested==='rest')suggested=opts.length?opts[0].key:null;}
  if(logPlanDay===null)logPlanDay=logData[dk].planDay||suggested||(opts.length?opts[0].key:null);
  const sel=document.getElementById('log-day-select');if(!sel)return;
  sel.innerHTML=opts.map(o=>`<option value="${o.key}" ${o.key===logPlanDay?'selected':''}>${o.label}</option>`).join('')+'<option value="__free">Freies Training</option>';
  if(logPlanDay==='__free')sel.value='__free';
  if(logData[dk].exercises.length===0&&logPlanDay!=='__free'){
    const opt=opts.find(o=>o.key===logPlanDay);
    if(opt)logData[dk].exercises=opt.exercises.map(n=>({name:n,sets:[{kg:'',reps:''}],fromPlan:true}));
  }
  logData[dk].planDay=logPlanDay;saveLog();
  renderExercises(dk);bindSetInputs();
  renderWeekSummary();renderStrengthHistory();renderLogFeedback(dk);renderWeekFeedback();
}
function changeLogPlanDay(){
  const dk=getDateKey(logDateOffset);const newKey=document.getElementById('log-day-select').value;
  logPlanDay=newKey;
  const manual=(logData[dk].exercises||[]).filter(e=>!e.fromPlan);
  let planEx=[];
  if(newKey!=='__free'){const opt=getPlanDayOptions().find(o=>o.key===newKey);if(opt)planEx=opt.exercises.map(n=>({name:n,sets:[{kg:'',reps:''}],fromPlan:true}));}
  logData[dk].exercises=planEx.concat(manual);logData[dk].planDay=newKey;saveLog();
  renderExercises(dk);bindSetInputs();
}
function renderExercises(dk){
  const el=document.getElementById('exercise-log-list');if(!el)return;
  el.innerHTML='';
  (logData[dk]?.exercises||[]).forEach((ex,ei)=>{
    const pr=prData[ex.name]||0;const maxKg=Math.max(0,...ex.sets.map(s=>parseFloat(s.kg)||0));
    const isNewPR=maxKg>0&&maxKg>=pr;
    const bestSet=ex.sets.reduce((best,s)=>{const kg=parseFloat(s.kg)||0,reps=parseInt(s.reps)||0;const orm=reps>1?kg*(1+reps/30):kg;return orm>best?orm:best;},0);
    const oneRM=bestSet>0?Math.round(bestSet):'—';
    const div=document.createElement('div');div.className='log-exercise-card';
    div.innerHTML=`
      <div class="log-ex-header">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <span style="font-weight:600;font-size:14px;">${ex.name}</span>
          ${isNewPR&&maxKg>0?'<span class="badge badge-yellow">🏆 PR!</span>':''}
        </div>
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="font-family:'DM Mono',monospace;font-size:10px;color:var(--muted);">PR: ${pr>0?pr+'kg':'—'} · 1RM≈${oneRM}${oneRM!=='—'?'kg':''}</span>
          <button class="del-btn" onclick="removeExercise('${dk}',${ei})">✕</button>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:26px 1fr 1fr 72px 24px;gap:6px;margin-bottom:6px;">
        <span class="log-col-label">#</span><span class="log-col-label">kg</span><span class="log-col-label">Reps</span><span class="log-col-label">Volumen</span><span></span>
      </div>
      <div>${ex.sets.map((set,si)=>renderSetRow(dk,ei,si,set)).join('')}</div>
      <button class="btn-dashed" onclick="addSet('${dk}',${ei})" style="margin-top:6px;padding:7px;">+ Satz</button>`;
    el.appendChild(div);
  });
}
function renderSetRow(dk,ei,si,set){
  const kg=set.kg||'',reps=set.reps||'';
  const vol=kg&&reps?Math.round(parseFloat(kg)*parseInt(reps))+'kg':'—';
  return`<div style="display:grid;grid-template-columns:26px 1fr 1fr 72px 24px;gap:6px;align-items:center;margin-bottom:7px;">
    <span class="log-set-num">${si+1}</span>
    <input class="log-input set-input" type="number" inputmode="decimal" placeholder="kg" value="${kg}" data-dk="${dk}" data-ei="${ei}" data-si="${si}" data-field="kg" min="0" step="0.5">
    <input class="log-input set-input" type="number" inputmode="numeric" placeholder="reps" value="${reps}" data-dk="${dk}" data-ei="${ei}" data-si="${si}" data-field="reps" min="0">
    <span class="log-input" style="cursor:default;color:var(--accent);font-size:11px;">${vol}</span>
    <button class="del-btn" onclick="removeSet('${dk}',${ei},${si})">−</button>
  </div>`;
}
function bindSetInputs(){
  document.querySelectorAll('.set-input').forEach(inp=>{
    inp.addEventListener('change',function(){commitSet(this.dataset.dk,+this.dataset.ei,+this.dataset.si,this.dataset.field,this.value);});
  });
}
function commitSet(dk,ei,si,field,v){
  if(!logData[dk]||!logData[dk].exercises[ei])return;
  logData[dk].exercises[ei].sets[si][field]=v;
  const ex=logData[dk].exercises[ei];const maxKg=Math.max(0,...ex.sets.map(s=>parseFloat(s.kg)||0));
  if(maxKg>0&&maxKg>(prData[ex.name]||0))prData[ex.name]=maxKg;
  saveLog();renderExercises(dk);bindSetInputs();renderWeekSummary();renderLogFeedback(dk);renderStrengthHistory();renderWeekFeedback();
}
function addSet(dk,ei){logData[dk].exercises[ei].sets.push({kg:'',reps:''});saveLog();renderExercises(dk);bindSetInputs();}
function removeSet(dk,ei,si){if(logData[dk].exercises[ei].sets.length>1){logData[dk].exercises[ei].sets.splice(si,1);saveLog();renderExercises(dk);bindSetInputs();}}
function removeExercise(dk,ei){logData[dk].exercises.splice(ei,1);saveLog();renderExercises(dk);bindSetInputs();renderWeekSummary();}
function addExercise(){
  const dk=getDateKey(logDateOffset);if(!logData[dk])logData[dk]={exercises:[],planDay:logPlanDay};
  const name=prompt('Übungsname:','');
  if(name&&name.trim()){logData[dk].exercises.push({name:name.trim(),sets:[{kg:'',reps:''}],fromPlan:false});saveLog();renderExercises(dk);bindSetInputs();}
}

// ════════════════════════════════════════════
// MUSKELGRUPPEN & WOCHENBILANZ
// ════════════════════════════════════════════
function renderMuscleGroupStats(){
  const el=document.getElementById('muscle-group-stats');if(!el)return;
  const muscleMap={
    'Bankdrücken':      {group:'Brust',color:'#5B7FFF'},
    'Schrägbank KH':    {group:'Brust',color:'#5B7FFF'},
    'Cable Flyes':      {group:'Brust',color:'#5B7FFF'},
    'Dips (Gewichtet)': {group:'Brust/Trizeps',color:'#5B7FFF'},
    'Trizeps PD':       {group:'Trizeps',color:'#7C5FFF'},
    'Klimmzüge':        {group:'Rücken',color:'#00E5A0'},
    'Kabelrudern':      {group:'Rücken',color:'#00E5A0'},
    'Lat Pulldown':     {group:'Rücken',color:'#00E5A0'},
    'Face Pulls':       {group:'Schultern',color:'#FFAD33'},
    'Bizeps Curl':      {group:'Bizeps',color:'#38C4F5'},
    'Schulterdrücken':  {group:'Schultern',color:'#FFAD33'},
    'Seitheben':        {group:'Schultern',color:'#FFAD33'},
    'Arnold Press':     {group:'Schultern',color:'#FFAD33'},
    'Kniebeuge':        {group:'Quadrizeps',color:'#EC4899'},
    'Leg Press':        {group:'Quadrizeps',color:'#EC4899'},
    'Romanian DL':      {group:'Hamstrings',color:'#FF5757'},
    'Leg Curl':         {group:'Hamstrings',color:'#FF5757'},
    'Waden':            {group:'Waden',color:'#FF8C57'},
    'Plank':            {group:'Core',color:'#667085'},
  };
  const groups={};
  for(let i=-6;i<=0;i++){
    const dk=getDateKey(i),d=logData[dk];if(!d)continue;
    d.exercises.forEach(ex=>{
      const info=muscleMap[ex.name];
      const gName=info?info.group:ex.name;
      const gColor=info?info.color:'var(--muted)';
      if(!groups[gName])groups[gName]={sets:0,volume:0,color:gColor};
      const validSets=ex.sets.filter(s=>parseFloat(s.kg)>0&&parseInt(s.reps)>0);
      groups[gName].sets+=validSets.length;
      validSets.forEach(s=>{groups[gName].volume+=(parseFloat(s.kg)||0)*(parseInt(s.reps)||0);});
    });
  }
  const entries=Object.entries(groups).filter(([,g])=>g.sets>0).sort((a,b)=>b[1].volume-a[1].volume);
  if(!entries.length){el.innerHTML='<p style="font-size:12px;color:var(--muted);">Noch keine Daten. Kraftwerte im Log eintragen.</p>';return;}
  const maxVol=Math.max(...entries.map(([,g])=>g.volume));
  el.innerHTML=`
    <table style="width:100%;border-collapse:collapse;font-size:12px;">
      <thead><tr>
        <td style="color:var(--muted);font-size:10px;font-family:'DM Mono',monospace;padding:0 0 10px;width:35%;">MUSKELGRUPPE</td>
        <td style="color:var(--muted);font-size:10px;font-family:'DM Mono',monospace;padding:0 0 10px;text-align:center;width:15%;">SÄTZE</td>
        <td style="color:var(--muted);font-size:10px;font-family:'DM Mono',monospace;padding:0 0 10px;text-align:right;width:20%;">VOLUMEN</td>
        <td style="color:var(--muted);font-size:10px;font-family:'DM Mono',monospace;padding:0 0 10px;padding-left:10px;width:30%;">AUSLASTUNG</td>
      </tr></thead>
      <tbody>${entries.map(([name,g])=>{
        const volTons=(g.volume/1000).toFixed(2)+'t';
        const volKg=g.volume>=1000?volTons:Math.round(g.volume)+'kg';
        const pct=Math.round(g.volume/maxVol*100);
        const setsStatus=g.sets<10?'<span style="color:var(--warn);font-size:9px;">↑ mehr</span>':g.sets<=20?'<span style="color:var(--accent);font-size:9px;">✓ ok</span>':'<span style="color:var(--info);font-size:9px;">⚡ viel</span>';
        return`<tr style="border-top:1px solid var(--border);">
          <td style="padding:9px 0;color:${g.color};font-weight:500;">${name}</td>
          <td style="padding:9px 0;text-align:center;font-family:'DM Mono',monospace;">${g.sets} ${setsStatus}</td>
          <td style="padding:9px 0;text-align:right;font-family:'DM Mono',monospace;color:var(--text2);">${volKg}</td>
          <td style="padding:9px 0;padding-left:10px;">
            <div style="height:5px;background:var(--border);border-radius:3px;overflow:hidden;">
              <div style="width:${pct}%;height:100%;background:${g.color};border-radius:3px;"></div>
            </div>
          </td>
        </tr>`;
      }).join('')}</tbody>
    </table>
    <p style="font-size:10px;color:var(--muted);margin-top:8px;font-family:'DM Mono',monospace;">Hypertrophie-Ziel: 10–20 Sätze/Woche pro Gruppe</p>`;
}

function renderSleepAnalysis(sleepData){
  const card=document.getElementById('sleep-quality-bar');
  const metrics=document.getElementById('sleep-phase-metrics');
  if(!sleepData||!card||!metrics)return;
  const {deep=0,rem=0,light=0,total=0}=sleepData;
  if(total<60)return;
  const deepPct=total>0?Math.round(deep/total*100):0;
  const remPct=total>0?Math.round(rem/total*100):0;
  const hours=(total/60).toFixed(1);
  const durationScore=total>=420&&total<=540?30:total>=360?20:10;
  const deepScore=deepPct>=15&&deepPct<=25?35:deepPct>=10?20:5;
  const remScore=remPct>=20&&remPct<=30?35:remPct>=15?20:5;
  const qualityScore=Math.min(100,durationScore+deepScore+remScore);
  const qualColor=qualityScore>=75?'var(--accent)':qualityScore>=50?'var(--warn)':'var(--danger)';
  const qualText=qualityScore>=75?'Sehr gut':qualityScore>=50?'Ausreichend':'Schlecht';
  metrics.style.display='grid';
  metrics.innerHTML=`
    <div class="summary-card"><div class="summary-val" style="font-size:18px;color:var(--info);">${hours}h</div><div class="summary-label">Schlafdauer</div></div>
    <div class="summary-card"><div class="summary-val" style="font-size:18px;color:var(--accent);">${deepPct}%</div><div class="summary-label">Tiefschlaf</div></div>
    <div class="summary-card"><div class="summary-val" style="font-size:18px;color:var(--warn);">${remPct}%</div><div class="summary-label">REM-Schlaf</div></div>`;
  card.style.display='block';
  document.getElementById('sleep-quality-pct').textContent=qualityScore+'/100 — '+qualText;
  document.getElementById('sleep-quality-fill').style.cssText=`height:100%;border-radius:4px;width:${qualityScore}%;background:${qualColor};`;
  let advice='';
  if(deepPct<15)advice+='🔵 Tiefschlaf zu gering (Ziel 15–25%). Kein Alkohol, kühle Raumtemperatur, konstante Schlafzeiten. ';
  if(remPct<20)advice+='🟡 REM zu gering (Ziel 20–30%). Stress reduzieren, kein Training zu spät. ';
  if(total<420)advice+='⏰ Unter 7 Stunden — Recovery leidet stark. ';
  if(total>540)advice+='😴 Über 9 Stunden kann auf Schlafprobleme hinweisen. ';
  if(!advice)advice='✓ Schlafprofil optimal. Recovery maximiert.';
  document.getElementById('sleep-advice').innerHTML=advice;
}

function renderWeekSummary(){
  let sessions=0,volume=0,totalSets=0,prs=0;const prSet=new Set();
  for(let i=-6;i<=0;i++){
    const dk=getDateKey(i),d=logData[dk];if(!d)continue;
    if(d.exercises.some(ex=>ex.sets.some(s=>s.kg&&s.reps)))sessions++;
    d.exercises.forEach(ex=>{
      ex.sets.forEach(s=>{
        const kg=parseFloat(s.kg)||0,reps=parseInt(s.reps)||0;
        if(kg>0&&reps>0){volume+=kg*reps;totalSets++;}
      });
      const maxKg=Math.max(0,...ex.sets.map(s=>parseFloat(s.kg)||0));
      if(maxKg>0&&maxKg===(prData[ex.name]||0)&&!prSet.has(ex.name)){prSet.add(ex.name);prs++;}
    });
  }
  const ws=document.getElementById('wb-sessions');if(!ws)return;
  ws.textContent=sessions;
  const volDisplay=volume>=1000?(volume/1000).toFixed(2)+'t':Math.round(volume)+'kg';
  document.getElementById('wb-volume').textContent=volDisplay;
  document.getElementById('wb-pr').textContent=prs;
  const lifts=['Bankdrücken','Kniebeuge','Klimmzüge','Romanian DL'];
  const maxPR=Math.max(20,...lifts.map(l=>prData[l]||0));
  document.getElementById('wb-progress-bars').innerHTML=lifts.map(l=>{
    const pr=prData[l]||0,pct=pr>0?Math.round(pr/maxPR*100):0;
    const orm=pr>0?Math.round(pr*1.0333):'—';
    return`<div class="progress-bar-wrap">
      <span style="min-width:120px;color:var(--muted);font-size:11px;font-family:'DM Mono',monospace;">${l}</span>
      <div class="progress-bar-bg"><div class="progress-bar-fill" style="width:${pct}%;background:var(--accent);"></div></div>
      <span style="min-width:60px;text-align:right;font-size:11px;font-family:'DM Mono',monospace;color:${pr>0?'var(--accent)':'var(--muted)'};">${pr>0?pr+' kg':'—'}</span>
    </div>`;
  }).join('');
  renderMuscleGroupStats();
}

function renderStrengthHistory(){
  const mainLifts=[
    {name:'Bankdrücken', colorHex:'#00E5A0'},
    {name:'Kniebeuge',   colorHex:'#5B7FFF'},
    {name:'Klimmzüge',  colorHex:'#FFAD33'},
  ];
  let html='';
  mainLifts.forEach(({name:lift, colorHex})=>{
    const history=[];
    for(let i=-27;i<=0;i++){
      const dk=getDateKey(i),d=logData[dk];if(!d)continue;
      const ex=d.exercises.find(e=>e.name===lift);if(!ex)continue;
      const maxKg=Math.max(0,...ex.sets.map(s=>parseFloat(s.kg)||0));
      if(maxKg>0)history.push({x:dk,y:maxKg});
    }
    if(!history.length)return;
    const first=history[0].y, last=history[history.length-1].y;
    const trend=Math.round((last-first)*10)/10;
    const tColor=trend>0?'var(--accent)':trend<0?'var(--danger)':'var(--muted)';
    const tTxt=trend>0?`+${trend} kg ↑`:trend<0?`${trend} kg ↓`:'stabil';
    const pr=prData[lift];
    const chart=history.length>=2
      ?_svgLineChart(history,{colorHex,unit:'kg',h:68})
      :`<div style="font-size:12px;color:var(--muted);padding:8px 0;">Nur 1 Datenpunkt — trage weitere Sessions ein.</div>`;
    html+=`
      <div style="margin-bottom:20px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <span style="font-size:13px;font-weight:600;">${lift}</span>
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-size:11px;color:${tColor};font-family:'DM Mono',monospace;font-weight:600;">${tTxt}</span>
            ${pr?`<span class="badge badge-green" style="font-size:9px;">PR ${pr} kg</span>`:''}
          </div>
        </div>
        ${chart}
      </div>`;
  });
  const sh=document.getElementById('strength-history');
  if(sh)sh.innerHTML=html||'<p style="font-size:13px;color:var(--muted);">Noch keine Daten. Kraftwerte eintragen.</p>';
}

function renderLogFeedback(dk){
  const el=document.getElementById('log-ai-feedback');if(!el)return;
  const d=logData[dk];
  if(!d||!d.exercises.some(ex=>ex.sets.some(s=>s.kg&&s.reps))){el.textContent='Trage Werte ein für KI-Analyse...';return;}
  const totalVol=d.exercises.reduce((sum,ex)=>sum+ex.sets.reduce((s2,set)=>s2+(parseFloat(set.kg)||0)*(parseInt(set.reps)||0),0),0);
  const msgs=[];
  const newPRexes=d.exercises.filter(ex=>{const maxKg=Math.max(0,...ex.sets.map(s=>parseFloat(s.kg)||0));return maxKg>0&&maxKg===(prData[ex.name]||0);});
  if(newPRexes.length>0)msgs.push(`<strong>🏆 PR: ${newPRexes.map(e=>e.name).join(', ')}!</strong>`);
  if(totalVol>0)msgs.push(`Gesamtvolumen: <strong style="color:var(--accent);">${Math.round(totalVol).toLocaleString('de-DE')} kg</strong>.`);
  const sugg=d.exercises.map(ex=>{
    const maxKg=Math.max(0,...ex.sets.map(s=>parseFloat(s.kg)||0));const maxReps=Math.max(0,...ex.sets.map(s=>parseInt(s.reps)||0));
    if(!maxKg)return null;
    if(maxReps>=10)return`<strong>${ex.name}:</strong> 10er-Marke ✓ → nächste Session +2,5 kg.`;
    if(maxReps>=8)return`<strong>${ex.name}:</strong> Solide → gleiche Last, mehr Reps anstreben.`;
    if(maxReps<=5)return`<strong>${ex.name}:</strong> Schwere Intensität → nächste Woche +1 Satz.`;
    return null;
  }).filter(Boolean);
  if(sugg.length)msgs.push('<br><strong>KI Progression:</strong><br>'+sugg.join('<br>'));
  el.innerHTML=msgs.join(' ')||'Session gespeichert.';
}

function renderWeekFeedback(){
  let sessions=0,volume=0,lastWeekVol=0,kcalDays=0,kcalSum=0;
  for(let i=-6;i<=0;i++){
    const dk=getDateKey(i),d=logData[dk];
    if(d){if(d.exercises.some(ex=>ex.sets.some(s=>s.kg&&s.reps)))sessions++;d.exercises.forEach(ex=>ex.sets.forEach(s=>{volume+=(parseFloat(s.kg)||0)*(parseInt(s.reps)||0);}));}
    const dd=dailyData[dk];
    if(dd&&dd.meals&&dd.meals.length){const dayKcal=getDayKcal(dk);if(dayKcal>0){kcalDays++;kcalSum+=dayKcal;}}
  }
  for(let i=-13;i<=-7;i++){const d=logData[getDateKey(i)];if(!d)continue;d.exercises.forEach(ex=>ex.sets.forEach(s=>{lastWeekVol+=(parseFloat(s.kg)||0)*(parseInt(s.reps)||0);}));}
  const el=document.getElementById('week-feedback');if(!el)return;
  if(sessions===0&&volume===0&&kcalDays===0){el.textContent='Sammle Daten... Trainings und Mahlzeiten eintragen.';return;}
  const msgs=[];
  msgs.push(`<strong>Diese Woche:</strong> ${sessions} Sessions, ${Math.round(volume).toLocaleString('de-DE')} kg Volumen.`);
  if(lastWeekVol>0){const change=Math.round((volume-lastWeekVol)/lastWeekVol*100);if(change>5)msgs.push(`<span style="color:var(--accent);">↑ Volumen +${change}% zur Vorwoche</span> — Progressive Overload wirkt.`);else if(change<-5)msgs.push(`<span style="color:var(--danger);">↓ Volumen ${change}% zur Vorwoche.</span>`);else msgs.push(`Volumen stabil (${change>=0?'+':''}${change}%).`);}
  if(kcalDays>0){const avg=Math.round(kcalSum/kcalDays);msgs.push(`Ø ${avg.toLocaleString('de-DE')} kcal/Tag (${kcalDays} Tage erfasst).`);}
  if(sessions<3)msgs.push('Tipp: 3–5 Sessions/Woche für optimale Hypertrophie.');
  else if(sessions>=4)msgs.push('Trainingsfrequenz top. 💪');
  if(getDeloadWeeks()>=6)msgs.push('<span style="color:var(--warn);">⏰ Deload-Woche einplanen.</span>');
  el.innerHTML=msgs.join(' ');
}
