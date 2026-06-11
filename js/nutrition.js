// ════════════════════════════════════════════
// NUTRITION — Mahlzeiten-Tracking, Makros, Wochenbilanz, Vitamin-D-Rechner,
// Meal-Templates, Wochen-Review, Supplements
// Öffentlich (onclick): siehe PUBLIC-API-Block am Dateiende
// ════════════════════════════════════════════
function renderNutrition(){
  const c=computeAll();const dk=getTodayKey();const day=getDay(dk);
  const meals=getDayMeals(dk);
  const eaten=meals.reduce((a,m)=>a+m.kcal,0);
  const eatenP=meals.reduce((a,m)=>a+m.protein,0);
  const eatenC=meals.reduce((a,m)=>a+m.carbs,0);
  const eatenF=meals.reduce((a,m)=>a+m.fat,0);
  const remain=Math.round(c.goalKcal-eaten);
  const nGoal=document.getElementById('n-goal');if(!nGoal)return;
  nGoal.textContent=c.goalKcal.toLocaleString('de-DE');nGoal.style.color=getGoalColor();
  document.getElementById('n-goal-label').textContent=getGoalLabel();
  document.getElementById('n-eaten').textContent=eaten.toLocaleString('de-DE');
  document.getElementById('n-remain').textContent=remain.toLocaleString('de-DE');
  document.getElementById('n-remain').style.color=remain<0?'var(--danger)':'var(--info)';

  document.getElementById('meal-log-list').innerHTML=meals.length
    ?meals.map((m,i)=>{
      const macroStr=[m.protein?`P:${m.protein}g`:'',m.carbs?`C:${m.carbs}g`:'',m.fat?`F:${m.fat}g`:''].filter(Boolean).join(' · ');
      return`<div class="meal-row">
        <span class="meal-time">#${i+1}</span>
        <span class="meal-name">${m.name}</span>
        <span class="meal-macros" style="text-align:right;">
          <span style="color:var(--text2);">${m.kcal} kcal</span>
          ${macroStr?`<br><span style="font-size:10px;color:var(--muted);">${macroStr}</span>`:''}
        </span>
        <button class="del-btn" onclick="removeMeal(${i})">✕</button>
      </div>`;
    }).join('')
    :'<p class="hint-text-sm">Noch keine Mahlzeit eingetragen.</p>';

  const hasTrackedMacros=eatenP>0||eatenC>0||eatenF>0;
  let protPct,carbPct,fatPct;
  if(hasTrackedMacros){
    const totalTrackedKcal=eatenP*4+eatenC*4+eatenF*9||1;
    protPct=Math.round(eatenP*4/totalTrackedKcal*100);
    carbPct=Math.round(eatenC*4/totalTrackedKcal*100);
    fatPct=Math.max(0,100-protPct-carbPct);
  } else {
    protPct=Math.round(c.protein*4/c.goalKcal*100);
    carbPct=Math.round(c.carbs*4/c.goalKcal*100);
    fatPct=Math.max(0,100-protPct-carbPct);
  }
  document.getElementById('macro-bar').innerHTML=`<div style="flex:${protPct};background:var(--info);border-radius:4px 0 0 4px;min-width:${protPct?2:0}px;"></div><div style="flex:${carbPct};background:var(--warn);min-width:${carbPct?2:0}px;"></div><div style="flex:${fatPct};background:#EC4899;border-radius:0 4px 4px 0;min-width:${fatPct?2:0}px;"></div>`;

  const showTracked=eatenP>0||eatenC>0||eatenF>0;
  const fatKcalPct=eatenF>0&&eaten>0?Math.round(eatenF*9/eaten*100):0;
  const fatWarning=currentGoal==='bulk'&&fatKcalPct>35&&eatenF>0
    ?`<div style="background:rgba(255,173,51,0.1);border:1px solid rgba(255,173,51,0.25);border-radius:8px;padding:10px 12px;margin-top:10px;font-size:12px;line-height:1.6;color:var(--warn);">⚠ <strong>Tipp Bulk:</strong> Fett macht ${fatKcalPct}% deiner Kalorien aus. Über 35% im Bulk sind ineffizient — Kohlenhydrate liefern Trainingsenergie und schonen Muskelprotein. Mehr Carbs, weniger Fett anstreben.</div>`
    :'';

  let macroTableHtml='';
  if(showTracked){
    const rows=[
      {label:'Protein',color:'var(--info)',target:c.protein,eaten:eatenP,unit:'g'},
      {label:'Kohlenhydrate',color:'var(--warn)',target:c.carbs,eaten:eatenC,unit:'g'},
      {label:'Fett',color:'#EC4899',target:c.fat,eaten:eatenF,unit:'g'},
    ];
    macroTableHtml=`
      <table style="width:100%;border-collapse:collapse;font-size:12px;">
        <thead><tr>
          <td class="th-mono" style="padding:0 0 8px;width:40%;">MAKRO</td>
          <td class="th-mono" style="padding:0 0 8px;text-align:right;width:20%;">ZIEL</td>
          <td class="th-mono" style="padding:0 0 8px;text-align:right;width:20%;">HEUTE</td>
          <td class="th-mono" style="padding:0 0 8px;text-align:right;width:20%;">REST</td>
        </tr></thead>
        <tbody>
          ${rows.map(r=>{
            const rest=r.target-r.eaten;
            const restColor=rest<0?'var(--danger)':rest===r.target?'var(--muted)':'var(--text2)';
            return`<tr style="border-top:1px solid var(--border);">
              <td style="padding:9px 0;color:${r.color};font-weight:500;">■ ${r.label}</td>
              <td style="padding:9px 0;text-align:right;font-family:'DM Mono',monospace;color:var(--muted);">${r.target}${r.unit}</td>
              <td style="padding:9px 0;text-align:right;font-family:'DM Mono',monospace;color:${r.color};font-weight:600;">${r.eaten}${r.unit}</td>
              <td style="padding:9px 0;text-align:right;font-family:'DM Mono',monospace;color:${restColor};">${rest}${r.unit}</td>
            </tr>`;
          }).join('')}
          <tr style="border-top:1px solid var(--border);">
            <td style="padding:9px 0;font-weight:700;color:var(--text);">Gesamt</td>
            <td style="padding:9px 0;text-align:right;font-family:'DM Mono',monospace;color:${getGoalColor()};font-weight:600;">${c.goalKcal} kcal</td>
            <td style="padding:9px 0;text-align:right;font-family:'DM Mono',monospace;font-weight:600;">${eaten} kcal</td>
            <td style="padding:9px 0;text-align:right;font-family:'DM Mono',monospace;color:${remain<0?'var(--danger)':'var(--info)'};font-weight:600;">${remain} kcal</td>
          </tr>
        </tbody>
      </table>
      ${fatWarning}`;
  } else {
    macroTableHtml=`
      <table style="width:100%;border-collapse:collapse;font-size:12px;">
        <thead><tr>
          <td class="th-mono" style="padding:0 0 8px;">MAKRO</td>
          <td class="th-mono" style="padding:0 0 8px;text-align:right;">ZIEL</td>
        </tr></thead>
        <tbody>
          <tr style="border-top:1px solid var(--border);"><td style="padding:9px 0;color:var(--info);">■ Protein</td><td style="padding:9px 0;text-align:right;font-family:'DM Mono',monospace;">${c.protein}g</td></tr>
          <tr style="border-top:1px solid var(--border);"><td style="padding:9px 0;color:var(--warn);">■ Kohlenhydrate</td><td style="padding:9px 0;text-align:right;font-family:'DM Mono',monospace;">${c.carbs}g</td></tr>
          <tr style="border-top:1px solid var(--border);"><td style="padding:9px 0;color:#EC4899;">■ Fett</td><td style="padding:9px 0;text-align:right;font-family:'DM Mono',monospace;">${c.fat}g</td></tr>
          <tr style="border-top:1px solid var(--border);"><td style="padding:9px 0;font-weight:700;">Gesamt</td><td style="padding:9px 0;text-align:right;font-family:'DM Mono',monospace;color:${getGoalColor()};font-weight:600;">${c.goalKcal} kcal</td></tr>
        </tbody>
      </table>
      <p style="font-size:11px;color:var(--muted);margin-top:8px;">Protein/Carbs/Fett eintragen für echtes Tracking inkl. Rest-Anzeige.</p>`;
  }
  document.getElementById('macro-details').innerHTML=macroTableHtml;
  renderWeeklyNutrition();
  renderPeriodizationCheck();

  const pre=c.isTrainingDay;
  const mealPlan=[
    {time:'07:00',name:'Frühstück',kcal:Math.round(c.goalKcal*.25),prot:Math.round(c.protein*.25)},
    {time:'10:30',name:'Snack',kcal:Math.round(c.goalKcal*.10),prot:Math.round(c.protein*.10)},
    {time:'13:00',name:'Mittagessen',kcal:Math.round(c.goalKcal*.28),prot:Math.round(c.protein*.28)},
    ...(pre?[{time:'Pre★',name:'Pre-Workout',kcal:Math.round(c.goalKcal*.08),prot:Math.round(c.protein*.05),accent:true}]:[]),
    ...(pre?[{time:'Post★',name:'Post-Workout Shake',kcal:Math.round(c.protein*.25*4),prot:Math.round(c.protein*.25),accent:true}]:[]),
    {time:'19:00',name:'Abendessen',kcal:Math.round(c.goalKcal*.29),prot:Math.round(c.protein*.32)},
  ];
  document.getElementById('meal-timing').innerHTML=mealPlan.map(m=>`<div class="meal-row"><span class="meal-time" style="${m.accent?'color:var(--accent)':''}">${m.time}</span><span class="meal-name" style="${m.accent?'color:var(--accent)':''}">${m.name}</span><span class="meal-macros">${m.kcal} kcal · ${m.prot}g P</span></div>`).join('');
  const _actLabel=c.activitySource==='watch'?'Aktivität (Watch ⌚)':c.activitySource==='training-log'?'Aktivität (Trainingslog ≈)':'Aktivität (Ruhetag)';
  const _actColor=c.activitySource!=='none'?'var(--accent)':'var(--muted)';
  const _neatRow=c.neatInTdee
    ?`<div class="stat-row"><span class="sr-label">Schritte / NEAT</span><span class="sr-val">+${c.neat}</span></div>`
    :`<div class="stat-row"><span class="sr-label" style="color:var(--muted);">Schritte / NEAT</span><span class="sr-val" style="color:var(--muted);font-size:11px;">${c.neat} kcal ↳ in Watch enthalten</span></div>`;
  document.getElementById('calorie-breakdown').innerHTML=`
    <div class="stat-row"><span class="sr-label">Grundumsatz (RMR)</span><span class="sr-val">${c.rmr}</span></div>
    ${_neatRow}
    <div class="stat-row"><span class="sr-label">${_actLabel}</span><span class="sr-val" style="color:${_actColor};">${c.activityKcal>0?'+'+c.activityKcal:'—'}</span></div>
    <div class="stat-row"><span class="sr-label">Verdauung (TEF 10%)</span><span class="sr-val">+${c.tef}</span></div>
    <div class="stat-row"><span class="sr-label" style="font-weight:600;">TDEE / Erhalt</span><span class="sr-val" style="font-weight:600;">${c.tdee}</span></div>
    <div class="stat-row"><span class="sr-label" style="color:var(--text);font-weight:600;">Ziel (${currentGoal})</span><span class="sr-val" style="color:${getGoalColor()};">${c.goalKcal}</span></div>`;
  renderMealTemplates();
}

