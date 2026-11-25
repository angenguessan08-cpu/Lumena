'use strict';
/* LUMINA — Ne plus naviguer à l’aveugle : la clarté sur vos comptes, mois par mois, poste par poste. Hors-ligne : données dans localStorage. */
let KEY=null,ME=null;
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const today=()=>new Date().toISOString().slice(0,10);
const fmt=n=>fmtMoney(n);
const pct=n=>fmtDec(isFinite(n)?n:0)+' %';
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const num=v=>Number(v||0);
const MOIS=['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Août','Sep','Oct','Nov','Déc'];
const PALETTE=['#b06ccb','#a0cc3e','#f4c15a','#ff8a8a','#6fb7d9','#d9a4e8','#c9e08f','#7f8cd6'];

let DB={};let CFG=loadCfg();
function load(){try{return JSON.parse(localStorage.getItem(KEY))||{}}catch{return{}}}
function save(){try{localStorage.setItem(KEY,JSON.stringify(DB))}catch(e){toast('⚠ Stockage plein : exportez vos données et supprimez des images/fichiers.')}}
const list=m=>(DB[m]=DB[m]||[]);
/* Configuration commune à tous les comptes (clé API, coordonnées de support, inscriptions) */
function loadCfg(){try{return JSON.parse(localStorage.getItem('lumina.cfg'))||{}}catch{return{}}}
function saveCfg(){try{localStorage.setItem('lumina.cfg',JSON.stringify(CFG))}catch{}}
const cap=s=>s.charAt(0).toUpperCase()+s.slice(1);
function toast(t,undo,undoLabel){const d=document.createElement('div');d.textContent=t+' ';if(undo){const b=document.createElement('button');b.className='ghost';b.textContent=undoLabel||'↩ Annuler';b.onclick=()=>{undo();d.remove()};d.appendChild(b)}$('#toast').appendChild(d);setTimeout(()=>d.remove(),undo?8000:2600)}

/* ---------- Modules ---------- */
const badge=v=>{let h=0;for(const c of String(v||''))h=(h*31+c.charCodeAt(0))%360;return v?`<span class="b" style="--h:${h}">${esc(v)}</span>`:''};
const initials=n=>String(n||'?').split(/\s+/).map(w=>w[0]).slice(0,2).join('').toUpperCase();
/* Icônes (traits fins, héritent de la couleur du texte) */
const IC={
 home:'<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
 wallet:'<path d="M3 7a2 2 0 0 1 2-2h13v4"/><path d="M3 7v11a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1H5a2 2 0 0 1-2-2"/><circle cx="16.5" cy="14.5" r="1"/>',
 chart:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
 folder:'<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
 target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
 trend:'<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
 rocket:'<path d="M5 15c-1.5 1.3-2 5-2 5s3.7-.5 5-2"/><path d="M12 15 9 12a22 22 0 0 1 2-4 13 13 0 0 1 11-6c0 3-1 8-6 11a22 22 0 0 1-4 2z"/><circle cx="16" cy="8" r="1"/>',
 users:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6"/>',
 bulb:'<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.7.6 1 1.3 1 2.1h5c0-.8.3-1.5 1-2.1A6 6 0 0 0 12 3z"/>',
 book:'<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 21V5M9 8h6"/>',
 heart:'<path d="M12 20s-8-4.7-8-10.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5C20 15.3 12 20 12 20z"/>',
 shield:'<path d="M12 3 4 6v6c0 4.5 3.2 8 8 9 4.8-1 8-4.5 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
 bot:'<rect x="4" y="8" width="16" height="12" rx="3"/><path d="M12 8V5M9 14v1M15 14v1"/><circle cx="12" cy="4" r="1"/>',
 mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
 info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01"/>',
 settings:'<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
 code:'<path d="m8 8-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14"/>',
 bell:'<path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 21a2 2 0 0 0 4 0"/>',
 check:'<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
 coins:'<circle cx="9" cy="9" r="6"/><path d="M15.5 9.5A6 6 0 1 1 9.5 15.5"/>',
 gift:'<rect x="3" y="8" width="18" height="4"/><path d="M12 8v13M5 12v8h14v-8M12 8C10 3 6 4.500 8 8M12 8c2-5 6-3.500 4 0"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 edit:'<path d="M4 20h4L19 9l-4-4L4 16z"/>',
 copy:'<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
 trash:'<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
 logout:'<path d="M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4M16 8l4 4-4 4M20 12H9"/>',
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.600 5.600 7 7M17 17l1.400 1.400M5.600 18.400 7 17M17 7l1.400-1.400"/>',
 moon:'<path d="M20 14.500A8 8 0 0 1 9.500 4 8 8 0 1 0 20 14.500z"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 alert:'<path d="M12 4 2.500 20h19z"/><path d="M12 10v5M12 17.500v.01"/>',
 download:'<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>',
 chevron:'<path d="m9 6 6 6-6 6"/>',
 eye:'<path d="M2 12s3.500-6.500 10-6.500S22 12 22 12s-3.500 6.500-10 6.500S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
 grid:'<rect x="4" y="4" width="7" height="7" rx="1"/><rect x="13" y="4" width="7" height="7" rx="1"/><rect x="4" y="13" width="7" height="7" rx="1"/><rect x="13" y="13" width="7" height="7" rx="1"/>',
 list:'<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>'
};
const ic=n=>`<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[n]||''}</svg>`;

/* Listes issues du classeur BUDGET_PILOTAGE_PRO.xlsx */
const TYPES=['Revenu','Dépense Fixe','Dépense Variable','Dépense Occasionnelle','Épargne'];
const STATUTS=['✅ Payé','⏳ En attente','🔁 Automatique','❌ Annulé'];
/* Taxonomie LUMINA v9 — ordre strict des flux : 1) Revenus  2) Dépenses (fixes, variables, pertes)  3) Épargne & investissements.
   « Épargne & Dettes » est scindé en trois entités indépendantes : Dettes & Remboursements / Épargne / Investissement Bourse.
   Besoins = ce qu'on ne peut pas ne pas payer ; Envies = ce qui peut attendre 3 mois sans conséquence ; Fonds perdus = frais et pertes sans contrepartie. */
const RELIG_G='Religion / Culte';
const GROUPES=['Revenus','Besoins','Envies','Dettes & Remboursements','Fonds perdus','Épargne','Investissement Bourse'];   /* v12 : aucun groupe spirituel par défaut — l'utilisateur crée les siens (+ Ajouter un groupe / une catégorie) */

