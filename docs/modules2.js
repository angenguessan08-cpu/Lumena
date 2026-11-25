'use strict';
/* LUMINA — modules complémentaires :
   • Projets : radar de risques + prévisions + analyse IA
   • Argent : micro-investissement dans des projets locaux
   • Santé & bien-être : traitements (rappels, interactions), nutrition personnalisée (marqueurs ADN), bien-être mental
   L'« IA » de base est un moteur de règles qui fonctionne hors-ligne ; l'analyse approfondie par un modèle de langage
   n'est utilisée que sur demande, si une clé API est configurée (les données sont alors envoyées à l'API). */
Object.assign(IC,{
 pill:'<path d="m10.500 20.500-7-7a4.950 4.950 0 0 1 7-7l7 7a4.950 4.950 0 0 1-7 7z"/><path d="m8.500 8.500 7 7"/>',
 leaf:'<path d="M11 20A7 7 0 0 1 9.800 6.100C15.500 5 17 4.480 19 2c1 2 2 4.180 2 8 0 5.500-4.780 10-10 10z"/><path d="M2 21c0-3 1.850-5.360 5.080-6C9.500 14.520 12 13 13 12"/>',
 smile:'<circle cx="12" cy="12" r="9"/><path d="M8 14s1.500 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/>',
 share:'<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.600 13.500 6.800 4M15.400 6.500l-6.800 4"/>',
 sparkles:'<path d="M12 3l1.900 5.100L19 10l-5.100 1.900L12 17l-1.900-5.100L5 10l5.100-1.900z"/><path d="M19 17v4M17 19h4"/>',
 hand:'<path d="M12 21s-7-4.400-7-10a4 4 0 0 1 7-2.500A4 4 0 0 1 19 11c0 5.600-7 10-7 10z"/>'
});
/* ---------- Utilitaires ---------- */
const tp=(s,v={})=>translate(s).replace(/\{(\w+)\}/g,(_,k)=>v[k]??'');
const ltoday=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const dayDiff=(a,b)=>Math.round((new Date(b+'T12:00:00')-new Date(a+'T12:00:00'))/864e5);
const addDays=(d,n)=>{const x=new Date(d+'T12:00:00');x.setDate(x.getDate()+n);return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0')};
const hmNow=()=>{const d=new Date();return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')};
const toMin=h=>{const [a,b]=h.split(':');return +a*60+ +b};
const nrm=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0;
const f1=n=>fmtDec(Math.round(n*10)/10||0);
async function shareText(txt){
  try{if(navigator.share){await navigator.share({text:txt});return}}catch(e){if(e.name==='AbortError')return}
  window.open('https://wa.me/?text='+encodeURIComponent(txt),'_blank','noopener');
}
async function aiText(system,user){
  if(!CFG.apiKey){toast('⚠ Clé API absente : demandez à l’administrateur de la configurer (Administration).');return null}
  try{const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'content-type':'application/json','x-api-key':CFG.apiKey,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
    body:JSON.stringify({model:CFG.model||'claude-haiku-5-5',max_tokens:1200,system:system+`\nRéponds dans la langue suivante : ${LNAME[LANG]}. Sois concis, concret, bienveillant.`,messages:[{role:'user',content:user}]})});
    const j=await r.json();return j.content?.[0]?.text||('Erreur : '+(j.error?.message||'réponse vide'))}catch(e){return 'Erreur réseau : '+e.message}
}
const riskPill=l=>`<span class="pill ${l==='bad'?'bad':l==='warn'?'warn':l==='ok'?'good':''}">${t(l==='bad'?'Risque élevé':l==='warn'?'À surveiller':l==='ok'?'Sur la bonne voie':'Non évalué')}</span>`;
const note=(txt)=>`<p class="mute small" style="margin:8px 0 0">${txt}</p>`;

/* =====================================================================
   1. PROJETS — radar de risques, prévision de fin, suggestions
   ===================================================================== */
MODULES.projets.fields.splice(2,0,{k:'debut',l:'Date de début',t:'date'});
MODULES.projets.fields.splice(4,0,{k:'equipe',l:'Équipe (noms séparés par des virgules)',full:1});
function projRisk(p){
  const tasks=(p.taches||'').split('\n').filter(x=>x.trim()),done=tasks.filter(x=>/^x /i.test(x)).length,pct=taskPct(p),T=ltoday(),start=p.debut||(p.created||'').slice(0,10)||T;
  const R={lvl:'ok',reasons:[],tips:[],pct,planned:null,forecast:null};
  if(p.statut==='Terminé'){R.lvl='info';R.reasons.push(tp('Projet terminé'));return R}
  if(p.statut==='Idée'){R.lvl='info';R.reasons.push(tp('Projet à l’état d’idée : pas encore de suivi'));return R}
  let score=0;const bud=num(p.budget),dep=num(p.depense);
  if(p.echeance){
    const tot=Math.max(1,dayDiff(start,p.echeance)),el=Math.max(0,dayDiff(start,T)),planned=Math.min(100,Math.round(el/tot*100)),left=dayDiff(T,p.echeance);R.planned=planned;
    if(left<0&&pct<100){score+=3;R.reasons.push(tp('Échéance dépassée de {n} jour(s) ({p} % réalisé)',{n:-left,p:pct}));R.tips.push(tp('Renégocier une échéance réaliste et la communiquer à toute l’équipe.'))}
    else{
      const gap=planned-pct;
      if(gap>30){score+=2;R.reasons.push(tp('Avancement {p} % pour {t} % du temps écoulé',{p:pct,t:planned}));R.tips.push(tp('Réduire le périmètre : se concentrer sur les 3 tâches essentielles.'))}
      else if(gap>15){score+=1;R.reasons.push(tp('Avancement {p} % pour {t} % du temps écoulé',{p:pct,t:planned}));R.tips.push(tp('Planifier une revue hebdomadaire pour rattraper le léger retard.'))}
      const rest=tasks.length-done;
      if(tasks.length&&pct<100&&left>=0&&left<=7&&rest>=3){score+=1;R.reasons.push(tp('{n} tâches restantes en {d} jour(s)',{n:rest,d:left}));R.tips.push(tp('Répartir ou déléguer les tâches restantes dès cette semaine.'))}
      if(pct>0&&pct<100&&el>0&&score===0){const days=Math.ceil((100-pct)/(pct/el));R.forecast=addDays(T,days);if(R.forecast>p.echeance){score+=1;R.reasons.push(tp('Au rythme actuel, fin prévue le {d}',{d:R.forecast}));R.tips.push(tp('Augmenter la cadence ou ajuster l’échéance.'))}}
    }
    if(pct>0&&pct<100&&el>0&&!R.forecast)R.forecast=addDays(T,Math.ceil((100-pct)/(pct/el)));
  }else{R.reasons.push(tp('Aucune échéance définie'));R.tips.push(tp('Fixer une date de fin pour pouvoir suivre les retards.'))}
  if(!tasks.length){R.reasons.push(tp('Aucune tâche définie'));R.tips.push(tp('Découper le projet en tâches pour mesurer l’avancement.'))}
  if(bud>0){const burn=dep/bud*100;
    if(burn>100){score+=3;R.reasons.push(tp('Budget dépassé de {a}',{a:fmt(dep-bud)}));R.tips.push(tp('Geler les dépenses non essentielles et revoir le budget.'))}
    else if(dep>0&&burn-pct>25){score+=2;R.reasons.push(tp('Budget consommé à {b} % pour {p} % d’avancement',{b:Math.round(burn),p:pct}));R.tips.push(tp('Contrôler les dépenses : le budget part plus vite que le travail.'))}}
  if(p.statut==='En pause'){score+=1;R.reasons.push(tp('Projet en pause'));R.tips.push(tp('Décider : relancer, reporter ou arrêter officiellement.'))}
  R.lvl=score>=3?'bad':score>=1?'warn':'ok';
  if(R.lvl==='ok'&&!R.reasons.length)R.reasons.push(tp('Rythme conforme au plan'));
  return R;
}
const projLine=(p)=>{const r=projRisk(p);return `<div class="s" style="margin-top:2px">${riskPill(r.lvl)} ${r.forecast&&r.lvl!=='info'?`<span class="mute">${tp('Fin prévue : {d}',{d:r.forecast})}</span>`:''}</div>`};
{const base=projectCard;projectCard=function(i){return base(i).replace('<div class="s">Échéance',projLine(i)+'<div class="s">Échéance')};MODULES.projets.card=projectCard}
function projTop(){
  const act=list('projets').filter(p=>p.statut==='En cours'||p.statut==='En pause'),rows=act.map(p=>({p,r:projRisk(p)})).sort((a,b)=>({bad:0,warn:1,ok:2,info:3}[a.r.lvl]-{bad:0,warn:1,ok:2,info:3}[b.r.lvl]));
  const c=l=>rows.filter(x=>x.r.lvl===l).length;
  return `<div class="card"><h2>${ic('sparkles')} Radar IA des projets</h2>
  ${rows.length?`<div class="sum" style="padding:0 0 10px"><span>${t('Sur la bonne voie')} <b class="good">${c('ok')}</b></span><span>${t('À surveiller')} <b class="warn">${c('warn')}</b></span><span>${t('Risque élevé')} <b class="bad">${c('bad')}</b></span></div>
  ${rows.map(({p,r})=>`<div class="al ${r.lvl==='bad'?'bad':r.lvl==='warn'?'warn':'ok'}"><span class="ai">${ic(r.lvl==='ok'?'check':'alert')}</span><div style="flex:1;min-width:0"><b>${esc(p.nom)}</b> ${riskPill(r.lvl)} <span class="mute">${r.pct} %${r.planned!=null?` · ${tp('{t} % du temps écoulé',{t:r.planned})}`:''}</span>
   <div class="bar" style="margin:6px 0"><i style="width:${r.pct}%"></i></div>
   <div class="small">${r.reasons.map(esc).join(' · ')}</div>${r.tips.length?`<div class="small mute" style="margin-top:3px">${ic('sparkles')} ${esc(r.tips[0])}</div>`:''}</div></div>`).join('')}
  <p class="acts" style="margin:10px 0 0"><button data-x="aiproj">${ic('sparkles')} Analyse IA approfondie</button><button class="ghost" data-x="shareproj">${ic('share')} Partager le point projets</button></p><div id="aiout" class="small" style="white-space:pre-wrap;margin-top:10px"></div>`
  :'<span class="mute">Aucun projet en cours à analyser.</span>'}
  ${note('Les risques sont calculés sur l’avancement des tâches, le temps écoulé, la cadence et le budget. Consultable depuis le smartphone : l’interface s’adapte à l’écran.')}</div>`;
}
MODULES.projets.top=()=>projTop();
function projSummaryText(){
  const act=list('projets').filter(p=>p.statut==='En cours'||p.statut==='En pause');
  return `LUMINA — ${t('Point projets')} (${ltoday()})\n`+act.map(p=>{const r=projRisk(p);return `• ${p.nom} : ${r.pct} % — ${t(r.lvl==='bad'?'Risque élevé':r.lvl==='warn'?'À surveiller':'Sur la bonne voie')}${r.forecast?` — ${tp('Fin prévue : {d}',{d:r.forecast})}`:''}${p.echeance?` (${p.echeance})`:''}`}).join('\n');
}