function renderWeeklyNutrition(){
  const el=document.getElementById('weekly-nutrition-summary');if(!el)return;
  let totalKcal=0,totalP=0,totalC=0,totalF=0,days=0;
  const dayRows=[];
  for(let i=-6;i<=0;i++){
    const dk=getDateKey(i);
    const day=dailyData[dk];
    if(!day||!day.meals||!day.meals.length)continue;
    const meals=getDayMeals(dk);
    const kcal=meals.reduce((a,m)=>a+m.kcal,0);
    const p=meals.reduce((a,m)=>a+m.protein,0);
    const c2=meals.reduce((a,m)=>a+m.carbs,0);
    const f=meals.reduce((a,m)=>a+m.fat,0);
    if(kcal>0){totalKcal+=kcal;totalP+=p;totalC+=c2;totalF+=f;days++;}
    dayRows.push({dk,kcal,p,c:c2,f,label:i===0?'Heute':i===-1?'Gestern':new Date(dk+'T12:00:00').toLocaleDateString('de-DE',{weekday:'short'})});
  }
  if(days===0){el.innerHTML='<p class="hint-text-sm">Trage täglich Mahlzeiten ein für die Wochenbilanz.</p>';return;}

  const avgKcal=Math.round(totalKcal/days);
  const c=computeAll();
  const kcalDiff=avgKcal-c.goalKcal;
  const diffColor=Math.abs(kcalDiff)<150?'var(--accent)':kcalDiff>0?'var(--warn)':'var(--danger)';
  const diffText=Math.abs(kcalDiff)<150?'Im Zielbereich ✓':kcalDiff>0?`+${kcalDiff} kcal über Ziel`:`${kcalDiff} kcal unter Ziel`;

  const maxKcal=Math.max(...dayRows.map(d=>d.kcal),c.goalKcal);
  const barsHtml=dayRows.map(d=>{
    const pct=d.kcal>0?Math.round(d.kcal/maxKcal*100):5;
    const color=Math.abs(d.kcal-c.goalKcal)<200?'var(--accent)':d.kcal>c.goalKcal?'var(--warn)':'var(--info)';
    return`<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;">
      <div style="font-size:9px;color:var(--muted);font-family:'DM Mono',monospace;">${d.kcal>0?d.kcal:''}</div>
      <div style="width:100%;height:40px;display:flex;align-items:flex-end;">
        <div style="width:100%;height:${pct}%;background:${d.kcal>0?color:'var(--border)'};border-radius:3px 3px 0 0;min-height:3px;"></div>
      </div>
      <div style="font-size:9px;color:var(--muted);font-family:'DM Mono',monospace;">${d.label}</div>
    </div>`;
  }).join('');

  el.innerHTML=`
    <div style="display:flex;gap:4px;margin-bottom:14px;">${barsHtml}</div>
    <div style="background:var(--surface);border-radius:10px;padding:12px;margin-bottom:10px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <span style="font-size:12px;font-weight:600;">Ø Kalorien/Tag</span>
        <span style="font-family:'DM Mono',monospace;font-size:13px;font-weight:700;">${avgKcal.toLocaleString('de-DE')} kcal</span>
      </div>
      <div style="font-size:11px;color:${diffColor};">${diffText} (Ziel: ${c.goalKcal} kcal)</div>
    </div>
    ${totalP>0?`
    <table style="width:100%;border-collapse:collapse;font-size:12px;">
      <thead><tr>
        <td class="th-mono" style="padding:0 0 8px;">WOCHE GESAMT</td>
        <td class="th-mono" style="padding:0 0 8px;text-align:right;">GESAMT</td>
        <td class="th-mono" style="padding:0 0 8px;text-align:right;">Ø / TAG</td>
        <td class="th-mono" style="padding:0 0 8px;text-align:right;">ZIEL/TAG</td>
      </tr></thead>
      <tbody>
        <tr style="border-top:1px solid var(--border);"><td style="padding:8px 0;color:var(--info);">■ Protein</td><td style="padding:8px 0;text-align:right;font-family:'DM Mono',monospace;">${totalP}g</td><td style="padding:8px 0;text-align:right;font-family:'DM Mono',monospace;color:var(--info);">${Math.round(totalP/days)}g</td><td style="padding:8px 0;text-align:right;font-family:'DM Mono',monospace;color:var(--muted);">${c.protein}g</td></tr>
        <tr style="border-top:1px solid var(--border);"><td style="padding:8px 0;color:var(--warn);">■ Carbs</td><td style="padding:8px 0;text-align:right;font-family:'DM Mono',monospace;">${totalC}g</td><td style="padding:8px 0;text-align:right;font-family:'DM Mono',monospace;color:var(--warn);">${Math.round(totalC/days)}g</td><td style="padding:8px 0;text-align:right;font-family:'DM Mono',monospace;color:var(--muted);">${c.carbs}g</td></tr>
        <tr style="border-top:1px solid var(--border);"><td style="padding:8px 0;color:#EC4899;">■ Fett</td><td style="padding:8px 0;text-align:right;font-family:'DM Mono',monospace;">${totalF}g</td><td style="padding:8px 0;text-align:right;font-family:'DM Mono',monospace;color:#EC4899;">${Math.round(totalF/days)}g</td><td style="padding:8px 0;text-align:right;font-family:'DM Mono',monospace;color:var(--muted);">${c.fat}g</td></tr>
        <tr style="border-top:1px solid var(--border);"><td style="padding:8px 0;font-weight:700;">Kalorien</td><td style="padding:8px 0;text-align:right;font-family:'DM Mono',monospace;font-weight:600;">${totalKcal.toLocaleString('de-DE')} kcal</td><td style="padding:8px 0;text-align:right;font-family:'DM Mono',monospace;font-weight:600;color:${diffColor};">${avgKcal}</td><td style="padding:8px 0;text-align:right;font-family:'DM Mono',monospace;color:var(--muted);">${c.goalKcal}</td></tr>
      </tbody>
    </table>`:
    '<p style="font-size:11px;color:var(--muted);margin-top:6px;">Makros (Protein/Carbs/Fett) eintragen für vollständige Wochenübersicht.</p>'}
    <p style="font-size:10px;color:var(--muted);margin-top:8px;font-family:'DM Mono',monospace;">${days} von 7 Tagen erfasst</p>`;
}

