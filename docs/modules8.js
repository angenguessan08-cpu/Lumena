'use strict';
/* =====================================================================
   LUMINA v8
   1. Pratique religieuse (dîme, aumônes, culte) : paramètre obligatoire, règles propres à chaque utilisateur
   2. Pôle « Religion / Culte » et ligne « Assurances » (charges fixes obligatoires)
   3. Barre latérale regroupée (Budget, Projets, Catégories, Épargne & Investissements) avec onglets
   4. Projets : pastilles de statut en couleur, montant engagé, taux d'avancement / de perte
   5. Zoom + / − global
   ===================================================================== */
const RELIG='Religion / Culte';

const FREQ={'Chaque mois':1,'Chaque quinzaine':26/12,'Chaque semaine':52/12,'À chaque revenu':1,'Occasionnelle':0};
const religionOn=()=>{const p=DB.profile||{};return p.religion?p.religion!=='Non':!(dimeMode()==='never'&&p.aumoneOn==='Non')};
/* v9 : le pôle Religion / Culte est MASQUÉ PAR DÉFAUT. Il n'apparaît que si la pratique religieuse est activée dans les
   paramètres, ou si une écriture contient un mot-clé religieux (dîme, aumône, offrande, culte, église, mosquée, zakat, paroisse,
   quête, œuvre) — voir religionVisible() dans modules9.js. */
const religionShown=()=>typeof religionVisible==='function'?religionVisible():religionOn();
const catHidden=c=>c.groupe===RELIG&&!religionShown();