/* =====================================================================
   2. MICRO-INVESTISSEMENT dans des projets locaux (Argent)
   ===================================================================== */
const SECTEURS=['Agriculture','Commerce','Artisanat','Services','Éducation','Santé','Énergie','Numérique','Autre'];
const microGain=i=>num(i.investi)*num(i.rendement)/100*(num(i.duree)||12)/12;
const microIn=i=>['Investi','Remboursé','En difficulté'].includes(i.statut);
MODULES.micro={label:'Micro-investissement local',icon:'hand',sort:'date',card:microCard,defaults:{statut:'À étudier',secteur:'Agriculture',risque:'Moyen',duree:12},
 fields:[{k:'nom',l:'Projet local',full:1},{k:'porteur',l:'Porteur du projet (entrepreneur)'},{k:'ville',l:'Ville / pays'},{k:'secteur',l:'Secteur',t:'select',o:SECTEURS},{k:'statut',l:'Statut',t:'select',o:['À étudier','Investi','Remboursé','En difficulté','Abandonné']},
  {k:'objectif',l:'Objectif de collecte (FCFA)',t:'number'},{k:'collecte',l:'Déjà collecté (FCFA)',t:'number'},{k:'minimum',l:'Mise minimale (FCFA)',t:'number'},{k:'investi',l:'Mon investissement (FCFA)',t:'number'},
  {k:'rendement',l:'Rendement annuel attendu (%)',t:'number'},{k:'duree',l:'Durée (mois)',t:'number'},{k:'risque',l:'Niveau de risque',t:'select',o:['Faible','Moyen','Élevé']},{k:'date',l:'Date',t:'date'},{k:'tel',l:'Contact du porteur',t:'tel'},
  {k:'impact',l:'Impact local attendu (emplois, filière, quartier…)',t:'textarea',full:1},{k:'note',l:'Notes (garanties, échéancier de remboursement…)',t:'textarea',full:1}],
 cols:[{k:'nom',l:'Projet'},{k:'porteur',l:'Porteur'},{k:'secteur',l:'Secteur',f:i=>badge(i.secteur)},{k:'statut',l:'Statut',f:i=>badge(i.statut)},{k:'investi',l:'Mon investissement',cls:'num',f:i=>fmt(i.investi)},{k:'rendement',l:'Rendement',cls:'num',f:i=>pct(num(i.rendement))},{k:'risque',l:'Risque',f:i=>badge(i.risque)}],
 filters:[{k:'statut',l:'Statut'},{k:'secteur',l:'Secteur'},{k:'risque',l:'Risque'}],
 summary:a=>{const inv=a.filter(microIn);return `<span>${t('Projets soutenus')} <b>${inv.length}</b></span><span>${t('Investi')} <b>${fmt(inv.reduce((x,i)=>x+num(i.investi),0))}</b></span><span>${t('Gain projeté')} <b class="good">${fmt(inv.reduce((x,i)=>x+microGain(i),0))}</b></span>`},
 top:a=>microTop(a)};