function renderPeriodizationCheck(){
  const card=document.getElementById('periodization-card');
  const content=document.getElementById('periodization-content');
  if(!card||!content)return;
  if(measureData.length<2){card.style.display='none';return;}

  const twoWeeksAgo=new Date();twoWeeksAgo.setDate(twoWeeksAgo.getDate()-14);
  const recent=measureData.filter(m=>new Date(m.date)>=twoWeeksAgo);
  if(recent.length<2){card.style.display='none';return;}

  card.style.display='block';
  const first=recent[0],last=recent[recent.length-1];
  const weightDiff=Math.round((last.weight-first.weight)*10)/10;
  const daySpan=Math.round((new Date(last.date)-new Date(first.date))/(24*3600*1000));
  const weeklyRate=daySpan>0?Math.round(weightDiff/daySpan*7*10)/10:0;

  const c=computeAll();
  let statusColor,statusIcon,headline,detail,actionHtml='';

  if(currentGoal==='bulk'){
    if(Math.abs(weightDiff)<=0.3&&daySpan>=10){
      statusColor='var(--warn)';statusIcon='⚠';
      headline='Gewicht stagniert seit '+daySpan+' Tagen';
      detail='Optimal im Bulk: +0,25–0,5 kg/Woche. Bei Stagnation über 14 Tage solltest du die Kalorien anpassen.';
      actionHtml=`<div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;">
        <button class="btn-ghost" style="font-size:12px;" onclick="adjustKcal(150)">+ 150 kcal vorschlagen</button>
        <button class="btn-ghost" style="font-size:12px;color:var(--muted);" onclick="document.getElementById('periodization-card').style.display='none'">Ignorieren</button>
      </div>`;
    } else if(weeklyRate>0.7){
      statusColor='var(--danger)';statusIcon='🔥';
      headline='Zu schneller Gewichtsanstieg (+'+weeklyRate+' kg/Woche)';
      detail='Über 0,5 kg/Woche im Bulk bedeutet mehr Fettansatz als nötig. Kalorien leicht reduzieren.';
      actionHtml=`<button class="btn-ghost" style="font-size:12px;margin-top:10px;" onclick="adjustKcal(-100)">− 100 kcal vorschlagen</button>`;
    } else if(weeklyRate>0&&weeklyRate<=0.7){
      statusColor='var(--accent)';statusIcon='✓';
      headline='Bulk läuft optimal (+'+weeklyRate+' kg/Woche)';
      detail='Gewichtsanstieg liegt im Zielbereich. Weiter so.';
    } else{
      statusColor='var(--muted)';statusIcon='📊';
      headline='Zu wenig Daten für Analyse';
      detail='Mindestens 2 Gewichtsmessungen über 10+ Tage eintragen.';
    }
  } else if(currentGoal==='cut'){
    if(Math.abs(weightDiff)<=0.2&&daySpan>=10){
      statusColor='var(--warn)';statusIcon='⚠';
      headline='Gewicht stagniert — Cut stockt';
      detail='Optimal im Cut: −0,5–0,75 kg/Woche. Bei Stagnation Kalorien anpassen oder Aktivität erhöhen.';
      actionHtml=`<button class="btn-ghost" style="font-size:12px;margin-top:10px;" onclick="adjustKcal(-150)">− 150 kcal vorschlagen</button>`;
    } else if(weeklyRate<-1.0){
      statusColor='var(--danger)';statusIcon='🔥';
      headline='Cut zu aggressiv ('+weeklyRate+' kg/Woche)';
      detail='Über 1 kg/Woche erhöht Muskelabbau-Risiko stark. Kalorien leicht erhöhen.';
    } else if(weeklyRate<0){
      statusColor='var(--accent)';statusIcon='✓';
      headline='Cut läuft ('+weeklyRate+' kg/Woche)';
      detail='Gewichtsabnahme liegt im gesunden Bereich.';
    } else{statusColor='var(--muted)';statusIcon='📊';headline='Daten werden gesammelt';detail='';}
  } else{
    statusColor='var(--info)';statusIcon='⚖';
    headline='Gewicht: '+last.weight+' kg ('+( weightDiff>0?'+':'')+weightDiff+' kg in '+daySpan+' Tagen)';
    detail='Maintain-Modus: Ziel ist stabiles Gewicht ±0,5 kg.';
  }

  content.innerHTML=`
    <div style="display:flex;align-items:flex-start;gap:12px;">
      <div style="font-size:22px;">${statusIcon}</div>
      <div style="flex:1;">
        <div style="font-size:13px;font-weight:600;color:${statusColor};margin-bottom:4px;">${headline}</div>
        <div style="font-size:12px;color:var(--text2);line-height:1.6;">${detail}</div>
        ${actionHtml}
      </div>
    </div>
    <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border);display:flex;gap:16px;font-size:11px;font-family:'DM Mono',monospace;color:var(--muted);">
      <span>${first.date}: ${first.weight} kg</span>
      <span>→</span>
      <span>${last.date}: ${last.weight} kg</span>
      <span style="color:${weightDiff>0?'var(--warn)':'var(--accent)'};">${weeklyRate>0?'+':''}${weeklyRate} kg/Wo</span>
    </div>`;
}

