// ════════════════════════════════════════════
// TRAINING MODE
// ════════════════════════════════════════════
let _openHistories=new Set();
let _pendingDelete=null;

function _sanitizeId(n){
  return n.replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue')
           .replace(/Ä/g,'Ae').replace(/Ö/g,'Oe').replace(/Ü/g,'Ue')
           .replace(/ß/g,'ss').replace(/[^a-zA-Z0-9]/g,'_');
}
function _toggleHistory(name){
  if(_pendingDelete===name)return;
  const sid=_sanitizeId(name);
  const histEl=document.getElementById('hist-'+sid);
  const chevEl=document.getElementById('chev-'+sid);
  if(!histEl)return;
  if(_openHistories.has(name)){
    _openHistories.delete(name);histEl.style.maxHeight='0';histEl.style.opacity='0';
    if(chevEl)chevEl.textContent='▼';
  }else{
    _openHistories.add(name);histEl.style.maxHeight='500px';histEl.style.opacity='1';
    if(chevEl)chevEl.textContent='▲';
  }
}
function getExerciseHistory(name,limit=10){
  const results=[];
  const keys=Object.keys(logData).sort().reverse();
  for(const dk of keys){
    const d=logData[dk];if(!d)continue;
    const ex=d.exercises.find(e=>e.name===name);if(!ex)continue;
    const valid=ex.sets.filter(s=>parseFloat(s.kg)>0&&parseInt(s.reps)>0);
    if(!valid.length)continue;
    const top=valid.reduce((b,s)=>parseFloat(s.kg)>=parseFloat(b.kg)?s:b,valid[0]);
    const volume=Math.round(valid.reduce((sum,s)=>sum+(parseFloat(s.kg)||0)*(parseInt(s.reps)||0),0));
    results.push({date:dk,maxKg:parseFloat(top.kg),bestReps:parseInt(top.reps)||0,setsCount:valid.length,volume});
    if(results.length>=limit)break;
  }
  return results;
}
const MUSCLE_OPTIONS=['Brust','Rücken','Schulter','Bizeps','Trizeps',
  'Core','Quadrizeps','Hamstrings','Gesäß','Waden','Kardio','Mobilität'];
function getMuscleGroup(name){
  if(!name)return'';
  if(MUSCLE_MAP[name])return MUSCLE_MAP[name];
  const base=name.split('·')[0].trim();
  if(MUSCLE_MAP[base])return MUSCLE_MAP[base];
  const key=Object.keys(MUSCLE_MAP).find(k=>name.toLowerCase().includes(k.toLowerCase()));
  return key?MUSCLE_MAP[key]:'';
}
function pickMuscleGroup(dk,ei){
  const sid=_sanitizeId((logData[dk]?.exercises[ei]?.name)||'');
  const btn=document.getElementById('mg-btn-'+sid+'-'+ei);
  if(!btn)return;
  const sel=document.createElement('select');
  sel.style.cssText='background:rgba(91,127,255,.12);color:var(--info);border:1px solid rgba(91,127,255,.2);font-size:9px;padding:2px 4px;border-radius:4px;font-family:inherit;cursor:pointer;';
  sel.innerHTML='<option value="">Muskel wählen…</option>'+MUSCLE_OPTIONS.map(m=>`<option value="${m}">${m}</option>`).join('');
  sel.onchange=e=>{
    if(!e.target.value)return;
    logData[dk].exercises[ei].muscleGroup=e.target.value;
    saveLog();renderExercises(dk);bindSetInputs();
  };
  sel.onblur=()=>{setTimeout(()=>{if(!sel.value)renderExercises(dk);},150);};
  btn.replaceWith(sel);
  sel.focus();
}
const VARIANTS=['','Maschine','Kabel'];
function cycleVariant(dk,ei){
  const ex=logData[dk].exercises[ei];
  const i=VARIANTS.indexOf(ex.variant||'');
  ex.variant=VARIANTS[(i+1)%VARIANTS.length];
  saveLog();renderExercises(dk);
}