function microCard(i){
  const obj=num(i.objectif),col=num(i.collecte)+(microIn(i)?num(i.investi):0),p=obj?Math.min(100,col/obj*100):0;
  return `<div class="pc"><div class="pb"><div class="t">${esc(i.nom)} ${badge(i.statut)}</div><div class="s">${esc(i.porteur||'—')} · ${esc(i.ville||'')}</div><div>${badge(i.secteur)} ${badge(i.risque)}</div>
  ${obj?`<div class="s">${t('Collecte')} : ${fmt(col)} / ${fmt(obj)} (${pct(p)})</div><div class="bar"><i style="width:${p}%"></i></div>`:''}
  <div class="s">${t('Mon investissement')} : <b>${fmt(i.investi)}</b> · ${t('Rendement')} ${pct(num(i.rendement))} · ${num(i.duree)||12} ${t('mois')}</div>
  <div class="s">${t('Gain projeté')} : <b class="good">${fmt(microGain(i))}</b></div>${i.impact?`<div class="s">${ic('hand')} ${esc(i.impact)}</div>`:''}
  <div class="ca"><button class="ghost" data-x="sharemicro" data-id="${i.id}">${ic('share')} Partager la fiche</button></div>${actions('micro',i)}</div></div>`;
}
function microTop(a){
  const inv=list('micro').filter(microIn),tot=inv.reduce((x,i)=>x+num(i.investi),0),gain=inv.reduce((x,i)=>x+microGain(i),0),wr=tot?inv.reduce((x,i)=>x+num(i.investi)*num(i.rendement),0)/tot:0;
  const big=inv.sort((x,y)=>num(y.investi)-num(x.investi))[0],conc=tot&&big?num(big.investi)/tot*100:0,sect=new Set(inv.map(i=>i.secteur)).size,high=inv.filter(i=>i.risque==='Élevé').reduce((x,i)=>x+num(i.investi),0);
  const adv=[];if(inv.length&&inv.length<3)adv.push(tp('Diversifiez : répartissez votre budget sur au moins 3 projets.'));if(conc>40&&inv.length>1)adv.push(tp('{p} % de votre portefeuille est sur un seul projet ({n}).',{p:Math.round(conc),n:big.nom}));if(tot&&high/tot>.5)adv.push(tp('Plus de la moitié de votre portefeuille est en risque élevé.'));
  return `<div class="grid"><div class="stat"><small>${t('Investi')}</small><b>${fmt(tot)}</b></div><div class="stat s4"><small>${t('Gain projeté')}</small><b class="good">${fmt(gain)}</b></div><div class="stat s3"><small>${t('Rendement moyen pondéré')}</small><b>${pct(wr)}</b></div><div class="stat s2"><small>${t('Projets soutenus')}</small><b>${inv.length}</b><small>${sect} ${t('secteur(s)')}</small></div></div>
  <div class="g2"><div class="card"><h2>${ic('chart')} Répartition par secteur</h2>${donut(group(inv,'secteur','investi'))}${adv.map(x=>`<div class="al warn"><span class="ai">${ic('alert')}</span><div>${esc(x)}</div></div>`).join('')}</div>
  <div class="card sim"><h2>${ic('coins')} Simulateur de micro-investissement</h2><div class="fg"><div><label>Montant à investir</label><input type="number" min="0" data-sim="a" value="50000"></div><div><label>Rendement annuel attendu (%)</label><input type="number" min="0" step="any" data-sim="r" value="8"></div><div><label>Durée (mois)</label><input type="number" min="1" data-sim="d" value="12"></div><div><label>Probabilité d’échec estimée (%)</label><input type="number" min="0" max="100" data-sim="f" value="10"></div></div>
  <div class="tiles" style="margin-top:12px"><div class="tile a4"><small>${t('Gain si tout se passe bien')}</small><b data-sim-out="gain" class="good"></b></div><div class="tile a1"><small>${t('Capital + gain')}</small><b data-sim-out="tot"></b></div><div class="tile a3"><small>${t('Gain espéré (après risque)')}</small><b data-sim-out="exp"></b></div></div>
  ${note('Règle d’or : n’investissez que ce que vous pouvez vous permettre de perdre, diversifiez, et demandez un contrat écrit. Ce module est un carnet de suivi : il ne collecte ni ne transfère aucun argent.')}</div></div>`;
}
function simUpdate(root){
  const g=k=>num(root.querySelector(`[data-sim=${k}]`)?.value),a=g('a'),r=g('r'),d=g('d')||12,f=g('f')/100,gain=a*r/100*d/12;
  const o=(k,v)=>{const e=root.querySelector(`[data-sim-out=${k}]`);if(e)e.textContent=fmt(v)};o('gain',gain);o('tot',a+gain);o('exp',(1-f)*(a+gain)-a);
}
document.addEventListener('input',ev=>{const s=ev.target.closest?.('.sim');if(s)simUpdate(s)});
new MutationObserver(ms=>{for(const m of ms)m.addedNodes.forEach(n=>{if(n.nodeType===1)(n.matches?.('.sim')?[n]:n.querySelectorAll?.('.sim')||[]).forEach(simUpdate)})}).observe(document.body,{childList:true,subtree:true});
function microShareText(i){return `📌 ${i.nom}\n${i.porteur?i.porteur+' — ':''}${i.ville||''}\n${t('Secteur')} : ${t(i.secteur||'')} · ${t('Risque')} : ${t(i.risque||'')}\n${num(i.objectif)?`${t('Objectif de collecte')} : ${fmt(i.objectif)} (${t('mise minimale')} ${fmt(i.minimum)})\n`:''}${t('Rendement')} ${pct(num(i.rendement))} · ${num(i.duree)||12} ${t('mois')}\n${i.impact?t('Impact local attendu')+' : '+i.impact+'\n':''}${i.tel?'☎ '+i.tel:''}`}

/* =====================================================================
   3. TRAITEMENTS MÉDICAUX — rappels, suivi des prises, interactions, partage
   ===================================================================== */
const INTER=[
 [['warfarine','coumadine','acenocoumarol','sintrom','previscan'],['aspirine','aspegic','kardegic','ibuprofene','advil','nurofen','diclofenac','voltarene','naproxene','ketoprofene'],'bad','Risque hémorragique majoré (anticoagulant + anti-inflammatoire ou aspirine).'],
 [['aspirine','aspegic','kardegic'],['ibuprofene','advil','nurofen','naproxene'],'warn','L’ibuprofène peut réduire l’effet protecteur de l’aspirine et augmente le risque digestif.'],
 [['ibuprofene','advil','nurofen','diclofenac','voltarene','naproxene','ketoprofene'],['enalapril','perindopril','ramipril','lisinopril','captopril','losartan','valsartan','irbesartan','candesartan','furosemide','hydrochlorothiazide'],'warn','Anti-inflammatoire + médicament du cœur ou de la tension : risque d’atteinte rénale, surtout chez la personne âgée.'],
 [['enalapril','perindopril','ramipril','lisinopril','captopril','losartan','valsartan','irbesartan','candesartan'],['spironolactone','aldactone','potassium','kaleorid'],'warn','Risque d’excès de potassium dans le sang.'],
 [['simvastatine','atorvastatine'],['clarithromycine','erythromycine'],'warn','Risque d’atteinte musculaire (statine + antibiotique).'],
 [['sildenafil','viagra','tadalafil','cialis'],['trinitrine','nitre','isosorbide','natispray'],'bad','Association contre-indiquée : chute sévère de la tension.'],
 [['tramadol','codeine','morphine','oxycodone','tramal'],['diazepam','valium','bromazepam','lexomil','alprazolam','xanax','zolpidem','stilnox','lorazepam'],'bad','Somnolence et ralentissement de la respiration : association à éviter.'],
 [['sertraline','fluoxetine','prozac','paroxetine','citalopram','escitalopram','seropram'],['tramadol','millepertuis'],'warn','Risque de syndrome sérotoninergique (agitation, fièvre, tremblements).'],
 [['digoxine'],['amiodarone','cordarone','verapamil','isoptine'],'warn','Risque de surdosage en digoxine.'],
 [['levothyroxine','levothyrox'],['calcium','fer','tardyferon','maalox','gaviscon'],'info','Prendre à au moins 4 h d’intervalle (absorption réduite).'],
 [['ciprofloxacine','ofloxacine','levofloxacine'],['calcium','fer','magnesium','maalox','gaviscon'],'info','Espacer de 2 h : l’absorption de l’antibiotique est réduite.'],
 [['methotrexate'],['ibuprofene','naproxene','diclofenac','ketoprofene','bactrim','trimethoprime'],'bad','Toxicité du méthotrexate augmentée.']];
const MED_DEF={patient:'Moi',actif:'Oui',dose:1,horaires:'08:00'};
MODULES.traitements={label:'Traitements médicaux',icon:'pill',sort:'nom',asc:1,defaults:MED_DEF,
 fields:[{k:'nom',l:'Médicament',full:1},{k:'patient',l:'Pour qui ? (moi, un proche…)'},{k:'dosage',l:'Dosage (ex : 500 mg)'},{k:'dose',l:'Comprimés / unités par prise',t:'number'},{k:'horaires',l:'Horaires de prise (ex : 08:00, 20:00)'},
  {k:'debut',l:'Début du traitement',t:'date'},{k:'fin',l:'Fin du traitement (facultatif)',t:'date'},{k:'stock',l:'Stock restant (comprimés)',t:'number'},{k:'actif',l:'Traitement actif',t:'select',o:['Oui','Non']},{k:'medecin',l:'Prescripteur / médecin'},{k:'instructions',l:'Instructions (pendant le repas, à jeun…)',full:1},{k:'note',l:'Notes',t:'textarea',full:1}],
 cols:[{k:'nom',l:'Médicament'},{k:'patient',l:'Pour qui ?'},{k:'dosage',l:'Dosage'},{k:'horaires',l:'Horaires'},{k:'stock',l:'Stock',cls:'num'},{k:'actif',l:'Traitement actif',f:i=>badge(i.actif)}],
 filters:[{k:'patient',l:'Patient'},{k:'actif',l:'Traitement actif'}],summary:a=>`<span>${t('Traitements actifs')} <b>${a.filter(i=>i.actif!=='Non').length}</b></span>`,
 top:()=>medTop()};