function adjustKcal(delta){
  const c=computeAll();
  const newKcal=c.goalKcal+delta;
  showModal(
    `Kalorienziel anpassen?`,
    `Aktuell: ${c.goalKcal} kcal/Tag<br>Vorgeschlagen: <strong>${newKcal} kcal/Tag</strong> (${delta>0?'+':''}${delta} kcal)<br><br>Du kannst das Ziel jederzeit im Tab Profil unter "Trainingsziel" manuell anpassen. Diese Funktion zeigt nur die Empfehlung — du entscheidest.`,
    ()=>{},()=>{}
  );
}

function addMeal(){
  const kcalEl=document.getElementById('meal-kcal');
  const proteinEl=document.getElementById('meal-protein');
  const carbsEl=document.getElementById('meal-carbs');
  const fatEl=document.getElementById('meal-fat');
  const nameEl=document.getElementById('meal-name-input');

  let kcal=parseInt(kcalEl.value)||0;
  const protein=parseInt(proteinEl.value)||0;
  const carbs=parseInt(carbsEl.value)||0;
  const fat=parseInt(fatEl.value)||0;
  const name=nameEl.value.trim()||'Mahlzeit';

  if(kcal===0&&(protein||carbs||fat)){kcal=protein*4+carbs*4+fat*9;}
  if(kcal<=0)return;

  const meal={name,kcal:parseInt(kcal)||0,protein:parseInt(protein)||0,carbs:parseInt(carbs)||0,fat:parseInt(fat)||0};
  getDay(getTodayKey()).meals.push(meal);
  saveDaily();

  [kcalEl,proteinEl,carbsEl,fatEl].forEach(el=>el.value='');
  nameEl.value='';
  document.getElementById('meal-auto-kcal').textContent='';

  renderNutrition();renderDashboard();
}
function removeMeal(i){getDay(getTodayKey()).meals.splice(i,1);saveDaily();renderNutrition();renderDashboard();}

function autoCalcKcal(){
  const p=parseInt(document.getElementById('meal-protein').value)||0;
  const c=parseInt(document.getElementById('meal-carbs').value)||0;
  const f=parseInt(document.getElementById('meal-fat').value)||0;
  const auto=p*4+c*4+f*9;
  const lbl=document.getElementById('meal-auto-kcal');
  if(lbl&&(p||c||f))lbl.textContent=`Auto-kcal aus Makros: ${auto} kcal (Protein ${p*4} + Carbs ${c*4} + Fett ${f*9})`;
  else if(lbl)lbl.textContent='';
}

