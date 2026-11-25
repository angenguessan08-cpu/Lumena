'use strict';
/* LUMINA — v3 : portefeuille BRVM, budget annuel, fonds collectif facultatif, plan financier 15 ans,
   conseils par rubrique et alertes clignotantes. */
const nf=n=>new Intl.NumberFormat(LOC).format(Math.round(n||0)||0);   /* ||0 : jamais de « -0 » */
const esc3=esc;

/* ---------- Colonnes Année / Mois dans Finances ---------- */
MODULES.finances.cols.splice(1,0,{l:'Année',nosort:1,f:i=>(i.date||'').slice(0,4)},{l:'Mois',nosort:1,f:i=>MOIS[+(i.date||'').slice(5,7)-1]||''});

/* =====================================================================
   BOURSE BRVM — ordres, CMP, frais, gains / pertes, allocation
   ===================================================================== */
const BSEC=['Banque','Service public','Industrie','Télécommunication','Distribution','Transport','Agriculture','Autre'];
const bP=()=>{const p=DB.profile||{};return{min:p.bMin!=null?num(p.bMin):1100,sgi:p.bSgi!=null?num(p.bSgi):0.1,brvm:p.bBrvm!=null?num(p.bBrvm):0.2}};
const bFrais=b=>{const p=bP();return b>0?Math.max(p.min,b*p.sgi/100)+b*p.brvm/100:0};
const coursOf=n=>{const c=DB.cours?.[String(n||'').trim().toUpperCase()];return c?num(c.prix):0};
const opBrut=o=>num(o.qte)*num(o.pu),opFrais=o=>(o.type==='Dividende'||o.type==='Division (split)')?0:bFrais(opBrut(o));
const opCout=o=>opBrut(o)+opFrais(o);
const opVal=o=>num(o.qte)*coursOf(o.societe);
MODULES.bourse={label:'Bourse BRVM',icon:'trend',sort:'date',defaults:{type:'Achat',secteur:'Banque',profil:'Croissance',horizon:5},
 fields:[{k:'date',l:'Date',t:'date'},{k:'type',l:'Opération',t:'select',o:['Achat','Vente','Dividende','Division (split)']},{k:'societe',l:'Société (ex : SONATEL, SIB)'},{k:'secteur',l:'Secteur',t:'select',o:BSEC},{k:'profil',l:'Profil',t:'select',o:['Croissance','Rente','Spéculatif']},
  {k:'qte',l:'Quantité (ou coefficient d’une division)',t:'number'},{k:'pu',l:'Prix unitaire (FCFA) ou dividende net par action',t:'number'},{k:'horizon',l:'Horizon (années)',t:'number'},{k:'note',l:'Notes',t:'textarea',full:1}],
 cols:[{k:'date',l:'Date'},{k:'type',l:'Opération',f:i=>badge(i.type)},{k:'societe',l:'Société'},{k:'secteur',l:'Secteur',f:i=>badge(i.secteur)},{k:'profil',l:'Profil',f:i=>badge(i.profil)},{k:'qte',l:'Qté',cls:'num'},{k:'pu',l:'PU',cls:'num',f:i=>nf(i.pu)},
  {l:'Coût brut',cls:'num',nosort:1,f:i=>nf(opBrut(i))},{l:'Frais',cls:'num',nosort:1,f:i=>nf(opFrais(i))},{l:'Coût total',cls:'num',nosort:1,f:i=>nf(opCout(i))},
  {l:'Valeur du marché',cls:'num',nosort:1,f:i=>i.type==='Achat'&&coursOf(i.societe)?nf(opVal(i)):''},
  {l:'Gains / pertes',cls:'num',nosort:1,f:i=>{if(i.type!=='Achat'||!coursOf(i.societe))return '';const g=opVal(i)-opCout(i);return `<b class="${g>=0?'good':'bad'}">${g<0?'('+nf(-g)+')':nf(g)}</b>`}},
  {l:'Perf %',cls:'num',nosort:1,f:i=>{if(i.type!=='Achat'||!coursOf(i.societe)||!opCout(i))return '';const p=(opVal(i)-opCout(i))/opCout(i)*100;return `<span class="${p>=0?'good':'bad'}">${pct(p)}</span>`}}],
 filters:[{k:'type',l:'Opération'},{k:'societe',l:'Société'},{k:'secteur',l:'Secteur'}],
 summary:a=>`<span>${t('Ordres')} <b>${a.length}</b></span><span>${t('Frais payés')} <b>${fmt(a.reduce((x,i)=>x+opFrais(i),0))}</b></span>`,
 top:()=>bourseTop()};