const times=m=>[...new Set(((m.horaires||'').match(/\d{1,2}:\d{2}/g)||[]).map(h=>h.padStart(5,'0')))].sort();
const medActive=(m,d=ltoday())=>m.actif!=='Non'&&(!m.debut||m.debut<=d)&&(!m.fin||m.fin>=d);
function dosesToday(){
  const d=ltoday(),now=toMin(hmNow()),out=[];
  list('traitements').filter(m=>medActive(m)).forEach(m=>times(m).forEach(h=>{
    const lg=list('prises').find(p=>p.med===m.id&&p.date===d&&p.heure===h);
    out.push({m,h,log:lg,state:lg?lg.statut:(now>toMin(h)+30?'late':now>=toMin(h)?'due':'next')})}));
  return out.sort((a,b)=>a.h<b.h?-1:1);
}
function adherence(){
  let exp=0,got=0;for(let k=1;k<=7;k++){const d=addDays(ltoday(),-k);list('traitements').filter(m=>medActive(m,d)).forEach(m=>times(m).forEach(h=>{exp++;if(list('prises').some(p=>p.med===m.id&&p.date===d&&p.heure===h&&p.statut==='pris'))got++}))}
  return exp?Math.round(got/exp*100):null;
}
const hit=(name,keys)=>{const n=nrm(name);return keys.some(k=>n.includes(k))};
function interactions(){
  const ms=list('traitements').filter(m=>medActive(m)),out=[];
  for(let i=0;i<ms.length;i++)for(let j=i+1;j<ms.length;j++)for(const [A,B,lvl,msg] of INTER)
    if((hit(ms[i].nom,A)&&hit(ms[j].nom,B))||(hit(ms[j].nom,A)&&hit(ms[i].nom,B)))out.push({a:ms[i].nom,b:ms[j].nom,lvl,msg});
  return out;
}
function lowStock(){return list('traitements').filter(m=>medActive(m)&&m.stock!==''&&m.stock!=null&&times(m).length).map(m=>({m,days:Math.floor(num(m.stock)/((num(m.dose)||1)*times(m).length))})).filter(x=>x.days<7)}
const aidant=()=>DB.profile?.aidant||{};
function aidantLink(txt){const tel=String(aidant().tel||'').replace(/\D/g,'');return `https://wa.me/${tel}?text=${encodeURIComponent(txt)}`}
function medSummaryText(){
  const ds=dosesToday(),ad=adherence();
  return `LUMINA — ${t('Suivi des traitements')} (${ltoday()})\n`+(ds.map(x=>`${x.h} ${x.m.nom} ${x.m.dosage||''} (${x.m.patient||''}) : ${t(x.state==='pris'?'pris':x.state==='ignore'?'ignoré':x.state==='late'?'non confirmé':'à venir')}`).join('\n')||t('Aucune prise prévue aujourd’hui'))+(ad!=null?`\n${t('Régularité sur 7 jours')} : ${ad} %`:'');
}
function medTop(){
  const ds=dosesToday(),ad=adherence(),it=interactions(),ls=lowStock(),late=ds.filter(x=>x.state==='late'),ai=aidant();
  const stLab={pris:['good','✓ Pris'],ignore:['','Ignoré'],late:['bad','Oubli probable'],due:['warn','À prendre maintenant'],next:['','À venir']};
  return `<div class="card"><h2>${ic('pill')} Prises du jour</h2>
  ${late.length?`<div class="al bad"><span class="ai">${ic('alert')}</span><div><b>${tp('{n} prise(s) non confirmée(s)',{n:late.length})}</b> — ${t('Prenez-la si c’est encore possible, sinon ne doublez pas la dose et demandez conseil.')}${ai.tel?` <a href="${aidantLink(medSummaryText())}" target="_blank" rel="noopener">${t('Prévenir mon proche')}</a>`:''}</div></div>`:''}
  ${ds.length?ds.map(x=>`<div class="td ${x.state==='pris'?'ok':''}" style="cursor:default"><span class="ti">${ic('pill')}</span><div class="tt"><b>${x.h} · ${esc(x.m.nom)} ${esc(x.m.dosage||'')}</b><small>${esc(x.m.patient||'')} · ${num(x.m.dose)||1} ${t('prise(s)')}${x.m.instructions?' · '+esc(x.m.instructions):''}</small></div>
   ${x.log?`<span class="chip ${x.state==='pris'?'ok':'todo'}">${t(stLab[x.state][1])}</span>`:`<span class="chip todo">${t(stLab[x.state][1])}</span><button data-x="dose" data-m="${x.m.id}" data-h="${x.h}" data-s="pris">✓ ${t('Pris')}</button><button class="ghost" data-x="dose" data-m="${x.m.id}" data-h="${x.h}" data-s="ignore">${t('Ignorer')}</button>`}</div>`).join(''):`<span class="mute">${t('Aucune prise prévue aujourd’hui')}</span>`}
  <div class="sum"><span>${t('Régularité sur 7 jours')} <b class="${ad==null?'':ad>=80?'good':'bad'}">${ad==null?'—':ad+' %'}</b></span></div>
  <p class="acts" style="margin:10px 0 0"><button class="ghost" data-x="notif">${ic('bell')} Activer les rappels</button><button class="ghost" data-x="sharemed">${ic('share')} Partager avec un proche / un soignant</button></p></div>
  ${it.length||ls.length?`<div class="card"><h2>${ic('alert')} Vigilance</h2>${it.map(x=>`<div class="al ${x.lvl==='bad'?'bad':x.lvl==='warn'?'warn':'ok'}"><span class="ai">${ic('alert')}</span><div><b>${esc(x.a)} + ${esc(x.b)}</b> — ${t(x.msg)}</div></div>`).join('')}${ls.map(x=>`<div class="al warn"><span class="ai">${ic('clock')}</span><div><b>${esc(x.m.nom)}</b> — ${tp('Stock pour environ {d} jour(s) : pensez au renouvellement.',{d:x.days})}</div></div>`).join('')}
  ${note('Contrôle informatif basé sur une liste limitée d’interactions courantes : il ne remplace pas l’avis d’un médecin ou d’un pharmacien. Ne modifiez jamais un traitement sans avis médical.')}</div>`:''}
  <div class="card"><h2>${ic('users')} Proche ou soignant à prévenir</h2><div class="fg"><div><label>Nom</label><input id="ad-nom" value="${esc(ai.nom||'')}"></div><div><label>Téléphone / WhatsApp (avec indicatif)</label><input id="ad-tel" type="tel" value="${esc(ai.tel||'')}"></div></div><p style="margin:10px 0 0"><button class="ghost" data-x="aidant">Enregistrer</button></p>
  ${note('Le partage se fait à la demande (WhatsApp, e-mail…). Un envoi automatique en temps réel vers les proches nécessiterait un serveur : il n’est pas activé dans cette version. Les rappels fonctionnent tant que l’application est ouverte.')}</div>`;
}
const notified=new Set();
function reminderTick(){
  if(!ME||!list('traitements').length)return;
  const d=ltoday(),hm=hmNow();
  dosesToday().filter(x=>!x.log&&x.h===hm).forEach(x=>{const k=d+x.m.id+x.h;if(notified.has(k))return;notified.add(k);
    const msg=`${x.h} — ${x.m.nom} ${x.m.dosage||''} (${x.m.patient||''})`;toast('💊 '+msg);
    try{if('Notification' in window&&Notification.permission==='granted')new Notification(t('Heure de votre traitement'),{body:msg})}catch{}});
}
setInterval(reminderTick,30000);

/* =====================================================================
   4. BIEN-ÊTRE MENTAL — suivi quotidien, signaux d'alerte, conseils
   ===================================================================== */
