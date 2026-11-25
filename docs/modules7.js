'use strict';
/* =====================================================================
   LUMINA v7
   1. Migration / nettoyage des données (novembre 2026, doublons, statuts, portefeuille de projets)
   2. Suivi des projets : bilan année N, projection N+1, projets abandonnés, projets pour un tiers
   3. Moteur de budget cible, plan de rattrapage épargne / bourse, conseils sur les dépenses personnelles
   4. Garde-fous à la saisie + alertes
   5. Profil et règles métier par utilisateur, contexte complet pour l'IA
   ===================================================================== */
const FAIL='Abandonné / Échec (Historique)',SUIVI='Suivi pour un tiers',TIERS='Tiers (Non financé par l’utilisateur)';
const n7=s=>nrm(s).replace(/\s+/g,' ').trim();
const ymOf=d=>String(d||'').slice(0,7);
const addYm=(ym,n)=>{const d=new Date(+ym.slice(0,4),+ym.slice(5,7)-1+n,1);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')};
const sum7=a=>a.reduce((x,i)=>x+num(i.montant),0);
const isReal7=i=>i.statut==='✅ Payé'||i.statut==='🔁 Automatique';

/* ---------- Projets : lignes Finances rattachées, projets pour un tiers ---------- */
{const f=MODULES.projets.fields,st=f.find(x=>x.k==='statut');st.o=['Idée','En cours','En pause','Terminé',SUIVI,FAIL];
 const i=f.findIndex(x=>x.k==='taches');
 f.splice(i,0,{k:'lien',l:'Libellé des lignes Finances rattachées (ex : Terrain Korhogo)'},{k:'lienDe',l:'Lignes rattachées : à partir du',t:'date'},{k:'lienA',l:'Lignes rattachées : jusqu’au',t:'date'},{k:'prixTotal',l:'Prix total / coût d’acquisition (FCFA)',t:'number'});
 MODULES.projets.defaults={...MODULES.projets.defaults,lienDe:'',lienA:''};
 MODULES.projets.fields.find(x=>x.k==='titulaire').l='Titulaire du projet (écrire « Tiers » si le projet n’est pas financé par vous)';}
let _tc=null;
function projLines(p){if(!p.lien)return[];const k=n7(p.lien);return list('finances').filter(i=>i.statut!=='❌ Annulé'&&n7(i.libelle)===k&&(!p.lienDe||i.date>=p.lienDe)&&(!p.lienA||i.date<=p.lienA))}
function isTiersLine(i){
  if(!ME||!DB)return false;
  if(!_tc)_tc=list('projets').filter(p=>p.lien&&(/^tiers/i.test(p.titulaire||'')||p.statut===SUIVI)).map(p=>({k:n7(p.lien),de:p.lienDe||'',a:p.lienA||'9999'}));
  if(!_tc.length||i.cat!=='Projets')return false;
  const k=n7(i.libelle);return _tc.some(t=>t.k===k&&i.date>=t.de&&i.date<=t.a);
}
{const s0=save;save=function(){_tc=null;return s0.apply(this,arguments)}}

/* ---------- 1. MIGRATION ---------- */
const MIG=7;
const isOwnerData=()=>list('finances').filter(i=>/^xl\d+$/.test(String(i.id))).length>400;
function migrate7(){
  if(!ME||!DB||DB.mig7===MIG||!list('finances').length&&!list('projets').length)return;
  const snap=JSON.stringify({finances:DB.finances||[],projets:DB.projets||[]}),R={removed:[],added:[],fixed:[],norm:0,projets:[],verifier:[]};
  const ST={paye:'✅ Payé',automatique:'🔁 Automatique','en attente':'⏳ En attente',annule:'❌ Annulé'};
  list('finances').forEach(i=>{
    const s=n7(String(i.statut||'').replace(/[^\p{L}\s]/gu,''));if(ST[s]&&ST[s]!==i.statut){i.statut=ST[s];R.norm++}
    ['cat','libelle'].forEach(k=>{if(typeof i[k]==='string'&&i[k]!==i[k].trim().replace(/\s+/g,' ')){i[k]=i[k].trim().replace(/\s+/g,' ');R.norm++}});
    if(i.cat==='Retenues Bancaires'){i.cat='Retenues Bancaire';R.norm++}
    if(i.cat==='Dividente'){i.cat='Dividendes';R.norm++}
  });
  if(false&&isOwnerData()){   /* v13 : plus aucune donnée personnelle injectée par migration */
    const nov=i=>ymOf(i.date)==='2026-11',F0=list('finances');
    /* a) écritures fantômes de novembre 2026 (saisies hors base, non issues du classeur) */
    const ghost=i=>nov(i)&&!/^xl/.test(String(i.id))&&(kind(i)==='rev'&&num(i.montant)===250000||num(i.montant)===115000&&/pr[eê]t/i.test((i.libelle||'')+' '+(i.cat||''))||num(i.montant)===69000&&/assurance/i.test((i.libelle||'')+' '+(i.cat||'')));
    const gone=F0.filter(ghost);gone.forEach(g=>R.removed.push(`${g.date} ${g.libelle||g.cat} ${fmt(g.montant)}`));
    DB.finances=F0.filter(x=>!gone.includes(x));
    /* b) valeurs du classeur plus récent */
    list('finances').forEach(i=>{if(nov(i)&&/^pommade/i.test(i.libelle||'')&&num(i.montant)===14000){i.montant=10000;R.fixed.push('Pommade 14 000 → 10 000 (valeur du classeur)')}});
    /* c) doublons exacts de novembre 2026 */
    const seen=new Set(),dups=[];list('finances').forEach(i=>{if(!nov(i))return;const k=[i.date,i.type,n7(i.cat),n7(i.libelle),num(i.montant)].join('|');if(seen.has(k))dups.push(i);else seen.add(k)});
    if(dups.length){dups.forEach(d=>R.removed.push(`doublon ${d.date} ${d.libelle||d.cat} ${fmt(d.montant)}`));DB.finances=list('finances').filter(x=>!dups.includes(x))}
    /* d) restauration des écritures réelles de novembre 2026 */
    const A='🔁 Automatique',W='⏳ En attente',D='2026-11-01',FX='Dépense Fixe',VR='Dépense Variable',OC='Dépense Occasionnelle';
    const CANON=[['Revenu','Salaire','Salaire Mensuel',425000,A],[FX,'Dîmes','Dîmes',42500,A],[FX,'Aumônes','Aumône',15000,A],[FX,'Retenues Bancaire','Agios',7150,A],[FX,'Remboursements prêt','Terrain Korhogo',115841,A],
      ['Épargne',catOf(PELN)?PELN:'Remboursements prêt','Plan épargne logement CLIPRI',25000,A],[FX,'Assurances','Assurance Mienmo NSIA',18001,A],[FX,'Assurances','Assurance Mienmo & Noah SANLAM',33232,A],[FX,'Assurances','Assurance décès parents SANLAM',18311,A],
      [VR,'Enfants','Cours Anglais NOAH',5000,W],[VR,'Projets','Terrain Adzopé',75000,W],[VR,'Famille','Cotisations',35000,W],[OC,'Personnel','Pommade',10000,W],[OC,'Famille','Maman Kadi',10000,W],[OC,'Personnel','Cotisation DRH',10000,W],
      [VR,'Alimentation','Alimentation',40000,W],[VR,'Transport','Transport',25000,W],[VR,'Transport','Transport',2000,W],[OC,'Famille','Gaz',5000,W]];
    CANON.forEach(([type,cat,lib,m,statut])=>{
      if(cat==='Dîmes'&&dimeMode()==='never')return;if(cat==='Aumônes'&&DB.profile?.aumoneOn==='Non')return;
      if(list('finances').some(i=>nov(i)&&n7(i.libelle).startsWith(n7(lib))&&num(i.montant)===m))return;
      list('finances').push({id:uid(),created:new Date().toISOString(),date:D,type,cat,libelle:lib,montant:m,statut,note:'Restaurée (migration v7)'});R.added.push(`${lib} ${fmt(m)}`)});
    /* e) portefeuille de projets */
    const P=list('projets'),lastD=lib=>(list('finances').filter(i=>n7(i.libelle)===n7(lib)).map(i=>i.date).sort().pop()||'');
    const def=[
     ...['Cosmétique / Mobile Money','Terrain Badikaha','Champ de manioc','Botro','Champ de maïs','Magasin Abidjan'].map(n=>({nom:n,statut:FAIL,lien:n,titulaire:'Moi',paiement:'Fonds propres'})),
     {nom:'Terrain Korhogo',statut:'En cours',lien:'Terrain Korhogo',titulaire:'Moi',paiement:'Prêt bancaire',mensuel:115841,echeance:lastD('Terrain Korhogo')},
     {nom:'Terrain Adzopé n°1 (acquis, soldé)',statut:'Terminé',lien:'Terrain Adzopé',lienA:'2025-12-31',titulaire:'Moi',paiement:'Fonds propres'},
     {nom:'Terrain Adzopé n°2 (en cours de versement)',statut:'En cours',lien:'Terrain Adzopé',lienDe:'2026-01-01',titulaire:'Moi',paiement:'Fonds propres',mensuel:75000,echeance:lastD('Terrain Adzopé')},
     {nom:'Terrain Dimbokro',statut:SUIVI,lien:'Terrain Dimbokro',titulaire:TIERS,paiement:'Autre'}];
    def.forEach(d=>{let p=P.find(x=>n7(x.nom)===n7(d.nom));
      if(!p){p={id:uid(),created:new Date().toISOString(),debut:'',echeance:'',budget:0,depense:0,taches:''};P.push(p);R.projets.push(`${d.nom} → ${d.statut}`)}
      else if(p.statut!==d.statut)R.projets.push(`${d.nom} : ${p.statut||'—'} → ${d.statut}`);
      Object.entries(d).forEach(([k,v])=>{if(k==='statut'||p[k]===undefined||p[k]===''||p[k]===0)p[k]=v})});
    const lost=list('finances').filter(i=>i.cat==='Projets'&&i.statut==='⏳ En attente'&&/^achat terrain botro$/i.test(i.libelle||''));
    if(lost.length)R.verifier.push(`${lost.length} ligne(s) « Achat terrain Botro » prévues en 2027 alors que Botro est classé en échec : à vérifier (non supprimées)`);
  }
  DB.mig7=MIG;DB.mig7Report={at:new Date().toISOString(),...R};_tc=null;save();
  const n=R.removed.length+R.added.length+R.fixed.length+R.projets.length+R.norm;
  if(n)setTimeout(()=>toast(`✔ Données corrigées : ${R.removed.length} supprimée(s), ${R.added.length} restaurée(s), ${R.projets.length} projet(s) classé(s)`,()=>{const o=JSON.parse(snap);DB.finances=o.finances;DB.projets=o.projets;DB.mig7=MIG;DB.mig7Report=null;_tc=null;save();render()}),600);
}
{const b0=boot;boot=function(){b0.apply(this,arguments);migrate7()}}

/* ---------- 2. BILAN DES PROJETS (année N) ET PROJECTION N+1 ---------- */
const BP={y:null};
function pStats(p,y){
  const L=projLines(p),end=y+'-12-31',td=today(),done=i=>isReal7(i)&&i.date<=td,real=L.filter(i=>isReal7(i)&&i.date<=end),all=L.filter(done),man=p.lien?0:num(p.depense);
  const fut=L.filter(i=>!done(i)),cum=sum7(real)+man,cumAll=sum7(all)+man,eng=sum7(fut);
  return{L,cum,cumAll,prevN:sum7(fut.filter(i=>(i.date||'').startsWith(y))),eng,reste:num(p.prixTotal)?Math.max(0,num(p.prixTotal)-cumAll):eng,resteSrc:num(p.prixTotal)?'prix total':'échéancier',fin:L.map(i=>i.date).sort().pop()||p.echeance||'',mois:[...new Set(fut.map(i=>ymOf(i.date)))].length};
}
function bilanProjets(el){
  const N=BP.y||String(new Date().getFullYear()),N1=String(+N+1),P=list('projets').filter(p=>p.lien||num(p.depense)||p.statut===FAIL),tiersOn=DB.profile?.tiersOn!=='Non';
  const kindOf=p=>p.statut===FAIL?'fail':(/^tiers/i.test(p.titulaire||'')||p.statut===SUIVI)?'tiers':'act';
  const rows=P.map(p=>({p,k:kindOf(p),s:pStats(p,N)})),G=k=>rows.filter(r=>r.k===k);
  const T=k=>G(k).reduce((x,r)=>x+r.s.cum,0),act=T('act'),fail=T('fail'),tiers=T('tiers');
  const linked=new Set(P.filter(p=>p.lien).map(p=>n7(p.lien)));
  const other=list('finances').filter(i=>i.cat==='Projets'&&!isTiersLine(i)&&i.statut!=='❌ Annulé'&&!linked.has(n7(i.libelle)));
  const oth={};other.filter(i=>isReal7(i)&&i.date<=N+'-12-31').forEach(i=>{oth[i.libelle]=(oth[i.libelle]||0)+num(i.montant)});
  const othT=Object.values(oth).reduce((x,v)=>x+v,0);
  const tr=r=>`<tr><td>${esc(r.p.nom)}<br><small class="mute">${esc(r.p.statut||'')}${r.p.paiement?' · '+esc(r.p.paiement):''}</small></td><td class="num">${nf(r.s.cum)}</td><td class="num">${r.s.prevN?nf(r.s.prevN):'—'}</td><td class="num">${num(r.p.mensuel)?nf(r.p.mensuel):'—'}</td><td class="num">${nf(r.s.cumAll)}</td><td class="num">${r.s.reste?nf(r.s.reste)+`<br><small class="mute">${r.s.resteSrc}</small>`:'—'}</td><td>${esc(r.s.fin||'—')}</td></tr>`;
  const head=`<thead><tr><th>Projet</th><th class="num">Injecté au 31/12/${N}</th><th class="num">Prévu ${N}</th><th class="num">Mensualité</th><th class="num">Cumul versé à ce jour</th><th class="num">Reste à payer</th><th>Dernière échéance</th></tr></thead>`;
  const sec=(title,k,note)=>G(k).length?`<div class="card"><h2>${title}</h2>${note?`<p class="mute small" style="margin:0 0 8px">${note}</p>`:''}<div class="tw"><table class="mgrid">${head}<tbody>${G(k).map(tr).join('')}<tr class="trow"><td>Total</td><td class="num">${nf(T(k))}</td><td></td><td></td><td></td><td></td><td></td></tr></tbody></table></div></div>`:'';
  /* N+1 : engagements restants mois par mois */
  const actRows=rows.filter(r=>r.k==='act'&&(r.p.statut==='En cours'||r.p.statut==='En pause'));
  const grid=actRows.map(r=>{const v=Array(12).fill(0),late=Array(12).fill(0);
    r.s.L.filter(i=>(i.date||'').startsWith(N1)&&!(isReal7(i)&&i.date<=today())).forEach(i=>{v[+i.date.slice(5,7)-1]+=num(i.montant)});
    if(!v.some(Boolean)&&num(r.p.mensuel)&&r.p.echeance&&r.p.echeance>=N1+'-01-01')for(let m=0;m<12;m++)if(N1+'-'+String(m+1).padStart(2,'0')<=ymOf(r.p.echeance))v[m]=num(r.p.mensuel);
    return{r,v,tot:v.reduce((a,b)=>a+b,0)}}).filter(x=>x.tot);
  const colT=Array.from({length:12},(_,m)=>grid.reduce((s,x)=>s+x.v[m],0));
  el.innerHTML=`<div class="head"><h1>${ic('rocket')} Bilan des projets</h1><div class="acts"><select data-bpy style="width:auto">${years().map(y=>`<option ${String(y)===N?'selected':''}>${y}</option>`).join('')}</select><button class="ghost" id="bpx">${ic('download')} Excel</button></div></div>
  <div class="tiles"><div class="tile a1"><small>Injecté dans les projets actifs (au 31/12/${N})</small><b>${fmt(act)}</b></div><div class="tile a2"><small>Perdu sur les projets échoués</small><b class="${fail?'bad':''}">${fmt(fail)}</b></div><div class="tile a4"><small>Total injecté (actifs + échecs)</small><b>${fmt(act+fail)}</b></div></div>
  <p class="mute small">Seuls les versements réalisés (✅ Payé, 🔁 Automatique) comptent. ${tiersOn&&G('tiers').length?`Les projets pour un tiers (${fmt(tiers)} avancés) sont exclus de vos sorties et de votre patrimoine.`:''}</p>
  ${sec('Projets actifs et acquis','act','Les terrains acquis sont inclus ; « reste à payer » utilise le prix total si renseigné, sinon l’échéancier restant.')}
  ${sec('Échecs et projets abandonnés (historique)','fail','Montants conservés dans le bilan historique, exclus des prévisions actives.')}
  ${tiersOn?sec('Gestion pour le compte de tiers (hors patrimoine personnel)','tiers','Suivi uniquement : ces lignes ne sont pas comptées dans vos sorties de trésorerie.'):''}
  ${othT?`<div class="card"><h2>Autres lignes « Projets » non rattachées</h2><p class="mute small">${Object.entries(oth).map(([k,v])=>`${esc(k)} : ${fmt(v)}`).join(' · ')}</p><p class="mute small" style="margin:6px 0 0">Total ${fmt(othT)} — non inclus ci-dessus. Rattachez-les à un projet via « Libellé des lignes Finances rattachées ».</p></div>`:''}
  <div class="card"><h2>${ic('calendar')} Projection ${N1} — engagements restants mois par mois</h2>
  ${grid.length?`<div class="tw"><table class="mgrid"><thead><tr><th>Projet</th>${MOIS.map(m=>`<th class="num">${m}</th>`).join('')}<th class="num">Total</th><th>Fin prévue</th></tr></thead><tbody>${grid.map(({r,v,tot})=>`<tr><td>${esc(r.p.nom)}</td>${v.map(x=>`<td class="num">${x?nf(x):'<span class="mute">-</span>'}</td>`).join('')}<td class="num"><b>${nf(tot)}</b></td><td>${esc(r.s.fin||'—')}</td></tr>`).join('')}
   <tr class="trow"><td>Total à prévoir</td>${colT.map(x=>`<td class="num">${nf(x)}</td>`).join('')}<td class="num">${nf(colT.reduce((a,b)=>a+b,0))}</td><td></td></tr></tbody></table></div>${combo({labels:MOIS,bars:[{n:'Engagements projets',v:colT,c:'var(--brand)'}],h:170})}`
   :`<p class="mute">Aucun engagement de projet prévu en ${N1}.</p>`}
  <p class="mute small" style="margin:8px 0 0">Source : lignes « En attente » des projets rattachés ; à défaut, mensualité du projet jusqu’à son échéance. Les projets qui se terminent avant ${N1} n’apparaissent plus.</p></div>`;
  $('#bpx').onclick=()=>{download(xlsx([{name:'Bilan '+N,rows:[['Projet','Catégorie','Statut','Injecté au 31/12/'+N,'Cumul à ce jour','Reste à payer'],...rows.map(r=>[r.p.nom,r.k==='fail'?'Échec':r.k==='tiers'?'Tiers':'Actif',r.p.statut,r.s.cum,r.s.cumAll,r.s.reste])]},{name:'Projection '+N1,rows:[['Projet',...MOIS,'Total'],...grid.map(({r,v,tot})=>[r.p.nom,...v,tot])]}]),`lumina-bilan-projets-${N}.xlsx`);toast('✔ Fichier Excel téléchargé')};
}
PAGES.bilanproj=bilanProjets;
document.addEventListener('change',ev=>{const s=ev.target.closest?.('[data-bpy]');if(s){BP.y=s.value;render()}});
{const i=NAV.findIndex(n=>n[0]==='projets');NAV.splice(i<0?NAV.length:i+1,0,['bilanproj','chart','Bilan des projets'])}

/* ---------- 3. BUDGET CIBLE, ÉPARGNE / BOURSE, DÉPENSES PERSONNELLES ---------- */
const ESS=['Alimentation','Transport','Santé','Enfants','Communication'],DISC=['Famille','Personnel','Autres','Voyages'];
const pcE=()=>num(DB.profile?.pctEpargne)>0?num(DB.profile.pctEpargne):15;
const mItems=ym=>list('finances').filter(i=>i.statut!=='❌ Annulé'&&!isTiersLine(i)&&ymOf(i.date)===ym);
function netMensuel(ym){
  const p=DB.profile||{};if(num(p.revenuNet)>0)return num(p.revenuNet);
  const s=list('finances').filter(i=>i.cat==='Salaire'&&i.statut!=='❌ Annulé'&&ymOf(i.date)<=ym).sort((a,b)=>a.date<b.date?1:-1)[0];
  return s?num(s.montant):num(p.revenu)||0;
}
function exceptionnels(ym){
  const from=addYm(ym,-11),ok=i=>ymOf(i.date)>=from&&ymOf(i.date)<=ym,fin=sum7(list('finances').filter(i=>(i.cat==='Dividendes'||i.cat==='Primes & indemnités')&&i.statut!=='❌ Annulé'&&ok(i)));
  const bo=list('bourse').filter(o=>o.type==='Dividende'&&ok(o)).reduce((x,o)=>x+num(o.qte)*num(o.pu),0);
  return Math.max(fin,bo);
}
function avgCat(cat,ym){let s=0,n=0;for(let k=1;k<=6;k++){const v=sum7(mItems(addYm(ym,-k)).filter(i=>i.cat===cat&&kind(i)==='dep'&&isReal7(i)));if(v>0){s+=v;n++}}return n?s/n:0}
function budgetModel(ym){
  const net=netMensuel(ym),I=mItems(ym),dep=I.filter(i=>kind(i)==='dep'),mode=dimeMode();
  const dime=0,aum=0;
  const fixes=dep.filter(i=>i.type==='Dépense Fixe'&&i.cat!=='Dîmes'&&i.cat!=='Aumônes'),fixT=sum7(fixes),projT=sum7(dep.filter(i=>i.cat==='Projets')),pelT=sum7(I.filter(i=>i.cat===PELN));
  const eng=dime+aum+fixT+projT+pelT,marge=net-eng;
  const rowsOf=L=>L.map(c=>({cat:c,avg:Math.max(avgCat(c,ym),sum7(dep.filter(i=>i.cat===c))),done:sum7(dep.filter(i=>i.cat===c))})).filter(x=>x.avg>0||x.done>0);
  const ess=rowsOf(ESS),dis=rowsOf(DISC),essT=ess.reduce((x,r)=>x+r.avg,0),disAvg=dis.reduce((x,r)=>x+r.avg,0);
  const epCible=net*pcE()/100,epAddC=Math.max(0,epCible-pelT),dispo=marge-essT,epAdd=Math.max(0,Math.min(epAddC,dispo)),disCap=Math.max(0,Math.min(disAvg,dispo-epAdd));
  ess.forEach(r=>r.cap=r.avg);dis.forEach(r=>r.cap=disAvg?disCap*r.avg/disAvg:0);
  const varCap=essT+disCap,varSpent=sum7(dep.filter(i=>(i.type==='Dépense Variable'||i.type==='Dépense Occasionnelle')&&i.cat!=='Projets'&&i.cat!=='Dîmes'&&i.cat!=='Aumônes'));
  const revM=sum7(I.filter(i=>kind(i)==='rev')),out=sum7(I.filter(i=>kind(i)!=='rev'));
  return{ym,net,dime,aum,fixT,projT,pelT,eng,marge,ess,dis,essT,disAvg,epCible,epAddC,dispo,epAdd,disCap,varCap,varSpent,revM,out,solde:revM-out,except:exceptionnels(ym)};
}
function precaution(){return sum7(list('finances').filter(i=>i.cat==='Épargne'&&isReal7(i)&&!isTiersLine(i)))}
function rattrapage(M){
  const T=new Date(),y=String(T.getFullYear()),cm=T.getMonth()+1,mr=monthlyReal(y,BASES[1]),A=annualModel(y).filter(x=>isSav(x.c)&&x.c.nom!==PELN&&(x.p.some(v=>v)||x.r.some(v=>v)));
  const nextIdx=cm%12,nextP=cm===12?annualModel(String(+y+1)):A,K=num(DB.profile?.rattrapage)||6;
  const rows=A.map(x=>{const r=mr[x.c.nom+'|o']||Array(12).fill(0),miss=[];let manque=0;
    for(let m=0;m<cm;m++){const cur=m===cm-1;if(cur&&!(r[m]===0&&T.getDate()>=5))continue;const d=Math.max(0,num(x.p[m])-num(r[m]));if(d>0){manque+=d;miss.push(MOIS[m])}}
    const nx=(cm===12?nextP.find(z=>z.c.nom===x.c.nom)?.p[0]:x.p[nextIdx])||0;
    return{c:x.c.nom,plan:num(nx),manque,miss,verse:sumArr(r),ideal:num(nx)+manque/K}});
  let cap=M.epAdd;const order=[...rows].sort((a,b)=>(a.c==='Épargne'?-1:0)-(b.c==='Épargne'?-1:0));
  order.forEach(r=>{const give=Math.min(cap,r.ideal);r.reel=Math.round(give/500)*500;cap-=give;r.mois=r.manque>0&&r.reel>r.plan?Math.ceil(r.manque/(r.reel-r.plan)):null});
  return{rows,K,cm,gapPlan:Math.max(0,rows.reduce((x,r)=>x+r.plan,0)-M.epAdd)};
}
function persoAdvice(ym){
  const net=netMensuel(ym)||1,I=mItems(ym).filter(i=>kind(i)==='dep'),out=[];
  const defs=[['Personnel',i=>i.cat==='Personnel',8],['Famille',i=>i.cat==='Famille'&&!/cotisation/i.test(i.libelle||''),10],['Cotisations',i=>/cotisation/i.test(i.libelle||''),8],['Transport',i=>i.cat==='Transport',8],['Alimentation',i=>i.cat==='Alimentation',20],['Autres',i=>i.cat==='Autres',3]];
  defs.forEach(([nom,f,seuil])=>{
    const cur=I.filter(f),tot=sum7(cur),hist=[];for(let k=1;k<=6;k++){const v=sum7(mItems(addYm(ym,-k)).filter(i=>kind(i)==='dep'&&isReal7(i)&&f(i)));if(v)hist.push(v)}
    const avg=hist.length?hist.reduce((a,b)=>a+b,0)/hist.length:0,share=tot/net*100,tips=[];let lvl='';
    if(!tot&&!avg)return;
    if(avg&&tot>avg*1.25){lvl='bad';tips.push(`${fmt(tot)} ce mois contre ${fmt(avg)} en moyenne (+${Math.round((tot/avg-1)*100)} %) : repérez la ligne qui fait la différence.`)}
    if(share>seuil){lvl=lvl||'warn';tips.push(`${pct(share)} de votre revenu net (repère : ${seuil} %). Fixez un plafond mensuel de ${fmt(Math.round(net*seuil/100/500)*500)}.`)}
    const small=cur.filter(i=>num(i.montant)<=10000);if(small.length>=3){lvl=lvl||'warn';tips.push(`${small.length} petites dépenses (${fmt(sum7(small))} au total) : les petits montants répétés sont les fuites les plus discrètes ; regroupez-les dans une enveloppe.`)}
    const top=[...cur].sort((a,b)=>num(b.montant)-num(a.montant))[0];if(top&&cur.length>1&&num(top.montant)>tot*.6)tips.push(`« ${top.libelle||top.cat} » pèse ${Math.round(num(top.montant)/tot*100)} % du poste.`);
    if(nom==='Cotisations'&&tot)tips.push('Les cotisations sont récurrentes : décidez lesquelles sont vraiment prioritaires et passez-les en prélèvement planifié le jour du salaire.');
    if(nom==='Transport'&&tot>0&&share>6)tips.push('Comparez abonnement / covoiturage / regroupement des trajets sur une semaine.');
    if(nom==='Alimentation'&&tot)tips.push('Faites une liste hebdomadaire et un budget marché fixe ; payez en espèces pour limiter les achats d’impulsion.');
    if(!tips.length)tips.push('Poste maîtrisé ce mois-ci.');
    out.push({nom,tot,avg,share,lvl,tips});
  });
  return out;
}
const ALL_COST=m=>`${fmt(m)}`;
function budgetiaPage(el){
  const T=new Date(),ym=T.getFullYear()+'-'+String(T.getMonth()+1).padStart(2,'0'),M=budgetModel(ym),Ra=rattrapage(M),PA=persoAdvice(ym),pre=precaution(),garde=DB.profile?.garde!=='Non';
  const lvl=v=>v<0?'bad':'';
  const catRow=r=>`<tr><td>${esc(r.cat)}</td><td class="num">${nf(r.cap)}</td><td class="num">${nf(r.done)}</td><td class="num ${r.done>r.cap+.5?'bad':''}">${nf(r.cap-r.done)}</td></tr>`;
  el.innerHTML=`<div class="head"><h1>${ic('sparkles')} Budget cible & conseils</h1><div class="acts"><button class="ghost" data-b7="apply">${ic('check')} Appliquer au budget du mois</button></div></div>
  <div class="card"><h2>${ic('target')} Budget cible de ${MOIS_L[T.getMonth()]} ${T.getFullYear()}</h2>
   <div class="tiles"><div class="tile a1"><small>Revenu net mensuel</small><b>${fmt(M.net)}</b></div><div class="tile a3"><small>Engagements incompressibles</small><b>${fmt(M.eng)}</b></div><div class="tile ${M.marge<0?'a2':'a4'}"><small>Marge après engagements</small><b class="${lvl(M.marge)}">${fmt(M.marge)}</b></div></div>
   <div class="rule"><b>Règle appliquée, dans cet ordre :</b><ol class="steps"><li><b>Engagements incompressibles</b><span>Charges fixes : ${fmt(M.fixT)}<br>Projets : ${fmt(M.projT)}<br>Épargne logement : ${fmt(M.pelT)}</span></li><li><b>Dépenses essentielles</b><span>Moyenne des mois passés : ${fmt(M.essT)}</span></li><li><b>Épargne et bourse</b><span>Objectif ${pcE()} % du net, soit ${fmt(M.epCible)}</span></li><li><b>Dépenses variables et plaisirs</b><span>Avec ce qui reste après les trois étapes précédentes.</span></li></ol></div>
   <div class="tiles"><div class="tile a4"><small>Épargne / bourse possible (hors épargne logement)</small><b>${fmt(M.epAdd)}</b></div><div class="tile a3"><small>Budget variable cible du mois</small><b>${fmt(M.varCap)}</b></div><div class="tile ${M.varSpent>M.varCap?'a2':'a1'}"><small>Déjà dépensé en variable</small><b class="${M.varSpent>M.varCap?'bad':''}">${fmt(M.varSpent)}</b></div></div>
   ${M.dispo<0?`<div class="al bad"><span class="ai">${ic('alert')}</span><div><b>Plan tendu :</b> les engagements et les dépenses essentielles dépassent le revenu de ${fmt(-M.dispo)}. Aucune épargne n’est possible sans réduire les engagements ou augmenter les revenus.</div></div>`:M.epAdd<M.epAddC?`<div class="al warn"><span class="ai">${ic('alert')}</span><div>L’objectif d’épargne (${fmt(M.epAddC)} hors épargne logement) ne tient pas : il manque ${fmt(M.epAddC-M.epAdd)} par mois. Leviers : réduire « Famille / Personnel / cotisations » ou étaler un projet.</div></div>`:''}
   <div class="tw"><table class="mgrid"><thead><tr><th>Catégorie variable</th><th class="num">Cible du mois</th><th class="num">Déjà dépensé</th><th class="num">Reste</th></tr></thead><tbody>${[...M.ess,...M.dis].map(catRow).join('')||'<tr><td colspan="4" class="mute">Pas encore assez d’historique.</td></tr>'}</tbody></table></div>
   <p class="mute small" style="margin:8px 0 0">Revenus exceptionnels des 12 derniers mois (dividendes, primes) : <b>${fmt(M.except)}</b>. Règle : les affecter à 100 % à la précaution puis à la bourse, jamais aux dépenses courantes. Solde prévisionnel du mois : <b class="${M.solde<0?'bad':''}">${fmt(M.solde)}</b> · précaution disponible : <b>${fmt(pre)}</b>.</p></div>
  <div class="card"><h2>${ic('coins')} Plan de réajustement épargne & bourse</h2>
   ${Ra.rows.length?`<div class="tw"><table class="mgrid"><thead><tr><th>Ligne</th><th class="num">Plan mensuel</th><th class="num">Versé ${T.getFullYear()}</th><th class="num">Manque cumulé</th><th class="num">Virement idéal</th><th class="num">Virement réaliste</th></tr></thead><tbody>${Ra.rows.map(r=>`<tr><td>${esc(r.c)}<br><small class="mute">${r.miss.length?'mois manquants : '+r.miss.join(', '):'à jour'}</small></td><td class="num">${nf(r.plan)}</td><td class="num">${nf(r.verse)}</td><td class="num ${r.manque?'bad':''}">${nf(r.manque)}</td><td class="num">${nf(Math.round(r.ideal/500)*500)}</td><td class="num"><b>${nf(r.reel)}</b>${r.mois?`<br><small class="mute">rattrapé en ${r.mois} mois</small>`:''}</td></tr>`).join('')}</tbody></table></div>
   <p class="small" style="margin:8px 0">« Idéal » = plan + manque réparti sur ${Ra.K} mois ; « réaliste » = ce que permet la marge du mois, précaution d’abord. ${Ra.gapPlan>0?`Pour tenir le plan initial il manque <b class="bad">${fmt(Ra.gapPlan)}</b> par mois.`:'Le plan initial est finançable.'}</p>`:'<p class="mute">Aucune ligne d’épargne planifiée cette année.</p>'}
   <ol class="small" style="margin:6px 0 0;padding-left:20px"><li><b>Le jour du salaire</b>, programmez des virements permanents vers l’épargne de précaution puis la bourse, avant toute dépense (se payer en premier).</li><li>Constituez d’abord 3 mois de charges fixes (${fmt((M.fixT+M.dime+M.aum)*3)}) en précaution, puis passez à la bourse.</li><li>Affectez tout dividende ou prime reçu au rattrapage, jamais aux dépenses courantes.</li><li>Revoyez le plan une fois par mois (page Épargne & Bourse) ; si un mois est manqué, rattrapez-le sur les ${Ra.K} suivants plutôt qu’en une fois.</li><li>Évitez d’ajouter un nouvel engagement (projet, cotisation) tant que le plan d’épargne n’est pas à jour.</li></ol>
   <p class="acts" style="margin:10px 0 0"><button data-b7="ai">${ic('sparkles')} Conseils IA personnalisés</button></p><div id="ai7" class="small" style="white-space:pre-wrap;margin-top:8px">${esc(DB.aiBudget||'')}</div></div>
  <div class="card"><h2>${ic('bulb')} Conseils & recommandations sur les dépenses personnelles</h2>
   ${PA.map(a=>`<div class="al ${a.lvl}" style="display:block"><b>${esc(a.nom)}</b> — ${fmt(a.tot)} ce mois${a.avg?` · moyenne ${fmt(a.avg)}`:''} · ${pct(a.share)} du net<ul class="small" style="margin:4px 0 0;padding-left:18px">${a.tips.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`).join('')||'<p class="mute">Pas encore de dépenses à analyser ce mois-ci.</p>'}
   <p class="acts" style="margin:10px 0 0"><button data-b7="aiperso">${ic('sparkles')} Détecter les fuites avec l’IA</button></p><div id="ai7b" class="small" style="white-space:pre-wrap;margin-top:8px">${esc(DB.aiPerso||'')}</div></div>
  <div class="card"><h2>${ic('shield')} Garde-fous</h2><label class="chk"><input type="checkbox" data-b7="garde" ${garde?'checked':''}> Alerter à chaque saisie qui dépasse le budget cible du mois ou rend le solde prévisionnel négatif</label></div>`;
}
PAGES.budgetia=budgetiaPage;
{const i=NAV.findIndex(n=>n[0]==='budgetan');NAV.splice(i<0?NAV.length:i+1,0,['budgetia','sparkles','Budget cible & conseils'])}
document.addEventListener('click',async ev=>{
  const b=ev.target.closest('[data-b7]');if(!b||!ME)return;const x=b.dataset.b7;
  if(x==='apply'){const T=new Date(),y=String(T.getFullYear()),m=T.getMonth(),M=budgetModel(y+'-'+String(m+1).padStart(2,'0'));
    if(!confirm('Remplacer le budget de ce mois pour les catégories variables par les cibles calculées ?'))return;
    ensureBudget(y);[...M.ess,...M.dis].forEach(r=>{DB.budgets[y][r.cat]=DB.budgets[y][r.cat]||Array(12).fill(num(catOf(r.cat)?.budget));DB.budgets[y][r.cat][m]=Math.round(r.cap/500)*500});save();render();toast('✔ Budget du mois mis à jour')}
  else if(x==='ai'||x==='aiperso'){
    if(!CFG.apiKey){toast('⚠ Clé API absente : demandez à l’administrateur de la configurer.');return}
    const T=new Date(),ym=T.getFullYear()+'-'+String(T.getMonth()+1).padStart(2,'0'),M=budgetModel(ym),out=$(x==='ai'?'#ai7':'#ai7b');out.textContent='…';
    const sys=x==='ai'?'Tu es un conseiller financier personnel rigoureux. À partir de la synthèse complète de toutes les années, propose un plan concret de réajustement épargne / bourse (montants à virer dès réception du salaire, ordre de priorité, calendrier de rattrapage) et 5 conseils pratiques pour le tenir. N’invente aucun chiffre absent des données.':'Tu es un conseiller en budget personnel. Analyse les postes Personnel, Famille, Cotisations, Transport et Alimentation sur toute la période fournie, détecte les fuites budgétaires (dérives, petits montants répétés, postes trop lourds) et propose pour chaque poste une action chiffrée. N’invente aucun chiffre absent des données.';
    const r=await aiText(sys,context()+'\nModèle budgétaire du mois : '+JSON.stringify({net:M.net,engagements:M.eng,marge:M.marge,essentiels:M.essT,epargnePossible:M.epAdd,budgetVariableCible:M.varCap,variableDepense:M.varSpent,precaution:precaution(),exceptionnels12m:M.except}));
    if(x==='ai')DB.aiBudget=r||'';else DB.aiPerso=r||'';save();out.textContent=r||''}
});
document.addEventListener('change',ev=>{if(ev.target.dataset?.b7==='garde'){DB.profile={...DB.profile,garde:ev.target.checked?'Oui':'Non'};save();toast(ev.target.checked?'✔ Garde-fous activés':'Garde-fous désactivés')}});

/* ---------- 4. GARDE-FOUS À LA SAISIE ---------- */
function guardCheck(fm,e){
  if(DB.profile?.garde==='Non')return{alerts:[]};
  const g=n=>fm.querySelector(`[name=${n}]`)?.value,it={type:g('type'),cat:g('cat'),montant:num(g('montant')),date:g('date'),statut:g('statut')};
  if(it.statut==='❌ Annulé'||!it.date||!it.montant||kind(it)==='autre')return{alerts:[]};
  const ym=ymOf(it.date),M=budgetModel(ym),others=mItems(ym).filter(i=>!e||i.id!==e.id),alerts=[];
  const rev=sum7(others.filter(i=>kind(i)==='rev')),out=sum7(others.filter(i=>kind(i)!=='rev'))+(kind(it)==='rev'?0:it.montant),revT=rev+(kind(it)==='rev'?it.montant:0),solde=revT-out;
  const variable=(it.type==='Dépense Variable'||it.type==='Dépense Occasionnelle')&&it.cat!=='Projets'&&it.cat!=='Dîmes'&&it.cat!=='Aumônes';
  if(variable){
    const y=ym.slice(0,4),mi=+ym.slice(5,7)-1,cat=annualModel(y).find(x=>x.c.nom===it.cat),plan=cat?num(cat.p[mi]):0,done=sum7(others.filter(i=>i.cat===it.cat&&kind(i)==='dep'));
    if(plan>0&&done+it.montant>plan)alerts.push({l:'warn',h:`<b>${esc(it.cat)}</b> : ${fmt(done+it.montant)} pour un budget de ${fmt(plan)} (dépassement de ${fmt(done+it.montant-plan)}).`});
    const vs=sum7(others.filter(i=>(i.type==='Dépense Variable'||i.type==='Dépense Occasionnelle')&&i.cat!=='Projets'&&i.cat!=='Dîmes'&&i.cat!=='Aumônes'&&kind(i)==='dep'))+it.montant;
    if(M.varCap>0&&vs>M.varCap)alerts.push({l:'warn',h:`Dépenses variables du mois : ${fmt(vs)} pour un budget cible de ${fmt(M.varCap)} (+ ${fmt(vs-M.varCap)}).`});
  }
  if(kind(it)!=='rev'&&revT>0&&solde<0){const pre=precaution(),def=-solde;
    alerts.push(pre<def?{l:'bad',h:`<b>Solde prévisionnel négatif (${fmt(solde)})</b> et l’épargne de précaution disponible (${fmt(pre)}) ne couvre pas l’écart de ${fmt(def)}.`,severe:1}:{l:'warn',h:`Solde prévisionnel négatif (${fmt(solde)}) : il faudrait puiser ${fmt(def)} dans la précaution (${fmt(pre)} disponibles).`})}
  return{alerts,severe:alerts.some(a=>a.severe)};
}
function showGuard(r,go){
  const ov=document.createElement('div');ov.className='ov';ov.style.zIndex=80;
  ov.innerHTML=`<div class="card modal" role="alertdialog"><h2 style="color:var(--${r.severe?'bad':'warn'})">${ic('alert')} ${r.severe?'Alerte rouge — dépense à risque':'Attention au budget'}</h2>${r.alerts.map(a=>`<div class="al ${a.l}"><span class="ai">${ic('alert')}</span><div>${a.h}</div></div>`).join('')}
   <p class="small mute">Vous pouvez enregistrer quand même ; l’alerte restera visible dans la cloche et sur le tableau de bord.</p>
   <div class="mact" style="justify-content:flex-end"><button class="ghost" data-g="no">Modifier / annuler</button><button class="ghost danger" data-g="yes">Enregistrer quand même</button></div></div>`;
  document.body.appendChild(ov);ov.onclick=ev=>{const b=ev.target.closest('[data-g]');if(!b&&ev.target!==ov)return;ov.remove();if(b?.dataset.g==='yes')go()};
}
{const o=openForm;openForm=function(k,id){o.apply(this,arguments);if(k!=='finances')return;
  const ov=[...document.querySelectorAll('.ov')].pop(),fm=ov&&ov.querySelector('form');if(!fm)return;const e=id&&list('finances').find(x=>x.id===id);
  fm.addEventListener('submit',ev=>{if(fm.dataset.ok7)return;const r=guardCheck(fm,e);if(!r.alerts.length)return;ev.preventDefault();ev.stopImmediatePropagation();showGuard(r,()=>{fm.dataset.ok7='1';fm.requestSubmit()})},true);
}}
{const base=extraAlerts;extraAlerts=function(){
  const A=[...base()];if(DB.profile?.garde==='Non')return A;
  try{const T=new Date(),M=budgetModel(T.getFullYear()+'-'+String(T.getMonth()+1).padStart(2,'0'));
    if(M.net>0&&M.varCap>0&&M.varSpent>M.varCap)A.push({w:1,l:'warn',i:'alert',s:M.varSpent-M.varCap,h:`<b>Budget variable du mois</b> — ${fmt(M.varSpent)} dépensés pour un budget cible de ${fmt(M.varCap)} <a href="#" data-go="budgetia">Voir</a>`});
    if(M.revM>0&&M.solde<0)A.push({w:0,l:precaution()<-M.solde?'bad':'warn',i:'alert',s:-M.solde,h:`<b>Solde prévisionnel du mois négatif</b> : ${fmt(M.solde)}${precaution()<-M.solde?' — précaution insuffisante':''} <a href="#" data-go="budgetia">Voir</a>`})}catch(e){}
  return A}}

/* ---------- 5. PROFIL ET RÈGLES PAR UTILISATEUR, CONTEXTE IA COMPLET ---------- */
PAGES.reglages=el=>{reglages(el);const p=DB.profile||{},sel=(n,arr,v)=>`<select name="${n}">${arr.map(o=>`<option value="${esc(o[0])}" ${o[0]===v?'selected':''}>${esc(o[1])}</option>`).join('')}</select>`;
  const card=document.createElement('div');card.className='card';
  card.innerHTML=`<h2>${ic('settings')} Profil et règles métier</h2><form id="pf7" class="fg">
   <div><label>Profil de revenus</label>${sel('profil',['Salarié','Entrepreneur','Étudiant','Gestionnaire de projets','Autre'].map(x=>[x,x]),p.profil||'Salarié')}</div>
   <div><label>Revenu net mensuel de référence (laisser vide = dernier salaire saisi)</label><input name="revenuNet" type="number" min="0" value="${esc(p.revenuNet||'')}"></div>
   <div><label>Zone géographique</label>${sel('zoneReg',[['','Selon mon pays'],...Object.entries(REGN)],p.zoneReg||'')}</div>
   <div><label>Objectif d’épargne (% du revenu net)</label><input name="pctEpargne" type="number" min="0" max="90" step="any" value="${esc(p.pctEpargne||15)}"></div>
   <div><label>Projets pour le compte de tiers</label>${sel('tiersOn',[['Oui','Je gère des projets pour des tiers'],['Non','Non']],p.tiersOn||'Oui')}</div>
   <div><label>Rattrapage de l’épargne (en mois)</label><input name="rattrapage" type="number" min="1" max="24" value="${esc(p.rattrapage||6)}"></div>
   <p class="full" style="margin:0"><button>Enregistrer</button> <span class="mute small">les catégories se personnalisent dans « Catégories ».</span></p></form>
   ${DB.mig7Report?`<p class="mute small" style="margin:12px 0 0">Dernière correction automatique des données : ${esc(DB.mig7Report.at.slice(0,10))} — ${DB.mig7Report.removed.length} supprimée(s), ${DB.mig7Report.added.length} restaurée(s), ${DB.mig7Report.projets.length} projet(s) classé(s).${DB.mig7Report.verifier.length?'<br>À vérifier : '+DB.mig7Report.verifier.map(esc).join(' ; '):''}</p>`:''}`;
  el.insertBefore(card,el.children[2]||null);
  card.querySelector('#pf7').onsubmit=ev=>{ev.preventDefault();const f=new FormData(ev.target);DB.profile={...DB.profile,profil:f.get('profil'),revenuNet:num(f.get('revenuNet')),zoneReg:f.get('zoneReg'),pctEpargne:num(f.get('pctEpargne'))||15,tiersOn:f.get('tiersOn'),rattrapage:num(f.get('rattrapage'))||6};save();render();toast('✔ Règles enregistrées')};
};
context=function(){
  const F=list('finances').filter(i=>i.statut!=='❌ Annulé'&&!isTiersLine(i)),by={};
  F.forEach(i=>{const y=(i.date||'').slice(0,4),k=i.cat+(kind(i)==='rev'?' (revenu)':'');by[y]=by[y]||{};by[y][k]=(by[y][k]||0)+num(i.montant)});
  const T=new Date(),ym=T.getFullYear()+'-'+String(T.getMonth()+1).padStart(2,'0'),slim=({id,created,fichier,photo,lien,auto,...r})=>r;
  const div={};F.filter(i=>i.cat==='Dividendes').forEach(i=>{const y=i.date.slice(0,4);div[y]=(div[y]||0)+num(i.montant)});list('bourse').filter(o=>o.type==='Dividende').forEach(o=>{const y=(o.date||'').slice(0,4);div['bourse '+y]=(div['bourse '+y]||0)+num(o.qte)*num(o.pu)});
  const P=list('projets').map(p=>({nom:p.nom,statut:p.statut,titulaire:p.titulaire,mensuel:p.mensuel,paiement:p.paiement,injecte:pStats(p,String(T.getFullYear())).cumAll,echeance:p.echeance}));
  const p=DB.profile||{};
  return `Date: ${today()}. Utilisateur : profil ${p.profil||'—'}, devise ${CURR}, langue ${LNAME[LANG]}, zone ${p.ville||''} ${regionName(COUNTRY)}, dîme ${dimeMode()} (${dimeTaux()} %), revenu net de référence ${netMensuel(ym)}.
Synthèse de TOUTES les années par catégorie (montants non annulés) : ${JSON.stringify(by)}
Dividendes perçus par année : ${JSON.stringify(div)}
Opérations du mois en cours : ${JSON.stringify(F.filter(i=>ymOf(i.date)===ym).map(slim))}
Dernières opérations passées : ${JSON.stringify(F.filter(i=>i.date<=today()).sort((a,b)=>a.date<b.date?1:-1).slice(0,120).map(slim))}
Projets (montant injecté = versements réalisés rattachés) : ${JSON.stringify(P)}
Investissements : ${JSON.stringify(list('investissements').slice(-40).map(slim))}
Bourse : ${list('bourse').length} ordres, positions ${JSON.stringify((typeof positions==='function'?positions():[]).slice(0,25).map(x=>({societe:x.nom,qte:x.qte,cout:Math.round(x.cout),dividendes:Math.round(x.div)})))}
Objectifs : ${JSON.stringify(list('objectifs').map(slim))}`;
};