function positions(){
  const ops=[...list('bourse')].sort((x,y)=>(x.date||'')<(y.date||'')?-1:1),P={};
  for(const o of ops){const key=String(o.societe||'').trim().toUpperCase();if(!key)continue;
    const p=P[key]||(P[key]={key,nom:String(o.societe).trim(),secteur:o.secteur,profil:o.profil,horizon:o.horizon,qte:0,cout:0,qa:0,ba:0,div:0,reel:0,frais:0});
    const q=num(o.qte),u=num(o.pu),brut=q*u;
    if(o.type==='Vente'){const cmp=p.qte?p.cout/p.qte:0,fr=bFrais(brut);p.reel+=brut-fr-cmp*q;p.cout-=cmp*q;p.qte-=q;p.frais+=fr}
    else if(o.type==='Dividende')p.div+=brut;
    else if(o.type==='Division (split)'){const k=q||1;p.qte*=k;p.qa*=k}
    else{const fr=bFrais(brut);p.qte+=q;p.cout+=brut+fr;p.qa+=q;p.ba+=brut;p.frais+=fr;if(o.secteur)p.secteur=o.secteur;if(o.profil)p.profil=o.profil;if(o.horizon)p.horizon=o.horizon}}
  return Object.values(P).map(p=>{const px=coursOf(p.nom),val=px?p.qte*px:p.cout;return {...p,px,missing:!px,cmp:p.qa?p.ba/p.qa:0,rev:p.qte?p.cout/p.qte:0,val,gain:val-p.cout,perf:p.cout?(val-p.cout)/p.cout*100:0}}).filter(p=>p.qte>.0001||p.div||p.reel).sort((x,y)=>y.val-x.val);
}
const coursAge=()=>{const ds=Object.values(DB.cours||{}).map(c=>c.date).filter(Boolean).sort();return ds.length?dayDiff(ds[0],ltoday()):null};
function bourseTop(){
  const P=positions(),H=P.filter(p=>p.qte>.0001),cost=H.reduce((x,p)=>x+p.cout,0),val=H.reduce((x,p)=>x+p.val,0),gain=val-cost,perf=cost?gain/cost*100:0,div=P.reduce((x,p)=>x+p.div,0),real=P.reduce((x,p)=>x+p.reel,0),fr=P.reduce((x,p)=>x+p.frais,0),f=bP(),age=coursAge();
  return `<div class="grid"><div class="stat"><small>${t('Coût de revient (frais inclus)')}</small><b>${fmt(cost)}</b></div><div class="stat s4"><small>${t('Valeur du marché')}</small><b>${fmt(val)}</b></div><div class="stat ${gain<0?'s2':'s4'}"><small>${t('Gains / pertes latents')}</small><b class="${gain>=0?'good':'bad'}">${fmt(gain)}</b><small>${pct(perf)}</small></div><div class="stat s3"><small>${t('Dividendes encaissés')}</small><b>${fmt(div)}</b></div><div class="stat"><small>${t('Gains réalisés')}</small><b class="${real>=0?'good':'bad'}">${fmt(real)}</b></div><div class="stat s2"><small>${t('Frais payés')}</small><b>${fmt(fr)}</b></div></div>
  <div class="card tw"><h2>${ic('chart')} Positions par société <small class="mute">${age!=null?tp('Cours mis à jour il y a {n} jour(s)',{n:age}):''}</small></h2>
  ${H.length?`<table><thead><tr><th>Société</th><th>Secteur</th><th>Profil</th><th class="num">Qté</th><th class="num">CMP</th><th class="num">Coût de revient</th><th class="num">Cours actuel</th><th class="num">Valeur</th><th class="num">Gains / pertes</th><th class="num">Perf %</th><th class="num">Poids</th></tr></thead><tbody>
  ${H.map(p=>`<tr><td><b>${esc(p.nom)}</b></td><td>${badge(p.secteur)}</td><td>${badge(p.profil)}</td><td class="num">${nf(p.qte)}</td><td class="num">${nf(p.cmp)}</td><td class="num">${nf(p.cout)}</td><td class="num"><input class="bi" type="number" min="0" step="any" data-cours="${esc(p.key)}" value="${p.px||''}" placeholder="0" aria-label="${t('Cours actuel')} ${esc(p.nom)}"></td><td class="num">${nf(p.val)}</td><td class="num"><b class="${p.gain>=0?'good':'bad'}">${p.gain<0?'('+nf(-p.gain)+')':nf(p.gain)}</b></td><td class="num ${p.perf>=0?'good':'bad'}">${pct(p.perf)}</td><td class="num">${val?pct(p.val/val*100):'—'}</td></tr>`).join('')}
  <tr><td colspan="5"><b>Total</b></td><td class="num"><b>${nf(cost)}</b></td><td></td><td class="num"><b>${nf(val)}</b></td><td class="num"><b class="${gain>=0?'good':'bad'}">${gain<0?'('+nf(-gain)+')':nf(gain)}</b></td><td class="num"><b>${pct(perf)}</b></td><td></td></tr></tbody></table>
  <p class="mute small" style="margin:8px 0 0">${t('Saisissez le cours actuel de chaque société (source : brvm.org ou votre SGI) : les valeurs et les gains se mettent à jour partout.')}</p>`:`<span class="mute">${t('Aucune position. Ajoutez un ordre d’achat.')}</span>`}</div>
  <div class="g2"><div class="card"><h2>${ic('chart')} Allocation sectorielle</h2>${donut(group(H.map(p=>({s:p.secteur||'Autre',v:p.val})),'s','v'))}</div><div class="card"><h2>${ic('chart')} Répartition par société</h2>${donut(group(H.map(p=>({s:p.nom,v:p.val})),'s','v'))}</div></div>
  <div class="card"><h2>${ic('settings')} Frais de courtage</h2><div class="fg"><div><label>Minimum de frais SGI (FCFA)</label><input id="bf-min" type="number" min="0" value="${f.min}"></div><div><label>Taux SGI (%)</label><input id="bf-sgi" type="number" step="any" min="0" value="${f.sgi}"></div><div><label>Taux BRVM / DC-BR (%)</label><input id="bf-brvm" type="number" step="any" min="0" value="${f.brvm}"></div></div>
  <p style="margin:10px 0 0"><button class="ghost" data-x3="bfees">Enregistrer</button></p><p class="mute small" style="margin:8px 0 0">${t('Frais = MAX(minimum ; montant × taux SGI) + montant × taux BRVM. CMP = Σ(qté × PU) / Σ(qté).')}</p></div>`;
}

/* =====================================================================
   FONDS COLLECTIF (facultatif) — ex. caisse d'une direction
   ===================================================================== */
const CTYPES=['Collecté','Reste à payer','Espèce','Banque'];
MODULES.collectif={label:'Fonds collectif',icon:'users',sort:'date',defaults:{type:'Collecté'},
 fields:[{k:'date',l:'Date',t:'date'},{k:'type',l:'Nature',t:'select',o:CTYPES},{k:'personne',l:'Personne / source'},{k:'libelle',l:'Libellé'},{k:'montant',l:'Montant (FCFA)',t:'number'},{k:'note',l:'Notes',t:'textarea',full:1}],
 cols:[{k:'date',l:'Date'},{k:'type',l:'Nature',f:i=>badge(i.type)},{k:'personne',l:'Personne / source'},{k:'libelle',l:'Libellé'},{k:'montant',l:'Montant',cls:'num',f:i=>fmt(i.montant)}],
 filters:[{k:'type',l:'Nature'},{k:'personne',l:'Personne / source'}],summary:a=>`<span>${t('Lignes')} <b>${a.length}</b></span>`,top:()=>collectifTop()};
function collectifSums(){const s=ty=>list('collectif').filter(i=>i.type===ty).reduce((x,i)=>x+num(i.montant),0),C=s('Collecté'),R=s('Reste à payer'),E=s('Espèce'),B=s('Banque');return{C,R,E,B,T:E+B,ecart:C-(R+E+B)}}
function collectifTop(){
  const S=collectifSums(),nom=DB.profile?.collectifNom||'';
  return `<div class="card"><h2>${ic('users')} ${t('Fonds collectif')} ${esc(nom)}</h2><div class="tiles"><div class="tile a1"><small>${t('Collecté')}</small><b>${fmt(S.C)}</b></div><div class="tile a3"><small>${t('Reste à payer')}</small><b class="warn">${fmt(S.R)}</b></div><div class="tile a4"><small>${t('Trésorerie (espèce + banque)')}</small><b class="good">${fmt(S.T)}</b></div></div>
  <div class="al ${Math.abs(S.ecart)<1?'ok':'warn'}"><span class="ai">${ic(Math.abs(S.ecart)<1?'check':'alert')}</span><div><b>${t('Rapprochement')}</b> — ${Math.abs(S.ecart)<1?t('Collecté = reste à payer + trésorerie : les comptes concordent.'):tp('Écart de {a} entre le collecté et (reste à payer + trésorerie) : vérifiez les saisies.',{a:fmt(Math.abs(S.ecart))})}</div></div>
  <p class="mute small" style="margin:8px 0 0">${t('Module facultatif : activable ou désactivable dans Réglages. Les données de ce fonds restent dans votre compte.')}</p></div>`;
}

/* =====================================================================
   BUDGET ANNUEL — planification mois par mois + tableau réel vs budget
   ===================================================================== */