// Reset any active edit-mode UI back to the neutral "tap a day" state.
// Called before mode switches and when leaving the training tab.
function _resetTrainingEdit(){
  const sw=document.getElementById('selected-workout');
  if(sw)sw.innerHTML='<div class="card-label">Wochenplan</div><p style="font-size:13px;color:var(--muted);">Tippe auf einen Tag für Details.</p>';
  // Clear the day-card highlight so nothing looks selected after the reset
  document.querySelectorAll('#week-grid .day-card').forEach(c=>c.classList.remove('today-card'));
}

function setTrainingMode(mode){
  _resetTrainingEdit();   // exit any open edit view before switching mode
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
      ?'Im Einsteiger-Modus erstellt Vitale automatisch einen Push/Pull/Legs-Plan basierend auf deiner Recovery.'
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
  if(trainingMode==='advanced'&&customPlan){renderCustomWeekGrid();renderVolumeTracker();return;}
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
  renderVolumeTracker();
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
  if(wt!=='rest'&&wt!=='recovery'){
    logPlanDay=wt;
    const dk=getDateKey(logDateOffset);
    if(!logData[dk])logData[dk]={exercises:[],planDay:null};
    applyPlanDayToLog(dk,logPlanDay);
    renderLog();
  }
}
function renderCustomWeekGrid(){
  const todayIdx=(new Date().getDay()+6)%7;
  document.getElementById('week-grid').innerHTML=customPlan.map((day,i)=>{
    const isT=i===todayIdx;
    return`<div class="day-card${isT?' today-card':''}" onclick="showCustomDayDetail(${i})"><div class="day-name">${daysShort[i]}</div><div class="day-type">${day.title.split(' ').slice(0,2).join(' ')}</div><span class="badge badge-blue" style="font-size:8px;padding:2px 4px;">Eigen</span></div>`;
  }).join('');
}
function showCustomDayDetail(dayIdx){
  document.querySelectorAll('#week-grid .day-card').forEach((c,i)=>c.classList.toggle('today-card',i===dayIdx));
  const day=customPlan[dayIdx];const blocked=getBlockedExercises();
  let rows='';
  if(day.ex.length){
    rows=`<table class="workout-table">${day.ex.map(e=>{const isBlocked=blocked.includes(e.name);return`<tr style="${isBlocked?'opacity:.4;text-decoration:line-through;':''}">`+`<td>${e.name||'—'}${isBlocked?' ⚠':''}</td><td>${e.scheme||''}</td></tr>`;}).join('')}</table>`;
  }else{rows='<p style="font-size:13px;color:var(--muted);">Keine Übungen eingetragen.</p>';}
  document.getElementById('selected-workout').innerHTML=`
    <div class="card-label" style="margin-bottom:12px;">${daysFull[dayIdx]} — ${day.title}</div>
    ${rows}
    ${blocked.length?`<p style="font-size:11px;color:var(--danger);margin-top:10px;">⚠ Gesperrt wegen Schmerzen: ${blocked.join(', ')}</p>`:''}
    <button class="btn-primary" onclick="editCustomDay(${dayIdx})" style="margin-top:14px;width:100%;">✏️ Bearbeiten</button>`;
  logPlanDay='c'+dayIdx;
  const _dk=getDateKey(logDateOffset);
  if(!logData[_dk])logData[_dk]={exercises:[],planDay:null};
  applyPlanDayToLog(_dk,logPlanDay);
  renderLog();
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
    ${blocked.length?`<p style="font-size:11px;color:var(--danger);margin-top:12px;">⚠ Schmerz-Bypass: ${blocked.join(', ')}</p>`:''}
    <button class="btn-primary" onclick="showCustomDayDetail(${dayIdx})" style="margin-top:14px;width:100%;">✓ Fertig</button>`;
  logPlanDay='c'+dayIdx;renderLog();
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
  if(trainingMode==='advanced'&&customPlan)return customPlan.map((d,i)=>({key:'c'+i,label:daysShort[i]+' — '+d.title,exercises:d.ex.filter(e=>e.name).map(e=>({name:e.name,scheme:e.scheme||''}))}));
  const plan=weekPlanState||getWeekPlan(75);const seen={};const opts=[];
  plan.forEach((wt,i)=>{if(wt==='rest')return;const wp=workoutPlans[wt];if(seen[wt])return;seen[wt]=1;opts.push({key:wt,label:wp.label,exercises:wp.ex.map(e=>e[0])});});
  return opts;
}
function toggleAnalyseBlock(){
  const block=document.getElementById('analyse-block');
  const arrow=document.getElementById('analyse-arrow');
  if(!block)return;
  const open=block.style.display!=='none';
  block.style.display=open?'none':'block';
  if(arrow)arrow.style.transform=open?'':'rotate(180deg)';
  lsSet('vitale_analyse_open',open?'0':'1');
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
    if(opt)logData[dk].exercises=opt.exercises.map(e=>{const n=typeof e==='string'?e:e.name;const sc=typeof e==='object'?e.scheme||'':'';return{name:n,scheme:sc,sets:[{kg:'',reps:''}],fromPlan:true,muscleGroup:getMuscleGroup(n)||''};});
  }
  logData[dk].planDay=logPlanDay;saveLog();
  renderExercises(dk);bindSetInputs();
  renderWeekSummary();renderStrengthHistory();renderLogFeedback(dk);renderWeekFeedback();renderVolumeTracker();
  const saved=lsGet('vitale_analyse_open');
  const b=document.getElementById('analyse-block');
  const a=document.getElementById('analyse-arrow');
  if(b){b.style.display=saved==='1'?'block':'none';}
  if(a){a.style.transform=saved==='1'?'rotate(180deg)':'';}
}
function applyPlanDayToLog(dk,key){
  flushInputs(dk);
  const hasData=ex=>ex.sets?.some(s=>parseFloat(s.kg)>0||parseInt(s.reps)>0);
  const toKeep=(logData[dk].exercises||[]).filter(hasData);
  const keptNames=new Set(toKeep.map(e=>e.name));
  let planEx=[];
  if(key!=='__free'){
    const opt=getPlanDayOptions().find(o=>o.key===key);
    if(opt)planEx=opt.exercises
      .filter(e=>!keptNames.has(typeof e==='string'?e:e.name))
      .map(e=>{const n=typeof e==='string'?e:e.name;const sc=typeof e==='object'?e.scheme||'':'';
               return{name:n,scheme:sc,sets:[{kg:'',reps:''}],fromPlan:true,muscleGroup:getMuscleGroup(n)||''};});
  }
  logData[dk].exercises=[...toKeep,...planEx];
  logData[dk].planDay=key;
  saveLog();
}
function changeLogPlanDay(){
  const dk=getDateKey(logDateOffset);const newKey=document.getElementById('log-day-select').value;
  logPlanDay=newKey;
  applyPlanDayToLog(dk,newKey);
  renderExercises(dk);bindSetInputs();
}
function getLastLoggedValue(name){
  for(let i=1;i<=30;i++){
    const dk=getDateKey(-i);
    const d=logData[dk];if(!d)continue;
    const ex=(d.exercises||[]).find(e=>e.name===name);if(!ex)continue;
    const valid=ex.sets.filter(s=>parseFloat(s.kg)>0||parseInt(s.reps)>0);
    if(!valid.length)continue;
    const last=valid[valid.length-1];
    return{kg:last.kg||'',reps:last.reps||''};
  }
  return null;
}

function renderExercises(dk){
  const el=document.getElementById('exercise-log-list');if(!el)return;
  el.innerHTML='';
  (logData[dk]?.exercises||[]).forEach((ex,ei)=>{
    const vKey=ex.variant?ex.name+'·'+ex.variant:ex.name;
    const pr=prData[vKey]||prData[ex.name]||0;
    const maxKg=Math.max(0,...ex.sets.map(s=>parseFloat(s.kg)||0));
    const isNewPR=maxKg>0&&maxKg>=pr;
    const bestSet=ex.sets.reduce((best,s)=>{const kg=parseFloat(s.kg)||0,reps=parseInt(s.reps)||0;const orm=reps>1?kg*(1+reps/30):kg;return orm>best?orm:best;},0);
    const oneRM=bestSet>0?Math.round(bestSet):'—';
    const sid=_sanitizeId(ex.name);
    const eSafe=ex.name.replace(/'/g,"\\'");
    const div=document.createElement('div');div.className='log-exercise-card';

    // ── DELETE CONFIRM STATE ──────────────────────────────
    if(_pendingDelete===ex.name){
      div.innerHTML=`
        <div style="padding:2px 0;">
          <div style="font-weight:600;font-size:14px;margin-bottom:10px;">🗑 ${ex.name} löschen?</div>
          <p style="font-size:12px;color:var(--muted);line-height:1.5;margin:0 0 14px;">Übung wird aus dem heutigen Log gelöscht.<br>Gespeicherter Verlauf bleibt erhalten.</p>
          <div style="display:flex;gap:10px;">
            <button class="btn-primary" style="flex:1;background:var(--danger);border-color:var(--danger);" onclick="removeExercise('${dk}',${ei})">Ja, löschen</button>
            <button class="btn-dashed" style="flex:1;" onclick="_pendingDelete=null;renderExercises('${dk}');bindSetInputs();">Abbrechen</button>
          </div>
        </div>`;
      el.appendChild(div);
      return;
    }

    // ── MUSCLE BADGE ─────────────────────────────────────
    const mg=ex.muscleGroup||getMuscleGroup(ex.name);
    const mgBadge=mg
      ?`<span class="badge" style="background:rgba(91,127,255,.12);color:var(--info);border:1px solid rgba(91,127,255,.2);font-size:9px;padding:2px 6px;">${mg}</span>`
      :(!ex.fromPlan
        ?`<button id="mg-btn-${sid}-${ei}" onclick="event.stopPropagation();pickMuscleGroup('${dk}',${ei})" style="background:rgba(91,127,255,.12);color:var(--info);border:1px solid rgba(91,127,255,.2);font-size:9px;padding:2px 6px;border-radius:4px;cursor:pointer;font-family:inherit;">Muskel? ▾</button>`
        :'');

    // ── VARIANT BADGE ─────────────────────────────────────
    const vLabel=ex.variant||'';
    const variantBtn=`<button onclick="event.stopPropagation();cycleVariant('${dk}',${ei})" style="background:rgba(91,127,255,${vLabel?'.15':'.06'});border:1px solid rgba(91,127,255,${vLabel?'.35':'.15'});color:${vLabel?'var(--info)':'var(--muted)'};border-radius:6px;font-size:10px;padding:2px 7px;cursor:pointer;font-family:'DM Mono',monospace;">${vLabel||'Freihanteln'} ▾</button>`;

    // ── HISTORY + SPARKLINE ───────────────────────────────
    const hist=getExerciseHistory(ex.name,10);
    const histPoints=[...hist].reverse().map(h=>({x:h.date,y:h.maxKg}));
    const sparkline=histPoints.length>=2
      ?_svgLineChart(histPoints,{colorHex:'#5B7FFF',unit:'kg',h:52})
      :histPoints.length===1
        ?'<div style="font-size:11px;color:var(--muted);padding:4px 0;font-family:\'DM Mono\',monospace;">1 Session — weitere Daten für Sparkline</div>'
        :'';

    const histOpen=_openHistories.has(ex.name);
    const prKg=prData[vKey]||prData[ex.name]||0;
    let histRows='';
    if(hist.length){
      histRows=hist.map(h=>{
        const isPR=prKg>0&&h.maxKg===prKg;
        const dStr=h.date.slice(5).replace('-','/');
        const bSet=h.maxKg+'kg'+(h.bestReps?' × '+h.bestReps:'');
        const vol=h.volume>=1000?(h.volume/1000).toFixed(1)+'t':h.volume+'kg';
        return '<tr style="border-top:1px solid var(--border);">'
          +'<td style="padding:5px 6px;font-family:\'DM Mono\',monospace;font-size:11px;color:var(--muted);">'+dStr+'</td>'
          +'<td style="padding:5px 6px;font-family:\'DM Mono\',monospace;font-size:11px;color:var(--text);">'+bSet+'</td>'
          +'<td style="padding:5px 6px;font-family:\'DM Mono\',monospace;font-size:11px;color:var(--muted);text-align:center;">'+h.setsCount+'</td>'
          +'<td style="padding:5px 6px;font-family:\'DM Mono\',monospace;font-size:11px;color:var(--muted);text-align:right;">'+vol+'</td>'
          +'<td style="padding:4px 6px;">'+(isPR?'<span class="badge badge-yellow" style="font-size:8px;padding:1px 4px;">PR</span>':'')+'</td>'
          +'</tr>';
      }).join('');
    }
    const histTable=hist.length
      ?'<div style="margin-top:10px;border-top:1px solid var(--border);padding-top:10px;">'
        +'<div style="font-size:10px;color:var(--muted);font-family:\'DM Mono\',monospace;letter-spacing:.05em;margin-bottom:6px;">VERLAUF — LETZTE '+hist.length+' SESSIONS</div>'
        +'<table style="width:100%;border-collapse:collapse;">'
          +'<thead><tr>'
            +'<th style="font-size:9px;color:var(--muted);font-family:\'DM Mono\',monospace;text-align:left;padding:0 6px 6px;font-weight:400;">DATUM</th>'
            +'<th style="font-size:9px;color:var(--muted);font-family:\'DM Mono\',monospace;text-align:left;padding:0 6px 6px;font-weight:400;">BESTES SET</th>'
            +'<th style="font-size:9px;color:var(--muted);font-family:\'DM Mono\',monospace;text-align:center;padding:0 6px 6px;font-weight:400;">SÄTZE</th>'
            +'<th style="font-size:9px;color:var(--muted);font-family:\'DM Mono\',monospace;text-align:right;padding:0 6px 6px;font-weight:400;">VOL.</th>'
            +'<th></th>'
          +'</tr></thead>'
          +'<tbody>'+histRows+'</tbody>'
        +'</table></div>'
      :'<p style="font-size:11px;color:var(--muted);padding:8px 0 2px;">Noch kein Verlauf.</p>';

    const _last=getLastLoggedValue(ex.name);
    const ghostHtml=_last
      ?`<div class="ghost-hint">Zuletzt: <span>${_last.kg?_last.kg+'kg':''}${_last.kg&&_last.reps?' × ':''}${_last.reps?_last.reps+' Wdh.':''}</span></div>`
      :'';

    div.innerHTML=`
      <div class="log-ex-header" style="cursor:pointer;" onclick="_toggleHistory('${eSafe}')">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <span style="font-weight:600;font-size:14px;">${ex.name}</span>
          ${mgBadge}
          ${variantBtn}
          ${ex.scheme?`<span style="font-size:10px;color:var(--muted);font-family:'DM Mono',monospace;">${ex.scheme}</span>`:''}
          ${isNewPR&&maxKg>0?'<span class="badge badge-yellow">🏆 PR!</span>':''}
          ${(()=>{const sug=getOverloadSuggestion(ex);return sug?`<span style="font-size:10px;color:var(--info);font-family:'DM Mono',monospace;background:rgba(91,127,255,.08);border:1px solid rgba(91,127,255,.15);border-radius:6px;padding:2px 8px;">${sug}</span>`:''})()}
        </div>
        <div style="display:flex;align-items:center;gap:10px;">
          <span id="chev-${sid}" style="font-family:'DM Mono',monospace;font-size:11px;color:var(--muted);user-select:none;">${histOpen?'▲':'▼'}</span>
          <button class="del-btn" onclick="event.stopPropagation();_pendingDelete='${eSafe}';renderExercises('${dk}');bindSetInputs();">✕</button>
        </div>
      </div>
      <div style="margin:6px 0 2px;">
        <span style="font-size:11px;font-family:'DM Mono',monospace;color:var(--muted);">PR: <span style="color:var(--accent);">${pr>0?pr+'kg':'—'}</span> · 1RM≈<span style="color:var(--info);">${oneRM}${oneRM!=='—'?'kg':''}</span></span>
      </div>
      ${sparkline}
      <div id="hist-${sid}" style="overflow:hidden;max-height:${histOpen?'500px':'0'};opacity:${histOpen?'1':'0'};transition:max-height .3s ease,opacity .2s ease;">
        ${histTable}
      </div>
      <div style="display:grid;grid-template-columns:26px 1fr 1fr 72px 24px;gap:6px;margin:10px 0 6px;">
        <span class="log-col-label">#</span><span class="log-col-label">kg</span><span class="log-col-label">Reps</span><span class="log-col-label">Volumen</span><span></span>
      </div>
      ${ghostHtml}
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
  const vKey=ex.variant?ex.name+'·'+ex.variant:ex.name;
  if(maxKg>0&&maxKg>(prData[vKey]||0))prData[vKey]=maxKg;
  saveLog();renderExercises(dk);bindSetInputs();renderWeekSummary();renderLogFeedback(dk);renderStrengthHistory();renderWeekFeedback();renderVolumeTracker();
}
function flushInputs(dk){
  document.querySelectorAll(`.set-input[data-dk="${dk}"]`).forEach(inp=>{
    const ei=+inp.dataset.ei,si=+inp.dataset.si,f=inp.dataset.field;
    if(logData[dk]?.exercises[ei]?.sets[si]!==undefined)
      logData[dk].exercises[ei].sets[si][f]=inp.value;
  });
}
function addSet(dk,ei){flushInputs(dk);logData[dk].exercises[ei].sets.push({kg:'',reps:''});saveLog();renderExercises(dk);bindSetInputs();}
function removeSet(dk,ei,si){flushInputs(dk);if(logData[dk].exercises[ei].sets.length>1){logData[dk].exercises[ei].sets.splice(si,1);saveLog();renderExercises(dk);bindSetInputs();}}
function removeExercise(dk,ei){flushInputs(dk);_pendingDelete=null;logData[dk].exercises.splice(ei,1);saveLog();renderExercises(dk);bindSetInputs();renderWeekSummary();}
function addExercise(){
  const dk=getDateKey(logDateOffset);if(!logData[dk])logData[dk]={exercises:[],planDay:logPlanDay};
  const name=prompt('Übungsname:','');
  if(name&&name.trim()){const n=name.trim();logData[dk].exercises.push({name:n,sets:[{kg:'',reps:''}],fromPlan:false,muscleGroup:getMuscleGroup(n)||''});saveLog();renderExercises(dk);bindSetInputs();}
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

// ════════════════════════════════════════════
// PROGRESSIVE OVERLOAD
// ════════════════════════════════════════════
function getLastSession(name){
  for(let i=1;i<=60;i++){
    const dk=getDateKey(-i),day=logData[dk];if(!day)continue;
    const ex=day.exercises?.find(e=>e.name===name);if(!ex)continue;
    const valid=ex.sets.filter(s=>parseFloat(s.kg)>0&&parseInt(s.reps)>0);
    if(!valid.length)continue;
    const best=valid.reduce((b,s)=>parseFloat(s.kg)>(parseFloat(b.kg)||0)?s:b,valid[0]);
    return{maxKg:parseFloat(best.kg),bestReps:parseInt(best.reps),date:dk};
  }
  return null;
}
function getOverloadSuggestion(ex){
  if(!ex.sets.every(s=>!s.kg&&!s.reps))return null;
  const last=getLastSession(ex.name);if(!last)return null;
  const m=(ex.scheme||'').match(/[×x].*?(\d+)\s*[-–]?\s*(\d+)?/);
  const schemeMax=m?parseInt(m[2]||m[1]):null;
  if(schemeMax&&last.bestReps>=schemeMax){
    const nextKg=Math.round((last.maxKg+2.5)*2)/2;
    return`↑ ${last.maxKg} kg × ${last.bestReps} erreicht → Ziel: <strong>${nextKg} kg</strong>`;
  }
  return`↑ Letztes Mal ${last.maxKg} kg × ${last.bestReps} → Ziel: <strong>× ${last.bestReps+1}</strong>`;
}

// ════════════════════════════════════════════
// WEEKLY VOLUME TRACKER
// ════════════════════════════════════════════
const VOLUME_TARGETS={
  'Brust':10,'Rücken':12,'Schulter':10,
  'Bizeps':8,'Trizeps':8,'Core':6,
  'Quadrizeps':10,'Hamstrings':8,'Gesäß':12,'Waden':6
};
function getWeeklyVolume(){
  const vol={};
  for(let i=-6;i<=0;i++){
    const dk=getDateKey(i),d=logData[dk];if(!d)continue;
    d.exercises.forEach(ex=>{
      const mg=ex.muscleGroup||(typeof getMuscleGroup==='function'?getMuscleGroup(ex.name):'')||'';
      if(!mg)return;
      const count=ex.sets.filter(s=>parseFloat(s.kg)>0&&parseInt(s.reps)>0).length;
      if(count>0)vol[mg]=(vol[mg]||0)+count;
    });
  }
  return vol;
}
function renderVolumeTracker(){
  const el=document.getElementById('volume-tracker');if(!el)return;
  const vol=getWeeklyVolume();
  const entries=Object.entries(vol).sort((a,b)=>b[1]-a[1]);
  if(!entries.length){el.innerHTML='';return;}
  const rows=entries.map(([group,count])=>{
    const target=VOLUME_TARGETS[group]||10;
    const pct=Math.min(100,Math.round(count/target*100));
    const color=count>=target?'var(--accent)':count>=target*0.5?'var(--warn)':'var(--danger)';
    return'<div>'
      +'<div style="display:flex;justify-content:space-between;margin-bottom:6px;">'
        +'<span style="font-size:11px;">'+group+'</span>'
        +'<span style="font-family:\'DM Mono\',monospace;font-size:10px;color:'+color+';">'+count+' / '+target+' Sätze</span>'
      +'</div>'
      +'<div style="height:3px;background:var(--border);border-radius:2px;margin-bottom:10px;">'
        +'<div style="width:'+pct+'%;height:3px;background:'+color+';border-radius:2px;transition:width .4s ease;"></div>'
      +'</div>'
    +'</div>';
  }).join('');
  el.innerHTML='<div style="background:var(--surface);border-radius:12px;padding:16px;">'
    +'<div style="font-size:10px;color:var(--muted);font-family:\'DM Mono\',monospace;letter-spacing:.07em;margin-bottom:12px;">WOCHENVOLUMEN</div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:0 16px;">'+rows+'</div>'
    +'</div>';
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
  if(!d||!d.exercises.some(ex=>ex.sets.some(s=>s.kg&&s.reps))){el.textContent='Trage Werte ein für Analyse...';return;}
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
  if(sugg.length)msgs.push('<br><strong>Coach-Progression:</strong><br>'+sugg.join('<br>'));
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
