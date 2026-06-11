// ════════════════════════════════════════════
// UI MODE TOGGLE
// ════════════════════════════════════════════
function setUIMode(mode){
  globalUIMode=mode;
  lsSet('vitale_ui_mode',mode);
  _applyModeToggleUI();
  window.scrollTo(0,0);
  renderDashboard();
  if(typeof renderWeeklyReview==='function')renderWeeklyReview();
}
function _applyModeToggleUI(){
  document.querySelectorAll('.ui-mode-toggle .mode-btn').forEach(b=>b.classList.toggle('active',b.dataset.mode===globalUIMode));
}

// ════════════════════════════════════════════
// CENTRAL DATA BUILDER
// ════════════════════════════════════════════
function _buildDashData(){
  const c=computeAll();
  const dk=getTodayKey();
  const day=getDay(dk);
  const todayIdx=(new Date().getDay()+6)%7;
  const hour=new Date().getHours();
  const greeting=(hour<11?'Guten Morgen':hour<18?'Guten Tag':'Guten Abend')+' — '+daysFull[todayIdx];

  let trainLabel,trainSub;
  if(trainingMode==='advanced'&&customPlan){
    trainLabel=customPlan[todayIdx]?customPlan[todayIdx].title:'Eigener Plan';
    trainSub='Dein eigener Trainingsplan';
  } else {
    const plan=weekPlanState||getWeekPlan(c.recovery);
    const wt=plan[todayIdx];
    const wp=workoutPlans[wt]||workoutPlans.rest;
    trainLabel=wt==='rest'?'Ruhetag':wt==='recovery'?'Aktive Erholung':wp.label;
    trainSub=wt==='rest'?'Heute regenerieren':wt==='recovery'?'Leichte Bewegung':c.recovery>=75?'Schwere Session — Push it!':'Moderate Session — kontrollierte Intensität';
  }

  const meals=getDayMeals(dk);
  const eaten=meals.reduce((a,m)=>a+m.kcal,0);
  const burned=parseInt(day.burned)||0;
  const remain=Math.round(c.goalKcal-eaten);
  const eatenPct=Math.min(100,Math.round(eaten/c.goalKcal*100));
  const prot=Math.round(meals.reduce((a,m)=>a+(m.protein||0),0));
  const carbs=Math.round(meals.reduce((a,m)=>a+(m.carbs||0),0));
  const fat=Math.round(meals.reduce((a,m)=>a+(m.fat||0),0));
  const rColor=c.recovery>=75?'#00E5A0':c.recovery>=50?'#FFAD33':'#FF5757';

  let aiMsg='';
  if(c.recovery>=75) aiMsg=`<strong>Recovery ${c.recovery}/100 — Top.</strong> Heute ist ${trainLabel} optimal. Kalorienziel ${c.goalKcal.toLocaleString('de-DE')} kcal. Noch ${remain.toLocaleString('de-DE')} kcal verfügbar.`;
  else if(c.recovery>=50) aiMsg=`<strong>Recovery ${c.recovery}/100 — Moderat.</strong> Session auf 80% Intensität. Kalorienziel ${c.goalKcal.toLocaleString('de-DE')} kcal.`;
  else aiMsg=`<strong>Recovery ${c.recovery}/100 — Kritisch.</strong> Heute Erholung statt schwerem Training. Kalorien auf Erhalt angepasst.`;

  return{c,dk,day,greeting,trainLabel,trainSub,rColor,goalKcal:c.goalKcal,eaten,burned,remain,eatenPct,prot,carbs,fat,hour,aiMsg};
}

