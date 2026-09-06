// ════════════════════════════════════════════
// PROGRAM — Trainingsprogramm als JSON importieren (nur Datenschicht).
// Einheiten werden zusätzlich in customPlan eingehängt und dort über das
// Feld programKey markiert. Einträge ohne programKey sind eigene und
// werden nie angefasst.
// Öffentlich (onclick): siehe PUBLIC-API-Block am Dateiende
// ════════════════════════════════════════════
var programData=null;
var programStart=null;
var programInstanceId=null;

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
  const unitKeys=new Set();
  for(let i=0;i<obj.units.length;i++){
    const u=obj.units[i];
    if(!u||typeof u!=='object')return{ok:false,error:'units['+i+'] ist kein Objekt.'};
    if(typeof u.key!=='string'||!u.key.trim()||unitKeys.has(u.key))return{ok:false,error:'Einheiten brauchen eindeutige, nicht-leere Schlüssel.'};
    unitKeys.add(u.key);
    if(!Array.isArray(u.ex)||u.ex.some(e=>!e||typeof e.name!=='string'||!e.name.trim()))return{ok:false,error:'Ungültige Übungsliste in '+u.key+'.'};
    if(new Set(u.ex.map(e=>e.key||e.name)).size!==u.ex.length)return{ok:false,error:'Doppelte Übungen in '+u.key+'.'};
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
  lsSet('vitale_program_instance',programInstanceId);
}
function loadProgram(){
  const journal=lsGet('vitale_program_transaction',null);
  if(journal){
    try{
      for(const key of ['vitale_program','vitale_program_start','hc_customplan','vitale_program_instance']){
        if(Object.prototype.hasOwnProperty.call(journal,key)){
          if(journal[key]===null)localStorage.removeItem(key);else localStorage.setItem(key,journal[key]);
        }
      }
      localStorage.removeItem('vitale_program_transaction');
      customPlan=lsGet('hc_customplan',null);
    }catch(error){console.warn('Programm konnte nicht vollständig wiederhergestellt werden.');}
  }
  programInstanceId=lsGet('vitale_program_instance',null);
  programData=lsGet('vitale_program',null);
  programStart=lsGet('vitale_program_start',null);
}

