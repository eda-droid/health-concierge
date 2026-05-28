// ════════════════════════════════════════════
// UI MODE TOGGLE
// ════════════════════════════════════════════
function setUIMode(mode){
  globalUIMode=mode;
  lsSet('vitale_ui_mode',mode);
  _applyModeToggleUI();
  renderDashboard();
  if(typeof renderWeeklyReview==='function')renderWeeklyReview();
}
function _applyModeToggleUI(){
  document.querySelectorAll('.ui-mode-toggle .mode-btn').forEach(b=>b.classList.toggle('active',b.dataset.mode===globalUIMode));
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
    <span><span class="macro-dot" style="background:#9B7FFF;"></span><span style="color:var(--text2);">F</span> <span style="color:var(--text);font-weight:600;">${fat}g</span></span>
  </div>`;
}
function _kcalCardHtml(d,withMacros){
  const {goalKcal,eaten,remain,eatenPct,prot,carbs,fat}=d;
  return`<div class="card home-kcal-card">
    <div class="card-label-mono">🥗 ERNÄHRUNG HEUTE</div>
    <div class="home-kcal-3">
      <div><div class="home-kcal-val" id="k-goal" style="color:var(--accent);">${goalKcal.toLocaleString('de-DE')}</div><div class="home-kcal-lbl">Ziel</div></div>
      <div><div class="home-kcal-val" id="k-eaten">${eaten.toLocaleString('de-DE')}</div><div class="home-kcal-lbl">Gegessen</div></div>
      <div><div class="home-kcal-val" id="k-remain" style="color:${remain<0?'var(--danger)':'var(--info)'};">${remain.toLocaleString('de-DE')}</div><div class="home-kcal-lbl">Verbleibend</div></div>
    </div>
    <div class="kcal-bar" id="kcal-bar">${_kcalBarHtml(eatenPct,eaten,goalKcal)}</div>
    ${withMacros?_macroRowHtml(prot,carbs,fat):''}
  </div>`;
}
function _bedtimeBannerHtml(hour){
  if(hour<21)return'';
  return`<div class="bedtime-banner-inline">
    <span style="font-size:20px;">🌙</span>
    <div><div style="font-size:13px;font-weight:600;">Schlafenszeit nähert sich</div><div style="font-size:11px;color:var(--text2);margin-top:2px;">Ziel: 22:30 Uhr schlafen gehen</div></div>
  </div>`;
}
function _weeklySlot(){return`<div class="card" id="weekly-review-card"></div>`;}
function _aiBox(msg){return`<div class="ai-box"><div class="ai-chip">⚡ KI ANALYSE</div><div id="ai-recommendation">${msg}</div></div>`;}
function _logBtn(){return`<button class="hero-log-btn" onclick="document.querySelectorAll('.tab')[1]?.click()">Log →</button>`;}

// ════════════════════════════════════════════
// MODUS 1: 🚶 BASIC
// ════════════════════════════════════════════
function renderBasicHome(d){
  const el=document.getElementById('home-render');if(!el)return;
  const {greeting,trainLabel,trainSub,hour,aiMsg}=d;
  el.innerHTML=`
    <div class="hero-card" style="background:linear-gradient(145deg,var(--card),var(--card2));">
      <div class="hero-greet">${greeting}</div>
      <div class="hero-session-row" style="margin-top:10px;">
        <span class="hero-title" id="dash-training">${trainLabel}</span>
        ${_logBtn()}
      </div>
      <div class="hero-sub" id="dash-training-sub" style="margin-top:6px;">${trainSub}</div>
    </div>
    ${_bedtimeBannerHtml(hour)}
    ${_kcalCardHtml(d,true)}
    <div class="card">
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
    </div>
    ${_weeklySlot()}
    ${_aiBox(aiMsg)}`;
  renderWater();
  if(typeof renderWeeklyReview==='function')renderWeeklyReview();
}

// ════════════════════════════════════════════
// MODUS 2: 🌱 EINSTEIGER
// ════════════════════════════════════════════
function renderBeginnerHome(d){
  const el=document.getElementById('home-render');if(!el)return;
  const {c,greeting,trainLabel,trainSub,rColor,goalKcal,eaten,eatenPct,prot,carbs,fat,hour,aiMsg}=d;
  const circ=226,off=Math.round(circ-circ*c.recovery/100);
  const tc=132;
  const slp=Math.round(c.s.sleep*10);
  const sCol=slp>=70?'#9B7FFF':slp>=50?'#FFAD33':'#FF5757';
  const netE=eaten-goalKcal,nCol=netE<=0?'var(--accent)':'var(--warn)';
  const recLbl=c.recovery>=75?'Optimal':c.recovery>=50?'Moderat':'Kritisch';
  const badgeCls=c.recovery>=75?'badge-green':c.recovery>=50?'badge-yellow':'badge-red';
  el.innerHTML=`
    <div class="hero-card">
      <div class="hero-glow" style="background:radial-gradient(ellipse at top right,${rColor}12 0%,transparent 65%);"></div>
      <div class="hero-greet">${greeting}</div>
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
    ${_bedtimeBannerHtml(hour)}
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
    ${_kcalCardHtml(d,true)}
    ${_aiBox(aiMsg)}`;
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
    {label:'REM',pct:remPct,time:_minsToHm(totalH*60*remPct/100),color:'#9B7FFF'},
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
function _stressCardHtml(stress){
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
      <span class="badge" style="background:${lColor}18;color:${lColor};border:1px solid ${lColor}40;">${label}</span>
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
    ${known.length<2?'<p style="font-size:10px;color:var(--muted);margin-top:4px;">Verlauf füllt sich täglich</p>':''}
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
         {label:'Fett',g:fat,pct:fatP,color:'#9B7FFF'}].map(m=>`<div>
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
// MODUS 3: ⚡ ADVANCED
// ════════════════════════════════════════════
function renderAdvancedHome(d){
  const el=document.getElementById('home-render');if(!el)return;
  const {c,greeting,trainLabel,trainSub,rColor,eaten,goalKcal,eatenPct,hour,aiMsg}=d;
  const circ=226,off=Math.round(circ-circ*c.recovery/100);
  const slp=Math.round(c.s.sleep*10);
  const sCol=slp>=70?'#9B7FFF':slp>=50?'#FFAD33':'#FF5757';
  const netE=eaten-goalKcal,nCol=netE<=0?'var(--accent)':'var(--warn)';
  const recLbl=c.recovery>=75?'Optimal':c.recovery>=50?'Moderat':'Kritisch';
  const badgeCls=c.recovery>=75?'badge-green':c.recovery>=50?'badge-yellow':'badge-red';
  el.innerHTML=`
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
          <div class="hero-greet" style="margin-bottom:4px;">${greeting}</div>
          <div class="hero-session-row">
            <span class="hero-title" id="dash-training">${trainLabel}</span>
            ${_logBtn()}
          </div>
          <div class="hero-sub" id="dash-training-sub" style="margin-top:4px;">${trainSub}</div>
          <div style="display:flex;gap:10px;margin-top:8px;font-size:11px;font-family:'DM Mono',monospace;">
            <span style="color:var(--text2);">HRV <span style="color:${rColor};font-weight:600;">${c.s.hrv} ms</span></span>
            <span style="color:var(--muted);">·</span>
            <span style="color:var(--text2);">RHR <span style="color:${rColor};font-weight:600;">${c.s.rhr} bpm</span></span>
          </div>
        </div>
      </div>
      <div class="hero-badge-row" id="recovery-badge"><span class="badge ${badgeCls}">${recLbl}</span></div>
    </div>
    ${_bedtimeBannerHtml(hour)}
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px;">
      ${[{label:'Recovery',val:c.recovery+'%',color:rColor},
         {label:'Schlaf',val:slp+'%',color:sCol},
         {label:'Exertion',val:c.s.stress+'/10',color:'var(--info)'},
         {label:'Net Kcal',val:(netE>0?'+':'')+Math.round(netE).toLocaleString('de-DE'),color:nCol}
      ].map(m=>`<div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:12px 8px;text-align:center;">
        <div style="font-size:16px;font-weight:700;color:${m.color};font-family:'DM Mono',monospace;">${m.val}</div>
        <div style="font-size:9px;color:var(--muted);margin-top:3px;font-family:'DM Mono',monospace;letter-spacing:.06em;text-transform:uppercase;">${m.label}</div>
      </div>`).join('')}
    </div>
    ${_sleepStagesHtml(c.s.sleep)}
    ${_stressCardHtml(c.s.stress)}
    ${_hrvSparklineHtml(c.s.hrv,c.s.rhr,rColor)}
    ${_weeklySlot()}
    ${_advKcalCardHtml(d)}
    ${_aiBox(aiMsg)}`;
  if(typeof renderWeeklyReview==='function')renderWeeklyReview();
}
