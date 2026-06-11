// ════════════════════════════════════════════
// HEALTH IMPORT
// ════════════════════════════════════════════

// Whitelist: nur diese Feldnamen gelten als eindeutig "Aktive Kalorien"
// Explizit ausgeschlossen: basal, resting, dietary, total, goal, stand
const ACTIVE_ENERGY_WHITELIST=['active_energy','active_energy_burned','activeenergyburned','apple_exercise_energy'];
function _isActiveEnergyField(name){
  const n=name.toLowerCase().replace(/[\s-]/g,'_');
  if(/basal|resting|dietary|total|goal|stand/.test(n))return false;
  return ACTIVE_ENERGY_WHITELIST.some(w=>n===w||n===w.replace(/_/g,''));
}

function importHealthFile(event){
  const file=event.target.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=function(e){
    try{
      const content=e.target.result;
      let imported=file.name.endsWith('.json')?parseHealthJSON(JSON.parse(content)):parseHealthCSV(content);

      const diag=imported._kcalDiag||[];
      console.log('[HealthImport] Alle Kalorienfelder in der Datei:',
        diag.length?diag.map(d=>d.field+' = '+d.total+(d.selected?' ← VERWENDET':' (ignoriert)')).join(' | '):'keine gefunden');
      console.log('[HealthImport] Verwendetes Kalorienfeld:',imported._burnedField||'—');

      let diagHtml='';
      if(diag.length){
        const rows=diag.map(d=>{
          const marker=d.selected?'<strong style="color:var(--accent);">✓ verwendet</strong>':'<span style="color:var(--muted);">ignoriert</span>';
          return`<span style="font-family:'DM Mono',monospace;font-size:10px;">${d.field}: ${d.total} &nbsp;${marker}</span>`;
        });
        diagHtml='<div style="margin-top:6px;border-top:1px solid var(--border);padding-top:6px;">'
          +'<div style="font-size:10px;color:var(--muted);margin-bottom:4px;font-family:\'DM Mono\',monospace;">ALLE KALORIENFELDER IN DER DATEI:</div>'
          +rows.join('<br>')+'</div>';
      }

      const activeMatches=diag.filter(d=>d.selected);
      if(activeMatches.length>1){
        document.getElementById('import-status').innerHTML=
          '<span style="color:var(--warn);">⚠ Mehrere Kalorienfelder als „Aktive Kalorien" erkannt — bitte prüfen:</span><br>'
          +activeMatches.map(d=>d.field+': '+d.total).join(', ')+diagHtml;
        return;
      }

      let unitConvNote='';
      if(imported.burned&&healthEnergyUnit==='kj'){
        const rawKj=Math.round(imported.burned);
        imported.burned=Math.round(imported.burned/4.18);
        unitConvNote='Aktive Kalorien: '+rawKj+' kJ → '+imported.burned+' kcal';
        console.log('[HealthImport] kJ-Konvertierung:',rawKj,'kJ →',imported.burned,'kcal');
      }

      if(imported.burned&&healthEnergyUnit==='kcal'&&imported.burned>1200){
        const approxKcal=Math.round(imported.burned/4.184);
        document.getElementById('import-status').innerHTML=
          '<span style="color:var(--warn);">⚠ Importierter Wert: <strong>'+Math.round(imported.burned)+'</strong> — möglicherweise Kilojoule statt kcal '
          +'('+Math.round(imported.burned)+' kJ ÷ 4,18 ≈ '+approxKcal+' kcal).</span><br>'
          +'<span style="font-size:11px;color:var(--muted);">Bitte Einheit in Health Auto Export prüfen (Einstellungen → Einheiten → Energie).'
          +'<br>Feld erkannt: <strong>'+imported._burnedField+'</strong></span>'
          +diagHtml
          +'<div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap;">'
          +'<button class="btn-ghost" style="font-size:12px;" onclick="_applyImportBurned('+Math.round(imported.burned)+')">Wert so übernehmen ('+Math.round(imported.burned)+' kcal)</button>'
          +'<button class="btn-ghost" style="font-size:12px;color:var(--accent);border-color:rgba(0,229,160,0.3);" onclick="_applyImportBurned('+approxKcal+')">Als kJ interpretieren → '+approxKcal+' kcal</button>'
          +'</div>';
        _applyImportNonCalorie(imported);
        return;
      }

      let anyValue=false;const meta={};
      if(imported.hrv){setVal('hrv',Math.max(20,Math.min(200,Math.round(imported.hrv))));meta.hrv=Math.round(imported.hrv);anyValue=true;}
      if(imported.rhr){setVal('rhr',Math.max(40,Math.min(90,Math.round(imported.rhr))));meta.rhr=Math.round(imported.rhr);anyValue=true;}
      if(imported.steps){setVal('steps',Math.min(25000,Math.round(imported.steps)));meta.steps=Math.round(imported.steps);anyValue=true;}
      if(imported.sleep){
        let sleepH=imported.sleep;
        if(sleepH>24)sleepH=sleepH/60;
        sleepH=Math.round(sleepH*10)/10;
        const sleepScore=Math.max(1,Math.min(10,Math.round((sleepH-4)/4*9+1)));
        setVal('sleep',sleepScore);
        meta.sleepH=imported.sleepTotalH?Math.round(imported.sleepTotalH*10)/10:sleepH;
        anyValue=true;
      }
      if(imported.burned){
        getDay(getTodayKey()).burned=Math.round(imported.burned);saveDaily();
        meta.burned=Math.round(imported.burned);anyValue=true;
        if(unitConvNote)meta.burnedNote=unitConvNote;
      }
      if(imported.sleepPhases&&imported.sleepPhases.total>0){
        renderSleepAnalysis(imported.sleepPhases);
        meta.sleepStages=imported.sleepPhases;
      }
      if(anyValue){
        lastHealthImportDate=getTodayKey();lastHealthImportValues=meta;
        watchAvailable=true;
        stagesAvailable=!!(lastHealthImportValues?.sleepStages);
        saveAll();updateAll();lockSliders();
        renderImportStatus();
        if(diagHtml){const el=document.getElementById('import-status');if(el)el.innerHTML+=diagHtml;}
      } else {
        document.getElementById('import-status').innerHTML=
          '<span style="color:var(--warn);">Keine Werte erkannt. Prüfe ob HRV, Schritte, Schlaf oder Aktive Kalorien in der Datei vorhanden sind.</span>'
          +diagHtml;
      }
    }catch(err){
      document.getElementById('import-status').innerHTML=
        '<span style="color:var(--danger);">Import-Fehler: '+err.message+'</span>';
    }
  };
  reader.readAsText(file);
}