const BASES=['Tout (réel + prévu)','Réalisé seulement'];
const MOIS_L=['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const amtCls=i=>{const k=kind(i);if(k==='rev')return 'good';if(k!=='dep')return '';return (i.type==='Dépense Fixe'||(typeof catOf==='function'&&(catOf(i.cat)?.groupe==='Fonds perdus'||catOf(i.cat)?.fp)))?'bad':'warn'};
const kind=i=>i.type==='Revenu'?'rev':(i.type==='Épargne'||i.type==='Investissement')?'epa':((i.type||'').startsWith('Dépense')||i.type==='Crédit')?'dep':'autre';
const catList=()=>list('categories').filter(c=>!(typeof catHidden==='function'&&catHidden(c))&&!(typeof catOffUnused==='function'&&catOffUnused(c))).map(c=>c.nom).sort((a,b)=>a.localeCompare(b,LANG));
const catOf=n=>list('categories').find(c=>c.nom===n);
/* Dîme propre à chaque utilisateur : 'never' = ne paie pas la dîme, 'ask' = on demande à chaque revenu, 'always' = proposée par défaut (décochable).
   Jamais figée : le taux (0 si 'never') alimente tous les calculs ; chaque revenu garde son propre choix et son propre taux. */
const dimeMode=()=>'never';   /* v13 : aucun calcul automatique de dîme, d'aumône ou de culte — l'utilisateur saisit lui-même ses montants */
const dimeTaux=()=>0;
const dimeAuto=()=>false;
const cibleCat=(c,rev,months)=>c.nom==='Dîmes'?rev*dimeTaux()/100:num(c.budget)*months;
/* Cible d'une catégorie sur une période : budget annuel saisi (DB.budgets[année][catégorie][12 mois]) sinon cible mensuelle */
/* Inflation annuelle (paramétrable, 3 % par défaut) : plafond de dépenses de l'année N+k = plafond × (1+i)^k,
   afin d'éviter les fausses alertes sur les projections pluriannuelles. Ne s'applique ni aux revenus, ni à l'épargne, ni à la dîme. */
const inflationRate=()=>{const v=DB.profile?.inflation;return v!=null&&v!==''&&isFinite(+v)?Math.max(0,+v)/100:0.03};
const inflFactor=(y,c)=>(!isFutureYear(y)||!c||c.type==='Revenu'||c.type==='Épargne'||c.type==='Investissement'||c.nom==='Dîmes')?1:Math.pow(1+inflationRate(),+y-new Date().getFullYear());
function targetPeriod(c,rev,y,m){
  if(c.provision&&typeof provisionTarget==='function')return provisionTarget(c,rev,y,m);
  if(c.nom==='Dîmes')return rev*dimeTaux()/100;
  if(y==='all')return dataYears().reduce((s,yy)=>s+targetPeriod(c,rev,yy,m),0);
  const b=DB.budgets?.[y]?.[c.nom],all=!m||m==='0',f=inflFactor(y,c);
  if(!b)return num(c.budget)*(all?12:1)*f;
  return (all?b.reduce((x,v)=>x+num(v),0):num(b[+m-1]))*f;
}
const navVisible=k=>k==='admin'?isAdmin():k==='collectif'?!!DB.profile?.collectif:!(typeof navHide==='function'&&navHide(k));
const counted=(i,base)=>i.statut!=='❌ Annulé'&&!(typeof isTiersLine==='function'&&isTiersLine(i))&&(base!==BASES[1]||!i.statut||i.statut==='✅ Payé'||i.statut==='🔁 Automatique');
const dataYears=()=>{const s=[...new Set(list('finances').map(i=>(i.date||'').slice(0,4)).filter(Boolean))].sort();return s.length?s:[String(new Date().getFullYear())]};
const YY=()=>DS.y==='all'?String(new Date().getFullYear()):DS.y;
const nMonths=()=>DS.m==='0'?12*(DS.y==='all'?dataYears().length:1):1;
const inPeriod=(i,y,m)=>(!y||y==='all'||(i.date||'').startsWith(y))&&(!m||m==='0'||(i.date||'').slice(5,7)===String(m).padStart(2,'0'));
const isFutureYear=y=>/^[0-9]{4}$/.test(String(y))&&+y>new Date().getFullYear();
const periodItems=(y,m,base)=>{const b=isFutureYear(y)?BASES[0]:base;return list('finances').filter(i=>counted(i,b)&&inPeriod(i,y,m))};
const sumK=(a,k)=>a.filter(i=>kind(i)===k).reduce((x,i)=>x+num(i.montant),0);
const YEAR_MIN=2020,YEAR_AHEAD=15;/* sélecteur maître : 2020 → N+15 */
const years=()=>{const ys=list('finances').map(i=>+(i.date||'').slice(0,4)).filter(y=>y>=1990&&y<=2100),cy=new Date().getFullYear(),lo=Math.min(YEAR_MIN,...ys),hi=Math.max(cy+YEAR_AHEAD,...ys);return Array.from({length:hi-lo+1},(_,k)=>String(lo+k))};
const DS={y:String(new Date().getFullYear()),m:'0',base:BASES[0]};


const MODULES={
 finances:{label:'Finances',icon:'wallet',sort:'date',defFilters:()=>({_annee:String(new Date().getFullYear())}),defaults:{type:'Dépense Variable',statut:'✅ Payé'},
  fields:[{k:'date',l:'Date',t:'date'},{k:'type',l:'Type',t:'select',o:TYPES},{k:'cat',l:'Catégorie',t:'select',o:()=>catList()},{k:'libelle',l:'Libellé'},{k:'montant',l:'Montant (FCFA)',t:'number'},{k:'statut',l:'Statut',t:'select',o:STATUTS},{k:'note',l:'Notes',t:'textarea',full:1}],
  cols:[{k:'date',l:'Date'},{k:'type',l:'Type',f:i=>badge(i.type)},{k:'cat',l:'Catégorie'},{k:'libelle',l:'Libellé'},{k:'statut',l:'Statut',f:i=>badge(i.statut)},{k:'montant',l:'Montant',cls:'num',f:i=>{const k=kind(i);return `<b class="${amtCls(i)}">${k==='rev'?'+':'−'} ${fmt(i.montant)}</b>`}}],
  rowAct:i=>i.statut==='⏳ En attente'?`<button class="ghost" data-act="pay" data-id="${i.id}" data-k="finances" title="Marquer payé">✅ Payer</button>`:'',
  filters:[{k:'_annee',l:'Année'},{k:'_mois',l:'Mois'},{k:'type',l:'Type'},{k:'cat',l:'Catégorie'},{k:'_groupe',l:'Groupe'},{k:'statut',l:'Statut'}],
  summary:a=>{const b=a.filter(i=>i.statut!=='❌ Annulé'),rev=sumK(b,'rev'),dep=sumK(b,'dep'),epa=sumK(b,'epa'),s=rev-dep-epa;return `<span>Revenus <b class="good">${fmt(rev)}</b></span><span>Dépenses <b class="bad">${fmt(dep)}</b></span><span>Épargne <b>${fmt(epa)}</b></span><span>Solde non affecté <b class="${s<0?'bad':'good'}">${fmt(s)}</b></span>`},
  top:(a,all)=>`<div class="g2"><div class="card"><h2>Revenus vs dépenses</h2>${monthBars(all,UI.finances?.f._annee)}</div><div class="card"><h2>Dépenses par catégorie (filtre actuel)</h2>${donut(group(a.filter(i=>kind(i)==='dep'&&i.statut!=='❌ Annulé'),'cat','montant'))}</div></div>`},
 categories:{label:'Catégories',icon:'folder',sort:'nom',asc:1,defaults:{type:'Dépense Variable',groupe:'Besoins'},
  fields:[{k:'nom',l:'Nom de la catégorie'},{k:'type',l:'Type habituel',t:'select',o:TYPES},{k:'groupe',l:'Groupe',t:'select',o:GROUPES},{k:'budget',l:'Budget cible mensuel (FCFA)',t:'number'},{k:'contenu',l:'Contenu / description',t:'textarea',full:1}],
  cols:[{k:'nom',l:'Catégorie'},{k:'type',l:'Type habituel',f:i=>badge(i.type)},{k:'groupe',l:'Groupe',f:i=>badge(i.groupe)},{k:'budget',l:'Budget cible / mois',cls:'num',f:i=>i.nom==='Dîmes'?`${dimeTaux()} % des revenus`:fmt(i.budget)},{k:'contenu',l:'Contenu',f:i=>esc((i.contenu||'').slice(0,80))}],
  filters:[{k:'type',l:'Type'},{k:'groupe',l:'Groupe'}],top:()=>catTop(),
  summary:a=>`<span>Cible mensuelle (hors revenus) <b>${fmt(a.filter(c=>c.type!=='Revenu').reduce((x,c)=>x+num(c.budget),0))}</b></span><span>Revenus attendus <b class="good">${fmt(a.filter(c=>c.type==='Revenu').reduce((x,c)=>x+num(c.budget),0))}</b></span>`},
 objectifs:{label:"Objectifs d'épargne",icon:'target',sort:'nom',asc:1,card:goalCard,
  fields:[{k:'nom',l:'Objectif',full:1},{k:'cible',l:'Cible (FCFA)',t:'number'},{k:'depuis',l:'Compter depuis le',t:'date'},{k:'cat',l:'Catégorie liée',t:'select',o:()=>['',...catList()]},{k:'mot',l:'Mot-clé dans le libellé (facultatif)'}],
  cols:[{k:'nom',l:'Objectif'},{k:'cible',l:'Cible',cls:'num',f:i=>fmt(i.cible)},{l:'Réalisé',cls:'num',nosort:1,f:i=>fmt(goalStats(i).real)},{l:'Reste',cls:'num',nosort:1,f:i=>fmt(goalStats(i).reste)},{l:'Atteint',cls:'num',nosort:1,f:i=>pct(goalStats(i).real/(num(i.cible)||1)*100)}],
  filters:[],summary:a=>`<span>Cible totale <b>${fmt(a.reduce((x,i)=>x+num(i.cible),0))}</b></span><span>Réalisé <b class="good">${fmt(a.reduce((x,i)=>x+goalStats(i).real,0))}</b></span>`},
 investissements:{label:'Investissements',icon:'trend',sort:'date',defaults:{type:'Actions'},
  fields:[{k:'actif',l:"Actif (ex : Action SIB, Terrain Bingerville)"},{k:'type',l:'Classe',t:'select',o:['Actions','Obligations','Immobilier','Crypto','Épargne','Entreprise','Autre']},{k:'investi',l:'Montant investi (FCFA)',t:'number'},{k:'valeur',l:'Valeur actuelle (FCFA)',t:'number'},{k:'dividendes',l:'Dividendes reçus (FCFA)',t:'number'},{k:'date',l:"Date d'achat",t:'date'}],
  cols:[{k:'actif',l:'Actif'},{k:'type',l:'Classe',f:i=>badge(i.type)},{k:'investi',l:'Investi',cls:'num',f:i=>fmt(i.investi)},{k:'valeur',l:'Valeur',cls:'num',f:i=>fmt(i.valeur)},{k:'dividendes',l:'Dividendes',cls:'num',f:i=>fmt(i.dividendes)},{l:'Rendement',cls:'num',nosort:1,f:i=>{const r=perf(i);return `<b class="${r>=0?'good':'bad'}">${r>=0?'+':''}${pct(r)}</b>`}}],
  filters:[{k:'type',l:'Classe'}],
  summary:a=>{const I=a.reduce((x,i)=>x+num(i.investi),0),V=a.reduce((x,i)=>x+num(i.valeur),0),D=a.reduce((x,i)=>x+num(i.dividendes),0);return `<span>Investi <b>${fmt(I)}</b></span><span>Valeur <b>${fmt(V)}</b></span><span>Dividendes <b>${fmt(D)}</b></span><span>Plus-value <b class="${V+D-I>=0?'good':'bad'}">${fmt(V+D-I)}</b></span>`},
  top:a=>{const V=a.reduce((x,i)=>x+num(i.valeur),0),o=num(DB.profile?.objectif);return `<div class="g2"><div class="card"><h2>Allocation du patrimoine</h2>${donut(group(a,'type','valeur'))}</div><div class="card"><h2>Objectif retraite / patrimoine</h2>${o?`<p>${fmt(V)} sur ${fmt(o)}</p><div class="bar"><i style="width:${Math.min(100,V/o*100)}%"></i></div><p class="mute">${pct(V/o*100)} atteint</p>`:'<p class="mute">Définissez votre objectif dans Réglages.</p>'}</div></div>`}},
 projets:{label:'Projets',icon:'rocket',sort:'echeance',card:projectCard,defaults:{statut:'En cours'},
  fields:[{k:'nom',l:'Nom du projet (crèche, miel, RAFEI…)',full:1},{k:'statut',l:'Statut',t:'select',o:['Idée','En cours','En pause','Terminé']},{k:'echeance',l:'Échéance',t:'date'},{k:'budget',l:'Budget (FCFA)',t:'number'},{k:'depense',l:'Dépensé (FCFA)',t:'number'},{k:'photo',l:'Photo du projet',t:'image',full:1},{k:'taches',l:'Tâches (une par ligne, préfixe "x " si faite)',t:'textarea',full:1}],
  cols:[{k:'nom',l:'Projet'},{k:'statut',l:'Statut',f:i=>badge(i.statut)},{k:'echeance',l:'Échéance'},{k:'budget',l:'Budget',cls:'num',f:i=>fmt(i.budget)},{k:'depense',l:'Dépensé',cls:'num',f:i=>fmt(i.depense)},{l:'Avancement',nosort:1,f:i=>`${taskPct(i)} %`}],
  filters:[{k:'statut',l:'Statut'}],
  summary:a=>`<span>Projets <b>${a.length}</b></span><span>Budget <b>${fmt(a.reduce((x,i)=>x+num(i.budget),0))}</b></span><span>Dépensé <b>${fmt(a.reduce((x,i)=>x+num(i.depense),0))}</b></span>`},
 contacts:{label:'Contacts',icon:'users',sort:'nom',asc:1,card:contactCard,defaults:{categorie:'Ami'},
  fields:[{k:'nom',l:'Nom complet'},{k:'categorie',l:'Catégorie',t:'select',o:['Famille','Ami','Professionnel','Client','Fournisseur','Partenaire','Mentor','Investisseur','Autre']},{k:'entreprise',l:'Entreprise / fonction'},{k:'ville',l:'Ville / pays'},{k:'tel',l:'Téléphone',t:'tel'},{k:'whatsapp',l:'WhatsApp',t:'tel'},{k:'email',l:'Email',t:'email'},{k:'site',l:'Site web / réseau social'},{k:'derniere',l:'Dernière rencontre',t:'date'},{k:'anniv',l:'Anniversaire',t:'date'},{k:'projet',l:'Projet en commun',full:1},{k:'photo',l:'Photo',t:'image',full:1},{k:'note',l:'Historique / notes',t:'textarea',full:1}],
  cols:[{k:'nom',l:'Nom'},{k:'categorie',l:'Catégorie',f:i=>badge(i.categorie)},{k:'entreprise',l:'Entreprise'},{k:'tel',l:'Téléphone',f:i=>i.tel?`<a href="tel:${esc(i.tel)}" onclick="event.stopPropagation()">${esc(i.tel)}</a>`:''},{k:'email',l:'Email',f:i=>i.email?`<a href="mailto:${esc(i.email)}" onclick="event.stopPropagation()">${esc(i.email)}</a>`:''},{k:'ville',l:'Ville'},{k:'derniere',l:'Dernière rencontre'}],
  filters:[{k:'categorie',l:'Catégorie'},{k:'ville',l:'Ville'},{k:'projet',l:'Projet'}],summary:a=>`<span>Contacts <b>${a.length}</b></span><span>Avec email <b>${a.filter(i=>i.email).length}</b></span>`},
 notes:{label:'Notes & idées',icon:'bulb',sort:'created',defaults:{cat:'Idée'},
  fields:[{k:'titre',l:'Titre',full:1},{k:'cat',l:'Catégorie',t:'select',o:['Idée','Note','Réunion','À faire']},{k:'texte',l:'Contenu',t:'textarea',full:1}],
  cols:[{k:'created',l:'Créée',f:i=>(i.created||'').slice(0,10)},{k:'titre',l:'Titre'},{k:'cat',l:'Catégorie',f:i=>badge(i.cat)},{k:'texte',l:'Contenu',f:i=>esc((i.texte||'').slice(0,90))}],
  filters:[{k:'cat',l:'Catégorie'}],summary:a=>`<span>Notes <b>${a.length}</b></span>`},
 journal:{label:'Journal',icon:'book',sort:'date',
  fields:[{k:'date',l:'Date',t:'date',full:1},{k:'reussi',l:"Aujourd'hui j'ai réussi…",t:'textarea',full:1},{k:'appris',l:"Aujourd'hui j'ai appris…",t:'textarea',full:1},{k:'demain',l:'Demain je dois…',t:'textarea',full:1}],
  cols:[{k:'date',l:'Date'},{k:'reussi',l:'Réussi',f:i=>esc((i.reussi||'').slice(0,60))},{k:'appris',l:'Appris',f:i=>esc((i.appris||'').slice(0,60))},{k:'demain',l:'Demain',f:i=>esc((i.demain||'').slice(0,60))}],
  filters:[{k:'_mois',l:'Mois'}],summary:a=>`<span>Entrées <b>${a.length}</b></span><span>Série en cours <b>${streak()} jour(s)</b></span>`},
 sante:{label:'Santé',icon:'heart',sort:'date',
  fields:[{k:'date',l:'Date',t:'date'},{k:'poids',l:'Poids (kg)',t:'number'},{k:'tension',l:'Tension (ex : 12/8)'},{k:'sport',l:'Sport (minutes)',t:'number'},{k:'sommeil',l:'Sommeil (heures)',t:'number'},{k:'meds',l:'Médicaments',full:1}],
  cols:[{k:'date',l:'Date'},{k:'poids',l:'Poids (kg)'},{k:'tension',l:'Tension'},{k:'sport',l:'Sport (min)'},{k:'sommeil',l:'Sommeil (h)'},{k:'meds',l:'Médicaments'}],
  filters:[{k:'_mois',l:'Mois'}],
  top:a=>`<div class="card"><h2>Évolution du poids</h2>${line(a.filter(i=>num(i.poids)).sort((x,y)=>x.date>y.date?1:-1).slice(-20).map(i=>({l:(i.date||'').slice(5),v:num(i.poids)})))}</div>`,
  summary:a=>{const s=a.filter(i=>num(i.sommeil)),sp=a.reduce((x,i)=>x+num(i.sport),0);return `<span>Sport total <b>${sp} min</b></span><span>Sommeil moyen <b>${s.length?(s.reduce((x,i)=>x+num(i.sommeil),0)/s.length).toFixed(1):'—'} h</b></span>`}},
 coffre:{label:'Coffre-fort',icon:'shield',sort:'created',card:vaultCard,
  fields:[{k:'titre',l:'Document (ex : Passeport)',full:1},{k:'type',l:'Type',t:'select',o:['Identité','Diplôme','Assurance','Contrat','Autre']},{k:'expire',l:"Date d'expiration",t:'date'},{k:'fichier',l:'Image ou PDF (PDF max 700 Ko)',t:'file',full:1}],
  cols:[{k:'titre',l:'Document'},{k:'type',l:'Type',f:i=>badge(i.type)},{k:'expire',l:'Expiration'},{l:'Fichier',nosort:1,f:i=>i.fichier?`<a href="${esc(i.fichier)}" download="${esc(i.titre)}" onclick="event.stopPropagation()">Télécharger</a>`:'—'}],
  filters:[{k:'type',l:'Type'}],summary:a=>`<span>Documents <b>${a.length}</b></span>`}
};
const perf=i=>num(i.investi)?((num(i.valeur)+num(i.dividendes)-num(i.investi))/num(i.investi)*100):0;
function group(a,k,v){const g={};a.forEach(i=>{const c=i[k]||'Autre';g[c]=(g[c]||0)+num(i[v])});return Object.entries(g).map(([l,v])=>({l,v})).filter(x=>x.v>0).sort((a,b)=>b.v-a.v)}
function taskPct(i){const t=(i.taches||'').split('\n').filter(x=>x.trim());return t.length?Math.round(t.filter(x=>/^x /i.test(x)).length/t.length*100):0}
function streak(){const d=new Set(list('journal').map(j=>j.date));let n=0,t=new Date();if(!d.has(today()))t.setDate(t.getDate()-1);while(d.has(t.toISOString().slice(0,10))){n++;t.setDate(t.getDate()-1)}return n}

/* ---------- Cartes ---------- */
const actions=(k,i)=>`<div class="ca"><button class="ghost" data-e="${i.id}" data-k="${k}">${ic('edit')} Modifier</button><button class="ghost" data-act="dup" data-id="${i.id}" data-k="${k}">${ic('copy')} Dupliquer</button><button class="ghost danger" data-act="del" data-id="${i.id}" data-k="${k}">${ic('trash')} Supprimer</button></div>`;
function removeItems(k,ids){
  const set=new Set(ids);
  if(k==='finances')list(k).forEach(x=>{if(x.auto&&x.lien&&set.has(x.lien))set.add(x.id)});
  const gone=list(k).filter(x=>set.has(x.id));if(!gone.length)return;
  DB[k]=list(k).filter(x=>!set.has(x.id));if(UI[k])UI[k].sel.clear();save();render();
  toast(`🗑 ${gone.length} supprimé(s)`,()=>{DB[k]=[...list(k),...gone];save();render()});
}
function setStatut(ids,st){const s=new Set(ids);list('finances').forEach(i=>{if(s.has(i.id))i.statut=st});if(UI.finances)UI.finances.sel.clear();save();render();toast(`✔ ${ids.length} ligne(s) : ${st}`)}
function syncDime(o,isNew,want,rate){
  if(!dimeAuto())return;
  const fin=list('finances'),linked=fin.find(x=>x.lien===o.id&&x.auto),tx=num(rate)>0?num(rate):dimeTaux();
  if(linked&&want===false){DB.finances=fin.filter(x=>x!==linked);return}
  if(o.type==='Revenu'&&o.statut!=='❌ Annulé'&&num(o.montant)>0&&(linked||(isNew&&want))){
    const m=Math.round(num(o.montant)*tx/100),lib='Dîme — '+(o.libelle||o.cat);
    if(linked){linked.montant=m;linked.date=o.date;linked.libelle=lib;linked.note=`Dîme : ${tx} % de ${fmt(o.montant)}`;linked.dimeTaux=tx}
    else fin.push({id:uid(),created:new Date().toISOString(),date:o.date,type:'Dépense Fixe',cat:'Dîmes',libelle:lib,montant:m,statut:'⏳ En attente',note:`Dîme : ${tx} % de ${fmt(o.montant)}`,lien:o.id,auto:1,dimeTaux:tx});
  }else if(linked&&o.type!=='Revenu'){DB.finances=fin.filter(x=>x!==linked)}
}
function projectCard(i){
  const bud=num(i.budget),dep=num(i.depense),tasks=(i.taches||'').split('\n').map((t,ix)=>({t,ix})).filter(x=>x.t.trim());
  return `<div class="pc">${i.photo?`<img class="ph" src="${esc(i.photo)}" alt="">`:'<div class="ph">🚀</div>'}<div class="pb"><div class="t">${esc(i.nom)} ${badge(i.statut)}</div>
  <div class="s">Échéance : ${esc(i.echeance||'—')}</div>
  <div class="s">Budget ${fmt(bud)} · dépensé ${fmt(dep)}</div><div class="bar"><i style="width:${bud?Math.min(100,dep/bud*100):0}%"></i></div>
  <div class="s">Avancement ${taskPct(i)} %</div><div class="bar"><i style="width:${taskPct(i)}%"></i></div>
  ${tasks.map(({t,ix})=>{const d=/^x /i.test(t);return `<label class="tk"><input type="checkbox" data-tk="${i.id}:${ix}" ${d?'checked':''}><span class="${d?'done':''}">${esc(t.replace(/^x /i,''))}</span></label>`}).join('')}
  ${actions('projets',i)}</div></div>`;
}
function contactCard(i){
  const wa=(i.whatsapp||i.tel||'').replace(/\D/g,'');
  return `<div class="pc"><div class="ct">${i.photo?`<img class="av" src="${esc(i.photo)}" alt="">`:`<div class="av">${esc(initials(i.nom))}</div>`}<div><div class="t">${esc(i.nom)}</div>${i.categorie?badge(i.categorie):''} ${i.projet?badge(i.projet):''}</div></div>
  <div class="pb" style="padding-top:0">${i.entreprise?`<div class="s">🏢 ${esc(i.entreprise)}</div>`:''}${i.ville?`<div class="s">📍 ${esc(i.ville)}</div>`:''}${i.tel?`<div class="s">📞 <a href="tel:${esc(i.tel)}">${esc(i.tel)}</a></div>`:''}${i.email?`<div class="s">✉ <a href="mailto:${esc(i.email)}">${esc(i.email)}</a></div>`:''}${i.site?`<div class="s">🔗 ${esc(i.site)}</div>`:''}
  <div class="s">Dernière rencontre : ${esc(i.derniere||'—')}${i.anniv?` · 🎂 ${esc(i.anniv.slice(5))}`:''}</div>${i.note?`<div class="s">${esc(i.note)}</div>`:''}
  <div class="ca">${i.email?`<a href="mailto:${esc(i.email)}"><button type="button" class="ghost">✉ Mail</button></a>`:''}${wa?`<a href="https://wa.me/${wa}" target="_blank" rel="noopener"><button type="button" class="ghost">💬 WhatsApp</button></a>`:''}</div>${actions('contacts',i)}</div></div>`;
}
function goalStats(o){
  const rows=list('finances').filter(i=>i.type==='Épargne'&&i.statut!=='❌ Annulé'&&(!o.cat||i.cat===o.cat)&&(!o.mot||(i.libelle||'').toLowerCase().includes(String(o.mot).toLowerCase()))&&(!o.depuis||(i.date||'')>=o.depuis));
  const real=rows.filter(i=>i.statut!=='⏳ En attente').reduce((x,i)=>x+num(i.montant),0),prevu=rows.reduce((x,i)=>x+num(i.montant),0);
  return {real,prevu,reste:Math.max(0,num(o.cible)-real)};
}
function goalCard(o){
  const s=goalStats(o),p=Math.min(100,s.real/(num(o.cible)||1)*100);
  return `<div class="pc"><div class="pb"><div class="t">🎯 ${esc(o.nom)}</div><div class="s">Cible ${fmt(o.cible)} · depuis ${esc(o.depuis||'—')}</div><div class="bar"><i style="width:${p}%"></i></div>
  <div class="s"><b class="good">${fmt(s.real)}</b> réalisé (${pct(p)}) · reste ${fmt(s.reste)}</div><div class="s">Prévu incl. en attente : ${fmt(s.prevu)}</div>${actions('objectifs',o)}</div></div>`;
}
function vaultCard(i){
  const img=(i.fichier||'').startsWith('data:image');const soon=i.expire&&i.expire<new Date(Date.now()+90*864e5).toISOString().slice(0,10);
  return `<div class="pc">${img?`<img class="ph" src="${esc(i.fichier)}" alt="">`:`<div class="ph">${i.fichier?'📄':'🔐'}</div>`}<div class="pb"><div class="t">${esc(i.titre)} ${badge(i.type)}</div>
  <div class="s ${soon?'bad':''}">${soon?'⚠ ':''}Expire : ${esc(i.expire||'—')}</div>${i.fichier?`<a href="${esc(i.fichier)}" download="${esc(i.titre)}">⬇ Télécharger</a>`:''}${actions('coffre',i)}</div></div>`;
}

/* ---------- Graphiques SVG ---------- */
function monthBars(all,y){
  const labels=[],a=[],b=[],now=new Date();
  const mk=(key,l)=>{labels.push(l);const m=all.filter(i=>counted(i,BASES[0])&&(i.date||'').startsWith(key));a.push(sumK(m,'rev'));b.push(sumK(m,'dep'))};
  if(y&&/^\d{4}$/.test(y))for(let n=1;n<=12;n++)mk(y+'-'+String(n).padStart(2,'0'),MOIS[n-1]);
  else for(let n=5;n>=0;n--){const x=new Date(now.getFullYear(),now.getMonth()-n,1);mk(x.toISOString().slice(0,7),MOIS[x.getMonth()])}
  const N=labels.length,W=520,H=170,max=Math.max(1,...a,...b),bw=W/N;
  return `<svg viewBox="0 0 ${W} ${H+24}" class="chart">${[0,.5,1].map(f=>`<line x1="0" x2="${W}" y1="${H-H*f}" y2="${H-H*f}" stroke="rgba(255,255,255,.08)"/>`).join('')}${labels.map((l,i)=>{const x=i*bw+bw*.12,w=bw*.36,h1=a[i]/max*H,h2=b[i]/max*H;
    return `<rect x="${x}" y="${H-h1}" width="${w}" height="${h1}" rx="3" style="fill:var(--lime)"><title>${l} — Revenus ${fmt(a[i])}</title></rect><rect x="${x+w+2}" y="${H-h2}" width="${w}" height="${h2}" rx="3" style="fill:var(--bad)"><title>${l} — Dépenses ${fmt(b[i])}</title></rect><text x="${x+w}" y="${H+16}" text-anchor="middle">${l}</text>`}).join('')}</svg>
  <div class="leg"><span><i style="background:var(--lime)"></i>Revenus</span><span><i style="background:var(--bad)"></i>Dépenses</span></div>`;
}
function donut(items){
  const t=items.reduce((a,i)=>a+i.v,0);if(!t)return '<p class="mute">Aucune donnée pour le moment.</p>';
  let a0=-Math.PI/2;const R=70,r=42,c=75;
  const paths=items.map((it,ix)=>{const f=Math.min(it.v/t,.9999),a1=a0+f*2*Math.PI,lg=f>.5?1:0,p=(rr,a)=>`${c+rr*Math.cos(a)} ${c+rr*Math.sin(a)}`;
    const d=`M${p(R,a0)} A${R} ${R} 0 ${lg} 1 ${p(R,a1)} L${p(r,a1)} A${r} ${r} 0 ${lg} 0 ${p(r,a0)}Z`;a0+=f*2*Math.PI;return `<path d="${d}" style="fill:${PALETTE[ix%8]}"><title>${esc(it.l)} : ${fmt(it.v)}</title></path>`}).join('');
  return `<div class="donut"><svg viewBox="0 0 150 150">${paths}</svg><div class="leg" style="flex-direction:column">${items.slice(0,8).map((it,ix)=>`<span><i style="background:${PALETTE[ix%8]}"></i>${esc(it.l)} — ${fmt(it.v)} (${Math.round(it.v/t*100)}%)</span>`).join('')}</div></div>`;
}
function line(pts){
  if(pts.length<2)return '<p class="mute">Ajoutez au moins 2 mesures pour voir la courbe.</p>';
  const W=520,H=150,min=Math.min(...pts.map(p=>p.v))-1,max=Math.max(...pts.map(p=>p.v))+1;
  const xy=pts.map((p,i)=>[i/(pts.length-1)*(W-20)+10,H-(p.v-min)/(max-min)*H+5]);
  return `<svg viewBox="0 0 ${W} ${H+28}" class="chart"><polyline points="${xy.map(p=>p.join(',')).join(' ')}" fill="none" style="stroke:var(--brand)" stroke-width="3"/>${xy.map((p,i)=>`<circle cx="${p[0]}" cy="${p[1]}" r="4" style="fill:var(--lime)"><title>${pts[i].l} : ${pts[i].v}</title></circle>`).join('')}
  <text x="10" y="${H+22}">${pts[0].l}</text><text x="${W-10}" y="${H+22}" text-anchor="end">${pts[pts.length-1].l}</text></svg>`;
}

/* ---------- Formulaire modal ---------- */
function openForm(k,id,prefill){
  const m=MODULES[k],items=list(k),e=id&&items.find(x=>x.id===id);
  const val=f=>e?e[f.k]:(prefill?.[f.k]??m.defaults?.[f.k]??(f.t==='date'?today():''));
  const fieldHtml=f=>{const v=val(f)??'',cl=f.full||['textarea','image','file'].includes(f.t)?' class="full"':'';
    let inp;
    if(f.t==='select'){let os=typeof f.o==='function'?f.o():[...f.o];if(v&&!os.includes(v))os=[v,...os];inp=`<select name="${f.k}">${os.map(o=>`<option value="${esc(o)}" ${o===v?'selected':''}>${esc(o)||'— aucune —'}</option>`).join('')}</select>`}
    else if(f.t==='textarea')inp=`<textarea name="${f.k}">${esc(v)}</textarea>`;
    else if(f.t==='image')inp=`<input type="file" name="${f.k}" accept="image/*">${v?`<img class="prev" src="${esc(v)}" alt="">`:''}`;
    else if(f.t==='file')inp=`<input type="file" name="${f.k}" accept="image/*,application/pdf">${v?'<div class="mute">Fichier déjà enregistré (laisser vide pour le conserver)</div>':''}`;
    else inp=`<input name="${f.k}" type="${f.t||'text'}" value="${esc(v)}" ${f.t==='number'?'step="any" min="0"':''} ${f===m.fields[0]&&!e?'autofocus':''}>`;
    return `<div${cl}><label>${f.l}</label>${inp}</div>`};
  const ov=document.createElement('div');ov.className='ov';
  ov.innerHTML=`<form class="card modal"><h2>${e?'Modifier':'Ajouter'} — ${ic(m.icon)} ${m.label}</h2><div class="fg">${m.fields.map(fieldHtml).join('')}</div>
   <div class="mact" style="justify-content:space-between"><div>${e?`<button type="button" class="ghost danger" data-del>🗑 Supprimer</button> <button type="button" class="ghost" data-dup>⧉ Dupliquer</button>`:''}</div><div style="display:flex;gap:8px"><button type="button" class="ghost" data-x>Annuler</button><button>💾 Enregistrer</button></div></div></form>`;
  document.body.appendChild(ov);
  const close=()=>{ov.remove();document.removeEventListener('keydown',esc_)};
  const esc_=ev=>{if(ev.key==='Escape')close()};document.addEventListener('keydown',esc_);
  ov.onclick=ev=>{
    if(ev.target.closest('[data-del]')){close();removeItems(k,[e.id]);return}
    if(ev.target.closest('[data-dup]')){const {id,created,...cp}=e;close();openForm(k,null,cp);return}
    if(ev.target===ov||ev.target.closest('[data-x]'))close()};
  const cs=ov.querySelector('select[name=cat]'),ts=ov.querySelector('select[name=type]');
  if(k==='finances'&&cs&&ts&&!e)cs.onchange=()=>{const c=catOf(cs.value);if(c&&c.type)ts.value=c.type};
  ov.querySelector('form').onsubmit=async ev=>{ev.preventDefault();
    const fd=new FormData(ev.target),o=e||{id:uid(),created:new Date().toISOString()};
    for(const f of m.fields){
      if(f.t==='image'||f.t==='file'){const fl=fd.get(f.k);if(fl&&fl.size){
        if(fl.type.startsWith('image/'))o[f.k]=await imgData(fl,f.t==='image'?640:1000);
        else if(fl.size>700*1024){toast('Fichier trop gros (700 Ko max).');return}else o[f.k]=await readData(fl)}}
      else o[f.k]=f.t==='number'?num(fd.get(f.k)):String(fd.get(f.k)??'').trim()}
    if(!e)items.push(o);
    save();close();toast(e?'✔ Modifié':'✔ Ajouté');render();
  };
}
const readData=f=>new Promise(r=>{const x=new FileReader();x.onload=()=>r(x.result);x.readAsDataURL(f)});
const imgData=(f,max)=>new Promise(r=>{const im=new Image();im.onload=()=>{const s=Math.min(1,max/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=Math.round(im.width*s);c.height=Math.round(im.height*s);c.getContext('2d').drawImage(im,0,0,c.width,c.height);r(c.toDataURL('image/jpeg',.82))};im.onerror=()=>readData(f).then(r);im.src=URL.createObjectURL(f)});

/* ---------- Récapitulatifs (cible / réalisé / reste), par groupe et par catégorie ---------- */
const GICON={'Religion / Culte':'gift','Revenus':'trend','Besoins':'home','Envies':'gift','Dettes & Remboursements':'wallet','Fonds perdus':'alert','Épargne':'coins','Investissement Bourse':'trend','Non classé':'folder'};
const isGood=c=>c.type==='Revenu'||c.type==='Épargne'||c.type==='Investissement';
function rstat(c,t,r){
  const rev=c.type==='Revenu',sav=c.type==='Épargne'||c.type==='Investissement',good=rev||sav,p=t?r/t*100:(r?100:0),d=t-r;
  if(!t)return{l:'Reste',v:'—',cls:'mute',acc:'a0',p,over:false};
  if(d>.5)return{l:rev?'Reste à recevoir':sav?'Reste à épargner':'Reste disponible',v:fmt(d),cls:good?'warn':'good',acc:good?'a3':'a4',p,over:false};
  if(d>=-.5)return{l:'Reste',v:fmt(0),cls:'good',acc:'a4',p,over:false};
  return{l:good?'Surplus':'Dépassement',v:fmt(-d),cls:good?'good':'bad',acc:good?'a4':'a2',p,over:!good};
}
const tile=(l,v,cls,acc)=>`<div class="tile ${acc||''}"><small>${l}</small><b class="${cls||''}">${v}</b></div>`;
function recapCard({title,icon,sub,tiles,p=0,over,foot,btn,mini}){
  return `<div class="card recap${mini?' mini':''}"><h2>${icon?ic(icon):''}<span>${title}</span>${sub?`<small class="mute">${sub}</small>`:''}</h2><div class="tiles">${tiles.join('')}</div><div class="bar${over?' over':''}"><i style="width:${Math.min(100,Math.max(0,p))}%"></i></div>${foot?`<div class="rfoot">${foot}</div>`:''}${btn?`<div class="rbtn">${btn}</div>`:''}</div>`;
}
/* Une ligne par catégorie : cible de la période et réalisé (revenus pour les catégories de revenu, sorties sinon) */
function budgetRows(a,rv,months){
  return list('categories').filter(c=>!(typeof catHidden==='function'&&catHidden(c))&&!(typeof catDormant==='function'&&catDormant(c))).map(c=>({c,t:targetPeriod(c,rv,DS.y,DS.m),r:a.filter(i=>i.cat===c.nom&&(c.type==='Revenu'?kind(i)==='rev':kind(i)!=='rev')).reduce((x,i)=>x+num(i.montant),0)}));
}
const grpOf=c=>GROUPES.includes(c.groupe)?c.groupe:'Non classé';
function grpTotals(rows){
  const g={};rows.forEach(x=>{const k=grpOf(x.c);(g[k]=g[k]||{k,rows:[],t:0,r:0});g[k].rows.push(x);g[k].t+=x.t;g[k].r+=x.r});
  return [...GROUPES,'Non classé'].filter(k=>g[k]).map(k=>g[k]);
}
function groupCard(G,mini){
  const rv=G.k==='Revenus',s=rstat({type:rv?'Revenu':'Dépense Fixe'},G.t,G.r);
  return recapCard({title:G.k,icon:GICON[G.k],sub:`${G.rows.length} catégorie(s)`,mini,p:s.p,over:s.over,
    tiles:[tile(rv?'Attendus':'Budget cible',fmt(G.t),'','a1'),tile(rv?'Reçus':'Réalisé',fmt(G.r),rv?'good':'','a4'),tile(s.l,s.v,s.cls,s.acc)],
    foot:G.t?`${pct(s.p)} ${rv?'du prévu encaissé':'du budget utilisé'}`:'Aucune cible définie pour ce groupe'});
}
function catCard({c,t,r}){
  const s=rstat(c,t,r),rv=c.type==='Revenu';
  return `<div class="cat${s.over?' over':''}"><div class="ct1"><b>${esc(c.nom)}</b>${t?`<span class="pill ${s.over?'bad':s.p>=100?'good':'brand'}">${pct(s.p)}</span>`:''}</div>
  <div class="trio"><div><small>${rv?'Attendu':'Cible'}</small><span>${t?fmt(t):'—'}</span></div><div><small>${rv?'Reçu':'Réalisé'}</small><span>${fmt(r)}</span></div><div><small>${s.l}</small><span class="${s.cls}">${s.v}</span></div></div>
  <div class="bar${s.over?' over':''}"><i style="width:${Math.min(100,s.p)}%"></i></div></div>`;
}
function recapSection(a,rv,months){
  return grpTotals(budgetRows(a,rv,months)).map(G=>{
    const act=G.rows.filter(x=>x.t||x.r).sort((x,y)=>y.r-x.r),idle=G.rows.filter(x=>!x.t&&!x.r);
    return `<section class="grp">${groupCard(G)}${act.length?`<div class="catgrid">${act.map(catCard).join('')}</div>`:''}${idle.length?`<p class="mute idle">Sans cible ni mouvement sur la période : ${idle.map(x=>esc(x.c.nom)).join(', ')}</p>`:''}</section>`}).join('')||`<div class="card empty">${t('Aucun budget ni mouvement pour le moment.')} <a href="#" data-go="budgetan">${t('Préparer mon budget annuel')}</a> · <a href="#" data-new="finances">${t('Ajouter une écriture')}</a></div>`;
}
function catTop(){const a=periodItems(DS.y,DS.m,DS.base);return ctlHtml()+recapSection(a,sumK(a,'rev'),DS.m==='0'?12:1)}


/* ---------- IA ---------- */
let chat=[];
function ia(el){
  const sug=['Combien ai-je dépensé ce mois ?','Résume l\'état de mes projets','Prépare ma prochaine réunion','Génère un business plan pour mon projet','Quel est le rendement de mes investissements ?'];
  el.innerHTML=`<div class="head"><h1>${ic('bot')} IA personnelle</h1></div><div class="card chat" id="chat">${chat.map(m=>`<div class="msg ${m.r}">${esc(m.c)}</div>`).join('')||'<span class="mute">Posez une question sur vos données ou demandez un document.</span>'}</div>
  <form id="q" class="card"><input name="q" placeholder="Posez votre question…" autocomplete="off" autofocus><div class="chips">${sug.map(s=>`<button type="button" class="ghost" data-s="${esc(s)}">${esc(s)}</button>`).join('')}</div><p><button>Envoyer</button> ${chat.length?'<button type="button" class="ghost" id="clr">Effacer</button>':''}</p>
  <p class="mute">${CFG.apiKey?'IA complète activée.':'Sans clé API (à configurer par un administrateur), seule la question sur les dépenses du mois fonctionne.'}</p></form>`;
  const go=async q=>{q=q.trim();if(!q)return;chat.push({r:'u',c:q},{r:'a',c:'…'});render();chat[chat.length-1].c=await ask(q);render();const c=$('#chat');if(c)c.scrollTop=1e9};
  $('#q').onsubmit=ev=>{ev.preventDefault();go(new FormData(ev.target).get('q'))};
  el.querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>go(b.dataset.s));
  if($('#clr'))$('#clr').onclick=()=>{chat=[];render()};
}
function context(){const keep=(k,n)=>JSON.stringify(list(k).slice(-n).map(({id,created,fichier,photo,...r})=>r));
  return `Date: ${today()}. Données de l'utilisateur (devise : ${CURR}, langue : ${LNAME[LANG]}).\nFinances: ${keep('finances',150)}\nInvestissements: ${keep('investissements',40)}\nProjets: ${keep('projets',30)}\nContacts: ${keep('contacts',60)}\nNotes: ${keep('notes',40)}\nSanté: ${keep('sante',30)}`}
async function ask(q){
  const key=CFG.apiKey;
  if(!key){if(/d[ée]pens/i.test(q)){const m=today().slice(0,7),t=list('finances').filter(i=>kind(i)==='dep'&&counted(i,BASES[0])&&(i.date||'').startsWith(m)).reduce((a,i)=>a+num(i.montant),0);return `Vous avez dépensé ${fmt(t)} ce mois-ci.`}return "Ajoutez votre clé API dans Réglages pour activer l'IA complète."}
  try{const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'content-type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
    body:JSON.stringify({model:CFG.model||'claude-haiku-5-5',max_tokens:1500,system:"Tu es l'assistant personnel de l'utilisateur (LUMINA). Réponds dans la langue de l'utilisateur ("+LNAME[LANG]+"), de façon concise et concrète, en t'appuyant sur ses données.\n"+context(),messages:chat.filter(m=>m.c!=='…').slice(-10).map(m=>({role:m.r==='u'?'user':'assistant',content:m.c}))})});
    const j=await r.json();return j.content?.[0]?.text||('Erreur : '+(j.error?.message||'réponse vide'))}catch(e){return 'Erreur réseau : '+e.message}
}

