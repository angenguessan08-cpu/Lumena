'use strict';
/* =====================================================================
   LUMINA v6
   1. Bouton « Actualiser » (relit les données, redessine la page) + conservation du défilement
   2. Dîme : bandeau de paramétrage sur Budget annuel et Plan financier
   3. Projets : titulaire, gestionnaire, mensualité, personnes concernées + montants, type de paiement
   4. Graphiques « Récap par catégorie » : vue (annuelle / mensuelle / par poste) et échelle figées, mémorisées
   5. Actualités & opportunités : alertes selon la zone, projets clés en main avec devis
   ===================================================================== */
Object.assign(IC,{
 refresh:'<path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 4v5h-5"/>',
 pin:'<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
 news:'<path d="M5 4h11a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2z"/><path d="M18 8h2v10a2 2 0 0 1-2 2M8 8h7M8 12h7M8 16h4"/>'
});
{ /* traductions des nouveaux libellés (un libellé absent reste en français) */
  const T=[['Actualiser','Refresh','Actualizar','Atualizar'],['Ne plus naviguer à l’aveugle : la clarté sur vos comptes, mois par mois, poste par poste.','No more flying blind: clarity on your accounts, month by month, line by line.','Sin navegar a ciegas: claridad sobre tus cuentas, mes a mes, partida a partida.','Sem navegar às cegas: clareza sobre as suas contas, mês a mês, rubrica a rubrica.'],['Actualités & opportunités','News & opportunities','Noticias y oportunidades','Notícias e oportunidades'],
   ['Titulaire du projet','Project owner','Titular del proyecto','Titular do projeto'],['Gestionnaire du projet','Project manager','Gestor del proyecto','Gestor do projeto'],
   ['Type de paiement','Payment type','Tipo de pago','Tipo de pagamento'],['Fonds propres','Own funds','Fondos propios','Fundos próprios'],
   ['Créer ce projet dans LUMINA','Create this project in LUMINA','Crear este proyecto en LUMINA','Criar este projeto no LUMINA'],
   ['Devis détaillé','Detailed quote','Presupuesto detallado','Orçamento detalhado']];
  T.forEach(r=>DICT.set(norm(r[0]).trim(),r.slice(1)));
}

/* ---------- 1. ACTUALISER + défilement conservé ---------- */
function refreshData(){
  if(!ME)return;
  try{
    DB=load();
    if(!DB.profile?.nom)DB.profile={...DB.profile,nom:ME.nom};
    if(typeof users==='function'){const u=users().find(x=>x.id===ME.id);if(u)ME=u}
    applyPrefs(DB.profile?.lang?DB.profile:{lang:LANG,country:COUNTRY,currency:CURR});
    boot();if(typeof migrate2==='function')migrate2();if(typeof migrate4==='function')migrate4();
    if(DB.actus)delete DB.actus.cache;        /* force le rechargement des actualités / de la météo */
    try{navigator.serviceWorker?.getRegistration().then(r=>r&&r.update())}catch{}
    render();
    const d=new Date();toast(`✔ Données actualisées à ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`);
  }catch(e){toast('⚠ Actualisation impossible : '+e.message)}
}
{ let lastView=null;const r0=render;
  render=function(){
    const same=lastView===view,y=scrollY;r0.apply(this,arguments);lastView=view;if(same)scrollTo(0,y);
    const h=document.querySelector('#main .head');
    if(h&&!h.querySelector('[data-refresh]')){let a=h.querySelector('.acts');if(!a){a=document.createElement('div');a.className='acts';h.appendChild(a)}a.insertAdjacentHTML('afterbegin',`<button class="ghost" data-refresh title="Recharger les données">${ic('refresh')} Actualiser</button>`)}
    if(!h&&!document.querySelector('#main .hero')&&!document.querySelector('#main [data-refresh]'))document.getElementById('main').insertAdjacentHTML('afterbegin',`<div class="acts" style="justify-content:flex-end;margin-bottom:10px"><button class="ghost" data-refresh>${ic('refresh')} Actualiser</button></div>`);
    const q=document.querySelector('#main .hero .qa');
    if(q&&!q.querySelector('[data-refresh]'))q.insertAdjacentHTML('beforeend',`<button data-refresh>${ic('refresh')} Actualiser</button>`);
    const b=document.getElementById('refresh');if(b&&!b.innerHTML){b.innerHTML=ic('refresh');b.dataset.refresh='1'}
  }}
document.addEventListener('click',ev=>{if(ev.target.closest('[data-refresh]')){ev.preventDefault();refreshData()}});
{const b=document.getElementById('refresh');if(b){b.innerHTML=ic('refresh');b.dataset.refresh='1';b.title='Actualiser les données'}}

/* ---------- 2. DÎME : réglage visible dans Budget annuel et Plan financier ---------- */
function dimeBanner(){return ''}
function _dimeBannerOld(){
  const m=dimeMode(),txt={ask:'demandée à chaque revenu',always:'proposée automatiquement',never:'non applicable (vous ne payez pas la dîme)'}[m];
  return `<div class="card dimeban"><div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center"><span><b>🙏 Dîme</b> : ${txt}${m==='never'?'':` · taux ${dimeTaux()} %`}</span>
   <span style="margin-left:auto;display:flex;gap:8px;align-items:center;flex-wrap:wrap"><label style="margin:0">Dîme dans ce calcul</label><select data-dm style="width:auto"><option value="ask" ${m==='ask'?'selected':''}>Me demander à chaque revenu</option><option value="always" ${m==='always'?'selected':''}>Proposée automatiquement</option><option value="never" ${m==='never'?'selected':''}>Je ne paie pas la dîme</option></select></span></div></div>`;
}
['budgetan','plan15'].forEach(k=>{const base=PAGES[k];if(!base)return;PAGES[k]=el=>{base(el);const h=el.querySelector('.head');if(h)h.insertAdjacentHTML('afterend',dimeBanner())}});
document.addEventListener('change',ev=>{const s=ev.target.closest?.('[data-dm]');if(!s||!ME)return;DB.profile={...DB.profile,dimeMode:s.value,dimeAuto:s.value==='never'?'Non':'Oui'};save();render();toast(s.value==='never'?'✔ La dîme n’est plus comptée':'✔ Dîme mise à jour')});

