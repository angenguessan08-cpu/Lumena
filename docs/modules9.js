'use strict';
/* =====================================================================
   LUMINA v9
   1. Historique des modifications : annulation (Ctrl+Z, bouton, toast) et restauration par module
   2. Taxonomie comptable : ordre des flux, Besoins / Envies, assurances = Épargne Études Enfants, fonds perdus,
      Épargne / Dettes / Bourse dissociés, nettoyage automatique de « Autres » (migration annulable)
   3. Budgets trimestriels récurrents (Voyage, Supplément Enfants)
   4. Fonds collectif : calcul du reste et du rapprochement corrigé (« Complet (0 FCFA restant) »)
   5. Religion / Culte masqué par défaut (affiché si activé ou si une écriture est religieuse)
   6. Filtre d'année maître 2020 → N+15 (Tableau de bord, Budget, Synthèse, Comparaison, Reporting) + alertes futures indexées
   7. Coffre-fort refondu
   8. Conseils aérés, guides de lecture, recommandations actionnables, synthèse des flux
   9. Boutons « Enregistrer » explicites
   ===================================================================== */
Object.assign(IC,{
 undo:'<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
 save:'<path d="M5 4h11l3 3v13H5z"/><path d="M8 4v5h7V4M8 20v-6h8v6"/>',
 history:'<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>'
});
const pad2=n=>String(n).padStart(2,'0');
const sumI=a=>a.reduce((x,i)=>x+num(i.montant),0);
const clone9=o=>o==null?o:JSON.parse(JSON.stringify(o));
let DATA_REV=0;                                  /* incrémenté à chaque enregistrement : invalide les mémos */
const grpOfCat=n=>catOf(n)?.groupe||'';

/* =====================================================================
   5. RELIGION / CULTE — masqué par défaut
   ===================================================================== */
const RELIG_KW=/\b(dimes?|aumones?|offrandes?|cultes?|eglises?|mosquees?|zakat|paroisses?|quetes?|oeuvres?|œuvres?)\b/;
const relText=i=>nrm([i.libelle,i.note,i.cat].join(' '));
let _relMemo={rev:-1,v:false,p:''};
function religionVisible(){return false}   /* v12 : uniquement si l'utilisateur l'active lui-même dans les Réglages */

/* =====================================================================
   2. TAXONOMIE COMPTABLE
   Flux : 1) Revenus  2) Dépenses (fixes, variables, pertes = fonds perdus, dettes)  3) Épargne & investissements
   ===================================================================== */
const CORE_CATS=['Fonds perdus / Frais bancaires','Épargne Études Enfants'];
const CAT_DEFS={
 'Fonds perdus / Frais bancaires':['Dépense Fixe','Fonds perdus',0,'Retenues bancaires, frais de tenue de compte, agios : argent perdu sans contrepartie (ni dépense courante, ni épargne).'],
 'Pertes & Amendes':['Dépense Occasionnelle','Fonds perdus',0,'Amendes, pénalités, vols et pertes diverses.'],
 'Épargne Études Enfants':['Épargne','Épargne',0,'Contrats d’assurance études / éducation des enfants (NSIA, SANLAM…) : de l’épargne, pas une charge de Besoins.'],
 'Investissement bourse':['Épargne','Investissement Bourse',0,'Capital investi en bourse (BRVM) et en actifs financiers.'],
 'Épargne':['Épargne','Épargne',0,'Précaution et projets.'],
 'Maison & Équipement':['Dépense Occasionnelle','Besoins',0,'Linge de maison, ustensiles, petit équipement du foyer.'],
 'Cadeaux & Fêtes':['Dépense Occasionnelle','Envies',0,'Cadeaux, anniversaires, fêtes, invitations.'],
 'Supplément Enfants':['Dépense Occasionnelle','Besoins',0,'Rentrée, activités et frais trimestriels des enfants (budget trimestriel).'],
 'Dons et contributions':['Dépense Variable','Envies',0,'Dons, offrandes, cotisations et contributions de toute nature (catégorie neutre).'],
 'Culte & œuvres':['Dépense Variable',RELIG,0,'Offrandes, œuvres et autres dépenses de culte.'],
 'Dîmes':['Dépense Fixe',RELIG,0,'Dîme = pourcentage des revenus (calcul automatique).'],
 'Aumônes':['Dépense Fixe',RELIG,0,'Aumônes et dons.'],
 'Voyages':['Dépense Occasionnelle','Envies',0,'Voyages et vacances (budget trimestriel possible).'],
 'Personnel':['Dépense Occasionnelle','Envies',0,'Vêtements, soins, équipement personnel, décoration.'],
 'Famille':['Dépense Variable','Besoins',0,'Soutien familial, cotisations, obligations.'],
 'Véhicule':['Dépense Variable','Besoins',0,'Moto / voiture : carburant, entretien, réparations.'],
 'Santé':['Dépense Variable','Besoins',0,'Consultations, médicaments, lunettes.'],
 'Communication':['Dépense Fixe','Besoins',0,'Téléphone et internet.'],
 'Imprévus':['Dépense Occasionnelle','Besoins',0,'Imprévus et réparations urgentes.'],
 'Autres revenus':['Revenu','Revenus',0,'Primes, activités annexes.']};
/* catégories connues → groupe imposé lors de la migration v9 (ensuite l'utilisateur reste libre de ses choix) */
const GROUP_BY_NAME={'Salaire':'Revenus','Primes & indemnités':'Revenus','Dividendes':'Revenus','Autres revenus':'Revenus',
 'Logement':'Besoins','Alimentation':'Besoins','Transport':'Besoins','Santé':'Besoins','Éducation':'Besoins','Communication':'Besoins','Enfants':'Besoins','Famille':'Besoins','Véhicule':'Besoins','Imprévus':'Besoins','Maison & Équipement':'Besoins','Supplément Enfants':'Besoins',
 'Loisirs':'Envies','Personnel':'Envies','Voyages':'Envies','Cadeaux & Fêtes':'Envies',
 'Remboursements prêt':'Dettes & Remboursements','Projets':'Dettes & Remboursements',
 'Fonds perdus / Frais bancaires':'Fonds perdus','Pertes & Amendes':'Fonds perdus',
 'Dîmes':RELIG,'Aumônes':RELIG,'Culte & œuvres':RELIG,
 'Épargne':'Épargne','Épargne logement (PEL)':'Épargne','Épargne Études Enfants':'Épargne','Investissement bourse':'Investissement Bourse'};
const TYPE_BY_NAME={'Épargne Études Enfants':'Épargne','Investissement bourse':'Épargne','Épargne':'Épargne','Fonds perdus / Frais bancaires':'Dépense Fixe'};
const RENAMES=[['Retenues Bancaire','Fonds perdus / Frais bancaires'],['Retenues bancaires','Fonds perdus / Frais bancaires'],['Retenues Bancaires','Fonds perdus / Frais bancaires'],['Frais bancaires','Fonds perdus / Frais bancaires'],['Assurances','Épargne Études Enfants']];
/* Règles lexicales : libellé (sans accents, minuscules) → catégorie exacte. Le premier motif qui correspond l'emporte. */
const AUTRES_RULES=[
 [/\b(dimes?|aumones?|eglise|messe|offrande|culte|paroisse|mosquee|zakat|quete|oeuvre|pretre|pasteur|dons?)\b/,'Dons et contributions'],
 [/\b(agios?|frais (de )?(tenue|compte|bancaires?)|retenues?|commission bancaire|tenue de compte)\b/,'Fonds perdus / Frais bancaires'],
 [/\b(amendes?|penalites?|majoration|pertes?|vol)\b/,'Pertes & Amendes'],
 [/(medicament|pharmacie|consultation|clinique|hopital|dentiste|ordonnance|lunette|monture|analyses?|soins?)/,'Santé'],
 [/(belle[- ]?mere|beau[- ]?pere|maman|papa|parents?|famille|cotisation|frere|soeur|oncle|tante|neveu|niece|deces|funerailles|obseques)/,'Famille'],
 [/(moto|vehicule|voiture|pneu|vidange|garage|carburant|essence|mecanicien)/,'Véhicule'],
 [/(abonnement|forfait|internet|recharge|wifi)/,'Communication'],
 [/(draps|rideau|meuble|vaisselle|matelas|ustensile|seau|natte|electromenager|ventilateur|frigo)/,'Maison & Équipement'],
 [/(cadeau|anniversaire|gateau|fete|noel|mariage|bapteme|invitation)/,'Cadeaux & Fêtes'],
 [/(vacances|voyage|billet|hotel|sejour|excursion)/,'Voyages'],
 [/(portable|telephone|ecouteur|\btab\b|tablette|ordinateur|laptop|chargeur|deco|vetement|habit|chaussure|coiffure|salon|parfum)/,'Personnel'],
 [/(imprevu|panne|reparation|urgence|depannage)/,'Imprévus']];