// ════════════════════════════════════════════
// SHARED HTML HELPERS
// ════════════════════════════════════════════
function _kcalBarHtml(eatenPct,eaten,goal){
  const over=eaten>goal;
  return`<div style="flex:${eatenPct};background:${over?'var(--danger)':'var(--accent)'};border-radius:6px 0 0 6px;min-width:${eatenPct>0?'2px':'0'};"></div><div style="flex:${100-eatenPct};background:var(--border);border-radius:0 6px 6px 0;"></div>`;
}
function _macroRowHtml(prot,carbs,fat){
  return`<div class="home-macro-row">
    <span><span class="macro-dot" style="background:var(--info);"></span><span style="color:var(--text2);">P</span> <span style="color:var(--text);font-weight:600;">${prot}g</span></span>
    <span><span class="macro-dot" style="background:var(--warn);"></span><span style="color:var(--text2);">K</span> <span style="color:var(--text);font-weight:600;">${carbs}g</span></span>
    <span><span class="macro-dot" style="background:var(--purple);"></span><span style="color:var(--text2);">F</span> <span style="color:var(--text);font-weight:600;">${fat}g</span></span>
  </div>`;
}
function _kcalCardHtml(d,withMacros,withProteinRow){
  const {goalKcal,eaten,remain,eatenPct,prot,carbs,fat}=d;
  let protRow='';
  if(withProteinRow){
    const pr=proteinGoalReached();
    const check=pr.reached?` <span style="color:var(--accent);">✓</span>`:'';
    protRow=`<div style="margin-top:8px;font-size:12px;color:var(--text2);">Protein: <strong style="color:var(--info);">${pr.eaten}g</strong> / ${pr.target}g${check}</div>`;
  }
  return`<div class="card home-kcal-card">
    <div class="card-label-mono">🥗 ERNÄHRUNG HEUTE</div>
    <div class="home-kcal-3">
      <div><div class="home-kcal-val" id="k-goal" style="color:var(--accent);">${goalKcal.toLocaleString('de-DE')}</div><div class="home-kcal-lbl">Ziel</div></div>
      <div><div class="home-kcal-val" id="k-eaten">${eaten.toLocaleString('de-DE')}</div><div class="home-kcal-lbl">Gegessen</div></div>
      <div><div class="home-kcal-val" id="k-remain" style="color:${remain<0?'var(--danger)':'var(--info)'};">${remain.toLocaleString('de-DE')}</div><div class="home-kcal-lbl">Verbleibend</div></div>
    </div>
    <div class="kcal-bar" id="kcal-bar">${_kcalBarHtml(eatenPct,eaten,goalKcal)}</div>
    ${protRow}
    ${withMacros?_macroRowHtml(prot,carbs,fat):''}
  </div>`;
}
function _bedtimeBannerHtml(hour){
  if(hour<21)return'';
  const bt=appState.bedTime||'23:00';
  return`<div class="bedtime-banner-inline">
    <span style="font-size:20px;">🌙</span>
    <div style="font-size:13px;font-weight:600;">Ziel-Schlafzeit ${bt} — Jetzt runterkommen.</div>
  </div>`;
}
function _waterCardHtml(){
  return`<div class="card">
    <div class="card-header">
      <div class="card-label">Wasser</div>
      <div style="display:flex;align-items:baseline;gap:4px;">
        <span style="font-size:20px;font-weight:700;color:var(--water);" id="water-amount">0,0 L</span>
        <span style="font-size:11px;color:var(--muted);" id="water-goal-lbl">/ 2,8 L</span>
      </div>
    </div>
    <div class="water-glass-row" id="water-glasses"></div>
    <div style="display:flex;gap:8px;margin-top:10px;">
      <button class="water-btn" onclick="addWater(200)">+ Glas 200ml</button>
      <button class="water-btn" onclick="addWater(500)" style="background:rgba(56,196,245,0.7);">+ Flasche 500ml</button>
      <button class="water-btn minus-btn" onclick="addWater(-200)">−</button>
    </div>
  </div>`;
}
function _weeklySlot(){return`<div class="card" id="weekly-review-card"></div>`;}
function _aiBox(msg){return`<div class="ai-box"><div class="ai-chip">⚡ ANALYSE</div><div id="ai-recommendation">${msg}</div></div>`;}
function heroLogAction(){
  const btn=[...document.querySelectorAll('.bottom-tab')].find(b=>b.getAttribute('onclick')&&b.getAttribute('onclick').includes("'training'"));
  if(btn)btn.click();
  setTimeout(()=>{
    const card=document.getElementById('exercise-log-card');
    if(card)card.scrollIntoView({behavior:'smooth',block:'start'});
    setTimeout(()=>{
      const first=document.querySelector('#exercise-log-list input[type="number"]');
      if(first)first.focus();
    },400);
  },150);
}
function _logBtn(){return`<button class="hero-log-btn" onclick="heroLogAction()">Log →</button>`;}
function _streakBadgeHtml(streak){
  if(streak<2)return'';
  return`<span style="display:inline-flex;align-items:center;background:rgba(255,107,53,0.15);color:#FF6B35;border:1px solid rgba(255,107,53,0.3);border-radius:20px;padding:2px 8px;font-size:11px;font-weight:700;font-family:'DM Mono',monospace;vertical-align:middle;margin-left:6px;">🔥 ${streak}</span>`;
}

// ════════════════════════════════════════════
// BASIC MODE SAVE HELPERS
// ════════════════════════════════════════════
function saveBasicSleep(h){
  const dk=getTodayKey();
  dailyData[dk].sleepHours=parseFloat(h)||null;
  saveDaily();
  const el=document.getElementById('sleep');
  if(el)el.value=Math.min(10,Math.round((parseFloat(h)||0)/0.9));
  updateAll();
}
function saveBasicActivity(level,steps){
  const dk=getTodayKey();
  dailyData[dk].activityLevel=level;
  saveDaily();
  const el=document.getElementById('steps');
  if(el)el.value=steps;
  updateAll();
}