/* ---------- 3. PROJETS ---------- */
const PAY_TYPES=['Fonds propres','Prêt bancaire','Prêt entre proches','Crédit fournisseur','Subvention / Don','Tontine / Collectif','Mixte','Autre'];
{const f=MODULES.projets.fields,keep=k=>f.find(x=>x.k===k);
  MODULES.projets.fields=[
   {k:'nom',l:'Nom du projet (crèche, miel, RAFEI…)',full:1},
   {k:'titulaire',l:'Titulaire du projet (pour le compte de qui ?)'},
   {k:'gestionnaire',l:'Gestionnaire du projet'},
   {k:'mensuel',l:'Montant mensuel à verser pour le projet (FCFA)',t:'number'},
   {k:'paiement',l:'Type de paiement',t:'select',o:PAY_TYPES},
   {k:'personnes',l:'Personnes concernées et montant assigné à chacune (une par ligne : Nom : montant)',t:'textarea',full:1},
   keep('statut'),keep('debut'),keep('echeance'),keep('budget'),keep('depense'),keep('photo'),keep('taches')].filter(Boolean);
  MODULES.projets.defaults={...MODULES.projets.defaults,paiement:'Fonds propres'};
  MODULES.projets.cols.splice(1,0,{k:'titulaire',l:'Titulaire'},{k:'gestionnaire',l:'Gestionnaire'});
  MODULES.projets.cols.splice(5,0,{k:'mensuel',l:'Mensualité',cls:'num',f:i=>i.mensuel?fmt(i.mensuel):'—'},{k:'paiement',l:'Paiement',f:i=>badge(i.paiement)});
  MODULES.projets.filters=[{k:'statut',l:'Statut'},{k:'paiement',l:'Type de paiement'}];
  const s0=MODULES.projets.summary;MODULES.projets.summary=a=>s0(a)+`<span>Mensualités <b>${fmt(a.reduce((x,i)=>x+num(i.mensuel),0))}</b></span>`;
}
/* « Nom : montant » (séparateurs : ou - ou =), un par ligne */
function parsePers(txt){return String(txt||'').split('\n').map(l=>l.trim()).filter(Boolean).map(l=>{const m=/^(.*?)[\s]*[:=\-–]\s*([\d\s.,]+)\s*\D*$/.exec(l)||/^(.*?)\s+([\d][\d\s.,]*)\s*\D*$/.exec(l);return m?{nom:m[1].trim(),montant:num(m[2].replace(/\s/g,'').replace(',','.'))}:{nom:l,montant:0}})}
function persText(p){const a=parsePers(p.personnes);return a.length?a.map(x=>x.nom).join(', '):(p.equipe||'')}
{const pc=projectCard;projectCard=function(i){
  const P=parsePers(i.personnes),tot=P.reduce((x,y)=>x+y.montant,0);
  const blk=[i.titulaire?`👤 Titulaire : ${esc(i.titulaire)}`:'',i.gestionnaire?`🧭 Gestionnaire : ${esc(i.gestionnaire)}`:''].filter(Boolean).join(' · ');
  const pay=[i.paiement?`💳 ${esc(i.paiement)}`:'',num(i.mensuel)?`Mensualité ${fmt(i.mensuel)}`:''].filter(Boolean).join(' · ');
  const html=`${blk?`<div class="s">${blk}</div>`:''}${pay?`<div class="s">${pay}</div>`:''}${P.length?`<div class="s">👥 ${P.map(x=>`${esc(x.nom)}${x.montant?` (${fmt(x.montant)})`:''}`).join(', ')}${tot&&num(i.mensuel)&&Math.round(tot)!==Math.round(num(i.mensuel))?` <span class="${tot>num(i.mensuel)?'bad':'warn'}">· total assigné ${fmt(tot)} ≠ mensualité</span>`:''}</div>`:''}`;
  return pc(i).replace('<div class="s">Échéance',html+'<div class="s">Échéance')};MODULES.projets.card=projectCard}
{const o=openForm;openForm=function(k,id,pre){o.apply(this,arguments);if(k!=='projets')return;
  const ov=[...document.querySelectorAll('.ov')].pop(),fm=ov&&ov.querySelector('form');if(!fm)return;
  const ta=fm.querySelector('[name=personnes]'),mo=fm.querySelector('[name=mensuel]');if(!ta||!mo)return;
  ta.placeholder='Marie : 20000\nJean : 15000';
  const hint=document.createElement('div');hint.className='mute small';ta.after(hint);
  const upd=()=>{const P=parsePers(ta.value),tot=P.reduce((x,y)=>x+y.montant,0),m=num(mo.value);hint.className='small '+(P.length&&m&&Math.round(tot)!==Math.round(m)?'warn':'mute');
    hint.textContent=P.length?`${P.length} personne(s) · total assigné ${fmt(tot)}${m?` / mensualité ${fmt(m)}${Math.round(tot)===Math.round(m)?' ✔':` (écart ${fmt(m-tot)})`}`:''}`:'Indiquez qui est concerné et combien chacun verse ou perçoit.'};
  ta.addEventListener('input',upd);mo.addEventListener('input',upd);upd();
}}