function ensureCat(nom){
  const C=list('categories');let c=C.find(x=>x.nom===nom);if(c)return c;
  const d=CAT_DEFS[nom]||['Dépense Variable','Besoins',0,''];
  c={id:uid(),created:new Date().toISOString(),nom,type:d[0],groupe:d[1],budget:d[2],contenu:d[3]};C.push(c);return c;
}
/* Renomme / fusionne une catégorie partout : catégories, écritures, objectifs, budgets annuels, sélection du récap */
function renameCat(a,b){
  const C=list('categories'),ca=C.find(c=>c.nom===a),cb=C.find(c=>c.nom===b);
  if(ca&&cb){cb.budget=num(cb.budget)+num(ca.budget);DB.categories=C.filter(c=>c!==ca)}else if(ca)ca.nom=b;
  list('finances').forEach(i=>{if(i.cat===a)i.cat=b});
  list('objectifs').forEach(o=>{if(o.cat===a)o.cat=b});
  Object.values(DB.budgets||{}).forEach(B=>{if(B&&B[a]){B[b]=B[b]?B[b].map((v,m)=>num(v)+num(B[a][m])):B[a];delete B[a]}});
  if(DB.recapcat===a)DB.recapcat=b;
}
function inferGroup(c){
  const n=nrm(c.nom);
  if(c.type==='Revenu')return 'Revenus';
  if(c.type==='Épargne'||c.type==='Investissement')return /bourse|brvm|action|titre|invest/.test(n)?'Investissement Bourse':'Épargne';
  if(/pret|dette|credit|emprunt|mensualite|remboursement|projet/.test(n))return 'Dettes & Remboursements';
  if(/frais bancaire|agios|retenue|amende|penalite|perte/.test(n))return 'Fonds perdus';
  if(RELIG_KW.test(n))return 'Envies';
  return c.groupe==='Envies'?'Envies':'Besoins';
}
function needsTaxonomy(){
  if(DB.mig9Off)return false;
  const C=list('categories'),F=list('finances');
  if(!DB.mig9&&(C.length||F.length))return true;
  if(C.some(c=>!GROUPES.includes(c.groupe)))return true;
  if(RENAMES.some(([a])=>C.some(c=>c.nom===a)||F.some(i=>i.cat===a)))return true;
  if(F.some(i=>i.cat==='Autres'||i.cat==='Autre')||C.some(c=>c.nom==='Autres'||c.nom==='Autre'))return true;
  if(C.length&&CORE_CATS.some(n=>!C.some(c=>c.nom===n)))return true;
  return false;
}
/* Réaffecte les écritures « Autres » vers des catégories exactes ; « Autres » est supprimée et son budget reporté sur « Imprévus » */
function cleanAutres(F,rep,rec){
  F.filter(i=>i.cat==='Autres'||i.cat==='Autre').forEach(i=>{
    rec(i);
    const txt=nrm([i.libelle,i.note].join(' '));let cat=null;
    if(kind(i)==='rev')cat='Autres revenus';
    else if(kind(i)==='epa'){cat='Épargne';
      if(AUTRES_RULES.some(([re])=>re.test(txt)))rep.verifier.push(`${i.date||'—'} · ${i.libelle||'(sans libellé)'} · ${fmt(i.montant)} saisi en « Épargne » mais le libellé évoque une dépense : type conservé, à vérifier`)}
    else{
      for(const [re,c] of AUTRES_RULES)if(re.test(txt)){cat=c;break}
      if(!cat){cat=i.type==='Dépense Occasionnelle'?'Imprévus':'Personnel';
        rep.verifier.push(`${i.date||'—'} · ${i.libelle||'(sans libellé)'} · ${fmt(i.montant)} → ${cat}`);
        i.note=(i.note?i.note+' · ':'')+'Reclassé automatiquement depuis « Autres » (libellé générique : à vérifier)'}
    }
    ensureCat(cat);i.catAvant=i.cat;i.cat=cat;rep.autres[cat]=(rep.autres[cat]||0)+1;
  });
  ['Autres','Autre'].forEach(n=>{if(list('categories').some(c=>c.nom===n)&&!list('finances').some(i=>i.cat===n)){ensureCat('Imprévus');renameCat(n,'Imprévus');rep.renamed.push(n+' (supprimée, budget reporté) → Imprévus')}});
}
/* Migration idempotente. 1re exécution : groupes imposés aux catégories connues ; ensuite seules les anomalies sont corrigées. */
function applyTaxonomy(){
  if(!ME||!DB||!needsTaxonomy())return false;
  const F=list('finances'),first=!DB.mig9;
  let snap=null;if(!DB.mig9Undo&&(list('categories').length||F.length))snap={cats:clone9(DB.categories||[]),budgets:clone9(DB.budgets||{}),fin:{},obj:{}};
  const rec=i=>{if(snap&&!snap.fin[i.id])snap.fin[i.id]={cat:i.cat,type:i.type,note:i.note}};
  const rep={at:new Date().toISOString(),renamed:[],regrouped:[],autres:{},verifier:[],assurances:0};
  /* 1. renommages (Assurances → Épargne Études Enfants ; Retenues bancaires → Fonds perdus / Frais bancaires) */
  RENAMES.forEach(([a,b])=>{
    if(!(list('categories').some(c=>c.nom===a)||F.some(i=>i.cat===a)))return;
    const moved=F.filter(i=>i.cat===a);moved.forEach(rec);list('objectifs').forEach(o=>{if(o.cat===a&&snap)snap.obj[o.id]=o.cat});
    renameCat(a,b);rep.renamed.push(a+' → '+b);
    if(b==='Épargne Études Enfants')moved.forEach(i=>{i.catAvant=a;if(kind(i)==='dep'){i.type='Épargne';rep.assurances++}});
    else moved.forEach(i=>{i.catAvant=a});
  });
  /* 2. contrats NSIA / SANLAM saisis dans une autre catégorie */
  if(first)F.forEach(i=>{const x=nrm(i.libelle||'');if(i.cat!=='Épargne Études Enfants'&&kind(i)==='dep'&&/\b(nsia|sanlam)\b/.test(x)&&!/(sante|maladie|auto|vehicule|moto|habitation)/.test(x)){rec(i);i.catAvant=i.cat;i.cat='Épargne Études Enfants';i.type='Épargne';rep.assurances++}});
  /* 3. catégories de base + groupes / types */
  CORE_CATS.forEach(ensureCat);
  list('categories').forEach(c=>{
    const known=GROUP_BY_NAME[c.nom];let g=c.groupe;
    if(first&&known)g=known;else if(!GROUPES.includes(g))g=known||inferGroup(c);
    if(g!==c.groupe){rep.regrouped.push(`${c.nom} : ${c.groupe||'—'} → ${g}`);c.groupe=g}
    if(first&&TYPE_BY_NAME[c.nom]&&c.type!==TYPE_BY_NAME[c.nom])c.type=TYPE_BY_NAME[c.nom];
  });
  /* 4. nettoyage de « Autres » */
  cleanAutres(F,rep,rec);
  DB.mig9=1;DB.mig9Report=rep;if(snap)DB.mig9Undo=snap;
  return true;
}
function rollbackTaxonomy(){
  const s=DB.mig9Undo;if(!s){toast('Aucune sauvegarde de migration à restaurer.');return}
  if(!confirm('Restaurer l’ancienne classification (catégories, groupes, « Autres », assurances) ? Les écritures saisies depuis restent, mais reprennent leur ancienne catégorie si elles en avaient une.'))return;
  DB.categories=clone9(s.cats);DB.budgets=clone9(s.budgets);
  list('finances').forEach(i=>{const o=s.fin[i.id];if(o){i.cat=o.cat;i.type=o.type;if(o.note===undefined)delete i.note;else i.note=o.note;delete i.catAvant}});
  list('objectifs').forEach(o=>{if(s.obj[o.id]!==undefined)o.cat=s.obj[o.id]});
  delete DB.mig9;delete DB.mig9Undo;delete DB.mig9Report;DB.mig9Off=1;
  save();render();toast('✔ Ancienne classification restaurée (la migration ne sera plus rejouée)');
}
/* l'import de la base Excel réinstalle les anciennes catégories : on rejoue la migration */
{const s0=seedFromExcel;seedFromExcel=function(replace){const r=s0.apply(this,arguments);if(replace){delete DB.mig9;delete DB.mig9Undo;delete DB.mig9Off}try{applyTaxonomy()}catch(e){console.error(e)}save();return r}}

/* Libellés explicites des groupes dans les cartes (les clés restent stables) */
const GROUP_LABEL={'Dettes & Remboursements':'Dettes & remboursements de prêts (passif)','Fonds perdus':'Fonds perdus / Frais bancaires','Épargne':'Épargne (précaution, études, logement)','Investissement Bourse':'Investissement Bourse (BRVM & actifs financiers)'};
groupCard=function(G,mini){
  const rv=G.k==='Revenus',sv=G.k==='Épargne'||G.k==='Investissement Bourse',s=rstat({type:rv?'Revenu':sv?'Épargne':'Dépense Fixe'},G.t,G.r);
  return recapCard({title:GROUP_LABEL[G.k]||G.k,icon:GICON[G.k],sub:`${G.rows.length} catégorie(s)`,mini,p:s.p,over:s.over,
    tiles:[tile(rv?'Attendus':sv?'Objectif':'Budget cible',fmt(G.t),'','a1'),tile(rv?'Reçus':sv?'Épargné / investi':'Réalisé',fmt(G.r),rv||sv?'good':'','a4'),tile(s.l,s.v,s.cls,s.acc)],
    foot:G.t?`${pct(s.p)} ${rv?'du prévu encaissé':sv?'de l’objectif atteint':'du budget utilisé'}`:'Aucune cible définie pour ce groupe'});
};
{const f=MODULES.finances.filters.find(x=>x.k==='_groupe');if(f)f.o=()=>GROUPES;
 MODULES.finances.defFilters=()=>({_annee:DS.y==='all'?'':DS.y})}

