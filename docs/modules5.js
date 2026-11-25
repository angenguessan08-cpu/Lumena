/* =====================================================================
   LUMINA v5 — fonds collectif (échéances, versements), comparaison d'années,
   patrimoine & retraite, propositions d'épargne par objectif, alertes organisation / personnel
   ===================================================================== */
const sumBy=(a,f)=>a.reduce((x,i)=>x+f(i),0);
const cyr=()=>new Date().getFullYear();

/* ---------- 1. FONDS COLLECTIF : entrées / sorties / échéances ---------- */
CTYPES.push('Sortie');
const cRest=i=>i.type==='Reste à payer'?Math.max(0,num(i.montant)-num(i.verse)):0;
const cTotal=()=>DB.profile?.collectifTotal!=null&&DB.profile.collectifTotal!==''?num(DB.profile.collectifTotal):20655000;
function cStat(i){
  if(i.type!=='Reste à payer')return null;
  if(cRest(i)<=0)return{k:'ok',l:'✅ Soldé'};
  if(!i.echeance)return{k:'na',l:'Sans échéance'};
  const d=dayDiff(i.echeance,ltoday());
  if(d>0)return{k:'late',l:tp('⚠ En retard ({n} j)',{n:d}),d};
  if(d>=-7)return{k:'soon',l:tp('⏰ Échéance dans {n} j',{n:-d})};
  return{k:'run',l:'En cours'};
}
{const C=MODULES.collectif;
 C.defaults={type:'Collecté',echeance:'',dateverse:'',verse:''};
 C.fields=[{k:'date',l:'Date de prise / engagement',t:'date'},{k:'type',l:'Nature',t:'select',o:CTYPES},{k:'personne',l:'Personne / source'},{k:'libelle',l:'Libellé'},{k:'montant',l:'Montant (FCFA)',t:'number'},{k:'echeance',l:'Échéance (date limite)',t:'date'},{k:'verse',l:'Déjà payé / versé (FCFA)',t:'number'},{k:'dateverse',l:'Date du dernier versement',t:'date'},{k:'note',l:'Notes',t:'textarea',full:1}];
 C.cols=[{k:'date',l:'Date de prise'},{k:'type',l:'Nature',f:i=>badge(i.type)},{k:'personne',l:'Personne / source'},{k:'libelle',l:'Libellé'},{k:'montant',l:'Montant',cls:'num',f:i=>fmt(i.montant)},
  {k:'verse',l:'Payé',cls:'num',f:i=>i.type==='Reste à payer'?`<b class="good">${fmt(i.verse||0)}</b>`:'—'},
  {l:'Reste à payer',cls:'num',nosort:1,f:i=>i.type==='Reste à payer'?`<b class="${cRest(i)>0?'warn':'good'}">${fmt(cRest(i))}</b>`:'—'},
  {k:'echeance',l:'Échéance'},{k:'dateverse',l:'Dernier versement'},
  {l:'Signal',nosort:1,f:i=>{const s=cStat(i);return s?`<span class="${s.k==='late'?'bad bl':s.k==='soon'?'warn':s.k==='ok'?'good':'mute'}">${esc(s.l)}</span>`:''}}];
 C.rowAct=i=>i.type==='Reste à payer'?`<button class="ghost" data-x5="vers" data-id="${i.id}" title="${t('Enregistrer un versement (négatif pour corriger)')}">± ${t('Versement')}</button>`:'';
 C.summary=a=>`<span>${t('Lignes')} <b>${a.length}</b></span><span>${t('Reste à payer')} <b class="warn">${fmt(sumBy(a,cRest))}</b></span>`;
 C.top=()=>collectifTop5();
}
collectifSums=function(){
  const L=list('collectif'),s=ty=>sumBy(L.filter(i=>i.type===ty),i=>num(i.montant)),C=s('Collecté'),R=sumBy(L,cRest),E=s('Espèce'),B=s('Banque'),So=s('Sortie');
  return{C,R,E,B,So,T:E+B-So,ecart:C-(R+E+B)};
};
function collectifMouvements(){
  const L=list('collectif'),M=[];
  L.filter(i=>i.type==='Collecté').forEach(i=>M.push({d:i.date||'',s:1,l:i.libelle||i.personne||'Collecté',a:num(i.montant)}));
  L.filter(i=>i.type==='Reste à payer').forEach(i=>(i.hist||[]).forEach(h=>M.push({d:h.d,s:h.a>=0?1:-1,l:(i.personne||i.libelle)+(h.a>=0?' — versement':' — correction'),a:Math.abs(h.a)})));
  L.filter(i=>i.type==='Sortie').forEach(i=>M.push({d:i.date||'',s:-1,l:i.libelle||i.personne||'Sortie',a:num(i.montant)}));
  M.sort((x,y)=>x.d<y.d?-1:x.d>y.d?1:0);let c=0;M.forEach(m=>{c+=m.s*m.a;m.c=c});return M;
}
function collectifTop5(){
  const S=collectifSums(),nom=DB.profile?.collectifNom||'',tot=cTotal(),L=list('collectif'),RP=L.filter(i=>i.type==='Reste à payer'),
    late=RP.filter(i=>cStat(i)?.k==='late'),soon=RP.filter(i=>cStat(i)?.k==='soon'),noEch=RP.filter(i=>cRest(i)>0&&!i.echeance),
    enc=S.C-S.R,reste=Math.max(0,tot-S.C),p=tot?Math.min(100,S.C/tot*100):0,M=collectifMouvements().slice(-8).reverse();
  const names=a=>a.map(i=>esc(i.personne||i.libelle)).join(', ');
  return `<div class="card"><h2>${ic('users')} ${t('Fonds collectif')} ${esc(nom)}</h2>
  <div class="fg"><div><label>${t('Montant total attendu (FCFA)')}</label><input type="number" min="0" data-x5="total" value="${tot}"></div></div>
  <div class="tiles" style="margin-top:12px"><div class="tile a1"><small>${t('Total attendu')}</small><b>${fmt(tot)}</b></div><div class="tile a4"><small>${t('Collecté / engagé')}</small><b class="good">${fmt(S.C)}</b></div><div class="tile a3"><small>${t('Reste à collecter')}</small><b class="${reste>0?'warn':'good'}">${fmt(reste)}</b></div></div>
  <div class="bar" style="margin:12px 0 4px"><i style="width:${p}%"></i></div><p class="mute small" style="margin:0 0 12px">${tp('{p} % du total attendu est collecté',{p:Math.round(p)})}</p>
  <div class="tiles"><div class="tile a4"><small>${t('Déjà encaissé')}</small><b class="good">${fmt(enc)}</b></div><div class="tile a2"><small>${t('Reste à payer (créances)')}</small><b class="${S.R>0?'warn':'good'}">${fmt(S.R)}</b></div><div class="tile a3"><small>${t('Sorties (dépenses du fonds)')}</small><b>${fmt(S.So)}</b></div><div class="tile a4"><small>${t('Solde disponible (espèce + banque − sorties)')}</small><b class="${S.T>=0?'good':'bad'}">${fmt(S.T)}</b></div></div></div>
  ${late.length?`<div class="al bad"><span class="ai">${ic('alert')}</span><div><b>${tp('{n} paiement(s) en retard',{n:late.length})}</b> — ${names(late)} · <span class="amt bad">${fmt(sumBy(late,cRest))}</span></div></div>`:''}
  ${soon.length?`<div class="al warn"><span class="ai">${ic('clock')}</span><div><b>${tp('{n} échéance(s) dans les 7 jours',{n:soon.length})}</b> — ${names(soon)} · <span class="amt warn">${fmt(sumBy(soon,cRest))}</span></div></div>`:''}
  ${noEch.length?`<div class="al"><span class="ai">${ic('calendar')}</span><div>${tp('{n} ligne(s) « Reste à payer » sans échéance : renseignez la date limite pour activer la signalisation.',{n:noEch.length})}</div></div>`:''}
  <div class="al ${Math.abs(S.ecart)<1?'ok':'warn'}"><span class="ai">${ic(Math.abs(S.ecart)<1?'check':'alert')}</span><div><b>${t('Rapprochement')}</b> — ${Math.abs(S.ecart)<1?t('Collecté = reste à payer + trésorerie : les comptes concordent.'):tp('Écart de {a} entre le collecté et (reste à payer + trésorerie) : vérifiez les saisies.',{a:fmt(Math.abs(S.ecart))})}</div></div>
  <div class="card tw"><h2>${ic('list')} ${t('Entrées et sorties récentes')}</h2>${M.length?`<table><thead><tr><th>${t('Date')}</th><th>${t('Sens')}</th><th>${t('Libellé')}</th><th class="num">${t('Montant')}</th><th class="num">${t('Cumul')}</th></tr></thead><tbody>${M.map(m=>`<tr><td>${esc(m.d||'—')}</td><td><span class="${m.s>0?'good':'bad'}">${m.s>0?'▲ '+t('Entrée'):'▼ '+t('Sortie')}</span></td><td>${esc(m.l)}</td><td class="num">${fmt(m.a)}</td><td class="num"><b>${fmt(m.c)}</b></td></tr>`).join('')}</tbody></table>`:`<span class="mute">${t('Aucun mouvement pour le moment.')}</span>`}
  <p class="mute small" style="margin:8px 0 0">${t('« ± Versement » sur une ligne « Reste à payer » ajoute (ou retire, si négatif) un versement : le reste à payer et les totaux se recalculent aussitôt. Une « Sortie » est une dépense du fonds.')}</p></div>
  <p class="mute small" style="margin:8px 0 0">${t('Module facultatif : activable ou désactivable dans Réglages. Les données de ce fonds restent dans votre compte.')}</p>`;
}