function _applyImportBurned(kcal){
  getDay(getTodayKey()).burned=kcal;saveDaily();
  lastHealthImportValues=Object.assign(lastHealthImportValues||{},{burned:kcal});
  lastHealthImportDate=getTodayKey();
  watchAvailable=true;
  stagesAvailable=!!(lastHealthImportValues?.sleepStages);
  saveAll();updateAll();lockSliders();renderImportStatus();
}
function _applyImportNonCalorie(imported){
  const meta={};
  if(imported.hrv){setVal('hrv',Math.max(20,Math.min(200,Math.round(imported.hrv))));meta.hrv=Math.round(imported.hrv);}
  if(imported.rhr){setVal('rhr',Math.max(40,Math.min(90,Math.round(imported.rhr))));meta.rhr=Math.round(imported.rhr);}
  if(imported.steps){setVal('steps',Math.min(25000,Math.round(imported.steps)));meta.steps=Math.round(imported.steps);}
  if(imported.sleep){
    let sleepH=imported.sleep;if(sleepH>24)sleepH=sleepH/60;sleepH=Math.round(sleepH*10)/10;
    const sleepScore=Math.max(1,Math.min(10,Math.round((sleepH-4)/4*9+1)));
    setVal('sleep',sleepScore);meta.sleepH=sleepH;
  }
  if(Object.keys(meta).length){
    lastHealthImportValues=meta;lastHealthImportDate=getTodayKey();
    watchAvailable=true;
    stagesAvailable=!!(lastHealthImportValues?.sleepStages);
    saveAll();updateAll();lockSliders();
  }
}