// ════════════════════════════════════════════
// IMPORT
// ════════════════════════════════════════════
function _programStatus(message,error=false){
  const el=document.getElementById('program-status');
  if(el){el.textContent=message;el.style.color=error?'var(--danger)':'var(--accent)';}
}
function _programInstance(){return programInstanceId||(programData&&programStart?programStart+'|'+programData.name:null);}
function _commitProgram(nextProgram,nextStart,nextPlan,nextInstance){
  // Ein Journal ermöglicht auch nach einem unterbrochenen Schreibvorgang Rollback.
  const updates={vitale_program:nextProgram,vitale_program_start:nextStart,hc_customplan:nextPlan,vitale_program_instance:nextInstance};
  const before={};
  try{
    for(const key of Object.keys(updates))before[key]=localStorage.getItem(key);
    localStorage.setItem('vitale_program_transaction',JSON.stringify(before));
    for(const [key,value] of Object.entries(updates))localStorage.setItem(key,JSON.stringify(value));
    localStorage.removeItem('vitale_program_transaction');
  }catch(error){
    let restored=true;
    for(const [key,value] of Object.entries(before)){
      try{if(value===null)localStorage.removeItem(key);else localStorage.setItem(key,value);}catch(_ignored){restored=false;}
    }
    if(restored){try{localStorage.removeItem('vitale_program_transaction');}catch(_ignored){}}
    _programStatus('Speichern fehlgeschlagen. Der bisherige Plan bleibt aktiv; bitte Speicherplatz prüfen.',true);
    return false;
  }
  programData=nextProgram;programStart=nextStart;customPlan=nextPlan;programInstanceId=nextInstance;
  return true;
}
function importProgram(text,mode='new'){
  let parsed;
  try{parsed=JSON.parse(text);}catch(error){_programStatus('JSON konnte nicht gelesen werden: '+error.message,true);return false;}
  const check=validateProgram(parsed);
  if(!check.ok){_programStatus('Ungültiges Programm: '+check.error,true);return false;}
  if(mode==='update'&&(!programData||!programStart)){_programStatus('Kein bestehendes Programm zum Aktualisieren vorhanden.',true);return false;}
  const updating=mode==='update';
  const current=Array.isArray(customPlan)?customPlan:[];
  const previousInstance=_programInstance();
  const instance=updating?previousInstance:getTodayKey()+'|'+Date.now()+'|'+Math.random().toString(36).slice(2);
  const start=updating?programStart:getTodayKey();
  const makeEntry=u=>({title:u.title,programKey:u.key,programInstanceId:instance,ex:u.ex.map(e=>({name:e.name,muscleGroup:e.muscleGroup||'',scheme:''}))});
  const byKey=new Map(parsed.units.map(u=>[u.key,u]));
  const used=new Set();
  // Niemals filtern oder sortieren: c0/c1/... bleiben für vorhandene Logs stabil.
  const next=current.map(entry=>{
    if(!entry||!entry.programKey)return entry;
    const belongs=!entry.programArchived&&(!entry.programInstanceId||entry.programInstanceId===previousInstance);
    if(updating&&belongs&&byKey.has(entry.programKey)){
      used.add(entry.programKey);
      return{...entry,...makeEntry(byKey.get(entry.programKey)),programArchived:false};
    }
    return{...entry,programInstanceId:entry.programInstanceId||previousInstance,programArchived:true};
  });
  if(updating&&current.some(e=>e?.programKey&&!e.programArchived)&&!used.size){
    _programStatus('Keine passenden Einheiten gefunden. Für einen anderen Plan bitte „Neues Programm starten“ verwenden.',true);return false;
  }
  for(const u of parsed.units)if(!used.has(u.key))next.push(makeEntry(u));
  if(!_commitProgram(parsed,start,next,instance))return false;
  renderCustomWeekGrid();renderLog();renderProgramStatus();
  _programStatus(updating?'✓ Plan aktualisiert. Startdatum und gespeicherte Trainings bleiben erhalten.':'✓ Neues Programm gestartet. Frühere Trainings bleiben erhalten.');
  return true;
}
function importProgramFile(event,mode='new'){
  const input=event.target,file=input.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=e=>{
    input.value='';
    const apply=()=>importProgram(e.target.result,mode);
    if(mode==='new'&&programData){
      showModal('Neues Programm starten?','Der neue Plan beginnt heute. Frühere Einheiten und Trainings bleiben im Verlauf erhalten.',apply);
    }else apply();
  };
  reader.onerror=()=>{input.value='';_programStatus('Datei konnte nicht gelesen werden.',true);};
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
  const reps=ex.reps||(Number.isFinite(ex.repMin)&&Number.isFinite(ex.repMax)?ex.repMin+'–'+ex.repMax:'')||(phase&&phase.reps)||'';
  const rir=(phase&&phase.isoRir&&ex.slot==='iso')?phase.isoRir:(phase&&phase.rir)||'';
  let out=sets+'×'+String(reps).replace(/-/g,'–');
  if(rir)out+=' · '+(Array.isArray(rir)?rir.join('–'):String(rir)).replace(/-/g,'–')+' RIR';
  return out;
}
// Übungen einer Programm-Einheit, sofern der customPlan-Eintrag ein
// programKey trägt und das Programm aktiv ist. Sonst null.
function _programRange(value){
  if(Array.isArray(value)&&value.length&&value.every(n=>Number.isFinite(Number(n))))return{min:Number(value[0]),max:Number(value[value.length-1])};
  const match=String(value??'').match(/^(\d+(?:\.\d+)?)(?:\s*[-–,]\s*(\d+(?:\.\d+)?))?/);
  return match?{min:Number(match[1]),max:Number(match[2]||match[1])}:null;
}
function getProgramTarget(unit,ex,week){
  const phase=getProgramPhase(week);if(!phase||!ex)return null;
  const reps=Number.isFinite(ex.repMin)&&Number.isFinite(ex.repMax)?{min:ex.repMin,max:ex.repMax}:_programRange(ex.reps||phase.reps);
  const rirText=(ex.slot==='iso'&&phase.isoRir)?phase.isoRir:phase.rir??ex.rir;
  const rir=_programRange(rirText);
  const lastMatch=String(rirText??'').match(/letzter Satz\s*(optional\s*)?(\d+(?:\s*[-–]\s*\d+)?)/i);
  let lastRir=lastMatch?_programRange(lastMatch[2]):rir;
  if(lastMatch?.[1]&&rir&&lastRir)lastRir={min:Math.min(rir.min,lastRir.min),max:Math.max(rir.max,lastRir.max)};
  return{unitKey:unit.key,programInstanceId:_programInstance(),exerciseKey:ex.key||ex.name,
    sets:getProgramSets(unit,ex,week),repMin:reps?.min??null,repMax:reps?.max??null,
    rirMin:rir?.min??null,rirMax:rir?.max??null,lastRirMin:lastRir?.min??null,lastRirMax:lastRir?.max??null,
    step:Number(ex.step)>0?Number(ex.step):null,week};
}

function getProgramExercises(programKey,week){
  const w=week===undefined?getProgramWeek():week;
  if(!w)return null; // kein/abgelaufenes Programm -> Aufrufer nutzt customPlan
  const unit=getProgramUnit(programKey);
  if(!unit||!Array.isArray(unit.ex))return null;
  return unit.ex.map(e=>({
    name:e.name||'',
    muscleGroup:e.muscleGroup||'',
    scheme:getProgramScheme(unit,e,w),
    sets:getProgramSets(unit,e,w),
    planTarget:getProgramTarget(unit,e,w)
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

  if(loadBtn)loadBtn.textContent=active?'Neues Programm starten':'Programm laden';
  const updateBtn=document.getElementById('program-update-btn');
  if(updateBtn)updateBtn.style.display=active?'block':'none';
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
        customPlan=customPlan.map(d=>d?.programKey?{...d,programInstanceId:d.programInstanceId||programInstanceId,programArchived:true}:d);
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
