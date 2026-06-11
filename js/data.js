// ════════════════════════════════════════════
// DATA — statische Stammdaten: Workout-Pläne, Muskel-Mapping, Wochentage,
// Verletzungs-Map. Keine Logik, keine onclick-Funktionen
// ════════════════════════════════════════════
const workoutPlans={
  heavy_push:{label:'Brust + Trizeps',short:'Push',ex:[['Bankdrücken','Brust','4×6–8'],['Schrägbank KH','Brust','3×8–10'],['Dips (Gewichtet)','Trizeps','3×8'],['Cable Flyes','Brust','3×12'],['Trizeps PD','Trizeps','3×12']]},
  heavy_pull:{label:'Rücken + Bizeps',short:'Pull',ex:[['Klimmzüge','Rücken','4×6–8'],['Kabelrudern','Rücken','3×10'],['Lat Pulldown','Rücken','3×10'],['Face Pulls','Schulter','3×15'],['Bizeps Curl','Bizeps','3×12']]},
  legs:{label:'Beine (Leg Day)',short:'Legs',ex:[['Kniebeuge','Quadrizeps','4×6–8'],['Leg Press','Quadrizeps','3×10'],['Romanian DL','Hamstrings','3×10'],['Leg Curl','Hamstrings','3×12'],['Waden','Waden','4×15']]},
  shoulders:{label:'Schultern + Core',short:'Shoul.',ex:[['Schulterdrücken','Schulter','4×8–10'],['Seitheben','Schulter','4×15'],['Arnold Press','Schulter','3×10'],['Reverse Pec','Schulter','3×15'],['Plank','Core','3×45s']]},
  recovery:{label:'Aktive Erholung',short:'Erhol.',ex:[['Foam Rolling','Mobilität','10 Min'],['Dehnen','Mobilität','15 Min'],['Spaziergang','Kardio','30 Min']]},
  rest:{label:'Ruhetag',short:'Rest',ex:[]},
};
const MUSCLE_MAP={
  // ── Brust
  'Bankdrücken':'Brust','Flachbank Drücken':'Brust','Schrägbank KH':'Brust',
  'Schrägbank Drücken':'Brust','KH Bankdrücken':'Brust','Kurzhantel Bankdrücken':'Brust',
  'Kurzhantel Schrägbank':'Brust','Fliegende':'Brust','KH Fliegende':'Brust',
  'Cable Flyes':'Brust','Kabelzug Fliegende':'Brust','Pec Deck':'Brust',
  'Butterfly':'Brust','Liegestütz':'Brust','Push-Up':'Brust','Dips (Gewichtet)':'Brust',
  // ── Rücken
  'Klimmzüge':'Rücken','Latzug':'Rücken','Lat Pulldown':'Rücken','Kabelrudern':'Rücken',
  'Sitzrudern':'Rücken','T-Bar Rudern':'Rücken','Langhantel Rudern':'Rücken',
  'KH Rudern':'Rücken','Einarmiges KH Rudern':'Rücken','Seated Row':'Rücken',
  'Chest Supported Row':'Rücken','Rack Pull':'Rücken','Hyperextension':'Rücken',
  'Superman':'Rücken','Kreuzheben':'Rücken','Deadlift':'Rücken',
  // ── Schulter
  'Schulterdrücken':'Schulter','Militarypress':'Schulter','Arnold Press':'Schulter',
  'KH Schulterdrücken':'Schulter','Seitheben':'Schulter','Frontheben':'Schulter',
  'Face Pulls':'Schulter','Reverse Pec':'Schulter','Reverse Pec Deck':'Schulter',
  'Reverse Fliegende':'Schulter','Upright Row':'Schulter','Shrugs':'Schulter',
  'Seitheben Kabel':'Schulter',
  // ── Bizeps
  'Bizeps Curl':'Bizeps','Hammer Curl':'Bizeps','Concentration Curl':'Bizeps',
  'Preacher Curl':'Bizeps','Spider Curl':'Bizeps','Kabel Curl':'Bizeps',
  'EZ-Bar Curl':'Bizeps','EZ Curl':'Bizeps','Reverse Curl':'Bizeps','Incline Curl':'Bizeps',
  // ── Trizeps
  'Trizeps PD':'Trizeps','Trizeps Pushdown':'Trizeps','Skull Crusher':'Trizeps',
  'Overhead Extension':'Trizeps','Trizeps Overhead':'Trizeps','Close Grip Bench':'Trizeps',
  'Trizeps Kickback':'Trizeps','Trizeps Dips':'Trizeps','Dips':'Trizeps',
  // ── Core
  'Plank':'Core','Crunches':'Core','Sit-Ups':'Core','Russian Twist':'Core',
  'Leg Raises':'Core','Hanging Leg Raises':'Core','Cable Crunch':'Core',
  'Ab Wheel':'Core','Dragon Flag':'Core','Mountain Climbers':'Core',
  'Hollow Hold':'Core','Dead Bug':'Core','Side Plank':'Core',
  // ── Quadrizeps
  'Kniebeuge':'Quadrizeps','Front Squat':'Quadrizeps','Goblet Squat':'Quadrizeps',
  'Hack Squat':'Quadrizeps','Leg Press':'Quadrizeps','Leg Extension':'Quadrizeps',
  'Ausfallschritte':'Quadrizeps','Lunges':'Quadrizeps','Step-Ups':'Quadrizeps',
  'Sissy Squat':'Quadrizeps',
  // ── Hamstrings
  'Romanian DL':'Hamstrings','Rumänisches Kreuzheben':'Hamstrings','Leg Curl':'Hamstrings',
  'Lying Leg Curl':'Hamstrings','Seated Leg Curl':'Hamstrings',
  'Stiff Leg Deadlift':'Hamstrings','Good Morning':'Hamstrings',
  'Nordic Curl':'Hamstrings','Hamstring Curl':'Hamstrings',
  // ── Gesäß
  'Hip Thrust':'Gesäß','Glute Bridge':'Gesäß','Bulgarian Split Squat':'Gesäß',
  'Sumo Squat':'Gesäß','Cable Kickback':'Gesäß','Donkey Kicks':'Gesäß',
  'Hip Abduction':'Gesäß','Abduktion':'Gesäß','Clamshells':'Gesäß',
  'Sumo Kreuzheben':'Gesäß','Glute Kickback':'Gesäß','Frog Pumps':'Gesäß',
  // ── Waden
  'Waden':'Waden','Wadenheben':'Waden','Calf Raises':'Waden',
  'Seated Calf Raises':'Waden','Leg Press Waden':'Waden','Donkey Calf Raises':'Waden',
  // ── Kardio / Mobilität
  'Foam Rolling':'Mobilität','Dehnen':'Mobilität','Spaziergang':'Kardio',
  'Laufen':'Kardio','Fahrrad':'Kardio','Rudergerät':'Kardio',
  'Ellipsentrainer':'Kardio','Seilspringen':'Kardio',
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