function parseHealthJSON(data){
  const out={sleepPhases:{deep:0,rem:0,light:0,total:0},_kcalDiag:[],_burnedField:null};
  const metrics=data.data?.metrics||data.metrics||[];
  if(Array.isArray(metrics)){
    metrics.forEach(m=>{
      const name=(m.name||'').toLowerCase();
      const entries=Array.isArray(m.data)?m.data:[];
      const last=entries.length?entries[entries.length-1]:null;
      const qty=last?(parseFloat(last.qty||last.value||last.Avg)||0):0;
      const dayTotal=entries.length?entries.reduce((a,e)=>a+(parseFloat(e.qty||e.value)||0),0):qty;

      if(/energy|calori|burned|calories/.test(name)){
        out._kcalDiag.push({field:m.name,total:Math.round(dayTotal||qty),selected:false});
      }

      if(name.includes('heart_rate_variability')&&entries.length){
        const vals=entries.map(e=>parseFloat(e.qty||e.value||e.Avg)||0).filter(v=>v>0);
        console.log('[HealthImport] HRV raw entries:',entries.slice(0,5),'→ avg:',vals.length?Math.round(vals.reduce((a,b)=>a+b,0)/vals.length):0,'ms');
        if(vals.length)out.hrv=vals.reduce((a,b)=>a+b,0)/vals.length;
      }
      else if(name.includes('resting_heart_rate')&&qty>0)out.rhr=qty;
      else if(name.includes('step_count')&&qty>0)out.steps=qty;
      else if(_isActiveEnergyField(name)){
        out.burned=(out.burned||0)+(dayTotal||qty);
        out._burnedField=m.name;
        const d=out._kcalDiag.find(x=>x.field===m.name);if(d)d.selected=true;
      }
      else if(name==='sleep_analysis'){
        // HAE v2: each entry has qty (hours) + value (stage name)
        const stageH={awake:0,rem:0,core:0,deep:0};let hasStages=false;
        entries.forEach(e=>{
          const h=parseFloat(e.qty)||0;if(h<=0)return;
          const v=(e.value||'').toLowerCase().trim();
          if(v==='awake'){stageH.awake+=h;hasStages=true;}
          else if(v==='rem'){stageH.rem+=h;hasStages=true;}
          else if(v==='core'){stageH.core+=h;hasStages=true;}
          else if(v==='deep'){stageH.deep+=h;hasStages=true;}
        });
        const asleepH=stageH.rem+stageH.core+stageH.deep;
        out.sleep=asleepH>0?asleepH:(dayTotal||qty);
        out.sleepTotalH=(asleepH+stageH.awake)||out.sleep;
        if(hasStages){
          out.sleepPhases={
            deep:Math.round(stageH.deep*60),
            rem:Math.round(stageH.rem*60),
            light:Math.round(stageH.core*60),
            total:Math.round(asleepH*60)
          };
        }
      }
      else if(name.includes('sleep')&&!out.sleep){
        const totalH=entries.reduce((a,e)=>a+(parseFloat(e.qty)||0),0);
        out.sleep=totalH>0?totalH:qty;
      }
      else if(name.includes('deep_sleep')){out.sleepPhases.deep+=dayTotal||qty;}
      else if(name.includes('rem_sleep')){out.sleepPhases.rem+=dayTotal||qty;}
      else if(name.includes('core_sleep')||name.includes('light_sleep')){out.sleepPhases.light+=dayTotal||qty;}
    });
    out.sleepPhases.total=out.sleepPhases.deep+out.sleepPhases.rem+out.sleepPhases.light;
  }
  return out;
}

function parseHealthCSV(content){
  const out={_kcalDiag:[],_burnedField:null};
  const lines=content.split(/\r?\n/).filter(l=>l.trim());if(lines.length<2)return out;
  const header=lines[0].toLowerCase().split(/[,;]/);
  const lastRow=lines[lines.length-1].split(/[,;]/);
  header.forEach((h,i)=>{
    const hTrim=h.trim();
    const v=parseFloat(lastRow[i]);
    if(/energy|calori|burned|calories/.test(hTrim)){
      out._kcalDiag.push({field:lines[0].split(/[,;]/)[i].trim(),total:isNaN(v)?'?':Math.round(v),selected:false});
    }
    if(isNaN(v))return;
    if(hTrim.includes('hrv')||hTrim.includes('variability'))out.hrv=v;
    else if(hTrim.includes('resting')&&hTrim.includes('heart'))out.rhr=v;
    else if(hTrim.includes('step'))out.steps=v;
    else if(hTrim.includes('sleep')&&!hTrim.includes('deep')&&!hTrim.includes('rem'))out.sleep=v;
    else if(_isActiveEnergyField(hTrim)){
      out.burned=(out.burned||0)+v;
      out._burnedField=lines[0].split(/[,;]/)[i].trim();
      const d=out._kcalDiag.find(x=>x.field===out._burnedField);if(d)d.selected=true;
    }
  });
  return out;
}