// ════════════════════════════════════════════
// MODUS 1: 🚶 BASIC
// ════════════════════════════════════════════
function renderBasicHome(d){
  if(!d)d=_buildDashData();
  const el=document.getElementById('home-render');if(!el)return;
  const {greeting,trainLabel,trainSub,hour}=d;
  const dk=getTodayKey();
  const today=getDay(dk);
  const currentMood=today.mood;
  const sleepHours=today.sleepHours!=null?today.sleepHours:'';
  const activityLevel=today.activityLevel||null;
  const streak=calcStreak();
  const liftToday=getBestLiftToday();

  el.innerHTML=`
    ${_bedtimeBannerHtml(hour)}
    <div class="hero-card" style="background:linear-gradient(145deg,var(--card),var(--card2));">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div class="hero-greet">${greeting}${_streakBadgeHtml(streak)}</div>
        ${liftToday.name?`<span style="font-size:11px;font-weight:700;color:var(--info);font-family:'DM Mono',monospace;white-space:nowrap;flex-shrink:0;">🏋️ ${liftToday.name} · ${liftToday.kg}kg</span>`:''}
      </div>
      <div class="hero-session-row" style="margin-top:10px;">
        <span class="hero-title" id="dash-training">${trainLabel}</span>
        ${_logBtn()}
      </div>
      <div class="hero-sub" id="dash-training-sub" style="margin-top:6px;">${trainSub}</div>
    </div>
    <div class="card">
      <div class="card-label" style="margin-bottom:10px;">Wie fühlst du dich heute?</div>
      <div class="mood-stars">
        ${[1,2,3,4,5].map(n=>`<span class="mood-star${currentMood>=n?' active':''}" onclick="saveMood(${n}===${currentMood}?0:${n})">⭐</span>`).join('')}
      </div>
      <div style="margin-top:12px;">
        <label style="font-size:12px;color:var(--muted);display:block;margin-bottom:6px;">🌙 Schlaf letzte Nacht (Stunden)</label>
        <input type="number" min="3" max="12" step="0.5" placeholder="7.5"
          value="${sleepHours}" onchange="saveBasicSleep(this.value)"
          style="width:120px;background:var(--card2);border:1px solid var(--border);border-radius:8px;padding:7px 10px;color:var(--text);text-align:center;">
      </div>
      <div style="margin-top:14px;">
        <div style="font-size:12px;color:var(--muted);margin-bottom:8px;">Aktivität heute</div>
        <div style="display:flex;gap:8px;">
          ${[{label:'🛋 Wenig Bewegung',level:'sedentary',steps:4000},{label:'🚶 Normal aktiv',level:'light',steps:8000},{label:'🏃 Sehr aktiv',level:'active',steps:14000}].map(a=>`<button onclick="saveBasicActivity('${a.level}',${a.steps})" style="flex:1;padding:8px 4px;font-size:11px;border-radius:8px;border:1px solid ${activityLevel===a.level?'var(--accent)':'var(--border)'};background:${activityLevel===a.level?'var(--accent-dim)':'var(--surface)'};color:var(--text);cursor:pointer;">${a.label}</button>`).join('')}
        </div>
      </div>
    </div>
    ${_kcalCardHtml(d,true,true)}
    ${_waterCardHtml()}
    ${_weeklySlot()}
  `;
  renderWater();
  if(typeof renderWeeklyReview==='function')renderWeeklyReview();
}