/* ---------- Export Excel (.xlsx natif, sans bibliothèque, fonctionne hors-ligne) ---------- */
const CRCT=(()=>{const t=[];for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
const crc32=b=>{let c=0xFFFFFFFF;for(let i=0;i<b.length;i++)c=CRCT[(c^b[i])&255]^(c>>>8);return (c^0xFFFFFFFF)>>>0};
function zip(files){
  const enc=new TextEncoder(),parts=[],cd=[];let off=0;
  for(const f of files){const nm=enc.encode(f.name),crc=crc32(f.data),sz=f.data.length;
    const lh=new DataView(new ArrayBuffer(30));lh.setUint32(0,0x04034b50,true);lh.setUint16(4,20,true);lh.setUint16(6,0x0800,true);lh.setUint16(12,0x21,true);lh.setUint32(14,crc,true);lh.setUint32(18,sz,true);lh.setUint32(22,sz,true);lh.setUint16(26,nm.length,true);
    parts.push(new Uint8Array(lh.buffer),nm,f.data);
    const ch=new DataView(new ArrayBuffer(46));ch.setUint32(0,0x02014b50,true);ch.setUint16(4,20,true);ch.setUint16(6,20,true);ch.setUint16(8,0x0800,true);ch.setUint16(14,0x21,true);ch.setUint32(16,crc,true);ch.setUint32(20,sz,true);ch.setUint32(24,sz,true);ch.setUint16(28,nm.length,true);ch.setUint32(42,off,true);
    cd.push(new Uint8Array(ch.buffer),nm);off+=30+nm.length+sz}
  const cds=cd.reduce((a,p)=>a+p.length,0),end=new DataView(new ArrayBuffer(22));
  end.setUint32(0,0x06054b50,true);end.setUint16(8,files.length,true);end.setUint16(10,files.length,true);end.setUint32(12,cds,true);end.setUint32(16,off,true);
  return new Blob([...parts,...cd,new Uint8Array(end.buffer)],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
}
const xe=s=>String(s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const colL=n=>{let s='';n++;while(n){const r=(n-1)%26;s=String.fromCharCode(65+r)+s;n=Math.floor((n-1)/26)}return s};
function xlsx(sheets){
  const enc=new TextEncoder(),X='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
  const names=sheets.map((s,i)=>(s.name.replace(/[\\/?*\[\]:]/g,' ').slice(0,31)||'Feuille'+(i+1)));
  const sheetXml=s=>{const cols=Math.max(...s.rows.map(r=>r.length),1);
    return X+`<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols><col min="1" max="${cols}" width="22" customWidth="1"/></cols><sheetData>${s.rows.map((r,ri)=>`<row r="${ri+1}">${r.map((v,ci)=>{const ref=colL(ci)+(ri+1),st=ri===0?' s="1"':'';
      return typeof v==='number'&&isFinite(v)?`<c r="${ref}"${st}><v>${v}</v></c>`:`<c r="${ref}"${st} t="inlineStr"><is><t xml:space="preserve">${xe(v??'')}</t></is></c>`}).join('')}</row>`).join('')}</sheetData><autoFilter ref="A1:${colL(cols-1)}${Math.max(s.rows.length,1)}"/></worksheet>`};
  const files=[
   {name:'[Content_Types].xml',s:X+`<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`},
   {name:'_rels/.rels',s:X+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'},
   {name:'xl/workbook.xml',s:X+`<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${names.map((n,i)=>`<sheet name="${xe(n)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')}</sheets></workbook>`},
   {name:'xl/_rels/workbook.xml.rels',s:X+`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`},
   {name:'xl/styles.xml',s:X+'<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF4B4F8F"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>'},
   ...sheets.map((s,i)=>({name:`xl/worksheets/sheet${i+1}.xml`,s:sheetXml(s)}))];
  return zip(files.map(f=>({name:f.name,data:enc.encode(f.s)})));
}
function download(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove()}
const exportable=m=>m.fields.filter(f=>!['image','file'].includes(f.t));
function sheetOf(k,items){const m=MODULES[k],fs=exportable(m);
  return {name:t(m.label),rows:[[...fs.map(f=>t(f.l).replace(/\s*\(.*\)$/,'')),...(k==='investissements'?['Rendement %']:[])],...items.map(i=>[...fs.map(f=>f.t==='number'?num(i[f.k]):(i[f.k]??'')),...(k==='investissements'?[Math.round(perf(i)*10)/10]:[])])]}}
function exportModule(k){download(xlsx([sheetOf(k,filtered(k))]),`lumina-${k}-${today()}.xlsx`);toast('✔ Fichier Excel téléchargé')}
function exportAll(){download(xlsx(Object.keys(MODULES).map(k=>sheetOf(k,list(k)))),`lumina-complet-${today()}.xlsx`);toast('✔ Classeur Excel complet téléchargé')}

/* ---------- Rôles & fenêtres de saisie de mot de passe ---------- */
const isAdmin=()=>ME?.role==='admin';
function passModal(title,fields){
  return new Promise(res=>{const ov=document.createElement('div');ov.className='ov';
    ov.innerHTML=`<form class="card modal" style="max-width:420px"><h2>${title}</h2>${fields.map((f,i)=>`<div style="margin-bottom:10px"><label>${f}</label><input type="password" name="p${i}" ${i?'':'autofocus'} autocomplete="new-password"></div>`).join('')}<div class="mact"><button type="button" class="ghost" data-x>Annuler</button><button>Valider</button></div></form>`;
    document.body.appendChild(ov);const done=v=>{ov.remove();res(v)};
    ov.onclick=e=>{if(e.target===ov||e.target.dataset.x!==undefined)done(null)};
    ov.querySelector('form').onsubmit=e=>{e.preventDefault();const f=new FormData(e.target);done(fields.map((_,i)=>f.get('p'+i)))}});
}

/* ---------- Réglages (tous les utilisateurs) ---------- */
function reglages(el){
  const p=DB.profile||{};
  el.innerHTML=`<div class="head"><h1>${ic('settings')} Réglages</h1></div>
  <div class="card"><h2>Profil</h2><form id="pf" class="fg"><div><label>Votre prénom</label><input name="nom" value="${esc(p.nom||'')}"></div><div><label>Objectif de patrimoine (FCFA)</label><input name="objectif" type="number" min="0" value="${esc(p.objectif||'')}"></div><div><label>Votre email</label><input name="email" type="email" value="${esc(p.email||'')}"></div><div><label>Votre téléphone</label><input name="tel" type="tel" value="${esc(p.tel||'')}"></div><div><label>Ville / pays</label><input name="ville" value="${esc(p.ville||'')}"></div><div><label>Budget mensuel de dépenses (FCFA)</label><input name="budget" type="number" min="0" value="${esc(p.budget||'')}"></div><div><label>Langue</label><select name="lang">${langOpts(LANG)}</select></div><div><label>Pays</label><select name="country">${countryOpts(COUNTRY)}</select></div><div><label>Devise</label><select name="currency">${currencyOpts(CURR)}</select></div><p class="mute small full" style="margin:0">Changer la devise change seulement l’affichage : les montants déjà saisis ne sont pas convertis.</p><div class="full"><button>Enregistrer</button></div></form></div>
  <div class="card"><h2>${ic('wallet')} Modules facultatifs</h2><label class="chk"><input type="checkbox" id="mc" ${p.collectif?'checked':''}> Suivre un fonds collectif (caisse d’un service, d’une association, d’un groupe…)</label><div class="fg" style="margin-top:10px"><div><label>Nom du fonds (ex. DTA)</label><input id="mcn" value="${esc(p.collectifNom||'')}"></div></div><p style="margin:10px 0 0"><button class="ghost" id="mcs">Enregistrer</button></p></div>
  <div class="card"><h2>${ic('shield')} Sécurité du compte</h2><p class="mute">${t('Connecté en tant que')} <b>${esc(ME.nom)}</b> (${t(isAdmin()?'administrateur':'utilisateur')}). ${t('Vos données sont enregistrées dans un espace réservé à ce compte ; les autres utilisateurs de l’application n’y ont pas accès.')}</p><p><button class="ghost" id="cpw">Changer mon mot de passe</button> <button class="ghost" id="lo2">${ic('logout')} Se déconnecter</button> <button class="ghost danger" id="delme">${ic('trash')} Supprimer mon compte</button></p></div>
  <div class="card"><h2>Export Excel</h2><p class="mute">Télécharge toutes vos données dans un classeur Excel (.xlsx), une feuille par module. Chaque module a aussi son bouton « Excel » avec les filtres appliqués. Faites-le régulièrement : vos données sont stockées sur cet appareil.</p><button id="xa">${ic('download')} Télécharger le classeur Excel complet</button></div>
  ${isAdmin()?`<div class="card"><h2>${ic('code')} Administration</h2><p class="mute">Gestion des utilisateurs, clé API, coordonnées de support, diagnostic.</p><button class="ghost" data-go="admin">Ouvrir l’administration</button></div>`:''}`;
  $('#pf').onsubmit=ev=>{ev.preventDefault();const f=new FormData(ev.target);DB.profile={...DB.profile,nom:f.get('nom').trim(),objectif:num(f.get('objectif')),budget:num(f.get('budget')),email:f.get('email').trim(),tel:f.get('tel').trim(),ville:f.get('ville').trim(),lang:f.get('lang'),country:f.get('country'),currency:f.get('currency')};save();applyPrefs(DB.profile);render();toast('✔ Profil enregistré')};
  {const pf=$('#pf');pf.country.onchange=()=>{const x=countryDefaults(pf.country.value);if(x.currency)pf.currency.value=x.currency;if(x.lang)pf.lang.value=x.lang}}
  $('#xa').onclick=exportAll;$('#mcs').onclick=()=>{DB.profile={...DB.profile,collectif:$('#mc').checked,collectifNom:$('#mcn').value.trim()};save();render();toast('✔ Enregistré')};$('#cpw').onclick=changeMyPassword;$('#lo2').onclick=logout;$('#delme').onclick=deleteMyAccount;
}

/* ---------- Administration (administrateurs uniquement) ---------- */
function admin(el){
  if(!isAdmin()){go('dash');return}
  const bytes=new Blob([localStorage.getItem(KEY)||'']).size,us=users();
  el.innerHTML=`<div class="head"><h1>${ic('code')} Administration</h1><div class="acts"><span class="b" style="--h:150">Administrateur</span></div></div>
  <div class="card"><h2>${ic('users')} Utilisateurs (${us.length})</h2><div class="tw"><table><thead><tr><th>Nom</th><th>Rôle</th><th>Créé le</th><th class="num">Opérations</th></tr></thead><tbody>${us.map(u=>`<tr><td><b>${esc(u.nom)}</b>${u.id===ME.id?' <span class="mute">(vous)</span>':''}</td><td>${badge(u.role==='admin'?'Administrateur':'Utilisateur')}</td><td>${esc((u.created||'').slice(0,10))}</td><td class="num act">${u.id!==ME.id?`<button class="ghost" data-ur="${u.id}">Réinitialiser le mot de passe</button><button class="ghost" data-ut="${u.id}">${u.role==='admin'?'Rétrograder':'Promouvoir admin'}</button><button class="ghost danger" data-ud="${u.id}" title="Supprimer le compte">${ic('trash')}</button>`:''}</td></tr>`).join('')}</tbody></table></div>
   <p style="margin-bottom:6px"><label class="chk"><input type="checkbox" id="su" ${CFG.signup==='off'?'':'checked'}> Autoriser la création de nouveaux comptes depuis l’écran de connexion</label></p><p class="mute small">Chaque utilisateur ne voit que ses propres données : l’administrateur n’y a pas accès, mais peut réinitialiser un mot de passe ou supprimer un compte.</p></div>
  <div class="card"><h2>Clé API Anthropic (IA)</h2><div class="fg"><div class="full"><label>Clé</label><input id="key" type="password" value="${esc(CFG.apiKey||'')}" placeholder="sk-ant-…" autocomplete="off"></div><div class="full"><label>Modèle</label><input id="model" value="${esc(CFG.model||'claude-haiku-5-5')}"></div></div><p><button id="sk">Enregistrer</button></p><p class="mute small">Partagée par tous les comptes de cet appareil, stockée dans ce navigateur. Pour une diffusion publique, passez par un serveur.</p></div>
  <div class="card"><h2>Coordonnées de contact & support (pages À propos / Contact)</h2><form id="sf" class="fg"><div><label>Email de support</label><input name="email" type="email" value="${esc(CFG.support?.email||'')}"></div><div><label>Téléphone</label><input name="tel" type="tel" value="${esc(CFG.support?.tel||'')}"></div><div><label>WhatsApp</label><input name="whatsapp" type="tel" value="${esc(CFG.support?.whatsapp||'')}"></div><div><label>Site web</label><input name="site" value="${esc(CFG.support?.site||'')}"></div><div class="full"><label>Adresse</label><input name="adresse" value="${esc(CFG.support?.adresse||'')}"></div><div class="full"><button>Enregistrer</button></div></form></div>
  <div class="card"><h2>Sauvegarde technique de mon compte (JSON)</h2><p><button id="ex">${ic('download')} Exporter JSON</button> <button class="ghost" id="imb">Importer JSON</button><input type="file" id="im" accept=".json" hidden></p></div>
  <div class="card"><h2>Diagnostic de mon compte</h2><div class="grid">${Object.entries(MODULES).map(([k,m])=>`<div class="stat"><small>${m.label}</small><b>${list(k).length}</b></div>`).join('')}<div class="stat s3"><small>Stockage utilisé</small><b>${Math.round(bytes/1024)} Ko</b><small>sur ~5 000 Ko</small></div></div></div>
  <div class="card"><h2>Outils</h2><p><button class="ghost" id="demo">Charger des données d'exemple</button> <button class="ghost danger" id="wipe">Effacer les données de mon compte…</button></p></div>`;
  el.querySelectorAll('[data-ur]').forEach(b=>b.onclick=()=>adminResetPw(b.dataset.ur));
  el.querySelectorAll('[data-ut]').forEach(b=>b.onclick=()=>adminToggleRole(b.dataset.ut));
  el.querySelectorAll('[data-ud]').forEach(b=>b.onclick=()=>adminDeleteUser(b.dataset.ud));
  $('#su').onchange=e=>{CFG.signup=e.target.checked?'on':'off';saveCfg();toast('✔ Enregistré')};
  $('#sf').onsubmit=ev=>{ev.preventDefault();const f=new FormData(ev.target);CFG.support=Object.fromEntries([...f.entries()].map(([k,v])=>[k,String(v).trim()]));saveCfg();toast('✔ Coordonnées enregistrées')};
  $('#sk').onclick=()=>{CFG.apiKey=$('#key').value.trim();CFG.model=$('#model').value.trim()||undefined;saveCfg();toast('✔ Enregistré')};
  $('#ex').onclick=()=>download(new Blob([JSON.stringify(DB)],{type:'application/json'}),`lumina-${ME.nom}-${today()}.json`);
  $('#imb').onclick=()=>$('#im').click();
  $('#im').onchange=async e=>{try{const d=JSON.parse(await e.target.files[0].text());delete d.apiKey;delete d.adminHash;if(confirm('Remplacer les données de votre compte ?')){DB=d;save();render();toast('✔ Importé')}}catch{toast('Fichier invalide')}};
  $('#wipe').onclick=()=>{if(prompt('Tapez EFFACER pour supprimer toutes les données de votre compte.')===translate('EFFACER')){DB={seeded:1,profile:DB.profile};save();toast('Données effacées');go('dash')}};
  $('#demo').onclick=()=>{if(!confirm('Ajouter des données d\'exemple ?'))return;const d=today(),mo=d.slice(0,7),mk=(k,o)=>list(k).push({id:uid(),created:new Date().toISOString(),...o});
    [['Revenu',450000,'Salaire'],['Dépense Fixe',60000,'Assurances'],['Dépense Variable',25000,'Transport'],['Dépense Variable',40000,'Alimentation'],['Épargne',50000,'Épargne'],['Dépense Fixe',12000,'Communication']].forEach(([t,m,c],n)=>mk('finances',{type:t,montant:m,cat:c,libelle:c,statut:'✅ Payé',date:mo+'-'+String(n+1).padStart(2,'0'),note:''}));
    mk('projets',{nom:'Crèche',statut:'En cours',budget:5000000,depense:1200000,echeance:mo+'-28',taches:'x Étude de marché\nBusiness plan\nTerrain\nAutorisation'});mk('projets',{nom:'Miel',statut:'Idée',budget:800000,depense:0,echeance:'',taches:'Choisir les ruches\nTrouver un apiculteur'});
    mk('investissements',{actif:'Action SIB',type:'Actions',investi:300000,valeur:340000,dividendes:15000,date:d});mk('investissements',{actif:'Terrain',type:'Immobilier',investi:2000000,valeur:2400000,dividendes:0,date:d});
    mk('contacts',{nom:'Pacôme',tel:'+225 00 00 00 00',email:'pacome@exemple.com',derniere:d,projet:'RAFEI',note:''});mk('notes',{titre:'Idée appli',cat:'Idée',texte:'Version agriculteurs'});
    mk('sante',{date:d,poids:78,tension:'12/8',sport:30,sommeil:7,meds:''});save();toast('✔ Exemples ajoutés');go('dash')};
}


function ctlHtml(){return `<div class="card filt"><div><label>Année</label><select data-ds="y"><option value="all" ${DS.y==='all'?'selected':''}>Toutes les années</option>${years().map(y=>`<option ${y===DS.y?'selected':''}>${y}</option>`).join('')}</select></div><div><label>Période</label><select data-ds="m"><option value="0" ${DS.m==='0'?'selected':''}>Toute l'année</option>${MOIS_L.map((n,i)=>`<option value="${i+1}" ${DS.m===String(i+1)?'selected':''}>${n}</option>`).join('')}</select></div><div><label>Base de calcul</label><select data-ds="base">${BASES.map(b=>`<option ${b===DS.base?'selected':''}>${b}</option>`).join('')}</select></div><p class="mute" style="flex:1;min-width:200px;margin:0;font-size:12px">« Réalisé seulement » = ✅ Payé et 🔁 Automatique. « Tout » ajoute ⏳ En attente (prévu). Les ❌ Annulé sont toujours exclus.</p></div>`}
function ctlBind(){}/* les sélecteurs de période sont gérés par un écouteur global (voir plus bas) */

/* ---------- Tableau de bord ---------- */
/* Alertes (budget, documents, projets, paiements en attente + modules santé / bourse / collectif) */
function buildAlerts(rows,proj){
  const near=new Date(Date.now()+90*864e5).toISOString().slice(0,10),near2=new Date(Date.now()+14*864e5).toISOString().slice(0,10);
  const al=[];
  rows.filter(x=>x.c.type!=='Revenu'&&(x.c.nom==='Dîmes'||num(x.c.budget)>0)&&x.r>x.t+.5).forEach(({c,t,r})=>{
    const d=r-t;
    if(isGood(c))al.push({w:3,l:'ok',i:'trend',s:d,h:`<b>${esc(c.nom)}</b> — objectif dépassé : <span class="amt good">${fmt(r)}</span> épargnés pour <span class="amt">${fmt(t)}</span> prévus <span class="pill good">+ ${fmt(d)}</span>`});
    else{const gr=d/(t||1)>.05;al.push({w:gr?0:1,l:gr?'bad':'warn',i:'alert',s:d,h:`<b>${esc(c.nom)}</b> — <span class="amt bad">${fmt(r)}</span> dépensés pour un budget de <span class="amt good">${fmt(t)}</span> <span class="pill ${gr?'bad':'warn'}">+ ${fmt(d)}</span>`})}
  });
  list('coffre').filter(d=>d.expire&&d.expire<new Date(Date.now()+(num(d.alerte)||90)*864e5).toISOString().slice(0,10)).forEach(d=>{const ex=d.expire<today();al.push({w:ex?0:2,l:ex?'bad':'warn',i:'shield',s:0,h:`<b>${esc(d.titre)}</b> ${ex?'a expiré le':'expire le'} <span class="amt ${ex?'bad':'warn'}">${esc(d.expire)}</span>`})});
  proj.filter(p=>p.statut!=='Terminé'&&p.echeance&&p.echeance<near2).forEach(p=>al.push({w:2,l:'warn',i:'rocket',s:0,h:`<b>${esc(p.nom)}</b> — échéance le <span class="amt warn">${esc(p.echeance)}</span>`}));
  const pend=list('finances').filter(i=>i.statut==='⏳ En attente'),late=pend.filter(i=>i.date&&i.date<today()).sort((x,y)=>x.date<y.date?-1:1);
  late.slice(0,5).forEach(i=>al.push({w:2,l:'warn',i:'clock',s:0,h:`<b>${esc(i.libelle||i.cat)}</b> en attente depuis le <span class="mute">${esc(i.date)}</span> — <span class="amt warn">${fmt(i.montant)}</span>`}));
  if(late.length>5)al.push({w:2,l:'warn',i:'clock',s:0,h:`<span class="mute">+ ${late.length-5} autre(s) paiement(s) en attente, soit</span> <span class="amt warn">${fmt(late.slice(5).reduce((x,i)=>x+num(i.montant),0))}</span>`});
  if(typeof extraAlerts==='function')al.push(...extraAlerts());
  /* Chaque alerte mène quelque part : page cible par défaut selon l'icône (si le texte n'a pas déjà son propre lien) */
  const GO={clock:'finances',rocket:'projets',shield:'coffre',alert:'budget',trend:'budget',calendar:'planning',checksq:'taches',users:'collectif',heart:'humeur',gift:'contacts'};
  al.forEach(x=>{const m=x.h.match(/\s*<a\s[^>]*data-(?:go|new)=[^>]*>.*?<\/a>/);
    if(m){x.h=x.h.replace(m[0],'');x.act=m[0].replace(/^\s*<a\s/,'<a class="alact" ')}   /* le lien du texte devient le bouton aligné à droite */
    else if(GO[x.i])x.act=`<a href="#" class="alact" data-go="${GO[x.i]}">${t("Voir")}</a>`});
  al.sort((x,y)=>x.w-y.w||y.s-x.s);
  return al;
}
function dash(el){
  const a=periodItems(DS.y,DS.m,DS.base),rev=sumK(a,'rev'),dep=sumK(a,'dep'),epa=sumK(a,'epa'),solde=rev-dep-epa;
  const pret=a.filter(i=>kind(i)==='dep'&&i.cat==='Remboursements prêt').reduce((x,i)=>x+num(i.montant),0);/* dettes seules : le PEL est de l'épargne */
  const tEp=rev?epa/rev*100:0,tEnd=rev?pret/rev*100:0,months=nMonths();
  const proj=list('projets'),act=proj.filter(p=>p.statut==='En cours'),near=new Date(Date.now()+90*864e5).toISOString().slice(0,10),near2=new Date(Date.now()+14*864e5).toISOString().slice(0,10);
  const rows=budgetRows(a,rev,months);

  /* Alertes : montants colorés (dépensé en rouge, budget en vert, attente en ambre) */
  const al=buildAlerts(rows,proj);const pend=list('finances').filter(i=>i.statut==='⏳ En attente');

  const relig='';   /* v13 : plus de cartes Dîme / Aumônes */

  /* Aujourd'hui */
  const j=list('journal').some(x=>x.date===today()),h=new Date().getHours(),nom=DB.profile?.nom,n=new Date();
  const mo=periodItems(String(n.getFullYear()),String(n.getMonth()+1),BASES[0]),mT=list('categories').filter(c=>(c.type||'').startsWith('Dépense')).reduce((s,c)=>s+targetPeriod(c,sumK(mo,'rev'),String(n.getFullYear()),String(n.getMonth()+1)),0),mD=sumK(mo,'dep'),mp=mT?mD/mT*100:0;
  const nextP=proj.filter(p=>p.statut!=='Terminé'&&p.echeance&&p.echeance>=today()).sort((x,y)=>x.echeance<y.echeance?-1:1)[0],sumPend=pend.reduce((x,i)=>x+num(i.montant),0);
  const todo=[
    {i:'book',t:'Journal du jour',s:j?`Rempli · série de ${streak()} jour(s)`:`À remplir · série en cours : ${streak()} j`,ok:j,at:j?'data-go="journal"':'data-new="journal"',b:j?'Fait':'Écrire'},
    {i:'clock',t:'Paiements en attente',s:pend.length?`${pend.length} en attente · <span class="amt warn">${fmt(sumPend)}</span>`:'Aucun paiement en attente',ok:!pend.length,at:'data-go="finances"',b:pend.length?'Voir':'À jour'},
    {i:'chart',t:`Budget de ${MOIS_L[n.getMonth()].toLowerCase()}`,s:mT?`<span class="amt ${mp>100?'bad':'good'}">${pct(mp)}</span> consommé · ${fmt(mD)} sur ${fmt(mT)}`:'Aucune cible mensuelle définie',ok:!mT||mp<=100,at:'data-go="budget"',b:'Détail'},
    {i:'rocket',t:'Prochaine échéance de projet',s:nextP?`${esc(nextP.nom)} · ${esc(nextP.echeance)}`:'Aucune échéance planifiée',ok:!nextP,at:'data-go="projets"',b:'Projets'}];

  /* Règle 50/30/20 sur la nouvelle taxonomie : besoins + dettes (obligations) / envies / épargne + investissements.
     Pour l'épargne, le repère est un minimum (vert si atteint) ; pour les autres, un plafond (rouge si dépassé). */
  const grp=gs=>a.filter(i=>kind(i)!=='rev'&&gs.includes(catOf(i.cat)?.groupe||'')).reduce((x,i)=>x+num(i.montant),0);
  const rule=[[['Besoins','Dettes & Remboursements'],'Besoins & dettes',50,0],[['Envies'],'Envies',30,0],[['Épargne','Investissement Bourse'],'Épargne & investissements',20,1]].map(([gs,lab,t,min])=>{const v=grp(gs),p=rev?v/rev*100:0,bad=min?p<t:p>t;return `<div style="margin-bottom:10px"><div style="display:flex;justify-content:space-between"><span>${lab} <span class="mute">(repère ${min?'≥':'≤'} ${t} %)</span></span><b class="${bad?'bad':'good'}">${pct(p)}</b></div><div class="bar${bad&&!min?' over':''}"><i style="width:${Math.min(100,p)}%"></i></div><small class="mute">${fmt(v)}</small></div>`}).join('');
  el.innerHTML=`<div class="hero compact"><h1>${h<18?'Bonjour':'Bonsoir'}${nom?', '+esc(nom):''}</h1><p>${cap(new Date().toLocaleDateString(LOC,{weekday:'long',day:'numeric',month:'long',year:'numeric'}))}</p>
   <div class="qa"><button data-new="finances" data-pre="type=Dépense Variable">${ic('plus')} Dépense</button><button data-new="finances" data-pre="type=Revenu&cat=Salaire">${ic('plus')} Revenu</button><button data-new="finances" data-pre="type=Épargne&cat=Épargne">${ic('coins')} Épargne</button><button data-new="projets">${ic('rocket')} Projet</button><button data-new="notes">${ic('bulb')} Note</button><button data-new="journal">${ic('book')} Journal</button><button data-new="contacts">${ic('users')} Contact</button></div></div>
   ${ctlHtml()}
   <div class="grid"><div class="stat"><small>Revenus</small><b class="good">${fmt(rev)}</b></div><div class="stat s2"><small>Dépenses</small><b class="bad">${fmt(dep)}</b></div><div class="stat s3"><small>Épargne</small><b>${fmt(epa)}</b></div><div class="stat s4"><small>Solde non affecté</small><b class="${solde<0?'bad':'good'}">${fmt(solde)}</b></div><div class="stat"><small>Taux d'épargne</small><b>${pct(tEp)}</b></div><div class="stat s2"><small>Taux d'endettement</small><b class="${tEnd>33?'bad':''}">${pct(tEnd)}</b><small>seuil conseillé 33 %</small></div></div>
   <div class="g2"><div class="card"><h2>Revenus vs dépenses — ${DS.y==='all'?'Toutes les années':DS.y} <span class="seg">${chartSeg()}</span></h2>${monthBars(list('finances').filter(i=>counted(i,DS.base)),DS.y)}</div><div class="card"><h2>Dépenses par catégorie</h2>${donut(group(a.filter(i=>kind(i)==='dep'),'cat','montant'))}</div></div>
   <div class="sech"><h2>${ic('chart')} Synthèse du budget par groupe</h2><a href="#" data-go="budget">Détail par catégorie ${ic('chevron')}</a></div>
   <div class="g2 w">${grpTotals(rows).map(G=>groupCard(G,true)).join('')||`<div class="card empty">${t('Aucun budget ni mouvement pour le moment.')} <a href="#" data-go="budgetan">${t('Préparer mon budget annuel')}</a> · <a href="#" data-new="finances">${t('Ajouter une écriture')}</a></div>`}</div>
   <div class="g2"><div class="card"><h2>Règle 50 / 30 / 20</h2>${rev?rule:'<span class="mute">Aucun revenu sur la période.</span>'}</div><div class="card"><h2>${ic('target')} Objectifs d'épargne</h2>${list('objectifs').map(o=>{const s=goalStats(o),p=Math.min(100,s.real/(num(o.cible)||1)*100);return `<div style="margin-bottom:10px"><div style="display:flex;justify-content:space-between"><span>${esc(o.nom)}</span><b>${pct(p)}</b></div><div class="bar"><i style="width:${p}%"></i></div><small class="mute">${fmt(s.real)} / ${fmt(o.cible)}</small></div>`}).join('')||'<span class="mute">Aucun objectif.</span> <button data-new="objectifs">Créer</button>'}</div></div>
   ${relig?`<div class="g2">${relig}</div>`:''}
   <div class="g2"><div class="card"><h2>${ic('bell')} Alertes ${al.length?`<span class="pill ${al.some(x=>x.l==='bad')?'bad':al.some(x=>x.l==='warn')?'warn':'good'}">${al.length}</span>`:''}</h2>${al.map(x=>`<div class="al ${x.l}"><span class="ai">${ic(x.i)}</span><div>${x.h}</div>${x.act||''}</div>`).join('')||'<div class="al ok"><span class="ai">'+ic('check')+'</span><div>Aucune alerte : tout est sous contrôle.</div></div>'}</div>
   <div class="card"><h2>${ic('check')} Aujourd'hui</h2>${[...todo,...(typeof extraTodo==='function'?extraTodo():[])].map(x=>`<div class="td ${x.ok?'ok':''}" ${x.at} role="button" tabindex="0"><span class="ti">${ic(x.i)}</span><div class="tt"><b>${x.t}</b><small>${x.s}</small></div><span class="chip ${x.ok?'ok':'todo'}">${x.b}</span></div>`).join('')}</div></div>
   <div class="sech"><h2>${ic('rocket')} Projets en cours</h2></div>${act.length?`<div class="cards">${act.slice(0,3).map(projectCard).join('')}</div>`:'<div class="card empty">Aucun projet en cours. <button data-new="projets">Créer un projet</button></div>'}`;
}


/* ---------- Budget (cible vs réel : récapitulatif par groupe puis par catégorie, détail en tableau) ---------- */
function budgetPage(el){
  const a=periodItems(DS.y,DS.m,DS.base),months=DS.m==='0'?12:1,rv=sumK(a,'rev'),rows=budgetRows(a,rv,months).sort((x,y)=>GROUPES.indexOf(x.c.groupe)-GROUPES.indexOf(y.c.groupe)||x.c.nom.localeCompare(y.c.nom,LANG));
  const tot=f=>rows.filter(f).reduce((s,x)=>({t:s.t+x.t,r:s.r+x.r}),{t:0,r:0});
  const R=tot(x=>x.c.type==='Revenu'),D=tot(x=>x.c.type!=='Revenu');
  el.innerHTML=`<div class="head"><h1>${ic('chart')} Budget — cible vs réel</h1><div class="acts"><button class="ghost" id="xb">${ic('download')} Excel</button><button data-go="categories" class="ghost">${ic('folder')} Modifier les catégories</button></div></div>${ctlHtml()}
  <div class="grid"><div class="stat s4"><small>Revenus (réel / cible)</small><b>${fmt(R.r)}</b><small>cible ${fmt(R.t)}</small></div><div class="stat s2"><small>Sorties (réel / cible)</small><b>${fmt(D.r)}</b><small>cible ${fmt(D.t)}</small></div><div class="stat"><small>Écart sorties</small><b class="${D.r>D.t?'bad':'good'}">${Math.abs(D.r-D.t)<.5?'':D.r>D.t?'+ ':'− '}${fmt(Math.abs(D.r-D.t))}</b></div></div>
  ${recapSection(a,rv,months)}
  <div class="sech"><h2>${ic('list')} Détail par catégorie</h2></div>
  <div class="card tw"><table><thead><tr><th>Catégorie</th><th>Groupe</th><th class="num">Cible</th><th class="num">Réel</th><th class="num">Écart</th><th style="min-width:140px">Utilisation</th></tr></thead><tbody>${rows.map(({c,t,r})=>{const s=rstat(c,t,r);
    return `<tr><td>${esc(c.nom)}</td><td>${badge(c.groupe)}</td><td class="num">${fmt(t)}</td><td class="num"><b>${fmt(r)}</b></td><td class="num ${t?(s.over?'bad':'mute'):'mute'}">${t?(r-t>0?'+':'−')+' '+fmt(Math.abs(r-t)):'—'}</td><td><div class="bar${s.over?' over':''}"><i style="width:${Math.min(100,s.p)}%"></i></div><small class="mute">${t?pct(s.p):'sans cible'}</small></td></tr>`}).join('')}</tbody></table></div>`;
  $('#xb').onclick=()=>{download(xlsx([{name:t('Budget'),rows:[[t('Catégorie'),t('Groupe'),t('Type'),t('Cible'),t('Réel'),t('Écart')],...rows.map(({c,t,r})=>[c.nom,c.groupe,c.type,t,r,r-t])]}]),`lumina-budget-${DS.y}.xlsx`);toast('✔ Fichier Excel téléchargé')};
}


/* ---------- À propos ---------- */
function apropos(el){
  const S=CFG.support||{};
  const mods=Object.values(MODULES).map(m=>`<span class="b" style="--h:${(m.label.length*47)%360}">${esc(m.label)}</span>`).join(' ');
  el.innerHTML=`<div class="hero"><img src="logo.svg" alt=""><h1>À propos de LUMINA</h1><p>Ne plus naviguer à l’aveugle : la clarté sur vos comptes, mois par mois, poste par poste.</p></div>
  <div class="g2"><div class="card"><h2>Notre mission</h2><p>LUMINA relie ce qui est habituellement dispersé — votre temps, votre argent, vos projets, vos contacts et vos objectifs — dans un système unique, clair et sécurisé. Pensée pour l'Afrique et ouverte au monde, l'application fonctionne en français, hors-ligne, et reste simple d'usage.</p><p><b>LUMINA</b> : la lumière, c’est-à-dire la clarté sur vos comptes et vos prévisions, avec l’ancrage en Afrique, l’autonomie et l’avenir.</p></div>
  <div class="card"><h2>Nos valeurs</h2><p><b>Clarté</b> — des chiffres lisibles et des décisions éclairées.<br><b>Simplicité</b> — une saisie rapide, des listes déroulantes, des filtres.<br><b>Confidentialité</b> — un espace personnel protégé par mot de passe pour chaque utilisateur.<br><b>Accessibilité</b> — hors-ligne, en plusieurs langues et devises.</p></div></div>
  <div class="card"><h2>Ce que contient l'application</h2><p>${mods} <span class="b" style="--h:200">Budget</span> <span class="b" style="--h:120">IA personnelle</span></p><p class="mute">Version 2.0 · Votre espace : ${list('finances').length} transactions · ${list('categories').length} catégories · ${list('objectifs').length} objectifs d'épargne.</p></div>
  <div class="card"><h2>Contact</h2>${S.email||S.tel||S.whatsapp||S.site||S.adresse?`<p>${S.email?`${ic('mail')} <a href="mailto:${esc(S.email)}">${esc(S.email)}</a><br>`:''}${S.tel?`Tél. <a href="tel:${esc(S.tel)}">${esc(S.tel)}</a><br>`:''}${S.whatsapp?`<a href="https://wa.me/${esc(String(S.whatsapp).replace(/\D/g,''))}" target="_blank" rel="noopener">WhatsApp</a><br>`:''}${S.site?`${esc(S.site)}<br>`:''}${S.adresse?`${esc(S.adresse)}`:''}</p>`:'<p class="mute">Les coordonnées de contact seront renseignées par l\'administrateur.</p>'}<button data-go="contact">${ic('mail')} Nous écrire</button></div>
  <div class="card"><h2>Confidentialité</h2><p>Aucune donnée n'est envoyée sur un serveur : tout est enregistré dans le navigateur de cet appareil, dans un espace réservé à votre compte. Exportez régulièrement votre classeur Excel (Réglages) pour sauvegarder vos données.<br>Compte actif : <b>${esc(ME.nom)}</b>.</p></div>`;
}


/* ---------- Contact & support ---------- */
function contactPage(el){
  const S=CFG.support||{},p=DB.profile||{};
  el.innerHTML=`<div class="head"><h1>${ic('mail')} Contact & support</h1></div>
  <div class="g2"><div class="card"><h2>Nous écrire</h2><form id="cf"><div class="fg"><div><label>Votre nom</label><input name="nom" value="${esc(p.nom||'')}" required></div><div><label>Votre email</label><input name="email" type="email" value="${esc(p.email||'')}"></div>
   <div class="full"><label>Sujet</label><select name="sujet"><option>Question</option><option>Suggestion</option><option>Signaler un problème</option><option>Demande de partenariat</option><option>Autre</option></select></div>
   <div class="full"><label>Message</label><textarea name="msg" required placeholder="Décrivez votre demande…"></textarea></div></div>
   <div class="mact"><button type="button" class="ghost" id="cp">📋 Copier</button><button>${ic('mail')} Envoyer par email</button></div></form>
   ${S.email?'':'<p class="mute">⚠ L\'adresse de support n\'est pas encore configurée : un administrateur doit la saisir (Administration → Coordonnées).</p>'}</div>
  <div class="card"><h2>Coordonnées</h2>${S.email||S.tel||S.whatsapp||S.site||S.adresse?`<p>${S.email?`✉ <a href="mailto:${esc(S.email)}">${esc(S.email)}</a><br>`:''}${S.tel?`📞 <a href="tel:${esc(S.tel)}">${esc(S.tel)}</a><br>`:''}${S.whatsapp?`💬 <a href="https://wa.me/${esc(String(S.whatsapp).replace(/\D/g,''))}" target="_blank" rel="noopener">Écrire sur WhatsApp</a><br>`:''}${S.site?`🔗 ${esc(S.site)}<br>`:''}${S.adresse?`📍 ${esc(S.adresse)}`:''}</p>`:'<p class="mute">Aucune coordonnée enregistrée.</p>'}
   <h2 style="margin-top:14px">Questions fréquentes</h2><p><b>Où sont mes données ?</b><br>Sur votre appareil uniquement. Sauvegardez-les via Réglages → Export Excel.</p><p><b>Comment ajouter une catégorie ?</b><br>Menu Argent → Catégories → Ajouter ; elle apparaît aussitôt dans la liste déroulante de Finances.</p></div></div>`;
  const build=f=>{const d=new FormData(f);return {s:`[LUMINA] ${d.get('sujet')} — ${d.get('nom')}`,b:`${d.get('msg')}\n\n— ${d.get('nom')}${d.get('email')?'\nRéponse à : '+d.get('email'):''}`}};
  $('#cf').onsubmit=ev=>{ev.preventDefault();if(!S.email){toast('Adresse de support non configurée');return}const m=build(ev.target);location.href=`mailto:${S.email}?subject=${encodeURIComponent(m.s)}&body=${encodeURIComponent(m.b)}`};
  $('#cp').onclick=async()=>{const m=build($('#cf'));try{await navigator.clipboard.writeText(m.s+'\n\n'+m.b);toast('✔ Message copié')}catch{toast('Copie impossible')}};
}

/* ---------- Pages de module (tableaux + filtres) ---------- */
const UI={};const PAGES={};
function matchQ(i,q){return !q||Object.entries(i).some(([k,v])=>k!=='fichier'&&k!=='photo'&&String(v).toLowerCase().includes(q))}
function monthOf(i){return (i.date||i.created||'').slice(0,7)}
const fval=(i,f)=>f.k==='_mois'?monthOf(i):f.k==='_annee'?(i.date||'').slice(0,4):f.k==='_groupe'?(catOf(i.cat)?.groupe||''):String(i[f.k]||'');
const DKEYS=['date','echeance','derniere','depuis','expire','debut'];
const dateKeyOf=m=>DKEYS.find(k=>m.fields.some(f=>f.k===k));
function filtered(k){const m=MODULES[k],u=UI[k],q=u.q.toLowerCase(),dk=dateKeyOf(m);
  return list(k).filter(i=>matchQ(i,q)&&m.filters.every(f=>{const v=u.f[f.k];return !v||fval(i,f)===v})&&(!dk||((!u.from||(i[dk]||'')>=u.from)&&(!u.to||(i[dk]||'')<=u.to))))}
function filterOpts(k,f){
  if(f.k==='_annee')return years().reverse();
  /* listes « select » : options prédéfinies du champ (plus de liste vide), fusionnées avec les valeurs déjà saisies */
  {const fd=MODULES[k].fields.find(x=>x.k===f.k&&x.t==='select'),src=f.o||(fd&&fd.o);if(src){const base=(typeof src==='function'?src():[...src]).filter(Boolean),cur=[...new Set(list(k).map(i=>String(i[f.k]||'')).filter(Boolean))];return [...new Set([...base,...cur])]}}
  if(f.k==='_mois'){const y=UI[k]?.f._annee,mm=yy=>Array.from({length:12},(_,i)=>yy+'-'+String(i+1).padStart(2,'0'));return (y?mm(y):[...new Set([...list(k).map(monthOf).filter(Boolean),...mm(String(new Date().getFullYear()))])]).sort().reverse()}
  let a=list(k);const y=UI[k]?.f._annee;if(f.k==='_mois'&&y)a=a.filter(i=>(i.date||'').startsWith(y));return [...new Set(a.map(i=>fval(i,f)).filter(Boolean))].sort().reverse()}
function modulePage(k,el){
  const m=MODULES[k],u=UI[k]=UI[k]||{q:'',f:m.defFilters?m.defFilters():{},view:m.card?'cards':'table',sort:null,limit:100,sel:new Set()};
  el.innerHTML=`<div class="head"><h1>${ic(m.icon)} ${m.label}</h1><div class="acts">${m.card?`<button class="ghost ${u.view==='cards'?'on':''}" data-view="cards">${ic('grid')} Cartes</button><button class="ghost ${u.view==='table'?'on':''}" data-view="table">${ic('list')} Tableau</button>`:''}<button class="ghost" id="xl">${ic('download')} Excel</button><button data-new="${k}">${ic('plus')} Ajouter</button></div></div>
  <div class="card filt"><input id="q" placeholder="🔎 Rechercher dans ${m.label}…" value="${esc(u.q)}">${m.filters.map(f=>`<select data-f="${f.k}"><option value="">${f.l} : tous</option>${filterOpts(k,f).map(o=>`<option ${u.f[f.k]===o?'selected':''}>${esc(o)}</option>`).join('')}</select>`).join('')}${dateKeyOf(m)?`<label class="dr">Du <input type="date" data-dr="from" value="${esc(u.from||'')}"></label><label class="dr">Au <input type="date" data-dr="to" value="${esc(u.to||'')}"></label>`:''}<button class="ghost" id="rst">Réinitialiser</button></div>
  <div id="out"></div>`;
  const draw=()=>{
    const a=filtered(k),all=list(k),s=u.sort||{k:m.sort,dir:m.asc?1:-1};
    const sorted=[...a].sort((x,y)=>{const A=x[s.k]??'',B=y[s.k]??'';return (typeof A==='number'&&typeof B==='number'?A-B:String(A).localeCompare(String(B),LANG))*s.dir});
    let body;
    const hidEmpty=k==='categories'&&all.length&&typeof SHOW_EMPTY_CATS!=='undefined'&&!SHOW_EMPTY_CATS&&!u.q&&!Object.values(u.f||{}).some(Boolean);
    if(!sorted.length)body=hidEmpty?`<div class="card empty">${tp('Vos {n} catégories n’ont encore ni budget ni écriture : elles sont masquées.',{n:all.length})} <button class="ghost" data-x11="showempty">${ic('eye')} ${t('Afficher les catégories vides')}</button> <button data-new="${k}">${ic('plus')} Ajouter</button></div>`:`<div class="card empty">${all.length?'Aucun résultat avec ces filtres.':'Rien ici pour le moment.'} <button data-new="${k}">${ic('plus')} Ajouter</button></div>`;
    else if(m.card&&u.view==='cards')body=`<div class="cards">${sorted.map(m.card).join('')}</div>`;
    else body=`${u.sel.size?`<div class="card bulk"><b>${u.sel.size} sélectionné(s)</b><button class="ghost danger" data-bulk="del">🗑 Supprimer</button>${k==='finances'?'<button class="ghost" data-bulk="pay">✅ Marquer payé</button><button class="ghost" data-bulk="wait">⏳ En attente</button><button class="ghost" data-bulk="cancel">❌ Annuler</button>':''}<button class="ghost" data-bulk="xl">${ic('download')} Excel (sélection)</button><button class="ghost" data-bulk="none">Tout désélectionner</button></div>`:''}<div class="card tw"><table><thead><tr><th><input type="checkbox" data-selall ${sorted.slice(0,u.limit).every(i=>u.sel.has(i.id))?'checked':''} title="Tout sélectionner"></th>${m.cols.map(c=>`<th ${c.nosort||!c.k?'':`data-sort="${c.k}"`} class="${c.cls||''}">${c.l}${s.k===c.k?(s.dir>0?' ▲':' ▼'):''}</th>`).join('')}<th class="num">Opérations</th></tr></thead>
      <tbody>${sorted.slice(0,u.limit).map(i=>`<tr class="r" data-e="${i.id}" data-k="${k}"><td><input type="checkbox" data-sel="${i.id}" ${u.sel.has(i.id)?'checked':''}></td>${m.cols.map(c=>`<td class="${c.cls||''}">${c.f?c.f(i):esc(i[c.k]??'')}</td>`).join('')}<td class="num act">${m.rowAct?m.rowAct(i):''}<button class="ghost" data-e="${i.id}" data-k="${k}" title="Modifier">${ic('edit')}</button><button class="ghost" data-act="dup" data-id="${i.id}" data-k="${k}" title="Dupliquer">${ic('copy')}</button><button class="ghost danger" data-act="del" data-id="${i.id}" data-k="${k}" title="Supprimer">${ic('trash')}</button></td></tr>`).join('')}</tbody></table>${sorted.length>u.limit?`<p style="text-align:center"><button class="ghost" data-more>Afficher plus (${sorted.length-u.limit} restants)</button></p>`:''}</div>`;
    $('#out').innerHTML=(m.top?m.top(a,all):'')+body+`<div class="sum"><span>${a.length} / ${all.length} élément(s)</span>${m.summary?m.summary(a):''}</div>`;
  };
  draw();
  $('#q').oninput=e=>{u.q=e.target.value;u.limit=100;draw()};
  el.querySelectorAll('[data-f]').forEach(s=>s.onchange=()=>{u.f[s.dataset.f]=s.value;u.limit=100;if(s.dataset.f==='_annee'){u.f._mois='';render()}else if(s.dataset.f==='_mois'&&s.value){u.f._annee=s.value.slice(0,4);render()}else draw()});
  el.querySelectorAll('[data-dr]').forEach(i=>{const fn=()=>{u[i.dataset.dr]=i.value;u.limit=100;draw()};i.onchange=fn;i.oninput=fn});
  $('#rst').onclick=()=>{u.q='';u.f={};u.from='';u.to='';u.limit=100;render()};
  $('#xl').onclick=()=>exportModule(k);
  el.onchange=ev=>{const t=ev.target;
    if(t.dataset.sel!==undefined){t.checked?u.sel.add(t.dataset.sel):u.sel.delete(t.dataset.sel);draw()}
    if(t.dataset.selall!==undefined){filtered(k).slice(0,u.limit).forEach(i=>t.checked?u.sel.add(i.id):u.sel.delete(i.id));draw()}};
  el.onclick=ev=>{const b=ev.target.closest('[data-bulk]');
    if(b){const ids=[...u.sel],w=b.dataset.bulk;
      if(w==='del'){if(confirm(`Supprimer ${ids.length} élément(s) ?`))removeItems(k,ids)}
      else if(w==='pay')setStatut(ids,'✅ Payé');else if(w==='wait')setStatut(ids,'⏳ En attente');else if(w==='cancel')setStatut(ids,'❌ Annulé');
      else if(w==='none'){u.sel.clear();draw()}
      else if(w==='xl'){download(xlsx([sheetOf(k,list(k).filter(i=>u.sel.has(i.id)))]),`lumina-${k}-selection.xlsx`);toast('✔ Fichier Excel téléchargé')}
      return}
    const t=ev.target.closest('[data-sort],[data-view],[data-more]');if(!t)return;
    if(t.dataset.more!==undefined){u.limit+=200;draw();return}
    if(t.dataset.sort){const cur=u.sort||{k:m.sort,dir:m.asc?1:-1};u.sort={k:t.dataset.sort,dir:cur.k===t.dataset.sort?-cur.dir:1};draw()}
    if(t.dataset.view){u.view=t.dataset.view;render()}};
}

/* ---------- Navigation / rendu ---------- */
const NAV=[['Pilotage'],['dash','home','Tableau de bord'],['Argent'],['finances','wallet','Finances'],['budget','chart','Budget'],['categories','folder','Catégories'],['objectifs','target',"Objectifs d'épargne"],['investissements','trend','Investissements'],['Organisation'],['projets','rocket','Projets'],['contacts','users','Contacts'],['notes','bulb','Notes & idées'],['Personnel'],['journal','book','Journal'],['sante','heart','Santé'],['coffre','shield','Coffre-fort'],['Outils'],['ia','bot','IA personnelle'],['contact','mail','Contact & support'],['apropos','info','À propos'],['reglages','settings','Réglages'],['admin','code','Administration']];
let view=location.hash.slice(1)||'dash';
function go(v){if(location.hash.slice(1)===v)render();else location.hash=v}
function render(){
  if(!ME)return;
  if(view==='admin'&&!isAdmin()){view='dash';history.replaceState(null,'','#dash')}
  if(!NAV.some(n=>n[0]===view&&n.length>1))view='dash';
  $('#nav').innerHTML=`<div class="logo"><img src="logo.svg" alt=""><div><b>LUMINA</b></div></div>`+NAV.filter(n=>navVisible(n[0])).map(n=>n.length===1?`<div class="sec">${n[0]}</div>`:`<a data-go="${n[0]}" class="${n[0]===view?'on':''}">${ic(n[1])}<span>${n[2]}</span></a>`).join('');
  $('#tu').innerHTML=`<span class="av sm">${esc(initials(ME.nom))}</span><span class="un">${esc(ME.nom)}</span>`;
  if(typeof updateBell==='function')updateBell();
  const main=$('#main');main.onclick=null;main.innerHTML='';
  (PAGES[view]||(view==='dash'?dash:view==='ia'?ia:view==='reglages'?reglages:view==='budget'?budgetPage:view==='apropos'?apropos:view==='contact'?contactPage:view==='admin'?admin:el=>modulePage(view,el)))(main);
  scrollTo(0,0);
}


/* ---------- Événements globaux ---------- */
document.addEventListener('click',ev=>{
  if(ev.target.closest('input,select,textarea,label'))return;
  const t=ev.target.closest('[data-go],[data-new],[data-e],[data-act]');
  if(!t||ev.target.closest('a[download],a[href^="tel"],a[href^="mailto"]'))return;
  const d=t.dataset;
  if(d.go!==undefined){ev.preventDefault();go(d.go)}

  else if(d.act==='del')removeItems(d.k,[d.id]);
  else if(d.act==='pay')setStatut([d.id],'✅ Payé');
  else if(d.act==='dup'){const o=list(d.k).find(x=>x.id===d.id);if(o){const {id,created,lien,auto,...cp}=o;openForm(d.k,null,cp)}}
  else if(d.new!==undefined){ev.preventDefault();const pre={};(d.pre||'').split('&').filter(Boolean).forEach(p=>{const[a,b]=p.split('=');pre[a]=b});openForm(d.new,null,pre)}
  else if(d.e!==undefined)openForm(d.k,d.e);
});
document.addEventListener('change',ev=>{const c=ev.target.dataset?.tk;if(!c)return;
  const [id,ix]=c.split(':'),p=list('projets').find(x=>x.id===id);if(!p)return;
  const lines=p.taches.split('\n'),l=lines[+ix];lines[+ix]=/^x /i.test(l)?l.replace(/^x /i,''):'x '+l.trim();p.taches=lines.join('\n');save();render()});
$('#topadd').onclick=()=>{const k=NAV.some(n=>n[0]===view&&MODULES[view])?view:'finances';openForm(k)};
addEventListener('hashchange',()=>{view=location.hash.slice(1)||'dash';render()});
/* Sélecteurs de période (délégation : fonctionne aussi dans les pages à redessin partiel) */
document.addEventListener('change',ev=>{const s=ev.target.closest?.('[data-ds]');if(s){DS[s.dataset.ds]=s.value;render()}});
/* Lignes cliquables accessibles au clavier */
document.addEventListener('keydown',ev=>{if((ev.key==='Enter'||ev.key===' ')&&ev.target.matches?.('.td[role=button]')){ev.preventDefault();ev.target.click()}});
/* Thème clair / sombre, compte, déconnexion */
function applyTheme(t){document.documentElement.dataset.theme=t;try{localStorage.setItem('lumina.theme',t)}catch{}
  document.querySelector('meta[name=theme-color]')?.setAttribute('content',t==='light'?'#f4f1f8':'#140e1c');
  $('#theme').innerHTML=ic(t==='dark'?'sun':'moon');$('#theme').title=t==='dark'?'Passer au thème clair':'Passer au thème sombre'}
$('#theme').onclick=()=>applyTheme(document.documentElement.dataset.theme==='dark'?'light':'dark');
applyTheme(document.documentElement.dataset.theme==='light'?'light':'dark');
$('#topadd').innerHTML=ic('plus')+' Ajout rapide';$('#lo').innerHTML=ic('logout');
$('#lo').onclick=()=>logout();$('#tu').onclick=()=>go('reglages');
/* Migration des anciennes saisies + import automatique de la base Excel au premier lancement */
function seedFromExcel(replace){
  const S=window.LUMINA_SEED;if(!S)return false;
  ['finances','categories','objectifs'].forEach(k=>{DB[k]=replace?[]:list(k);S[k].forEach(x=>DB[k].push({...x,created:x.created||new Date().toISOString()}))});
  DB.seeded=1;save();return true;
}
function boot(){
  let ch=false;
  list('finances').forEach(i=>{ if(i.type==='Dépense'){i.type='Dépense Variable';ch=true} if(i.type==='Crédit'){i.type='Dépense Fixe';ch=true} if(i.type==='Investissement'){i.type='Épargne';ch=true}
    if(!i.libelle&&i.note){i.libelle=i.note;i.note='';ch=true} if(!i.statut){i.statut='✅ Payé';ch=true} });
  const cs=list('categories'),oi=cs.findIndex(c=>c.nom==='Dîmes et Aumônes');
  if(oi>=0){const b=cs[oi],now=new Date().toISOString();cs.splice(oi,1,{id:uid(),created:now,nom:'Dîmes',type:'Dépense Fixe',groupe:b.groupe||'Besoins',budget:0,contenu:'Dîme = 10 % des revenus (calcul automatique)'},{id:uid(),created:now,nom:'Aumônes',type:'Dépense Fixe',groupe:b.groupe||'Besoins',budget:16250,contenu:'Aumônes et offrandes'});ch=true}
  list('finances').forEach(i=>{if(i.cat==='Dîmes et Aumônes'){i.cat=/aum/i.test(i.libelle||'')?'Aumônes':'Dîmes';ch=true}});
  list('objectifs').forEach(o=>{if(o.cat==='Dîmes et Aumônes'){o.cat='';ch=true}});
  if(ch)save();
}