/* ---- Synthèse des flux : Revenus → Dépenses (fixes, variables, pertes, dettes) → Épargne & investissements ---- */
function fluxData(a){
  const g=i=>grpOfCat(i.cat),rev=sumK(a,'rev'),dep=a.filter(i=>kind(i)==='dep'),isDette=i=>g(i)==='Dettes & Remboursements'||i.cat==='Remboursements prêt';
  const perdus=sumI(dep.filter(i=>g(i)==='Fonds perdus')),dettes=sumI(dep.filter(isDette)),hors=dep.filter(i=>g(i)!=='Fonds perdus'&&!isDette(i));
  const fixes=sumI(hors.filter(i=>i.type==='Dépense Fixe')),vars=sumI(hors.filter(i=>i.type!=='Dépense Fixe'));
  const epa=a.filter(i=>kind(i)==='epa'),bourse=sumI(epa.filter(i=>g(i)==='Investissement Bourse'||i.cat==='Investissement bourse'));
  const etud=sumI(epa.filter(i=>i.cat==='Épargne Études Enfants'||i.cat===PELN)),pure=sumI(epa)-bourse-etud;
  const D=fixes+vars+perdus+dettes,E=pure+etud+bourse;
  return{rev,fixes,vars,perdus,dettes,D,pure,etud,bourse,E,solde:rev-D-E};
}
function fluxCard(a){
  const X=fluxData(a),pc=v=>X.rev?pct(v/X.rev*100):'—',row=(l,v,cls,sub,ind)=>`<div class="fx${ind?' ind':''}"><span>${l}${sub?` <small class="mute">${sub}</small>`:''}</span><b class="${cls||''}">${fmt(v)}</b><em>${pc(v)}</em></div>`;
  let bl=0;try{bl=positions().filter(p=>p.qte>.0001).reduce((x,p)=>x+p.cout,0)}catch(e){}
  return `<div class="card flux"><h2>${ic('chart')} Synthèse des flux</h2>
   ${(()=>{const seg=[['Fixes',X.fixes,'#ef4444'],['Variables',X.vars,'#f59e0b'],['Fonds perdus',X.perdus,'#b91c1c'],['Dettes',X.dettes,'#dc2626'],['Épargne',X.pure+X.etud,'#10b981'],['Bourse',X.bourse,'#6366f1']].filter(s=>s[1]>0),tot=Math.max(X.rev,seg.reduce((x,s)=>x+s[1],0))||1;return seg.length?`<div class="fxbar" role="img" aria-label="Répartition des revenus">${seg.map(s=>`<i style="width:${s[1]/tot*100}%;background:${s[2]}" title="${s[0]} : ${fmt(s[1])}"></i>`).join('')}</div><div class="leg">${seg.map(s=>`<span><i style="background:${s[2]}"></i>${s[0]} ${X.rev?Math.round(s[1]/X.rev*100)+' %':''}</span>`).join('')}</div>`:''})()}
   <div class="fxh">1. Revenus</div>${row('Revenus encaissés',X.rev,'good')}
   <div class="fxh">2. Dépenses</div>${row('Dépenses fixes',X.fixes,'bad','hors dettes',1)}${row('Dépenses variables',X.vars,'warn','variables et occasionnelles',1)}${row('Pertes — fonds perdus / frais bancaires',X.perdus,'bad','',1)}${row('Dettes & remboursements de prêts',X.dettes,'bad','passif / engagements',1)}${row('Total dépenses',X.D,'bad')}
   <div class="fxh">3. Épargne & investissements</div>${row('Épargne pure (précaution, projets)',X.pure,'',' ',1)}${row('Épargne Études Enfants & logement',X.etud,'','assurances études, PEL',1)}${row('Investissement Bourse',X.bourse,'','capital investi'+(bl?` · portefeuille BRVM au coût : ${fmt(bl)}`:''),1)}${row('Total épargne & investissements',X.E,'')}
   <div class="fxh">Solde non affecté</div>${row('Revenus − dépenses − épargne',X.solde,X.solde<0?'bad':'good')}
   <p class="mute small" style="margin:8px 0 0">Les dettes, l’épargne et la bourse sont suivies séparément : un prêt remboursé n’est pas de l’épargne, et un contrat d’assurance études n’est pas une charge de Besoins.</p></div>`;
}
{const d=PAGES.dash;PAGES.dash=el=>{d(el);const g=el.querySelector('.grid');if(g)g.insertAdjacentHTML('afterend',fluxCard(periodItems(DS.y,DS.m,DS.base)))};
 const b=PAGES.budget;PAGES.budget=el=>{b(el);const g=el.querySelector('.grid');if(g)g.insertAdjacentHTML('afterend',fluxCard(periodItems(DS.y,DS.m,DS.base)))}}

/* Guide Besoins / Envies sur la page Catégories */
function taxoGuide(){
  return `<div class="card guide"><h2>${ic('bulb')} Besoins ou Envies ? La règle de décision</h2>
  <ol class="steps"><li><b>Besoin</b><span>Si ne pas payer entraîne une sanction, un danger ou la perte d’un revenu (logement, nourriture, santé, transport, scolarité, communication, obligations familiales), c’est un Besoin.</span></li>
  <li><b>Envie</b><span>Si cela peut attendre trois mois sans conséquence (loisirs, vêtements, gadgets, décoration, cadeaux, voyages), c’est une Envie.</span></li>
  <li><b>Dettes & remboursements</b><span>Les mensualités de prêt et les engagements de projets sont du passif : ni besoin, ni épargne.</span></li>
  <li><b>Fonds perdus</b><span>Frais et retenues bancaires, agios, amendes : de l’argent perdu sans contrepartie, à réduire en priorité.</span></li>
  <li><b>Épargne, Épargne Études Enfants, Bourse</b><span>Les contrats d’assurance études (NSIA, SANLAM…) et le PEL sont de l’épargne ; la bourse est un capital investi.</span></li></ol></div>`;
}
{const old=MODULES.categories.top;MODULES.categories.top=(a,all)=>taxoGuide()+(old?old(a,all):'')}

/* Garde-fou à la saisie : sur une année future, le plafond comparé est indexé sur l'inflation (comme les alertes) */
let _guardOn=false;
{const am0=annualModel;annualModel=function(y){const M=am0.apply(this,arguments);return _guardOn&&isFutureYear(y)?M.map(x=>({...x,p:x.p.map(v=>num(v)*inflFactor(y,x.c))})):M};
 const gc0=guardCheck;guardCheck=function(){_guardOn=true;try{return gc0.apply(this,arguments)}finally{_guardOn=false}}}

/* =====================================================================
   3. BUDGETS TRIMESTRIELS RÉCURRENTS (Voyage, Supplément Enfants)
   ===================================================================== */
const TRIM_KEYS=[['voyage','Voyages','Budget Voyage'],['enfants','Supplément Enfants','Budget Supplément Enfants']];
const trimInit=T=>{const cy=new Date().getFullYear();T.from=T.from||cy;T.to=T.to||cy+2;TRIM_KEYS.forEach(([k])=>{T[k]=T[k]||{on:false,start:1,q:[0,0,0,0],lignes:false}});T.applied=T.applied||{};return T};
const TRIM=()=>trimInit(DB.trim=DB.trim||{});                  /* écriture : crée la configuration */
const trimView=()=>DB.trim?trimInit(DB.trim):trimInit({});     /* lecture : n'écrit rien (afficher la page n'est pas une modification) */
const trimMonths=c=>{const s=Math.min(3,Math.max(1,+c.start||1));return [s-1,s+2,s+5,s+8]};
/* Alloue les montants dans le budget annuel (T1..T4 = mois de départ + 0, 3, 6, 9) et, en option, crée des lignes prévues */
function applyTrim(force){
  if(!ME||!DB||!DB.trim)return 0;
  const T=TRIM(),from=+T.from,to=Math.max(from,+T.to);let n=0;
  TRIM_KEYS.forEach(([k,cat,label])=>{
    const c=T[k],sig=JSON.stringify([c.on,c.q,c.start,c.lignes,from,to]);
    if(!force&&T.applied[k]===sig)return;
    if(!c.on&&!T.applied[k]){T.applied[k]=sig;return}                               /* jamais activé : rien à défaire */
    const co=ensureCat(cat),mo=trimMonths(c);
    for(let y=from;y<=to;y++){const B=ensureBudget(String(y)),arr=Array(12).fill(0);if(c.on)c.q.forEach((a,qi)=>{arr[mo[qi]]=num(a)});B[cat]=arr}
    if(c.on)co.budget=Math.round(c.q.reduce((s,v)=>s+num(v),0)/12);
    const F=list('finances');
    for(let y=from;y<=to;y++)c.q.forEach((a,qi)=>{
      const key=`${k}-${y}-Q${qi+1}`,ex=F.find(i=>i.trimKey===key);
      if(c.on&&c.lignes&&num(a)>0){
        if(ex){if(ex.statut==='⏳ En attente'){ex.montant=num(a);ex.date=`${y}-${pad2(mo[qi]+1)}-01`}}
        else F.push({id:uid(),created:new Date().toISOString(),date:`${y}-${pad2(mo[qi]+1)}-01`,type:'Dépense Occasionnelle',cat,libelle:`${label} T${qi+1} ${y}`,montant:num(a),statut:'⏳ En attente',note:'Allocation trimestrielle automatique',auto:1,trimKey:key});
      }else if(ex&&ex.statut==='⏳ En attente'){const ix=F.indexOf(ex);if(ix>=0)F.splice(ix,1)}
    });
    T.applied[k]=sig;n++;
  });
  return n;
}
function trimPage(el){
  const T=trimView(),cy=new Date().getFullYear(),ys=years().filter(y=>+y>=cy-1);
  const card=([k,cat,label])=>{const c=T[k],mo=trimMonths(c);
    return `<div class="card"><h2>${ic('calendar')} ${label} <span class="pill ${c.on?'good':''}">${c.on?'Actif':'Inactif'}</span></h2>
    <label class="chk"><input type="checkbox" name="${k}_on" ${c.on?'checked':''}> Allouer automatiquement ce budget chaque trimestre</label>
    <div class="fg" style="margin-top:10px">${[0,1,2,3].map(q=>`<div><label>T${q+1} — ${MOIS_L[mo[q]]} (FCFA)</label><input type="number" min="0" step="any" name="${k}_q${q}" value="${num(c.q[q])||''}" placeholder="0"></div>`).join('')}
    <div><label>Mois du 1er trimestre</label><select name="${k}_start">${[1,2,3].map(s=>`<option value="${s}" ${+c.start===s?'selected':''}>${MOIS_L[s-1]} (puis ${MOIS_L[s+2]}, ${MOIS_L[s+5]}, ${MOIS_L[s+8]})</option>`).join('')}</select></div></div>
    <label class="chk" style="margin-top:8px"><input type="checkbox" name="${k}_l" ${c.lignes?'checked':''}> Créer aussi des lignes prévues (⏳ En attente) dans Finances à chaque échéance</label>
    <p class="mute small" style="margin:8px 0 0">Catégorie utilisée : <b>${esc(cat)}</b>. Les montants sont inscrits dans le Budget annuel (les autres mois sont à zéro) ; vous pouvez ensuite les ajuster mois par mois.</p></div>`};
  const rows=[];for(let y=+T.from;y<=+T.to;y++)rows.push(y);
  el.innerHTML=`<div class="head"><h1>${ic('calendar')} Budgets trimestriels</h1></div>
  <div class="card guide"><h2>${ic('bulb')} Comment ça marche</h2><ol class="steps"><li><b>Choisissez les montants</b><span>Un montant par trimestre (T1 à T4) pour le Budget Voyage et pour le Supplément Enfants (rentrée, activités, frais trimestriels).</span></li><li><b>Choisissez la période</b><span>Les trimestres tombent par défaut en janvier, avril, juillet et octobre ; vous pouvez décaler le départ.</span></li><li><b>Enregistrez</b><span>L’allocation est inscrite automatiquement dans le Budget annuel de chaque année de la période, et se met à jour si vous changez les montants.</span></li></ol></div>
  <form id="trf">
   <div class="card"><h2>${ic('settings')} Période d’application</h2><div class="fg"><div><label>De l’année</label><select name="from">${ys.map(y=>`<option ${+y===+T.from?'selected':''}>${y}</option>`).join('')}</select></div><div><label>À l’année</label><select name="to">${ys.map(y=>`<option ${+y===+T.to?'selected':''}>${y}</option>`).join('')}</select></div></div></div>
   ${TRIM_KEYS.map(card).join('')}
   <p class="acts"><button>${ic('save')} Enregistrer et appliquer au budget</button></p></form>
  <div class="card tw"><h2>${ic('list')} Aperçu des allocations</h2><table class="mgrid"><thead><tr><th>Année</th>${TRIM_KEYS.map(([,cat])=>`<th>${esc(cat)}</th>`).join('')}</tr></thead><tbody>${rows.map(y=>`<tr><td><b>${y}</b></td>${TRIM_KEYS.map(([k])=>{const c=T[k],mo=trimMonths(c);return `<td>${c.on?c.q.map((a,q)=>`T${q+1} ${MOIS[mo[q]]} : <b>${nf(a)}</b>`).join('<br>'):'<span class="mute">inactif</span>'}</td>`}).join('')}</tr>`).join('')}</tbody></table></div>`;
  $('#trf').onsubmit=ev=>{ev.preventDefault();const f=new FormData(ev.target),T=TRIM();
    T.from=+f.get('from');T.to=Math.max(+f.get('from'),+f.get('to'));
    TRIM_KEYS.forEach(([k])=>{T[k]={on:f.get(k+'_on')==='on',start:+f.get(k+'_start')||1,q:[0,1,2,3].map(q=>num(f.get(`${k}_q${q}`))),lignes:f.get(k+'_l')==='on'}});
    const n=applyTrim(true);save();render();toast(`✔ Budgets trimestriels enregistrés et appliqués (${n} budget(s))`)};
}
PAGES.budgettri=trimPage;
{const i=NAV.findIndex(n=>n[0]==='budgetia');NAV.splice(i<0?NAV.length:i+1,0,['budgettri','calendar','Budgets trimestriels'])}
NAVG[0].m.push('budgettri');TABL.budgettri='Budgets trimestriels';