// ════════════════════════════════════════════
// MODUS 2: 🌱 EINSTEIGER
// ════════════════════════════════════════════
function renderBeginnerHome(d){
  if(!d)d=_buildDashData();
  const el=document.getElementById('home-render');if(!el)return;
  const {c,greeting,trainLabel,trainSub,rColor,goalKcal,eaten,eatenPct,prot,carbs,fat,hour,aiMsg}=d;
  const streak=calcStreak();
  const liftToday=getBestLiftToday();

  // ── No Watch connected yet
  if(!watchAvailable){
    el.innerHTML=`
      <div class="hero-card" style="background:linear-gradient(145deg,var(--card),var(--card2));">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div class="hero-greet">${greeting}${_streakBadgeHtml(streak)}</div>
          ${liftToday.name?`<span style="font-size:11px;font-weight:700;color:var(--info);font-family:'DM Mono',monospace;white-space:nowrap;flex-shrink:0;">🏋️ ${liftToday.name} · ${liftToday.kg}kg</span>`:''}
        </div>
        <div class="hero-session-row" style="margin-top:10px;">
          <span class="hero-title" id="dash-training">${trainLabel}</span>
          ${_logBtn()}
        </div>
        <div class="hero-sub" id="dash-training-sub" style="margin-top:6px;">${trainSub}</div>
      </div>
      <div class="card">
        <div class="card-label" style="margin-bottom:8px;">⌚ Apple Watch verbinden</div>
        <p style="font-size:12px;color:var(--muted);line-height:1.65;margin-bottom:14px;">Importiere deine Gesundheitsdaten für Recovery, HRV & Schlaf.</p>
        <button class="btn-primary" style="width:100%;" onclick="document.getElementById('health-file').click()">Daten importieren →</button>
      </div>
      ${_kcalCardHtml(d,true,true)}
      ${_waterCardHtml()}
      ${_weeklySlot()}
    `;
    renderWater();
    if(typeof renderWeeklyReview==='function')renderWeeklyReview();
    return;
  }

  // ── Watch available: full Einsteiger layout
  const circ=226,off=Math.round(circ-circ*c.recovery/100);
  const tc=132;
  const slp=Math.round(c.s.sleep*10);
  const sCol=slp>=70?'var(--purple)':slp>=50?'var(--warn)':'var(--danger)';
  const netE=eaten-goalKcal,nCol=netE<=0?'var(--accent)':'var(--warn)';
  const recLbl=c.recovery>=75?'Optimal':c.recovery>=50?'Moderat':'Kritisch';
  const badgeCls=c.recovery>=75?'badge-green':c.recovery>=50?'badge-yellow':'badge-red';
  el.innerHTML=`
    ${_bedtimeBannerHtml(hour)}
    <div class="hero-card">
      <div class="hero-glow" style="background:radial-gradient(ellipse at top right,${rColor}12 0%,transparent 65%);"></div>
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div class="hero-greet">${greeting}${_streakBadgeHtml(streak)}</div>
        ${liftToday.name?`<span style="font-size:11px;font-weight:700;color:var(--info);font-family:'DM Mono',monospace;white-space:nowrap;flex-shrink:0;">🏋️ ${liftToday.name} · ${liftToday.kg}kg</span>`:''}
      </div>
      <div class="hero-body">
        <div class="hero-left">
          <div class="hero-session-row">
            <span class="hero-title" id="dash-training">${trainLabel}</span>
            ${_logBtn()}
          </div>
          <div class="hero-sub" id="dash-training-sub">${trainSub}</div>
        </div>
        <div class="hero-ring">
          <svg viewBox="0 0 88 88"><circle cx="44" cy="44" r="36" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="7"/><circle cx="44" cy="44" r="36" fill="none" stroke="${rColor}" stroke-width="7" stroke-linecap="round" stroke-dasharray="226" stroke-dashoffset="${off}" style="--ring-offset:${off}" class="recovery-circle" id="recovery-circle"/></svg>
          <div class="hero-ring-val"><span id="recovery-score" style="color:${rColor};font-size:18px;font-weight:700;">${c.recovery}</span><span class="hero-ring-unit">%</span></div>
        </div>
      </div>
      <div class="hero-badge-row" id="recovery-badge"><span class="badge ${badgeCls}">${recLbl}</span></div>
    </div>
    <div class="tiles-grid">
      <div class="tile">
        <div class="tile-glow" style="background:radial-gradient(circle,${rColor}22 0%,transparent 70%);"></div>
        <div class="tile-label">◎ Recovery</div>
        <div class="tile-ring-row">
          <div class="tile-ring-wrap">
            <svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="21" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="5"/><circle cx="26" cy="26" r="21" fill="none" stroke="${rColor}" stroke-width="5" stroke-linecap="round" stroke-dasharray="132" stroke-dashoffset="${Math.round(tc-tc*c.recovery/100)}" style="--ring-offset:${Math.round(tc-tc*c.recovery/100)}" class="recovery-circle"/></svg>
            <div class="tile-ring-inner" style="color:${rColor};">${c.recovery}</div>
          </div>
          <div><div class="tile-big"><span style="color:${rColor};">${c.recovery}</span><span class="tile-unit">%</span></div><div class="tile-sub">${recLbl}</div></div>
        </div>
        <div class="tile-bar"><div class="tile-bar-fill" style="width:${c.recovery}%;background:${rColor};"></div></div>
      </div>
      <div class="tile">
        <div class="tile-glow" style="background:radial-gradient(circle,${sCol}22 0%,transparent 70%);"></div>
        <div class="tile-label">🌙 Schlaf</div>
        <div class="tile-ring-row">
          <div class="tile-ring-wrap">
            <svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="21" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="5"/><circle cx="26" cy="26" r="21" fill="none" stroke="${sCol}" stroke-width="5" stroke-linecap="round" stroke-dasharray="132" stroke-dashoffset="${Math.round(tc-tc*slp/100)}" style="--ring-offset:${Math.round(tc-tc*slp/100)}" class="recovery-circle"/></svg>
            <div class="tile-ring-inner" style="color:${sCol};">${slp}</div>
          </div>
          <div><div class="tile-big"><span style="color:${sCol};">${slp}</span><span class="tile-unit">%</span></div><div class="tile-sub">${c.s.sleep} / 10</div></div>
        </div>
        <div class="tile-bar"><div class="tile-bar-fill" style="width:${slp}%;background:${sCol};"></div></div>
      </div>
      <div class="tile">
        <div class="tile-glow" style="background:radial-gradient(circle,rgba(91,127,255,.2) 0%,transparent 70%);"></div>
        <div class="tile-label">🔥 Belastung</div>
        <div class="tile-big" style="color:var(--info);">${c.s.stress}<span class="tile-unit">/10</span></div>
        <div class="tile-sub">${c.s.stress<=3?'Niedrig':c.s.stress<=6?'Moderat':'Hoch'}</div>
        <div class="tile-bar"><div class="tile-bar-fill" style="width:${c.s.stress*10}%;background:var(--info);"></div></div>
      </div>
      <div class="tile">
        <div class="tile-glow" style="background:radial-gradient(circle,${netE<=0?'rgba(0,229,160':'rgba(255,173,51'},.2) 0%,transparent 70%);"></div>
        <div class="tile-label">⚡ Net Energy</div>
        <div class="tile-big" style="color:${nCol};">${netE>0?'+':''}${Math.round(netE).toLocaleString('de-DE')}<span class="tile-unit">kcal</span></div>
        <div class="tile-sub">${netE<=0?'Defizit':'Überschuss'}</div>
        <div class="tile-bar"><div class="tile-bar-fill" style="width:${eatenPct}%;background:${nCol};"></div></div>
      </div>
    </div>
    ${_weeklySlot()}
    ${_kcalCardHtml(d,true,true)}
    ${_waterCardHtml()}
    ${_aiBox(aiMsg)}`;
  renderWater();
  if(typeof renderWeeklyReview==='function')renderWeeklyReview();
}