/* ---------- 4. GRAPHIQUES « Récap par catégorie » : vue et échelle figées ---------- */
const CV=()=>{DB.cv=DB.cv||{view:'annual',fix:true};return DB.cv};
const trunc=(s,n)=>s.length>n?s.slice(0,n-1)+'…':s;
{const base=PAGES.recapcat;
  PAGES.recapcat=el=>{
    base(el);
    const y=YY(),M=annualModel(y).filter(x=>x.p.some(v=>v)||x.r.some(v=>v)||x.c.budget);if(!M.length)return;
    let sel=M.find(x=>x.c.nom===DB.recapcat);
    if(!sel){sel=[...M].sort((a,b)=>sumArr(b.r)-sumArr(a.r))[0];DB.recapcat=sel.c.nom;save()}   /* la sélection ne saute plus d'une visite à l'autre */
    const svg=el.querySelector('svg.chart');if(!svg)return;
    const c=sel.c,cv=CV(),col=c.type==='Revenu'?'var(--lime)':'var(--brand)',fix=cv.fix!==false;
    const cm=new Date().getMonth()+1;
    const lastData=Math.max(1,...sel.r.map((v,i)=>v?i+1:0)),mm=DS.m!=='0'?+DS.m:(y===String(new Date().getFullYear())?cm:lastData);
    const tx=list('finances').filter(i=>i.cat===c.nom&&counted(i,DS.base)&&(i.date||'').startsWith(y));
    let html='',caption='';
    if(cv.view==='monthly'){
      const dim=new Date(+y,mm,0).getDate(),day=Array(dim).fill(0);
      tx.filter(i=>+(i.date||'').slice(5,7)===mm).forEach(i=>{const d=+(i.date||'').slice(8,10);if(d>=1&&d<=dim)day[d-1]+=num(i.montant)});
      let acc=0;const cum=day.map(v=>acc+=v),bud=sel.p[mm-1]||0;
      caption=`${MOIS_L[mm-1]} ${y} — jour par jour (cumul comparé au budget du mois)`;
      html=combo({labels:day.map((_,i)=>String(i+1)),bars:[{n:'Jour',v:day,c:col}],lines:[{n:'Cumul du mois',v:cum,c:'var(--ink)'},{n:'Budget du mois',v:day.map(()=>bud),c:'var(--warn)',dash:true}],fixMax:fix?Math.max(bud,acc):null});
    }else if(cv.view==='poste'){
      const by={};tx.filter(i=>DS.m==='0'||+(i.date||'').slice(5,7)===+DS.m).forEach(i=>{const k=i.libelle||'—';by[k]=(by[k]||0)+num(i.montant)});
      const top=Object.entries(by).sort((a,b)=>b[1]-a[1]).slice(0,10);
      caption=`Par poste (libellé) — ${DS.m==='0'?'année '+y:MOIS_L[+DS.m-1]+' '+y}`;
      html=top.length?combo({labels:top.map(x=>trunc(x[0],9)),bars:[{n:'Total',v:top.map(x=>x[1]),c:col}],fixMax:fix?top[0][1]:null})+`<div class="leg">${top.map(x=>`<span>${esc(trunc(x[0],9))} = ${esc(x[0])} · ${fmt(x[1])}</span>`).join('')}</div>`:'<p class="mute">Aucune opération pour cette période.</p>';
    }else{
      const mx=Math.max(...sel.r,...sel.p,1);caption=`Année ${y} — réel mois par mois comparé au budget`;
      html=combo({labels:MOIS,bars:[{n:'Réel',v:sel.r,c:col}],lines:[{n:'Budget',v:sel.p,c:'var(--warn)',dash:true}],fixMax:fix?mx:null});
    }
    const tools=`<div class="ctools"><span class="seg">${[['annual','Annuelle'],['monthly','Mensuelle'],['poste','Par poste']].map(([k,l])=>`<button class="ghost ${cv.view===k?'on':''}" data-cv="${k}">${l}</button>`).join('')}</span>
      ${cv.view==='monthly'?`<select data-ds="m" style="width:auto">${MOIS_L.map((n,i)=>`<option value="${i+1}" ${mm===i+1?'selected':''}>${n}</option>`).join('')}</select>`:''}
      <label class="chk" style="margin:0 0 0 auto"><input type="checkbox" data-cfix ${fix?'checked':''}> Échelle figée</label></div><div class="mute small" style="margin:4px 0 6px">${esc(caption)}</div>`;
    const leg=svg.nextElementSibling&&svg.nextElementSibling.classList.contains('leg')?svg.nextElementSibling:null;
    const box=document.createElement('div');box.id='cvbox';box.innerHTML=tools+html;
    svg.replaceWith(box);if(leg)leg.remove();
  }}
document.addEventListener('click',ev=>{const b=ev.target.closest('[data-cv]');if(!b||!ME)return;CV().view=b.dataset.cv;save();render()});
document.addEventListener('change',ev=>{if(!ME||!ev.target.matches?.('[data-cfix]'))return;CV().fix=ev.target.checked;save();render()});

/* ---------- 5. ACTUALITÉS & OPPORTUNITÉS (zone géographique, projets clés en main) ---------- */
const REG={WA:['CI','SN','ML','BF','NE','TG','BJ','GN','GH','NG','CV'],CA:['CM','GA','CG','TD','CD','AO'],EA:['KE','TZ','UG','RW'],SA:['ZA','MZ','MU','MG'],NA:['MA','DZ','TN','EG'],EU:['FR','BE','CH','PT','ES','GB'],AM:['US','CA','BR','MX','CO']};
const baseReg=r=>r==='CI-N'?'WA':r;
const regOf=c=>{const z=DB.profile?.zoneReg;if(z==='INT'||z==='CI-N')return z;if(z&&REG[z])return z;return Object.keys(REG).find(k=>REG[k].includes(c))||'WA'};
const REGN={'CI-N':'Côte d’Ivoire — Nord (Korhogo)',INT:'International',WA:'Afrique de l’Ouest',CA:'Afrique centrale',EA:'Afrique de l’Est',SA:'Afrique australe & océan Indien',NA:'Afrique du Nord',EU:'Europe',AM:'Amériques'};
/* Capitales : position approximative utilisée si l’utilisateur ne partage pas sa position (aucune donnée personnelle) */
const CAPS={CI:[5.36,-4.01,'Abidjan'],SN:[14.72,-17.47,'Dakar'],ML:[12.64,-8.0,'Bamako'],BF:[12.37,-1.52,'Ouagadougou'],NE:[13.51,2.11,'Niamey'],TG:[6.13,1.22,'Lomé'],BJ:[6.37,2.39,'Cotonou'],GN:[9.64,-13.58,'Conakry'],CM:[3.85,11.5,'Yaoundé'],GA:[0.39,9.45,'Libreville'],CG:[-4.27,15.28,'Brazzaville'],TD:[12.13,15.05,'N’Djamena'],CD:[-4.32,15.31,'Kinshasa'],MG:[-18.88,47.51,'Antananarivo'],MA:[33.57,-7.59,'Casablanca'],DZ:[36.75,3.06,'Alger'],TN:[36.81,10.18,'Tunis'],FR:[48.86,2.35,'Paris'],BE:[50.85,4.35,'Bruxelles'],CH:[46.95,7.45,'Berne'],CA:[45.5,-73.57,'Montréal'],NG:[6.52,3.38,'Lagos'],GH:[5.6,-0.19,'Accra'],KE:[-1.29,36.82,'Nairobi'],TZ:[-6.79,39.21,'Dar es Salaam'],UG:[0.35,32.58,'Kampala'],RW:[-1.95,30.06,'Kigali'],ZA:[-26.2,28.05,'Johannesburg'],MU:[-20.16,57.5,'Port-Louis'],EG:[30.04,31.24,'Le Caire'],US:[40.71,-74.0,'New York'],GB:[51.51,-0.13,'Londres'],AO:[-8.84,13.23,'Luanda'],MZ:[-25.97,32.57,'Maputo'],CV:[14.93,-23.51,'Praia'],PT:[38.72,-9.14,'Lisbonne'],BR:[-23.55,-46.63,'São Paulo'],ES:[40.42,-3.7,'Madrid'],MX:[19.43,-99.13,'Mexico'],CO:[4.71,-74.07,'Bogotá']};
const AC=()=>(DB.actus=DB.actus||{});
const zone=()=>{const z=DB.profile?.zone;if(z&&z.lat!=null)return z;const c=regOf(COUNTRY)==='CI-N'?[9.46,-5.63,'Korhogo']:(CAPS[COUNTRY]||CAPS.CI);return{lat:c[0],lon:c[1],label:DB.profile?.ville||c[2],src:'pays'}};
/* montants du catalogue en FCFA : convertis seulement pour XOF/XAF/EUR (parité fixe), sinon affichés en FCFA */
const mf=n=>CURR==='XOF'||CURR==='XAF'?fmt(n):CURR==='EUR'?fmt(n/655.957):nf(n)+' FCFA';