// ════════════════════════════════════════════
// VITAMIN D
// ════════════════════════════════════════════
function calcVitDValues(){
  const skin=parseInt(val('vd-skin'))||2;
  const sun=parseInt(val('vd-sun'))||30;
  const season=parseFloat(val('vd-season'))||0.8;
  const weight=parseFloat(val('p-weight'))||80;
  const level=parseFloat(val('vd-level'))||0;
  const skinMult=skin===1?1.5:skin===2?1.0:0.5;
  const sunIE=Math.min(Math.round(sun*skinMult*season*150),20000);
  const weightFactor=weight/70;
  const target=50;
  const knownLevel=level>0?level:20;
  const deficit=Math.max(0,target-knownLevel);
  const neededFromSupp=Math.max(0,Math.round(deficit*100*weightFactor)-sunIE);
  let suppDose=0;
  if(neededFromSupp<=0)suppDose=0;
  else if(neededFromSupp<=1000)suppDose=1000;
  else if(neededFromSupp<=2500)suppDose=2000;
  else if(neededFromSupp<=4000)suppDose=3000;
  else if(neededFromSupp<=6000)suppDose=5000;
  else suppDose=10000;
  const estimatedLevel=Math.min(120,Math.round(knownLevel+suppDose/100/weightFactor+sunIE/200));
  return{sunIE,suppDose,estimatedLevel,knownLevel,levelIsKnown:level>0};
}
function calcVitDAndCollapse(){
  vitdComputed=calcVitDValues();renderVitDResult();
  renderSupps(Math.round((parseFloat(val('p-weight'))||80)*2.1));
  vitdOpen=false;applyVitDCollapse();saveAll();
}
function toggleVitD(){vitdOpen=!vitdOpen;applyVitDCollapse();saveAll();}
function applyVitDCollapse(){
  const body=document.getElementById('vitd-body');
  const arrow=document.getElementById('vitd-arrow');
  const inline=document.getElementById('vitd-summary-inline');
  if(!body||!arrow||!inline)return;
  body.style.display=vitdOpen?'block':'none';
  arrow.classList.toggle('open',vitdOpen);
  if(!vitdOpen&&vitdComputed)inline.textContent=` — ${vitdComputed.suppDose>0?vitdComputed.suppDose.toLocaleString('de-DE')+' IE/Tag':'kein Supplement nötig'}`;
  else inline.textContent='';
}
function renderVitDResult(){
  if(!vitdComputed)vitdComputed=calcVitDValues();
  const{sunIE,suppDose,estimatedLevel,knownLevel,levelIsKnown}=vitdComputed;
  let statusColor,statusBadge,statusText;
  if(estimatedLevel>=50&&estimatedLevel<=100){statusColor='var(--accent)';statusText='Optimal (50–80 ng/mL)';statusBadge='badge-green';}
  else if(estimatedLevel>=30){statusColor='var(--warn)';statusText='Ausreichend (30–50 ng/mL)';statusBadge='badge-yellow';}
  else{statusColor='var(--danger)';statusText='Mangel (<30 ng/mL)';statusBadge='badge-red';}
  const barPct=Math.min(100,Math.round(estimatedLevel/80*100));
  const magNote=suppDose>=5000?`<div style="margin-top:10px;font-size:12px;color:var(--warn);line-height:1.6;">⚠ Bei ${suppDose.toLocaleString('de-DE')} IE/Tag Magnesium-Bedarf erhöht → Supplement-Stack auf 500mg angepasst.</div>`:'';
  const baseNote=levelIsKnown
    ?`Ausgangswert: <strong>${knownLevel} ng/mL</strong> (aus Blutwert).`
    :`Ausgangswert: <strong>${knownLevel} ng/mL</strong> angenommen (DE-Durchschnitt ohne Supp). Blutwert eingeben für präzise Berechnung.`;
  document.getElementById('vitd-result').innerHTML=`
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px;">
      <div class="summary-card"><div class="summary-val" style="font-size:17px;color:var(--warn);">${sunIE.toLocaleString('de-DE')}</div><div class="summary-label">IE Sonne/Tag</div></div>
      <div class="summary-card"><div class="summary-val" style="font-size:17px;color:var(--accent);">${suppDose.toLocaleString('de-DE')}</div><div class="summary-label">IE Supplement/Tag</div></div>
      <div class="summary-card"><div class="summary-val" style="font-size:17px;color:${statusColor};">${estimatedLevel}</div><div class="summary-label">ng/mL (Ziel: 50+)</div></div>
    </div>
    <div style="margin-bottom:6px;display:flex;justify-content:space-between;align-items:center;font-size:12px;">
      <span style="color:var(--muted);">Geschätzter Spiegel mit Supplement</span><span class="badge ${statusBadge}">${statusText}</span>
    </div>
    <div class="vitd-result-bar"><div class="vitd-result-fill" style="width:${barPct}%;background:${statusColor};"></div></div>
    <div class="vitd-markers"><span>0</span><span style="color:var(--danger);">20</span><span style="color:var(--warn);">30</span><span style="color:var(--accent);">50</span><span>80+</span></div>
    <p style="font-size:11px;color:var(--muted);margin-top:10px;line-height:1.65;">${baseNote}<br>Grobe Orientierung — kein Ersatz für Blutbild. Bei Dosen über 4.000 IE täglich Arzt konsultieren.</p>
    ${magNote}`;
}
// ════════════════════════════════════════════
// MEAL TEMPLATES
// ════════════════════════════════════════════
const DEFAULT_MEAL_TEMPLATES=[
  {name:'Frühstück (Oats + Ei)',kcal:520,protein:32,carbs:58,fat:14},
  {name:'Hähnchen mit Reis',kcal:640,protein:52,carbs:68,fat:12},
  {name:'Protein Shake',kcal:320,protein:40,carbs:28,fat:6},
];

function _initMealTemplates(){
  if(mealTemplates===null){mealTemplates=DEFAULT_MEAL_TEMPLATES.slice();saveMealTemplates();}
}

function _updateTemplateBanner(){
  const banner=document.getElementById('template-edit-banner');
  const btn=document.getElementById('template-save-btn');
  const cancelBtn=document.getElementById('template-cancel-btn');
  if(!banner||!btn)return;
  if(editingTemplateIdx!==null){
    banner.style.display='block';
    btn.textContent='Template aktualisieren';
    if(cancelBtn)cancelBtn.style.display='inline-block';
  } else {
    banner.style.display='none';
    btn.textContent='Als Template speichern';
    if(cancelBtn)cancelBtn.style.display='none';
  }
}

function saveMealAsTemplate(){
  const name=(document.getElementById('meal-name-input').value.trim())||'Mahlzeit';
  const kcal=parseInt(document.getElementById('meal-kcal').value)||0;
  const protein=parseInt(document.getElementById('meal-protein').value)||0;
  const carbs=parseInt(document.getElementById('meal-carbs').value)||0;
  const fat=parseInt(document.getElementById('meal-fat').value)||0;
  if(!kcal&&!protein&&!carbs&&!fat){
    const st=document.getElementById('template-status');
    if(st)st.innerHTML='<span style="color:var(--warn);">Mindestens einen Wert eingeben.</span>';
    return;
  }
  const tpl={name,kcal,protein,carbs,fat};
  if(editingTemplateIdx!==null){
    mealTemplates[editingTemplateIdx]=tpl;
    editingTemplateIdx=null;
  } else {
    mealTemplates.push(tpl);
  }
  saveMealTemplates();
  renderMealTemplates();
  const st=document.getElementById('template-status');
  if(st)st.innerHTML='<span style="color:var(--accent);">✓ Template gespeichert.</span>';
  setTimeout(()=>{const s=document.getElementById('template-status');if(s)s.innerHTML='';},2000);
}

