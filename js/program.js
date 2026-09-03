// ════════════════════════════════════════════
// PROGRAM — Trainingsprogramm als JSON importieren (nur Datenschicht).
// Einheiten werden zusätzlich in customPlan eingehängt und dort über das
// Feld programKey markiert. Einträge ohne programKey sind eigene und
// werden nie angefasst.
// Öffentlich (onclick): siehe PUBLIC-API-Block am Dateiende
// ════════════════════════════════════════════
var programData=null;
var programStart=null;

// ════════════════════════════════════════════
// VALIDIERUNG — kein Reparieren, kein Defaulten
// ════════════════════════════════════════════
function validateProgram(obj){
  if(!obj||typeof obj!=='object')return{ok:false,error:'Kein JSON-Objekt.'};
  if(obj.schemaVersion!==1)return{ok:false,error:'schemaVersion muss 1 sein (gefunden: '+obj.schemaVersion+').'};

  const weeks=obj.weeks;
  if(typeof weeks!=='number'||!Number.isInteger(weeks)||weeks<1||weeks>52)
    return{ok:false,error:'weeks muss eine ganze Zahl von 1 bis 52 sein (gefunden: '+weeks+').'};

  if(!Array.isArray(obj.units)||!obj.units.length)
    return{ok:false,error:'units muss ein nicht-leeres Array sein.'};
  for(let i=0;i<obj.units.length;i++){
    const u=obj.units[i];
    if(!u||typeof u!=='object')return{ok:false,error:'units['+i+'] ist kein Objekt.'};
    if(!u.key)return{ok:false,error:'units['+i+'] hat kein key.'};
    if(!u.title)return{ok:false,error:'units['+i+'] ('+u.key+') hat kein title.'};
  }

  if(!Array.isArray(obj.phases)||!obj.phases.length)
    return{ok:false,error:'phases muss ein nicht-leeres Array sein.'};

  // Wochen 1..weeks müssen lückenlos und überschneidungsfrei abgedeckt sein
  const seen={};
  for(let i=0;i<obj.phases.length;i++){
    const p=obj.phases[i];
    if(!p||typeof p!=='object')return{ok:false,error:'phases['+i+'] ist kein Objekt.'};
    if(!Array.isArray(p.weeks)||!p.weeks.length)
      return{ok:false,error:'phases['+i+'] hat kein nicht-leeres weeks-Array.'};
    if(!p.sets||typeof p.sets!=='object'||Array.isArray(p.sets))
      return{ok:false,error:'phases['+i+'] hat kein sets-Objekt.'};
    for(const w of p.weeks){
      if(typeof w!=='number'||!Number.isInteger(w)||w<1||w>weeks)
        return{ok:false,error:'phases['+i+'] enthält Woche '+w+', gültig ist 1 bis '+weeks+'.'};
      if(seen[w]!==undefined)
        return{ok:false,error:'Woche '+w+' ist doppelt belegt (phases['+seen[w]+'] und phases['+i+']).'};
      seen[w]=i;
    }
  }
  const missing=[];
  for(let w=1;w<=weeks;w++)if(seen[w]===undefined)missing.push(w);
  if(missing.length)
    return{ok:false,error:'Nicht abgedeckte Woche(n): '+missing.join(', ')+'.'};

  return{ok:true};
}

// ════════════════════════════════════════════
// PERSISTENZ
// ════════════════════════════════════════════
function saveProgram(){
  lsSet('vitale_program',programData);
  lsSet('vitale_program_start',programStart);
}
function loadProgram(){
  programData=lsGet('vitale_program',null);
  programStart=lsGet('vitale_program_start',null);
}

// ════════════════════════════════════════════
// IMPORT
// ════════════════════════════════════════════
function importProgram(text){
  const st=document.getElementById('program-status');
  const fail=msg=>{if(st)st.innerHTML='<span style="color:var(--danger);">'+msg+'</span>';};

  let parsed;
  try{parsed=JSON.parse(text);}
  catch(e){fail('JSON konnte nicht gelesen werden: '+e.message);return;}

  const check=validateProgram(parsed);
  if(!check.ok){fail('Ungültiges Programm: '+check.error);return;}

  programData=parsed;
  programStart=getTodayKey();

  // Re-Import: nur Programm-Einträge ersetzen, eigene Einträge bleiben
  if(!Array.isArray(customPlan))customPlan=[];
  customPlan=customPlan.filter(d=>!d||!d.programKey);
  programData.units.forEach(u=>{
    customPlan.push({
      title:u.title,
      programKey:u.key,
      // scheme bleibt leer — die Satzzahl kommt aus der Phase
      ex:(Array.isArray(u.ex)?u.ex:[]).map(e=>({
        name:typeof e==='string'?e:(e.name||''),
        muscleGroup:(typeof e==='object'&&e.muscleGroup)||'',
        scheme:''
      }))
    });
  });

  saveCustomPlan();
  saveProgram();
  renderCustomWeekGrid();
  renderLog();
  renderProgramStatus();
  if(st)st.innerHTML='<span style="color:var(--accent);">✓ '+programData.units.length+' Einheiten importiert · '+programData.weeks+' Wochen</span>';
}