const catsSorted=()=>[...list('categories')].filter(c=>!(typeof catHidden==='function'&&catHidden(c))&&!(typeof catDormant==='function'&&catDormant(c))).sort((x,z)=>GROUPES.indexOf(x.groupe)-GROUPES.indexOf(z.groupe)||x.nom.localeCompare(z.nom,LANG));
function monthlyReal(y,base){
  const R={};list('finances').filter(i=>counted(i,base)&&(i.date||'').startsWith(y)).forEach(i=>{const k=i.cat+(kind(i)==='rev'?'|r':'|o'),m=+i.date.slice(5,7)-1;(R[k]=R[k]||Array(12).fill(0))[m]+=num(i.montant)});return R;
}
const sumArr=a=>a.reduce((x,v)=>x+num(v),0);
/* v14 : pour PLANIFIER, toutes les catégories utilisables sont proposées (même à 0) — sinon un compte neuf n'a aucune ligne à remplir */
const catsPlan=()=>[...list('categories')].filter(c=>!(typeof catHidden==='function'&&catHidden(c))&&!(typeof catOffUnused==='function'&&catOffUnused(c))).sort((x,z)=>GROUPES.indexOf(x.groupe)-GROUPES.indexOf(z.groupe)||x.nom.localeCompare(z.nom,LANG));
function annualModel(y,plan){
  const cats=plan?catsPlan():catsSorted(),by=DB.budgets?.[y]||{},arr=c=>(by[c.nom]||Array(12).fill(num(c.budget))).map(num),R=monthlyReal(y,DS.base);
  const revM=Array.from({length:12},(_,m)=>cats.filter(c=>c.type==='Revenu').reduce((s,c)=>s+arr(c)[m],0));
  return cats.map(c=>({c,p:c.nom==='Dîmes'?revM.map(v=>v*dimeTaux()/100):arr(c),r:R[c.nom+(c.type==='Revenu'?'|r':'|o')]||Array(12).fill(0)}));
}
function budgetanPage(el){
  const y=YY(),M=annualModel(y,true),has=!!DB.budgets?.[y],rv=M.filter(x=>x.c.type==='Revenu'),ot=M.filter(x=>x.c.type!=='Revenu');
  const MR=M.filter(x=>x.p.some(v=>num(v))||x.r.some(v=>num(v)));
  const mh=MOIS.map(m=>`<th class="num">${m}</th>`).join('');
  const tot=(rows,k)=>Array.from({length:12},(_,m)=>rows.reduce((s,x)=>s+num(x[k][m]),0));
  const grouped=rows=>GROUPES.concat(['Non classé']).map(g=>{const rs=rows.filter(x=>grpOf(x.c)===g);return rs.length?{g,rs}:null}).filter(Boolean);
  const planRow=({c,p})=>`<tr><td>${esc(c.nom)}</td><td class="num mute">${nf(c.budget)}</td>${p.map((v,m)=>c.nom==='Dîmes'?`<td class="num mute">${nf(v)}</td>`:`<td class="num"><input class="bi" type="number" min="0" data-bm="${esc(c.nom)}|${m}" value="${Math.round(v)}" aria-label="${esc(c.nom)} — ${MOIS[m]}"></td>`).join('')}<td class="num"><b>${nf(sumArr(p))}</b></td><td class="num"><button class="ghost icon sm" data-x3="bdel" data-cat="${esc(c.nom)}" title="${t('Retirer cette ligne du budget')}" aria-label="${t('Retirer cette ligne du budget')}">${ic('trash')}</button></td></tr>`;
  const sec=(title,rows,render,cols=15)=>grouped(rows).map(({g,rs})=>`<tr class="grow"><td colspan="${cols}">${t(g)}</td></tr>${rs.map(render).join('')}`).join('');
  const addRow=`<div class="addline" role="group" aria-label="${t('Ajouter une ligne')}"><b>${ic('plus')} ${t('Ajouter une ligne')}</b>
   <input id="ba-nom" list="ba-cats" placeholder="${t('Poste (ex. Loyer, Scolarité…)')}" maxlength="60" aria-label="${t('Nom du poste')}"><datalist id="ba-cats">${list('categories').map(c=>`<option value="${esc(c.nom)}">`).join('')}</datalist>
   <select id="ba-type" aria-label="${t('Type')}">${TYPES.map(x=>`<option value="${esc(x)}" ${x==='Dépense Variable'?'selected':''}>${esc(t(x))}</option>`).join('')}</select>
   <select id="ba-grp" aria-label="${t('Groupe')}">${GROUPES.map(x=>`<option value="${esc(x)}" ${x==='Besoins'?'selected':''}>${esc(t(x))}</option>`).join('')}</select>
   <input id="ba-amt" type="number" min="0" placeholder="${t('Montant / mois')}" aria-label="${t('Montant / mois')}">
   <button data-x3="badd">${ic('plus')} ${t('Ajouter')}</button></div>`;
  const pr=tot(rv,'p'),po=tot(ot,'p'),rr=tot(rv,'r'),ro=tot(ot,'r');
  const realRow=({c,p,r})=>{const isR=c.type==='Revenu',P=sumArr(p),Rt=sumArr(r),e=isR?Rt-P:P-Rt;return `<tr><td>${esc(c.nom)}</td><td class="num mute">${nf(c.budget)}</td>${r.map((v,m)=>`<td class="num ${!isR&&v>p[m]+.5?'bad':''}">${v?nf(v):'<span class="mute">-</span>'}</td>`).join('')}<td class="num"><b>${nf(Rt)}</b></td><td class="num">${nf(P)}</td><td class="num ${e<0?'bad':'good'}">${P||Rt?(e<0?'('+nf(-e)+')':nf(e)):'—'}</td></tr>`};
  el.innerHTML=`<div class="head"><h1>${ic('calendar')} Budget annuel ${esc(y)}</h1><div class="acts"><button class="ghost" id="bxl">${ic('download')} Excel</button></div></div>${ctlHtml()}
  <div class="card"><h2>${ic('settings')} Planifier mon budget ${esc(y)} ${has?'<span class="pill good">'+t('Plan personnalisé')+'</span>':'<span class="pill">'+t('Cibles mensuelles par défaut')+'</span>'}</h2>
  <p class="acts" style="margin:0 0 12px"><button class="ghost" data-x3="bfill">Appliquer les cibles mensuelles à l’année</button><button class="ghost" data-x3="bcopy">Copier l’année précédente</button><button class="ghost" data-x3="breel">Partir du réel de l’année précédente</button>${has?'<button class="ghost danger" data-x3="bclear">Revenir aux cibles mensuelles</button>':''}</p>
  <div class="tw"><table class="mgrid"><thead><tr><th>Poste</th><th class="num">Cible / mois</th>${mh}<th class="num">Total annuel</th><th></th></tr></thead><tbody>
  ${M.length?sec('',M,planRow,16):`<tr><td colspan="16" class="mute">${t('Aucune ligne pour le moment : ajoutez votre premier poste ci-dessous.')}</td></tr>`}
  <tr class="trow"><td>Total revenus</td><td></td>${pr.map(v=>`<td class="num">${nf(v)}</td>`).join('')}<td class="num">${nf(sumArr(pr))}</td><td></td></tr>
  <tr class="trow"><td>Total sorties (dépenses + épargne)</td><td></td>${po.map(v=>`<td class="num">${nf(v)}</td>`).join('')}<td class="num">${nf(sumArr(po))}</td><td></td></tr>
  <tr class="trow"><td>Solde prévu</td><td></td>${pr.map((v,m)=>{const s=v-po[m];return `<td class="num ${s<0?'bad':'good'}">${s<0?'('+nf(-s)+')':nf(s)}</td>`}).join('')}<td class="num ${sumArr(pr)-sumArr(po)<0?'bad':'good'}">${nf(sumArr(pr)-sumArr(po))}</td><td></td></tr></tbody></table></div>
  ${addRow}
  <p class="mute small" style="margin:8px 0 0">${t('Modifiez les montants mois par mois : ils servent ensuite de cibles partout (Budget, Catégories, alertes).')}</p></div>
  <div class="card"><h2>${ic('chart')} Budget mensuel — réel vs budget cible ${esc(y)}</h2><div class="tw"><table class="mgrid"><thead><tr><th>Poste</th><th class="num">Cible / mois</th>${mh}<th class="num">Total réel</th><th class="num">Budget annuel</th><th class="num">Écart (favorable +)</th></tr></thead><tbody>
  ${MR.length?sec('',MR,realRow,17):`<tr><td colspan="17" class="mute">${t('Aucun budget ni mouvement sur cette année.')}</td></tr>`}
  <tr class="trow"><td>Total revenus</td><td></td>${rr.map(v=>`<td class="num">${nf(v)}</td>`).join('')}<td class="num">${nf(sumArr(rr))}</td><td class="num">${nf(sumArr(pr))}</td><td class="num">${nf(sumArr(rr)-sumArr(pr))}</td></tr>
  <tr class="trow"><td>Total sorties</td><td></td>${ro.map(v=>`<td class="num">${nf(v)}</td>`).join('')}<td class="num">${nf(sumArr(ro))}</td><td class="num">${nf(sumArr(po))}</td><td class="num ${sumArr(po)-sumArr(ro)<0?'bad':'good'}">${nf(sumArr(po)-sumArr(ro))}</td></tr></tbody></table></div></div>`;
  $('#bxl').onclick=()=>{download(xlsx([{name:t('Budget annuel'),rows:[[t('Poste'),t('Cible / mois'),...MOIS,t('Total réel'),t('Budget annuel'),t('Écart')],...M.map(({c,p,r})=>[c.nom,num(c.budget),...r,sumArr(r),sumArr(p),c.type==='Revenu'?sumArr(r)-sumArr(p):sumArr(p)-sumArr(r)])]}]),`lumina-budget-annuel-${y}.xlsx`);toast('✔ Fichier Excel téléchargé')};
}
/* v14 : ajouter / retirer une ligne du budget annuel */
function budgetAddLine(y){
  const nom=($('#ba-nom')?.value||'').trim().replace(/\s+/g,' '),type=$('#ba-type')?.value||'Dépense Variable',amt=Math.max(0,num($('#ba-amt')?.value));
  let grp=$('#ba-grp')?.value||'Besoins';
  if(nom.length<2){toast('⚠ '+t('Indiquez le nom du poste (2 caractères minimum).'));$('#ba-nom')?.focus();return}
  if(type==='Revenu')grp='Revenus';else if(grp==='Revenus')grp=type==='Épargne'?'Épargne':'Besoins';
  const C=list('categories');let c=C.find(x=>x.nom.toLowerCase()===nom.toLowerCase());
  if(c){c.off=false;if(amt)c.budget=amt}
  else{c={id:uid(),created:new Date().toISOString(),nom,type,groupe:grp,budget:amt,contenu:'',perso:1};C.push(c);DB.categories=C;if(typeof regGroup==='function')regGroup(grp)}
  const B=ensureBudget(y);B[c.nom]=Array(12).fill(amt||num(c.budget));
  save();refreshPage(budgetanPage);toast('✔ '+tp('Ligne « {n} » ajoutée au budget {y}',{n:c.nom,y}));
  setTimeout(()=>document.querySelector(`[data-bm="${CSS.escape(c.nom)}|0"]`)?.focus(),30);
}
function budgetDelLine(y,nom){
  const C=list('categories'),c=C.find(x=>x.nom===nom);if(!c)return;
  const used=list('finances').some(i=>i.cat===nom)||list('objectifs').some(o=>o.cat===nom);
  if(!confirm(used?tp('Mettre à 0 le poste « {n} » pour {y} ? Ses écritures sont conservées.',{n:nom,y}):tp('Retirer « {n} » du budget ? La catégorie, sans aucune écriture, sera supprimée.',{n:nom})))return;
  if(used){const B=ensureBudget(y);B[nom]=Array(12).fill(0)}
  else{DB.categories=C.filter(x=>x!==c);Object.values(DB.budgets||{}).forEach(B=>{if(B)delete B[nom]})}
  save();refreshPage(budgetanPage);toast('✔ '+t('Ligne retirée'));
}
function ensureBudget(y){DB.budgets=DB.budgets||{};if(!DB.budgets[y]){DB.budgets[y]={};list('categories').forEach(c=>{if(c.nom!=='Dîmes')DB.budgets[y][c.nom]=Array(12).fill(num(c.budget))})}return DB.budgets[y]}
function refreshPage(fn){const k=document.activeElement?.dataset?.bm,y0=scrollY;fn($('#main'));scrollTo(0,y0);if(k)document.querySelector(`[data-bm="${CSS.escape(k)}"]`)?.focus()}