function addTemplateToToday(idx){
  const tpl=mealTemplates[idx];if(!tpl)return;
  const dk=getTodayKey();const day=getDay(dk);
  if(!day.meals)day.meals=[];
  day.meals.push({name:tpl.name,kcal:tpl.kcal,protein:tpl.protein,carbs:tpl.carbs,fat:tpl.fat});
  saveDaily();renderNutrition();renderDashboard();
}

function editMealTemplate(idx){
  const tpl=mealTemplates[idx];if(!tpl)return;
  document.getElementById('meal-name-input').value=tpl.name;
  document.getElementById('meal-kcal').value=tpl.kcal||'';
  document.getElementById('meal-protein').value=tpl.protein||'';
  document.getElementById('meal-carbs').value=tpl.carbs||'';
  document.getElementById('meal-fat').value=tpl.fat||'';
  autoCalcKcal();
  editingTemplateIdx=idx;
  _updateTemplateBanner();
  document.getElementById('meal-name-input').scrollIntoView({behavior:'smooth',block:'center'});
}

function cancelEditTemplate(){
  editingTemplateIdx=null;
  _updateTemplateBanner();
}

function deleteMealTemplate(idx){
  function doDelete(){
    mealTemplates.splice(idx,1);
    saveMealTemplates();
    renderMealTemplates();
  }
  const ask=document.getElementById('ask-before-change');
  if(ask&&ask.checked){
    showModal('Template löschen?','Das Template wird unwiderruflich entfernt.',doDelete,()=>{});
  } else {doDelete();}
}

function renderMealTemplates(){
  _initMealTemplates();
  const el=document.getElementById('meal-templates-list');if(!el)return;
  _updateTemplateBanner();
  if(!mealTemplates.length){
    el.innerHTML='<p class="hint-text-sm">Noch keine Templates gespeichert.</p>';
    return;
  }
  el.innerHTML=mealTemplates.map((t,i)=>{
    const macroStr=[t.protein?`P:${t.protein}g`:'',t.carbs?`C:${t.carbs}g`:'',t.fat?`F:${t.fat}g`:''].filter(Boolean).join(' · ');
    return`<div class="meal-row" style="align-items:center;">
      <div style="flex:1;min-width:0;">
        <div style="font-size:13px;font-weight:500;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${t.name}</div>
        <div style="font-size:10px;color:var(--muted);font-family:'DM Mono',monospace;margin-top:2px;">${t.kcal} kcal${macroStr?' · '+macroStr:''}</div>
      </div>
      <div style="display:flex;gap:6px;flex-shrink:0;">
        <button class="btn-ghost" style="font-size:11px;padding:5px 9px;" onclick="addTemplateToToday(${i})">+ Heute</button>
        <button class="btn-ghost" style="font-size:11px;padding:5px 9px;" onclick="editMealTemplate(${i})">✎</button>
        <button class="del-btn" onclick="deleteMealTemplate(${i})">✕</button>
      </div>
    </div>`;
  }).join('');
}

// ════════════════════════════════════════════
// WEEKLY REVIEW ENGINE
// ════════════════════════════════════════════

function _reviewDayDiff(a,b){
  return Math.round((new Date(b+'T00:00:00')-new Date(a+'T00:00:00'))/86400000);
}
function _hasTrainedOnDay(dk){
  const dl=logData[dk];if(!dl||!dl.exercises||!dl.exercises.length)return false;
  return dl.exercises.some(ex=>ex.sets&&ex.sets.some(s=>s.kg||s.reps));
}

