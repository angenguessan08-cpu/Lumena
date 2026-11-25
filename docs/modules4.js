'use strict';
/* LUMINA — v4 : graphiques (barres + courbes), tâches, planning jour/semaine/mois/année, import de notes,
   plan d'épargne et de bourse, récapitulatif par catégorie, prévisions 2027+. */
Object.assign(IC,{
 checksq:'<rect x="4" y="4" width="16" height="16" rx="3"/><path d="m8 12 3 3 5-6"/>',
 upload:'<path d="M12 16V4M7 9l5-5 5 5M5 20h14"/>',
 left:'<path d="m15 6-6 6 6 6"/>'
});

/* ---------- Valeurs par défaut corrigées : dates facultatives vides ---------- */
MODULES.coffre.defaults={...MODULES.coffre.defaults,expire:''};
MODULES.contacts.defaults={...MODULES.contacts.defaults,anniv:''};
MODULES.projets.defaults={...MODULES.projets.defaults,echeance:''};
MODULES.traitements.defaults={...MODULES.traitements.defaults,fin:''};
/* Notes : champ Date ; colonnes Date sur plusieurs rubriques */
MODULES.notes.fields.unshift({k:'date',l:'Date',t:'date'});
MODULES.notes.cols.unshift({k:'date',l:'Date'});
MODULES.micro.cols.splice(1,0,{k:'date',l:'Date'});
MODULES.investissements.cols.splice(1,0,{k:'date',l:'Date d’achat'});
MODULES.objectifs.cols.splice(1,0,{k:'depuis',l:'Depuis le'});

/* =====================================================================
   GRAPHIQUES : moteur barres + courbes lissées
   ===================================================================== */
const shortN=v=>{const a=Math.abs(v),s=v<0?'-':'';return a>=1e6?s+(a/1e6).toFixed(1).replace('.0','')+'M':a>=1e3?s+Math.round(a/1e3)+'k':s+Math.round(a)};
const niceStep=r=>{const p=Math.pow(10,Math.floor(Math.log10(r||1))),n=r/p;return (n<=1?1:n<=2?2:n<=2.5?2.5:n<=5?5:10)*p};
function smoothPath(pts){
  if(pts.length<2)return pts.length?`M${pts[0][0]} ${pts[0][1]}`:'';
  let d=`M${pts[0][0]} ${pts[0][1]}`;
  for(let i=0;i<pts.length-1;i++){const p0=pts[i-1]||pts[i],p1=pts[i],p2=pts[i+1],p3=pts[i+2]||p2;
    d+=` C${p1[0]+(p2[0]-p0[0])/6} ${p1[1]+(p2[1]-p0[1])/6} ${p2[0]-(p3[0]-p1[0])/6} ${p2[1]-(p3[1]-p1[1])/6} ${p2[0]} ${p2[1]}`}
  return d;
}
function combo({labels,bars=[],lines=[],h=190,area=false,zero=true,legend=true,fixMax=null}){
  const W=580,PL=46,PR=8,PT=10,PB=26,iw=W-PL-PR,ih=h-PT-PB,N=labels.length||1;
  const vals=[...(zero?[0]:[]),...(fixMax!=null?[fixMax]:[]),...bars.flatMap(s=>s.v),...lines.flatMap(s=>s.v)].filter(v=>isFinite(v));let mx=Math.max(...vals),mn=Math.min(...vals);if(mx===mn){mx=mn+(Math.abs(mn)||1000)}
  const step=Math.max(1,niceStep((mx-mn)/4)),top=Math.ceil(mx/step-1e-9)*step,bot=zero?(mn<0?Math.floor(mn/step)*step:0):Math.floor(mn/step)*step,rng=top-bot||1;
  const Y=v=>PT+ih-(v-bot)/rng*ih,gx=i=>PL+(i+.5)*iw/N,bw=iw/N,bv=bot>0?bot:(top<0?top:0);
  let g='';for(let t=bot;t<=top+step/1e3;t+=step)g+=`<line x1="${PL}" x2="${W-PR}" y1="${Y(t)}" y2="${Y(t)}" class="gl"/><text x="${PL-6}" y="${Y(t)+3}" text-anchor="end">${shortN(t)}</text>`;
  const nb=bars.length||1,w=Math.min(26,bw*.72/nb);
  const rects=bars.map((s,si)=>s.v.map((v,i)=>{const x=gx(i)-w*nb/2+si*w,y0=Y(bv),y1=Y(v);return `<rect x="${x}" y="${Math.min(y0,y1)}" width="${Math.max(1,w-1.5)}" height="${Math.max(1,Math.abs(y0-y1))}" rx="3" style="fill:${s.c}"><title>${esc(labels[i])} — ${esc(s.n)} ${fmt(v)}</title></rect>`}).join('')).join('');
  const ls=lines.map(s=>{const pts=s.v.map((v,i)=>[gx(i),Y(v)]),d=smoothPath(pts);
    const ar=area&&pts.length>1?`<path d="${d} L${pts[pts.length-1][0]} ${Y(bv)} L${pts[0][0]} ${Y(bv)}Z" style="fill:${s.c};opacity:.13"/>`:'';
    return ar+`<path d="${d}" fill="none" stroke-width="2.6" stroke-linecap="round" ${s.dash?'stroke-dasharray="6 5"':''} style="stroke:${s.c}"/>`+pts.map((p,i)=>`<circle cx="${p[0]}" cy="${p[1]}" r="3.2" style="fill:${s.c}"><title>${esc(labels[i])} — ${esc(s.n||'')} ${fmt(s.v[i])}</title></circle>`).join('')}).join('');
  const every=N>16?Math.ceil(N/12):1,xl=labels.map((l,i)=>i%every?'':`<text x="${gx(i)}" y="${h-8}" text-anchor="middle">${esc(l)}</text>`).join('');
  const leg=legend?`<div class="leg">${[...bars,...lines].filter(s=>s.n).map(s=>`<span><i style="background:${s.c}"></i>${esc(s.n)}</span>`).join('')}</div>`:'';
  return `<svg viewBox="0 0 ${W} ${h}" class="chart">${g}${rects}${ls}${xl}</svg>${leg}`;
}
monthBars=function(all,y){
  const labels=[],a=[],b=[],now=new Date(),mk=(key,l)=>{labels.push(l);const m=all.filter(i=>counted(i,BASES[0])&&(i.date||'').startsWith(key));a.push(sumK(m,'rev'));b.push(sumK(m,'dep'))};
  if(y==='all')dataYears().forEach(yy=>mk(yy,yy));else if(y&&/^\d{4}$/.test(y))for(let n=1;n<=12;n++)mk(y+'-'+String(n).padStart(2,'0'),MOIS[n-1]);else for(let n=5;n>=0;n--){const x=new Date(now.getFullYear(),now.getMonth()-n,1);mk(x.toISOString().slice(0,7),MOIS[x.getMonth()])}
  const mode=DS.chart||'mix',R={n:'Revenus',c:'var(--lime)'},D={n:'Dépenses',c:'var(--brand)'};
  if(mode==='bars')return combo({labels,bars:[{...R,v:a},{...D,v:b}]});
  if(mode==='lines')return combo({labels,lines:[{...R,v:a},{...D,v:b}],area:true});
  return combo({labels,bars:[{...R,v:a},{...D,v:b}],lines:[{n:'Solde',v:a.map((v,i)=>v-b[i]),c:'var(--ink)'}]});
};
donut=function(items){
  const T=items.reduce((a,i)=>a+i.v,0);if(!T)return '<p class="mute">Aucune donnée pour le moment.</p>';
  let a0=-Math.PI/2;const R=70,r=44,c=75;
  const paths=items.map((it,ix)=>{const f=Math.min(it.v/T,.9999),a1=a0+f*2*Math.PI,lg=f>.5?1:0,p=(rr,a)=>`${c+rr*Math.cos(a)} ${c+rr*Math.sin(a)}`;
    const d=`M${p(R,a0)} A${R} ${R} 0 ${lg} 1 ${p(R,a1)} L${p(r,a1)} A${r} ${r} 0 ${lg} 0 ${p(r,a0)}Z`;a0+=f*2*Math.PI;return `<path d="${d}" class="sl" style="fill:${PALETTE[ix%8]}"><title>${esc(it.l)} : ${fmt(it.v)}</title></path>`}).join('');
  return `<div class="donut"><svg viewBox="0 0 150 150">${paths}<text x="75" y="73" text-anchor="middle" class="dn1">${shortN(T)}</text><text x="75" y="88" text-anchor="middle" class="dn2">${esc(curLabel())}</text></svg><div class="leg" style="flex-direction:column">${items.slice(0,8).map((it,ix)=>`<span><i style="background:${PALETTE[ix%8]}"></i>${esc(it.l)} — ${fmt(it.v)} (${Math.round(it.v/T*100)}%)</span>`).join('')}</div></div>`;
};
line=function(pts){
  if(pts.length<2)return '<p class="mute">Ajoutez au moins 2 mesures pour voir la courbe.</p>';
  return combo({labels:pts.map(p=>p.l),lines:[{n:'',v:pts.map(p=>p.v),c:'var(--brand)'}],area:true,zero:false,h:170,legend:false});
};
const chartSeg=()=>[['mix','Barres + courbe'],['bars','Barres'],['lines','Courbes']].map(([k,l])=>`<button class="ghost ${(DS.chart||'mix')===k?'on':''}" data-chart="${k}">${l}</button>`).join('');
document.addEventListener('click',ev=>{const b=ev.target.closest('[data-chart]');if(!b||!ME)return;DS.chart=b.dataset.chart;const y=scrollY;render();scrollTo(0,y)});
const spark=(v,c='var(--brand)')=>{const mx=Math.max(1,...v),pts=v.map((x,i)=>[2+i*(96/Math.max(1,v.length-1)),26-x/mx*24]);return `<svg viewBox="0 0 100 28" class="spark"><path d="${smoothPath(pts)}" fill="none" stroke-width="2" style="stroke:${c}"/></svg>`};

