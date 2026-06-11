// ════════════════════════════════════════════
// CHARTS — wiederverwendbarer SVG-Linechart + Gewichts-/Maße-Trend-Card
// points: [{x: 'YYYY-MM-DD', y: number}]
// opts  : {colorHex, unit, w, h, labelEvery}
// Öffentlich (onchange): renderWeightTrend
// ════════════════════════════════════════════
function _svgLineChart(points, opts={}){
  if(!points||points.length<2)return'';
  const W=opts.w||340, H=opts.h||80;
  const PAD={t:12,r:10,b:20,l:36};
  const IW=W-PAD.l-PAD.r, IH=H-PAD.t-PAD.b;
  const color=opts.color||'var(--accent)';
  const colorHex=opts.colorHex||'#00E5A0';
  const unit=opts.unit||'';
  const labelEvery=opts.labelEvery||(points.length<=6?1:points.length<=12?2:Math.ceil(points.length/6));

  const ys=points.map(p=>p.y);
  const minY=Math.min(...ys), maxY=Math.max(...ys);
  const rangeY=maxY-minY||1;

  const px=i=>PAD.l+Math.round(i/(points.length-1)*IW);
  const py=v=>PAD.t+Math.round((1-(v-minY)/rangeY)*IH);

  const lineCoords=points.map((p,i)=>`${px(i)},${py(p.y)}`).join(' ');
  const areaCoords=`${px(0)},${PAD.t+IH} `+points.map((p,i)=>`${px(i)},${py(p.y)}`).join(' ')+` ${px(points.length-1)},${PAD.t+IH}`;

  const yFmt=v=>Math.round(v*10)/10;

  const xLabels=points.map((p,i)=>{
    if(i%(labelEvery)!==0&&i!==points.length-1)return'';
    const lbl=p.x.slice(5);
    return`<text x="${px(i)}" y="${H-3}" text-anchor="middle" font-size="7" fill="rgba(255,255,255,0.3)" font-family="DM Mono,monospace">${lbl}</text>`;
  }).join('');

  const dots=points.map((p,i)=>{
    const isLast=i===points.length-1;
    const isFirst=i===0;
    if(isLast){
      const labelY=py(p.y)-8;
      const labelAbove=labelY>PAD.t+4;
      return`<circle cx="${px(i)}" cy="${py(p.y)}" r="4" fill="${colorHex}" stroke="var(--bg,#080C12)" stroke-width="2"/>
<text x="${px(i)}" y="${labelAbove?py(p.y)-8:py(p.y)+14}" text-anchor="middle" font-size="9" font-weight="700" fill="${colorHex}" font-family="DM Mono,monospace">${p.y}${unit}</text>`;
    }
    if(isFirst&&points.length>2){
      return`<circle cx="${px(i)}" cy="${py(p.y)}" r="2.5" fill="rgba(255,255,255,0.25)" stroke="none"/>`;
    }
    return`<circle cx="${px(i)}" cy="${py(p.y)}" r="2" fill="${colorHex}" opacity="0.45" stroke="none"/>`;
  }).join('');

  const tooltips=points.map((p,i)=>
    `<title>${p.x}: ${p.y}${unit}</title><rect x="${px(i)-8}" y="${PAD.t}" width="16" height="${IH}" fill="transparent"/>`
  ).join('');

  return`<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:${H}px;display:block;overflow:visible;">
    <defs>
      <linearGradient id="ag_${colorHex.replace('#','')}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${colorHex}" stop-opacity="0.18"/>
        <stop offset="100%" stop-color="${colorHex}" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <text x="${PAD.l-4}" y="${PAD.t+4}" text-anchor="end" font-size="7" fill="rgba(255,255,255,0.3)" font-family="DM Mono,monospace">${yFmt(maxY)}</text>
    <text x="${PAD.l-4}" y="${PAD.t+IH+1}" text-anchor="end" font-size="7" fill="rgba(255,255,255,0.3)" font-family="DM Mono,monospace">${yFmt(minY)}</text>
    <line x1="${PAD.l}" y1="${PAD.t+IH}" x2="${PAD.l+IW}" y2="${PAD.t+IH}" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>
    <polygon points="${areaCoords}" fill="url(#ag_${colorHex.replace('#','')})" />
    <polyline points="${lineCoords}" fill="none" stroke="${colorHex}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round" opacity="0.85"/>
    ${dots}
    ${xLabels}
    ${tooltips}
  </svg>`;
}

const _TREND_METRICS={
  weight:{label:'Gewichtsverlauf',      unit:'kg', colorHex:'#00E5A0'},
  bf:    {label:'KFA-Verlauf',          unit:'%',  colorHex:'#FF6B6B'},
  waist: {label:'Taille-Verlauf',       unit:'cm', colorHex:'#FFB347'},
  hip:   {label:'Hüfte-Verlauf',        unit:'cm', colorHex:'#C77DFF'},
  chest: {label:'Brust-Verlauf',        unit:'cm', colorHex:'#4FC3F7'},
  arm:   {label:'Oberarm-Verlauf',      unit:'cm', colorHex:'#F06292'},
  thigh: {label:'Oberschenkel-Verlauf', unit:'cm', colorHex:'#81C784'},
};

function renderWeightTrend(){
  const card=document.getElementById('weight-trend-card');if(!card)return;
  if(!measureData||measureData.length<2){card.style.display='none';return;}
  const sel=document.getElementById('trend-metric');
  const metric=(sel&&sel.value)||'weight';
  const cfg=_TREND_METRICS[metric]||_TREND_METRICS.weight;
  const lbl=document.getElementById('trend-metric-label');
  if(lbl)lbl.textContent=cfg.label;
  const recent=measureData.slice(-14).filter(m=>m[metric]>0);
  if(recent.length<2){card.style.display='none';return;}
  card.style.display='block';
  const first=recent[0][metric],last=recent[recent.length-1][metric];
  const diff=Math.round((last-first)*10)/10;
  const diffColor=metric==='weight'
    ?(currentGoal==='cut'?(diff<0?'var(--accent)':'var(--danger)'):currentGoal==='bulk'?(diff>0?'var(--accent)':'var(--warn)'):'var(--muted)')
    :(diff<0?'var(--accent)':'var(--muted)');
  document.getElementById('weight-trend-badge').innerHTML=`<span class="badge" style="background:${diffColor}22;color:${diffColor};">${diff>0?'+':''}${diff} ${cfg.unit}</span>`;
  const points=recent.map(m=>({x:m.date,y:m[metric]}));
  document.getElementById('weight-trend-chart').style.cssText='margin-bottom:4px;';
  document.getElementById('weight-trend-chart').innerHTML=_svgLineChart(points,{colorHex:cfg.colorHex,unit:cfg.unit,h:72});
  document.getElementById('weight-trend-dates').innerHTML='';
  const weeks=recent.length>1?Math.round((new Date(recent[recent.length-1].date)-new Date(recent[0].date))/(7*24*3600*1000)*10)/10:0;
  document.getElementById('weight-trend-note').textContent=`Aktuell: ${last} ${cfg.unit} · ${recent.length} Messungen${weeks>0?' über '+weeks+' Wochen':''}. Im Tab "Profil & Körper" speichern.`;
}

// ════════════════════════════════════════════
// PUBLIC API (von onchange= benötigt)
// ════════════════════════════════════════════
window.renderWeightTrend=renderWeightTrend;
