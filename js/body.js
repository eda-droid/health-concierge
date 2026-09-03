// ════════════════════════════════════════════
// BODY — Körpermaße, Navy-KFA, Ziele, Verlauf, Vergleich, Schmerzen & Deload
// Öffentlich (onclick): siehe PUBLIC-API-Block am Dateiende
// ════════════════════════════════════════════
const BODY_METRICS=[
  {key:'hip',   label:'Hüfte',       unit:'cm', negGood:false},
  {key:'waist', label:'Taille',       unit:'cm', negGood:true},
  {key:'thigh', label:'Oberschenkel', unit:'cm', negGood:false},
  {key:'weight',label:'Gewicht',      unit:'kg', negGood:false},
  {key:'bf',    label:'Körperfett',   unit:'%',  negGood:true},
  {key:'arm',   label:'Oberarm',      unit:'cm', negGood:false},
  {key:'chest', label:'Brust',        unit:'cm', negGood:false},
];

var goalsEditMode=false;

// lsGet/lsSet JSON-codieren bereits — Altbestand ist doppelt codiert (String),
// daher beide Formen lesen können. Neu wird nur noch einfach codiert gespeichert.
function getGoals(){
  const v=lsGet('vitale_goals',null);
  if(!v)return{};
  if(typeof v==='string'){try{return JSON.parse(v)||{};}catch(e){return{};}}
  return v;
}
function saveGoals(obj){
  lsSet('vitale_goals',obj);
}

// ════════════════════════════════════════════
// INJURY / BODY MAP
// ════════════════════════════════════════════
function togglePain(part){
  painMap[part]=((painMap[part]||0)+1)%3;
  if(painMap[part]===0)delete painMap[part];
  saveAll();renderInjury();
}
function getBlockedExercises(){
  let blocked=[];
  Object.keys(painMap).forEach(part=>{if(painMap[part]>=1&&injuryMap[part])blocked=blocked.concat(injuryMap[part].avoid);});
  return[...new Set(blocked)];
}
function renderInjury(){
  document.querySelectorAll('.bodypart').forEach(el=>{
    const part=el.getAttribute('data-part');
    el.classList.remove('pain-mild','pain-severe');
    if(painMap[part]===1)el.classList.add('pain-mild');
    if(painMap[part]===2)el.classList.add('pain-severe');
  });
  const active=Object.keys(painMap).filter(p=>painMap[p]>0);
  const info=document.getElementById('injury-info');const adjCard=document.getElementById('injury-adjustment');
  if(!info||!adjCard)return;
  if(active.length===0){info.innerHTML='<p class="hint-text">Keine Beschwerden. Training läuft wie geplant. 💪</p>';adjCard.style.display='none';return;}
  info.innerHTML=active.map(p=>{
    const inj=injuryMap[p];if(!inj)return'';
    const sev=painMap[p]===2?'<span class="badge badge-red">Starker Schmerz</span>':'<span class="badge badge-yellow">Leichter Schmerz</span>';
    return`<div style="margin-bottom:12px;"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;"><strong style="font-size:13px;">${inj.name}</strong>${sev}</div><div style="font-size:12px;color:var(--muted);">Gesperrt: ${inj.avoid.join(', ')}</div></div>`;
  }).join('');
  adjCard.style.display='block';
  const allAlts=[...new Set(active.map(p=>injuryMap[p]?.alt).filter(Boolean))];
  const blocked=getBlockedExercises();
  document.getElementById('injury-adjust-content').innerHTML=`
    <div class="ai-box" style="margin-bottom:12px;"><div class="ai-chip">ANPASSUNG</div><strong>${blocked.length} Übung(en) gesperrt:</strong> ${blocked.join(', ')}.</div>
    <div class="card-label" style="margin-bottom:8px;">Empfohlene Alternativen</div>
    ${allAlts.map(a=>`<div class="stat-row"><span class="sr-label" style="color:var(--accent);">→</span><span style="color:var(--text);font-weight:400;">${a}</span></div>`).join('')}`;
}

// ════════════════════════════════════════════
// DELOAD
// ════════════════════════════════════════════
function renderDeloadStatus(){
  const weeks=getDeloadWeeks();const pct=Math.min(100,Math.round(weeks/7*100));
  const color=weeks>=8?'var(--danger)':weeks>=6?'var(--warn)':'var(--accent)';
  const el=document.getElementById('deload-status');if(!el)return;
  el.innerHTML=`
    <div class="stat-row"><span class="sr-label">Aktuelle Woche</span><span class="sr-val" style="color:${color};">Woche ${weeks+1}</span></div>
    <div class="stat-row"><span class="sr-label">Deload empfohlen</span><span class="sr-val">nach 6–8 Wochen</span></div>
    <div class="progress-bar-wrap" style="margin-top:10px;"><span style="min-width:60px;color:var(--muted);font-size:11px;">Zyklus</span><div class="progress-bar-bg"><div class="progress-bar-fill" style="width:${pct}%;background:${color};"></div></div><span style="min-width:50px;text-align:right;font-size:11px;color:${color};">${weeks}/7 Wo.</span></div>
    <div style="margin-top:10px;font-size:12px;color:var(--muted);">${weeks>=6?'⚠ Zeit für Deload.':'Noch '+(6-weeks)+' Woche(n) bis Deload.'}</div>`;
}
function resetDeloadCycle(){
  showModal('Neuen Zyklus starten?','Setzt den Deload-Timer zurück auf Woche 1.',function(){appState.deloadStart=Date.now();lsSet('hc_state',appState);renderDeloadStatus();renderDeloadBanner();});
}