/* =====================================================================
   PLAN FINANCIER 15 ANS — projection simplifiée par scénario
   ===================================================================== */
const SCEN={prudent:{n:'Prudent',g:2,inf:4,r:3},realiste:{n:'Réaliste',g:4,inf:3,r:5},optimiste:{n:'Optimiste',g:6,inf:2.5,r:7}};
function planModel(){
  const pl=DB.plan||{},sc=SCEN[pl.scen]||SCEN.prudent,g=(pl.g!=null&&pl.g!==''?num(pl.g):sc.g)/100,inf=(pl.inf!=null&&pl.inf!==''?num(pl.inf):sc.inf)/100,r=(pl.r!=null&&pl.r!==''?num(pl.r):sc.r)/100,alloc=(pl.alloc!=null&&pl.alloc!==''?num(pl.alloc):70)/100,stress=pl.stress!=='Non';
  const cy=new Date().getFullYear(),Y0=cy+1,N=Math.min(40,Math.max(5,num(pl.horizon)||15)),yd=y=>{const a=periodItems(String(y),'0',BASES[0]);return{rev:sumK(a,'rev'),dep:sumK(a,'dep'),epa:sumK(a,'epa'),pret:a.filter(i=>kind(i)==='dep'&&i.cat==='Remboursements prêt').reduce((x,i)=>x+num(i.montant),0)}};
  const ld=list('finances').filter(i=>i.cat==='Remboursements prêt'&&i.statut!=='❌ Annulé').map(i=>i.date).sort(),loanEnd=ld.length?+ld[ld.length-1].slice(0,4):0;
  let prev=null;for(let y=cy;y>=cy-5&&!prev;y--){const d=yd(y);if(d.rev>0)prev=d}
  const paid0=list('finances').filter(i=>i.type==='Épargne'&&i.cat!=='Investissement bourse'&&(i.statut==='✅ Payé'||i.statut==='🔁 Automatique')&&(i.date||'')<=ltoday()).reduce((x,i)=>x+num(i.montant),0),bv=positions().filter(p=>p.qte>.0001).reduce((x,p)=>x+p.val,0);
  const paid=DB.profile?.epargneSolde!=null&&DB.profile.epargneSolde!==''?num(DB.profile.epargneSolde):paid0;let W=paid+bv;const rows=[];let cum=0;
  if(!prev)return{rows,sc,g,inf,r,alloc,stress,W0:W,loanEnd,Y0,N,empty:true};
  for(let k=0;k<N;k++){const y=Y0+k,d=yd(y);let rev,dep,epaPlan,pret,src;
    if(d.rev>0){rev=d.rev;dep=d.dep;epaPlan=d.epa;pret=d.pret;src='data'}
    else{rev=prev.rev*(1+g);pret=(loanEnd&&y>loanEnd)?0:prev.pret;dep=(prev.dep-prev.pret)*(1+inf)+pret;epaPlan=Math.max(0,rev-dep)*alloc;src='proj'}
    const dispo=rev-dep,st=stress?rev*.03+(k===4?dep/12*2:0):0,epa=Math.max(0,epaPlan-st);
    W=W*(1+r)+epa;cum+=epa;rows.push({y,rev,dep,dispo,epa,taux:rev?epa/rev*100:0,W,pret,src,st});prev={rev,dep,pret}}
  return{rows,sc,g,inf,r,alloc,stress,W0:paid+bv,loanEnd,Y0,N,cum};
}
function planPage(el){
  const P=planModel(),pl=DB.plan||{},det=P.rows.find(x=>String(x.y)===String(pl.detail))||P.rows[3]||P.rows[0];
  const sel=(k,arr,v)=>`<select data-p15="${k}">${arr.map(([a,b])=>`<option value="${a}" ${String(a)===String(v)?'selected':''}>${t(b)}</option>`).join('')}</select>`;
  if(P.empty){el.innerHTML=`<div class="head"><h1>${ic('target')} Plan financier</h1></div><div class="card empty">${t('Ajoutez des revenus et des dépenses (réels ou prévus) pour lancer la projection.')}</div>`;return}
  const last=P.rows[P.rows.length-1],ph2=P.rows.filter(x=>!P.loanEnd||x.y>P.loanEnd),tx2=ph2.length?avg(ph2.map(x=>x.taux)):avg(P.rows.map(x=>x.taux)),obj=num(DB.profile?.objectif);
  el.innerHTML=`<div class="head"><h1>${ic('target')} Plan financier ${P.Y0} → ${P.Y0+P.N-1}</h1></div>
  <div class="card"><h2>${ic('settings')} Hypothèses</h2><div class="fg"><div><label>Durée de la projection</label>${sel('horizon',[10,15,20,25,30].map(n=>[n,n+' ans']),P.N)}</div><div><label>Scénario économique</label>${sel('scen',Object.entries(SCEN).map(([k,v])=>[k,v.n]),pl.scen||'prudent')}</div><div><label>Stress-test des imprévus</label>${sel('stress',[['Oui','Oui'],['Non','Non']],pl.stress||'Oui')}</div>
  <div><label>Croissance annuelle des revenus (%)</label><input type="number" step="any" data-p15="g" value="${f1(P.g*100)}"></div><div><label>Inflation des charges (%)</label><input type="number" step="any" data-p15="inf" value="${f1(P.inf*100)}"></div><div><label>Rendement de l’épargne (%)</label><input type="number" step="any" data-p15="r" value="${f1(P.r*100)}"></div><div><label>Part du disponible épargnée (%)</label><input type="number" min="0" max="100" data-p15="alloc" value="${Math.round(P.alloc*100)}"></div></div>
  <p class="mute small" style="margin:10px 0 0">${t('Les années déjà planifiées dans vos finances sont reprises telles quelles ; au-delà, les revenus croissent, les charges suivent l’inflation et la mensualité du prêt disparaît après sa dernière échéance. Le stress-test retire 3 % des revenus par an et un choc de 2 mois de charges la 5ᵉ année.')}</p></div>
  <div class="grid"><div class="stat s4"><small>${tp('Patrimoine financier fin {y}',{y:last.y})}</small><b class="good">${fmt(last.W)}</b></div><div class="stat"><small>${t('Épargne cumulée')}</small><b>${fmt(P.cum)}</b></div><div class="stat s3"><small>${t('Patrimoine de départ')}</small><b>${fmt(P.W0)}</b></div><div class="stat s2"><small>${t('Taux d’épargne moyen (après le prêt)')}</small><b>${pct(tx2)}</b></div>${obj?`<div class="stat ${last.W>=obj?'s4':'s2'}"><small>${t('Objectif de patrimoine')}</small><b>${pct(last.W/obj*100)}</b><small>${fmt(obj)}</small></div>`:''}</div>
  <div class="card"><h2>${ic('trend')} Évolution du patrimoine</h2>${line(P.rows.map(x=>({l:String(x.y),v:Math.round(x.W)})))}</div>
  <div class="card tw"><h2>${ic('list')} Synthèse annuelle</h2><table><thead><tr><th>Année</th><th class="num">Revenus</th><th class="num">Charges</th><th class="num">Disponible avant épargne</th><th class="num">Épargne</th><th class="num">Taux</th><th class="num">Patrimoine</th></tr></thead><tbody>
  ${P.rows.map(x=>`<tr><td><b>${x.y}</b> ${x.src==='data'?'<span class="pill brand">'+t('planifié')+'</span>':''}</td><td class="num">${nf(x.rev)}</td><td class="num">${nf(x.dep)}</td><td class="num ${x.dispo<0?'bad':''}">${x.dispo<0?'('+nf(-x.dispo)+')':nf(x.dispo)}</td><td class="num">${nf(x.epa)}</td><td class="num">${pct(x.taux)}</td><td class="num"><b>${nf(x.W)}</b></td></tr>`).join('')}</tbody></table></div>
  <div class="card"><h2>${ic('calendar')} Détail d’une année ${sel('detail',P.rows.map(x=>[x.y,String(x.y)]),det.y).replace('<select','<select style="width:auto;margin-left:10px"')}</h2><div class="tiles"><div class="tile a1"><small>Revenus</small><b>${fmt(det.rev)}</b></div><div class="tile a2"><small>Charges</small><b>${fmt(det.dep)}</b></div><div class="tile a4"><small>Épargne</small><b class="good">${fmt(det.epa)}</b></div></div>
  <p class="mute small" style="margin:10px 0 0">${tp('Mensualité moyenne disponible : {a} · Prêt restant cette année : {p}',{a:fmt(det.dispo/12),p:fmt(det.pret)})}</p>${note3('Simulation indicative fondée sur vos données et sur des hypothèses : ce n’est pas un conseil en investissement.')}</div>`;
}
const note3=s=>`<p class="mute small" style="margin:8px 0 0">${t(s)}</p>`;
PAGES.budgetan=budgetanPage;PAGES.plan15=planPage;