/* ---------- 2. COMPARAISON ENTRE ANNÉES ---------- */
const CM=()=>{DB.cmp=DB.cmp||{};return DB.cmp};
function yearData(y){const a=periodItems(y,'0',DS.base),rev=sumK(a,'rev'),dep=sumK(a,'dep'),epa=sumK(a,'epa'),pret=sumBy(a.filter(i=>kind(i)==='dep'&&i.cat==='Remboursements prêt'),i=>num(i.montant));return{a,rev,dep,epa,solde:rev-dep-epa,tEp:rev?epa/rev*100:0,tEnd:rev?pret/rev*100:0}}
function comparePage(el){
  const all=dataYears(),sel=CM().years&&CM().years.length?CM().years.filter(y=>all.includes(y)):all.slice(-4),Y=all.filter(y=>sel.includes(y)),D=Y.map(yearData);
  const dl=(v,p)=>p?`<small class="${v>=p?'good':'bad'}">${v>=p?'▲':'▼'} ${pct(Math.abs((v-p)/p*100))}</small>`:'';
  const row=(l,k,inv)=>`<tr><td>${t(l)}</td>${D.map((x,i)=>`<td class="num">${fmt(x[k])} ${i&&D[i-1][k]?`<small class="${(x[k]>=D[i-1][k])!==!!inv?'good':'bad'}">${x[k]>=D[i-1][k]?'▲':'▼'} ${pct(Math.abs((x[k]-D[i-1][k])/D[i-1][k]*100))}</small>`:''}</td>`).join('')}</tr>`;
  const cats=list('categories').map(c=>({c,v:D.map(x=>sumBy(x.a.filter(i=>i.cat===c.nom),i=>num(i.montant)))})).filter(x=>x.v.some(v=>v>0)).sort((p,q)=>Math.max(...q.v)-Math.max(...p.v));
  el.innerHTML=`<div class="head"><h1>${ic('chart')} Comparaison entre années</h1></div>
  <div class="card"><h2>${ic('calendar')} Années à comparer</h2><div class="chips">${all.map(y=>`<button class="${Y.includes(y)?'':'ghost'}" data-x5="cmpy" data-y="${y}">${y}</button>`).join('')}<button class="ghost" data-x5="cmpall">${t('Toutes les années')}</button></div>
  <p class="mute small" style="margin:8px 0 0">${t('Base de calcul')} : ${esc(t(DS.base))} — ${t('modifiable dans le Tableau de bord.')}</p></div>
  ${Y.length?`<div class="card"><h2>${ic('chart')} ${t('Revenus, dépenses et solde par année')}</h2>${combo({labels:Y,bars:[{n:'Revenus',v:D.map(x=>x.rev),c:'var(--lime)'},{n:'Dépenses',v:D.map(x=>x.dep),c:'var(--bad)'}],lines:[{n:'Solde',v:D.map(x=>x.solde),c:'var(--brand)'},{n:'Épargne',v:D.map(x=>x.epa),c:'var(--warn)',dash:true}]})}</div>
  <div class="card tw"><h2>${ic('list')} ${t('Synthèse annuelle')}</h2><table class="mgrid"><thead><tr><th>${t('Indicateur')}</th>${Y.map(y=>`<th class="num">${y}</th>`).join('')}</tr></thead><tbody>
  ${row('Revenus','rev')}${row('Dépenses','dep',1)}${row('Épargne et investissement','epa')}${row('Solde','solde')}
  <tr><td>${t('Taux d’épargne')}</td>${D.map(x=>`<td class="num">${pct(x.tEp)}</td>`).join('')}</tr><tr><td>${t('Taux d’endettement')}</td>${D.map(x=>`<td class="num"><span class="${x.tEnd>33?'bad':'good'}">${pct(x.tEnd)}</span></td>`).join('')}</tr></tbody></table></div>
  <div class="card tw"><h2>${ic('grid')} ${t('Comparaison par catégorie')}</h2><table class="mgrid"><thead><tr><th>${t('Catégorie')}</th>${Y.map(y=>`<th class="num">${y}</th>`).join('')}<th class="num">${t('Évolution')}</th></tr></thead><tbody>${cats.map(({c,v})=>{const f=v[0],l=v[v.length-1],bad=c.type==='Revenu'?l<f:l>f;return `<tr><td>${esc(c.nom)}</td>${v.map(x=>`<td class="num">${x?fmt(x):'—'}</td>`).join('')}<td class="num">${v.length>1&&f?`<b class="${bad?'bad':'good'}">${l>=f?'▲':'▼'} ${pct(Math.abs((l-f)/f*100))}</b>`:'—'}</td>`}).join('')}</tbody></table></div>`:`<div class="card"><span class="mute">${t('Sélectionnez au moins une année.')}</span></div>`}`;
}
PAGES.compare=comparePage;