function importProgramFile(event){
  const file=event.target.files[0];if(!file)return;
  const st=document.getElementById('program-status');
  const reader=new FileReader();
  reader.onload=e=>{
    try{importProgram(e.target.result);}
    catch(err){if(st)st.innerHTML='<span style="color:var(--danger);">Import-Fehler: '+err.message+'</span>';}
  };
  reader.onerror=()=>{
    if(st)st.innerHTML='<span style="color:var(--danger);">Datei konnte nicht gelesen werden.</span>';
  };
  reader.readAsText(file);
}

// ════════════════════════════════════════════
// ABFRAGEN
// ════════════════════════════════════════════
// Datums-Keys als Kalendertage rechnen, unabhängig von Sommer-/Winterzeit.
function _programDaysSinceStart(dateKey=getTodayKey()){
  const a=Date.parse(programStart+'T00:00:00Z');
  const b=Date.parse(dateKey+'T00:00:00Z');
  return Math.floor((b-a)/86400000);
}
function getProgramWeek(dateKey=getTodayKey()){
  if(!programData||!programStart)return null;
  const days=_programDaysSinceStart(dateKey);
  if(!Number.isFinite(days)||days<0)return null;
  const week=Math.floor(days/7)+1;
  return week>programData.weeks?null:week;
}
// Inklusive Grenzen der Programmwoche des gewählten Trainingsdatums.
function getProgramWeekRange(dateKey=getTodayKey()){
  const week=getProgramWeek(dateKey);
  if(!week)return null;
  const startMs=Date.parse(programStart+'T00:00:00Z')+(week-1)*7*86400000;
  return{week,start:new Date(startMs).toISOString().slice(0,10),end:new Date(startMs+6*86400000).toISOString().slice(0,10)};
}
function getProgramPhase(week){
  if(!programData)return null;
  const w=week===undefined?getProgramWeek():week;
  if(!w)return null;
  return programData.phases.find(p=>p.weeks.indexOf(w)!==-1)||null;
}
function getProgramUnit(programKey){
  if(!programData||!programKey)return null;
  return programData.units.find(u=>u.key===programKey)||null;
}

// ════════════════════════════════════════════
// PHASENABLEITUNG — Sätze, Rep-Bereich, RIR
// ════════════════════════════════════════════
// Satzzahl einer Programm-Übung. ex.sets schlägt die Phase (Upper-Übungen),
// sonst kommt der Wert über ex.slot aus phase.sets. Ohne beides: 0 = überspringen.
function getProgramSets(unit,ex,week){
  if(!ex)return 0;
  if(ex.sets!==undefined&&ex.sets!==null)return parseInt(ex.sets,10)||0;
  if(!ex.slot)return 0;
  const phase=getProgramPhase(week);
  if(!phase||!phase.sets)return 0;
  return parseInt(phase.sets[ex.slot],10)||0;
}
// Anzeigeschema, z. B. "3×6–10 · 1–2 RIR" (Gedankenstrich, kein Bindestrich).
function getProgramScheme(unit,ex,week){
  if(!ex)return'';
  const sets=getProgramSets(unit,ex,week);
  if(!sets)return'';
  const phase=getProgramPhase(week);
  const reps=ex.reps||(phase&&phase.reps)||'';
  const rir=(phase&&phase.isoRir&&ex.slot==='iso')?phase.isoRir:(phase&&phase.rir)||'';
  let out=sets+'×'+String(reps).replace(/-/g,'–');
  if(rir)out+=' · '+String(rir).replace(/-/g,'–')+' RIR';
  return out;
}
// Übungen einer Programm-Einheit, sofern der customPlan-Eintrag ein
// programKey trägt und das Programm aktiv ist. Sonst null.
function getProgramExercises(programKey,week){
  const w=week===undefined?getProgramWeek():week;
  if(!w)return null; // kein/abgelaufenes Programm -> Aufrufer nutzt customPlan
  const unit=getProgramUnit(programKey);
  if(!unit||!Array.isArray(unit.ex))return null;
  return unit.ex.map(e=>({
    name:e.name||'',
    muscleGroup:e.muscleGroup||'',
    scheme:getProgramScheme(unit,e,w),
    sets:getProgramSets(unit,e,w)
  })).filter(e=>e.name&&e.sets>0); // ohne Satzzahl wird übersprungen
}

