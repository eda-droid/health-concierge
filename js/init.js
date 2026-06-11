// ════════════════════════════════════════════
// INIT — Bootstrap: Event-Bindings, State laden, Erst-Render, Auto-Watch-Fetch
// Muss als letztes Modul geladen werden; keine onclick-Funktionen
// ════════════════════════════════════════════
['vd-skin','vd-sun','vd-season','vd-level'].forEach(id=>{const e=document.getElementById(id);if(e)e.addEventListener('change',saveAll);});

['meal-protein','meal-carbs','meal-fat'].forEach(id=>{
  const e=document.getElementById(id);
  if(e)e.addEventListener('input',autoCalcKcal);
});

// ════════════════════════════════════════════
// INIT
// ════════════════════════════════════════════
loadState();
if(!lsGet('hc_setup_done',null))_showSetupModal();

// Tagesgebundener Watch-Import: bei neuem Tag Lock und Metadaten zurücksetzen
if(lastHealthImportDate&&lastHealthImportDate!==getTodayKey()){
  slidersLocked=false;
  lastHealthImportDate=null;
  lastHealthImportValues=null;
  saveAll();
}

// Apply persisted theme on boot
(function(){const t=lsGet('hc_theme','dark');if(t==='light')document.documentElement.setAttribute('data-theme','light');})();

updateAll();
renderLog();
bindSetInputs();
renderDeloadStatus();
renderMeasureHistory();
applyVitDCollapse();
renderInjury();
setHealthEnergyUnit(healthEnergyUnit);
renderImportStatus();
document.addEventListener('DOMContentLoaded',function(){calcNavy();_initSubTabs('profile','profil');});

// ════════════════════════════════════════════
// AUTO WATCH FETCH
// ════════════════════════════════════════════
const HEALTH_SECRET='dein-geheimnis-passwort';
async function autoFetchWatch(){
  const url='https://health-vitale.vercel.app/api/health?secret='+HEALTH_SECRET;
  const ctrl=new AbortController();
  const timer=setTimeout(()=>ctrl.abort(),5000);
  try{
    const res=await fetch(url,{signal:ctrl.signal});
    clearTimeout(timer);
    if(!res.ok){console.warn('[Watch] API error:',res.status);return;}
    const data=await res.json();
    if(Object.keys(data).length)importHealthData(data);
  }catch(e){
    clearTimeout(timer);
    if(e.name!=='AbortError')console.warn('[Watch] Fetch failed:',e.message);
  }
}
autoFetchWatch();
setInterval(autoFetchWatch,15*60*1000);