/* =====================================================================
   TÂCHES À FAIRE
   ===================================================================== */
const dueFmt=i=>{if(!i.echeance)return '<span class="mute">—</span>';const T=ltoday(),late=i.echeance<T&&i.statut!=='Fait',td=i.echeance===T;return `<span class="${late?'bad':td?'warn':''}">${esc(i.echeance)}${i.heure?' '+esc(i.heure):''}</span>`};
MODULES.taches={label:'Tâches à faire',icon:'checksq',sort:'echeance',asc:1,defaults:{priorite:'Moyenne',statut:'À faire',cat:'Personnel',repete:'Aucune'},
 fields:[{k:'titre',l:'Tâche',full:1},{k:'echeance',l:'Échéance',t:'date'},{k:'heure',l:'Heure (facultatif)',t:'time'},{k:'priorite',l:'Priorité',t:'select',o:['Haute','Moyenne','Basse']},{k:'statut',l:'Statut',t:'select',o:['À faire','En cours','Fait']},
  {k:'cat',l:'Catégorie',t:'select',o:['Personnel','Travail','Finances','Santé','Projet','Famille']},{k:'repete',l:'Répétition',t:'select',o:['Aucune','Chaque jour','Chaque semaine','Chaque mois']},{k:'note',l:'Notes',t:'textarea',full:1}],
 cols:[{k:'titre',l:'Tâche',f:i=>`<span class="${i.statut==='Fait'?'tdone':''}">${esc(i.titre)}</span>`},{k:'echeance',l:'Échéance',f:dueFmt},{k:'priorite',l:'Priorité',f:i=>badge(i.priorite)},{k:'statut',l:'Statut',f:i=>badge(i.statut)},{k:'cat',l:'Catégorie',f:i=>badge(i.cat)}],
 rowAct:i=>i.statut!=='Fait'?`<button class="ghost" data-x4="done" data-id="${i.id}" title="${t('Marquer fait')}">✓</button>`:'',
 filters:[{k:'statut',l:'Statut'},{k:'priorite',l:'Priorité'},{k:'cat',l:'Catégorie'}],
 summary:a=>`<span>${t('À faire')} <b>${a.filter(i=>i.statut!=='Fait').length}</b></span><span>${t('Faites')} <b class="good">${a.filter(i=>i.statut==='Fait').length}</b></span>`,
 top:()=>adviceCard('taches')+tacheTop()};