/* =====================================================================
   CONSEILS ET RECOMMANDATIONS PAR RUBRIQUE
   ===================================================================== */
const L=(l,s)=>({l,t:s});
const yAgg=()=>{const a=periodItems(DS.y,DS.m,DS.base);return{a,rev:sumK(a,'rev'),dep:sumK(a,'dep'),epa:sumK(a,'epa'),months:nMonths()}};
const ADV={
 finances(){const {a,rev,dep,epa,months}=yAgg(),A=[];
  if(rev){const tx=epa/rev*100;
   if(tx<5)A.push(L('bad',tp('Taux d’épargne de {p} % : très faible. Visez au moins 10 %, idéalement 20 %.',{p:f1(tx)})));else if(tx<10)A.push(L('warn',tp('Taux d’épargne de {p} % : visez au moins 10 à 20 % de vos revenus.',{p:f1(tx)})));else if(tx>=20)A.push(L('ok',tp('Excellent taux d’épargne ({p} %). Pensez à placer cette épargne là où elle rapporte.',{p:f1(tx)})));
   if(dep+epa>rev)A.push(L('bad',tp('Les sorties dépassent les revenus de {a} sur la période : réduisez les dépenses variables.',{a:fmt(dep+epa-rev)})))}
  const over=budgetRows(a,rev,months).filter(x=>x.c.type!=='Revenu'&&!isGood(x.c)&&x.t>0&&x.r>x.t*1.05);
  if(over.length)A.push(L('warn',tp('{n} catégorie(s) dépassent leur budget de plus de 5 % : {l}.',{n:over.length,l:over.slice(0,3).map(x=>esc(x.c.nom)).join(', ')})));
  const late=list('finances').filter(i=>i.statut==='⏳ En attente'&&i.date&&i.date<addDays(ltoday(),-30)).length;if(late)A.push(L('warn',tp('{n} paiement(s) en attente depuis plus de 30 jours : confirmez-les ou annulez-les.',{n:late})));
  const sav=list('finances').filter(i=>i.type==='Épargne'&&(i.statut==='✅ Payé'||i.statut==='🔁 Automatique')&&(i.date||'')<=ltoday()).reduce((x,i)=>x+num(i.montant),0),md=dep/months;
  if(md&&sav<3*md)A.push(L('warn',tp('Fonds d’urgence : visez 3 à 6 mois de dépenses, soit environ {a}.',{a:fmt(3*md)})));
  const sub=list('finances').filter(i=>kind(i)==='dep'&&i.cat==='Autres'&&counted(i,DS.base)&&inPeriod(i,DS.y,DS.m)).reduce((x,i)=>x+num(i.montant),0);if(rev&&sub/rev>.05)A.push(L('info',tp('La catégorie « Autres » pèse {p} % des revenus : classez ces dépenses pour mieux les maîtriser.',{p:f1(sub/rev*100)})));
  return A},
 categories(){const {a,rev}=yAgg(),A=[],C=list('categories'),spent=budgetRows(a,rev,1).filter(x=>x.c.type!=='Revenu'&&!x.t&&x.r>0);
  if(spent.length)A.push(L('warn',tp('{n} catégorie(s) ont des dépenses mais aucun budget cible : {l}.',{n:spent.length,l:spent.slice(0,3).map(x=>esc(x.c.nom)).join(', ')})));
  const exp=C.filter(c=>c.type==='Revenu').reduce((x,c)=>x+num(c.budget),0),out=C.filter(c=>c.type!=='Revenu'&&c.nom!=='Dîmes').reduce((x,c)=>x+num(c.budget),0)+exp*dimeTaux()/100*(C.some(c=>c.nom==='Dîmes')?1:0);
  if(exp&&out>exp)A.push(L('bad',tp('Vos budgets cibles mensuels ({o}) dépassent vos revenus attendus ({e}).',{o:fmt(out),e:fmt(exp)})));else if(exp)A.push(L('ok',tp('Budgets cohérents : il reste {a} par mois non affecté.',{a:fmt(exp-out)})));
  return A},
 objectifs(){const A=[];list('objectifs').forEach(o=>{const s=goalStats(o),cible=num(o.cible);if(!cible||!o.depuis)return;if(o.depuis>ltoday()){A.push(L('info',tp('« {n} » démarre le {d} : programmez un virement automatique.',{n:esc(o.nom),d:o.depuis})));return}
   const mo=Math.max(1,dayDiff(o.depuis,ltoday())/30.4),rate=s.real/mo;
   if(s.real>=cible)A.push(L('ok',tp('« {n} » est atteint : félicitations !',{n:esc(o.nom)})));else if(rate<=0)A.push(L('warn',tp('« {n} » : aucun versement enregistré depuis le {d}.',{n:esc(o.nom),d:o.depuis})));else A.push(L('info',tp('« {n} » : au rythme actuel ({r} / mois), objectif atteint dans environ {m} mois.',{n:esc(o.nom),r:fmt(rate),m:Math.ceil(s.reste/rate)})))});return A},
 investissements(){const I=list('investissements'),A=[],V=I.reduce((x,i)=>x+num(i.valeur),0);if(!I.length)return [L('info',tp('Ajoutez vos placements (immobilier, épargne, entreprise…) pour suivre votre patrimoine.'))];
  const by=group(I,'type','valeur');if(V&&by[0]&&by[0].v/V>.6)A.push(L('warn',tp('{p} % de votre patrimoine est en « {c} » : diversifiez entre classes d’actifs.',{p:Math.round(by[0].v/V*100),c:esc(by[0].l)})));
  I.filter(i=>perf(i)<-20).forEach(i=>A.push(L('warn',tp('« {n} » perd {p} % : réévaluez votre position.',{n:esc(i.actif),p:f1(-perf(i))}))));
  if(!list('bourse').length)A.push(L('info',tp('Suivez vos actions BRVM dans la rubrique Bourse BRVM (CMP, frais, gains).')));return A},
 bourse(){const P=positions().filter(p=>p.qte>.0001),A=[];if(!P.length)return [L('info',tp('Ajoutez vos ordres d’achat pour suivre le CMP, les frais et vos gains.'))];
  const tot=P.reduce((x,p)=>x+p.val,0),top=P[0];
  if(tot&&top.val/tot>.35)A.push(L('warn',tp('{n} représente {p} % du portefeuille : évitez de dépasser 25 à 30 % sur une seule société.',{n:esc(top.nom),p:Math.round(top.val/tot*100)})));
  const sec=group(P.map(p=>({s:p.secteur||'Autre',v:p.val})),'s','v');if(tot&&sec[0]&&sec[0].v/tot>.6)A.push(L('warn',tp('{p} % du portefeuille est en secteur « {s} » : ajoutez d’autres secteurs (agro-industrie, distribution, énergie).',{p:Math.round(sec[0].v/tot*100),s:t(sec[0].l)})));
  P.filter(p=>p.perf<-25).forEach(p=>A.push(L(p.perf<-40?'bad':'warn',tp('{n} est en perte de {p} % : vérifiez résultats et dividendes avant de renforcer ou d’arbitrer.',{n:esc(p.nom),p:f1(-p.perf)}))));
  const ba=P.reduce((x,p)=>x+p.ba,0),fr=P.reduce((x,p)=>x+p.frais,0);if(ba&&fr/ba>.015)A.push(L('warn',tp('Les frais représentent {p} % des montants investis : regroupez vos achats pour amortir le minimum de {m}.',{p:f1(fr/ba*100),m:fmt(bP().min)})));
  const age=coursAge();if(P.some(p=>p.missing))A.push(L('warn',tp('Cours manquant pour certaines sociétés : saisissez-les pour valoriser le portefeuille.')));else if(age!=null&&age>30)A.push(L('warn',tp('Cours non mis à jour depuis {n} jours : actualisez-les (brvm.org ou votre SGI).',{n:age})));
  if(P.length&&!list('bourse').some(o=>o.type==='Dividende'))A.push(L('info',tp('Aucun dividende saisi : enregistrez-les pour mesurer le rendement réel de vos titres.')));
  const g=P.reduce((x,p)=>x+p.gain,0),c=P.reduce((x,p)=>x+p.cout,0);if(g>0)A.push(L('ok',tp('Portefeuille en gain latent de {p} % : pensez à rééquilibrer plutôt qu’à tout concentrer.',{p:f1(g/c*100)})));
  A.push(L('info',tp('Après une opération sur titres (division d’actions, regroupement), ajoutez-la ici pour garder un CMP exact.')));return A},
 contacts(){const A=[],T=ltoday(),old=list('contacts').filter(c=>c.derniere&&dayDiff(c.derniere,T)>180);if(old.length)A.push(L('warn',tp('{n} contact(s) non revus depuis plus de 6 mois : {l}.',{n:old.length,l:old.slice(0,3).map(c=>esc(c.nom)).join(', ')})));
  const md=d=>d.slice(5),soon=list('contacts').filter(c=>c.anniv&&[0,1,2,3,4,5,6,7].some(k=>md(addDays(T,k))===md(c.anniv)));if(soon.length)A.push(L('info',tp('Anniversaire bientôt : {l}.',{l:soon.map(c=>esc(c.nom)).join(', ')})));return A},
 notes(){const n=list('notes').filter(x=>x.cat==='À faire').length;return n?[L('warn',tp('{n} note(s) « À faire » à traiter ou à planifier.',{n}))]:[]},
 journal(){const s=streak();return [L(s?'ok':'info',s?tp('Série de {n} jour(s) : continuez, trois lignes suffisent.',{n:s}):tp('Écrivez trois lignes aujourd’hui pour relancer votre série.'))]},
 sante(){const S=list('sante').filter(i=>i.date>=addDays(ltoday(),-30)),A=[];if(!S.length)return [L('info',tp('Aucune mesure sur 30 jours : notez poids, sommeil et activité pour suivre vos progrès.'))];
  const sl=S.filter(i=>num(i.sommeil)),sp=S.reduce((x,i)=>x+num(i.sport),0)/4.3;if(sl.length&&avg(sl.map(i=>num(i.sommeil)))<6.5)A.push(L('warn',tp('Sommeil moyen de {h} h : visez 7 à 8 h par nuit.',{h:f1(avg(sl.map(i=>num(i.sommeil))))})));
  if(sp<150)A.push(L('warn',tp('Activité d’environ {m} min par semaine : visez 150 minutes.',{m:Math.round(sp)})));else A.push(L('ok',tp('Activité régulière ({m} min par semaine) : bravo !',{m:Math.round(sp)})));
  const hp=S.filter(i=>{const m=/(\d+)\s*[\/-]\s*(\d+)/.exec(i.tension||'');if(!m)return false;let a=+m[1],b=+m[2];if(a<30){a*=10;b*=10}return a>=140||b>=90});if(hp.length)A.push(L('bad',tp('{n} mesure(s) de tension élevée relevée(s) : consultez un professionnel de santé.',{n:hp.length})));return A},
 coffre(){const A=[],T=ltoday(),C=list('coffre');if(!C.length)return [L('info',tp('Ajoutez vos documents essentiels (identité, assurances, diplômes, contrats).'))];
  C.filter(d=>d.expire&&d.expire<T).forEach(d=>A.push(L('bad',tp('« {n} » a expiré le {d} : renouvelez-le.',{n:esc(d.titre),d:d.expire}))));C.filter(d=>d.expire&&d.expire>=T&&d.expire<addDays(T,90)).forEach(d=>A.push(L('warn',tp('« {n} » expire le {d} : prévoyez le renouvellement.',{n:esc(d.titre),d:d.expire}))));return A},
 budget(){const {a,rev}=yAgg(),A=[];if(!rev)return A;const g=x=>a.filter(i=>kind(i)!=='rev'&&(catOf(i.cat)?.groupe||'')===x).reduce((s,i)=>s+num(i.montant),0)/rev*100;
  [['Besoins',50],['Envies',30],['Épargne',20]].forEach(([n,tg])=>{/* remplacé par ADV.budget de modules9.js (nouvelle taxonomie) */const p=g(n);if(p>tg*1.15)A.push(L('warn',tp('« {g} » représente {p} % des revenus (repère {t} %).',{g:t(n),p:f1(p),t:tg})))});
  const pret=a.filter(i=>kind(i)==='dep'&&i.cat==='Remboursements prêt').reduce((x,i)=>x+num(i.montant),0)/rev*100;if(pret>33)A.push(L('bad',tp('Endettement de {p} % : au-delà de 33 %, évitez tout nouveau crédit.',{p:f1(pret)})));return A}
};
ADV.dash=()=>[...ADV.finances(),...ADV.budget()].slice(0,5);
function adviceCard(k){
  let A=[];try{A=ADV[k]()||[]}catch(e){}
  if(!A.length)A=[L('ok',tp('Aucune recommandation particulière : continuez ainsi !'))];
  return `<div class="card"><h2>${ic('bulb')} Conseils et recommandations</h2>${A.map(x=>`<div class="al ${x.l}"><span class="ai">${ic(x.l==='bad'||x.l==='warn'?'alert':x.l==='ok'?'check':'bulb')}</span><div>${x.t}</div></div>`).join('')}</div>`;
}
['finances','categories','objectifs','investissements','bourse','contacts','notes','journal','sante','coffre'].forEach(k=>{const old=MODULES[k].top;MODULES[k].top=(a,all)=>adviceCard(k)+(old?old(a,all):'')});
{const d=dash,b=budgetPage;PAGES.dash=el=>{d(el);el.querySelector('.sech')?.insertAdjacentHTML('beforebegin',adviceCard('dash'))};PAGES.budget=el=>{b(el);el.querySelector('.grid')?.insertAdjacentHTML('beforebegin',adviceCard('budget'))}}