// ════════════════════════════════════════════
// UI
// ════════════════════════════════════════════
// Einstellungen: Detailblock inkl. Laden/Entfernen
function renderProgramStatus(){
  const el=document.getElementById('program-info');
  const loadBtn=document.getElementById('program-load-btn');
  const removeWrap=document.getElementById('program-remove-wrap');
  const active=!!(programData&&programStart);

  if(loadBtn)loadBtn.textContent=active?'Anderes Programm laden':'Programm laden';
  if(removeWrap)removeWrap.innerHTML=active
    ?'<button class="btn-ghost" style="margin-top:10px;width:100%;color:var(--danger);border-color:rgba(255,87,87,0.3);" onclick="removeProgram()">🗑 Programm entfernen</button>'
    :'';

  if(el){
    if(!active){el.innerHTML='';}
    else{
      const week=getProgramWeek();
      const phase=getProgramPhase(week);
      const name=programData.name||'Programm';
      el.innerHTML=`<div style="font-size:13px;font-weight:600;color:var(--text);">${name}</div>`
        +(week
          ?`<div style="font-size:11px;color:var(--muted);font-family:'DM Mono',monospace;margin-top:3px;">Woche ${week} von ${programData.weeks}${phase&&phase.label?' · '+phase.label:''}</div>`
          :`<div style="font-size:11px;color:var(--muted);margin-top:3px;">Programm abgeschlossen</div>`)
        +`<div style="font-size:11px;color:var(--muted);font-family:'DM Mono',monospace;margin-top:2px;">Start: ${programStart}</div>`;
    }
  }
  renderProgramLine();
}
// Training-Tab: einzeilige Statuszeile über dem Wochenraster
function renderProgramLine(){
  const line=document.getElementById('program-line');if(!line)return;
  const week=getProgramWeek();
  if(!programData||!week){line.innerHTML='';line.style.display='none';return;}
  const phase=getProgramPhase(week);
  line.style.display='block';
  line.textContent=(programData.name||'Programm')+' · Woche '+week+(phase&&phase.label?' · '+phase.label:'');
}
// Entfernt das Programm samt seiner customPlan-Einträge.
// logData und eigene Einheiten (ohne programKey) bleiben unangetastet.
function removeProgram(){
  showModal(
    'Programm entfernen?',
    'Das Programm und seine Einheiten werden entfernt. Eingetragene Trainings und eigene Einheiten bleiben erhalten.',
    function(){
      programData=null;
      programStart=null;
      lsSet('vitale_program',null);
      lsSet('vitale_program_start',null);
      if(Array.isArray(customPlan)){
        customPlan=customPlan.filter(d=>!d||!d.programKey);
        saveCustomPlan();
      }
      renderCustomWeekGrid();
      renderLog();
      if(typeof renderVolumeTracker==='function')renderVolumeTracker();
      renderProgramStatus();
      const st=document.getElementById('program-status');
      if(st)st.innerHTML='<span style="color:var(--muted);">Programm entfernt.</span>';
    }
  );
}

// ════════════════════════════════════════════
// PUBLIC API (von onclick= benötigt)
// ════════════════════════════════════════════
window.importProgram      =importProgram;
window.importProgramFile  =importProgramFile;
window.getProgramWeek     =getProgramWeek;
window.getProgramWeekRange=getProgramWeekRange;
window.getProgramPhase    =getProgramPhase;
window.getProgramUnit     =getProgramUnit;
window.getProgramSets     =getProgramSets;
window.getProgramScheme   =getProgramScheme;
window.getProgramExercises=getProgramExercises;
window.validateProgram    =validateProgram;
window.loadProgram        =loadProgram;
window.renderProgramStatus=renderProgramStatus;
window.renderProgramLine  =renderProgramLine;
window.removeProgram      =removeProgram;