// ════════════════════════════════════════════
// NAVY KFA
// ════════════════════════════════════════════
function calcNavy(){
  const p=getProfile();
  const neck=parseFloat(val('m-neck'))||38;
  const waist=parseFloat(val('m-waist'))||84;
  const hip=parseFloat(val('m-hip'))||95;
  const h=p.height;
  const hipGroup=document.getElementById('hip-group');
  if(hipGroup)hipGroup.style.display=p.gender==='f'?'flex':'none';
  const wl=document.getElementById('waist-label');
  if(wl)wl.textContent=p.gender==='f'?'TAILLE (SCHMALSTE STELLE)':'BAUCHNABEL (TAILLE)';

  let bf;
  if(p.gender==='m'){
    const diff=Math.max(0.1,waist-neck);
    bf=495/(1.0324-0.19077*Math.log10(diff)+0.15456*Math.log10(h))-450;
  } else {
    const sum=Math.max(0.1,waist+hip-neck);
    bf=495/(1.29579-0.35004*Math.log10(sum)+0.22100*Math.log10(h))-450;
  }
  bf=Math.max(3,Math.min(60,bf));
  const bfR=Math.round(bf*10)/10;
  const fatMass=Math.round(p.weight*bf/100*10)/10;
  const leanMass=Math.round((p.weight-fatMass)*10)/10;
  let cat,catColor;
  if(p.gender==='m'){
    if(bf<6){cat='Essentiell';catColor='var(--info)';}
    else if(bf<14){cat='Athletisch';catColor='var(--accent)';}
    else if(bf<18){cat='Fit';catColor='var(--accent)';}
    else if(bf<25){cat='Durchschnitt';catColor='var(--warn)';}
    else{cat='Erhöht';catColor='var(--danger)';}
  } else {
    if(bf<14){cat='Essentiell';catColor='var(--info)';}
    else if(bf<21){cat='Athletisch';catColor='var(--accent)';}
    else if(bf<25){cat='Fit';catColor='var(--accent)';}
    else if(bf<32){cat='Durchschnitt';catColor='var(--warn)';}
    else{cat='Erhöht';catColor='var(--danger)';}
  }
  const nr=document.getElementById('navy-result');
  if(nr)nr.innerHTML=`
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:12px;">
      <div class="summary-card"><div class="summary-val" style="font-size:18px;color:${catColor};">${bfR}%</div><div class="summary-label">Körperfett</div></div>
      <div class="summary-card"><div class="summary-val" style="font-size:18px;color:var(--accent);">${leanMass}</div><div class="summary-label">Magermasse (kg)</div></div>
      <div class="summary-card"><div class="summary-val" style="font-size:18px;color:var(--warn);">${fatMass}</div><div class="summary-label">Fettmasse (kg)</div></div>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:12px;"><span style="color:var(--muted);">Kategorie</span><span class="badge" style="background:${catColor}22;color:${catColor};">${cat}</span></div>
    ${p.gender==='f'?'<p style="font-size:11px;color:var(--muted);margin-top:10px;">Frauen-Formel: (Taille + Hüfte − Hals). Hüftfeld oben ausfüllen.</p>':''}`;
  saveAll();return bfR;
}

// ════════════════════════════════════════════
// KÖRPERMESSUNGEN — Speichern / Bearbeiten
// ════════════════════════════════════════════
function saveMeasurement(){
  const bf=calcNavy();
  const targetDate=editingMeasureDate||getTodayKey();
  const entry={date:targetDate,weight:parseFloat(val('p-weight'))||80,bf,
    neck:parseFloat(val('m-neck'))||0,waist:parseFloat(val('m-waist'))||0,hip:parseFloat(val('m-hip'))||0,
    chest:parseFloat(val('m-chest'))||0,arm:parseFloat(val('m-arm'))||0,thigh:parseFloat(val('m-thigh'))||0};
  measureData=measureData.filter(m=>m.date!==entry.date);
  measureData.push(entry);measureData.sort((a,b)=>a.date.localeCompare(b.date));
  const wasEditing=!!editingMeasureDate;
  editingMeasureDate=null;
  _updateEditBanner();
  saveMeasureData();renderMeasureHistory();populateCompareDates();renderBodyHero();renderDashboard();updateAll();
  const st=document.getElementById('measure-save-status');
  if(st){
    st.innerHTML=`<span style="color:var(--accent);">✓ ${wasEditing?'Aktualisiert':'Gespeichert'} (${entry.date})</span>`;
    setTimeout(()=>{st.innerHTML='';},4000);
  }
}