/* =====================================================================
   4. FONDS COLLECTIF — reste et rapprochement corrigés
   ===================================================================== */
collectifSums=function(){
  const L=list('collectif'),s=ty=>sumBy(L.filter(i=>i.type===ty),i=>num(i.montant)),C=s('Collecté'),R=sumBy(L,cRest),E=s('Espèce'),B=s('Banque'),So=s('Sortie'),tot=cTotal();
  const enc=Math.max(0,C-R),reste=Math.max(0,tot-C),complet=tot>0&&C>=tot-.5,solde=R<.5;
  let ecart=C-(R+E+B);
  if(So>0&&Math.abs(ecart-So)<1)ecart=0;                 /* l'écart correspond exactement aux sorties du fonds */
  const ecartBrut=ecart;
  if(complet&&solde)ecart=0;                              /* complet et soldé : aucune fausse alerte de rapprochement */
  return{C,R,E,B,So,T:E+B-So,ecart,ecartBrut,enc,reste,complet,solde,tot,surplus:Math.max(0,C-tot)};
};
collectifTop5=function(){
  const S=collectifSums(),nom=DB.profile?.collectifNom||'',tot=S.tot,L=list('collectif'),RP=L.filter(i=>i.type==='Reste à payer'),
    late=RP.filter(i=>cStat(i)?.k==='late'),soon=RP.filter(i=>cStat(i)?.k==='soon'),noEch=RP.filter(i=>cRest(i)>0&&!i.echeance),
    p=tot?Math.min(100,S.C/tot*100):0,M=collectifMouvements().slice(-8).reverse();
  const names=a=>a.map(i=>esc(i.personne||i.libelle)).join(', ');
  const resteTxt=S.complet?`Complet (${fmt(0)} restant)`:fmt(S.reste),rpTxt=S.solde?`Soldé (${fmt(0)} restant)`:fmt(S.R);
  let rap;
  if(S.complet&&S.solde)rap=`<div class="al ok"><span class="ai">${ic('check')}</span><div><b>${t('Rapprochement')}</b> — Complet (${fmt(0)} restant) : le montant attendu est atteint et toutes les créances sont soldées.${S.ecartBrut>=1?` <span class="mute">Trésorerie saisie : ${fmt(S.E+S.B)} pour ${fmt(S.enc)} encaissés — à régulariser si vous suivez la trésorerie.</span>`:''}${S.surplus>=1?` <span class="mute">Surplus collecté : ${fmt(S.surplus)}.</span>`:''}</div></div>`;
  else if(Math.abs(S.ecart)<1)rap=`<div class="al ok"><span class="ai">${ic('check')}</span><div><b>${t('Rapprochement')}</b> — ${t('Collecté = reste à payer + trésorerie : les comptes concordent.')}${S.So>0?` <span class="mute">Sorties du fonds : ${fmt(S.So)}.</span>`:''}</div></div>`;
  else rap=`<div class="al warn"><span class="ai">${ic('alert')}</span><div><b>${t('Rapprochement')}</b> — ${tp('Écart de {a} entre le collecté et (reste à payer + trésorerie) : vérifiez les saisies.',{a:fmt(Math.abs(S.ecart))})}<br><span class="mute small">Collecté ${fmt(S.C)} − reste à payer ${fmt(S.R)} − trésorerie saisie ${fmt(S.E+S.B)} = ${fmt(S.ecart)}. Un versement enregistré sans « E » ou « B » ne passe pas en trésorerie ; une sortie ne doit pas être retranchée à la main de l’espèce.</span></div></div>`;
  return `<div class="card"><h2>${ic('users')} ${t('Fonds collectif')} ${esc(nom)}</h2>
  <div class="fg"><div><label>${t('Montant total attendu (FCFA)')}</label><input type="number" min="0" data-x5="total" value="${tot}"></div></div>
  <div class="tiles" style="margin-top:12px"><div class="tile a1"><small>${t('Total attendu')}</small><b>${fmt(tot)}</b></div><div class="tile a4"><small>${t('Collecté / engagé')}</small><b class="good">${fmt(S.C)}</b></div><div class="tile ${S.complet?'a4':'a3'}"><small>${t('Reste à collecter')}</small><b class="${S.complet?'good':'warn'}">${resteTxt}</b></div></div>
  <div class="bar" style="margin:12px 0 4px"><i style="width:${p}%"></i></div><p class="mute small" style="margin:0 0 12px">${tp('{p} % du total attendu est collecté',{p:Math.round(p)})}</p>
  <div class="tiles"><div class="tile a4"><small>${t('Déjà encaissé')}</small><b class="good">${fmt(S.enc)}</b></div><div class="tile ${S.solde?'a4':'a2'}"><small>${t('Reste à payer (créances)')}</small><b class="${S.solde?'good':'warn'}">${rpTxt}</b></div><div class="tile a3"><small>${t('Sorties (dépenses du fonds)')}</small><b>${fmt(S.So)}</b></div><div class="tile a4"><small>${t('Solde disponible (espèce + banque − sorties)')}</small><b class="${S.T>=0?'good':'bad'}">${fmt(S.T)}</b></div></div></div>
  ${late.length?`<div class="al bad"><span class="ai">${ic('alert')}</span><div><b>${tp('{n} paiement(s) en retard',{n:late.length})}</b> — ${names(late)} · <span class="amt bad">${fmt(sumBy(late,cRest))}</span></div></div>`:''}
  ${soon.length?`<div class="al warn"><span class="ai">${ic('clock')}</span><div><b>${tp('{n} échéance(s) dans les 7 jours',{n:soon.length})}</b> — ${names(soon)} · <span class="amt warn">${fmt(sumBy(soon,cRest))}</span></div></div>`:''}
  ${noEch.length?`<div class="al"><span class="ai">${ic('calendar')}</span><div>${tp('{n} ligne(s) « Reste à payer » sans échéance : renseignez la date limite pour activer la signalisation.',{n:noEch.length})}</div></div>`:''}
  ${rap}
  <div class="card tw"><h2>${ic('list')} ${t('Entrées et sorties récentes')}</h2>${M.length?`<table><thead><tr><th>${t('Date')}</th><th>${t('Sens')}</th><th>${t('Libellé')}</th><th class="num">${t('Montant')}</th><th class="num">${t('Cumul')}</th></tr></thead><tbody>${M.map(m=>`<tr><td>${esc(m.d||'—')}</td><td><span class="${m.s>0?'good':'bad'}">${m.s>0?'▲ '+t('Entrée'):'▼ '+t('Sortie')}</span></td><td>${esc(m.l)}</td><td class="num">${fmt(m.a)}</td><td class="num"><b>${fmt(m.c)}</b></td></tr>`).join('')}</tbody></table>`:`<span class="mute">${t('Aucun mouvement pour le moment.')}</span>`}
  <p class="mute small" style="margin:8px 0 0">${t('« ± Versement » sur une ligne « Reste à payer » ajoute (ou retire, si négatif) un versement : le reste à payer et les totaux se recalculent aussitôt. Une « Sortie » est une dépense du fonds.')}</p></div>`;
};
/* l'alerte de la cloche suit le même calcul (plus de fausse alerte quand le fonds est complet et soldé) */