function computeWeeklyReview(){
  const c=computeAll();const goal=currentGoal;
  const bw=parseFloat(val('p-weight'))||0;
  const goalKcal=c.goalKcal;const proteinTarget=c.protein;
  const DAYS=7;
  const dateKeys=[];for(let i=-(DAYS-1);i<=0;i++)dateKeys.push(getDateKey(i));

  // ── Gewichtstrend (14 Tage für mehr Datenpunkte) ──
  const cutoff=getDateKey(-13);
  const measures=(measureData||[]).filter(m=>m.date>=cutoff&&parseFloat(m.weight)>0)
    .sort((a,b)=>a.date.localeCompare(b.date));
  let weightTrend=null,weightStart=null,weightEnd=null;
  if(measures.length>=2){
    weightStart=parseFloat(measures[0].weight);
    weightEnd=parseFloat(measures[measures.length-1].weight);
    const span=_reviewDayDiff(measures[0].date,measures[measures.length-1].date);
    weightTrend=span>0?(weightEnd-weightStart)/span*7:(weightEnd-weightStart);
  }

  // ── Kalorien ──
  const kcalByDay=dateKeys.map(dk=>getDayMeals(dk).reduce((a,m)=>a+m.kcal,0));
  const trackedKcal=kcalByDay.filter(k=>k>0);
  const avgKcal=trackedKcal.length?Math.round(trackedKcal.reduce((a,b)=>a+b,0)/trackedKcal.length):null;

  // ── Protein ──
  const protByDay=dateKeys.map(dk=>getDayMeals(dk).reduce((a,m)=>a+(m.protein||0),0)).filter(p=>p>0);
  const avgProtein=protByDay.length?Math.round(protByDay.reduce((a,b)=>a+b,0)/protByDay.length):null;

  // ── Trainingstage ──
  const trainingDays=dateKeys.filter(dk=>_hasTrainedOnDay(dk)).length;

  // ── Deload-Wochen ──
  const deloadWeeks=(typeof getDeloadWeeks==='function')?getDeloadWeeks():0;

  // ── Fehlende Daten ──
  const missing=[];
  if(measures.length<2)missing.push(measures.length===0?'Gewicht — keine Messung in 14 Tagen':'Gewicht — mind. 2 Messungen für Trend nötig');
  if(trackedKcal.length<4)missing.push('Kalorien — nur '+trackedKcal.length+' von 7 Tagen eingetragen');
  if(trainingDays===0)missing.push('Training — kein Eintrag diese Woche');

  // ── Status-Logik je Ziel ──
  let status='ok',statusLabel='Im Zielbereich',statusColor='var(--info)';
  const interpretations=[],actions=[];
  const kcalDiff=avgKcal!==null?avgKcal-goalKcal:null;

  if(goal==='bulk'){
    if(weightTrend!==null&&bw>0){
      const pct=weightTrend/bw*100;
      if(pct>=0.2&&pct<=0.5){
        status='optimal';statusLabel='Bulk optimal';statusColor='var(--accent)';
        interpretations.push(`Gewicht +${weightTrend.toFixed(2)} kg/Woche — idealer Aufbaubereich (0,2–0,5 %/KG).`);
      }else if(pct<0.1){
        status='stagnating';statusLabel='Aufbau stagniert';statusColor='var(--warn)';
        interpretations.push(`Nur +${weightTrend.toFixed(2)} kg/Woche — zu langsam für Muskelaufbau. Kalorienzufuhr erhöhen.`);
        actions.push({type:'kcal',delta:150,label:'+150 kcal übernehmen'});
      }else if(pct>0.65){
        status='too_aggressive';statusLabel='Zunahme zu schnell';statusColor='var(--danger)';
        interpretations.push(`+${pct.toFixed(1)} %/Woche — erhöhtes Fettaufbaurisiko. Surplus etwas reduzieren.`);
        actions.push({type:'kcal',delta:-100,label:'−100 kcal reduzieren'});
      }else{
        status='ok';statusLabel='Im guten Bereich';statusColor='var(--info)';
        interpretations.push(`+${pct.toFixed(1)} %/Woche — oberer Bulk-Bereich, vorerst beibehalten und beobachten.`);
      }
    }
    if(kcalDiff!==null&&kcalDiff<-250){
      if(status!=='stagnating')interpretations.push(`Ø ${avgKcal} kcal — ${Math.abs(kcalDiff)} kcal unter Ziel. Tracking konsequenter führen.`);
      if(!actions.length)actions.push({type:'info',label:'Mahlzeiten-Tracking verbessern'});
    }
    if(deloadWeeks>=6){
      interpretations.push(`${deloadWeeks} Wochen ohne Deload — Erschöpfung und Stagnation wahrscheinlich.`);
      actions.push({type:'deload',label:'Deload-Woche einplanen'});
    }

  }else if(goal==='cut'){
    if(weightTrend!==null&&bw>0){
      const pct=weightTrend/bw*100;
      if(pct>=-0.75&&pct<=-0.25){
        status='optimal';statusLabel='Cut optimal';statusColor='var(--accent)';
        interpretations.push(`${weightTrend.toFixed(2)} kg/Woche — idealer Abnahmebereich (0,25–0,75 %/KG).`);
      }else if(pct>-0.15){
        status='stagnating';statusLabel='Abnahme zu gering';statusColor='var(--warn)';
        interpretations.push(`${weightTrend>=0?'+':''}${weightTrend.toFixed(2)} kg/Woche — kaum Fortschritt. Defizit erhöhen.`);
        actions.push({type:'kcal',delta:-150,label:'−150 kcal reduzieren'});
      }else if(pct<-1.0){
        status='too_aggressive';statusLabel='Defizit zu aggressiv';statusColor='var(--danger)';
        interpretations.push(`${pct.toFixed(1)} %/Woche — Muskelverlust-Risiko erhöht. Defizit verringern.`);
        actions.push({type:'kcal',delta:150,label:'+150 kcal anpassen'});
      }else{
        status='slow';statusLabel='Etwas zu langsam';statusColor='var(--warn)';
        interpretations.push(`${pct.toFixed(1)} %/Woche — knapp unter Zielbereich. Defizit leicht erhöhen.`);
        actions.push({type:'kcal',delta:-100,label:'−100 kcal reduzieren'});
      }
    }
    if(kcalDiff!==null&&kcalDiff>200)
      interpretations.push(`Ø ${avgKcal} kcal — ${kcalDiff} kcal über Ziel. Defizit nicht konsequent eingehalten.`);
    if(deloadWeeks>=5){
      interpretations.push(`${deloadWeeks} Wochen durchtrainiert — im Cut besonders erschöpfungsanfällig.`);
      actions.push({type:'deload',label:'Leichte Woche einplanen'});
    }

  }else{ // maintain
    if(weightTrend!==null&&bw>0){
      const pct=Math.abs(weightTrend)/bw*100;
      if(pct<=0.2){
        status='optimal';statusLabel='Gewicht stabil';statusColor='var(--accent)';
        interpretations.push(`Gewicht stabil (${weightTrend>=0?'+':''}${weightTrend.toFixed(2)} kg/Woche) — Ziel erreicht.`);
      }else if(weightTrend>0){
        status='drifting';statusLabel='Leichter Anstieg';statusColor='var(--warn)';
        interpretations.push(`Gewicht steigt (+${weightTrend.toFixed(2)} kg/Woche). Kalorien leicht reduzieren.`);
        actions.push({type:'kcal',delta:-100,label:'−100 kcal anpassen'});
      }else{
        status='drifting';statusLabel='Leichte Abnahme';statusColor='var(--warn)';
        interpretations.push(`Gewicht sinkt (${weightTrend.toFixed(2)} kg/Woche). Etwas mehr essen.`);
        actions.push({type:'kcal',delta:100,label:'+100 kcal anpassen'});
      }
    }
    if(kcalDiff!==null&&Math.abs(kcalDiff)>300)
      interpretations.push(`Ø ${avgKcal} kcal vs. Ziel ${goalKcal} kcal — Differenz ${kcalDiff>0?'+':''}${kcalDiff} kcal.`);
  }

  // Protein-Check (alle Ziele)
  if(avgProtein!==null&&avgProtein<proteinTarget*0.8){
    interpretations.push(`Protein Ø ${avgProtein}g — ${Math.round((1-avgProtein/proteinTarget)*100)} % unter Ziel (${proteinTarget}g).`);
    if(!actions.some(a=>a.label.includes('Protein')))
      actions.push({type:'info',label:'Protein auf '+proteinTarget+'g steigern'});
  }

  // Trainingsfrequenz (alle Ziele)
  if(trainingDays>0&&trainingDays<3)
    interpretations.push(`Nur ${trainingDays}×/Woche trainiert — für ${goal==='cut'?'Muskelerhalt im Cut':'optimalen Muskelaufbau'} mind. 3–4× anstreben.`);

  // Zu wenig Daten
  if(trackedKcal.length<3&&status==='ok'){status='no_data';statusLabel='Zu wenig Daten';statusColor='var(--muted)';}

  if(!interpretations.length){
    interpretations.push(status==='optimal'?'Alles im Zielbereich — Kurs beibehalten.':'Zu wenige Daten für eine vollständige Auswertung.');
  }
  if(status==='optimal'&&!actions.length)actions.push({type:'info',label:'Kurs beibehalten ✓'});

  return{goal,status,statusLabel,statusColor,interpretations,actions,missing,
    weightTrend,measures:measures.length,avgKcal,goalKcal,kcalDiff,
    trackedKcalDays:trackedKcal.length,avgProtein,proteinTarget,trainingDays,deloadWeeks,bw};
}