function editMeasurement(date){
  const m=measureData.find(x=>x.date===date);if(!m)return;
  setVal('p-weight',m.weight||'');
  setVal('m-neck',m.neck||'');
  setVal('m-waist',m.waist||'');
  setVal('m-hip',m.hip||'');
  setVal('m-chest',m.chest||'');
  setVal('m-arm',m.arm||'');
  setVal('m-thigh',m.thigh||'');
  editingMeasureDate=date;
  _updateEditBanner();
  calcNavy();
  const card=document.getElementById('measure-save-status');
  if(card)card.scrollIntoView({behavior:'smooth',block:'center'});
}

function cancelEditMeasurement(){
  editingMeasureDate=null;
  _updateEditBanner();
  const st=document.getElementById('measure-save-status');
  if(st)st.innerHTML='';
}

function deleteMeasurement(date){
  showModal(
    'Messung löschen?',
    `Messung vom <strong>${date}</strong> endgültig löschen?`,
    function(){
      measureData=measureData.filter(m=>m.date!==date);
      if(editingMeasureDate===date){editingMeasureDate=null;_updateEditBanner();}
      saveMeasureData();renderMeasureHistory();renderDashboard();updateAll();
    }
  );
}

function _updateEditBanner(){
  const btn=document.getElementById('measure-save-btn');
  const banner=document.getElementById('measure-edit-banner');
  if(editingMeasureDate){
    if(btn)btn.textContent='💾 Messung aktualisieren';
    if(banner)banner.innerHTML=`
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;">
        <span style="color:var(--warn);font-size:12px;font-weight:600;">✏️ Bearbeite Messung vom ${editingMeasureDate}</span>
        <button class="btn-ghost" style="font-size:11px;padding:5px 12px;" onclick="cancelEditMeasurement()">Abbrechen</button>
      </div>`;
    if(banner)banner.style.display='block';
  } else {
    if(btn)btn.textContent='📏 Heutige Maße + KFA speichern';
    if(banner)banner.style.display='none';
  }
}

// ════════════════════════════════════════════
// MESS-HISTORIE
// ════════════════════════════════════════════
function _getMeasureFiltered(){
  if(!measureData.length)return[];
  if(measureHistoryFilter==='all')return measureData;
  const days={30:30,'30d':30,'90d':90,'1y':365}[measureHistoryFilter]||30;
  const cutoff=new Date();cutoff.setDate(cutoff.getDate()-days);
  const cutStr=_localDateKey(cutoff);
  return measureData.filter(m=>m.date>=cutStr);
}
function _setMeasureFilter(f){measureHistoryFilter=f;measureHistoryShown=5;renderMeasureHistory();}
function _loadMoreMeasurements(){measureHistoryShown+=5;renderMeasureHistory();}