// ════════════════════════════════════════════
// SILENT IMPORT (auto-fetch / programmatic)
// ════════════════════════════════════════════
function importHealthData(rawJson){
  try{
    const metrics=rawJson?.data?.metrics;
    if(!Array.isArray(metrics)||!metrics.length)return;

    // Returns the most-recent qty for a named metric (good for step_count, active_energy, etc.)
    function latest(name){
      const m=metrics.find(m=>m.name===name);
      if(!m)return null;
      const entries=Array.isArray(m.data)?m.data:[];
      if(!entries.length)return null;
      const sorted=entries.slice().sort((a,b)=>new Date(b.date)-new Date(a.date));
      return parseFloat(sorted[0].qty)||null;
    }
    // Returns the daily average qty for a named metric (correct for HRV, RHR)
    function avgMetric(name){
      const m=metrics.find(m=>m.name===name);
      if(!m)return null;
      const entries=Array.isArray(m.data)?m.data:[];
      const vals=entries.map(e=>parseFloat(e.qty)).filter(v=>v>0);
      if(!vals.length)return null;
      return vals.reduce((a,b)=>a+b,0)/vals.length;
    }

    let anyValue=false;const meta={};

    const hrv=avgMetric('heart_rate_variability_sdnn');
    console.log('[HealthImport] HRV raw entries (webhook):',metrics.find(m=>m.name==='heart_rate_variability_sdnn')?.data?.slice(0,5),'→ avg:',hrv?Math.round(hrv):0,'ms');
    if(hrv>0){setVal('hrv',Math.max(20,Math.min(200,Math.round(hrv))));meta.hrv=Math.round(hrv);anyValue=true;}

    const rhr=latest('resting_heart_rate');
    if(rhr>0){setVal('rhr',Math.max(40,Math.min(90,Math.round(rhr))));meta.rhr=Math.round(rhr);anyValue=true;}

    // Sleep: parse per-stage entries (HAE v2 format)
    const sleepMetric=metrics.find(m=>m.name==='sleep_analysis');
    const sleepEntries=Array.isArray(sleepMetric?.data)?sleepMetric.data:[];
    console.log('[HealthImport] sleep_analysis raw:',JSON.stringify(sleepEntries.slice(0,5),null,2));
    const stageH={awake:0,rem:0,core:0,deep:0};let hasStages=false;
    sleepEntries.forEach(e=>{
      const h=parseFloat(e.qty)||0;if(h<=0)return;
      const v=(e.value||'').toLowerCase().trim();
      if(v==='awake'){stageH.awake+=h;hasStages=true;}
      else if(v==='rem'){stageH.rem+=h;hasStages=true;}
      else if(v==='core'){stageH.core+=h;hasStages=true;}
      else if(v==='deep'){stageH.deep+=h;hasStages=true;}
    });
    const asleepH=stageH.rem+stageH.core+stageH.deep;
    const sleepHForScore=asleepH||(sleepEntries.length?parseFloat(sleepEntries[sleepEntries.length-1].qty)||0:0);
    if(sleepHForScore>0){
      const h=Math.round(sleepHForScore*10)/10;
      const score=Math.max(1,Math.min(10,Math.round((h-4)/4*9+1)));
      setVal('sleep',score);
      meta.sleepH=Math.round(((asleepH+stageH.awake)||sleepHForScore)*10)/10;
      anyValue=true;
    }
    if(hasStages){
      meta.sleepStages={
        deep:Math.round(stageH.deep*60),
        rem:Math.round(stageH.rem*60),
        light:Math.round(stageH.core*60),
        total:Math.round(asleepH*60)
      };
    }

    const steps=latest('step_count');
    if(steps>0){setVal('steps',Math.min(25000,Math.round(steps)));meta.steps=Math.round(steps);anyValue=true;}

    const burned=latest('active_energy');
    if(burned>0){
      getDay(getTodayKey()).burned=Math.round(burned);saveDaily();
      meta.burned=Math.round(burned);anyValue=true;
    }

    if(anyValue){
      lastHealthImportDate=getTodayKey();lastHealthImportValues=meta;
      watchAvailable=true;
      stagesAvailable=!!(meta.sleepStages);
      saveAll();updateAll();lockSliders();renderImportStatus();
    }
  }catch(e){}
}