const HELP={FR:'3114 (prévention du suicide, 24 h/24)',BE:'107 (Télé-Accueil)',CH:'143 (La Main Tendue)',CA:'988',US:'988',GB:'116 123 (Samaritans)',ES:'024',PT:'808 24 24 24 (SNS 24)',BR:'188 (CVV)',MX:'800 911 2000 (Línea de la Vida)',ZA:'0800 567 567 (SADAG)'};
MODULES.humeur={label:'Bien-être mental',icon:'smile',sort:'date',defaults:{humeur:'3',energie:'3',stress:'3',social:'Oui',pensees:'Non'},
 fields:[{k:'date',l:'Date',t:'date'},{k:'humeur',l:'Humeur (1 = très bas, 5 = très bien)',t:'select',o:['5','4','3','2','1']},{k:'energie',l:'Énergie (1 à 5)',t:'select',o:['5','4','3','2','1']},{k:'stress',l:'Stress (1 = calme, 5 = très élevé)',t:'select',o:['1','2','3','4','5']},
  {k:'sommeil',l:'Sommeil cette nuit (heures)',t:'number'},{k:'activite',l:'Activité physique (minutes)',t:'number'},{k:'social',l:'Contact avec un proche aujourd’hui',t:'select',o:['Oui','Non']},{k:'pensees',l:'J’ai eu des pensées de me faire du mal',t:'select',o:['Non','Oui']},{k:'note',l:'Comment je me sens (facultatif)',t:'textarea',full:1}],
 cols:[{k:'date',l:'Date'},{k:'humeur',l:'Humeur',cls:'num'},{k:'energie',l:'Énergie',cls:'num'},{k:'stress',l:'Stress',cls:'num'},{k:'sommeil',l:'Sommeil (h)',cls:'num'},{k:'activite',l:'Activité (min)',cls:'num'},{k:'note',l:'Notes',f:i=>esc((i.note||'').slice(0,60))}],
 filters:[{k:'_mois',l:'Mois'}],summary:a=>`<span>${t('Bilans')} <b>${a.length}</b></span><span>${t('Humeur moyenne')} <b>${a.length?f1(avg(a.map(i=>num(i.humeur)))):'—'}</b></span>`,
 top:()=>moodTop()};
function moodAnalysis(){
  const T=ltoday(),all=[...list('humeur')].sort((a,b)=>a.date<b.date?1:-1),inR=(i,a,b)=>i.date>=addDays(T,-a)&&i.date<=addDays(T,-b),w1=all.filter(i=>inR(i,6,0)),w0=all.filter(i=>inR(i,13,7)),S=[];
  const m=a=>avg(a.map(i=>num(i.humeur))),sl=a=>a.filter(i=>num(i.sommeil)).map(i=>num(i.sommeil));
  let crisis=all.some(i=>i.pensees==='Oui'&&i.date>=addDays(T,-14));
  const last5=all.slice(0,5);
  if(last5.length>=4&&m(last5)<=2)S.push({k:'low',s:2,m:'Humeur basse depuis plusieurs jours',tip:'Parlez de ce que vous ressentez à une personne de confiance et envisagez de consulter un professionnel.'});
  if(w1.length>=3&&w0.length>=3&&m(w1)-m(w0)<=-1)S.push({k:'drop',s:1,m:'Baisse d’humeur par rapport à la semaine précédente',tip:'Repérez ce qui a changé cette semaine (travail, sommeil, relations) et planifiez une activité qui vous fait du bien.'});
  if(sl(w1).length>=3&&avg(sl(w1))<6)S.push({k:'sleep',s:1,m:tp('Sommeil moyen de {h} h sur 7 jours',{h:f1(avg(sl(w1)))}),tip:'Fixez des heures de coucher régulières, évitez les écrans et la caféine en soirée.'});
  if(w1.length>=3&&avg(w1.map(i=>num(i.stress)))>=4)S.push({k:'stress',s:1,m:'Niveau de stress élevé cette semaine',tip:'Essayez 5 minutes de respiration lente (inspirer 4 s, souffler 6 s) plusieurs fois par jour.'});
  const ac=a=>avg(a.map(i=>num(i.activite)));
  if(w1.length>=3&&w0.length>=3&&ac(w0)>=20&&ac(w1)<ac(w0)*.5)S.push({k:'act',s:1,m:'Activité physique en forte baisse',tip:'Reprenez doucement : 15 à 20 minutes de marche par jour suffisent pour commencer.'});
  if(w1.length>=4&&w1.every(i=>i.social==='Non'))S.push({k:'iso',s:1,m:'Peu de contacts avec vos proches cette semaine',tip:'Envoyez un message ou appelez quelqu’un aujourd’hui, même brièvement.'});
  if(all.length>=5&&dayDiff(all[0].date,T)>=4)S.push({k:'gap',s:0,m:tp('Pas de bilan depuis {n} jours',{n:dayDiff(all[0].date,T)}),tip:'Un court bilan quotidien aide à repérer tôt les changements.'});
  const score=S.reduce((x,y)=>x+y.s,0),lvl=crisis?'crisis':score>=3||S.some(x=>x.k==='low')?'alert':score>=1?'watch':'ok';
  return {lvl,S,w1,all,crisis};
}
function helpBlock(){
  const h=HELP[COUNTRY];
  return `<div class="al bad"><span class="ai">${ic('heart')}</span><div><b>${t('Besoin de parler maintenant ?')}</b> ${t('Si vous pensez à vous faire du mal ou si vous êtes en danger, contactez immédiatement les services d’urgence de votre pays ou une personne de confiance.')} ${h?`<b>${esc(h)}</b>.`:t('Annuaire international des lignes d’écoute : findahelpline.com')} ${t('Vérifiez toujours les numéros en vigueur dans votre pays.')}</div></div>`;
}
function moodTop(){
  const A=moodAnalysis(),lv={ok:['good','Stable'],watch:['warn','Vigilance'],alert:['bad','Alerte'],crisis:['bad','Alerte']}[A.lvl],pts=[...A.all].filter(i=>i.date>=addDays(ltoday(),-30)).sort((a,b)=>a.date<b.date?-1:1).map(i=>({l:i.date.slice(5),v:num(i.humeur)}));
  return `<div class="card"><h2>${ic('sparkles')} Analyse de votre bien-être <span class="pill ${lv[0]}">${t(lv[1])}</span></h2>
  ${A.crisis?helpBlock():''}
  ${A.S.length?A.S.map(x=>`<div class="al ${x.s>=2?'bad':'warn'}"><span class="ai">${ic('alert')}</span><div><b>${esc(x.m.includes('{')?x.m:t(x.m))}</b><div class="small mute" style="margin-top:2px">${ic('sparkles')} ${t(x.tip)}</div></div></div>`).join(''):`<div class="al ok"><span class="ai">${ic('check')}</span><div>${A.all.length?t('Aucun signal d’alerte détecté sur vos derniers bilans. Continuez ainsi !'):t('Commencez par un premier bilan du jour : 1 minute suffit.')}</div></div>`}
  ${A.lvl==='alert'&&!A.crisis?helpBlock():''}
  <p class="acts" style="margin:10px 0 0"><button data-new="humeur">${ic('plus')} Bilan du jour</button><button class="ghost" data-x="aimood">${ic('sparkles')} Conseils personnalisés par l’IA</button></p><div id="aiout" class="small" style="white-space:pre-wrap;margin-top:10px"></div>
  ${note('Outil de suivi et de prévention : il ne pose aucun diagnostic et ne remplace pas un professionnel de santé. Vos bilans restent sur cet appareil (sauf analyse IA lancée par vous, avec votre accord).')}</div>
  <div class="card"><h2>Évolution de l’humeur (30 jours)</h2>${line(pts)}</div>`;
}
const MOOD_SYS='Tu es un assistant de bien-être bienveillant. Tu ne poses jamais de diagnostic. À partir des bilans quotidiens fournis (humeur 1-5, énergie, stress, sommeil en heures, activité en minutes, contacts sociaux), donne : 1) ce que tu observes, 2) 3 conseils concrets et doux adaptés, 3) si nécessaire, encourage à parler à un proche ou à un professionnel. Si des pensées de se faire du mal sont signalées, insiste avec chaleur sur l’aide immédiate.';

/* =====================================================================
   5. NUTRITION PERSONNALISÉE — profil, marqueurs génétiques, menus
   ===================================================================== */