const addMonths=(d,n)=>{const x=new Date(d+'T12:00:00'),day=x.getDate();x.setDate(1);x.setMonth(x.getMonth()+n);x.setDate(Math.min(day,new Date(x.getFullYear(),x.getMonth()+1,0).getDate()));return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0')};
function taskDone(id){
  const x=list('taches').find(z=>z.id===id);if(!x)return;x.statut='Fait';x.fait=ltoday();
  if(x.repete&&x.repete!=='Aucune'&&x.echeance){const n=x.repete==='Chaque jour'?addDays(x.echeance,1):x.repete==='Chaque semaine'?addDays(x.echeance,7):addMonths(x.echeance,1);
    const {id:_i,created,fait,...cp}=x;list('taches').push({...cp,id:uid(),created:new Date().toISOString(),echeance:n,statut:'À faire'})}
  save();render();toast('✔ Tâche terminée');
}
const taskStats=()=>{const T=ltoday(),o=list('taches').filter(i=>i.statut!=='Fait');return{open:o.length,late:o.filter(i=>i.echeance&&i.echeance<T),today:o.filter(i=>i.echeance===T),week:list('taches').filter(i=>i.statut==='Fait'&&i.fait&&i.fait>=addDays(T,-6)).length}};
function tacheTop(){
  const S=taskStats();
  return `<div class="grid"><div class="stat"><small>${t('À faire')}</small><b>${S.open}</b></div><div class="stat ${S.late.length?'s2':'s4'}"><small>${t('En retard')}</small><b class="${S.late.length?'bad':'good'}">${S.late.length}</b></div><div class="stat s3"><small>${t('Pour aujourd’hui')}</small><b>${S.today.length}</b></div><div class="stat s4"><small>${t('Faites cette semaine')}</small><b class="good">${S.week}</b></div></div>
  <form class="card filt" id="qt"><input name="t" placeholder="Nouvelle tâche (Entrée pour ajouter)" required><input type="date" name="d" value="${ltoday()}" style="max-width:170px"><select name="p" style="max-width:130px"><option>Moyenne</option><option>Haute</option><option>Basse</option></select><button>${ic('plus')} Ajouter</button></form>`;
}
ADV.taches=()=>{const S=taskStats(),A=[];
  if(S.late.length)A.push(L(S.late.length>=5||S.late.some(x=>x.priorite==='Haute')?'bad':'warn',tp('{n} tâche(s) en retard : traitez-les ou replanifiez-les.',{n:S.late.length})));
  if(S.today.length)A.push(L('info',tp('{n} tâche(s) à faire aujourd’hui.',{n:S.today.length})));
  if(!S.open)A.push(L('ok',tp('Aucune tâche en attente : profitez-en pour planifier la semaine.')));
  else if(S.open>12)A.push(L('warn',tp('{n} tâches ouvertes : choisissez les 3 plus importantes de la journée.',{n:S.open})));
  const nodate=list('taches').filter(i=>i.statut!=='Fait'&&!i.echeance).length;if(nodate)A.push(L('info',tp('{n} tâche(s) sans échéance : fixez une date pour ne pas les oublier.',{n:nodate})));return A};

/* =====================================================================
   PLANNING : jour / semaine / mois / année
   ===================================================================== */
const EVC=['Rendez-vous','Réunion','Travail','Personnel','Famille','Finances','Santé','Rappel'];
MODULES.planning={label:'Planning',icon:'calendar',sort:'date',asc:1,defaults:{cat:'Rendez-vous',repete:'Aucune',jusqua:''},
 fields:[{k:'titre',l:'Événement',full:1},{k:'date',l:'Date',t:'date'},{k:'heure',l:'Début',t:'time'},{k:'fin',l:'Fin',t:'time'},{k:'lieu',l:'Lieu'},{k:'cat',l:'Catégorie',t:'select',o:EVC},
  {k:'repete',l:'Répétition',t:'select',o:['Aucune','Chaque jour','Chaque semaine','Chaque mois','Chaque année']},{k:'jusqua',l:'Répéter jusqu’au (facultatif)',t:'date'},{k:'note',l:'Notes',t:'textarea',full:1}],
 cols:[{k:'date',l:'Date'},{k:'heure',l:'Début'},{k:'titre',l:'Événement'},{k:'cat',l:'Catégorie',f:i=>badge(i.cat)},{k:'repete',l:'Répétition'}],filters:[{k:'cat',l:'Catégorie'}],summary:a=>`<span>${t('Événements')} <b>${a.length}</b></span>`};
const PL={v:'week',d:ltoday()};
const mondayOf=d=>addDays(d,-((new Date(d+'T12:00:00').getDay()+6)%7));
const dfmt=(d,o)=>new Date(d+'T12:00:00').toLocaleDateString(LOC,o);
function occursOn(e,d){
  if(!e.date||e.date>d||(e.jusqua&&e.jusqua<d))return false;
  switch(e.repete){case 'Chaque jour':return true;case 'Chaque semaine':return dayDiff(e.date,d)%7===0;case 'Chaque mois':return e.date.slice(8)===d.slice(8);case 'Chaque année':return e.date.slice(5)===d.slice(5);default:return e.date===d}
}
function itemsOn(d){
  const I=[];
  list('planning').forEach(e=>{if(occursOn(e,d))I.push({k:'planning',id:e.id,time:e.heure||'',end:e.fin||'',title:e.titre,cat:e.cat,type:'ev',loc:e.lieu})});
  list('taches').filter(x=>x.statut!=='Fait'&&x.echeance===d).forEach(x=>I.push({k:'taches',id:x.id,time:x.heure||'',title:x.titre,type:'task',pr:x.priorite}));
  list('finances').filter(x=>x.statut==='⏳ En attente'&&x.date===d).forEach(x=>I.push({k:'finances',id:x.id,time:'',title:x.libelle||x.cat,amt:x.montant,type:'pay'}));
  list('contacts').filter(c=>c.anniv&&c.anniv.slice(5)===d.slice(5)).forEach(c=>I.push({k:'contacts',id:c.id,time:'',title:c.nom,type:'bday'}));
  list('projets').filter(p=>p.statut!=='Terminé'&&p.echeance===d).forEach(p=>I.push({k:'projets',id:p.id,time:'',title:p.nom,type:'proj'}));
  list('coffre').filter(c=>c.expire===d).forEach(c=>I.push({k:'coffre',id:c.id,time:'',title:c.titre,type:'doc'}));
  if(d===ltoday())dosesToday().forEach(x=>I.push({k:'traitements',id:x.m.id,time:x.h,title:`${x.m.nom} ${x.m.dosage||''}`,type:'med',done:x.state==='pris'}));
  return I.sort((a,b)=>(a.time||'99:99')<(b.time||'99:99')?-1:1);
}
const TI={ev:'calendar',task:'checksq',pay:'wallet',bday:'gift',proj:'rocket',doc:'shield',med:'pill'};
const itemHtml=(x,compact)=>`<div class="pi ${x.type}${x.done?' dn':''}" ${x.type==='med'?'data-go="traitements"':`data-e="${x.id}" data-k="${x.k}"`} title="${esc(x.title)}">${compact?'':ic(TI[x.type])}<span class="pt">${x.time?`<b>${esc(x.time)}${x.end?'–'+esc(x.end):''}</b> `:''}${esc(x.title)}${x.amt?` · ${fmt(x.amt)}`:''}${!compact&&x.loc?` <span class="mute">· ${esc(x.loc)}</span>`:''}</span></div>`;
function planningPage(el){
  const T=ltoday(),v=PL.v,d=PL.d;
  const tabs=[['day','Jour'],['week','Semaine'],['month','Mois'],['year','Année']].map(([k,l])=>`<button class="ghost ${v===k?'on':''}" data-pl="v:${k}">${l}</button>`).join('');
  const title=v==='day'?cap(dfmt(d,{weekday:'long',day:'numeric',month:'long',year:'numeric'})):v==='week'?`${dfmt(mondayOf(d),{day:'numeric',month:'short'})} – ${dfmt(addDays(mondayOf(d),6),{day:'numeric',month:'short',year:'numeric'})}`:v==='month'?cap(dfmt(d,{month:'long',year:'numeric'})):d.slice(0,4);
  let body='';
  if(v==='day'){
    const I=itemsOn(d),allday=I.filter(x=>!x.time),timed=I.filter(x=>x.time);
    body=`<div class="card"><h2>${ic('calendar')} ${esc(title)} <small class="mute">${tp('{n} élément(s)',{n:I.length})}</small></h2>
    <p class="acts" style="margin:0 0 12px"><button data-new="planning" data-pre="date=${d}">${ic('plus')} Événement</button><button class="ghost" data-new="taches" data-pre="echeance=${d}">${ic('plus')} Tâche</button></p>
    ${allday.length?`<h3 class="h3">${t('Toute la journée')}</h3>${allday.map(x=>itemHtml(x)).join('')}`:''}
    ${timed.length?`<h3 class="h3">${t('Programme')}</h3>${timed.map(x=>itemHtml(x)).join('')}`:''}
    ${I.length?'':`<span class="mute">${t('Rien de prévu ce jour.')}</span>`}</div>`;
  }else if(v==='week'){
    const m=mondayOf(d);
    body=`<div class="wk">${Array.from({length:7},(_,k)=>{const dd=addDays(m,k),I=itemsOn(dd);return `<div class="wcol ${dd===T?'today':''}"><div class="wh" data-pl="go:day|${dd}"><b>${cap(dfmt(dd,{weekday:'short'}))}</b> ${dfmt(dd,{day:'numeric'})}</div>${I.map(x=>itemHtml(x,true)).join('')||'<span class="mute small">—</span>'}<button class="ghost add" data-new="planning" data-pre="date=${dd}" title="${t('Ajouter')}">+</button></div>`}).join('')}</div>`;
  }else if(v==='month'){
    const first=d.slice(0,8)+'01',start=mondayOf(first),ym=d.slice(0,7),wd=Array.from({length:7},(_,k)=>cap(dfmt(addDays(start,k),{weekday:'short'}))).map(x=>`<div class="mh">${x}</div>`).join('');
    body=`<div class="card"><div class="mg">${wd}${Array.from({length:42},(_,k)=>{const dd=addDays(start,k),I=itemsOn(dd);return `<div class="mc ${dd.slice(0,7)!==ym?'out':''} ${dd===T?'today':''}" data-pl="go:day|${dd}"><span class="dn">${+dd.slice(8)}</span>${I.slice(0,3).map(x=>itemHtml(x,true)).join('')}${I.length>3?`<span class="mute small">+${I.length-3}</span>`:''}</div>`}).join('')}</div></div>`;
  }else{
    const y=d.slice(0,4);
    body=`<div class="yg">${Array.from({length:12},(_,mi)=>{const f=`${y}-${String(mi+1).padStart(2,'0')}-01`,st=mondayOf(f),dim=new Date(+y,mi+1,0).getDate();
      return `<div class="card ym"><h3 class="h3 link" data-pl="go:month|${f}">${cap(dfmt(f,{month:'long'}))}</h3><div class="ymg">${Array.from({length:42},(_,k)=>{const dd=addDays(st,k);if(dd.slice(0,7)!==f.slice(0,7))return '<i></i>';const n=itemsOn(dd).length;return `<b class="yd ${n?'has':''} ${n>2?'hv':''} ${dd===T?'today':''}" data-pl="go:day|${dd}" title="${n}">${+dd.slice(8)}</b>`}).join('')}</div></div>`}).join('')}</div>`;
  }
  el.innerHTML=`<div class="head"><h1>${ic('calendar')} Planning</h1><div class="acts"><div class="seg">${tabs}</div></div></div>
  <div class="card pln"><button class="ghost icon" data-pl="nav:-1" aria-label="${t('Précédent')}">${ic('left')}</button><button class="ghost" data-pl="today:1">${t('Aujourd’hui')}</button><button class="ghost icon" data-pl="nav:1" aria-label="${t('Suivant')}">${ic('chevron')}</button><h2 style="margin:0 0 0 8px">${esc(title)}</h2><input type="date" value="${d}" data-pl-date style="margin-left:auto;max-width:170px" aria-label="${t('Aller à la date')}"></div>${body}`;
}
PAGES.planning=planningPage;
document.addEventListener('click',ev=>{
  const b=ev.target.closest('[data-pl]');if(!b||!ME)return;const [a,val]=b.dataset.pl.split(':');
  if(a==='v')PL.v=val;else if(a==='today'){PL.d=ltoday()}
  else if(a==='go'){const [vv,dd]=val.split('|');PL.v=vv;PL.d=dd}
  else if(a==='nav'){const n=+val;PL.d=PL.v==='day'?addDays(PL.d,n):PL.v==='week'?addDays(PL.d,7*n):PL.v==='month'?addMonths(PL.d,n):addMonths(PL.d,12*n)}
  const y=scrollY;render();scrollTo(0,y);
});
document.addEventListener('change',ev=>{if(ev.target.dataset?.plDate!==undefined&&ev.target.value){PL.d=ev.target.value;render()}});

/* =====================================================================
   IMPORT DE NOTES : fichiers texte, Markdown, HTML, JSON, CSV, e-mails .eml
   ===================================================================== */
let IMP=[];
const stripHtml=h=>h.replace(/<(script|style)[\s\S]*?<\/\1>/gi,'').replace(/<br\s*\/?>|<\/(p|div|li|h\d|tr)>/gi,'\n').replace(/<[^>]+>/g,'').replace(/&nbsp;/g,' ').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#39;|&apos;/g,"'").replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/\n{3,}/g,'\n\n').trim();
const u8=s=>{try{return new TextDecoder('utf-8').decode(Uint8Array.from(s,c=>c.charCodeAt(0)))}catch{return s}};
const decQP=s=>u8(s.replace(/=\r?\n/g,'').replace(/=([0-9A-F]{2})/gi,(_,h)=>String.fromCharCode(parseInt(h,16))));
const decB64=s=>{try{return u8(atob(s.replace(/\s+/g,'')))}catch{return s}};
const decMime=s=>s.replace(/=\?([^?]+)\?([BQbq])\?([^?]*)\?=/g,(_,cs,e,t)=>e.toUpperCase()==='B'?decB64(t):decQP(t.replace(/_/g,' ')));
function parseEml(txt){
  const sp=txt.search(/\r?\n\r?\n/),head=sp<0?txt:txt.slice(0,sp),body=sp<0?'':txt.slice(sp).trim();
  const hv=(n,h=head)=>{const m=new RegExp('^'+n+':\\s*(.*(?:\\r?\\n[ \\t].*)*)','im').exec(h);return m?m[1].replace(/\r?\n[ \t]+/g,' ').trim():''};
  const dec=(h,b)=>{const te=hv('Content-Transfer-Encoding',h).toLowerCase(),ct=hv('Content-Type',h).toLowerCase();let t=te==='base64'?decB64(b):te==='quoted-printable'?decQP(b):b;return ct.includes('html')?stripHtml(t):t};
  const ct=hv('Content-Type'),bm=/boundary="?([^";\r\n]+)"?/i.exec(ct);let text='';
  if(bm){const parts=body.split('--'+bm[1]).slice(1,-1).map(p=>{const i=p.search(/\r?\n\r?\n/);return{h:p.slice(0,i<0?0:i),b:i<0?'':p.slice(i).trim()}});const pl=parts.find(p=>/text\/plain/i.test(p.h))||parts.find(p=>/text\/html/i.test(p.h));text=pl?dec(pl.h,pl.b):''}
  else text=dec(head,body);
  const dt=hv('Date'),d=dt?new Date(dt):null;
  return{title:decMime(hv('Subject')),text:text.trim(),date:d&&!isNaN(d)?d.toISOString().slice(0,10):''};
}
function parseCsv(txt){const rows=[];let r=[],c='',q=false;for(let i=0;i<txt.length;i++){const ch=txt[i];if(q){if(ch==='"'&&txt[i+1]==='"'){c+='"';i++}else if(ch==='"')q=false;else c+=ch}else if(ch==='"')q=true;else if(ch===','||ch===';'||ch==='\t'){r.push(c);c=''}else if(ch==='\n'){r.push(c);rows.push(r);r=[];c=''}else if(ch!=='\r')c+=ch}if(c||r.length){r.push(c);rows.push(r)}return rows}
function docsFrom(name,txt){
  const ext=(name.split('.').pop()||'').toLowerCase(),out=[],base=name.replace(/\.[^.]+$/,'');
  if(ext==='eml'){const e=parseEml(txt);out.push({title:e.title||base,text:e.text,date:e.date});return out}
  if(ext==='json'){let j;try{j=JSON.parse(txt)}catch{return [{title:base,text:txt}]}
    const arr=Array.isArray(j)?j:Array.isArray(j.notes)?j.notes:[j];
    arr.forEach(n=>{if(typeof n==='string'){out.push({title:'',text:n});return}
      const title=n.title||n.titre||n.subject||n.name||'',list2=Array.isArray(n.listContent)?n.listContent.map(x=>(x.isChecked?'[x] ':'[ ] ')+(x.text||'')).join('\n'):'';
      const text=[n.textContent||n.content||n.text||n.body||n.texte||n.note||'',list2].filter(Boolean).join('\n'),ts=n.userEditedTimestampUsec?new Date(n.userEditedTimestampUsec/1000):new Date(n.date||n.created||n.createdAt||n.modified||'');
      out.push({title,text,date:ts&&!isNaN(ts)?ts.toISOString().slice(0,10):''})});return out}
  if(ext==='csv'){const R=parseCsv(txt);if(R.length>1){const H=R[0].map(h=>nrm(h)),ti=H.findIndex(h=>/titre|title|sujet|subject|nom/.test(h)),ci=H.findIndex(h=>/contenu|content|texte|text|note|body|description/.test(h)),di=H.findIndex(h=>/date/.test(h));
      R.slice(1).forEach(r=>{if(r.some(x=>x))out.push({title:ti>=0?r[ti]:'',text:ci>=0?r[ci]:r.join(' — '),date:di>=0?String(r[di]).slice(0,10):''})});return out}}
  if(ext==='html'||ext==='htm')txt=stripHtml(txt);
  if(ext==='md'||ext==='markdown'){const parts=txt.split(/^(?=# )/m).filter(s=>s.trim());parts.forEach(p=>out.push({title:'',text:p}));return out.length?out:[{title:base,text:txt}]}
  txt.split(/^\s*(?:-{3,}|={3,}|_{3,})\s*$/m).map(s=>s.trim()).filter(Boolean).forEach((p,i,a)=>out.push({title:a.length===1?'':'',text:p,fallback:base}));
  return out;
}
function structureNote(raw,meta={}){
  const lines=String(raw||'').replace(/\r/g,'').split('\n');let title=(meta.title||'').trim(),rest=lines;
  if(!title){const i=lines.findIndex(l=>l.trim());title=i>=0?lines[i].replace(/^#+\s*/,'').replace(/^[-*•]\s*/,'').trim().slice(0,90):(meta.fallback||'Note');rest=i>=0?lines.slice(i+1):[]}
  const body=rest.join('\n').trim(),tasks=[],tre=/^\s*(?:[-*•]\s*)?(?:\[( |x|X)\]|(☐|□)|(☑|✔|✓|☒))\s*(.+)$/;
  body.split('\n').forEach(l=>{const m=tre.exec(l);if(m)tasks.push({titre:m[4].trim(),fait:!!(m[1]&&m[1].toLowerCase()==='x')||!!m[3]})});
  const low=nrm(title+' '+body);let cat='Note';
  if(/reunion|compte rendu|ordre du jour|meeting|participants/.test(low))cat='Réunion';
  else if(tasks.length>=2||(tasks.length&&/a faire|todo|to do|courses|liste/.test(low)))cat='À faire';
  else if(/\bidee|\bidea|projet|concept|business plan/.test(low))cat='Idée';
  let date=meta.date||'';const dm=/(\d{4})-(\d{2})-(\d{2})|\b(\d{1,2})[\/.](\d{1,2})[\/.](\d{4})\b/.exec(title+'\n'+body.slice(0,300));
  if(!date&&dm)date=dm[1]?`${dm[1]}-${dm[2]}-${dm[3]}`:`${dm[6]}-${dm[5].padStart(2,'0')}-${dm[4].padStart(2,'0')}`;
  return{titre:title||'Note',texte:body||title,cat,date:date||ltoday(),tasks};
}
function importCard(){
  return `<div class="card"><h2>${ic('upload')} Importer mes notes</h2><p class="mute small">${t('Formats lus : .txt, .md, .html, .json (Google Keep…), .csv et e-mails .eml. Exportez vos notes depuis votre téléphone ou votre messagerie, ou collez-les ci-dessous. Chaque note est classée automatiquement (Réunion, Idée, À faire, Note) et ses cases à cocher deviennent des tâches.')}</p>
  <div class="fg"><div class="full"><label>${t('Fichiers de notes')}</label><input type="file" id="impf" multiple accept=".txt,.md,.markdown,.html,.htm,.json,.csv,.eml"></div><div class="full"><label>${t('…ou collez vos notes ici (séparez-les par une ligne ---)')}</label><textarea id="impt"></textarea></div></div>
  <p class="acts" style="margin:10px 0 0"><button data-x4="impscan">${ic('sparkles')} Analyser et structurer</button></p><div id="impout"></div></div>`;
}
async function impScan(){
  const docs=[];for(const f of [...($('#impf').files||[])]){try{docsFrom(f.name,await f.text()).forEach(d=>docs.push({...d,src:f.name}))}catch{}}
  const pt=$('#impt').value.trim();if(pt)docsFrom('collage.txt',pt).forEach(d=>docs.push({...d,src:'collage'}));
  const have=new Set(list('notes').map(n=>nrm((n.titre||'')+(n.texte||'')).slice(0,200)));
  IMP=docs.filter(d=>(d.text||'').trim()||(d.title||'').trim()).map(d=>structureNote(d.text,d)).filter(n=>!have.has(nrm(n.titre+n.texte).slice(0,200)));
  const out=$('#impout');if(!IMP.length){out.innerHTML=`<p class="mute">${t('Aucune nouvelle note détectée.')}</p>`;return}
  out.innerHTML=`<div class="tw" style="margin-top:12px"><table><thead><tr><th></th><th>${t('Titre')}</th><th>${t('Catégorie')}</th><th>${t('Date')}</th><th class="num">${t('Tâches')}</th></tr></thead><tbody>${IMP.map((n,i)=>`<tr><td><input type="checkbox" data-imp="${i}" checked></td><td>${esc(n.titre)}<div class="mute small">${esc(n.texte.slice(0,80))}</div></td><td><select data-impcat="${i}">${['Idée','Note','Réunion','À faire'].map(c=>`<option value="${c}" ${n.cat===c?'selected':''}>${c}</option>`).join('')}</select></td><td>${esc(n.date)}</td><td class="num">${n.tasks.length}</td></tr>`).join('')}</tbody></table></div><p class="acts" style="margin:10px 0 0"><button data-x4="impgo">${ic('check')} ${t('Importer la sélection')}</button></p>`;
}
function impGo(){
  const sel=[...document.querySelectorAll('[data-imp]')].filter(c=>c.checked).map(c=>+c.dataset.imp);let nt=0;
  sel.forEach(i=>{const n=IMP[i];if(!n)return;list('notes').push({id:uid(),created:new Date().toISOString(),date:n.date,titre:n.titre,cat:n.cat,texte:n.texte});
    n.tasks.forEach(k=>{list('taches').push({id:uid(),created:new Date().toISOString(),titre:k.titre,echeance:'',priorite:'Moyenne',statut:k.fait?'Fait':'À faire',cat:'Personnel',repete:'Aucune',note:tp('Issue de la note « {n} »',{n:n.titre})});nt++})});
  save();IMP=[];render();toast(tp('✔ {a} note(s) et {b} tâche(s) importées',{a:sel.length,b:nt}));
}
{const old=MODULES.notes.top;MODULES.notes.top=(a,all)=>(old?old(a,all):'')+importCard()}

/* =====================================================================
   PLAN D'ÉPARGNE ET DE BOURSE — propositions selon les revenus + prévisions 2027+
   ===================================================================== */
const PELN='Épargne logement (PEL)';
const EP=()=>{DB.epargne=DB.epargne||{u:40,p:30,b:30,imprevu:3};return DB.epargne};
const isSav=c=>c.type==='Épargne'||c.type==='Investissement';
function loanEnd(){const d=list('finances').filter(i=>(i.cat==='Remboursements prêt'||i.cat===PELN)&&i.statut!=='❌ Annulé'&&i.date).map(i=>i.date.slice(0,7)).sort();return d.length?d[d.length-1]:''}
function buildForecast(y0,y1){
  DB.budgets=DB.budgets||{};const cats=list('categories'),le=loanEnd(),ep=EP();let prev=null;
  for(let y=y0;y<=y1;y++){
    const R=monthlyReal(String(y),BASES[0]),has=cats.some(c=>c.type==='Revenu'&&(R[c.nom+'|r']||[]).some(v=>v>0)),B={};
    cats.forEach(c=>{if(c.nom==='Dîmes')return;const k=c.nom+(c.type==='Revenu'?'|r':'|o');
      let arr=has?(R[k]||Array(12).fill(0)).map(v=>Math.round(v)):(prev&&prev[c.nom]?prev[c.nom].slice():Array(12).fill(num(c.budget)));
      if(c.nom==='Remboursements prêt'||c.nom===PELN)arr=arr.map((v,m)=>le&&`${y}-${String(m+1).padStart(2,'0')}`>le?0:v);
      B[c.nom]=arr});
    const rev=Array.from({length:12},(_,m)=>cats.filter(c=>c.type==='Revenu').reduce((s,c)=>s+num(B[c.nom]?.[m]),0));
    if(cats.some(c=>c.nom==='Imprévus'))B['Imprévus']=rev.map(v=>Math.round(v*ep.imprevu/100/500)*500);
    DB.budgets[y]=B;prev=B;
  }
}
function epargneModel(y){
  const M=annualModel(String(y)),ep=EP(),sum=f=>Array.from({length:12},(_,m)=>M.filter(f).reduce((s,x)=>s+num(x.p[m]),0));
  const rev=sum(x=>x.c.type==='Revenu'),obl=sum(x=>x.c.type!=='Revenu'&&!isSav(x.c)),pel=sum(x=>x.c.nom===PELN),imp=sum(x=>x.c.nom==='Imprévus');
  const cap=rev.map((v,m)=>Math.max(0,v-obl[m]-pel[m])),sh=(num(ep.u)+num(ep.p)+num(ep.b))||100,rnd=v=>Math.round(v/500)*500;
  return{rev,obl,pel,imp,cap,urg:cap.map(c=>rnd(c*ep.u/sh)),pro:cap.map(c=>rnd(c*ep.p/sh)),bou:cap.map(c=>rnd(c*ep.b/sh)),M};
}
function applyEpargne(y){const E=epargneModel(y),B=ensureBudget(String(y));B['Épargne']=E.urg.map((u,i)=>u+E.pro[i]);B['Investissement bourse']=E.bou.slice()}
function alignLines(y){
  const E=epargneModel(y),F=list('finances');let upd=0,add=0,del=0;
  const T=[['Épargne',/pr[ée]caution/i,E.urg,'Épargne de précaution'],['Épargne',/projet/i,E.pro,'Épargne de projet'],['Investissement bourse',null,E.bou,'Investissement bourse']];
  for(let m=0;m<12;m++){const ym=`${y}-${String(m+1).padStart(2,'0')}`;
    T.forEach(([cat,re,arr,lib])=>{const lines=F.filter(i=>i.statut==='⏳ En attente'&&i.cat===cat&&(i.date||'').startsWith(ym)&&(!re||re.test(i.libelle||''))),amt=arr[m];
      if(lines.length){lines[0].montant=amt;upd++;lines.slice(1).forEach(x=>{x.statut='❌ Annulé';x.note=(x.note?x.note+' · ':'')+'Remplacée par la proposition d’épargne';del++})}
      else if(amt>0&&F.some(i=>(i.date||'').startsWith(ym)&&i.type==='Revenu')){F.push({id:uid(),created:new Date().toISOString(),date:ym+'-01',type:'Épargne',cat,libelle:lib,montant:amt,statut:'⏳ En attente',note:'Proposition d’épargne'});add++}})}
  return{upd,add,del};
}
function epargnePage(el){
  const y=String(DB.epargne?.year||new Date().getFullYear()+1),E=EP(),X=epargneModel(y),S=a=>a.reduce((x,v)=>x+v,0),sav=S(X.urg)+S(X.pro)+S(X.bou),pel=S(X.pel),rev=S(X.rev);
  const decl=DB.profile?.epargneSolde,real=decl!=null&&decl!==''?num(decl):list('finances').filter(i=>i.type==='Épargne'&&(i.statut==='✅ Payé'||i.statut==='🔁 Automatique')&&(i.date||'')<=ltoday()).reduce((x,i)=>x+num(i.montant),0);
  const row=(l,a,cls='')=>`<tr class="${cls}"><td>${t(l)}</td>${a.map(v=>`<td class="num">${nf(v)}</td>`).join('')}<td class="num"><b>${nf(S(a))}</b></td></tr>`;
  const obj=list('objectifs').map(o=>{const s=goalStats(o),n=nrm(o.nom),mo=n.includes('precaution')?S(X.urg)/12:n.includes('projet')?S(X.pro)/12:S(X.bou)/12;return `<tr><td>${esc(o.nom)}</td><td class="num">${fmt(o.cible)}</td><td class="num">${fmt(s.real)}</td><td class="num">${fmt(s.reste)}</td><td class="num">${fmt(mo)}</td><td class="num">${mo>0?tp('{m} mois',{m:Math.ceil(s.reste/mo)}):'—'}</td></tr>`}).join('');
  const sel=(k,arr,v)=>`<select data-ep="${k}">${arr.map(a=>`<option ${String(a)===String(v)?'selected':''}>${a}</option>`).join('')}</select>`;
  el.innerHTML=`<div class="head"><h1>${ic('coins')} Épargne & Bourse — plan ${esc(y)}</h1></div>
  <div class="card"><h2>${ic('check')} Situation</h2><div class="al ${real?'ok':'warn'}"><span class="ai">${ic(real?'check':'alert')}</span><div>${real?tp('Épargne réalisée à ce jour : {a}.',{a:fmt(real)}):tp('Épargne réalisée à ce jour : 0. La reprise des versements est prévue en 2027.')}</div></div>
  <div class="fg"><div><label>Solde actuel du compte d’épargne (FCFA)</label><input type="number" min="0" data-ep="solde" value="${real}"></div><div><label>Année du plan</label>${sel('year',years().filter(v=>+v>=new Date().getFullYear()),y)}</div><div><label>Imprévus (% des revenus)</label><input type="number" min="0" step="any" data-ep="imprevu" value="${E.imprevu}"></div>
  <div><label>Fonds d’urgence / précaution (%)</label><input type="number" min="0" data-ep="u" value="${E.u}"></div><div><label>Épargne de projet (%)</label><input type="number" min="0" data-ep="p" value="${E.p}"></div><div><label>Bourse (%)</label><input type="number" min="0" data-ep="b" value="${E.b}"></div></div>
  <p class="mute small" style="margin:10px 0 0">${t('Capacité d’épargne = revenus − charges obligatoires − imprévus − épargne logement. Elle est répartie selon les pourcentages ci-dessus (arrondie à 500).')}</p></div>
  <div class="grid"><div class="stat s4"><small>${t('Revenus de l’année')}</small><b>${fmt(rev)}</b></div><div class="stat"><small>${t('Épargne + bourse proposées')}</small><b class="good">${fmt(sav)}</b><small>${tp('{m} / mois en moyenne',{m:fmt(sav/12)})}</small></div><div class="stat s3"><small>${t('Épargne logement (PEL, long terme)')}</small><b>${fmt(pel)}</b></div><div class="stat s2"><small>${t('Taux d’épargne total')}</small><b>${pct(rev?(sav+pel)/rev*100:0)}</b></div></div>
  <div class="card"><h2>${ic('chart')} Montants proposés par mois</h2>${combo({labels:MOIS,bars:[{n:'Précaution',v:X.urg,c:'var(--lime)'},{n:'Projet',v:X.pro,c:'var(--brand)'},{n:'Bourse',v:X.bou,c:'var(--warn)'}],lines:[{n:'Capacité d’épargne',v:X.cap,c:'var(--bad)',dash:true}]})}</div>
  <div class="card"><h2>${ic('list')} Détail ${esc(y)}</h2><div class="tw"><table class="mgrid"><thead><tr><th>Poste</th>${MOIS.map(m=>`<th class="num">${m}</th>`).join('')}<th class="num">Total</th></tr></thead><tbody>
  ${row('Revenus',X.rev)}${row('Charges obligatoires (hors imprévus)',X.obl.map((v,i)=>v-X.imp[i]))}${row('Imprévus',X.imp)}${row('Épargne logement (PEL)',X.pel)}${row('Capacité d’épargne',X.cap,'trow')}
  ${row('Fonds d’urgence / précaution',X.urg)}${row('Épargne de projet',X.pro)}${row('Bourse (investissement)',X.bou)}${row('Total épargné et investi',X.urg.map((v,i)=>v+X.pro[i]+X.bou[i]+X.pel[i]),'trow')}</tbody></table></div>
  <p class="acts" style="margin:12px 0 0"><button data-x4="epapply">${t('Appliquer au budget')} ${esc(y)}</button><button class="ghost" data-x4="epalign">${t('Aligner les lignes prévues (En attente)')}</button><button class="ghost" data-x4="epfore">${t('Régénérer la prévision jusqu’en 2041')}</button></p>
  <p class="mute small" style="margin:8px 0 0">${t('« Appliquer » ne modifie que les cibles d’épargne et de bourse de l’année. « Aligner » met à jour les versements prévus (En attente) sans toucher à ceux déjà payés. « Régénérer » recalcule tout le budget annuel de l’année choisie à 2041 à partir de vos lignes prévues.')}</p></div>
  ${obj?`<div class="card tw"><h2>${ic('target')} Objectifs d’épargne</h2><table><thead><tr><th>Objectif</th><th class="num">Cible</th><th class="num">Réalisé</th><th class="num">Reste</th><th class="num">Versement proposé / mois</th><th class="num">Délai</th></tr></thead><tbody>${obj}</tbody></table></div>`:''}`;
}
PAGES.epargne=epargnePage;
ADV.epargne=()=>[];

/* =====================================================================
   RÉCAPITULATIF PAR CATÉGORIE
   ===================================================================== */
function recapcatPage(el){
  const y=YY(),M=annualModel(y).filter(x=>x.p.some(v=>v)||x.r.some(v=>v)||x.c.budget),sel=M.find(x=>x.c.nom===DB.recapcat)||[...M].sort((a,b)=>b.r.reduce((s,v)=>s+v,0)-a.r.reduce((s,v)=>s+v,0))[0];
  const S=a=>a.reduce((x,v)=>x+num(v),0);
  const card=x=>{const P=S(x.p),Rt=S(x.r),isR=x.c.type==='Revenu',s=rstat(x.c,P,Rt);return `<div class="cat ${x===sel?'sel':''} ${s.over?'over':''}" data-rc="${esc(x.c.nom)}" role="button" tabindex="0"><div class="ct1"><b>${esc(x.c.nom)}</b><span class="pill ${s.over?'bad':'brand'}">${P?pct(s.p):'—'}</span></div>${spark(x.r,s.over?'var(--bad)':'var(--lime)')}<div class="trio"><div><small>${isR?'Attendu':'Budget'}</small><span>${nf(P)}</span></div><div><small>${isR?'Reçu':'Réalisé'}</small><span>${nf(Rt)}</span></div><div><small>${s.l}</small><span class="${s.cls}">${s.v}</span></div></div></div>`};
  let detail='';
  if(sel){const c=sel.c,P=S(sel.p),Rt=S(sel.r),s=rstat(c,P,Rt),nz=sel.r.filter(v=>v>0).length,mx=Math.max(...sel.r),mi=sel.r.indexOf(mx);
    const tx=list('finances').filter(i=>i.cat===c.nom&&counted(i,DS.base)&&(i.date||'').startsWith(y)),by={};tx.forEach(i=>{const k=i.libelle||'—';by[k]=by[k]||{n:0,s:0};by[k].n++;by[k].s+=num(i.montant)});
    const top=Object.entries(by).sort((a,b)=>b[1].s-a[1].s).slice(0,8);
    detail=`<div class="card"><h2>${ic('chart')} ${esc(c.nom)} — ${esc(y)} ${badge(c.groupe)}</h2><div class="tiles"><div class="tile a1"><small>${t('Budget annuel')}</small><b>${fmt(P)}</b></div><div class="tile a4"><small>${t('Réalisé')}</small><b>${fmt(Rt)}</b></div><div class="tile ${s.acc}"><small>${s.l}</small><b class="${s.cls}">${s.v}</b></div></div>
    ${combo({labels:MOIS,bars:[{n:'Réel',v:sel.r,c:c.type==='Revenu'?'var(--lime)':'var(--brand)'}],lines:[{n:'Budget',v:sel.p,c:'var(--warn)',dash:true}]})}
    <div class="sum"><span>${t('Moyenne mensuelle')} <b>${fmt(nz?Rt/nz:0)}</b></span><span>${t('Mois le plus élevé')} <b>${mx?esc(MOIS[mi])+' · '+fmt(mx):'—'}</b></span><span>${t('Opérations')} <b>${tx.length}</b></span></div></div>
    ${top.length?`<div class="card tw"><h2>${ic('list')} Principaux libellés</h2><table><thead><tr><th>Libellé</th><th class="num">Opérations</th><th class="num">Total</th><th class="num">Part</th></tr></thead><tbody>${top.map(([k,v])=>`<tr><td>${esc(k)}</td><td class="num">${v.n}</td><td class="num">${fmt(v.s)}</td><td class="num">${Rt?pct(v.s/Rt*100):'—'}</td></tr>`).join('')}</tbody></table></div>`:''}`}
  el.innerHTML=`<div class="head"><h1>${ic('chart')} Récap par catégorie</h1></div>${ctlHtml()}${detail}<div class="sech"><h2>${ic('grid')} Toutes les catégories</h2></div><div class="catgrid">${M.map(card).join('')}</div>`;
}
PAGES.recapcat=recapcatPage;
document.addEventListener('click',ev=>{const b=ev.target.closest('[data-rc]');if(!b||!ME)return;DB.recapcat=b.dataset.rc;save();const y=scrollY;render();scrollTo(0,y)});

/* =====================================================================
   ALERTES, TO-DO DU JOUR, ACTIONS, MIGRATION
   ===================================================================== */
{const base=extraAlerts;extraAlerts=function(){
  const A=[...base()],S=taskStats();
  if(S.late.length)A.push({w:S.late.length>=5?0:2,l:S.late.length>=5?'bad':'warn',i:'checksq',s:0,h:`<b>${t('Tâches à faire')}</b> — ${tp('{n} tâche(s) en retard : traitez-les ou replanifiez-les.',{n:S.late.length})} <a href="#" data-go="taches">${t('Voir')}</a>`});
  return A}}
{const base=extraTodo;extraTodo=function(){
  const T=[...base()],S=taskStats(),ev=itemsOn(ltoday()).filter(x=>x.type==='ev').length;
  T.push({i:'checksq',t:'Tâches du jour',s:S.today.length||S.late.length?tp('{a} pour aujourd’hui · {b} en retard',{a:S.today.length,b:S.late.length}):'Rien d’urgent',ok:!S.today.length&&!S.late.length,at:'data-go="taches"',b:S.today.length+S.late.length?'Voir':'À jour'});
  T.push({i:'calendar',t:'Agenda du jour',s:ev?tp('{n} événement(s) aujourd’hui',{n:ev}):'Aucun événement prévu',ok:true,at:'data-go="planning"',b:'Planning'});
  return T}}
document.addEventListener('click',async ev=>{
  const b=ev.target.closest('[data-x4]');if(!b||!ME)return;const x=b.dataset.x4,y=String(DB.epargne?.year||new Date().getFullYear()+1);
  if(x==='done')taskDone(b.dataset.id);
  else if(x==='impscan')impScan();
  else if(x==='impgo')impGo();
  else if(x==='epapply'){applyEpargne(y);save();render();toast('✔ Budget d’épargne appliqué')}
  else if(x==='epalign'){if(!confirm('Mettre à jour les versements d’épargne prévus (En attente) de cette année selon la proposition ?'))return;const r=alignLines(y);save();render();toast(tp('✔ {a} ligne(s) mises à jour, {b} créée(s)',{a:r.upd,b:r.add}))}
  else if(x==='epfore'){if(!confirm('Régénérer le budget annuel jusqu’en 2041 ? Vos ajustements manuels de ces années seront remplacés.'))return;buildForecast(+y,2041);for(let k=+y;k<=2041;k++)applyEpargne(k);save();render();toast('✔ Prévision régénérée')}
});
document.addEventListener('change',ev=>{const e=ev.target;if(!ME||!e.dataset)return;
  if(e.dataset.ep){const E=EP();if(e.dataset.ep==='solde')DB.profile={...DB.profile,epargneSolde:num(e.value)};else E[e.dataset.ep]=e.dataset.ep==='year'?e.value:num(e.value);save();const y=scrollY;render();scrollTo(0,y)}
  if(e.dataset.impcat!==undefined&&IMP[+e.dataset.impcat])IMP[+e.dataset.impcat].cat=e.value});
document.addEventListener('submit',ev=>{
  if(ev.target.id!=='qt'||!ME)return;ev.preventDefault();const f=new FormData(ev.target),ti=String(f.get('t')||'').trim();if(!ti)return;
  list('taches').push({id:uid(),created:new Date().toISOString(),titre:ti,echeance:f.get('d')||'',priorite:f.get('p')||'Moyenne',statut:'À faire',cat:'Personnel',repete:'Aucune'});save();render();toast('✔ Ajouté');
});
/* Migration des données personnelles du premier administrateur : épargne logement, arrêt SANLAM, imprévus, prévisions 2027+ */
function migrate4(){
  if(typeof users!=='function'||ME.id!==users()[0]?.id||DB.seed4||!list('categories').length)return;
  const C=list('categories'),F=list('finances'),now=new Date().toISOString();
  if(!C.some(c=>c.nom===PELN))C.push({id:uid(),created:now,nom:PELN,type:'Épargne',groupe:'Épargne',budget:25000,contenu:'Plan épargne logement CLIPRI — épargne bloquée à long terme, liée au prêt immobilier (elle me reviendra).'});
  F.forEach(i=>{if(/plan [ée]pargne logement/i.test(i.libelle||'')){i.cat=PELN;i.type='Épargne'}
    if(/assurance d[ée]c[èe]s parents/i.test(i.libelle||'')&&/sanlam/i.test(i.libelle||'')&&(i.date||'')>='2027-02-01'&&i.statut!=='✅ Payé'){i.statut='❌ Annulé';i.note=(i.note?i.note+' · ':'')+'Arrêt prévu fin janvier 2027'}});
  const rp=C.find(c=>c.nom==='Remboursements prêt');if(rp&&num(rp.budget)===140841)rp.budget=115841;
  const im=C.find(c=>c.nom==='Imprévus');if(im&&!num(im.budget)){im.budget=15000;im.contenu=(im.contenu||'Imprévus')+' — ligne d’imprévus (≈ 3 % des revenus)'}
  buildForecast(2027,2041);for(let y=2027;y<=2041;y++)applyEpargne(y);
  DB.epargne={...EP(),year:'2027'};DB.profile={...DB.profile,epargneSolde:0};DB.seed4=1;save();
}
/* Menu */
{const before=(id,...items)=>{const i=NAV.findIndex(n=>n[0]===id);NAV.splice(i<0?NAV.length:i,0,...items)},after=(id,...items)=>{const i=NAV.findIndex(n=>n[0]===id);NAV.splice(i<0?NAV.length:i+1,0,...items)};
 before('projets',['planning','calendar','Planning'],['taches','checksq','Tâches à faire']);
 after('budgetan',['recapcat','chart','Récap par catégorie']);after('plan15',['epargne','coins','Épargne & Bourse']);}