/* =====================================================================
   1. HISTORIQUE DES MODIFICATIONS — annulation et restauration
   ===================================================================== */
const HIST={key:null,snap:{},journal:[],seq:0,last:0,batch:null,quiet:false,mute:0,max:80,timer:null};
const HIST_SKIP=new Set(['aiBudget','aiPerso','mig9Undo','mig9Report','mig7Report','actus','seeded','seed2','seed3','seed4','mig7','mig8','mig9','mig9Off','chat','recapcat','cv','cmp']);
const HKEY=()=>'lumina.hist.'+(ME?ME.id:'');
const VAL_LABEL={profile:'Profil et réglages',budgets:'Budget annuel',epargne:'Plan d’épargne',plan:'Plan financier',cours:'Cours de bourse',retraite:'Objectif retraite',nutri:'Nutrition',trim:'Budgets trimestriels',aidant:'Proche à prévenir'};
const modLabel=k=>MODULES[k]?.label||VAL_LABEL[k]||k;
const nameOf=o=>{const n=o.libelle||o.nom||o.titre||o.actif||o.societe||o.cat||o.date||'élément';return String(n).slice(0,48)+(o.montant!=null&&o.libelle?' · '+fmt(o.montant):'')};
function snapKey(k){
  const v=DB[k];
  if(Array.isArray(v)&&v.every(x=>x&&typeof x==='object'&&x.id!=null)){const m=new Map();v.forEach((x,i)=>m.set(String(x.id),{s:JSON.stringify(x),i}));return{t:'arr',m}}
  return{t:'val',s:v===undefined?'':JSON.stringify(v)};
}
function baseline(){HIST.key=KEY;HIST.snap={};Object.keys(DB).forEach(k=>{if(!HIST_SKIP.has(k))HIST.snap[k]=snapKey(k)})}
function loadHist(){try{const j=JSON.parse(localStorage.getItem(HKEY())||'[]');HIST.journal=Array.isArray(j)?j:[];HIST.seq=Math.max(0,...HIST.journal.map(e=>e.seq||0))}catch{HIST.journal=[]}}
function persistHist(){
  clearTimeout(HIST.timer);
  HIST.timer=setTimeout(()=>{
    if(!ME)return;
    const slim=o=>{if(!o||typeof o!=='object')return o;const c={...o};['fichier','photo'].forEach(f=>{if(c[f]&&String(c[f]).length>20000){delete c[f];c._partiel=1}});return c};
    let J=HIST.journal.slice(-40).map(e=>({...e,removed:(e.removed||[]).map(r=>({ix:r.ix,obj:slim(r.obj)})),changed:(e.changed||[]).map(c=>({id:c.id,before:slim(c.before)}))}));
    for(let n=0;n<6;n++){try{localStorage.setItem(HKEY(),JSON.stringify(J));return}catch{J=J.slice(Math.ceil(J.length/2))}}
  },300);
}
function logDiff(){
  const now=Date.now(),batch=(HIST.batch&&now-HIST.last<700)?HIST.batch:'b'+now+Math.random().toString(36).slice(2,5);let any=false;
  new Set([...Object.keys(DB),...Object.keys(HIST.snap)]).forEach(k=>{
    if(HIST_SKIP.has(k))return;
    const o=HIST.snap[k],n=(k in DB)?snapKey(k):null;
    if(!o&&!n)return;
    if(!o&&n&&((n.t==='arr'&&n.m.size===0)||n.s==='[]'||n.s==='{}')){HIST.snap[k]=n;return}   /* simple création d'une liste vide à l'affichage d'une page : pas une modification */
    const base={id:'h'+(++HIST.seq),seq:HIST.seq,batch,ts:now,mod:k,label:modLabel(k)};
    if(o&&n&&o.t==='arr'&&n.t==='arr'){
      const added=[],removed=[],changed=[];
      n.m.forEach((v,id)=>{const x=o.m.get(id);if(!x)added.push(id);else if(x.s!==v.s)changed.push({id,before:JSON.parse(x.s)})});
      o.m.forEach((v,id)=>{if(!n.m.has(id))removed.push({ix:v.i,obj:JSON.parse(v.s)})});
      if(added.length||removed.length||changed.length){HIST.journal.push({...base,kind:'arr',added,removed,changed});any=true}
    }else{
      const before=o?(o.t==='arr'?JSON.stringify([...o.m.values()].sort((a,b)=>a.i-b.i).map(x=>JSON.parse(x.s))):o.s):null;
      const after=n?(n.t==='arr'?JSON.stringify([...n.m.values()].sort((a,b)=>a.i-b.i).map(x=>JSON.parse(x.s))):n.s):null;
      if(before!==after&&!(before===''&&after==='')){HIST.journal.push({...base,kind:'val',before:before==null||before===''?null:before});any=true}
    }
    if(n)HIST.snap[k]=n;else delete HIST.snap[k];
  });
  if(any){HIST.batch=batch;HIST.last=now;if(HIST.journal.length>HIST.max)HIST.journal=HIST.journal.slice(-HIST.max);persistHist();updateUndoBtn()}
}
const save9=save;
save=function(){
  if(!ME||!KEY)return save9.apply(this,arguments);
  DATA_REV++;
  if(HIST.key!==KEY||HIST.quiet||HIST.mute)return save9.apply(this,arguments);
  try{logDiff()}catch(e){console.error('Historique :',e)}
  return save9.apply(this,arguments);
};
function revertEntry(e){
  if(e.kind==='arr'){
    let arr=list(e.mod).slice();const rm=new Set(e.added||[]);arr=arr.filter(x=>!rm.has(String(x.id)));
    (e.changed||[]).forEach(c=>{const ix=arr.findIndex(x=>String(x.id)===String(c.id));if(ix>=0)arr[ix]=clone9(c.before);else arr.push(clone9(c.before))});
    [...(e.removed||[])].sort((a,b)=>a.ix-b.ix).forEach(r=>{if(!arr.some(x=>String(x.id)===String(r.obj.id)))arr.splice(Math.min(r.ix,arr.length),0,clone9(r.obj))});
    DB[e.mod]=arr;
  }else{if(e.before==null)delete DB[e.mod];else DB[e.mod]=JSON.parse(e.before)}
}
function afterRevert(msg){HIST.mute++;try{save9()}finally{HIST.mute--}baseline();persistHist();render();if(msg)toast(msg)}
function undoLast(){
  const J=HIST.journal;if(!J.length){toast('Rien à annuler');return false}
  const b=J[J.length-1].batch,es=J.filter(e=>e.batch===b);
  es.slice().reverse().forEach(revertEntry);HIST.journal=J.filter(e=>e.batch!==b);HIST.batch=null;
  afterRevert('↩ Annulé : '+es.map(e=>e.label).join(', '));return true;
}
/* Restaure l'état d'un module tel qu'il était AVANT l'enregistrement choisi (annule celui-ci et tous les suivants du module) */
function restoreBefore(id){
  const e=HIST.journal.find(x=>x.id===id);if(!e)return;
  const es=HIST.journal.filter(x=>x.mod===e.mod&&x.seq>=e.seq).sort((a,b)=>b.seq-a.seq);
  if(!confirm(`Restaurer « ${e.label} » comme avant ${new Date(e.ts).toLocaleString(LOC)} ?\n${es.length} enregistrement(s) de ce module seront annulés.`))return;
  es.forEach(revertEntry);const ids=new Set(es.map(x=>x.id));HIST.journal=HIST.journal.filter(x=>!ids.has(x.id));
  afterRevert(`↩ ${e.label} restauré`);
}
const entrySummary=e=>{if(e.kind!=='arr')return 'Réglage modifié';const a=[];if(e.added.length)a.push(`${e.added.length} ajout(s)`);if(e.changed.length)a.push(`${e.changed.length} modification(s)`);if(e.removed.length)a.push(`${e.removed.length} suppression(s)`);return a.join(' · ')};
const entryNames=e=>e.kind!=='arr'?'':[...e.removed.map(r=>'− '+nameOf(r.obj)),...e.changed.map(c=>'~ '+nameOf(c.before))].slice(0,3).join(' ; ');
function historyPage(el){
  const f=HIST.filter||'',mods=[...new Set(HIST.journal.map(e=>e.mod))],J=[...HIST.journal].reverse().filter(e=>!f||e.mod===f);
  el.innerHTML=`<div class="head"><h1>${ic('history')} Historique & restauration</h1><div class="acts"><button data-lundo ${HIST.journal.length?'':'disabled'}>${ic('undo')} Annuler la dernière action</button></div></div>
  <div class="card guide"><h2>${ic('bulb')} Comment ça marche</h2><ol class="steps"><li><b>Chaque enregistrement est journalisé</b><span>Ajout, modification ou suppression : l’état précédent est conservé localement (les ${HIST.max} derniers enregistrements).</span></li><li><b>Annuler la dernière action</b><span>Ctrl+Z, le bouton de la barre du haut ou le bouton du message de confirmation.</span></li><li><b>Restaurer un état précis</b><span>« Restaurer l’état d’avant » annule cet enregistrement et tous les suivants du même module.</span></li></ol></div>
  <div class="card filt"><div><label>Module</label><select id="hmod"><option value="">Tous les modules</option>${mods.map(m=>`<option value="${esc(m)}" ${m===f?'selected':''}>${esc(modLabel(m))}</option>`).join('')}</select></div></div>
  ${J.length?`<div class="card tw"><table><thead><tr><th>Date</th><th>Module</th><th>Détail</th><th class="num">Action</th></tr></thead><tbody>${J.map(e=>`<tr><td>${esc(new Date(e.ts).toLocaleString(LOC))}</td><td>${esc(e.label)}</td><td>${esc(entrySummary(e))}${entryNames(e)?`<br><small class="mute">${esc(entryNames(e))}</small>`:''}</td><td class="num"><button class="ghost" data-x9="hrest" data-id="${e.id}">${ic('undo')} Restaurer l’état d’avant</button></td></tr>`).join('')}</tbody></table></div>`:'<div class="card empty">Aucune modification enregistrée pour le moment.</div>'}`;
  $('#hmod').onchange=e=>{HIST.filter=e.target.value;render()};
}
PAGES.historique=historyPage;
{const i=NAV.findIndex(n=>n[0]==='reglages');NAV.splice(i<0?NAV.length:i,0,['historique','history','Historique & restauration'])}
/* Le message de confirmation d'un enregistrement propose l'annulation */
{const t0=toast;toast=function(m,undo,label){
  if(!undo&&/^✔/.test(m)&&HIST.journal.length&&Date.now()-HIST.last<2000){undo=undoLast;label='↩ Annuler la dernière action'}
  return t0.call(this,m,undo,label)}}