const NOBJ=[['perte','Perte de poids'],['masse','Prise de masse'],['performance','Performance sportive'],['longevite','Longévité et santé'],['maintien','Maintien']];
const NACT=[['1.2','Sédentaire'],['1.375','Légèrement actif'],['1.55','Modérément actif'],['1.725','Très actif']];
const NREG=[['omnivore','Omnivore'],['halal','Sans porc'],['pescetarien','Pescétarien'],['vegetarien','Végétarien'],['vegetalien','Végétalien'],['sansgluten','Sans gluten']];
const MARK={
 lct:{l:'Digestion du lactose',rs:'rs4988235',o:[['','Non testé'],['tolerant','Tolérant (persistance de la lactase)'],['intolerant','Intolérance probable']]},
 cyp:{l:'Métabolisme de la caféine',rs:'rs762551',o:[['','Non testé'],['rapide','Métaboliseur rapide'],['lent','Métaboliseur lent']]},
 mthfr:{l:'Folates (MTHFR C677T)',rs:'rs1801133',o:[['','Non testé'],['normal','Activité normale'],['reduit','Activité réduite (1 copie)'],['fort','Activité fortement réduite (2 copies)']]},
 apoe:{l:'Graisses saturées (APOE ε4)',rs:'rs429358',o:[['','Non testé'],['0','Sans allèle ε4'],['1','1 allèle ε4'],['2','2 allèles ε4']]},
 fto:{l:'Prédisposition à la prise de poids (FTO)',rs:'rs9939609',o:[['','Non testé'],['0','Risque standard'],['1','Risque modéré (1 allèle A)'],['2','Risque plus élevé (2 allèles A)']]}};
/* [nom, kcal pour une portion standard, repas, étiquettes] */
const DISHES=[
 ['Bouillie de mil au lait de coco et banane',320,'bf','fibres riche-sat'],['Omelette aux légumes et pain complet',350,'bf','oeuf gluten folates'],['Flocons d’avoine, fruits et noix',380,'bf','gluten fibres'],['Yaourt nature, mangue et graines',260,'bf','laitier'],
 ['Patate douce vapeur et œuf dur',330,'bf','oeuf fibres'],['Smoothie papaye-banane au lait végétal',240,'bf','fibres'],['Pain complet, avocat et œuf',370,'bf','oeuf gluten'],['Bouillie de maïs et arachides',340,'bf','arachide'],
 ['Attiéké, poisson grillé et salade',520,'ln','poisson folates'],['Riz complet, haricots niébé et légumes',500,'ln','fibres folates'],['Igname bouillie, sauce gombo et poisson',480,'ln','poisson fibres folates'],['Poulet grillé, riz et salade verte',540,'ln','viande'],
 ['Sauce arachide au poulet et riz',650,'ln','viande arachide riche-sat'],['Salade de mil, pois chiches et légumes',470,'ln','fibres folates'],['Alloco, œufs et salade',480,'ln','oeuf riche-sat'],['Pâtes complètes, sauce tomate et thon',520,'ln','poisson gluten fibres'],
 ['Brochettes de bœuf, patate douce et crudités',560,'ln','viande fibres'],['Porc braisé, igname et légumes',600,'ln','porc riche-sat'],
 ['Soupe de poisson et banane plantain bouillie',450,'dn','poisson'],['Sauce feuille (épinards) au poisson fumé et igname',470,'dn','poisson folates'],['Ragoût de haricots, riz et légumes',450,'dn','fibres folates'],['Poulet yassa léger et riz',520,'dn','viande'],
 ['Omelette aux épinards, salade et pain',400,'dn','oeuf gluten folates'],['Soupe de lentilles et légumes avec pain complet',380,'dn','gluten fibres folates'],['Poisson au four, légumes rôtis et patate douce',480,'dn','poisson fibres'],['Tofu sauté, légumes et riz',440,'dn','fibres'],
 ['Fruits frais de saison (mangue, papaye, ananas)',110,'sn','fibres'],['Poignée d’arachides ou de noix',160,'sn','arachide'],['Yaourt nature',100,'sn','laitier'],['Crudités et houmous',140,'sn','fibres folates'],['Œuf dur',80,'sn','oeuf'],['Thé vert ou café sans sucre',5,'sn','cafeine'],['Noix de coco fraîche',180,'sn','riche-sat']];
