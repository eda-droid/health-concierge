// ════════════════════════════════════════════
// TRAINING — Wochenplan, Trainings-Log, Verlauf, Volumen & Feedback
// Öffentlich (onclick): siehe PUBLIC-API-Block am Dateiende
// ════════════════════════════════════════════
let _openHistories=new Set();
// var statt let: onclick-Strings schreiben _pendingDelete direkt (window-Scope)
var _pendingDelete=null;

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
// Arbeitssätze zählen auch ohne Zusatzgewicht; Warm-ups nie.
function isWorkSet(s){
  return !!s&&parseInt(s.reps)>0&&s.warmup!==true;
}
function getSetTonnage(s){
  if(!isWorkSet(s))return 0;
  const kg=parseFloat(s.kg),reps=parseInt(s.reps);
  return Number.isFinite(kg)&&kg>0?kg*reps:0;
}
function getExerciseHistory(name,limit=10){
  const results=[];
  const keys=Object.keys(logData).sort().reverse();
  for(const dk of keys){
    const d=logData[dk];if(!d)continue;
    const ex=(d.exercises||[]).find(e=>e.name===name);if(!ex)continue;
    const valid=(ex.sets||[]).filter(isWorkSet);
    if(!valid.length)continue;
    const top=valid.reduce((b,s)=>(parseFloat(s.kg)||0)>=(parseFloat(b.kg)||0)?s:b,valid[0]);
    const volume=Math.round(valid.reduce((sum,s)=>sum+getSetTonnage(s),0));
    results.push({date:dk,maxKg:parseFloat(top.kg)||0,bestReps:parseInt(top.reps)||0,setsCount:valid.length,volume});
    if(results.length>=limit)break;
  }
  return results;
}
// Spaltenraster des Trainings-Logs: #, kg, Reps, RIR, Volumen, Löschen.
// Header- und Satz-Zeile teilen es sich, damit die Labels über den Feldern bleiben.
const LOG_GRID_COLS='26px 1fr 1fr 1fr 58px 24px';
const MUSCLE_OPTIONS=['Brust','Rücken','Schulter','Bizeps','Trizeps',
  'Core','Quadrizeps','Hamstrings','Gesäß','Waden','Kardio','Mobilität',
  'Glutes','Abduktoren'];
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
  if(sw)sw.innerHTML='<div class="card-label">Wochenplan</div><p class="hint-text">Tippe auf einen Tag für Details.</p>';
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
  renderLog(); // baut Einheiten-Select + Übungen für den neuen Modus neu auf
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
  if(typeof renderProgramLine==='function')renderProgramLine();
  const el=document.getElementById('week-grid');if(!el)return;
  const c=computeAll();
  const recovery=recoveryOverride!==undefined?recoveryOverride:c.recovery;
  if(trainingMode==='advanced'&&customPlan){renderCustomWeekGrid();renderVolumeTracker();return;}
  const plan=getWeekPlan(recovery);
  const todayIdx=(new Date().getDay()+6)%7;
  const today=getTodayKey();
  el.innerHTML=plan.map((wt,i)=>{
    const wp=workoutPlans[wt]||workoutPlans.rest;
    const isT=i===todayIdx;
    const dk=getDateKey(i-todayIdx);
    const autoRest=dk<today&&wt!=='rest'&&wt!=='recovery'&&!hasLogEntry(dk);
    const blocked=getBlockedExercises();
    const hasBlock=!autoRest&&wp.ex.some(e=>blocked.includes(e[0]));
    return`<div class="day-card${isT?' today-card':''}" onclick="showDayDetail(${i},'${wt}')">
      <div class="day-name">${daysShort[i]}</div>
      <div class="day-type" style="color:${autoRest?'var(--muted)':wt==='rest'?'var(--muted)':wt==='recovery'?'var(--warn)':'var(--accent)'}">${autoRest?'Ruhetag':wp.short}</div>
      ${hasBlock?'<div style="font-size:9px;color:var(--danger);">⚠</div>':''}
    </div>`;
  }).join('');

  const ws=document.getElementById('week-status');
  if(ws)ws.innerHTML=recovery>=75?`<strong>Optimale Woche.</strong> 5 Trainingseinheiten geplant.`:recovery>=50?`<strong>Moderate Woche.</strong> 4 Einheiten, kürzere Sessions.`:`<strong>Erholungswoche.</strong> 2–3 leichte Einheiten.`;
  renderVolumeTracker();
}
// Rendert NUR die obere Detailkarte (#selected-workout) + die today-card-Markierung
// im #week-grid. Setzt/liest kein logPlanDay, ruft weder applyPlanDayToLog noch
// renderLog auf — das bleibt Sache der Aufrufer.
// key: 'c<idx>' (customPlan) oder ein workoutPlans-Key. Unbekannt/leer -> Neutralzustand.
// markGrid=false: today-card-Markierung im #week-grid unangetastet lassen —
// gebraucht, wenn die Auswahl nicht den angezeigten Wochentag verschieben soll.
function _renderSelectedWorkout(key,_reserved,markGrid=true){
  const sw=document.getElementById('selected-workout');
  if(!sw)return;
  const cards=document.querySelectorAll('#week-grid .day-card');
  const blocked=getBlockedExercises();

  const cm=typeof key==='string'?key.match(/^c(\d+)$/):null;
  if(cm){
    const dayIdx=parseInt(cm[1],10);
    const day=customPlan&&customPlan[dayIdx];
    if(!day){_resetTrainingEdit();return;}
    // Kein Grid-Toggle mehr: das Wochenraster markiert das gewählte Datum,
    // nicht die Einheit — das erledigt renderCustomWeekGrid().
    // Programm-Einheit: Übungen + Schema aus der Phase des gewählten Datums.
    const progEx=!day.programArchived&&day.programKey&&typeof getProgramExercises==='function'
      ?getProgramExercises(day.programKey,getProgramWeek(getDateKey(logDateOffset))):null;
    const exList=progEx||day.ex;
    let rows='';
    if(exList.length){
      rows=`<table class="workout-table">${exList.map(e=>{const isBlocked=blocked.includes(e.name);return`<tr style="${isBlocked?'opacity:.4;text-decoration:line-through;':''}">`+`<td>${e.name||'—'}${isBlocked?' ⚠':''}</td><td>${e.scheme||''}</td></tr>`;}).join('')}</table>`;
    }else{rows='<p class="hint-text">Keine Übungen eingetragen.</p>';}
    sw.innerHTML=`
      <div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px;margin-bottom:12px;">
        <div class="card-label" style="margin:0;">${day.title}</div>
        <a onclick="editCustomDay(${dayIdx})" style="font-size:11px;color:var(--muted);cursor:pointer;text-decoration:underline;white-space:nowrap;flex-shrink:0;">Bearbeiten</a>
      </div>
      ${rows}
      ${blocked.length?`<p style="font-size:11px;color:var(--danger);margin-top:10px;">⚠ Gesperrt wegen Schmerzen: ${blocked.join(', ')}</p>`:''}`;
    return;
  }
  if(key==='__free'){
    sw.innerHTML='<div class="card-label" style="margin-bottom:12px;">Freies Training</div><p class="hint-text">Übungen frei im Log eintragen.</p>';
    return;
  }

  const wp=key?workoutPlans[key]:null;
  if(!wp){_resetTrainingEdit();return;}
  const plan=weekPlanState||getWeekPlan(75);
  const i=plan.indexOf(key); // erstes Vorkommen — deckt sich mit dem Dedup in getPlanDayOptions()
  if(markGrid)cards.forEach((c,j)=>c.classList.toggle('today-card',j===i));
  let rows='';
  if(wp.ex.length){
    rows=`<table class="workout-table">${wp.ex.map(e=>{const isBlocked=blocked.includes(e[0]);return`<tr style="${isBlocked?'opacity:.4;text-decoration:line-through;':''}">`+`<td>${e[0]}${isBlocked?' ⚠':''}</td><td>${e[1]}</td><td>${e[2]}</td></tr>`;}).join('')}</table>`;
  } else{rows='<p class="hint-text">Heute: Aktive Regeneration oder Ruhetag.</p>';}
  const label=i>=0?`${daysFull[i]} — ${wp.label}`:wp.label;
  sw.innerHTML=`<div class="card-label" style="margin-bottom:12px;">${label}</div>${rows}${blocked.length?`<p style="font-size:11px;color:var(--danger);margin-top:10px;">⚠ Gesperrt wegen Schmerzen: ${blocked.join(', ')}</p>`:''}`;
}
function showDayDetail(i,wt){
  _renderSelectedWorkout(wt);
  if(wt!=='rest'&&wt!=='recovery'){
    // Log-Datum auf diesen Wochentag der aktuellen Woche setzen — zukünftige
    // Tage bleiben reine Vorschau, das Log-Datum bleibt dort unverändert.
    const offset=i-((new Date().getDay()+6)%7);
    if(offset<=0)logDateOffset=offset;
    logPlanDay=wt;
    const dk=getDateKey(logDateOffset);
    if(!logData[dk])logData[dk]={exercises:[],planDay:null};
    applyPlanDayToLog(dk,logPlanDay);
    renderLog();
  }
}
// Zeigt nicht den Plan, sondern was an den Daten dieser Woche eingetragen ist.
// Einzige Quelle: logData[dk].planDay. customPlan ist nur noch die Bibliothek,
// aus der der Titel zur ID aufgelöst wird.
function renderCustomWeekGrid(){
  const grid=document.getElementById('week-grid');if(!grid)return;
  const todayIdx=(new Date().getDay()+6)%7;
  let html='';
  for(let i=0;i<7;i++){
    const offset=i-todayIdx;
    const dk=getDateKey(offset);
    const planDay=(logData[dk]||{}).planDay;
    const cm=typeof planDay==='string'?planDay.match(/^c(\d+)$/):null;
    const unit=cm&&customPlan?customPlan[parseInt(cm[1],10)]:null;
    const empty=!planDay;
    const title=unit?unit.title.split(' ').slice(0,2).join(' ')
      :planDay==='__free'?'Freies Training'
      :'—';
    // Vergangener Tag ohne Einheit: dezenter Hinweis statt Umdeutung.
    // Heute und Zukunft bleiben bei "—" ohne Zusatz.
    const badge=hasLogEntry(dk)
      ?'<span class="badge badge-blue" style="font-size:8px;padding:2px 4px;">geloggt</span>'
      :(empty&&offset<0
        ?'<span style="font-size:8px;color:var(--muted);padding:2px 4px;">nichts eingetragen</span>'
        :'');
    html+=`<div class="day-card${offset===logDateOffset?' today-card':''}" style="${empty?'opacity:.55;':''}" onclick="selectLogDate(${offset})">`
      +`<div class="day-name">${daysShort[i]}</div>`
      +`<div class="day-type"${empty?' style="color:var(--muted);"':''}>${title}</div>`
      +badge
      +'</div>';
  }
  grid.innerHTML=html;
}
// Wählt ein Datum aus. Leitet bewusst KEINE Einheit ab — ein Tag ohne Eintrag
// bleibt leer, bis im Log explizit eine Einheit gewählt wird.
function selectLogDate(offset){
  logDateOffset=offset;
  const dk=getDateKey(offset);
  if(!logData[dk])logData[dk]={exercises:[],planDay:null};
  logPlanDay=logData[dk].planDay||null;
  renderLog();
  renderCustomWeekGrid();
  _renderSelectedWorkout(logPlanDay,undefined,false);
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
    <div class="card-label" style="margin-bottom:12px;">${day.title} — bearbeiten</div>
    <div class="form-group" style="margin-bottom:14px;"><label>NAME / FOKUS DER EINHEIT</label><input id="custom-day-title" value="${day.title}" onblur="updateCustomDayTitle(${dayIdx},this.value)"></div>
    <div style="display:grid;grid-template-columns:1fr 90px 28px;gap:7px;margin-bottom:6px;"><span class="log-col-label" style="text-align:left;">Übung</span><span class="log-col-label">Sätze×Reps</span><span></span></div>
    ${rows}
    <button class="btn-dashed" onclick="addCustomEx(${dayIdx})" style="margin-top:8px;">+ Übung hinzufügen</button>
    ${blocked.length?`<p style="font-size:11px;color:var(--danger);margin-top:12px;">⚠ Schmerz-Bypass: ${blocked.join(', ')}</p>`:''}
    <button class="btn-primary" onclick="_renderSelectedWorkout('c${dayIdx}',undefined,false)" style="margin-top:14px;width:100%;">✓ Fertig</button>`;
}
function updateCustomEx(d,e,field,v){customPlan[d].ex[e][field]=v;saveCustomPlan();}
function updateCustomDayTitle(d,v){customPlan[d].title=v;saveCustomPlan();renderCustomWeekGrid();}
function addCustomEx(d){customPlan[d].ex.push({name:'',scheme:''});saveCustomPlan();editCustomDay(d);}
function removeCustomEx(d,e){customPlan[d].ex.splice(e,1);saveCustomPlan();editCustomDay(d);}

// ════════════════════════════════════════════
// TRAININGS-LOG
// ════════════════════════════════════════════
// Die Einheit eines Datums steht ausschließlich im Log. Keine Ableitung aus
// dem Wochentag — ein Tag ohne Eintrag bleibt leer (null).
function _planDayForDate(dk){
  return(logData[dk]&&logData[dk].planDay)||null;
}
function _toggleUnitPicker(){
  const p=document.getElementById('log-unit-picker');
  if(!p)return;
  p.style.display=p.style.display==='none'?'block':'none';
}
function changeLogDate(dir){
  logDateOffset+=dir;if(logDateOffset>0)logDateOffset=0;
  const dk=getDateKey(logDateOffset);
  if(!logData[dk])logData[dk]={exercises:[],planDay:null};
  // Nur Datum wechseln — planDay wird gelesen, nie abgeleitet oder überschrieben.
  logPlanDay=_planDayForDate(dk);
  renderLog();
  renderCustomWeekGrid();
  _renderSelectedWorkout(logPlanDay,undefined,false);
}
function hasLogEntry(dk){
  const d=logData[dk];
  if(!d||!d.exercises||!d.exercises.length)return false;
  return d.exercises.some(ex=>ex.sets&&ex.sets.some(s=>s.kg||s.reps));
}
function getPlanDayOptions(){
  // Bibliothek von Einheiten — Index ist die ID, kein Wochentag.
  if(trainingMode==='advanced'&&customPlan)return customPlan.flatMap((d,i)=>d?[{key:'c'+i,label:d.title+(d.programArchived?' (archiviert)':''),archived:!!d.programArchived,exercises:(d.ex||[]).filter(e=>e.name).map(e=>({name:e.name,scheme:e.scheme||''}))}]:[]);
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
  const day=logData[dk]||{exercises:[],planDay:null};
  const opts=getPlanDayOptions();
  logPlanDay=day.planDay||null;
  const unitLbl=document.getElementById('log-unit-name');
  if(unitLbl){
    const opt=opts.find(o=>o.key===logPlanDay);
    unitLbl.textContent=opt?opt.label:logPlanDay==='__free'?'Freies Training':logPlanDay?'Gespeicherte Einheit nicht verfügbar':'Keine Einheit gewählt';
  }
  const sel=document.getElementById('log-day-select');if(!sel)return;
  sel.innerHTML=`<option value="" ${logPlanDay===null?'selected':''}>Einheit wählen…</option>`
    +opts.map(o=>`<option value="${o.key}" ${o.archived?'disabled':''} ${o.key===logPlanDay?'selected':''}>${o.label}</option>`).join('')
    +`<option value="__free" ${logPlanDay==='__free'?'selected':''}>Freies Training</option>`;
  renderExercises(dk);bindSetInputs();
  renderWeekSummary();renderStrengthHistory();renderLogFeedback(dk);renderWeekFeedback();renderVolumeTracker();
  const saved=lsGet('vitale_analyse_open');
  const b=document.getElementById('analyse-block');
  const a=document.getElementById('analyse-arrow');
  if(b){b.style.display=saved==='1'?'block':'none';}
  if(a){a.style.transform=saved==='1'?'rotate(180deg)':'';}
}
// Übungsliste einer Einheit. Bei Programm-Einheiten kommen Übungen, Sätze und
// Schema aus der Phase des Trainingsdatums, nicht aus dem customPlan-Eintrag.
function _planDaySource(key,dk=getDateKey(logDateOffset)){
  const opt=key!=='__free'?getPlanDayOptions().find(o=>o.key===key):null;
  if(!opt)return null;
  const cm=typeof key==='string'?key.match(/^c(\d+)$/):null;
  const entry=cm&&customPlan?customPlan[parseInt(cm[1],10)]:null;
  if(entry&&!entry.programArchived&&entry.programKey&&typeof getProgramExercises==='function'){
    const progEx=getProgramExercises(entry.programKey,getProgramWeek(dk));
    if(progEx)return{key:opt.key,label:opt.label,exercises:progEx};
  }
  return opt;
}
function applyPlanDayToLog(dk,key,keepAll){
  if(!logData[dk])logData[dk]={exercises:[],planDay:null};
  flushInputs(dk);
  const hasData=ex=>ex.sets?.some(s=>parseFloat(s.kg)>0||parseInt(s.reps)>0);
  const opt=_planDaySource(key,dk);
  const newNames=new Set((opt?opt.exercises:[]).map(e=>typeof e==='string'?e:e.name));
  const toKeep=(logData[dk].exercises||[]).filter(ex=>{
    if(!hasData(ex))return false; // ohne Daten -> wie bisher verwerfen
    if(keepAll||ex.fromPlan!==true)return true; // manuell hinzugefügt -> immer behalten
    return newNames.has(ex.name); // aus altem Plan -> nur behalten, wenn Teil der neuen Einheit
  });
  const keptNames=new Set(toKeep.map(e=>e.name));
  let planEx=[];
  if(opt)planEx=opt.exercises
    .filter(e=>!keptNames.has(typeof e==='string'?e:e.name))
    .map(e=>{const n=typeof e==='string'?e:e.name;const sc=typeof e==='object'?e.scheme||'':'';
             // Programm-Übungen bringen ihre Satzzahl mit; sonst ein leerer Satz.
             const cnt=(typeof e==='object'&&e.sets>0)?e.sets:1;
             const sets=[];for(let i=0;i<cnt;i++)sets.push({kg:'',reps:'',rir:'',warmup:false});
             return{name:n,scheme:sc,sets,fromPlan:true,...(e.planTarget?{planTarget:JSON.parse(JSON.stringify(e.planTarget))}:{}),muscleGroup:(typeof e==='object'&&e.muscleGroup)||getMuscleGroup(n)||''};});
  logData[dk].exercises=[...toKeep,...planEx];
  logData[dk].planDay=key;
  saveLog();
}
// Namen der fromPlan-Übungen mit eingetragenen Werten, die beim Wechsel zu
// newKey verworfen würden (siehe applyPlanDayToLog). Rein lesend.
function _planDayConflicts(dk,newKey){
  flushInputs(dk);
  const hasData=ex=>ex.sets?.some(s=>parseFloat(s.kg)>0||parseInt(s.reps)>0);
  const opt=_planDaySource(newKey,dk);
  const newNames=new Set((opt?opt.exercises:[]).map(e=>typeof e==='string'?e:e.name));
  return((logData[dk]&&logData[dk].exercises)||[])
    .filter(ex=>ex.fromPlan===true&&hasData(ex)&&!newNames.has(ex.name))
    .map(ex=>ex.name);
}
function changeLogPlanDay(){
  const dk=getDateKey(logDateOffset);const raw=document.getElementById('log-day-select').value;
  if(!logData[dk])logData[dk]={exercises:[],planDay:null};
  const newKey=raw===''?null:raw;
  if(getPlanDayOptions().find(o=>o.key===newKey)?.archived)return;
  logPlanDay=newKey;
  // Die Auswahl gilt ausschließlich für das aktuell gewählte Datum.
  const finish=()=>{
    renderExercises(dk);bindSetInputs();
    const unitLbl=document.getElementById('log-unit-name');
    if(unitLbl){const o=getPlanDayOptions().find(x=>x.key===logPlanDay);unitLbl.textContent=o?o.label:logPlanDay==='__free'?'Freies Training':logPlanDay?'Gespeicherte Einheit nicht verfügbar':'Keine Einheit gewählt';}
    const picker=document.getElementById('log-unit-picker');
    if(picker)picker.style.display='none';
    renderVolumeTracker();
    renderCustomWeekGrid(); // Wochenraster zieht sofort mit
    _renderSelectedWorkout(logPlanDay,undefined,false);
  };
  if(newKey===null){
    logData[dk].planDay=null;saveLog();
    finish();
    return;
  }
  const conflicts=_planDayConflicts(dk,newKey);
  if(!conflicts.length){
    applyPlanDayToLog(dk,newKey);
    finish();
    return;
  }
  const newLabel=(getPlanDayOptions().find(o=>o.key===newKey)||{}).label||newKey;
  showModal(
    'Einheit wechseln?',
    `${conflicts.length} Übung(en) mit eingetragenen Werten gehören nicht zu <strong>${newLabel}</strong>: ${conflicts.join(', ')}. Sollen sie verworfen werden?`,
    ()=>{applyPlanDayToLog(dk,newKey);finish();},          // Verwerfen und wechseln
    ()=>{applyPlanDayToLog(dk,newKey,true);finish();}      // Behalten und trotzdem wechseln
  );
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

    // ── WARM-UP GENERATOR: 40/60/80% vom besten bekannten Gewicht ────────
    const refKg=Math.max(
      0,
      ...ex.sets.map(s=>parseFloat(s.kg)||0),
      prData[vKey]||0,
      prData[ex.name]||0
    );
    const round25=kg=>Math.round(kg/2.5)*2.5;
    const warmupHtml=refKg>=10
      ?`<div class="warmup-banner">
          <span class="warmup-label">AUFWÄRMEN · ${refKg}kg</span>
          <div class="warmup-sets">
            <span>${round25(refKg*.4)}kg × 8</span>
            <span>${round25(refKg*.6)}kg × 5</span>
            <span>${round25(refKg*.8)}kg × 3</span>
          </div>
        </div>`
      :'';

    div.innerHTML=`
      <div class="log-ex-header" style="cursor:pointer;" onclick="_toggleHistory('${eSafe}')">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <span style="font-weight:600;font-size:14px;">${ex.name}</span>
          ${mgBadge}
          ${variantBtn}
          ${ex.scheme?`<span style="font-size:10px;color:var(--muted);font-family:'DM Mono',monospace;">${ex.scheme}</span>`:''}
          ${isNewPR&&maxKg>0?'<span class="badge badge-yellow">🏆 PR!</span>':''}
          ${(()=>{const sug=getOverloadSuggestion(ex,dk);return sug?`<span style="font-size:10px;color:var(--info);font-family:'DM Mono',monospace;background:rgba(91,127,255,.08);border:1px solid rgba(91,127,255,.15);border-radius:6px;padding:2px 8px;">${sug}</span>`:''})()}
        </div>
        <div style="display:flex;align-items:center;gap:10px;">
          <span id="chev-${sid}" style="font-family:'DM Mono',monospace;font-size:11px;color:var(--muted);user-select:none;">${histOpen?'▲':'▼'}</span>
          <button class="del-btn" onclick="event.stopPropagation();_pendingDelete='${eSafe}';renderExercises('${dk}');bindSetInputs();">✕</button>
        </div>
      </div>
      ${warmupHtml}
      <div style="margin:6px 0 2px;">
        <span style="font-size:11px;font-family:'DM Mono',monospace;color:var(--muted);">PR: <span style="color:var(--accent);">${pr>0?pr+'kg':'—'}</span> · 1RM≈<span style="color:var(--info);">${oneRM}${oneRM!=='—'?'kg':''}</span></span>
      </div>
      ${sparkline}
      <div id="hist-${sid}" style="overflow:hidden;max-height:${histOpen?'500px':'0'};opacity:${histOpen?'1':'0'};transition:max-height .3s ease,opacity .2s ease;">
        ${histTable}
      </div>
      <div style="display:grid;grid-template-columns:${LOG_GRID_COLS};gap:5px;margin:10px 0 6px;">
        <span class="log-col-label">#</span><span class="log-col-label">kg</span><span class="log-col-label">Reps</span><span class="log-col-label">RIR</span><span class="log-col-label">Volumen</span><span></span>
      </div>
      ${ghostHtml}
      <div>${ex.sets.map((set,si)=>renderSetRow(dk,ei,si,set)).join('')}</div>
      <button class="btn-dashed" onclick="addSet('${dk}',${ei})" style="margin-top:6px;padding:7px;">+ Satz</button>`;
    el.appendChild(div);
  });
}
function renderSetRow(dk,ei,si,set){
  const kg=set.kg||'',reps=set.reps||'',rir=set.rir??'';
  const tonnage=getSetTonnage(set);
  const vol=tonnage>0?Math.round(tonnage)+'kg':'—';
  return`<div style="display:grid;grid-template-columns:${LOG_GRID_COLS};gap:5px;align-items:center;margin-bottom:7px;">
    <span class="log-set-num" style="display:flex;align-items:center;gap:2px;">
      <button type="button" aria-label="Aufwärmsatz" aria-pressed="${set.warmup===true}" onclick="toggleWarmup('${dk}',${ei},${si})" style="background:none;border:0;padding:0;font:inherit;font-size:10px;color:${set.warmup===true?'var(--accent)':'var(--muted)'};cursor:pointer;">W</button>${si+1}
    </span>
    <input class="log-input set-input" type="number" inputmode="decimal" placeholder="kg" value="${kg}" data-dk="${dk}" data-ei="${ei}" data-si="${si}" data-field="kg" min="0" step="0.5">
    <input class="log-input set-input" type="number" inputmode="numeric" placeholder="reps" value="${reps}" data-dk="${dk}" data-ei="${ei}" data-si="${si}" data-field="reps" min="0">
    <input class="log-input set-input" type="number" inputmode="numeric" placeholder="—" value="${rir}" data-dk="${dk}" data-ei="${ei}" data-si="${si}" data-field="rir" min="0" max="5" step="1">
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
function toggleWarmup(dk,ei,si){
  const set=logData[dk]?.exercises?.[ei]?.sets?.[si];
  if(!set)return;
  flushInputs(dk);
  set.warmup=!(set.warmup===true);
  saveLog();renderExercises(dk);bindSetInputs();
  renderWeekSummary();renderLogFeedback(dk);renderWeekFeedback();renderVolumeTracker();
}
function flushInputs(dk){
  document.querySelectorAll(`.set-input[data-dk="${dk}"]`).forEach(inp=>{
    const ei=+inp.dataset.ei,si=+inp.dataset.si,f=inp.dataset.field;
    if(logData[dk]?.exercises[ei]?.sets[si]!==undefined)
      logData[dk].exercises[ei].sets[si][f]=inp.value;
  });
}
function addSet(dk,ei){flushInputs(dk);logData[dk].exercises[ei].sets.push({kg:'',reps:'',rir:'',warmup:false});saveLog();renderExercises(dk);bindSetInputs();renderLogFeedback(dk);}
function removeSet(dk,ei,si){flushInputs(dk);if(logData[dk].exercises[ei].sets.length>1){logData[dk].exercises[ei].sets.splice(si,1);saveLog();renderExercises(dk);bindSetInputs();renderLogFeedback(dk);}}
function removeExercise(dk,ei){flushInputs(dk);_pendingDelete=null;logData[dk].exercises.splice(ei,1);saveLog();renderExercises(dk);bindSetInputs();renderWeekSummary();renderLogFeedback(dk);}
function addExercise(){
  const dk=getDateKey(logDateOffset);if(!logData[dk])logData[dk]={exercises:[],planDay:logPlanDay};
  const name=prompt('Übungsname:','');
  if(name&&name.trim()){
    const n=name.trim();const mg=getMuscleGroup(n)||'';
    logData[dk].exercises.push({name:n,sets:[{kg:'',reps:'',rir:'',warmup:false}],fromPlan:false,muscleGroup:mg});
    saveLog();renderExercises(dk);bindSetInputs();
    // Muskelgruppe unbekannt → direkt beim Anlegen abfragen
    if(!mg)pickMuscleGroup(dk,logData[dk].exercises.length-1);
  }
}

// ════════════════════════════════════════════
// PROGRESSIVE OVERLOAD
// ════════════════════════════════════════════
function _progressionContext(ex,dk){
  const cm=String(logData[dk]?.planDay||'').match(/^c(\d+)$/);
  const entry=cm&&customPlan?.[Number(cm[1])];
  if(ex.planTarget)return ex.planTarget;
  if(!entry?.programKey||entry.programArchived||ex.fromPlan!==true)return null;
  const unit=getProgramUnit(entry.programKey);
  const source=unit?.ex?.find(e=>e.name===ex.name);
  const target=source&&getProgramTarget(unit,source,getProgramWeek(dk));
  if(!target)return null;
  // Alte Logs behalten die bereits gespeicherte Satz-/Rep-/RIR-Vorgabe.
  const scheme=String(ex.scheme||'');
  const count=scheme.match(/^(\d+)\s*[×x]/);
  const reps=scheme.match(/[×x]\s*(\d+(?:\s*[-–]\s*\d+)?)/);
  const rir=scheme.match(/·\s*(.+?)\s+RIR/);
  if(count)target.sets=Number(count[1]);
  if(reps){const range=_programRange(reps[1]);target.repMin=range.min;target.repMax=range.max;}
  if(rir){
    const range=_programRange(rir[1]);
    if(range){
      target.rirMin=range.min;target.rirMax=range.max;target.lastRirMin=range.min;target.lastRirMax=range.max;
      const last=rir[1].match(/letzter Satz\s*(optional\s*)?(\d+(?:\s*[-–]\s*\d+)?)/i);
      if(last){const end=_programRange(last[2]);target.lastRirMin=last[1]?Math.min(range.min,end.min):end.min;target.lastRirMax=last[1]?Math.max(range.max,end.max):end.max;}
    }
  }
  return target;
}
function _evaluateProgression(ex,target){
  if(!target||![target.sets,target.repMin,target.repMax,target.rirMin,target.rirMax,target.lastRirMin,target.lastRirMax].every(Number.isFinite))
    return{status:'unknown',message:'Keine vollständige Planvorgabe – keine automatische Steigerung.'};
  const sets=(ex.sets||[]).filter(s=>s.warmup!==true);
  if(sets.length!==target.sets)return{status:'incomplete',message:`${target.sets} Arbeitssätze vorgesehen – Satzzahl prüfen, keine automatische Steigerung.`};
  const numeric=v=>v!==''&&v!==null&&v!==undefined&&Number.isFinite(Number(v));
  if(sets.some(s=>!numeric(s.reps)||!Number.isInteger(Number(s.reps))||Number(s.reps)<=0||!numeric(s.rir)||Number(s.rir)<0||Number(s.rir)>5))
    return{status:'incomplete',message:'Reps und RIR für alle Arbeitssätze eintragen; noch keine Steigerung.'};
  if(sets.some((s,i)=>Number(s.rir)<(i===sets.length-1?target.lastRirMin:target.rirMin)))
    return{status:'hold',message:'Näher am Versagen als geplant – zunächst das RIR-Ziel einhalten, keine zusätzliche Last.'};
  if(sets.some(s=>Number(s.reps)<target.repMax))
    return{status:'hold',message:`Last zunächst beibehalten; alle ${target.sets} Arbeitssätze bis ${target.repMax} Reps bei geplantem RIR aufbauen.`};
  if(sets.some((s,i)=>Number(s.rir)>(i===sets.length-1?target.lastRirMax:target.rirMax)))
    return{status:'review',message:'Rep-Ziel erreicht, RIR liegt außerhalb der Planvorgabe – Last und Technik prüfen.'};
  if(!Number.isFinite(target.step)||target.step<=0)return{status:'unknown',message:'Rep- und RIR-Ziel erreicht; passenden Lastschritt festlegen.'};
  if(sets.some(s=>!numeric(s.kg)||Number(s.kg)<0))return{status:'incomplete',message:'Rep- und RIR-Ziel erreicht; Lastangaben für eine konkrete Steigerung fehlen.'};
  const kg=Number(sets[0].kg);
  if(sets.some(s=>Number(s.kg)!==kg))return{status:'review',message:'Unterschiedliche Satzlasten – keine pauschale Laststeigerung.'};
  const next=Math.round((kg+target.step)*100)/100;
  const fmt=n=>n.toLocaleString('de-DE',{maximumFractionDigits:2});
  return{status:'increase',nextKg:next,message:`Alle ${target.sets} Arbeitssätze am Rep-Ziel und im RIR-Bereich: bei gleicher Technik nächstes Mal ${fmt(next)} kg (+${fmt(target.step)} kg); Reps wieder im Bereich ${target.repMin}–${target.repMax} aufbauen.`};
}
function getLastSession(ex,dk,target){
  for(const date of Object.keys(logData).filter(date=>date<dk).sort().reverse()){
    const previous=(logData[date]?.exercises||[]).find(candidate=>{
      if(candidate.name!==ex.name||(candidate.variant||'')!==(ex.variant||''))return false;
      const context=_progressionContext(candidate,date);
      return context&&context.unitKey===target.unitKey&&context.programInstanceId===target.programInstanceId&&context.exerciseKey===target.exerciseKey;
    });
    if(previous&&(previous.sets||[]).some(s=>s.warmup!==true&&(s.reps!==''&&s.reps!=null||s.kg!==''&&s.kg!=null)))
      return{exercise:previous,target:_progressionContext(previous,date),date};
  }
  return null;
}
function getOverloadSuggestion(ex,dk=getDateKey(logDateOffset)){
  if((ex.sets||[]).some(s=>s.warmup!==true&&(s.kg!==''&&s.kg!=null||s.reps!==''&&s.reps!=null)))return null;
  const target=_progressionContext(ex,dk);if(!target)return null;
  const last=getLastSession(ex,dk,target);if(!last)return null;
  const fields=['sets','repMin','repMax','rirMin','rirMax','lastRirMin','lastRirMax','step'];
  if(fields.some(field=>last.target[field]!==target[field]))return 'Neue Phasenvorgabe – Last passend zu Satzzahl, Rep-Bereich und RIR wählen.';
  return _evaluateProgression(last.exercise,last.target).message;
}

// ════════════════════════════════════════════
// WEEKLY VOLUME TRACKER
// ════════════════════════════════════════════
const VOLUME_TARGETS={
  'Brust':10,'Rücken':12,'Schulter':10,
  'Bizeps':8,'Trizeps':8,'Core':6,
  'Quadrizeps':10,'Hamstrings':8,'Gesäß':12,'Waden':6
};
// Log-Datum bestimmt sowohl Zeitraum als auch Ziele; ohne Programm bleibt
// die bisherige rollierende Sieben-Tage-Ansicht für heute bestehen.
function _getVolumePeriod(){
  const dk=getDateKey(logDateOffset);
  const range=typeof getProgramWeekRange==='function'?getProgramWeekRange(dk):null;
  if(range)return{...range,phase:getProgramPhase(range.week)};
  return{week:null,start:getDateKey(-6),end:getDateKey(0),phase:null};
}
function getWeeklyVolume(secondary=false,period=_getVolumePeriod()){
  const vol={};
  for(const dk of Object.keys(logData)){
    if(dk<period.start||dk>period.end)continue;
    const d=logData[dk];if(!d)continue;
    const cm=typeof d.planDay==='string'?d.planDay.match(/^c(\d+)$/):null;
    const entry=cm&&Array.isArray(customPlan)?customPlan[Number(cm[1])]:null;
    const unit=period.week&&!entry?.programArchived&&entry?.programKey&&typeof programData!=='undefined'&&Array.isArray(programData?.units)
      ?programData.units.find(u=>u&&u.key===entry.programKey):null;
    (d.exercises||[]).forEach(ex=>{
      const mg=ex.muscleGroup||getMuscleGroup(ex.name);
      if(!mg)return;
      const count=(ex.sets||[]).filter(isWorkSet).length;
      if(!count)return;
      if(!secondary){vol[mg]=(vol[mg]||0)+count;return;}
      const source=Array.isArray(unit?.ex)?unit.ex.find(e=>e&&e.name===ex.name):null;
      const groups=Array.isArray(source?.secondary)?source.secondary:[];
      new Set(groups).forEach(group=>{
        if(typeof group==='string'&&group&&group!==mg)vol[group]=(vol[group]||0)+count;
      });
    });
  }
  return vol;
}
function renderVolumeTracker(){
  const el=document.getElementById('volume-tracker');if(!el)return;
  const period=_getVolumePeriod();
  const vol=getWeeklyVolume(false,period),secondary=getWeeklyVolume(true,period);
  const phase=period.phase;
  const targets=phase&&phase.volumeTargets;
  const formatDate=dk=>new Date(dk+'T12:00:00').toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'});
  const periodLabel=(period.week?'Programmwoche '+period.week:'Letzte 7 Tage')+' · '+formatDate(period.start)+'–'+formatDate(period.end);
  const groups=new Set([...Object.keys(targets||{}),...Object.keys(vol),...Object.keys(secondary)]);
  const entries=[...groups].map(g=>[g,vol[g]||0]);
  if(!phase)entries.sort((a,b)=>b[1]-a[1]);
  const maxSets=Math.max(1,...Object.values(vol));
  const rows=entries.map(([group,count])=>{
    const target=targets&&targets[group];
    const hasTarget=typeof target==='number'&&Number.isFinite(target)&&target>=0;
    const pct=hasTarget&&target===0?0:Math.min(100,Math.round(count/(hasTarget?target:maxSets)*100));
    const color=hasTarget
      ?count>=target?'var(--accent)':count>=target*0.5?'var(--warn)':'var(--danger)'
      :'var(--muted)';
    return`<div>
      <div style="display:flex;justify-content:space-between;margin-bottom:6px;gap:4px;flex-wrap:wrap;">
        <span style="font-size:11px;">${group}</span>
        <span style="font-family:'DM Mono',monospace;font-size:10px;color:${color};">${count}${hasTarget?' / '+target+' Sätze':phase?' direkt':' Sätze'}${secondary[group]?` <small style="font-size:9px;color:var(--muted);">+${secondary[group]} sekundär</small>`:''}</span>
      </div>
      ${!phase||hasTarget?`<div style="height:3px;background:var(--border);border-radius:2px;margin-bottom:10px;">
        <div style="width:${pct}%;height:3px;background:${color};border-radius:2px;transition:width .4s ease;"></div>
      </div>`:''}
    </div>`;
  }).join('');
  const phaseLine=phase&&(phase.label||phase.task)
    ?'<div style="font-size:11px;color:var(--muted);margin-top:10px;padding-top:10px;border-top:1px solid var(--border);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'
      +[phase.label,phase.task].filter(Boolean).join(' · ')
      +'</div>'
    :'';
  const note=phase&&typeof programData.volumeNote==='string'?programData.volumeNote.trim():'';
  el.innerHTML='<div style="background:var(--surface);border-radius:12px;padding:16px;">'
    +'<div style="font-size:10px;color:var(--muted);font-family:\'DM Mono\',monospace;letter-spacing:.07em;margin-bottom:12px;">WOCHENVOLUMEN</div>'
    +'<div data-volume-period style="font-size:11px;color:var(--text2);margin-bottom:12px;">'+periodLabel+'</div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:0 16px;">'+rows+'</div>'
    +(phase?'':'<p class="hint-text-sm">Orientierung: ab etwa 10 Sätzen/Woche</p>')
    +phaseLine
    +(note?'<div data-volume-note style="font-size:11px;color:var(--muted);margin-top:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"></div>':'')
    +'</div>';
  if(note)el.querySelector('[data-volume-note]').textContent=note;
}

function renderWeekSummary(){
  let sessions=0,volume=0,totalSets=0,prs=0;const prSet=new Set();
  for(let i=-6;i<=0;i++){
    const dk=getDateKey(i),d=logData[dk];if(!d)continue;
    if((d.exercises||[]).some(ex=>(ex.sets||[]).some(isWorkSet)))sessions++;
    (d.exercises||[]).forEach(ex=>{
      // Volumen nur für gemappte Übungen — unmapped wird ignoriert
      const mapped=!!(ex.muscleGroup||getMuscleGroup(ex.name));
      if(mapped)(ex.sets||[]).forEach(s=>{
        volume+=getSetTonnage(s);
        if(isWorkSet(s))totalSets++;
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
  if(sh)sh.innerHTML=html||'<p class="hint-text">Noch keine Daten. Kraftwerte eintragen.</p>';
}

function renderLogFeedback(dk){
  const el=document.getElementById('log-ai-feedback');if(!el)return;
  const d=logData[dk];
  if(!d||!(d.exercises||[]).some(ex=>(ex.sets||[]).some(isWorkSet))){el.textContent='Trage Werte ein für Analyse...';return;}
  const totalVol=(d.exercises||[]).reduce((sum,ex)=>sum+(ex.sets||[]).reduce((s2,set)=>s2+getSetTonnage(set),0),0);
  const msgs=[];
  const newPRexes=d.exercises.filter(ex=>{const maxKg=Math.max(0,...ex.sets.map(s=>parseFloat(s.kg)||0));return maxKg>0&&maxKg===(prData[ex.name]||0);});
  if(newPRexes.length>0)msgs.push(`<strong>🏆 PR: ${newPRexes.map(e=>e.name).join(', ')}!</strong>`);
  if(totalVol>0)msgs.push(`Gesamtvolumen: <strong style="color:var(--accent);">${Math.round(totalVol).toLocaleString('de-DE')} kg</strong>.`);
  const sugg=d.exercises.map(ex=>{
    const target=_progressionContext(ex,dk);
    if(!target)return null;
    return`<strong>${ex.name}:</strong> ${_evaluateProgression(ex,target).message}`;
  }).filter(Boolean);
  if(sugg.length)msgs.push('<br><strong>Coach-Progression:</strong><br>'+sugg.join('<br>'));
  el.innerHTML=msgs.join(' ')||'Session gespeichert.';
}

function renderWeekFeedback(){
  let sessions=0,volume=0,lastWeekVol=0,kcalDays=0,kcalSum=0;
  for(let i=-6;i<=0;i++){
    const dk=getDateKey(i),d=logData[dk];
    if(d){if((d.exercises||[]).some(ex=>(ex.sets||[]).some(isWorkSet)))sessions++;(d.exercises||[]).forEach(ex=>(ex.sets||[]).forEach(s=>{volume+=getSetTonnage(s);}));}
    const dd=dailyData[dk];
    if(dd&&dd.meals&&dd.meals.length){const dayKcal=getDayKcal(dk);if(dayKcal>0){kcalDays++;kcalSum+=dayKcal;}}
  }
  for(let i=-13;i<=-7;i++){const d=logData[getDateKey(i)];if(!d)continue;(d.exercises||[]).forEach(ex=>(ex.sets||[]).forEach(s=>{lastWeekVol+=getSetTonnage(s);}));}
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

// ════════════════════════════════════════════
// PUBLIC API (von onclick=/onblur= benötigt)
// ════════════════════════════════════════════
window.toggleAnalyseBlock  =toggleAnalyseBlock;
window.setTrainingMode     =setTrainingMode;
window.changeLogDate       =changeLogDate;
window.changeLogPlanDay    =changeLogPlanDay;
window.addSet              =addSet;
window.toggleWarmup        =toggleWarmup;
window.removeSet           =removeSet;
window.removeExercise      =removeExercise;
window.addExercise         =addExercise;
window.showDayDetail       =showDayDetail;
window.selectLogDate       =selectLogDate;
window.editCustomDay       =editCustomDay;
window.addCustomEx         =addCustomEx;
window.removeCustomEx      =removeCustomEx;
window.updateCustomEx      =updateCustomEx;
window.updateCustomDayTitle=updateCustomDayTitle;
window._toggleUnitPicker   =_toggleUnitPicker;
window._planDayForDate     =_planDayForDate;
window._renderSelectedWorkout=_renderSelectedWorkout;
window.cycleVariant        =cycleVariant;
window.pickMuscleGroup     =pickMuscleGroup;
window._toggleHistory      =_toggleHistory;
window.renderExercises     =renderExercises;
window.bindSetInputs       =bindSetInputs;