// ════════════════════════════════════════════
// IMPORT STATUS & CLEAR
// ════════════════════════════════════════════
function renderImportStatus(){
  const el=document.getElementById('import-status');if(!el)return;
  const today=getTodayKey();
  if(lastHealthImportDate===today&&lastHealthImportValues){
    const v=lastHealthImportValues;
    const parts=[];
    if(v.hrv)parts.push('HRV: '+v.hrv+' ms');
    if(v.rhr)parts.push('Ruhepuls: '+v.rhr+' bpm');
    if(v.steps)parts.push('Schritte: '+v.steps.toLocaleString('de-DE'));
    if(v.sleepH)parts.push('Schlaf: '+v.sleepH+'h');
    if(v.burned)parts.push(v.burnedNote||'Aktive Kalorien: '+v.burned+' kcal');
    const highKcal=v.burned&&v.burned>1200
      ?'<div style="margin-top:5px;color:var(--warn);font-size:11px;">⚠ '+v.burned+' kcal Aktive Kalorien — hoher Wert. Plausibel für sehr intensive/lange Aktivität?</div>'
      :'';
    el.innerHTML=
      '<div style="color:var(--accent);font-weight:600;">✓ Watch-Import aktiv ('+today+')</div>'
      +'<div style="color:var(--text2);font-size:11px;margin-top:3px;">'+parts.join(' · ')+'</div>'
      +highKcal
      +'<div style="margin-top:5px;font-size:10px;color:var(--muted);font-family:\'DM Mono\',monospace;">'
      +'Watch-Werte gelten nur für heute — am nächsten Tag ohne neuen Import nicht mehr aktiv.</div>';
  } else {
    el.innerHTML='';
  }
}

function clearTodayWatchImport(){
  const today=getTodayKey();
  if(lastHealthImportDate!==today){
    document.getElementById('import-status').innerHTML=
      '<span style="color:var(--muted);">Kein aktiver Watch-Import für heute vorhanden.</span>';
    return;
  }
  function doDelete(){
    getDay(today).burned=0;saveDaily();
    slidersLocked=false;applyLockState();
    lastHealthImportDate=null;lastHealthImportValues=null;
    watchAvailable=false;stagesAvailable=false;
    saveAll();renderImportStatus();
    renderDashboard();renderNutrition();
    document.getElementById('import-status').innerHTML=
      '<span style="color:var(--muted);">Watch-Import für heute gelöscht. Regler entsperrt — Werte können manuell angepasst werden.</span>';
  }
  if(document.getElementById('ask-before-change').checked){
    showModal(
      'Watch-Import löschen?',
      'Aktivitätskalorien und Import-Status werden für heute zurückgesetzt. Regler werden entsperrt.<br><br>'
      +'<span style="font-size:12px;color:var(--muted);">Mahlzeiten, Training, Wasser, Messungen und frühere Tage bleiben erhalten.</span>',
      doDelete,()=>{}
    );
  } else {doDelete();}
}

// ════════════════════════════════════════════
// RESET
// ════════════════════════════════════════════
function wipeAll(){
  showModal('Alle Daten löschen?','Alle Kraftwerte, Maße, Pläne, Mahlzeiten und Einstellungen werden unwiderruflich gelöscht.',
    function(){try{localStorage.clear();}catch(e){}location.reload();});
}

window.importHealthFile       =importHealthFile;
window.clearTodayWatchImport  =clearTodayWatchImport;
window.wipeAll                =wipeAll;
