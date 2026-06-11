// ════════════════════════════════════════════
// UI — Tabs, Modals, Toasts, Theme, Slider-Lock, Setup-Modal
// Öffentlich (onclick): siehe PUBLIC-API-Block am Dateiende
// ════════════════════════════════════════════
function switchTab(id,el){
  // Exit any open training edit view when leaving the training tab
  if(id!=='training'&&typeof _resetTrainingEdit==='function')_resetTrainingEdit();
  document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.bottom-tab').forEach(t=>t.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  el.classList.add('active');
  if(id==='training'){renderLog();renderWeekTab();}
  if(id==='body'){
    renderInjury();calcNavy();renderMeasureHistory();populateCompareDates();renderBodyHero();renderGoalsSection();
    const _sb=lsGet('vitale_schmerzen_open');
    const _sblock=document.getElementById('schmerzen-block');
    const _sarrow=document.getElementById('schmerzen-arrow');
    if(_sblock){_sblock.style.display=_sb==='1'?'block':'none';}
    if(_sarrow){_sarrow.style.transform=_sb==='1'?'rotate(90deg)':'';}
  }
  if(id==='home')renderDashboard();
  if(id==='nutrition')renderNutrition();
  if(id==='settings'){renderDeloadStatus();_applyThemeUI();}
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
  ['bulk','maintain','cut'].forEach(x=>{const btn=document.getElementById('goal-'+x);if(btn)btn.className='goal-btn'+(x===g?' active-'+x:'');});
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
function updateWatchPill(){
  const txt=document.getElementById('watch-pill-text'),pulse=document.getElementById('watch-pill-pulse');
  if(!txt)return;
  const hasImport=lastHealthImportDate===getTodayKey();
  txt.textContent=hasImport?'⌚ Watch ✓':'⌚ Kein Import';
  txt.style.color=hasImport?'var(--accent)':'var(--muted)';
  if(pulse)pulse.style.display=hasImport?'block':'none';
}
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

// ════════════════════════════════════════════
// SUB-TABS
// ════════════════════════════════════════════
function switchSubTab(group,name){
  lsSet('hc_subtab_'+group,name);
  document.querySelectorAll('.sub-tab[data-group="'+group+'"]').forEach(b=>b.classList.toggle('active',b.dataset.name===name));
  document.querySelectorAll('.sub-panel[data-group="'+group+'"]').forEach(p=>p.classList.toggle('active',p.dataset.name===name));
}
function _initSubTabs(group,def){switchSubTab(group,lsGet('hc_subtab_'+group,def)||def);}

// ════════════════════════════════════════════
// TOAST
// ════════════════════════════════════════════
function showToast(msg,duration){
  let t=document.getElementById('toast');
  if(!t){t=document.createElement('div');t.id='toast';document.body.appendChild(t);}
  t.textContent=msg;
  t.classList.add('show');
  clearTimeout(t._tid);
  t._tid=setTimeout(()=>t.classList.remove('show'),duration||3500);
}

// ════════════════════════════════════════════
// THEME (LIGHT / DARK)
// ════════════════════════════════════════════
function setTheme(t){
  lsSet('hc_theme',t);
  document.documentElement.setAttribute('data-theme',t==='light'?'light':'');
  _applyThemeUI();
  saveAll();
}
function _applyThemeUI(){
  const t=lsGet('hc_theme','dark');
  const bd=document.getElementById('theme-dark'),bl=document.getElementById('theme-light');
  if(bd)bd.classList.toggle('active',t!=='light');
  if(bl)bl.classList.toggle('active',t==='light');
}

// ════════════════════════════════════════════
// SETUP MODAL
// ════════════════════════════════════════════
function _showSetupModal(){
  const el=document.getElementById('setup-modal-overlay');
  if(el)el.style.display='flex';
}
function _hideSetupModal(){
  const el=document.getElementById('setup-modal-overlay');
  if(el)el.style.display='none';
}
function _submitSetup(){
  const gender=document.getElementById('setup-gender').value;
  const weight=parseFloat(document.getElementById('setup-weight').value);
  const height=parseFloat(document.getElementById('setup-height').value);
  const age=parseInt(document.getElementById('setup-age').value);
  const err=document.getElementById('setup-error');
  if(!weight||weight<30||weight>250){if(err)err.textContent='Bitte gültiges Gewicht eingeben (30–250 kg).';return;}
  if(!height||height<140||height>220){if(err)err.textContent='Bitte gültige Größe eingeben (140–220 cm).';return;}
  if(!age||age<14||age>99){if(err)err.textContent='Bitte gültiges Alter eingeben (14–99).';return;}
  if(err)err.textContent='';
  setVal('p-gender',gender);
  setVal('p-weight',weight);
  setVal('p-height',height);
  setVal('p-age',age);
  saveAll();
  lsSet('hc_setup_done','1');
  _hideSetupModal();
  if(typeof _onGenderChange==='function')_onGenderChange();
  updateAll();
  if(typeof calcNavy==='function')calcNavy();
}

// ════════════════════════════════════════════
// PUBLIC API (von onclick=/onchange= benötigt)
// ════════════════════════════════════════════
window.switchTab          =switchTab;
window.setGoal            =setGoal;
window.setTheme           =setTheme;
window.setHealthEnergyUnit=setHealthEnergyUnit;
window.closeModal         =closeModal;
window.unlockSliders      =unlockSliders;
window._submitSetup       =_submitSetup;