/* ---------- 1. Paramètre « Pratique religieuse » ---------- */
function religionBlock(p,req=true){return ''}
function _religionBlockOld(p,req=true){
  const r=p.religion||'',show=r==='Oui',mode=p.dimeMode||(p.dimeAuto==='Non'?'never':'ask'),m=mode==='never'?'ask':mode;
  return `<div class="relblk full"><div><label>Pratique religieuse (dîme, aumônes, dépenses de culte) *</label><select name="religion" ${req?'required':''}><option value="">— choisir —</option><option value="Oui" ${r==='Oui'?'selected':''}>Oui, je pratique</option><option value="Non" ${r==='Non'?'selected':''}>Non, ne s’applique pas à moi</option></select></div>
   <div class="relopt fg" style="display:${show?'grid':'none'};margin-top:8px">
    <div><label>Taux de la dîme (% des revenus)</label><input name="dimeTaux" type="number" min="0" max="100" step="any" value="${esc(p.dimeTaux||10)}"></div>
    <div><label>Prélèvement de la dîme</label><select name="dimeMode"><option value="ask" ${m==='ask'?'selected':''}>Me demander à chaque revenu</option><option value="always" ${m==='always'?'selected':''}>Proposée automatiquement (décochable)</option></select></div>
    <div><label>Aumônes : montant (FCFA)</label><input name="aumoneMontant" type="number" min="0" step="any" value="${esc(p.aumoneMontant??'')}"></div>
    <div><label>Aumônes : fréquence</label><select name="aumoneFreq">${Object.keys(FREQ).map(f=>`<option ${f===(p.aumoneFreq||'Chaque mois')?'selected':''}>${f}</option>`).join('')}</select></div>
    <div><label>Autres dépenses de culte par mois (offrandes, œuvres…)</label><input name="culteMontant" type="number" min="0" step="any" value="${esc(p.culteMontant??'')}"></div>
    <p class="mute small full" style="margin:0">La dîme est calculée sur vos revenus à chaque saisie, avant le reste du budget ; ni le taux ni le montant ne sont figés.</p></div></div>`;
}
function religionRead(g){
  if(g('religion')!=='Oui')return{religion:'Non',dimeMode:'never',dimeAuto:'Non',aumoneOn:'Non',aumoneMontant:0,culteMontant:0};
  return{religion:'Oui',dimeMode:g('dimeMode')||'ask',dimeAuto:'Oui',dimeTaux:num(g('dimeTaux'))||10,aumoneOn:'Oui',aumoneMontant:num(g('aumoneMontant')),aumoneFreq:g('aumoneFreq')||'Chaque mois',culteMontant:num(g('culteMontant'))};
}
document.addEventListener('change',ev=>{const s=ev.target;if(s.name!=='religion')return;const o=s.closest('.relblk')?.querySelector('.relopt');if(o)o.style.display=s.value==='Oui'?'grid':'none'});
/* catégories de base : pôle Religion / Culte (si pratique) et Assurances */
function baseCats(prefs,lang){
  const now=new Date().toISOString(),mk=(nom,type,groupe,budget,contenu)=>({id:uid(),created:now,nom,type,groupe,budget,contenu});
  const A=[mk('Épargne Études Enfants','Épargne','Épargne',0,'Contrats d’assurance études / éducation des enfants (NSIA, SANLAM…) : épargne, pas une charge de Besoins')];
  if(prefs&&prefs.religion==='Oui')A.push(mk('Dîmes','Dépense Fixe',RELIG,0,`Dîme = ${prefs.dimeTaux||10} % des revenus (calcul automatique)`),mk('Aumônes','Dépense Fixe',RELIG,Math.round(num(prefs.aumoneMontant)*(FREQ[prefs.aumoneFreq||'Chaque mois']||0)),'Aumônes et dons'),mk('Culte & œuvres','Dépense Variable',RELIG,num(prefs.culteMontant),'Offrandes, œuvres et autres dépenses de culte'));
  return A;
}
function applyReligion(){
  const p=DB.profile||{},C=list('categories');
  if(p.religion==='Oui'){
    baseCats(p).forEach(c=>{if(c.groupe!==RELIG)return;let x=C.find(k=>k.nom===c.nom);if(!x){C.push(c);x=c}x.groupe=RELIG;
      if(c.nom==='Aumônes')x.budget=Math.round(num(p.aumoneMontant)*(FREQ[p.aumoneFreq||'Chaque mois']||0));
      if(c.nom==='Culte & œuvres')x.budget=num(p.culteMontant)})
  }else if(p.religion==='Non'){C.filter(c=>c.groupe===RELIG).forEach(c=>{if(!list('finances').some(i=>i.cat===c.nom))c.budget=0})}
}
/* migration unique : groupes, assurances */
function migrate8(){
  if(!ME||!DB||DB.mig8||!list('categories').length)return;
  const C=list('categories');
  C.forEach(c=>{if(c.nom==='Dîmes'||c.nom==='Aumônes')c.groupe=RELIG});
  /* v9 : les contrats d'assurance (NSIA, SANLAM, études…) relèvent de « Épargne Études Enfants » (pôle Épargne) — voir applyTaxonomy() (modules9.js) */
  let a=C.find(c=>c.nom==='Épargne Études Enfants'||c.nom==='Assurances');if(!a){a=baseCats({})[0];C.push(a)}
  list('finances').forEach(i=>{if(i.cat!=='Assurances'&&i.cat!=='Épargne Études Enfants'&&/^assurance/i.test(i.libelle||'')&&i.type!=='Revenu'){i.cat='Assurances'}});
  if(DB.profile?.religion==='Oui')applyReligion();
  DB.mig8=1;save();
}
{const b0=boot;boot=function(){b0.apply(this,arguments);migrate8()}}
/* invite obligatoire pour les comptes existants qui n'ont pas encore répondu */
function showReligionModal(){
  if(document.getElementById('relm'))return;
  const d=document.createElement('div');d.id='relm';d.className='onb';
  d.innerHTML=`<form class="card onbc" style="max-width:560px"><h2>${ic('settings')} Une question avant de continuer</h2><p class="mute">La dîme, les aumônes et les dépenses de culte dépendent de chaque personne. Indiquez ce qui s’applique à vous ; vous pourrez le modifier dans Réglages.</p>${religionBlock(DB.profile||{})}<p class="acts" style="margin-top:14px"><button>Enregistrer</button></p></form>`;
  document.body.appendChild(d);
  d.querySelector('form').onsubmit=ev=>{ev.preventDefault();const f=ev.target;DB.profile={...DB.profile,...religionRead(n=>f.elements[n]?.value)};applyReligion();save();d.remove();render();toast('✔ Paramètre enregistré')};
}
{const r0=render;render=function(){r0.apply(this,arguments);if(false&&ME&&DB?.profile&&!DB.profile.religion&&!(typeof needOnboard==='function'&&needOnboard()))showReligionModal()}}
{const base=PAGES.reglages;PAGES.reglages=el=>{base(el);const c=document.createElement('div');c.className='card';
  c.innerHTML=`<h2>🙏 Pratique religieuse</h2><form id="rf" class="fg">${religionBlock(DB.profile||{},true)}<p class="full" style="margin:0"><button>Enregistrer</button></p></form>`;
  /* v13 : plus de réglage religieux */
  c.querySelector('#rf').onsubmit=ev=>{ev.preventDefault();const f=ev.target;DB.profile={...DB.profile,...religionRead(n=>f.elements[n]?.value)};applyReligion();save();render();toast('✔ Règles enregistrées')}}}