/* Alertes saisonnières : repères climatiques et calendaires généraux, hors-ligne, à titre indicatif */
function seasonal(){
  const m=new Date().getMonth()+1,r0=regOf(COUNTRY),r=baseReg(r0),A=[],add=(l,h,tip)=>A.push({l,h,tip});
  const inM=(a,b)=>a<=b?m>=a&&m<=b:m>=a||m<=b;
  if(r==='WA'||r==='CA'){
    if(inM(6,9))add('warn','Saison des pluies : risque d’inondations et de routes dégradées dans les zones urbaines et rurales.','Vérifiez votre ligne « Imprévus » et l’assurance habitation ; reportez les déplacements non essentiels.');
    if(inM(3,5))add('ok','Début de saison des pluies : période de préparation des champs et des semis.','Bon moment pour lancer ou étendre un projet agricole (maraîchage, apiculture, élevage).');
    if(inM(11,2))add('ok','Harmattan : air sec et poussiéreux, mois favorables au séchage et à la construction.','Pensez aux soins respiratoires et à la rubrique « Santé » ; les chantiers avancent plus vite.');
    if(inM(9,10))add('warn','Rentrée scolaire : pic des dépenses d’éducation (scolarité, fournitures, uniformes).','Comparez le budget « Éducation / Enfants » à la réalité et étalez les paiements.');
    if(COUNTRY==='CI'&&inM(10,3))add('ok','Campagne principale cacao/café : revenus saisonniers plus élevés dans les zones productrices.','Prévoyez une épargne de mise de côté pour la période creuse.');
  }else if(r==='EA'){
    if(inM(3,5)||inM(10,12))add('warn','Saisons des pluies : risque d’inondations et de glissements de terrain.','Renforcez votre fonds d’imprévus.');
    if(inM(1,2)||inM(6,9))add('ok','Saison plus sèche : bonne période pour les récoltes et les chantiers.','');
  }else if(r==='SA'){
    if(inM(11,4))add('warn','Saison des pluies et des cyclones (océan Indien / Mozambique).','Vérifiez vos assurances et vos réserves.');
  }else if(r==='NA'){
    if(inM(6,9))add('warn','Fortes chaleurs estivales : consommation d’énergie et d’eau en hausse.','Anticipez la hausse de vos factures.');
  }else if(r==='EU'){
    if(inM(11,2))add('warn','Hiver : dépenses de chauffage et d’énergie en hausse.','Contrôlez la ligne « Logement » et ses charges.');
    if(inM(8,9))add('warn','Rentrée : dépenses scolaires et d’assurances en hausse.','');
  }
  if(r0==='CI-N'){
    if(inM(11,3))add('warn','Harmattan et saison sèche dans le Nord : air sec, nuits fraîches ; risque de feux de brousse de décembre à février.','Protégez cultures, stocks et bâtiments ; prévoyez les soins respiratoires.');
    if(inM(2,4))add('warn','Pic de chaleur dans le Nord (souvent plus de 38 °C) : eau et santé à surveiller.','Anticipez la hausse des dépenses d’eau, d’énergie et de santé.');
    if(inM(2,6))add('ok','Campagne de l’anacarde (noix de cajou) dans le Nord : période de revenus agricoles saisonniers.','Mettez de côté une part des revenus de campagne pour la saison creuse.');
    if(inM(5,6))add('ok','Début de la saison des pluies : semis de maïs, coton, igname.','Préparez intrants et main-d’œuvre.');
    if(inM(8,9))add('warn','Pic des pluies : pistes rurales dégradées autour de Korhogo, transports plus lents et plus chers.','Regroupez vos déplacements et vos achats.');
    if(inM(10,12))add('ok','Campagne cotonnière et récoltes : bonne période de vente.','Planifiez remboursements et dépenses d’éducation avec ces revenus.');
    if(inM(6,8))add('ok','Cueillette du karité : matière première disponible pour le beurre de karité.','');
  }
  if(m===12||m===1)add('warn','Fêtes de fin d’année : dépenses de famille et de cadeaux en hausse.','Fixez un plafond pour « Famille » et « Envies » avant le 15 décembre.');
  return A;
}
/* Météo locale (Open-Meteo, sans clé) : seulement après accord explicite de l’utilisateur */
async function loadMeteo(force){
  const a=AC(),z=zone();if(!a.meteoOk)return;
  if(!force&&a.cache&&Date.now()-a.cache.at<3*3600e3&&a.cache.k===z.lat+','+z.lon)return;
  try{
    const r=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${z.lat}&longitude=${z.lon}&daily=precipitation_sum,temperature_2m_max,wind_speed_10m_max&timezone=auto&forecast_days=7`);
    if(!r.ok)throw new Error('HTTP '+r.status);const j=await r.json(),d=j.daily;
    a.cache={at:Date.now(),k:z.lat+','+z.lon,days:d.time.map((t,i)=>({t,rain:d.precipitation_sum[i],tmax:d.temperature_2m_max[i],wind:d.wind_speed_10m_max[i]}))};delete a.err;
  }catch(e){a.err=e.message}
  save();if(view==='actus')render();
}
function meteoAlerts(){
  const a=AC(),out=[];if(a.err)out.push({l:'warn',h:'Météo locale indisponible ('+esc(a.err)+'). Vérifiez votre connexion puis cliquez sur « Actualiser ».',tip:''});
  (a.cache?.days||[]).forEach(d=>{const dt=new Date(d.t+'T12:00:00').toLocaleDateString(LOC,{weekday:'long',day:'numeric',month:'short'});
    if(d.rain>=50)out.push({l:'bad',h:`<b>${dt}</b> — fortes pluies annoncées (${Math.round(d.rain)} mm) : risque d’inondation.`,tip:'Mettez à l’abri stocks et documents ; évitez les déplacements inutiles.'});
    else if(d.rain>=20)out.push({l:'warn',h:`<b>${dt}</b> — pluies soutenues (${Math.round(d.rain)} mm).`,tip:''});
    if(d.tmax>=38)out.push({l:'warn',h:`<b>${dt}</b> — forte chaleur (${Math.round(d.tmax)} °C).`,tip:'Hydratation, protection des animaux et des cultures.'});
    if(d.wind>=60)out.push({l:'warn',h:`<b>${dt}</b> — vent fort (${Math.round(d.wind)} km/h).`,tip:''})});
  return out;
}

/* Catalogue de projets clés en main — ordres de grandeur indicatifs en FCFA, à valider par des devis locaux */
const CAT=[
 {id:'ponte',nom:'Poulailler de 200 pondeuses',sect:'Élevage',zones:['WA','CA','EA'],tags:['poule','oeuf','poulet','elevage','volaille'],mois:[1,2,3,9,10],delai:5,net:110000,rev:350000,
  note:'Œufs de consommation : vente quotidienne à des revendeuses, boulangeries et restaurants. Prévoir vaccination et biosécurité.',
  l:[['Bâtiment 40 m² (matériaux + main-d’œuvre)',1,1200000],['Pondoirs, mangeoires, abreuvoirs',1,350000],['Poulettes démarrées',200,2500],['Aliment (sacs de 50 kg), 1er trimestre',40,16000],['Vaccins et produits vétérinaires',1,120000]]},
 {id:'miel',nom:'Apiculture — 20 ruches',sect:'Agriculture',zones:['WA','CA','EA','SA'],tags:['miel','abeille','apiculture','ruche'],mois:[2,3,4,10,11],delai:6,net:75000,rev:100000,
  note:'Miel et sous-produits (cire). Demande locale forte et peu de charges récurrentes ; formation initiale conseillée.',
  l:[['Ruches (type Kenya Top-Bar)',20,35000],['Essaims',20,15000],['Combinaisons, enfumoir, extracteur',1,250000],['Local de stockage / conditionnement',1,150000],['Pots, étiquettes, emballage',1,100000],['Formation initiale',1,100000]]},
 {id:'creche',nom:'Crèche / garderie — 20 enfants',sect:'Services',zones:['WA','CA','NA','EA'],tags:['creche','enfant','garderie','ecole','education'],mois:[6,7,8],delai:8,net:80000,rev:500000,
  note:'Revenus récurrents mensuels ; agrément et normes d’hygiène à obtenir avant ouverture. Idéal avant la rentrée.',
  l:[['Aménagement et mise aux normes du local',1,2500000],['Mobilier et jeux',1,1200000],['Cuisine et sanitaires',1,400000],['Dossier d’autorisation',1,300000],['Assurances',1,150000],['Fonds de roulement (3 mois)',3,500000]]},
 {id:'marai',nom:'Maraîchage irrigué — 0,5 ha',sect:'Agriculture',zones:['WA','CA','EA','SA'],tags:['maraichage','legume','agriculture','champ','culture'],mois:[10,11,12,1,3,4],delai:4,net:210000,rev:300000,
  note:'Légumes à cycle court (3 mois) pour les marchés urbains. Point clé : accès à l’eau toute l’année.',
  l:[['Clôture',1,400000],['Forage + pompe solaire',1,1800000],['Goutte-à-goutte',1,450000],['Semences et engrais (1 cycle)',1,250000],['Outils',1,150000]]},
 {id:'boutique',nom:'Boutique de proximité',sect:'Commerce',zones:['WA','CA','EA','NA','SA'],tags:['boutique','commerce','vente','magasin'],mois:[8,9,12],delai:3,net:300000,rev:450000,
  note:'Marge brute estimée à 15 % sur 3 M de ventes mensuelles ; emplacement et rotation du stock font la différence.',
  l:[['Aménagement du local',1,600000],['Stock initial',1,1500000],['Rayonnage et réfrigérateur',1,700000],['Patente / licence',1,100000],['Trésorerie de départ',1,300000]]},
 {id:'pisci',nom:'Pisciculture hors-sol — 4 bacs',sect:'Élevage',zones:['WA','CA','EA'],tags:['poisson','pisciculture','tilapia','silure'],mois:[3,4,5,10],delai:7,net:90000,rev:140000,
  note:'Tilapia ou silure en bacs ; qualité de l’eau et aliment de départ sont décisifs.',
  l:[['Bacs 10 m³',4,250000],['Alevins',4000,50],['Aliment (6 mois)',1,700000],['Pompe et aération',1,250000]]},
 {id:'numerique',nom:'Kiosque services numériques & transfert d’argent',sect:'Numérique',zones:['WA','CA','EA'],tags:['mobile money','numerique','impression','kiosque','telephone'],mois:[1,2,9],delai:2,net:150000,rev:200000,
  note:'Transferts, recharges, impression, saisie. Agrément de l’opérateur nécessaire.',
  l:[['Kiosque',1,400000],['Ordinateur, imprimante, onduleur',1,650000],['Float initial',1,500000],['Agrément / licences',1,100000]]},
 {id:'anacarde',nom:'Collecte et négoce d’anacarde (noix de cajou)',sect:'Commerce agricole',zones:['WA'],loc:['CI-N'],tags:['anacarde','cajou','noix'],mois:[11,12,1],delai:3,net:120000,rev:200000,
  note:'Achat aux producteurs pendant la campagne (février à juin) et revente aux exportateurs ; agrément et accès à un magasin sec nécessaires.',
  l:[['Magasin de stockage',1,1000000],['Balance et sacs',1,300000],['Stock de campagne (5 tonnes)',5000,350],['Transport',1,400000],['Agrément / licence',1,150000]]},
 {id:'karite',nom:'Beurre de karité (groupement de 10 femmes)',sect:'Transformation',zones:['WA'],loc:['CI-N'],tags:['karite','beurre','amande'],mois:[8,9,10],delai:3,net:130000,rev:260000,
  note:'Transformation des amandes de karité ; débouchés locaux et cosmétique. Formation et hygiène de production à prévoir.',
  l:[['Broyeur et presse',1,900000],['Marmites et foyers',1,250000],['Amandes de karité (2 tonnes)',2000,250],['Emballage et étiquettes',1,150000],['Formation',1,100000]]},
 {id:'embouche',nom:'Embouche ovine — 20 moutons',sect:'Élevage',zones:['WA'],loc:['CI-N'],tags:['mouton','embouche','ovin','elevage'],mois:[10,11,12,1],delai:5,net:90000,rev:160000,
  note:'Engraissement sur 4 à 6 mois, vente avant les grandes fêtes ; suivi vétérinaire indispensable.',
  l:[['Achat de 20 moutons',20,60000],['Bergerie',1,500000],['Aliment et compléments',1,300000],['Soins vétérinaires',1,100000]]},
 {id:'mangue',nom:'Séchage de mangues (séchoir solaire)',sect:'Transformation',zones:['WA'],loc:['CI-N'],tags:['mangue','sechage','fruit'],mois:[2,3,4],delai:3,net:110000,rev:200000,
  note:'Mangues du Nord (avril à juin) séchées pour la vente locale et l’export ; normes d’hygiène à respecter.',
  l:[['Séchoir solaire',1,700000],['Mangues (3 tonnes)',3000,80],['Emballage',1,120000],['Certification / agrément',1,150000]]},
 {id:'manioc',nom:'Unité de transformation de manioc (attiéké / gari)',sect:'Transformation',zones:['WA','CA'],tags:['manioc','attieke','gari','transformation','agroalimentaire'],mois:[2,3,4,9,10],delai:5,net:180000,rev:320000,
  note:'Valeur ajoutée locale ; débouchés auprès des restaurants et des marchés. Normes d’hygiène à respecter.',
  l:[['Râpeuse + presse',1,1200000],['Local et plan de travail',1,600000],['Emballage et étiquettes',1,150000],['Matière première (2 mois)',1,400000]]}
];
const cOf=p=>{const sub=p.l.reduce((s,x)=>s+x[1]*x[2],0),imp=Math.round(sub*.1/1000)*1000,fr=Math.round(Math.max(0,p.rev-p.net)*3/1000)*1000;return{sub,imp,fr,total:sub+imp+fr}};
const pmt=(P,rate,n)=>{const i=rate/12;return Math.round(P*i/(1-Math.pow(1+i,-n)))};
function capacity(){
  const a=list('finances').filter(i=>i.statut!=='❌ Annulé'),y=String(new Date().getFullYear()),b=a.filter(i=>(i.date||'').startsWith(y)),mths=Math.max(1,new Date().getMonth()+1);
  const surplus=Math.max(0,(sumK(b,'rev')-sumK(b,'dep')-sumK(b,'epa'))/mths);
  return{surplus,saved:num(DB.profile?.epargneSolde)+sumK(a,'epa')};
}
function recos(){
  const north=regOf(COUNTRY)==='CI-N',have=list('projets').map(p=>nrm(p.nom+' '+(p.note||'')+' '+(p.taches||'')).trim()).join(' | '),r=regOf(COUNTRY),cap=capacity(),m=new Date().getMonth()+1;
  return CAT.map(p=>{
    let s=50;const why=[];const C=cOf(p),inZone=p.zones.includes(r);
    if(inZone){s+=15;why.push(`adapté à ${REGN[r]}`)}else{s-=15;why.push(`catalogue pensé pour l’Afrique : à adapter à votre zone`)}
    if(north&&p.loc?.includes('CI-N')){s+=14;why.push('spécifique au Nord ivoirien')}
    if(p.mois.includes(m)){s+=10;why.push('bonne période pour démarrer')}
    if(p.tags.some(t=>have.includes(nrm(t)))){s-=25;why.push('vous avez déjà un projet proche : pensez extension plutôt que doublon')}
    const fund=cap.saved+cap.surplus*12;
    if(fund>=C.total){s+=15;why.push('finançable avec votre épargne et votre capacité annuelle')}else if(fund>=C.total*.4){s+=7;why.push('financement partiel possible (apport 40 % + prêt)')}else why.push('nécessite un financement externe important');
    if(C.total/Math.max(1,p.net)<=18){s+=8;why.push(`retour estimé en ${Math.ceil(C.total/p.net)} mois`)}
    return{p,C,score:Math.max(0,Math.min(100,Math.round(s))),why,fund};
  }).sort((a,b)=>b.score-a.score);
}
function devisRows(x){const {p,C}=x;return [['Poste','Quantité','Prix unitaire','Total'],...p.l.map(([n,q,u])=>[n,q,u,q*u]),['Imprévus (10 %)','','',C.imp],['Fonds de roulement (3 mois de charges)','','',C.fr],['BUDGET PRÉVISIONNEL','','',C.total]]}
function devisText(x){const {p,C}=x;return `LUMINA — Devis indicatif : ${p.nom}\n`+p.l.map(([n,q,u])=>`• ${n} : ${q} × ${mf(u)} = ${mf(q*u)}`).join('\n')+`\nImprévus 10 % : ${mf(C.imp)}\nFonds de roulement : ${mf(C.fr)}\nBUDGET : ${mf(C.total)}\nRésultat net estimé : ${mf(p.net)}/mois (retour ≈ ${Math.ceil(C.total/p.net)} mois)\n(Estimations indicatives, à confirmer par des devis locaux.)`}
function recoCard(x,open){
  const {p,C,score,why}=x,pret=Math.round(C.total*.6),men=pmt(pret,.1,24),cls=score>=70?'ok':'';
  return `<div class="al ${cls}" style="display:block"><div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><b>${esc(p.nom)}</b><span class="pill">${esc(p.sect)}</span><span class="pill brand">Pertinence ${score} %</span><span class="mute" style="margin-left:auto">Budget ${mf(C.total)} · net ≈ ${mf(p.net)}/mois</span></div>
   <div class="small" style="margin:4px 0">${esc(p.note)}</div><div class="small mute">Pourquoi : ${why.map(esc).join(' · ')}</div>
   <details ${open?'open':''} style="margin-top:6px"><summary class="small" style="cursor:pointer"><b>Devis détaillé et budget prévisionnel</b></summary>
    <div class="tw"><table class="mgrid"><thead><tr><th>Poste</th><th class="num">Qté</th><th class="num">Prix unitaire</th><th class="num">Total</th></tr></thead><tbody>
    ${p.l.map(([n,q,u])=>`<tr><td>${esc(n)}</td><td class="num">${nf(q)}</td><td class="num">${mf(u)}</td><td class="num">${mf(q*u)}</td></tr>`).join('')}
    <tr><td>Imprévus (10 %)</td><td></td><td></td><td class="num">${mf(C.imp)}</td></tr><tr><td>Fonds de roulement (3 mois de charges)</td><td></td><td></td><td class="num">${mf(C.fr)}</td></tr>
    <tr class="trow"><td>Budget prévisionnel</td><td></td><td></td><td class="num">${mf(C.total)}</td></tr></tbody></table></div>
    <p class="small" style="margin:8px 0">Recettes estimées ${mf(p.rev)}/mois · résultat net ≈ ${mf(p.net)}/mois · retour sur investissement ≈ ${Math.ceil(C.total/p.net)} mois · démarrage ≈ ${p.delai} mois.<br>
    Plan de financement suggéré : apport ${mf(C.total-pret)} (40 %) + prêt ${mf(pret)} sur 24 mois à 10 % ≈ ${mf(men)}/mois.</p></details>
   <p class="acts" style="margin:8px 0 0"><button data-ac="add" data-id="${p.id}">${ic('plus')} Créer ce projet dans LUMINA</button><button class="ghost" data-ac="xl" data-id="${p.id}">${ic('download')} Devis Excel</button><button class="ghost" data-ac="share" data-id="${p.id}">${ic('share')} Partager</button></p></div>`;
}
function actusPage(el){
  const a=AC(),z=zone(),r=regOf(COUNTRY),L=meteoAlerts(),S=seasonal(),R=recos(),cap=capacity();
  const projAl=list('projets').filter(p=>p.statut==='En cours').map(p=>({p,r:projRisk(p)})).filter(x=>x.r.lvl==='bad'||x.r.lvl==='warn');
  const al=(l,h,tip)=>`<div class="al ${l}"><span class="ai">${ic(l==='ok'?'check':'alert')}</span><div style="flex:1;min-width:0">${h}${tip?`<div class="small mute" style="margin-top:3px">${ic('sparkles')} ${esc(tip)}</div>`:''}</div></div>`;
  el.innerHTML=`<div class="head"><h1>${ic('news')} Actualités & opportunités</h1></div>
  <div class="card"><h2>${ic('pin')} Votre zone</h2>
   <p style="margin:0 0 8px"><b>${esc(z.label||regionName(COUNTRY))}</b>, ${esc(regionName(COUNTRY))} <span class="mute">· ${esc(REGN[r])} · position ${z.src==='gps'?'partagée par votre appareil':'approximative (capitale du pays)'}</span></p>
   <p class="acts" style="margin:0"><button data-ac="gps">${ic('pin')} Utiliser ma position</button><button class="ghost" data-ac="meteo">${a.meteoOk?'Météo locale activée — recharger':'Activer la météo locale'}</button>${a.meteoOk?'<button class="ghost" data-ac="nometeo">Désactiver</button>':''}</p>
   <p class="mute small" style="margin:8px 0 0">La météo locale interroge open-meteo.com avec les coordonnées de votre zone ; rien n’est envoyé sans votre accord. Les alertes saisonnières et les projets ci-dessous fonctionnent hors-ligne.</p></div>
  <div class="card"><h2>${ic('alert')} Alertes pour votre zone</h2>
   ${L.map(x=>al(x.l,x.h,x.tip)).join('')}${S.map(x=>al(x.l,esc(x.h),x.tip)).join('')}
   ${projAl.map(({p,r})=>al(r.lvl,`<b>${esc(p.nom)}</b> — ${esc(r.reasons[0]||'')}`,r.tips[0])).join('')}
   ${!L.length&&a.meteoOk&&a.cache?'<p class="mute small">Aucune alerte météo dans les 7 prochains jours.</p>':''}${!a.meteoOk?'<p class="mute small">Activez la météo locale pour recevoir les alertes de pluie, chaleur et vent des 7 prochains jours.</p>':''}
   <p class="mute small" style="margin:8px 0 0">Repères saisonniers indicatifs. Pour l’actualité économique et réglementaire en direct, utilisez l’analyse IA ci-dessous.</p></div>
  <div class="card"><h2>${ic('sparkles')} Projets recommandés pour vous</h2>
   <p class="mute small" style="margin:0 0 10px">Classés selon votre zone (${esc(REGN[r])}), la saison, vos projets déjà en cours et votre capacité de financement (épargne ≈ ${mf(cap.saved)}, excédent ≈ ${mf(cap.surplus)}/mois). Estimations indicatives en FCFA${CURR==='XOF'||CURR==='XAF'||CURR==='EUR'?'':' (non converties dans votre devise)'} : confirmez-les par des devis locaux.</p>
   ${R.slice(0,a.all?R.length:4).map((x,i)=>recoCard(x,i===0&&!a.all)).join('')}
   ${R.length>4?`<p class="acts" style="margin:10px 0 0"><button class="ghost" data-ac="all">${a.all?'Voir moins':'Voir les '+R.length+' projets'}</button></p>`:''}</div>
  <div class="card"><h2>${ic('bot')} Analyse IA : actualités et projets pour ma zone</h2>
   <p class="mute small" style="margin:0 0 8px">${CFG.apiKey?'Envoie votre pays, votre ville, la liste de vos projets et un résumé de votre capacité financière à l’API d’IA configurée, avec recherche web si disponible.':'Nécessite une clé API (à configurer par un administrateur dans Administration).'}</p>
   <p class="acts" style="margin:0"><button data-ac="ai">${ic('sparkles')} Lancer l’analyse</button></p><div id="aiact" class="small" style="white-space:pre-wrap;margin-top:10px">${esc(a.ai||'')}</div></div>`;
  loadMeteo(false);
}
PAGES.actus=actusPage;
{const i=NAV.findIndex(n=>n[0]==='projets');NAV.splice(i<0?NAV.length:i+1,0,['actus','news','Actualités & opportunités'])}
/* Aperçu dans la page Projets : première recommandation */
{const t0=MODULES.projets.top;MODULES.projets.top=function(){const x=recos()[0];return t0.apply(this,arguments)+(x?`<div class="card"><h2>${ic('news')} Idée de projet pour votre zone <a href="#" data-go="actus" class="small" style="margin-left:auto">Toutes les actualités et opportunités</a></h2>${recoCard(x,false)}</div>`:'')}}
async function aiWeb(system,user){
  const body={model:CFG.model||'claude-haiku-5-5',max_tokens:1500,system,messages:[{role:'user',content:user}]};
  const call=async b=>{const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'content-type':'application/json','x-api-key':CFG.apiKey,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},body:JSON.stringify(b)});return r.json()};
  let j=await call({...body,tools:[{type:'web_search_20250305',name:'web_search',max_uses:3}]});
  let live=true;if(j.error){live=false;j=await call(body)}
  const txt=(j.content||[]).filter(c=>c.type==='text').map(c=>c.text).join('\n').trim();
  return j.error?('Erreur : '+j.error.message):(txt||'Réponse vide')+(live?'':'\n\n(Sans recherche web : les informations peuvent ne pas être récentes.)');
}
document.addEventListener('click',async ev=>{
  const b=ev.target.closest('[data-ac]');if(!b||!ME)return;const x=b.dataset.ac,a=AC();
  if(x==='all'){a.all=!a.all;save();render();return}
  if(x==='nometeo'){a.meteoOk=false;delete a.cache;save();render();return}
  if(x==='meteo'){a.meteoOk=true;save();await loadMeteo(true);render();return}
  if(x==='gps'){
    if(!navigator.geolocation){toast('⚠ Position non disponible sur cet appareil');return}
    if(!confirm('Partager la position de cet appareil avec LUMINA ? Elle reste dans votre compte ; seules des coordonnées arrondies à 2 décimales servent à la météo locale (si vous l’activez).'))return;
    navigator.geolocation.getCurrentPosition(p=>{DB.profile={...DB.profile,zone:{lat:Math.round(p.coords.latitude*100)/100,lon:Math.round(p.coords.longitude*100)/100,label:DB.profile?.ville||'Ma position',src:'gps'}};delete a.cache;save();render();toast('✔ Position enregistrée')},e=>toast('⚠ Position refusée ou indisponible'),{timeout:10000,maximumAge:600000});return}
  const p=CAT.find(c=>c.id===b.dataset.id),X=p&&recos().find(r=>r.p.id===p.id);
  if(x==='add'&&X){
    const T=new Date(),E=new Date(T.getFullYear(),T.getMonth()+p.delai,T.getDate()),iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'),pret=Math.round(X.C.total*.6);
    list('projets').push({id:uid(),created:T.toISOString(),nom:p.nom,statut:'Idée',titulaire:DB.profile?.nom||ME.nom,gestionnaire:DB.profile?.nom||ME.nom,mensuel:pmt(pret,.1,24),paiement:'Mixte',personnes:'',debut:iso(T),echeance:iso(E),budget:X.C.total,depense:0,
      taches:['Valider les devis auprès de 2 fournisseurs locaux',...p.l.map(l=>'Acquérir : '+l[0]),'Vérifier les autorisations nécessaires','Lancer l’activité'].join('\n'),note:'Créé depuis Actualités & opportunités : estimations indicatives à confirmer.'});
    save();toast('✔ Projet créé (statut Idée)');go('projets');return}
  if(x==='xl'&&X){download(xlsx([{name:'Devis',rows:devisRows(X)}]),`lumina-devis-${p.id}.xlsx`);toast('✔ Devis téléchargé');return}
  if(x==='share'&&X){shareText(devisText(X));return}
  if(x==='ai'){
    if(!CFG.apiKey){toast('⚠ Clé API absente : demandez à l’administrateur de la configurer.');return}
    const out=$('#aiact');out.textContent='…';const z=zone(),cap=capacity();
    const ctx={zone:REGN[regOf(COUNTRY)],pays:regionName(COUNTRY),ville:DB.profile?.ville||z.label,devise:CURR,date:ltoday(),projets:list('projets').map(q=>({nom:q.nom,statut:q.statut,budget:q.budget})),epargne:Math.round(cap.saved),excedent_mensuel:Math.round(cap.surplus)};
    const r=await aiWeb('Tu es un conseiller en projets et finances personnelles. À partir du pays et de la ville, donne : 1) 3 actualités ou alertes récentes utiles (économie, réglementation, météo, prix) avec leur source si tu en as une, 2) 3 projets adaptés avec devis chiffré par poste et budget prévisionnel dans la devise de l’utilisateur. Sois concret, signale ce qui est une estimation et ne présente jamais une estimation comme un fait vérifié. Réponds dans la langue : '+LNAME[LANG]+'.',JSON.stringify(ctx));
    a.ai=r;save();out.textContent=r}
});