// ════════════════════════════════════════════
// MODUS 3: ⚡ ADVANCED — Helpers
// ════════════════════════════════════════════
function _minsToHm(mins){
  const h=Math.floor(mins/60),m=Math.round(mins%60);
  return h>0?h+'h '+(m>0?m+'m':''):m+'m';
}
function _sleepStagesHtml(sleepScore){
  const q=sleepScore/10;
  const awakePct=Math.round(20-q*15);
  const remPct=Math.round(15+q*10);
  const corePct=Math.round(58-q*8);
  const deepPct=Math.max(0,100-awakePct-remPct-corePct);
  const totalH=3.5+sleepScore*0.55;
  const stages=[
    {label:'Wach',pct:awakePct,time:_minsToHm(totalH*60*awakePct/100),color:'#FF7043'},
    {label:'REM',pct:remPct,time:_minsToHm(totalH*60*remPct/100),color:'var(--purple)'},
    {label:'Core',pct:corePct,time:_minsToHm(totalH*60*corePct/100),color:'var(--info)'},
    {label:'Tief',pct:deepPct,time:_minsToHm(totalH*60*deepPct/100),color:'#2563EB'},
  ];
  return`<div class="card">
    <div class="card-label-mono">🌙 SCHLAF-STAGES</div>
    ${stages.map(s=>`<div style="margin-bottom:10px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
        <span style="font-size:12px;color:var(--text2);">${s.label} <span style="color:${s.color};font-weight:600;">${s.pct}%</span></span>
        <span style="font-size:11px;color:var(--muted);font-family:'DM Mono',monospace;">${s.time}</span>
      </div>
      <div class="tile-bar"><div class="tile-bar-fill" style="width:${s.pct}%;background:${s.color};"></div></div>
    </div>`).join('')}
    <p style="font-size:10px;color:var(--muted);margin-top:4px;">Schätzung · Score ${sleepScore}/10</p>
  </div>`;
}
function _stressCardHtml(stress,showEstimate){
  const label=stress<=3?'Niedrig':stress<=6?'Moderat':'Hoch';
  const lColor=stress<=3?'var(--accent)':stress<=6?'var(--warn)':'var(--danger)';
  let low,mod,high;
  if(stress<=3){low=75;mod=20;high=5;}
  else if(stress<=6){low=35;mod=50;high=15;}
  else{low=15;mod=30;high=55;}
  return`<div class="card">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;">
      <div>
        <div class="card-label-mono">🧘 STRESS HEUTE</div>
        <div style="font-size:36px;font-weight:700;font-family:'DM Mono',monospace;color:${lColor};line-height:1.1;">${stress}<span style="font-size:13px;color:var(--muted);font-weight:400;margin-left:2px;">/10</span></div>
        <div style="font-size:11px;color:var(--text2);margin-top:3px;">${label}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end;">
        <span class="badge" style="background:${lColor}18;color:${lColor};border:1px solid ${lColor}40;">${label}</span>
        ${showEstimate?`<span class="badge" style="background:rgba(255,173,51,0.1);color:var(--warn);border:1px solid rgba(255,173,51,0.3);font-size:9px;">⚠ Schätzung</span>`:''}
      </div>
    </div>
    <div style="margin-top:14px;display:flex;gap:10px;font-size:11px;font-family:'DM Mono',monospace;flex-wrap:wrap;">
      <span><span style="color:var(--info);">■</span> <span style="color:var(--text2);">Niedrig</span> ${low}%</span>
      <span><span style="color:var(--accent);">■</span> <span style="color:var(--text2);">Moderat</span> ${mod}%</span>
      <span><span style="color:var(--warn);">■</span> <span style="color:var(--text2);">Hoch</span> ${high}%</span>
    </div>
    <div style="display:flex;height:6px;border-radius:3px;overflow:hidden;margin-top:8px;">
      <div style="flex:${low};background:var(--info);"></div>
      <div style="flex:${mod};background:var(--accent);"></div>
      <div style="flex:${high};background:var(--warn);"></div>
    </div>
  </div>`;
}
function _hrvSparklineHtml(hrv,rhr,rColor){
  const pts=[];
  for(let i=-6;i<=0;i++){
    const dk2=getDateKey(i);
    const stored=dailyData[dk2]&&dailyData[dk2].hrv?dailyData[dk2].hrv:null;
    const v=i===0?hrv:stored;
    const lIdx=((new Date().getDay()+6)%7+i+7)%7;
    pts.push({i,val:v,label:daysShort[lIdx]});
  }
  const known=pts.filter(p=>p.val!==null);
  const allV=known.map(p=>p.val);
  const minV=Math.min(...allV,hrv)*0.92,maxV=Math.max(...allV,hrv)*1.08;
  const H=60,W=300,PL=4,PR=4,PT=6,PB=18,IW=W-PL-PR,IH=H-PT-PB;
  const xOf=i=>PL+Math.round((i+6)/6*IW);
  const yOf=v=>PT+Math.round((1-(v-minV)/(maxV-minV||1))*IH);
  const sorted=known.sort((a,b)=>a.i-b.i);
  const lines=sorted.map((p,j)=>j===0?'':
    `<line x1="${xOf(sorted[j-1].i)}" y1="${yOf(sorted[j-1].val)}" x2="${xOf(p.i)}" y2="${yOf(p.val)}" stroke="rgba(255,255,255,0.18)" stroke-width="1.5"/>`).join('');
  const dots=sorted.map(p=>`<circle cx="${xOf(p.i)}" cy="${yOf(p.val)}" r="${p.i===0?4:2.5}" fill="${p.val>=hrv?'var(--accent)':'var(--warn)'}"/>`).join('');
  const baseY=yOf(hrv);
  const lbls=pts.map(p=>`<text x="${xOf(p.i)}" y="${H-2}" text-anchor="middle" font-size="7" fill="rgba(255,255,255,0.3)" font-family="DM Mono,monospace">${p.label}</text>`).join('');
  return`<div class="card">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
      <div class="card-label-mono">💓 HRV 7 TAGE</div>
      <span style="font-size:11px;color:var(--muted);font-family:'DM Mono',monospace;">RHR ${rhr} bpm</span>
    </div>
    <div style="font-size:28px;font-weight:700;font-family:'DM Mono',monospace;color:${rColor};line-height:1;">${hrv}<span style="font-size:12px;color:var(--muted);font-weight:400;"> ms</span></div>
    <div style="font-size:11px;color:var(--text2);margin-bottom:12px;">Heute · Baseline ${hrv} ms</div>
    <svg width="100%" viewBox="0 0 ${W} ${H}" style="overflow:visible;">
      <line x1="${PL}" y1="${baseY}" x2="${W-PR}" y2="${baseY}" stroke="rgba(255,255,255,0.1)" stroke-width="1" stroke-dasharray="4,3"/>
      ${lines}${dots}${lbls}
    </svg>
    ${known.length<3?'<p style="font-size:10px;color:var(--muted);margin-top:4px;">📊 Noch zu wenig Daten — täglich importieren</p>':''}
  </div>`;
}
function _advKcalCardHtml(d){
  const {goalKcal,eaten,remain,eatenPct,prot,carbs,fat}=d;
  const protP=goalKcal?Math.round(prot*4/goalKcal*100):33;
  const carbP=goalKcal?Math.round(carbs*4/goalKcal*100):39;
  const fatP=goalKcal?Math.round(fat*9/goalKcal*100):28;
  return`<div class="card home-kcal-card">
    <div class="card-label-mono">🥗 ERNÄHRUNG HEUTE</div>
    <div class="home-kcal-3">
      <div><div class="home-kcal-val" id="k-goal" style="color:var(--accent);">${goalKcal.toLocaleString('de-DE')}</div><div class="home-kcal-lbl">Ziel</div></div>
      <div><div class="home-kcal-val" id="k-eaten">${eaten.toLocaleString('de-DE')}</div><div class="home-kcal-lbl">Gegessen</div></div>
      <div><div class="home-kcal-val" id="k-remain" style="color:${remain<0?'var(--danger)':'var(--info)'};">${remain.toLocaleString('de-DE')}</div><div class="home-kcal-lbl">Verbleibend</div></div>
    </div>
    <div class="kcal-bar" id="kcal-bar">${_kcalBarHtml(eatenPct,eaten,goalKcal)}</div>
    <div style="margin-top:14px;display:flex;flex-direction:column;gap:10px;">
      ${[{label:'Protein',g:prot,pct:protP,color:'var(--info)'},
         {label:'Kohlenhydrate',g:carbs,pct:carbP,color:'var(--warn)'},
         {label:'Fett',g:fat,pct:fatP,color:'var(--purple)'}].map(m=>`<div>
        <div style="display:flex;justify-content:space-between;margin-bottom:5px;">
          <span style="font-size:12px;color:var(--text2);">${m.label}</span>
          <span style="font-size:12px;font-family:'DM Mono',monospace;color:${m.color};font-weight:600;">${m.g}g <span style="color:var(--muted);font-weight:400;">${m.pct}%</span></span>
        </div>
        <div class="tile-bar"><div class="tile-bar-fill" style="width:${Math.min(100,m.pct*2.5)}%;background:${m.color};"></div></div>
      </div>`).join('')}
    </div>
  </div>`;
}