function renderWeeklyReview(){
  const el=document.getElementById('weekly-review-card');if(!el)return;
  const r=computeWeeklyReview();
  const goalMap={bulk:'Bulk',maintain:'Maintain',cut:'Cut'};

  const statusBg={
    optimal:'rgba(0,229,160,0.12)',stagnating:'rgba(255,173,51,0.12)',
    too_aggressive:'rgba(255,87,87,0.12)',slow:'rgba(255,173,51,0.12)',
    drifting:'rgba(255,173,51,0.12)',no_data:'rgba(102,112,133,0.12)',
    ok:'rgba(91,127,255,0.12)',
  }[r.status]||'rgba(91,127,255,0.12)';

  // Gewichtsfarbe je Zielmodus
  const wtSign=r.weightTrend!==null?(r.weightTrend>=0?'+':''):'';
  const wtDisplay=r.weightTrend!==null?`${wtSign}${r.weightTrend.toFixed(2)}`:'—';
  const wtColor=r.weightTrend===null?'var(--muted)'
    :r.goal==='bulk'?(r.weightTrend>0.05?'var(--accent)':'var(--warn)')
    :r.goal==='cut'?(r.weightTrend<-0.05?'var(--accent)':'var(--danger)')
    :'var(--text)';

  const kcalColor=r.kcalDiff===null?'var(--muted)':Math.abs(r.kcalDiff)<150?'var(--accent)':'var(--warn)';
  const trainColor=r.trainingDays>=3?'var(--accent)':r.trainingDays>0?'var(--warn)':'var(--muted)';
  const protColor=r.avgProtein===null?'var(--muted)':r.avgProtein>=r.proteinTarget*0.88?'var(--accent)':'var(--warn)';

  const metrics=[
    {val:wtDisplay,unit:'kg/Woche',color:wtColor},
    {val:r.avgKcal!==null?r.avgKcal.toLocaleString('de-DE'):'—',unit:'Ø kcal/Tag',color:kcalColor},
    {val:r.trainingDays+'×',unit:'Training/Woche',color:trainColor},
    {val:r.avgProtein!==null?r.avgProtein+'g':'—',unit:'Ø Protein/Tag',color:protColor},
  ];

  const metricsHtml='<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px;">'
    +metrics.map(m=>`<div style="background:var(--surface);border-radius:10px;padding:10px 6px;text-align:center;">
      <div style="font-size:16px;font-weight:700;font-family:'DM Mono',monospace;color:${m.color};">${m.val}</div>
      <div style="font-size:10px;color:var(--muted);margin-top:3px;line-height:1.3;">${m.unit}</div>
    </div>`).join('')+'</div>';

  const interpHtml=r.interpretations.length
    ?`<div style="font-size:13px;color:var(--text2);line-height:1.65;margin-bottom:12px;">${r.interpretations.join(' ')}</div>`:'';

  const actionsHtml=r.actions.length
    ?'<div style="display:flex;gap:6px;flex-wrap:wrap;'+(r.missing.length?'margin-bottom:12px;':'')+'\">'
      +r.actions.map(a=>a.type==='kcal'&&a.delta!==0
        ?`<button class="btn-ghost" style="font-size:12px;padding:7px 13px;" onclick="adjustKcal(${a.delta})">${a.label}</button>`
        :`<span style="display:inline-block;padding:6px 12px;border-radius:8px;font-size:12px;background:var(--surface);color:var(--text2);border:1px solid var(--border);">${a.label}</span>`
      ).join('')+'</div>':'';

  const missingHtml=r.missing.length
    ?'<div style="background:rgba(102,112,133,0.07);border:1px solid rgba(102,112,133,0.18);border-radius:8px;padding:9px 12px;">'
      +'<div style="font-size:10px;color:var(--muted);font-family:\'DM Mono\',monospace;letter-spacing:.07em;text-transform:uppercase;margin-bottom:5px;">Fehlende Daten</div>'
      +r.missing.map(m=>`<div style="font-size:12px;color:var(--muted);line-height:1.6;">· ${m}</div>`).join('')
      +'</div>':'';

  el.innerHTML=
    '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">'
    +'<div><div class="card-label">Wochen-Check</div>'
    +`<div style="font-size:11px;color:var(--muted);font-family:'DM Mono',monospace;margin-top:2px;">Letzte 7 Tage · ${goalMap[r.goal]||r.goal}</div></div>`
    +`<span style="padding:5px 11px;border-radius:20px;font-size:12px;font-weight:600;flex-shrink:0;margin-left:10px;background:${statusBg};color:${r.statusColor};">${r.statusLabel}</span>`
    +'</div>'
    +metricsHtml+interpHtml+actionsHtml+missingHtml;
}

function renderSupps(protein){
  const vitdDose=vitdComputed?vitdComputed.suppDose:0;
  const magDose=vitdDose>=5000?'500mg abends':'400mg abends';
  let vitdRow=vitdComputed
    ?(vitdComputed.suppDose===0
      ?`<div class="stat-row"><span class="sr-label">Vitamin D₃</span><span class="sr-val" style="color:var(--accent);">0 IE — Sonne reicht</span></div>`
      :`<div class="stat-row"><span class="sr-label">Vitamin D₃ + K2</span><span class="sr-val" style="color:var(--accent);">${vitdComputed.suppDose.toLocaleString('de-DE')} IE täglich</span></div>`)
    :`<div class="stat-row"><span class="sr-label">Vitamin D₃</span><span class="sr-val" style="color:var(--muted);">→ Rechner nutzen</span></div>`;
  document.getElementById('supps').innerHTML=`
    ${vitdRow}
    <div class="stat-row"><span class="sr-label">Kreatin Monohydrat</span><span class="sr-val">5g täglich</span></div>
    <div class="stat-row"><span class="sr-label">Omega-3 (EPA/DHA)</span><span class="sr-val">2–3g täglich</span></div>
    <div class="stat-row"><span class="sr-label">Magnesium Glycinat</span><span class="sr-val">${magDose}</span></div>
    <div class="stat-row"><span class="sr-label">Protein Shake</span><span class="sr-val">${Math.round(protein*.25)}g Post-Workout</span></div>`;
}

// ════════════════════════════════════════════
// PUBLIC API (von onclick=/oninput= benötigt)
// ════════════════════════════════════════════
window.addMeal             =addMeal;
window.removeMeal          =removeMeal;
window.adjustKcal          =adjustKcal;
window.toggleVitD          =toggleVitD;
window.calcVitDAndCollapse =calcVitDAndCollapse;
window.saveMealAsTemplate  =saveMealAsTemplate;
window.cancelEditTemplate  =cancelEditTemplate;
window.addTemplateToToday  =addTemplateToToday;
window.editMealTemplate    =editMealTemplate;
window.deleteMealTemplate  =deleteMealTemplate;