/* =====================================================================
   ALERTES (cloche clignotante), migration des données, actions
   ===================================================================== */
{const base=extraAlerts;extraAlerts=function(){
  const A=[...base()],P=positions().filter(p=>p.qte>.0001);
  P.filter(p=>p.perf<-40).forEach(p=>A.push({w:1,l:'bad',i:'trend',s:0,h:`<b>${esc(p.nom)}</b> — ${tp('moins-value latente de {p} %',{p:f1(-p.perf)})} <a href="#" data-go="bourse">${t('Voir')}</a>`}));
  const age=coursAge();if(P.length&&age!=null&&age>30)A.push({w:2,l:'warn',i:'clock',s:0,h:`<b>${t('Bourse BRVM')}</b> — ${tp('Cours non mis à jour depuis {n} jours : actualisez-les (brvm.org ou votre SGI).',{n:age})}`});
  if(DB.profile?.collectif){const S=collectifSums();if(Math.abs(S.ecart)>=1)A.push({w:1,l:'warn',i:'users',s:0,h:`<b>${t('Fonds collectif')} ${esc(DB.profile.collectifNom||'')}</b> — ${tp('Écart de {a} entre le collecté et (reste à payer + trésorerie) : vérifiez les saisies.',{a:fmt(Math.abs(S.ecart))})}`})}
  return A}}
