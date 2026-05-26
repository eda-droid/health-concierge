// ════════════════════════════════════════════
// TABS
// ════════════════════════════════════════════
function switchTab(id,el){
  document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  el.classList.add('active');
  if(id==='training'){renderLog();renderWeekTab();}
  if(id==='profile'){renderInjury();calcNavy();renderMeasureHistory();renderDeloadStatus();}
  if(id==='home')renderDashboard();
  if(id==='nutrition')renderNutrition();
}
function toggleExpand(id){
  const el=document.getElementById(id);el.classList.toggle('open');
  const arrow=document.getElementById(id.replace('-expand','-arrow'));
  if(arrow)arrow.classList.toggle('open');
}

// ════════════════════════════════════════════
// GOAL
// ════════════════════════════════════════════
function setGoal(g){
  currentGoal=g;
  ['bulk','maintain','cut'].forEach(x=>{document.getElementById('goal-'+x).className='goal-btn'+(x===g?' active-'+x:'');});
  updateAll();
}

// ════════════════════════════════════════════
// MODAL
// ════════════════════════════════════════════
function showModal(title,sub,onYes,onNo){
  document.getElementById('modal-title').textContent=title;
  document.getElementById('modal-sub').innerHTML=sub;
  document.getElementById('modal-overlay').classList.add('show');
  document.getElementById('modal-yes').onclick=function(){closeModal();if(onYes)onYes();};
  document.getElementById('modal-no').onclick=function(){closeModal();if(onNo)onNo();};
}
function closeModal(){document.getElementById('modal-overlay').classList.remove('show');}

// ════════════════════════════════════════════
// SLIDER LOCK
// ════════════════════════════════════════════
function applyLockState(){
  ['sleep','hrv','rhr','steps','stress'].forEach(id=>{const e=document.getElementById(id);if(e)e.disabled=slidersLocked;});
  const lh=document.getElementById('lock-hint'),ub=document.getElementById('unlock-btn');
  if(lh)lh.style.display=slidersLocked?'flex':'none';
  if(ub)ub.style.display=slidersLocked?'block':'none';
}
function lockSliders(){slidersLocked=true;applyLockState();saveAll();}
function setHealthEnergyUnit(unit){
  healthEnergyUnit=unit;
  const bKcal=document.getElementById('unit-kcal'),bKj=document.getElementById('unit-kj');
  if(bKcal)bKcal.classList.toggle('active',unit==='kcal');
  if(bKj)bKj.classList.toggle('active',unit==='kj');
  saveAll();
}
function unlockSliders(){
  showModal('Regler entsperren?','Die importierten Apple-Watch-Werte können wieder manuell geändert werden.',
    function(){slidersLocked=false;applyLockState();saveAll();});
}