/* ---------- 3. BARRE LATÉRALE REGROUPÉE ---------- */
const TABL={budget:'Budget',budgetan:'Budget annuel',budgetia:'Budget cible & conseils',projets:'Projets',bilanproj:'Bilan des projets',categories:'Catégories',recapcat:'Récap par catégorie',objectifs:'Objectifs d’épargne',plan15:'Plan financier',epargne:'Épargne & Bourse',investissements:'Investissements',bourse:'Bourse BRVM',micro:'Micro-investissement local'};
const NAVG=[{label:'Budget',m:['budget','budgetan','budgetia']},{label:'Projets',m:['projets','bilanproj']},{label:'Catégories',m:['categories','recapcat']},{label:'Épargne & Investissements',m:['objectifs','plan15','epargne','investissements','bourse','micro']}];
NAVG.forEach(g=>{const n=NAV.find(x=>x[0]===g.m[0]);if(n)n[2]=g.label});
const grpOfView=v=>NAVG.find(g=>g.m.includes(v));
const navHide=k=>{const g=grpOfView(k);return !!g&&g.m[0]!==k};
{const r0=render;render=function(){r0.apply(this,arguments);
  const g=grpOfView(view);if(!g)return;
  document.querySelector(`#nav a[data-go="${g.m[0]}"]`)?.classList.add('on');
  const main=document.getElementById('main');
  main.insertAdjacentHTML('afterbegin',`<div class="tabs" role="tablist">${g.m.filter(k=>NAV.some(n=>n[0]===k)).map(k=>`<a data-go="${k}" role="tab" class="${k===view?'on':''}">${esc(TABL[k]||k)}</a>`).join('')}</div>`);
}}

