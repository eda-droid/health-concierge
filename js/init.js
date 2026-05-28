// ════════════════════════════════════════════
// EVENT-BINDINGS
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
  try{
    const res=await fetch('https://health-vitale.vercel.app/api/health?secret='+HEALTH_SECRET,{signal:AbortSignal.timeout(3000)});
    if(!res.ok)return;
    const data=await res.json();
    if(Object.keys(data).length)importHealthData(data);
  }catch(e){}
}
autoFetchWatch();
setInterval(autoFetchWatch,10*60*1000);