/* ---------- 3. PATRIMOINE (bourse incluse) & OBJECTIF RETRAITE ---------- */
function wealth(){
  const inv=list('investissements'),P=positions().filter(p=>p.qte>.0001),bv=sumBy(P,p=>p.val),bc=sumBy(P,p=>p.cout),other=sumBy(inv,i=>num(i.valeur)),oc=sumBy(inv,i=>num(i.investi));
  return{bv,bc,other,oc,total:other+bv,cost:oc+bc,items:[...group(inv,'type','valeur'),...(bv>0?[{l:'Actions BRVM (portefeuille)',v:bv}]:[])].sort((a,b)=>b.v-a.v)};
}
{const I=MODULES.investissements,s0=I.summary;
 I.summary=a=>{const W=wealth();return s0(a)+(W.bv>0?`<span>Portefeuille BRVM <b>${fmt(W.bv)}</b></span><span>Total investi (tous actifs) <b>${fmt(W.cost)}</b></span><span>Patrimoine investi <b class="good">${fmt(W.total)}</b></span>`:'')};
 I.top=()=>retraiteTop();
}
const RT=()=>{DB.retraite=DB.retraite||{};return DB.retraite};
function retraiteTop(){
  const W=wealth(),R=RT(),g=(R.r!=null&&R.r!==''?num(R.r):6)/100,n=Math.max(1,num(R.n)||15),ey=String(DB.epargne?.year||cyr()+1),X=epargneModel(ey),S=a=>a.reduce((x,v)=>x+v,0);
  const last=dataYears().filter(y=>+y<cyr()).pop(),yd=last?yearData(last):null,exp=yd?yd.dep:S(X.obl),sug=Math.round(exp*25/100000)*100000;
  const O=num(DB.profile?.objectif)||sug,sold=num(DB.profile?.epargneSolde),V0=W.total+sold,fv=V0*Math.pow(1+g,n),gap=Math.max(0,O-fv),i=g/12,N=12*n,pmt=gap>0?(i?gap*i/(Math.pow(1+i,N)-1):gap/N):0;
  const cap=(S(X.urg)+S(X.pro)+S(X.bou))/12,ok=cap>=pmt,top=W.items[0],conc=W.total?top?.v/W.total*100:0,urgTarget=exp/12*6;
  const act=[];
  if(sold<urgTarget)act.push(tp('Constituer le fonds d’urgence : viser 6 mois de charges, soit {a}. Solde actuel : {b}.',{a:fmt(urgTarget),b:fmt(sold)}));
  if(conc>60)act.push(tp('Diversifier : {p} % du patrimoine investi est en « {c} ». Répartissez sur au moins 3 classes d’actifs.',{p:Math.round(conc),c:top.l}));
  if(gap>0)act.push(tp('Verser environ {a} / mois (soit {b} / an) pour atteindre l’objectif dans {n} ans à {r} % de rendement.',{a:fmt(pmt),b:fmt(pmt*12),n,r:+(g*100).toFixed(1)}));
  act.push('Automatiser le virement d’épargne le jour du salaire (payer d’abord son avenir).');
  act.push('Mettre à jour les cours de la bourse chaque mois et réinvestir les dividendes.');
  act.push('Revoir cet objectif chaque année et après chaque changement de revenu.');
  const ideas=[['Titres de dette publique (bons et obligations d’État de votre zone)','Faible risque, revenus réguliers : base de la partie « sécurité ».'],['Actions à dividendes de votre bourse régionale (ex. BRVM)','Horizon 5 à 10 ans minimum ; achats échelonnés chaque mois plutôt qu’en une fois.'],['Immobilier : terrain ou locatif','Rendement et protection contre l’inflation ; tenir compte des frais, de la fiscalité et du crédit existant.'],['Épargne retraite / assurance-vie','Discipline à long terme et avantages fiscaux possibles selon le pays ; comparer les frais.'],['Activité complémentaire ou projet local','Un second revenu accélère l’objectif plus que le rendement ; limiter la mise à ce que vous pouvez perdre.']];
  return `<div class="g2"><div class="card"><h2>${ic('chart')} ${t('Allocation du patrimoine')}</h2>${donut(W.items)}<p class="mute small" style="margin:8px 0 0">${t('Inclut l’ensemble du portefeuille de bourse (valeur de marché). Si un actif de la liste figure déjà dans le portefeuille BRVM, supprimez-le ici pour éviter un doublon.')}</p></div>
  <div class="card"><h2>${ic('target')} ${t('Objectif retraite / patrimoine')}</h2>
  <div class="fg"><div><label>${t('Objectif de patrimoine (FCFA)')}</label><input type="number" min="0" data-x5="obj" value="${num(DB.profile?.objectif)||''}" placeholder="${sug}"></div><div><label>${t('Horizon (années)')}</label><input type="number" min="1" max="50" data-x5="rn" value="${n}"></div><div><label>${t('Rendement annuel espéré (%)')}</label><input type="number" min="0" step="any" data-x5="rr" value="${g*100}"></div></div>
  <p style="margin:12px 0 4px"><b>${fmt(V0)}</b> ${t('aujourd’hui')} → <b>${fmt(fv)}</b> ${tp('dans {n} ans (sans nouveau versement)',{n})} · ${t('objectif')} <b>${fmt(O)}</b>${num(DB.profile?.objectif)?'':` <span class="mute">(${t('suggéré : 25 × les dépenses annuelles')})</span>`}</p>
  <div class="bar"><i style="width:${Math.min(100,fv/(O||1)*100)}%"></i></div>
  <div class="al ${gap<=0||ok?'ok':'warn'}" style="margin-top:12px"><span class="ai">${ic(gap<=0||ok?'check':'alert')}</span><div>${gap<=0?t('Objectif atteignable sans versement supplémentaire.'):tp('Versement mensuel nécessaire : {a}. Capacité d’épargne proposée en {y} : {b} / mois — {s}.',{a:fmt(pmt),y:ey,b:fmt(cap),s:ok?t('suffisant'):t('insuffisant : allongez l’horizon ou réduisez l’objectif')})}</div></div></div></div>
  <div class="g2"><div class="card tw"><h2>${ic('coins')} ${tp('Budget proposé {y}',{y:ey})}</h2><table><thead><tr><th>${t('Poste')}</th><th class="num">${t('Mensuel')}</th><th class="num">${t('Annuel')}</th></tr></thead><tbody>
  ${[['Fonds d’urgence / précaution',X.urg],['Épargne de projet',X.pro],['Bourse (investissement)',X.bou],['Épargne logement (PEL, long terme)',X.pel],['Imprévus',X.imp]].map(([l,a])=>`<tr><td>${t(l)}</td><td class="num">${fmt(S(a)/12)}</td><td class="num">${fmt(S(a))}</td></tr>`).join('')}
  <tr class="trow"><td><b>${t('Épargne + investissement proposés')}</b></td><td class="num"><b>${fmt(cap)}</b></td><td class="num"><b>${fmt(cap*12)}</b></td></tr></tbody></table><p class="mute small" style="margin:8px 0 0">${t('Calculé à partir de vos revenus, crédits, prélèvements et imprévus (page Épargne & Bourse).')}</p></div>
  <div class="card"><h2>${ic('checksq')} ${t('Actions à mener')}</h2><ul class="tips">${act.map(x=>`<li>${/^[A-ZÉ][^{]/.test(x)&&!x.includes(' — ')?t(x):esc(x)}</li>`).join('')}</ul></div></div>
  <div class="card"><h2>${ic('bulb')} ${t('Idées d’investissement pour le long terme')}</h2><div class="g2" style="margin:0">${ideas.map(([a,b])=>`<div class="idea"><b>${t(a)}</b><p class="mute small" style="margin:4px 0 0">${t(b)}</p></div>`).join('')}</div><p class="mute small" style="margin:10px 0 0">${t('Pistes générales, pas un conseil financier personnalisé : les produits disponibles, les frais et la fiscalité varient selon le pays. Ne placez à long terme que ce dont vous n’avez pas besoin avant l’échéance.')}</p></div>`;
}

/* ---------- 4. OBJECTIFS D'ÉPARGNE : montants proposés ---------- */
function goalPlan(){
  const y=String(DB.epargne?.year||cyr()+1),X=epargneModel(y),S=a=>a.reduce((x,v)=>x+v,0),G=list('objectifs'),
    bucket=o=>{const n=nrm(o.nom);return /precaution|urgence|securite/.test(n)?'u':/bourse|invest|action|enfant/.test(n)?'b':'p'},
    cnt={u:0,p:0,b:0};G.forEach(o=>cnt[bucket(o)]++);
  const ann={u:S(X.urg),p:S(X.pro),b:S(X.bou)},M={};
  G.forEach(o=>{const b=bucket(o),a=ann[b]/(cnt[b]||1),s=goalStats(o),mo=a/12;M[o.id]={y,a,mo,reste:s.reste,mois:mo>0&&s.reste>0?Math.ceil(s.reste/mo):0,fin:mo>0&&s.reste>0?new Date(cyr(),new Date().getMonth()+Math.ceil(s.reste/mo),1).toISOString().slice(0,7):''}});
  return{y,M,cap:(ann.u+ann.p+ann.b),X};
}
MODULES.objectifs.card=function(o){
  const s=goalStats(o),p=Math.min(100,s.real/(num(o.cible)||1)*100),g=goalPlan().M[o.id]||{mo:0,a:0,mois:0,y:''};
  return `<div class="pc"><div class="pb"><div class="t">🎯 ${esc(o.nom)}</div><div class="s">${t('Cible')} ${fmt(o.cible)} · ${t('depuis')} ${esc(o.depuis||'—')}</div><div class="bar"><i style="width:${p}%"></i></div>
  <div class="s"><b class="good">${fmt(s.real)}</b> ${t('réalisé')} (${pct(p)}) · ${t('reste')} ${fmt(s.reste)}</div><div class="s">${t('Prévu incl. en attente :')} ${fmt(s.prevu)}</div>
  <div class="prop"><b>💡 ${t('Proposé')} ${esc(g.y)}</b> : ${fmt(g.mo)} / ${t('mois')} · ${fmt(g.a)} / ${t('an')}${g.mois?`<br><small>${tp('Objectif atteint dans ≈ {n} mois ({d})',{n:g.mois,d:g.fin})}</small>`:''}</div>${actions('objectifs',o)}</div></div>`;
};
MODULES.objectifs.top=()=>{
  const G=goalPlan(),obj=list('objectifs'),tot=obj.reduce((x,o)=>x+(G.M[o.id]?.a||0),0);
  return `<div class="card"><h2>${ic('coins')} ${tp('Montants proposés {y}',{y:G.y})}</h2><div class="tiles"><div class="tile a1"><small>${t('Épargne + bourse proposées / mois')}</small><b class="good">${fmt(tot/12)}</b></div><div class="tile a3"><small>${t('Par an')}</small><b>${fmt(tot)}</b></div><div class="tile a2"><small>${t('Revenus de l’année')}</small><b>${fmt(G.X.rev.reduce((x,v)=>x+v,0))}</b></div></div>
  <p class="mute small" style="margin:10px 0 0">${t('Propositions calculées à partir de vos revenus, crédits, prélèvements et imprévus. Ajustez les pourcentages dans Épargne & Bourse.')} <a href="#" data-go="epargne">${t('Épargne & Bourse')}</a></p></div>`;
};

/* ---------- 5. ALERTES : planning, tâches, organisation, personnel ---------- */
{const base=extraAlerts;extraAlerts=function(){
  const A=[...base()],td=ltoday(),tm=addDays(td,1),pl=d=>itemsOn(d).filter(x=>x.type==='ev');
  const e0=pl(td),e1=pl(tm);
  if(e0.length)A.push({w:2,l:'warn',i:'calendar',s:0,h:`<b>${t('Planning')}</b> — ${tp('{n} événement(s) aujourd’hui : {x}',{n:e0.length,x:e0.slice(0,3).map(x=>esc((x.time?x.time+' ':'')+x.title)).join(' · ')})} <a href="#" data-go="planning">${t('Voir')}</a>`});
  if(e1.length)A.push({w:3,l:'warn',i:'calendar',s:0,h:`<b>${t('Planning')}</b> — ${tp('{n} événement(s) demain : {x}',{n:e1.length,x:e1.slice(0,3).map(x=>esc((x.time?x.time+' ':'')+x.title)).join(' · ')})}`});
  const soon=list('taches').filter(x=>x.statut!=='Fait'&&x.echeance&&x.echeance>=td&&x.echeance<=addDays(td,2));
  if(soon.length)A.push({w:2,l:'warn',i:'checksq',s:0,h:`<b>${t('Tâches à faire')}</b> — ${tp('{n} tâche(s) à échéance dans 2 jours : {x}',{n:soon.length,x:soon.slice(0,3).map(x=>esc(x.titre)).join(' · ')})} <a href="#" data-go="taches">${t('Voir')}</a>`});
  const hp=list('taches').filter(x=>x.statut!=='Fait'&&x.priorite==='Haute'&&!x.echeance);
  if(hp.length)A.push({w:3,l:'warn',i:'checksq',s:0,h:`<b>${t('Tâches à faire')}</b> — ${tp('{n} tâche(s) prioritaire(s) sans date : planifiez-les.',{n:hp.length})}`});
  if(DB.profile?.collectif){const RP=list('collectif').filter(i=>i.type==='Reste à payer'),late=RP.filter(i=>cStat(i)?.k==='late'),sn=RP.filter(i=>cStat(i)?.k==='soon');
    if(late.length)A.push({w:0,l:'bad',i:'users',s:0,h:`<b>${t('Fonds collectif')}</b> — ${tp('{n} paiement(s) en retard : {x}',{n:late.length,x:late.slice(0,4).map(i=>esc(i.personne||i.libelle)).join(', ')})} · <span class="amt bad">${fmt(sumBy(late,cRest))}</span> <a href="#" data-go="collectif">${t('Voir')}</a>`});
    if(sn.length)A.push({w:2,l:'warn',i:'users',s:0,h:`<b>${t('Fonds collectif')}</b> — ${tp('{n} échéance(s) dans 7 jours',{n:sn.length})}`})}
  const md=new Date().toISOString().slice(5,10),bd=list('contacts').filter(c=>{if(!c.anniv)return false;const d=dayDiff(td,String(cyr())+'-'+c.anniv.slice(5));return d>=0&&d<=7});
  if(bd.length)A.push({w:3,l:'warn',i:'gift',s:0,h:`<b>${t('Contacts')}</b> — ${tp('{n} anniversaire(s) cette semaine : {x}',{n:bd.length,x:bd.map(c=>esc(c.nom)).join(', ')})}`});
  const lj=list('journal').map(j=>j.date).sort().pop()||String(ME?.created||'').slice(0,10);   /* compte neuf : compter depuis sa création */
  if(lj&&dayDiff(lj,td)>=3)A.push({w:3,l:'warn',i:'book',s:0,h:`<b>${t('Journal')}</b> — ${t('Vous n’avez rien écrit depuis 3 jours ou plus : prenez 5 minutes pour vous.')} <a href="#" data-new="journal">${t('Écrire')}</a>`});
  return A}}

/* ---------- 6. ÉVÉNEMENTS ---------- */
document.addEventListener('click',ev=>{
  const b=ev.target.closest('[data-x5]');if(!b||!ME)return;const x=b.dataset.x5;
  if(x==='vers'){
    const r=list('collectif').find(i=>i.id===b.dataset.id);if(!r)return;
    const v=prompt(tp('Montant du versement pour {n} (reste à payer : {r}). Saisissez un nombre négatif pour corriger.',{n:r.personne||r.libelle,r:fmt(cRest(r))}),String(cRest(r)));if(v===null)return;
    const a=num(String(v).replace(/\s/g,''));if(!a)return;if(a>cRest(r)&&!confirm('Ce versement dépasse le reste à payer. Continuer ?'))return;
    r.verse=Math.max(0,num(r.verse)+a);r.dateverse=ltoday();r.hist=[...(r.hist||[]),{d:ltoday(),a}];
    const m=prompt('Où a été versé l’argent ? E = espèce, B = banque, vide = ne pas l’ajouter à la trésorerie','E');
    const ty=m&&/^e/i.test(m)?'Espèce':m&&/^b/i.test(m)?'Banque':'';
    if(ty){let t0=list('collectif').find(i=>i.type===ty);if(!t0){t0={id:uid(),created:new Date().toISOString(),date:ltoday(),type:ty,personne:'',libelle:ty,montant:0};list('collectif').push(t0)}t0.montant=Math.max(0,num(t0.montant)+a)}
    save();render();toast('✔ Versement enregistré')}
  else if(x==='cmpy'){const c=CM(),all=dataYears(),cur=c.years&&c.years.length?c.years:all.slice(-4),y=b.dataset.y;c.years=cur.includes(y)?cur.filter(v=>v!==y):[...cur,y].sort();save();render()}
  else if(x==='cmpall'){CM().years=dataYears();save();render()}
});
document.addEventListener('change',ev=>{const e=ev.target;if(!ME||!e.dataset||!e.dataset.x5)return;const x=e.dataset.x5,y=scrollY;
  if(x==='total'){DB.profile={...DB.profile,collectifTotal:num(e.value)};save();render();scrollTo(0,y)}
  else if(x==='obj'){DB.profile={...DB.profile,objectif:num(e.value)};save();render();scrollTo(0,y)}
  else if(x==='rn'){RT().n=num(e.value);save();render();scrollTo(0,y)}
  else if(x==='rr'){RT().r=num(e.value);save();render();scrollTo(0,y)}
});

/* ---------- 7. MIGRATION & NAVIGATION ---------- */
{const m4=migrate4;migrate4=function(){m4();
  if(typeof users==='function'&&ME.id===users()[0]?.id&&list('collectif').length&&DB.profile?.collectifTotal==null){DB.profile={...DB.profile,collectifTotal:20655000};save()}}}
{const i=NAV.findIndex(n=>n[0]==='recapcat');NAV.splice(i<0?NAV.length:i+1,0,['compare','chart','Comparaison d’années'])}

/* ---------- 8. ASSISTANT DE DÉMARRAGE (première connexion) ---------- */
function needOnboard(){return ME&&DB&&DB.profile&&!DB.profile.onboarded&&!DB.seed4&&list('finances').length===0}
function showOnboard(){
  if(document.getElementById('onb'))return;const p=DB.profile||{};
  const f=(l,n,ty='number',v='',ex='')=>`<div><label>${t(l)}</label><input name="${n}" type="${ty}" ${ty==='number'?'min="0" step="any"':''} value="${esc(v)}" ${ex}></div>`;
  const d=document.createElement('div');d.id='onb';d.className='onb';
  d.innerHTML=`<form class="card onbc" id="onbf"><h2>${ic('settings')} ${t('Bienvenue — configurons votre espace')}</h2><p class="mute">${t('Ces informations servent à ajuster vos budgets, bilans et conseils. Vous pourrez tout modifier plus tard dans Réglages.')}</p>
  <h3 class="h3">${t('Vous')}</h3><div class="fg">${f('Votre prénom','nom','text',p.nom||'')}${f('Ville','ville','text',p.ville||'')}${f('Votre email','email','email',p.email||'')}${f('Votre téléphone','tel','tel',p.tel||'')}
  <div><label>${t('Langue')}</label><select name="lang">${langOpts(LANG)}</select></div><div><label>${t('Pays')}</label><select name="country">${countryOpts(COUNTRY)}</select></div><div><label>${t('Devise')}</label><select name="currency">${currencyOpts(CURR)}</select></div></div>
  <h3 class="h3">${t('Profil et règles')}</h3><div class="fg"><div><label>${t('Profil de revenus')}</label><select name="profil">${['Salarié','Entrepreneur','Étudiant','Gestionnaire de projets','Autre'].map(o=>`<option ${p.profil===o?'selected':''}>${o}</option>`).join('')}</select></div>${religionBlock(p)}</div>
  <h3 class="h3">${t('Vos revenus et charges (par mois)')}</h3><div class="fg">${f('Revenu mensuel net','rev')}${f('Autres revenus','rev2')}${f('Loyer / logement','loy')}${f('Mensualités de crédit','cred')}${f('Épargne actuelle','sol')}${f('Objectif de patrimoine','obj')}</div>
  <label class="chk" style="margin-top:12px"><input type="checkbox" name="bud" checked> ${t('Créer un budget de départ (besoins 60 %, envies 20 %, épargne 20 %) que vous pourrez ajuster')}</label>
  <p class="acts" style="margin-top:14px"><button>${t('Enregistrer et commencer')}</button><button type="button" class="ghost" id="onbx">${t('Plus tard')}</button></p></form>`;
  document.body.appendChild(d);
  const F=d.querySelector('#onbf'),redo=()=>{const nom=F.nom.value;void nom};
  F.country.onchange=()=>{const x=countryDefaults(F.country.value);if(x.currency)F.currency.value=x.currency;if(x.lang)F.lang.value=x.lang};
  d.querySelector('#onbx').onclick=()=>{DB.profile={...DB.profile,onboarded:1};save();d.remove()};
  F.onsubmit=ev=>{ev.preventDefault();const g=n=>F[n].value,N=n=>num(F[n].value);
    DB.profile={...DB.profile,nom:g('nom').trim()||DB.profile.nom,ville:g('ville').trim(),email:g('email').trim(),tel:g('tel').trim(),lang:g('lang'),country:g('country'),currency:g('currency'),objectif:N('obj'),epargneSolde:N('sol'),revenu:N('rev')+N('rev2'),onboarded:1,...religionRead(n=>F.elements[n]?.value),profil:g('profil')};
    const C=list('categories');
    if(F.bud.checked&&N('rev')+N('rev2')>0&&C.length>=12&&C[0].nom==='Salaire'){
      const rev=N('rev'),rev2=N('rev2'),loy=N('loy'),cred=N('cred'),R=rev+rev2,rest=Math.max(0,R-loy-cred),rnd=v=>Math.round(v/500)*500;
      C[0].budget=rev;C[1].budget=rev2;C[2].budget=loy;C[11].budget=cred;
      const bes=[3,4,5,6,7],env=[8,9];bes.forEach(i=>C[i].budget=rnd(rest*.6/bes.length));env.forEach(i=>C[i].budget=rnd(rest*.2/env.length));C[10].budget=rnd(rest*.2);
      DB.profile.budget=C.filter(c=>c.type!=='Revenu').reduce((s,c)=>s+num(c.budget),0)}
    if(typeof applyReligion==='function')applyReligion();save();applyPrefs(DB.profile);d.remove();render();toast('✔ Espace configuré')};
}
{const r0=render;render=function(){r0.apply(this,arguments);if(needOnboard())showOnboard()}}