function alertSummary(){const a=periodItems(DS.y,DS.m,DS.base),rows=budgetRows(a,sumK(a,'rev'),nMonths()),al=buildAlerts(rows,list('projets'));return{bad:al.filter(x=>x.l==='bad').length,warn:al.filter(x=>x.l==='warn').length}}
function updateBell(){const b=$('#bell');if(!b)return;let s={bad:0,warn:0};try{s=alertSummary()}catch(e){}
  b.innerHTML=ic('bell')+(s.bad+s.warn?`<span class="bdg ${s.bad?'bad blink':'warn'}">${s.bad||s.warn}</span>`:'');
  b.title=s.bad?tp('{n} alerte(s) critique(s)',{n:s.bad}):s.warn?tp('{n} point(s) à surveiller',{n:s.warn}):t('Aucune alerte');b.classList.toggle('alarm',s.bad>0)}
$('#bell').onclick=()=>go('dash');
function migrate2(){
  const S=window.LUMINA_SEED2;if(!S||typeof users!=='function'||ME.id!==users()[0]?.id)return;
  const now=new Date().toISOString();let ch=false;
  if(!DB.seed2){
    S.bourse.forEach(o=>list('bourse').push({id:uid(),created:now,type:'Achat',...o}));
    S.collectif.forEach(o=>list('collectif').push({id:uid(),created:now,...o}));
    DB.profile={...DB.profile,collectif:true,collectifNom:S.collectifNom};
    const c=list('categories').find(x=>x.nom==='Retenues Bancaire'||x.nom==='Fonds perdus / Frais bancaires');if(c&&num(c.budget)===8400)c.budget=7715;
    DB.seed2=1;ch=true}
  if(!DB.seed3){
    DB.cours=DB.cours||{};Object.entries(S.cours).forEach(([k,v])=>DB.cours[k.toUpperCase()]={prix:v,date:S.coursDate||ltoday()});
    (S.splits||[]).forEach(s=>{if(!list('bourse').some(o=>o.type==='Division (split)'&&String(o.societe).toUpperCase()===s.societe&&o.date===s.date))list('bourse').push({id:uid(),created:now,date:s.date,type:'Division (split)',societe:s.societe,qte:s.coef,pu:0,note:'Division par '+s.coef+' ('+s.coef+' actions nouvelles pour 1 ancienne)'})});
    const out=list('categories').filter(c=>c.type!=='Revenu'&&c.nom!=='Dîmes').reduce((x,c)=>x+num(c.budget),0),p=DB.profile||{};
    DB.profile={...p,lang:p.lang||'fr',country:p.country||'CI',currency:p.currency||'XOF',dimeAuto:'Non',budget:p.budget||out};
    DB.seed3=1;ch=true}
  if(ch)save();
}
document.addEventListener('change',ev=>{
  const e=ev.target;if(!ME||!e.dataset)return;
  if(e.dataset.cours!==undefined){DB.cours=DB.cours||{};if(num(e.value)>0)DB.cours[e.dataset.cours]={prix:num(e.value),date:ltoday()};else delete DB.cours[e.dataset.cours];save();render();return}
  if(e.dataset.bm){const [n,m]=e.dataset.bm.split('|'),B=ensureBudget(YY());B[n]=B[n]||Array(12).fill(0);B[n][+m]=Math.max(0,num(e.value));save();refreshPage(budgetanPage);return}
  if(e.dataset.p15){DB.plan=e.dataset.p15==='scen'?{scen:e.value,stress:DB.plan?.stress,alloc:DB.plan?.alloc}:{...DB.plan,[e.dataset.p15]:e.value};save();render()}
});
document.addEventListener('click',ev=>{
  const b=ev.target.closest('[data-x3]');if(!b||!ME)return;const x=b.dataset.x3,y=YY();
  if(x==='badd'){budgetAddLine(y);return}
  if(x==='bdel'){budgetDelLine(y,b.dataset.cat);return}
  if(x==='bfees'){DB.profile={...DB.profile,bMin:num($('#bf-min').value),bSgi:num($('#bf-sgi').value),bBrvm:num($('#bf-brvm').value)};save();render();toast('✔ Enregistré')}
  else if(x==='bfill'){if(DB.budgets?.[y]&&!confirm('Remplacer votre plan de cette année par les cibles mensuelles ?'))return;DB.budgets=DB.budgets||{};delete DB.budgets[y];ensureBudget(y);save();render()}
  else if(x==='bcopy'){const p=DB.budgets?.[String(+y-1)];if(!p){toast('⚠ Aucun plan pour l’année précédente');return}DB.budgets[y]=JSON.parse(JSON.stringify(p));save();render()}
  else if(x==='breel'){const R=monthlyReal(String(+y-1),DS.base);DB.budgets=DB.budgets||{};DB.budgets[y]={};list('categories').forEach(c=>{if(c.nom==='Dîmes')return;const r=R[c.nom+(c.type==='Revenu'?'|r':'|o')];DB.budgets[y][c.nom]=r?r.map(v=>Math.round(v)):Array(12).fill(num(c.budget))});save();render()}
  else if(x==='bclear'){if(confirm('Supprimer votre plan de cette année et revenir aux cibles mensuelles ?')){delete DB.budgets[y];save();render()}}
});
/* Menu */
{const ins=(after,...items)=>{const i=NAV.findIndex(n=>n[0]===after);NAV.splice(i+1,0,...items)};
 ins('budget',['budgetan','calendar','Budget annuel']);ins('objectifs',['plan15','target','Plan financier']);ins('investissements',['bourse','trend','Bourse BRVM']);ins('micro',['collectif','users','Fonds collectif']);}
