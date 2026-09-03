// ════════════════════════════════════════════
// RENPHO-IMPORT — CSV-Export der Renpho-App importieren, nur Gewicht
// Öffentlich (onclick): siehe PUBLIC-API-Block am Dateiende
// ════════════════════════════════════════════

// Parst einen Renpho-CSV-Export.
// Spalte 0: Datum DD.MM.YY, Spalte 1: Uhrzeit, Spalte 2: Gewicht.
// Rückgabe: [{date:'YYYY-MM-DD', weight:Number}], nach Datum aufsteigend.
function parseRenphoCsv(text){
  if(!text)return[];
  const lines=text.split(/\r?\n/).filter(l=>l.trim().length);
  if(lines.length<2)return[];
  const byDate={}; // date -> {weight, time} — je Datum die früheste Uhrzeit gewinnt
  for(let i=1;i<lines.length;i++){
    const cols=lines[i].split(',').map(c=>c.trim());
    if(cols.length<3)continue;
    const [dateRaw,timeRaw,weightRaw]=cols;
    if(!dateRaw||weightRaw==='--')continue;
    const weight=parseFloat(weightRaw);
    if(isNaN(weight))continue;
    // DD.MM.YY -> 20YY-MM-DD, per String-Split statt new Date() (keine UTC-Verschiebung)
    const parts=dateRaw.split('.');
    if(parts.length!==3)continue;
    const [dd,mm,yy]=parts;
    if(!dd||!mm||!yy)continue;
    const date=`20${yy.padStart(2,'0')}-${mm.padStart(2,'0')}-${dd.padStart(2,'0')}`;
    const time=timeRaw||'';
    if(!byDate[date]||time<byDate[date].time){
      byDate[date]={weight,time};
    }
  }
  return Object.keys(byDate).sort().map(date=>({date,weight:byDate[date].weight}));
}

// Übernimmt ausschließlich das Gewicht in measureData. bf und alle Maße
// bleiben unangetastet — die Renpho-KFA-Werte sind zwischen Messprofilen
// inkonsistent und würden die Navy-Berechnung überschreiben.
function importRenpho(text){
  const st=document.getElementById('renpho-status');
  const entries=parseRenphoCsv(text);
  if(!entries.length){
    if(st)st.innerHTML='<span style="color:var(--danger);">Keine gültigen Zeilen gefunden.</span>';
    return;
  }
  let created=0,updated=0;
  entries.forEach(({date,weight})=>{
    const existing=measureData.find(m=>m.date===date);
    if(existing){
      existing.weight=weight;
      updated++;
    } else {
      measureData.push({date,weight,bf:0,neck:0,waist:0,hip:0,chest:0,arm:0,thigh:0});
      created++;
    }
  });
  measureData.sort((a,b)=>a.date.localeCompare(b.date));
  saveMeasureData();
  renderMeasureHistory();
  renderBodyHero();
  renderDashboard();
  updateAll();
  if(st)st.innerHTML=`<span style="color:var(--accent);">✓ ${created} Tage importiert, ${updated} aktualisiert</span>`;
}

// Datei-Auswahl (Renpho-CSV wählen) -> als Text lesen -> importRenpho()
function importRenphoFile(event){
  const file=event.target.files[0];if(!file)return;
  const st=document.getElementById('renpho-status');
  const reader=new FileReader();
  reader.onload=e=>{
    try{
      importRenpho(e.target.result);
    }catch(err){
      if(st)st.innerHTML=`<span style="color:var(--danger);">Import-Fehler: ${err.message}</span>`;
    }
  };
  reader.onerror=()=>{
    if(st)st.innerHTML='<span style="color:var(--danger);">Datei konnte nicht gelesen werden.</span>';
  };
  reader.readAsText(file);
}

// ════════════════════════════════════════════
// PUBLIC API (von onclick= benötigt)
// ════════════════════════════════════════════
window.parseRenphoCsv  =parseRenphoCsv;
window.importRenpho    =importRenpho;
window.importRenphoFile=importRenphoFile;