const MEALS=[['bf','Petit-déjeuner',.25],['ln','Déjeuner',.35],['dn','Dîner',.30],['sn','Collation',.10]];
const JOURS=['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];
const nut=()=>(DB.nutri=DB.nutri||{sexe:'F',age:35,poids:70,taille:170,activite:'1.375',objectif:'maintien',regime:'omnivore',allergies:'',markers:{},dislikes:[],seed:1});
function parseDNA(txt){
  const want={rs4988235:'lct',rs762551:'cyp',rs1801133:'mthfr',rs429358:'apoe',rs9939609:'fto'},got={};
  txt.split(/\r?\n/).forEach(l=>{if(!l||l[0]==='#')return;const c=l.replace(/"/g,'').split(/[\t,]/);const k=want[c[0]?.trim()];if(k)got[k]=c.slice(3).join('').replace(/[^ACGT]/gi,'').toUpperCase()||c[c.length-1].replace(/[^ACGT]/gi,'').toUpperCase()});
  const cnt=(g,plus,minus)=>[...g].filter(x=>plus.includes(x)||minus.includes(x)).length,isMinus=g=>/^[CT]+$/.test(g)&&!/[AG]/.test(g),M={};
  if(got.lct?.length>=2){const g=got.lct;M.lct=(isMinus(g)?g.includes('T'):g.includes('A'))?'tolerant':'intolerant'}
  if(got.cyp?.length>=2){const g=got.cyp,a=isMinus(g)?'T':'A';M.cyp=g===a+a?'rapide':'lent'}
  if(got.mthfr?.length>=2){const g=got.mthfr,v=isMinus(g)?'T':'A',n=[...g].filter(x=>x===v).length;M.mthfr=n===0?'normal':n===1?'reduit':'fort'}
  if(got.apoe?.length>=2){const g=got.apoe,v=/[AG]/.test(g)&&!/[CT]/.test(g)?'G':'C';M.apoe=String([...g].filter(x=>x===v).length)}
  if(got.fto?.length>=2){M.fto=String([...got.fto].filter(x=>x==='A').length)}
  return M;
}
function weightTrend(){
  const w=list('sante').filter(i=>num(i.poids)&&i.date>=addDays(ltoday(),-28)).sort((a,b)=>a.date<b.date?-1:1);
  if(w.length<2)return null;const d=dayDiff(w[0].date,w[w.length-1].date);if(d<10)return null;
  return {perWeek:(num(w[w.length-1].poids)-num(w[0].poids))/d*7,n:w.length};
}
function nutPlan(){
  const n=nut(),w=num(n.poids)||70,h=num(n.taille)||170,a=num(n.age)||35,bmr=10*w+6.25*h-5*a+(n.sexe==='H'?5:-161),tdee=bmr*num(n.activite);
  const f={perte:.85,masse:1.1,performance:1.05,longevite:.97,maintien:1}[n.objectif]||1;let adj=0,msg=null;const tr=weightTrend();
  if(tr){if(n.objectif==='perte'&&tr.perWeek>-.1){adj=-.05;msg=tp('Votre poids ne baisse pas assez ({k} kg/semaine) : apport réduit de 5 %.',{k:f1(tr.perWeek)})}
    else if(n.objectif==='perte'&&tr.perWeek<-1){adj=.05;msg=tp('Votre poids baisse trop vite ({k} kg/semaine) : apport augmenté de 5 %.',{k:f1(tr.perWeek)})}
    else if(n.objectif==='masse'&&tr.perWeek<.1){adj=.05;msg=tp('Votre poids n’augmente pas assez ({k} kg/semaine) : apport augmenté de 5 %.',{k:f1(tr.perWeek)})}
    else msg=tp('Évolution du poids cohérente avec votre objectif ({k} kg/semaine).',{k:f1(tr.perWeek)})}
  const kcal=Math.round(tdee*f*(1+adj)/10)*10;
  let M={perte:[30,35,35],masse:[25,50,25],performance:[20,55,25],longevite:[20,45,35],maintien:[20,50,30]}[n.objectif]||[20,50,30];
  const k=n.markers||{};if(num(k.fto)>=1&&n.objectif!=='masse')M=[M[0]+5,M[1]-5,M[2]];
  return {kcal,p:Math.round(kcal*M[0]/400),c:Math.round(kcal*M[1]/400),g:Math.round(kcal*M[2]/900),msg,M};
}
function nutAdvice(){
  const n=nut(),k=n.markers||{},A=[];
  if(k.lct==='intolerant')A.push('Limitez le lait ; privilégiez yaourts fermentés, boissons végétales enrichies en calcium, poissons à arêtes, légumes verts.');
  if(k.cyp==='lent')A.push('Caféine : restez sous 1 tasse par jour et évitez-la après 12 h (métabolisme lent).');
  if(k.cyp==='rapide')A.push('Caféine : bien métabolisée, 2 à 3 tasses par jour restent raisonnables.');
  if(k.mthfr==='reduit'||k.mthfr==='fort')A.push('Privilégiez les aliments riches en folates : légumes-feuilles, légumineuses, agrumes, œufs.');
  if(num(k.apoe)>=1)A.push('Limitez les graisses saturées (fritures, coco, viandes grasses) ; privilégiez huile d’olive, poissons gras, noix.');
  if(num(k.fto)>=1)A.push('Protéines et fibres à chaque repas pour la satiété, et 150 minutes d’activité par semaine au minimum.');
  if(n.objectif==='perte')A.push('Visez un déficit modéré : une perte de 0,25 à 0,75 kg par semaine est plus durable.');
  if(n.objectif==='performance')A.push('Placez les glucides autour des entraînements et hydratez-vous régulièrement.');
  if(n.objectif==='longevite')A.push('Variez les végétaux (30 aliments différents par semaine), mangez du poisson 2 fois par semaine, limitez les produits ultra-transformés.');
  if(!Object.values(k).some(Boolean))A.push('Ajoutez vos marqueurs génétiques (résultats d’un test ADN) pour affiner les recommandations.');
  return A;
}
function rng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function allowed(d,n){
  const tags=d[3].split(' '),k=n.markers||{},al=nrm(n.allergies),reg=n.regime;
  if((n.dislikes||[]).includes(d[0]))return false;
  const ban={vegetarien:['viande','porc','poisson'],vegetalien:['viande','porc','poisson','oeuf','laitier'],pescetarien:['viande','porc'],halal:['porc'],sansgluten:['gluten']}[reg]||[];
  if(tags.some(x=>ban.includes(x)))return false;
  if(k.lct==='intolerant'&&tags.includes('laitier'))return false;
  if(k.cyp==='lent'&&tags.includes('cafeine'))return false;
  const map={arachide:['arachide','cacahuete'],laitier:['lait','laitage','lactose'],oeuf:['oeuf'],poisson:['poisson'],gluten:['gluten','ble']};
  return !tags.some(x=>(map[x]||[]).some(w=>al.includes(w)));
}
function weekMenu(){
  const n=nut(),pl=nutPlan(),k=n.markers||{},R=rng(num(n.seed)*7919),days=[],used={};
  const wt=d=>{const tg=d[3].split(' ');let w=1;if(tg.includes('folates')&&(k.mthfr==='reduit'||k.mthfr==='fort'))w*=2;if(tg.includes('fibres')&&(n.objectif==='perte'||num(k.fto)>=1))w*=1.8;if(tg.includes('riche-sat')&&(num(k.apoe)>=1||n.objectif==='longevite'))w*=.2;return w};
  for(let j=0;j<7;j++){const row=MEALS.map(([m,,share])=>{const pool=DISHES.filter(d=>d[2]===m&&allowed(d,n));if(!pool.length)return null;const w2=d=>wt(d)*Math.pow(.25,used[d[0]]||0);let tot=pool.reduce((x,d)=>x+w2(d),0),r=R()*tot,pick=pool[0];for(const d of pool){r-=w2(d);if(r<=0){pick=d;break}}used[pick[0]]=(used[pick[0]]||0)+1;
    const f=Math.max(.6,Math.min(1.6,pl.kcal*share/pick[1]));return {d:pick,f}});days.push(row)}
  return days;
}
function nutritionPage(el){
  const n=nut(),pl=nutPlan(),k=n.markers||{},menu=weekMenu(),sel=(arr,v)=>arr.map(([a,b])=>`<option value="${a}" ${String(a)===String(v)?'selected':''}>${b}</option>`).join('');
  el.innerHTML=`<div class="head"><h1>${ic('leaf')} Nutrition personnalisée</h1><div class="acts"><button class="ghost" data-x="newweek">${ic('sparkles')} Nouvelle semaine</button><button class="ghost" data-x="sharemenu">${ic('share')} Partager le menu</button></div></div>
  <div class="g2"><div class="card"><h2>Mon profil</h2><form id="nf" class="fg"><div><label>Sexe</label><select name="sexe"><option value="F" ${n.sexe==='F'?'selected':''}>Femme</option><option value="H" ${n.sexe==='H'?'selected':''}>Homme</option></select></div><div><label>Âge</label><input name="age" type="number" min="10" max="110" value="${esc(n.age)}"></div>
   <div><label>Poids (kg)</label><input name="poids" type="number" step="any" min="20" value="${esc(n.poids)}"></div><div><label>Taille (cm)</label><input name="taille" type="number" min="100" max="230" value="${esc(n.taille)}"></div>
   <div><label>Activité physique</label><select name="activite">${sel(NACT,n.activite)}</select></div><div><label>Objectif</label><select name="objectif">${sel(NOBJ,n.objectif)}</select></div>
   <div><label>Régime</label><select name="regime">${sel(NREG,n.regime)}</select></div><div><label>Allergies / aliments à éviter</label><input name="allergies" value="${esc(n.allergies||'')}" placeholder="arachide, lait, œuf…"></div>
   <div class="full"><button>Enregistrer et recalculer</button></div></form></div>
  <div class="card"><h2>${ic('target')} Mes besoins quotidiens</h2><div class="tiles"><div class="tile a1"><small>Énergie</small><b>${pl.kcal} kcal</b></div><div class="tile a4"><small>Protéines</small><b>${pl.p} g</b></div><div class="tile a3"><small>Glucides · Lipides</small><b>${pl.c} g · ${pl.g} g</b></div></div>
   ${pl.msg?`<div class="al ok"><span class="ai">${ic('sparkles')}</span><div>${esc(pl.msg)}</div></div>`:note('Ajoutez vos pesées dans Santé : les apports s’ajustent automatiquement avec le temps.')}
   ${nutAdvice().map(x=>`<div class="al"><span class="ai">${ic('leaf')}</span><div>${t(x)}</div></div>`).join('')}</div></div>
  <div class="card"><h2>${ic('shield')} Mes marqueurs génétiques</h2><div class="fg">${Object.entries(MARK).map(([id,m])=>`<div><label>${t(m.l)} <span class="mute">(${m.rs})</span></label><select data-mk="${id}">${sel(m.o.map(([a,b])=>[a,t(b)]),k[id]||'')}</select></div>`).join('')}</div>
   <p class="acts" style="margin:12px 0 0"><button class="ghost" data-x="dnafile">${ic('download')} Importer un fichier ADN brut (23andMe, Ancestry…)</button><input type="file" id="dnaf" accept=".txt,.csv,.tsv" hidden></p>
   ${note('Le fichier est lu localement dans votre navigateur ; seuls ces 5 marqueurs sont conservés, sur cet appareil. Ils ne sont jamais transmis, y compris à l’IA. Interprétation simplifiée à but informatif : elle ne remplace ni un conseil médical ni celui d’un diététicien.')}</div>
  <div class="card tw"><h2>${ic('calendar')} Menu de la semaine</h2><table><thead><tr><th></th>${MEALS.map(([,l])=>`<th>${t(l)}</th>`).join('')}</tr></thead><tbody>${menu.map((row,j)=>`<tr><td><b>${t(JOURS[j])}</b></td>${row.map((c,mi)=>c?`<td style="min-width:150px">${t(c.d[0])}<div class="mute small">×${f1(c.f)} · ≈ ${Math.round(c.d[1]*c.f)} kcal <button class="ghost" style="padding:1px 6px" data-x="dislike" data-i="${DISHES.indexOf(c.d)}" title="${t('Je n’aime pas')}">👎</button></div></td>`:'<td>—</td>').join('')}</tr>`).join('')}</tbody></table>
   ${note('Les quantités (×) ajustent chaque plat à vos besoins. « 👎 » retire un plat de vos prochains menus : les suggestions s’affinent avec vos retours.')}</div>`;
}
IC.calendar='<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>';
PAGES.nutrition=nutritionPage;
function menuText(){const m=weekMenu();return `LUMINA — ${t('Menu de la semaine')}\n`+m.map((r,j)=>`${t(JOURS[j])} : `+r.map(c=>c?t(c.d[0]):'—').join(' | ')).join('\n')}

/* =====================================================================
   Actions (délégation) et intégration au tableau de bord
   ===================================================================== */
document.addEventListener('click',async ev=>{
  const b=ev.target.closest('[data-x]');if(!b||!ME)return;const x=b.dataset.x;
  if(x==='aiproj'){const out=$('#aiout');out.textContent='…';
    const data=list('projets').filter(p=>p.statut==='En cours'||p.statut==='En pause').map(p=>({nom:p.nom,statut:p.statut,debut:p.debut,echeance:p.echeance,budget:p.budget,depense:p.depense,equipe:(typeof persText==='function'?persText(p):p.equipe),titulaire:p.titulaire,gestionnaire:p.gestionnaire,mensuel:p.mensuel,paiement:p.paiement,avancement:projRisk(p).pct,taches:(p.taches||'').split('\n').filter(Boolean),risque:projRisk(p).lvl,raisons:projRisk(p).reasons}));
    const r=await aiText('Tu es un chef de projet expérimenté. Analyse l’avancement de ces projets, détecte les risques de retard ou de dépassement, et propose pour chaque projet 2 ajustements concrets et priorisés.',`Date : ${ltoday()}. Devise : ${CURR}.\n${JSON.stringify(data)}`);out.textContent=r||''}
  else if(x==='shareproj')shareText(projSummaryText());
  else if(x==='sharemicro'){const i=list('micro').find(z=>z.id===b.dataset.id);if(i)shareText(microShareText(i))}
  else if(x==='dose'){logDose(b.dataset.m,b.dataset.h,b.dataset.s)}
  else if(x==='sharemed')shareText(medSummaryText());
  else if(x==='notif'){try{const p=await Notification.requestPermission();toast(p==='granted'?'✔ Rappels activés (application ouverte)':'⚠ Notifications refusées : les rappels s’afficheront dans l’application')}catch{toast('⚠ Notifications non prises en charge sur cet appareil')}}
  else if(x==='aidant'){DB.profile={...DB.profile,aidant:{nom:$('#ad-nom').value.trim(),tel:$('#ad-tel').value.trim()}};save();render();toast('✔ Enregistré')}
  else if(x==='aimood'){if(!confirm('Vos bilans de bien-être (humeur, sommeil, activité, notes) seront envoyés à l’API d’IA pour générer des conseils. Continuer ?'))return;const out=$('#aiout');out.textContent='…';
    const data=moodAnalysis().all.slice(0,21).map(({date,humeur,energie,stress,sommeil,activite,social,pensees,note})=>({date,humeur,energie,stress,sommeil,activite,social,pensees,note}));
    const r=await aiText(MOOD_SYS,JSON.stringify(data));out.textContent=r||''}
  else if(x==='newweek'){nut().seed=num(nut().seed)+1;save();render()}
  else if(x==='sharemenu')shareText(menuText());
  else if(x==='dislike'){const d=DISHES[+b.dataset.i];if(d){nut().dislikes=[...new Set([...(nut().dislikes||[]),d[0]])];save();render();toast('✔ Plat retiré de vos menus')}}
  else if(x==='dnafile')$('#dnaf').click();
});
document.addEventListener('change',async ev=>{
  const m=ev.target.dataset?.mk;if(m){nut().markers={...nut().markers,[m]:ev.target.value};save();render();return}
  if(ev.target.id==='dnaf'&&ev.target.files[0]){try{const M=parseDNA(await ev.target.files[0].text());const nb=Object.keys(M).length;if(!nb){toast('⚠ Aucun marqueur reconnu dans ce fichier');return}nut().markers={...nut().markers,...M};save();render();toast(`✔ ${nb} marqueur(s) importé(s)`)}catch{toast('Fichier invalide')}}
});
document.addEventListener('submit',ev=>{
  if(ev.target.id!=='nf')return;ev.preventDefault();const f=new FormData(ev.target),n=nut();
  ['sexe','age','poids','taille','activite','objectif','regime','allergies'].forEach(k=>n[k]=f.get(k));save();render();toast('✔ Profil nutritionnel enregistré');
});
function logDose(id,h,s){
  list('prises').push({id:uid(),med:id,date:ltoday(),heure:h,statut:s,at:new Date().toISOString()});
  if(s==='pris'){const m=list('traitements').find(x=>x.id===id);if(m&&m.stock!==''&&m.stock!=null&&num(m.stock)>0)m.stock=Math.max(0,num(m.stock)-(num(m.dose)||1))}
  save();render();
}
function extraAlerts(){
  const A=[];
  dosesToday().filter(x=>x.state==='late').forEach(x=>A.push({w:0,l:'bad',i:'pill',s:0,h:`<b>${esc(x.m.nom)}</b> — ${tp('prise de {h} non confirmée',{h:x.h})} <span class="mute">${esc(x.m.patient||'')}</span>`}));
  interactions().forEach(x=>A.push({w:x.lvl==='bad'?0:1,l:x.lvl==='bad'?'bad':'warn',i:'pill',s:0,h:`<b>${esc(x.a)} + ${esc(x.b)}</b> — ${t(x.msg)}`}));
  lowStock().forEach(x=>A.push({w:2,l:'warn',i:'pill',s:0,h:`<b>${esc(x.m.nom)}</b> — ${tp('Stock pour environ {d} jour(s) : pensez au renouvellement.',{d:x.days})}`}));
  const mo=moodAnalysis();if(mo.lvl==='crisis'||mo.lvl==='alert')A.push({w:0,l:'bad',i:'heart',s:0,h:`<b>${t('Bien-être mental')}</b> — ${t(mo.S[0]?mo.S[0].m.includes('{')?mo.S[0].m:mo.S[0].m:'Alerte')} <a href="#" data-go="humeur">${t('Voir')}</a>`});
  else if(mo.lvl==='watch')A.push({w:2,l:'warn',i:'heart',s:0,h:`<b>${t('Bien-être mental')}</b> — ${t(mo.S[0].m.includes('{')?mo.S[0].m:mo.S[0].m)} <a href="#" data-go="humeur">${t('Voir')}</a>`});
  list('projets').filter(p=>p.statut==='En cours').map(p=>({p,r:projRisk(p)})).filter(x=>x.r.lvl==='bad').forEach(({p,r})=>A.push({w:1,l:'bad',i:'rocket',s:0,h:`<b>${esc(p.nom)}</b> — ${esc(r.reasons[0]||'')}`}));
  return A;
}
function extraTodo(){
  const T=[],ds=dosesToday(),d=ltoday();
  if(ds.length){const ok=ds.filter(x=>x.log).length;T.push({i:'pill',t:'Traitements du jour',s:tp('{a} / {b} prises confirmées',{a:ok,b:ds.length}),ok:ok===ds.length,at:'data-go="traitements"',b:ok===ds.length?'Fait':'Voir'})}
  const has=list('humeur').some(i=>i.date===d);T.push({i:'smile',t:'Bilan du jour (humeur)',s:has?'Bilan enregistré':'1 minute pour faire le point',ok:has,at:has?'data-go="humeur"':'data-new="humeur"',b:has?'Fait':'Écrire'});
  return T;
}
/* ---------- Menu : nouvelles rubriques ---------- */
{const i=NAV.findIndex(n=>n[0]==='investissements');NAV.splice(i+1,0,['micro','hand','Micro-investissement local']);
 const j=NAV.findIndex(n=>n[0]==='sante');NAV.splice(j+1,0,['traitements','pill','Traitements'],['nutrition','leaf','Nutrition personnalisée'],['humeur','smile','Bien-être mental']);}
