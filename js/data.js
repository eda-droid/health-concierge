// ════════════════════════════════════════════
// WORKOUT DATA
// ════════════════════════════════════════════
const workoutPlans={
  heavy_push:{label:'Brust + Trizeps',short:'Push',ex:[['Bankdrücken','Hauptübung','4×6–8'],['Schrägbank KH','Upper Chest','3×8–10'],['Dips (Gewichtet)','Compound','3×8'],['Cable Flyes','Isolation','3×12'],['Trizeps PD','Finisher','3×12']]},
  heavy_pull:{label:'Rücken + Bizeps',short:'Pull',ex:[['Klimmzüge','Rücken','4×6–8'],['Kabelrudern','Mid-Back','3×10'],['Lat Pulldown','Lats','3×10'],['Face Pulls','Rear Delt','3×15'],['Bizeps Curl','Isolation','3×12']]},
  legs:{label:'Beine (Leg Day)',short:'Legs',ex:[['Kniebeuge','Compound','4×6–8'],['Leg Press','Quad','3×10'],['Romanian DL','Hamstrings','3×10'],['Leg Curl','Isolation','3×12'],['Waden','Finisher','4×15']]},
  shoulders:{label:'Schultern + Core',short:'Shoul.',ex:[['Schulterdrücken','Hauptübung','4×8–10'],['Seitheben','Laterals','4×15'],['Arnold Press','Full Delt','3×10'],['Reverse Pec','Rear Delt','3×15'],['Plank','Core','3×45s']]},
  recovery:{label:'Aktive Erholung',short:'Erhol.',ex:[['Foam Rolling','Myofaszial','10 Min'],['Dehnen','Mobilität','15 Min'],['Spaziergang','NEAT','30 Min']]},
  rest:{label:'Ruhetag',short:'Rest',ex:[]},
};
const daysFull=['Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag','Sonntag'];
const daysShort=['Mo','Di','Mi','Do','Fr','Sa','So'];

const injuryMap={
  schulter_l:{name:'Linke Schulter',avoid:['Bankdrücken','Schulterdrücken','Arnold Press','Dips (Gewichtet)'],alt:'Seitheben am Kabel (leicht), Face Pulls'},
  schulter_r:{name:'Rechte Schulter',avoid:['Bankdrücken','Schulterdrücken','Arnold Press','Dips (Gewichtet)'],alt:'Seitheben am Kabel (leicht), Face Pulls'},
  unterer_ruecken:{name:'Unterer Rücken',avoid:['Kniebeuge','Romanian DL','Kabelrudern'],alt:'Leg Press, Leg Curl — keine axiale Belastung'},
  ruecken:{name:'Oberer Rücken',avoid:['Klimmzüge','Kabelrudern','Lat Pulldown'],alt:'Brust- und Bein-Fokus'},
  knie_l:{name:'Linkes Knie',avoid:['Kniebeuge','Leg Press','Waden'],alt:'Romanian DL, Leg Curl, Oberkörper'},
  knie_r:{name:'Rechtes Knie',avoid:['Kniebeuge','Leg Press','Waden'],alt:'Romanian DL, Leg Curl, Oberkörper'},
  ellbogen_l:{name:'Linker Ellbogen',avoid:['Bizeps Curl','Trizeps PD','Dips (Gewichtet)'],alt:'Compound neutral, Bein-Tag'},
  ellbogen_r:{name:'Rechter Ellbogen',avoid:['Bizeps Curl','Trizeps PD','Dips (Gewichtet)'],alt:'Compound neutral, Bein-Tag'},
  brust:{name:'Brustmuskel',avoid:['Bankdrücken','Schrägbank KH','Cable Flyes','Dips (Gewichtet)'],alt:'Rücken- und Bein-Training'},
  arm_l:{name:'Linker Arm',avoid:['Bizeps Curl','Trizeps PD'],alt:'Bein-Fokus, Core'},
  arm_r:{name:'Rechter Arm',avoid:['Bizeps Curl','Trizeps PD'],alt:'Bein-Fokus, Core'},
  bein_l:{name:'Linkes Bein',avoid:['Kniebeuge','Leg Press','Romanian DL','Leg Curl','Waden'],alt:'Kompletter Oberkörper-Tag'},
  bein_r:{name:'Rechtes Bein',avoid:['Kniebeuge','Leg Press','Romanian DL','Leg Curl','Waden'],alt:'Kompletter Oberkörper-Tag'},
  nacken:{name:'Nacken',avoid:['Schulterdrücken','Klimmzüge','Seitheben'],alt:'Bein-Tag, leichte Brust-Isolation'},
  kopf:{name:'Kopf / Kreislauf',avoid:['Kniebeuge','Bankdrücken','Schulterdrücken','Klimmzüge'],alt:'Pausentag empfohlen'},
};