// ════════════════════════════════════════════
// MODUS 3: ⚡ ADVANCED — Sleep Stages (real or estimated)
// ════════════════════════════════════════════
function _advSleepStagesHtml(sleepScore){
  let stages;
  let footer='';
  if(stagesAvailable&&lastHealthImportValues?.sleepStages){
    const s=lastHealthImportValues.sleepStages;
    const sleepHMins=(lastHealthImportValues.sleepH||0)*60;
    const measuredMins=s.total||(s.deep+s.rem+s.light)||0;
    const awakeMins=Math.max(0,sleepHMins-measuredMins);
    const grandTotal=sleepHMins||measuredMins||1;
    stages=[
      {label:'Wach', mins:awakeMins,      color:'#FF7043'},
      {label:'REM',  mins:s.rem||0,       color:'var(--purple)'},
      {label:'Core', mins:s.light||0,     color:'var(--info)'},
      {label:'Tief', mins:s.deep||0,      color:'#2563EB'},
    ].map(st=>({...st,pct:Math.round(st.mins/grandTotal*100)}));
  } else {
    const q=sleepScore/10;
    const awakePct=Math.round(20-q*15);
    const remPct=Math.round(15+q*10);
    const corePct=Math.round(58-q*8);
    const deepPct=Math.max(0,100-awakePct-remPct-corePct);
    const totalH=3.5+sleepScore*0.55;
    stages=[
      {label:'Wach',pct:awakePct,mins:totalH*60*awakePct/100,color:'#FF7043'},
      {label:'REM', pct:remPct,  mins:totalH*60*remPct/100,  color:'var(--purple)'},
      {label:'Core',pct:corePct, mins:totalH*60*corePct/100, color:'var(--info)'},
      {label:'Tief',pct:deepPct, mins:totalH*60*deepPct/100, color:'#2563EB'},
    ];
    footer='<p style="font-size:10px;color:var(--muted);margin-top:4px;">⚠ Schätzung · Kein Stage-Import</p>';
  }
  return`<div class="card">
    <div class="card-label-mono">🌙 SCHLAF-STAGES</div>
    ${stages.map(s=>`<div style="margin-bottom:10px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
        <span style="font-size:12px;color:var(--text2);">${s.label} <span style="color:${s.color};font-weight:600;">${s.pct}%</span></span>
        <span style="font-size:11px;color:var(--muted);font-family:'DM Mono',monospace;">${_minsToHm(s.mins)}</span>
      </div>
      <div class="tile-bar"><div class="tile-bar-fill" style="width:${s.pct}%;background:${s.color};"></div></div>
    </div>`).join('')}
    ${footer}
  </div>`;
}