/* =====================================================================
   6. FILTRE D'ANNÉE MAÎTRE (2020 → N+15) + barre du haut
   ===================================================================== */
let _lastY=null;
function propagateYear(){
  if(_lastY===null){_lastY=DS.y;return}
  if(_lastY===DS.y)return;
  const v=DS.y==='all'?'':DS.y;
  Object.keys(UI).forEach(k=>{if(UI[k]&&UI[k].f){UI[k].f._annee=v;UI[k].f._mois=''}});
  BP.y=DS.y==='all'?null:DS.y;
  try{const all=dataYears();CM().years=DS.y==='all'?all:all.filter(y=>+y<=+DS.y).slice(-4)}catch(e){}
  _lastY=DS.y;
}
function syncMasterUi(){
  const gy=$('#gy');if(!gy)return;const ys=years(),sig=ys.join(',');
  if(gy.dataset.sig!==sig){gy.innerHTML='<option value="all">Toutes</option>'+ys.map(y=>`<option>${y}</option>`).join('');gy.dataset.sig=sig}
  gy.value=DS.y;
}
function updateUndoBtn(){const b=$('#undo');if(!b)return;const l=HIST.journal[HIST.journal.length-1];b.disabled=!l;b.title=l?`Annuler la dernière action (Ctrl+Z) : ${l.label} — ${entrySummary(l)}`:'Rien à annuler'}
{
  const top=$('#top'),add=$('#topadd');
  if(top){
    const u=document.createElement('button');u.id='undo';u.className='ghost';u.innerHTML=ic('undo')+' <span class="lbl">Annuler la dernière action</span>';u.setAttribute('aria-label','Annuler la dernière action');u.onclick=()=>undoLast();
    if(add)add.after(u);else top.append(u);
  }
}
/* les filtres d'année des pages (modules, bilan des projets) pilotent aussi le filtre maître */
document.addEventListener('change',ev=>{const s=ev.target;
  if(s&&s.dataset&&s.dataset.f==='_annee'&&ME)DS.y=s.value||'all';
  else if(s&&s.dataset&&s.dataset.f==='_mois'&&ME&&/^[0-9]{4}-/.test(s.value||''))DS.y=s.value.slice(0,4);
  else if(s&&s.dataset&&s.dataset.bpy!==undefined&&ME)DS.y=s.value||'all'},true);

/* =====================================================================
   9. BOUTONS « ENREGISTRER » EXPLICITES (pages à saisie directe : budget annuel, épargne, plan, collectif…)
   ===================================================================== */
const IMPLICIT='[data-bm],[data-ep],[data-p15],[data-cours],[data-x5="total"],[data-x5="obj"],[data-x5="rn"],[data-x5="rr"],[data-b7="garde"]';
function saveBar(){
  const main=$('#main');if(!main||!ME||main.querySelector('[data-lsave]')||!main.querySelector(IMPLICIT))return;
  const h=main.querySelector('.head');if(!h)return;let a=h.querySelector('.acts');if(!a){a=document.createElement('div');a.className='acts';h.appendChild(a)}
  a.insertAdjacentHTML('afterbegin',`<button data-lsave title="Ctrl+S">${ic('save')} Enregistrer</button><button class="ghost" data-lundo title="Ctrl+Z">${ic('undo')} Annuler la dernière action</button>`);
}
new MutationObserver(()=>{try{saveBar()}catch(e){}}).observe($('#main'),{childList:true});
document.addEventListener('click',ev=>{
  if(ev.target.closest('[data-lsave]')){ev.preventDefault();save();toast('✔ Modifications enregistrées')}
  else if(ev.target.closest('[data-lundo]')){ev.preventDefault();undoLast()}
  else{const b=ev.target.closest('[data-x9]');if(!b||!ME)return;const x=b.dataset.x9;
    if(x==='hrest')restoreBefore(b.dataset.id);
    else if(x==='vprev')vaultPreview(b.dataset.id);
    else if(x==='mig9undo')rollbackTaxonomy();
    else if(x==='mig9redo'){delete DB.mig9Off;delete DB.mig9;if(applyTaxonomy())save();render();toast('✔ Migration rejouée')}}
});
document.addEventListener('keydown',ev=>{
  if(!ME)return;const mod=ev.ctrlKey||ev.metaKey,k=(ev.key||'').toLowerCase();
  if(mod&&k==='s'){ev.preventDefault();const f=document.querySelector('.ov form');if(f)f.requestSubmit();else{save();toast('✔ Modifications enregistrées')}}
  else if(mod&&!ev.shiftKey&&k==='z'){const t=ev.target,ed=t&&(/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)||t.isContentEditable);if(ed||document.querySelector('.ov'))return;ev.preventDefault();undoLast()}
});

/* =====================================================================
   7. COFFRE-FORT — refonte
   ===================================================================== */