const MEASURE_HISTORY_METRICS=[
  {key:'weight',label:'Gewicht',unit:'kg'},
  {key:'hip',label:'Hüfte',unit:'cm'},
  {key:'waist',label:'Taille',unit:'cm'},
  {key:'bf',label:'Körperfett',unit:'%'},
  {key:'chest',label:'Brust',unit:'cm'},
  {key:'arm',label:'Oberarm',unit:'cm'},
  {key:'thigh',label:'Oberschenkel',unit:'cm'},
];
let _measureHistoryMetric='weight';
let _measureHistoryObserver=null;
function _measureNumber(value){return Number(value).toLocaleString('de-DE',{maximumFractionDigits:1});}
function _measureDate(date){return new Date(date+'T12:00:00').toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'});}
function _measureSeries(rows,key){
  return rows.filter(m=>Number.isFinite(Number(m[key]))&&Number(m[key])>0).sort((a,b)=>a.date.localeCompare(b.date));
}
function _selectMeasureMetric(key){
  if(!MEASURE_HISTORY_METRICS.some(m=>m.key===key))return;
  _measureHistoryMetric=key;
  const el=document.getElementById('measure-history');if(!el)return;
  el.querySelectorAll('[data-measure-metric]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.measureMetric===key)));
  _renderMeasureHistoryChart();
}
function _renderMeasureHistoryChart(){
  const el=document.getElementById('measure-selected-chart');if(!el)return;
  const metric=MEASURE_HISTORY_METRICS.find(m=>m.key===_measureHistoryMetric)||MEASURE_HISTORY_METRICS[0];
  const series=_measureSeries(_getMeasureFiltered(),metric.key);
  const title=metric.key==='weight'?'Gewichtsverlauf':metric.label+' · Verlauf';
  if(series.length<2){
    el.innerHTML=`<div class="measure-chart-heading"><strong>${title}</strong></div>
      <p class="measure-chart-empty">${series.length?'Eine Messung vorhanden – für einen Verlauf fehlt eine Vergleichsmessung.':'Keine Messung im gewählten Zeitraum.'}</p>
      <p class="measure-chart-note">Veränderung: —</p>`;
    return;
  }
  const first=series[0],last=series[series.length-1];
  const difference=Math.round((Number(last[metric.key])-Number(first[metric.key]))*10)/10;
  const changeUnit=metric.key==='bf'?'Prozentpunkte':metric.unit;
  // Kalenderabstände abbilden; die Breite folgt der Karte auch nach einem Tabwechsel.
  const width=Math.max(240,el.clientWidth||340),height=150;
  const pad={left:58,right:28,top:14,bottom:30};
  const time=m=>Date.parse(m.date+'T00:00:00Z');
  const start=time(first),span=time(last)-start||1;
  const values=series.map(m=>Number(m[metric.key]));
  const low=Math.min(...values),high=Math.max(...values);
  const x=m=>pad.left+(time(m)-start)/span*(width-pad.left-pad.right);
  const y=m=>high===low?(pad.top+height-pad.bottom)/2:pad.top+(high-Number(m[metric.key]))/(high-low)*(height-pad.top-pad.bottom);
  const coordinates=series.map(m=>`${x(m)},${y(m)}`).join(' ');
  const tickIndices=[...new Set([0,Math.floor((series.length-1)/2),series.length-1])];
  const ticks=tickIndices.filter((i,n)=>n===0||n===tickIndices.length-1||x(series[i])-x(first)>65&&x(last)-x(series[i])>65);
  const xLabels=ticks.map((i,n)=>`<text x="${x(series[i])}" y="${height-6}" text-anchor="${n===0?'start':n===ticks.length-1?'end':'middle'}">${series[i].date.slice(8)}.${series[i].date.slice(5,7)}.</text>`).join('');
  const dots=series.map(m=>`<circle cx="${x(m)}" cy="${y(m)}" r="3" class="measure-chart-dot"><title>${_measureDate(m.date)}: ${_measureNumber(m[metric.key])} ${metric.unit}</title></circle>`).join('');
  el.innerHTML=`<div class="measure-chart-heading"><strong>${title}</strong><span>${metric.unit}</span></div>
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${title}: ${series.length} Messungen vom ${_measureDate(first.date)} bis ${_measureDate(last.date)}; zuletzt ${_measureNumber(last[metric.key])} ${metric.unit}">
      <line x1="${pad.left}" y1="${height-pad.bottom}" x2="${width-pad.right}" y2="${height-pad.bottom}" class="measure-chart-rule"/>
      <text x="${pad.left-8}" y="${y(series[values.indexOf(high)])+4}" text-anchor="end">${_measureNumber(high)}</text>
      ${high!==low?`<text x="${pad.left-8}" y="${height-pad.bottom+4}" text-anchor="end">${_measureNumber(low)}</text>`:''}
      <polyline points="${coordinates}" class="measure-chart-line"/>${dots}${xLabels}
    </svg>
    <p class="measure-chart-note">${difference>0?'+':''}${_measureNumber(difference)} ${changeUnit} · ${_measureDate(first.date)}–${_measureDate(last.date)} · ${series.length} Messungen</p>`;
}
function renderMeasureHistory(){
  const el=document.getElementById('measure-history');if(!el)return;
  const historyOpen=!!el.querySelector('#measure-saved-list[open]');
  const openDates=new Set([...el.querySelectorAll('[data-measure-date][open]')].map(row=>row.dataset.measureDate));
  if(!measureData.length){el.innerHTML='<p class="hint-text">Noch keine Messungen. Oben eintragen und speichern.</p>';return;}
  const filtered=[..._getMeasureFiltered()].sort((a,b)=>a.date.localeCompare(b.date));
  const filterDefs=[{k:'30d',l:'30 Tage'},{k:'90d',l:'3 Monate'},{k:'1y',l:'1 Jahr'},{k:'all',l:'Alle'}];
  let html=`<div class="measure-history-filters" aria-label="Zeitraum">
    ${filterDefs.map(f=>`<button type="button" onclick="_setMeasureFilter('${f.k}')" aria-pressed="${measureHistoryFilter===f.k}">${f.l}</button>`).join('')}
    <span>${filtered.length} von ${measureData.length} Messungen</span></div>`;
  if(!filtered.length){el.innerHTML=html+'<p class="hint-text">Keine Messungen im gewählten Zeitraum.</p>';return;}
  html+='<div class="measure-metric-grid" role="group" aria-label="Messwert für den Verlauf wählen">';
  MEASURE_HISTORY_METRICS.forEach(metric=>{
    const series=_measureSeries(filtered,metric.key),latest=series[series.length-1];
    html+=`<button type="button" class="measure-metric" data-measure-metric="${metric.key}" onclick="_selectMeasureMetric('${metric.key}')" aria-pressed="${_measureHistoryMetric===metric.key}" aria-controls="measure-selected-chart">
      <span>${metric.label}</span><strong>${latest?_measureNumber(latest[metric.key])+' <small>'+metric.unit+'</small>':'—'}</strong>
      <span class="measure-metric-date">${latest?_measureDate(latest.date):'Keine Messung'}</span></button>`;
  });
  html+='</div><div id="measure-selected-chart" class="measure-selected-chart" aria-live="polite"></div>';
  const sorted=[...filtered].reverse(),visible=sorted.slice(0,measureHistoryShown);
  const remaining=sorted.length-visible.length;
  html+=`<details id="measure-saved-list" class="measure-saved-list"${historyOpen?' open':''}><summary>Gespeicherte Messungen <span>(${filtered.length})</span></summary>`;
  visible.forEach(m=>{
    const isEditing=editingMeasureDate===m.date;
    const parts=MEASURE_HISTORY_METRICS.filter(metric=>Number(m[metric.key])>0).map(metric=>`${metric.label}: ${_measureNumber(m[metric.key])} ${metric.unit}`);
    if(Number(m.neck)>0)parts.push('Hals: '+_measureNumber(m.neck)+' cm');
    const summary=[m.weight>0?_measureNumber(m.weight)+' kg':'',m.bf>0?_measureNumber(m.bf)+' % KFA':''].filter(Boolean).join(' · ')||'Körpermaße';
    html+=`<details class="measure-saved-entry${isEditing?' is-editing':''}" data-measure-date="${m.date}"${openDates.has(m.date)||isEditing?' open':''}>
      <summary><span>${_measureDate(m.date)}${isEditing?' · wird bearbeitet':''}</span><span>${summary}</span></summary>
      <p>${parts.join(' · ')||'—'}</p>
      <div class="measure-entry-actions"><button type="button" class="btn-ghost" onclick="editMeasurement('${m.date}')">Bearbeiten</button>
      <button type="button" class="btn-ghost measure-delete" onclick="deleteMeasurement('${m.date}')">Löschen</button></div></details>`;
  });
  if(remaining>0)html+=`<button type="button" onclick="_loadMoreMeasurements()" class="btn-dashed">+ ${Math.min(remaining,5)} weitere laden (${remaining} übrig)</button>`;
  html+='</details>';
  el.innerHTML=html;
  _renderMeasureHistoryChart();
  if(!_measureHistoryObserver&&typeof ResizeObserver!=='undefined'){
    let lastWidth=0;
    _measureHistoryObserver=new ResizeObserver(entries=>{
      const width=entries[0].contentRect.width;
      if(width>0&&width!==lastWidth){lastWidth=width;_renderMeasureHistoryChart();}
    });
    _measureHistoryObserver.observe(el);
  }
  populateCompareDates();
  renderBodyHero();
}

// ════════════════════════════════════════════
// SCHMERZEN COLLAPSE
// ════════════════════════════════════════════
function toggleSchmerzenBlock(){
  const block=document.getElementById('schmerzen-block');
  const arrow=document.getElementById('schmerzen-arrow');
  if(!block)return;
  const open=block.style.display!=='none';
  block.style.display=open?'none':'block';
  if(arrow)arrow.style.transform=open?'':'rotate(90deg)';
  lsSet('vitale_schmerzen_open',open?'0':'1');
}

// ════════════════════════════════════════════
// MASS COMPARE
// ════════════════════════════════════════════
function populateCompareDates(){
  const a=document.getElementById('compare-date-a');
  const b=document.getElementById('compare-date-b');
  if(!a||!b)return;
  if(!measureData.length){
    a.innerHTML='<option>—</option>';
    b.innerHTML='<option>—</option>';
    const res=document.getElementById('mass-compare-result');
    if(res)res.innerHTML='<p class="hint-text">Noch keine Messungen vorhanden.</p>';
    return;
  }
  const prevA=a.value,prevB=b.value;
  const opts=measureData.map(m=>`<option value="${m.date}">${m.date}</option>`).join('');
  a.innerHTML=opts;b.innerHTML=opts;
  const oldest=measureData[0].date;
  const newest=measureData[measureData.length-1].date;
  a.value=prevA&&measureData.find(m=>m.date===prevA)?prevA:oldest;
  b.value=prevB&&measureData.find(m=>m.date===prevB)?prevB:newest;
  renderMassCompare();
}

function renderMassCompare(){
  const el=document.getElementById('mass-compare-result');
  if(!el)return;
  const dateA=document.getElementById('compare-date-a')?.value;
  const dateB=document.getElementById('compare-date-b')?.value;
  if(!dateA||!dateB||dateA===dateB){
    el.innerHTML='<p class="hint-text">Zwei verschiedene Daten wählen.</p>';
    return;
  }
  const mA=measureData.find(m=>m.date===dateA);
  const mB=measureData.find(m=>m.date===dateB);
  if(!mA||!mB){el.innerHTML='';return;}
  const rows=[
    {key:'weight',label:'Gewicht',unit:'kg',lowerIsBetter:false},
    {key:'bf',label:'Körperfett',unit:'%',lowerIsBetter:true},
    {key:'waist',label:'Taille',unit:'cm',lowerIsBetter:true},
    {key:'chest',label:'Brust',unit:'cm',lowerIsBetter:false},
    {key:'arm',label:'Oberarm',unit:'cm',lowerIsBetter:false},
    {key:'thigh',label:'Oberschenkel',unit:'cm',lowerIsBetter:false},
  ];
  let html='';
  rows.forEach(r=>{
    const vA=mA[r.key],vB=mB[r.key];
    if(!vA&&!vB)return;
    const diff=Math.round((vB-vA)*10)/10;
    const diffSign=diff>0?'+':'';
    const improved=(r.lowerIsBetter&&diff<0)||(!r.lowerIsBetter&&diff>0);
    const neutral=diff===0;
    const deltaColor=neutral?'var(--muted)':improved?'var(--accent)':'var(--danger)';
    const star=improved&&Math.abs(diff)>=0.5;
    html+=`<div class="compare-row${star?' compare-row-star':''}">
      <span class="compare-label">${r.label}</span>
      <span class="compare-vals"><span class="compare-val-a">${vA||'—'}${r.unit}</span><span class="compare-arrow"> → </span><span class="compare-val-b">${vB||'—'}${r.unit}</span></span>
      <span class="compare-delta" style="color:${deltaColor};">${star?'★ ':''}${diffSign}${diff}${r.unit}</span>
    </div>`;
  });
  if(!html)html='<p class="hint-text">Keine gemeinsamen Messwerte.</p>';
  el.innerHTML=html;
}

// ════════════════════════════════════════════
// BODY HERO CARD
// ════════════════════════════════════════════
// Verschiebt einen YYYY-MM-DD-Key um Kalendertage. T00:00:00 erzwingt lokale
// statt UTC-Interpretation (siehe _localDateKey).
function _shiftDateKey(dk,days){
  const d=new Date(dk+'T00:00:00');
  d.setDate(d.getDate()+days);
  return _localDateKey(d);
}
// Mittelwert des Gewichts über die 7 Kalendertage bis einschließlich endDateKey.
// Fensterprüfung ausschließlich per Stringvergleich — kein new Date().
function weeklyWeightMean(endDateKey){
  const fromKey=_shiftDateKey(endDateKey,-6);
  const inWindow=measureData.filter(m=>m.weight>0&&m.date>=fromKey&&m.date<=endDateKey);
  if(inWindow.length<3)return null; // Mittel aus 1-2 Werten ist kein Trend
  const mean=Math.round(inWindow.reduce((a,m)=>a+m.weight,0)/inWindow.length*100)/100;
  return{mean,n:inWindow.length,from:fromKey,to:endDateKey};
}
function weightTrend(){
  const today=getTodayKey();
  const current=weeklyWeightMean(today);
  const previous=weeklyWeightMean(_shiftDateKey(today,-7));
  if(!current||!previous)return null;
  const deltaKg=Math.round((current.mean-previous.mean)*100)/100;
  return{current,previous,deltaKg,n:current.n};
}
function renderBodyHero(){
  const el=document.getElementById('body-hero-content');
  if(!el)return;
  if(!measureData.length){
    el.innerHTML='<p class="hint-text-sm">Erste Messung speichern um den Fortschritt zu sehen.</p>';
    renderGoalsSection();
    return;
  }
  const sorted=[...measureData].sort((a,b)=>a.date.localeCompare(b.date));
  const latest=sorted[sorted.length-1];
  const first=sorted[0];

  const hipNow=latest.hip||0;
  const hipFirst=first.hip||0;
  const hipDiff=hipNow&&hipFirst?Math.round((hipNow-hipFirst)*10)/10:null;

  const whr=(latest.waist&&latest.hip)?Math.round(latest.waist/latest.hip*100)/100:null;

  const wNow=latest.weight||0;
  const wFirst=first.weight||0;
  const wDiff=wNow&&wFirst?Math.round((wNow-wFirst)*10)/10:null;

  const diffStr=hipDiff!==null?(hipDiff>0?`+${hipDiff}`:`${hipDiff}`)+' cm seit Start':'';
  const diffColor=hipDiff!==null?(hipDiff>0?'var(--accent)':hipDiff<0?'var(--danger)':'var(--muted)'):'var(--muted)';

  const wkMean=weeklyWeightMean(getTodayKey());
  const wkTrend=weightTrend();
  const weekMeanHtml=wkMean
    ?`<div style="font-size:11px;color:var(--muted);margin-top:4px;font-family:'DM Mono',monospace;">Ø 7 Tage: ${wkMean.mean} kg (${wkMean.n} Messungen)</div>`
    :`<div style="font-size:11px;color:var(--muted);margin-top:4px;">Ø 7 Tage: zu wenig Messungen</div>`;
  const weekTrendHtml=wkTrend
    ?`<div style="font-size:11px;color:var(--muted);margin-top:2px;font-family:'DM Mono',monospace;">${wkTrend.deltaKg>0?'+':''}${wkTrend.deltaKg} kg/Woche</div>`
    :'';

  let whrHtml='';
  if(whr){
    const whrColor=whr<0.80?'var(--accent)':whr<0.85?'var(--warn)':'var(--danger)';
    const whrLabel=whr<0.80?'Ideal':whr<0.85?'Gut':'Erhöht';
    whrHtml=`
      <div style="display:flex;align-items:center;gap:8px;margin-top:10px;padding-top:10px;border-top:1px solid var(--border);">
        <span style="font-size:11px;color:var(--muted);flex:1;">Taille-Hüft-Ratio (WHR)</span>
        <span style="font-family:'DM Mono',monospace;font-size:13px;font-weight:700;color:${whrColor};">${whr}</span>
        <span class="badge" style="background:${whrColor}22;color:${whrColor};">${whrLabel}</span>
      </div>`;
  }

  el.innerHTML=`
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;">
      <div style="flex:1;">
        <div style="font-size:11px;color:var(--muted);letter-spacing:.08em;text-transform:uppercase;margin-bottom:8px;">Hüfte — Hauptmetrik</div>
        <div style="font-size:42px;font-weight:700;font-family:'DM Mono',monospace;letter-spacing:-0.03em;line-height:1;color:var(--text);">
          ${hipNow||'—'}<span style="font-size:18px;font-weight:400;color:var(--muted);margin-left:4px;">cm</span>
        </div>
        ${hipDiff!==null?`<div style="font-size:13px;color:${diffColor};margin-top:6px;font-family:'DM Mono',monospace;">${diffStr}</div>`:''}
      </div>
      <div style="text-align:right;">
        <div style="font-size:11px;color:var(--muted);margin-bottom:4px;">Gewicht</div>
        <div style="font-size:20px;font-weight:700;font-family:'DM Mono',monospace;">
          ${wNow||'—'}<span style="font-size:12px;font-weight:400;color:var(--muted);">kg</span>
        </div>
        ${wDiff!==null?`<div style="font-size:11px;color:${wDiff<0?'var(--accent)':'var(--muted)'};font-family:'DM Mono',monospace;">${wDiff>0?'+':''}${wDiff} kg</div>`:''}
        ${weekMeanHtml}
        ${weekTrendHtml}
      </div>
    </div>
    ${whrHtml}`;
  renderGoalsSection();
}

// ════════════════════════════════════════════
// GOALS SECTION
// ════════════════════════════════════════════
function renderGoalsSection(){
  const el=document.getElementById('body-goals-section');
  if(!el)return;
  const goals=getGoals();
  const sorted=[...measureData].sort((a,b)=>a.date.localeCompare(b.date));
  const latest=sorted[sorted.length-1]||{};
  const hasAnyGoal=BODY_METRICS.some(m=>goals[m.key]);

  if(goalsEditMode){
    let html=`<div style="font-size:11px;font-weight:600;color:var(--muted);letter-spacing:.1em;text-transform:uppercase;margin-bottom:12px;">Ziele setzen</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;">`;
    BODY_METRICS.forEach(m=>{
      const current=goals[m.key]||'';
      html+=`<div class="form-group">
        <label>${m.label.toUpperCase()} (${m.unit})</label>
        <input type="number" id="goal-input-${m.key}" placeholder="Ziel..." value="${current}" min="0" step="0.1"
               style="background:var(--card);border:1px solid var(--border);border-radius:8px;padding:8px;color:var(--text);font-size:14px;font-family:'DM Mono',monospace;text-align:center;width:100%;box-sizing:border-box;outline:none;transition:border-color .18s;"
               onfocus="this.style.borderColor='var(--accent)'"
               onblur="this.style.borderColor='var(--border)'">
      </div>`;
    });
    html+=`</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <button class="btn-primary" onclick="saveGoalsFromInputs()">Ziele speichern</button>
        <button class="btn-ghost" onclick="goalsEditMode=false;renderGoalsSection()">Abbrechen</button>
      </div>`;
    el.innerHTML=html;
    return;
  }

  if(!hasAnyGoal){
    el.innerHTML=`<button class="btn-ghost" style="width:100%;font-size:12px;" onclick="goalsEditMode=true;renderGoalsSection()">+ Ziel setzen</button>`;
    return;
  }

  let html='';
  BODY_METRICS.forEach(m=>{
    const goal=goals[m.key];
    if(!goal)return;
    const current=latest[m.key]||0;
    const diff=current&&goal?Math.round((goal-current)*10)/10:null;
    const firstVal=(sorted[0]||{})[m.key]||current;
    const wantLower=goal<firstVal;

    const atGoal=wantLower
      ?(current<=goal&&current>=goal-1)
      :(current>=goal&&current<=goal+1);
    const overshot=wantLower
      ?(current>0&&current<goal-1)
      :(current>0&&current>goal+1);

    const distToGoal=Math.abs(current-goal);
    const scale=Math.max(1,goal*0.15);
    const displayPct=(overshot||atGoal)
      ?100
      :Math.min(99,Math.max(5,Math.round((1-distToGoal/scale)*100)));

    const barColor=overshot?'var(--muted)'
      :atGoal?'var(--accent)'
      :'var(--warn)';

    const statusText=overshot
      ?`<span style="color:var(--muted);">✓ Übertroffen</span>`
      :atGoal
      ?`<span style="color:var(--accent);">Ziel erreicht 🎯</span>`
      :diff!==null
      ?`<span style="color:${barColor};">noch ${wantLower?`−${Math.abs(diff)}`:`+${diff}`}${m.unit}</span>`
      :'';

    html+=`<div style="margin-bottom:10px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
        <span style="font-size:12px;font-weight:500;">${m.label}</span>
        <span style="font-size:11px;font-family:'DM Mono',monospace;color:var(--muted);">
          ${current||'—'}${m.unit} / ${goal}${m.unit}
          ${statusText?`<span style="margin-left:6px;">${statusText}</span>`:''}
        </span>
      </div>
      <div style="height:5px;background:var(--border);border-radius:3px;overflow:hidden;">
        <div style="width:${displayPct}%;height:100%;background:${barColor};border-radius:3px;transition:width .6s;"></div>
      </div>
    </div>`;
  });
  html+=`<button class="btn-ghost" style="width:100%;font-size:11px;margin-top:4px;" onclick="goalsEditMode=true;renderGoalsSection()">Ziele bearbeiten</button>`;
  el.innerHTML=html;
}

function saveGoalsFromInputs(){
  const obj={};
  BODY_METRICS.forEach(m=>{
    const v=document.getElementById('goal-input-'+m.key)?.value;
    obj[m.key]=v?parseFloat(v):null;
  });
  saveGoals(obj);
  goalsEditMode=false;
  renderGoalsSection();
  renderBodyHero();
}

// ════════════════════════════════════════════
// GENDER-CHANGE HANDLER
// ════════════════════════════════════════════
function _onGenderChange(){
  const g=val('p-gender');
  const hipGroup=document.getElementById('hip-group');
  if(g==='f'){
    if(hipGroup)hipGroup.style.display='flex';
    if(!val('m-neck')||parseFloat(val('m-neck'))===38)setVal('m-neck',32);
    if(!val('m-waist')||parseFloat(val('m-waist'))===84||parseFloat(val('m-waist'))===85)setVal('m-waist',72);
    if(!val('m-hip'))setVal('m-hip',95);
  } else {
    if(hipGroup)hipGroup.style.display='none';
    if(!val('m-neck')||parseFloat(val('m-neck'))===32)setVal('m-neck',38);
    if(!val('m-waist')||parseFloat(val('m-waist'))===72)setVal('m-waist',85);
  }
  saveAll();
  calcNavy();
}

// ════════════════════════════════════════════
// PUBLIC API (von onclick=/onchange= benötigt)
// ════════════════════════════════════════════
window.toggleSchmerzenBlock  =toggleSchmerzenBlock;
window.renderMassCompare     =renderMassCompare;
window.saveGoalsFromInputs   =saveGoalsFromInputs;
window.renderGoalsSection    =renderGoalsSection;
window.togglePain            =togglePain;
window.resetDeloadCycle      =resetDeloadCycle;
window.saveMeasurement       =saveMeasurement;
window.calcNavy              =calcNavy;
window.editMeasurement       =editMeasurement;
window.deleteMeasurement     =deleteMeasurement;
window.cancelEditMeasurement =cancelEditMeasurement;
window._selectMeasureMetric  =_selectMeasureMetric;
window._setMeasureFilter     =_setMeasureFilter;
window._loadMoreMeasurements =_loadMoreMeasurements;
window._onGenderChange       =_onGenderChange;
window.weeklyWeightMean      =weeklyWeightMean;
window.weightTrend           =weightTrend;