// ════════════════════════════════════════════
// MODUS 3: ⚡ ADVANCED
// ════════════════════════════════════════════
function renderAdvancedHome(d){
  if(!d)d=_buildDashData();
  const el=document.getElementById('home-render');if(!el)return;
  const {c,greeting,trainLabel,trainSub,rColor,eaten,goalKcal,eatenPct,hour}=d;
  const streak=calcStreak();
  const liftToday=getBestLiftToday();
  const circ=226,off=Math.round(circ-circ*c.recovery/100);
  const slp=Math.round(c.s.sleep*10);
  const sCol=slp>=70?'var(--purple)':slp>=50?'#FFAD33':'#FF5757';
  const netE=eaten-goalKcal,nCol=netE<=0?'var(--accent)':'var(--warn)';
  const recLbl=c.recovery>=75?'Optimal':c.recovery>=50?'Moderat':'Kritisch';
  const badgeCls=c.recovery>=75?'badge-green':c.recovery>=50?'badge-yellow':'badge-red';

  const miniMetrics=`
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px;">
      ${[{label:'Recovery',val:c.recovery+'%',color:rColor},
         {label:'Schlaf',  val:slp+'%',       color:sCol},
         {label:'Stress',  val:c.s.stress+'/10',color:'var(--info)'},
         {label:'Net Kcal',val:(netE>0?'+':'')+Math.round(netE).toLocaleString('de-DE'),color:nCol}
      ].map(m=>`<div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:12px 8px;text-align:center;">
        <div style="font-size:16px;font-weight:700;color:${m.color};font-family:'DM Mono',monospace;">${m.val}</div>
        <div style="font-size:9px;color:var(--muted);margin-top:3px;font-family:'DM Mono',monospace;letter-spacing:.06em;text-transform:uppercase;">${m.label}</div>
      </div>`).join('')}
    </div>`;

  // ── No Watch: simplified layout
  if(!watchAvailable){
    el.innerHTML=`
      ${_bedtimeBannerHtml(hour)}
      <div class="hero-card" style="background:linear-gradient(145deg,var(--card),var(--card2));">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div class="hero-greet">${greeting}${_streakBadgeHtml(streak)}</div>
          ${liftToday.name?`<span style="font-size:11px;font-weight:700;color:var(--info);font-family:'DM Mono',monospace;white-space:nowrap;flex-shrink:0;">🏋️ ${liftToday.name} · ${liftToday.kg}kg</span>`:''}
        </div>
        <div class="hero-session-row" style="margin-top:10px;">
          <span class="hero-title" id="dash-training">${trainLabel}</span>
          ${_logBtn()}
        </div>
        <div class="hero-sub" id="dash-training-sub" style="margin-top:6px;">${trainSub}</div>
      </div>
      <div class="card">
        <div class="card-label" style="margin-bottom:8px;">⌚ Apple Watch verbinden</div>
        <p style="font-size:12px;color:var(--muted);line-height:1.65;margin-bottom:14px;">Importiere deine Gesundheitsdaten für Recovery, HRV & Schlaf.</p>
        <button class="btn-primary" style="width:100%;" onclick="document.getElementById('health-file').click()">Daten importieren →</button>
      </div>
      ${miniMetrics}
      ${_stressCardHtml(c.s.stress,true)}
      ${_weeklySlot()}
      ${_advKcalCardHtml(d)}
      ${_waterCardHtml()}
    `;
    renderWater();
    if(typeof renderWeeklyReview==='function')renderWeeklyReview();
    return;
  }

  // ── Full Advanced layout
  el.innerHTML=`
    ${_bedtimeBannerHtml(hour)}
    <div class="hero-card" style="padding:18px 20px;">
      <div class="hero-glow" style="background:radial-gradient(ellipse at top right,${rColor}12 0%,transparent 65%);"></div>
      <div style="display:flex;align-items:center;gap:16px;">
        <div style="position:relative;width:72px;height:72px;flex-shrink:0;">
          <svg viewBox="0 0 88 88" style="position:absolute;inset:0;transform:rotate(-90deg);width:100%;height:100%;">
            <circle cx="44" cy="44" r="36" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="7"/>
            <circle cx="44" cy="44" r="36" fill="none" stroke="${rColor}" stroke-width="7" stroke-linecap="round" stroke-dasharray="226" stroke-dashoffset="${off}" style="--ring-offset:${off}" class="recovery-circle" id="recovery-circle"/>
          </svg>
          <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;">
            <span id="recovery-score" style="font-size:18px;font-weight:700;font-family:'DM Mono',monospace;color:${rColor};">${c.recovery}</span>
            <span style="font-size:8px;color:var(--muted);">%</span>
          </div>
        </div>
        <div style="flex:1;min-width:0;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
            <div class="hero-greet">${greeting}${_streakBadgeHtml(streak)}</div>
            ${liftToday.name?`<span style="font-size:11px;font-weight:700;color:var(--info);font-family:'DM Mono',monospace;white-space:nowrap;flex-shrink:0;">🏋️ ${liftToday.name} · ${liftToday.kg}kg</span>`:''}
          </div>
          <div class="hero-session-row">
            <span class="hero-title" id="dash-training">${trainLabel}</span>
            ${_logBtn()}
          </div>
          <div style="font-size:11px;color:var(--text2);margin-top:4px;font-family:'DM Mono',monospace;">
            HRV <span style="color:${rColor};font-weight:600;">${c.s.hrv} ms</span>
            <span style="color:var(--muted);margin:0 4px;">·</span>
            RHR <span style="color:${rColor};font-weight:600;">${c.s.rhr} bpm</span>
          </div>
        </div>
      </div>
      <div class="hero-badge-row" id="recovery-badge"><span class="badge ${badgeCls}">${recLbl}</span></div>
    </div>
    ${miniMetrics}
    ${_advSleepStagesHtml(c.s.sleep)}
    ${_stressCardHtml(c.s.stress,false)}
    ${_hrvSparklineHtml(c.s.hrv,c.s.rhr,rColor)}
    ${_weeklySlot()}
    ${_advKcalCardHtml(d)}
    ${_waterCardHtml()}
  `;
  renderWater();
  if(typeof renderWeeklyReview==='function')renderWeeklyReview();
}

window.setUIMode        =setUIMode;
window.heroLogAction    =heroLogAction;
window.saveBasicSleep   =saveBasicSleep;
window.saveBasicActivity=saveBasicActivity;