const COFFRE_TYPES=['Identité & État civil','Assurances & Contrats','Diplômes & Formations','Titres de propriété & Foncier','Documents bancaires & Fiscaux','Santé & Ordonnances','Autres documents'];
const COFFRE_LEGACY={'Identité':COFFRE_TYPES[0],'Assurance':COFFRE_TYPES[1],'Contrat':COFFRE_TYPES[1],'Diplôme':COFFRE_TYPES[2],'Autre':COFFRE_TYPES[6]};
const COFFRE_GUESS=[[/(titre foncier|terrain|acd|attestation villageoise|propriete|lotissement)/,3],[/(banque|releve|impot|fiscal|\brib\b|dgi|declaration)/,4],[/(ordonnance|sante|vaccin|carnet|analyse|medical)/,5],[/(passeport|\bcni\b|carte nationale|acte de naissance|permis|identite|extrait|mariage)/,0],[/(assurance|contrat|nsia|sanlam|bail)/,1],[/(diplome|certificat|formation|releve de notes|attestation)/,2]];
function migrateCoffre(){
  let ch=false;
  list('coffre').forEach(d=>{
    if(COFFRE_TYPES.includes(d.type)&&d.alerte!=null&&d.alerte!=='')return;
    if(!COFFRE_TYPES.includes(d.type)){let n=COFFRE_LEGACY[d.type]||COFFRE_TYPES[6];
      if(n===COFFRE_TYPES[6]){const x=nrm(d.titre||'');const g=COFFRE_GUESS.find(([re])=>re.test(x));if(g)n=COFFRE_TYPES[g[1]]}
      d.type=n;ch=true}
    if(d.alerte==null||d.alerte===''){d.alerte='90';ch=true}
  });
  return ch;
}
const vStat=d=>{
  if(!d.expire)return{k:'none',l:'Sans échéance',left:null};
  const left=dayDiff(ltoday(),d.expire),al=num(d.alerte)||90;
  if(left<0)return{k:'bad',l:`Expiré depuis ${-left} j`,left};
  if(left<=al)return{k:'warn',l:`À renouveler dans ${left} j`,left};
  return{k:'ok',l:`Valide (${left} j)`,left};
};
{const C=MODULES.coffre;
 C.defaults={type:COFFRE_TYPES[0],expire:'',alerte:'90'};
 C.fields=[{k:'titre',l:'Titre du document (ex : Passeport, Police NSIA études…)',full:1},{k:'type',l:'Type',t:'select',o:COFFRE_TYPES},{k:'ref',l:'Numéro / référence'},{k:'emetteur',l:'Organisme émetteur'},
  {k:'expire',l:'Date d’expiration',t:'date'},{k:'alerte',l:'Alerte de renouvellement (jours avant l’expiration)',t:'select',o:['30','60','90','180','365']},
  {k:'fichier',l:'Pièce jointe / scan (image ou PDF, 700 Ko max pour un PDF)',t:'file',full:1},{k:'note',l:'Notes (où se trouve l’original, démarches de renouvellement…)',t:'textarea',full:1}];
 C.cols=[{k:'titre',l:'Document'},{k:'type',l:'Type',f:i=>badge(i.type)},{k:'ref',l:'Référence'},{k:'expire',l:'Expiration',f:i=>{const s=vStat(i);return i.expire?`<span class="${s.k==='bad'?'bad':s.k==='warn'?'warn':'good'}">${esc(i.expire)}</span><br><small class="${s.k==='bad'?'bad':s.k==='warn'?'warn':'mute'}">${esc(s.l)}</small>`:'<span class="mute">—</span>'}},
  {l:'Fichier',nosort:1,f:i=>i.fichier?`<a href="#" data-x9="vprev" data-id="${i.id}" onclick="event.stopPropagation()">Aperçu</a> · <a href="${esc(i.fichier)}" download="${esc(i.titre)}" onclick="event.stopPropagation()">Télécharger</a>`:'<span class="mute">—</span>'}];
 C.filters=[{k:'type',l:'Type',o:COFFRE_TYPES}];
 C.summary=a=>{const S=a.map(vStat);return `<span>Documents <b>${a.length}</b></span><span>Expirés <b class="${S.some(s=>s.k==='bad')?'bad':''}">${S.filter(s=>s.k==='bad').length}</b></span><span>À renouveler <b class="${S.some(s=>s.k==='warn')?'warn':''}">${S.filter(s=>s.k==='warn').length}</b></span><span>Sans pièce jointe <b>${a.filter(i=>!i.fichier).length}</b></span>`};
}
function vaultCard(i){
  const img=(i.fichier||'').startsWith('data:image'),s=vStat(i);
  return `<div class="pc vault">${img?`<img class="ph" src="${esc(i.fichier)}" alt="Aperçu de ${esc(i.titre)}">`:`<div class="ph">${i.fichier?'📄 PDF':'🔐'}</div>`}<div class="pb"><div class="t">${esc(i.titre)} ${badge(i.type)}</div>
  ${i.ref?`<div class="s">Réf. : ${esc(i.ref)}</div>`:''}${i.emetteur?`<div class="s">Organisme : ${esc(i.emetteur)}</div>`:''}
  <div class="s"><span class="${s.k==='bad'?'bad':s.k==='warn'?'warn':s.k==='ok'?'good':'mute'}">${s.k==='bad'||s.k==='warn'?'⚠ ':''}${i.expire?`Expire le ${esc(i.expire)} — `:''}${esc(s.l)}</span></div>
  ${i.note?`<div class="s mute">${esc(String(i.note).slice(0,120))}</div>`:''}
  <div class="ca">${i.fichier?`<button class="ghost" data-x9="vprev" data-id="${i.id}">${ic('eye')} Aperçu</button><a href="${esc(i.fichier)}" download="${esc(i.titre)}"><button type="button" class="ghost">${ic('download')} Télécharger</button></a>`:'<span class="mute small">Aucune pièce jointe : ajoutez un scan via « Modifier ».</span>'}</div>${actions('coffre',i)}</div></div>`;
}
MODULES.coffre.card=vaultCard;
function vaultPreview(id){
  const d=list('coffre').find(x=>x.id===id);if(!d)return;const f=d.fichier||'',s=vStat(d);
  const ov=document.createElement('div');ov.className='ov';
  ov.innerHTML=`<div class="card modal vprev"><h2>${ic('shield')} ${esc(d.titre)} ${badge(d.type)}</h2>
   <div class="vbody">${f.startsWith('data:image')?`<img src="${esc(f)}" alt="">`:f.startsWith('data:application/pdf')?`<object data="${esc(f)}" type="application/pdf"><p>Aperçu PDF indisponible sur cet appareil. <a href="${esc(f)}" download="${esc(d.titre)}">Télécharger le fichier</a></p></object>`:'<p class="mute">Aucune pièce jointe : ajoutez un scan via « Modifier ».</p>'}</div>
   <ul class="bul">${d.ref?`<li>Référence : ${esc(d.ref)}</li>`:''}${d.emetteur?`<li>Organisme : ${esc(d.emetteur)}</li>`:''}<li>Expiration : ${esc(d.expire||'—')} — ${esc(s.l)}</li>${d.note?`<li>${esc(d.note)}</li>`:''}</ul>
   <div class="mact"><button type="button" data-x>Fermer</button></div></div>`;
  document.body.appendChild(ov);ov.onclick=e=>{if(e.target===ov||e.target.closest('[data-x]'))ov.remove()};
}
ADV.coffre=function(){
  const A=[],C=list('coffre');if(!C.length)return [L('info','Ajoutez vos documents essentiels : pièce d’identité, assurances, diplômes, titres fonciers, relevés bancaires, ordonnances.')];
  C.forEach(d=>{const s=vStat(d);if(s.k==='bad')A.push(L('bad',`« ${esc(d.titre)} » a expiré le ${d.expire} : lancez le renouvellement.`));else if(s.k==='warn')A.push(L('warn',`« ${esc(d.titre)} » expire le ${d.expire} (dans ${s.left} jours) : prévoyez le renouvellement.`))});
  const nof=C.filter(d=>!d.fichier).length;if(nof)A.push(L('info',`${nof} document(s) sans scan : joignez une photo ou un PDF pour les retrouver même sans l’original.`));
  return A;
};
MODULES.coffre.top=(a,all)=>adviceCard('coffre')+`<div class="card guide"><details open><summary><b>${ic('bulb')} Guide d’utilisation rapide</b></summary>
  <ol class="steps"><li><b>Ajouter</b><span>Cliquez sur « Ajouter » : donnez un titre, choisissez le type (identité, assurances, diplômes, titres fonciers, banque & impôts, santé), puis la date d’expiration.</span></li>
  <li><b>Joindre le scan</b><span>Photographiez ou importez le document (image ou PDF). Il reste uniquement sur cet appareil.</span></li>
  <li><b>Être prévenu</b><span>Choisissez l’alerte de renouvellement (30 à 365 jours avant). Le document apparaît dans la cloche et sur le tableau de bord.</span></li>
  <li><b>Retrouver</b><span>Filtrez par type, utilisez la recherche, ouvrez l’aperçu ou téléchargez le fichier.</span></li></ol></details></div>`;
{const i=NAV.findIndex(n=>n[0]==='coffre');if(i>=0)NAV[i][2]='Coffre-fort'}

/* =====================================================================
   8. CONSEILS : présentation aérée, guides de lecture, recommandations actionnables
   ===================================================================== */