/* ---------- 4. PROJETS : statuts en couleur, montant engagé, avancement ---------- */
const SCOL={'En cours':['#10b981'],'Terminé':['#059669'],'Idée':['#6366f1'],'En pause':['#f59e0b'],[SUIVI]:['#6366f1'],[FAIL]:['#ef4444','#f59e0b']};
function statutPill(s){const c=SCOL[s]||['#6366f1','#6366f1'];return `<span class="sp" style="--c:${c[0]};--c2:${c[1]||c[0]}"><i></i>${esc(s||'Non évalué')}</span>`}
const taskPct0=taskPct;
function projMetrics(p){
  const s=pStats(p,String(new Date().getFullYear())),hasTasks=(p.taches||'').split('\n').some(x=>x.trim()),tp=taskPct0(p);
  const engaged=p.lien?s.cumAll+s.eng:(num(p.budget)||num(p.depense)),injected=p.lien?s.cumAll:num(p.depense);
  let pct=tp,src='tâches';
  if(!hasTasks){if(num(p.prixTotal)){pct=Math.min(100,injected/num(p.prixTotal)*100);src='prix total'}else if(engaged>0){pct=Math.min(100,injected/engaged*100);src='versements'}else pct=0}
  return{engaged,injected,pct:Math.round(pct),src};
}
/* l'avancement d'un projet sans tâches se déduit des versements (radar, cartes) */
taskPct=function(i){if(!(i.taches||'').split('\n').some(x=>x.trim())&&(i.lien||num(i.prixTotal))&&i.statut!==FAIL)return projMetrics(i).pct;return taskPct0(i)};
{const pc=projectCard;projectCard=function(i){
  const M=projMetrics(i),fail=i.statut===FAIL,old=badge(i.statut);
  let h=pc(i).replace(/<div class="s">Avancement \d+ %<\/div><div class="bar"><i style="width:\d+%"><\/i><\/div>/,'');if(old)h=h.replace(old,statutPill(i.statut));if(i.statut!=='En cours'&&i.statut!=='En pause')h=h.replace(/<div class="s" style="margin-top:2px">.*?<\/div>/,'');
  const blk=fail?`<div class="s"><span class="bad">Perte : ${fmt(M.injected)} injectés, non récupérés</span> · taux de perte 100 %</div>`:`<div class="s"><b>Montant total engagé : ${fmt(M.engaged)}</b> · injecté ${fmt(M.injected)}</div><div class="s">Taux d’avancement : <b>${M.pct} %</b> <span class="mute">(${M.src})</span></div><div class="bar"><i style="width:${M.pct}%"></i></div>`;
  return h.replace('<div class="s">Échéance',blk+'<div class="s">Échéance');
};MODULES.projets.card=projectCard}
{const cs=MODULES.projets.cols,st=cs.find(c=>c.k==='statut');st.f=i=>statutPill(i.statut);
 const j=cs.findIndex(c=>c.k==='mensuel');cs.splice(j<0?cs.length:j,0,{l:'Engagé',cls:'num',nosort:1,f:i=>fmt(projMetrics(i).engaged)},{l:'Avancement',cls:'num',nosort:1,f:i=>i.statut===FAIL?'<span class="bad">perdu</span>':projMetrics(i).pct+' %'});
 const k=cs.findIndex(c=>c.l==='Avancement'&&c.nosort&&!c.cls);if(k>=0)cs.splice(k,1)}

/* ---------- 5. ZOOM + / − ---------- */
{
  const top=document.getElementById('top'),theme=document.getElementById('theme');
  const get=()=>{try{return +localStorage.getItem('lumina.zoom')||1}catch{return 1}};
  const set=z=>{z=Math.max(.8,Math.min(1.6,Math.round(z*10)/10));try{localStorage.setItem('lumina.zoom',z)}catch{}document.documentElement.style.zoom=z===1?'':z;const l=document.getElementById('zlvl');if(l)l.textContent=Math.round(z*100)+' %'};
  if(top&&theme){
    const w=document.createElement('span');w.id='zoomctl';w.className='zoomctl';
    w.innerHTML='<button class="ghost icon" id="zout" aria-label="Réduire la taille" title="Réduire la taille du texte et de la page">A−</button><button class="ghost" id="zlvl" aria-label="Taille normale" title="Revenir à 100 %">100 %</button><button class="ghost icon" id="zin" aria-label="Agrandir" title="Agrandir la taille du texte et de la page">A+</button>';
    theme.before(w);
    document.getElementById('zout').onclick=()=>set(get()-.1);document.getElementById('zin').onclick=()=>set(get()+.1);document.getElementById('zlvl').onclick=()=>set(1);
    set(get());
  }
}
