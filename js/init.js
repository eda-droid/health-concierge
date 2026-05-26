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

// Tagesgebundener Watch-Import: bei neuem Tag Lock und Metadaten zurücksetzen
if(lastHealthImportDate&&lastHealthImportDate!==getTodayKey()){
  slidersLocked=false;
  lastHealthImportDate=null;
  lastHealthImportValues=null;
  saveAll();
}

updateAll();
renderLog();
bindSetInputs();
renderDeloadStatus();
calcNavy();
renderMeasureHistory();
applyVitDCollapse();
renderInjury();
setHealthEnergyUnit(healthEnergyUnit);
renderImportStatus();