const GUIDE={
 dash:['Vert = revenus, soldes positifs et objectifs atteints. Rouge = dépenses fixes, dépassements, fonds perdus. Orange = dépenses variables et points de vigilance.','Le filtre Année (barre du haut) pilote le Tableau de bord, le Budget, la Synthèse annuelle, la Comparaison d’années et le Reporting.','« Tout (réel + prévu) » additionne le payé et l’engagé. Pour une année future, cette base est imposée et les plafonds de dépenses sont indexés sur l’inflation.'],
 finances:['Chaque ligne a un type (revenu, fixe, variable, occasionnelle, épargne) et une catégorie ; la catégorie détermine le groupe : Besoins, Envies, Dettes, Fonds perdus, Épargne, Bourse.','Les lignes « En attente » sont du prévu : elles comptent dans la base « Tout » mais pas dans « Réalisé seulement ».'],
 budget:['La cible est le budget annuel saisi (sinon la cible mensuelle × 12). Le réalisé vient de vos écritures.','Sur une année future, la cible de chaque dépense est indexée sur l’inflation paramétrée (Réglages) pour éviter les fausses alertes.'],
 categories:['Une catégorie appartient à un seul groupe : changez-le ici si une dépense est mal classée.','Les budgets cibles mensuels servent partout : Budget, alertes, tableau de bord.'],
 objectifs:['Un objectif compte les versements d’épargne de sa catégorie (et de son mot-clé) depuis la date indiquée.','La barre devient verte quand l’objectif est atteint.'],
 investissements:['La valeur actuelle se met à jour à la main ; le rendement inclut les dividendes.','Visez au moins trois classes d’actifs et pas plus de 30 à 60 % sur une seule.'],
 coffre:['Les documents et leurs scans restent sur cet appareil.','L’alerte de renouvellement se règle document par document.'],
 bourse:['Le CMP (coût moyen pondéré) inclut les frais SGI et BRVM paramétrés ; les cours se saisissent à la main.','Un titre ne devrait pas dépasser 25 à 30 % du portefeuille, ni un secteur 60 %.','Les achats de bourse sont aussi enregistrés dans Finances (catégorie « Investissement bourse ») pour suivre le capital investi.'],
 contacts:['Renseignez la dernière rencontre pour être alerté des contacts à relancer (plus de six mois).','Les anniversaires apparaissent dans les alertes une semaine à l’avance.'],
 notes:['Classez vos notes : « À faire » alimente les alertes tant qu’elles ne sont pas traitées.'],
 journal:['Trois lignes par jour suffisent : une réussite, un apprentissage, une priorité pour demain.','La série compte les jours consécutifs écrits.'],
 sante:['Notez poids, tension, sport et sommeil régulièrement : les tendances sur 30 jours déclenchent les conseils.','Ces informations ne remplacent pas un avis médical.'],
 collectif:['« Collecté / engagé » compare ce qui est promis au total attendu ; « Reste à payer » est ce qui n’est pas encore versé.','Quand tout est atteint et soldé, la page affiche « Complet (0 FCFA restant) ».']
};
function recoFor(k){
  const R=[];
  try{
    const {a,rev,dep,epa,months}=yAgg(),X=fluxData(a),rows=budgetRows(a,rev,months);
    if(k==='dash'||k==='finances'||k==='budget'){
      if(rev){
        const tx=epa/rev*100;
        if(tx<20){const need=Math.max(0,rev*.2-epa)/Math.max(1,months);R.push(`Programmez un virement automatique d’environ ${fmt(Math.round(need/500)*500)} par mois dès la réception du revenu pour atteindre 20 % d’épargne (taux actuel : ${f1(tx)} %).`)}
        const over=rows.filter(x=>x.c.type!=='Revenu'&&!isGood(x.c)&&x.t>0&&x.r>x.t*1.05).sort((p,q)=>(q.r-q.t)-(p.r-p.t)).slice(0,3);
        over.forEach(x=>R.push(`Plafonnez « ${x.c.nom} » à ${fmt(x.t)} : dépassement actuel de ${fmt(x.r-x.t)}.`));
        const bes=(X.fixes+X.vars+X.dettes)/rev*100;if(bes>50)R.push(`Besoins et dettes pèsent ${f1(bes)} % des revenus (repère 50 %) : renégociez un abonnement ou un loyer avant de réduire les envies.`);
        const env=sumI(a.filter(i=>kind(i)==='dep'&&grpOfCat(i.cat)==='Envies'))/rev*100;if(env>30)R.push(`Les envies représentent ${f1(env)} % des revenus (repère 30 %) : gelez-en une partie pendant deux mois.`);
        if(X.perdus>0)R.push(`Fonds perdus : ${fmt(X.perdus)} (${f1(X.perdus/rev*100)} % des revenus). Demandez un forfait de tenue de compte et évitez les découverts qui génèrent des agios.`);
        if(X.dettes/rev*100>33)R.push(`Dettes : ${f1(X.dettes/rev*100)} % des revenus (seuil 33 %). Aucun nouveau crédit tant que ce taux n’est pas redescendu.`);
      }
      const late=list('finances').filter(i=>i.statut==='⏳ En attente'&&i.date&&i.date<ltoday()).length;if(late)R.push(`Confirmez ou annulez les ${late} paiement(s) en attente dont la date est passée.`);
      if(isFutureYear(DS.y))R.push(`Année ${DS.y} : les plafonds de dépenses sont indexés de ${f1(inflationRate()*100)} % par an et l’alerte compare le réalisé + le prévu. Modifiez l’inflation dans Réglages si besoin.`);
    }else if(k==='categories'){
      const sans=rows.filter(x=>x.c.type!=='Revenu'&&!x.t&&x.r>0).length;if(sans)R.push(`Fixez un budget cible pour les ${sans} catégorie(s) qui ont des dépenses sans cible.`);
    }else if(k==='objectifs'){
      list('objectifs').forEach(o=>{const s=goalStats(o);if(s.reste>0&&R.length<3)R.push(`« ${o.nom} » : il reste ${fmt(s.reste)} ; à ${fmt(Math.round(s.reste/12/500)*500)} par mois, l’objectif est atteint en 12 mois.`)});
    }else if(k==='collectif'){
      const S=collectifSums();if(!S.complet)R.push(`Il reste ${fmt(S.reste)} à collecter : relancez les personnes en « Reste à payer » avant l’échéance.`);
    }
  }catch(e){}
  return R;
}
adviceCard=function(k){
  let A=[];try{A=ADV[k]?ADV[k]()||[]:[]}catch(e){}
  if(!A.length)A=[L('ok','Aucune recommandation particulière : continuez ainsi !')];
  const R=recoFor(k),G=GUIDE[k];
  return `<div class="card advice"><h2>${ic('bulb')} Conseils et recommandations</h2>
   ${A.map(x=>`<div class="al ${x.l}"><span class="ai">${ic(x.l==='bad'||x.l==='warn'?'alert':x.l==='ok'?'check':'bulb')}</span><div class="advt">${x.t}</div></div>`).join('')}
   ${R.length?`<div class="advact"><b>À faire maintenant</b><ol class="steps">${R.map(r=>`<li><span>${esc(r)}</span></li>`).join('')}</ol></div>`:''}
   ${G?`<details class="guide"><summary>Comment lire cette page</summary><ul class="bul">${G.map(g=>`<li>${esc(g)}</li>`).join('')}</ul></details>`:''}</div>`;
};
/* alertes et conseils du budget : nouvelle taxonomie */
ADV.budget=function(){
  const {a,rev}=yAgg(),A=[];if(!rev)return A;
  const g=gs=>a.filter(i=>kind(i)!=='rev'&&gs.includes(grpOfCat(i.cat))).reduce((s,i)=>s+num(i.montant),0)/rev*100;
  const b=g(['Besoins','Dettes & Remboursements']),e=g(['Envies']),s=g(['Épargne','Investissement Bourse']);
  if(b>50*1.15)A.push(L('warn',`« Besoins & dettes » représentent ${f1(b)} % des revenus (repère 50 %).`));
  if(e>30*1.15)A.push(L('warn',`« Envies » représentent ${f1(e)} % des revenus (repère 30 %).`));
  if(s<20*.5)A.push(L('warn',`« Épargne & investissements » : ${f1(s)} % des revenus (repère 20 %).`));else if(s>=20)A.push(L('ok',`« Épargne & investissements » : ${f1(s)} % des revenus : objectif atteint.`));
  const pret=a.filter(i=>kind(i)==='dep'&&i.cat==='Remboursements prêt').reduce((x,i)=>x+num(i.montant),0)/rev*100;if(pret>33)A.push(L('bad',`Endettement de ${f1(pret)} % : au-delà de 33 %, évitez tout nouveau crédit.`));
  const fp=g(['Fonds perdus']);if(fp>1)A.push(L('warn',`Fonds perdus : ${f1(fp)} % des revenus (frais bancaires, agios, pertes) : à réduire en priorité.`));
  return A;
};
ADV.collectif=function(){const S=collectifSums(),A=[];if(S.complet&&S.solde)A.push(L('ok',`Complet (${fmt(0)} restant) : le montant attendu est atteint et toutes les créances sont soldées.`));else if(S.complet)A.push(L('info',`Le montant attendu est atteint ; il reste ${fmt(S.R)} à encaisser sur les créances.`));return A};
{const C=MODULES.collectif;if(C){const old=C.top;C.top=(a,all)=>adviceCard('collectif')+(old?old(a,all):'')}}

/* =====================================================================
   RÉGLAGES : alertes futures (inflation), migration comptable, historique
   ===================================================================== */
{const rg=PAGES.reglages;PAGES.reglages=el=>{rg(el);
  const rep=DB.mig9Report,card=document.createElement('div');card.className='card';
  card.innerHTML=`<h2>${ic('alert')} Alertes sur les années futures</h2>
   <form id="inf9" class="fg"><div><label>Inflation annuelle (%) appliquée aux plafonds de dépenses des années futures</label><input name="inflation" type="number" min="0" max="50" step="0.1" value="${f1(inflationRate()*100)}"></div>
   <div class="full"><button>${ic('save')} Enregistrer</button> <span class="mute small">Plafond N+k = plafond × (1 + inflation)<sup>k</sup>. Les alertes des années futures comparent ce plafond au réalisé + prévu/engagé. 3 % par défaut ; 0 désactive l’indexation.</span></div></form>
   <h2 style="margin-top:18px">${ic('folder')} Classification comptable (v9)</h2>
   ${rep?`<ol class="steps"><li><b>Dernière migration : ${esc((rep.at||'').slice(0,10))}</b><span>${rep.renamed.length?esc(rep.renamed.join(' ; ')):'Aucun renommage.'}</span></li>
   <li><b>Assurances → Épargne Études Enfants</b><span>${rep.assurances} écriture(s) reclassée(s) en épargne.</span></li>
   <li><b>Nettoyage de « Autres »</b><span>${Object.keys(rep.autres).length?esc(Object.entries(rep.autres).map(([c,n])=>`${c} : ${n}`).join(' ; ')):'Aucune écriture à reclasser.'}</span></li>
   ${rep.verifier.length?`<li><b>À vérifier (libellé générique)</b><span>${rep.verifier.slice(0,8).map(esc).join('<br>')}${rep.verifier.length>8?`<br>… et ${rep.verifier.length-8} autre(s)`:''}</span></li>`:''}</ol>`:'<p class="mute">Aucune migration enregistrée.</p>'}
   <p class="acts" style="margin:8px 0 0">${DB.mig9Undo?`<button class="ghost danger" data-x9="mig9undo">${ic('undo')} Annuler la migration comptable</button>`:''}${DB.mig9Off?`<button class="ghost" data-x9="mig9redo">Rejouer la migration</button>`:''}<button class="ghost" data-go="historique">${ic('history')} Historique & restauration</button></p>`;
  el.insertBefore(card,el.children[3]||null);
  card.querySelector('#inf9').onsubmit=ev=>{ev.preventDefault();DB.profile={...DB.profile,inflation:num(new FormData(ev.target).get('inflation'))};save();render();toast('✔ Inflation enregistrée')};
}}

/* =====================================================================
   BRANCHEMENT : démarrage, rendu, migrations
   ===================================================================== */
function migrateAll9(){
  if(!ME||!DB)return;
  let ch=false;
  ch=applyTaxonomy()||ch;ch=migrateCoffre()||ch;ch=applyTrim()>0||ch;
  if(ch)save();
}
{const b0=boot;boot=function(){HIST.quiet=true;DATA_REV++;b0.apply(this,arguments);try{migrateAll9()}catch(e){console.error('LUMINA v9 :',e)}}}
{const m4=migrate4;migrate4=function(){m4.apply(this,arguments);try{migrateAll9()}catch(e){console.error('LUMINA v9 :',e)}}}
{const r0=render;render=function(){
  if(ME){
    if(HIST.quiet||HIST.key!==KEY){if(HIST.key!==KEY||!HIST.journal.length)loadHist();baseline();HIST.quiet=false}
    propagateYear();
  }
  r0.apply(this,arguments);
  if(ME){syncMasterUi();updateUndoBtn();saveBar()}
}}
