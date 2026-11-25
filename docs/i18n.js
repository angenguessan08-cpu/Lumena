'use strict';
/* LUMINA — internationalisation : langue, pays et devise propres à chaque utilisateur.
   Les textes de l'application sont écrits en français ; ils sont traduits à l'affichage grâce au dictionnaire
   (i18n_dict.js). Un texte absent du dictionnaire reste en français. Pour ajouter une langue :
   1) l'ajouter dans LANGS, 2) ajouter une colonne à chaque ligne de i18n_dict.js. */
const LANGS=[['fr','Français'],['en','English'],['es','Español'],['pt','Português']];
const LNAME={fr:'français',en:'English',es:'español',pt:'português'};
/* [pays, devise par défaut, langue par défaut] */
const COUNTRIES=[['CI','XOF','fr'],['SN','XOF','fr'],['ML','XOF','fr'],['BF','XOF','fr'],['NE','XOF','fr'],['TG','XOF','fr'],['BJ','XOF','fr'],['GN','GNF','fr'],['CM','XAF','fr'],['GA','XAF','fr'],['CG','XAF','fr'],['TD','XAF','fr'],['CD','CDF','fr'],['MG','MGA','fr'],['MA','MAD','fr'],['DZ','DZD','fr'],['TN','TND','fr'],['FR','EUR','fr'],['BE','EUR','fr'],['CH','CHF','fr'],['CA','CAD','fr'],
  ['NG','NGN','en'],['GH','GHS','en'],['KE','KES','en'],['TZ','TZS','en'],['UG','UGX','en'],['RW','RWF','en'],['ZA','ZAR','en'],['MU','MUR','en'],['EG','EGP','en'],['US','USD','en'],['GB','GBP','en'],
  ['AO','AOA','pt'],['MZ','MZN','pt'],['CV','CVE','pt'],['PT','EUR','pt'],['BR','BRL','pt'],['ES','EUR','es'],['MX','MXN','es'],['CO','COP','es']];
const CURRENCIES=['XOF','XAF','EUR','USD','GBP','CAD','CHF','MAD','DZD','TND','EGP','NGN','GHS','KES','TZS','UGX','ZAR','RWF','MGA','MUR','GNF','CDF','AOA','MZN','CVE','BRL','MXN','COP'];
let LANG='fr',COUNTRY='CI',CURR='XOF',LOC='fr-CI';

/* ---------- Devise et nombres ---------- */
const mkLoc=()=>{for(const l of [`${LANG}-${COUNTRY}`,LANG]){try{new Intl.NumberFormat(l);return l}catch{}}return 'fr'};
const curLabel=(c=CURR)=>{if(c==='XOF'||c==='XAF')return 'FCFA';try{return new Intl.NumberFormat(LOC,{style:'currency',currency:c,currencyDisplay:'narrowSymbol'}).formatToParts(0).find(p=>p.type==='currency').value}catch{return c}};
function fmtMoney(n){
  n=Math.round(n||0)||0;   /* ||0 : évite l'affichage « -0 » */
  try{const parts=new Intl.NumberFormat(LOC,{style:'currency',currency:CURR,currencyDisplay:'narrowSymbol',minimumFractionDigits:0,maximumFractionDigits:0}).formatToParts(n);
    const ci=parts.findIndex(p=>p.type==='currency'),lab=curLabel(),first=parts.findIndex(p=>p.type!=='currency'&&p.type!=='literal'&&p.type!=='minusSign');
    return parts.map((p,i)=>p.type==='currency'?lab+(i<first&&/[A-Za-z]$/.test(lab)&&parts[i+1]?.type!=='literal'?' ':''):p.value).join('')}
  catch{return new Intl.NumberFormat('fr-FR').format(n)+' '+curLabel()}
}
const fmtDec=n=>new Intl.NumberFormat(LOC,{maximumFractionDigits:1}).format(n);

/* ---------- Traduction ---------- */
const norm=s=>String(s).replace(/[’‘]/g,"'").replace(/ /g,' ');
const DICT=new Map();(window.I18N_DICT||[]).forEach(r=>DICT.set(norm(r[0]).trim(),r.slice(1).map(v=>v.trim())));
const RULES=window.I18N_RULES||[];
function translate(s,lang=LANG){
  if(s==null)return s;
  const m=/^(\s*)([\s\S]*?)(\s*)$/.exec(String(s)),core=m[2];if(!core)return s;
  let out=core;
  if(lang!=='fr'){
    const i=LANGS.findIndex(l=>l[0]===lang)-1,k=norm(core);let d=DICT.get(k),low=false;if(!d&&/^[a-zà-ÿ]/.test(k)){d=DICT.get(k[0].toUpperCase()+k.slice(1));low=!!d}
    if(d&&d[i])out=low?d[i][0].toLowerCase()+d[i].slice(1):d[i];
    else for(const [re,tpl] of RULES){const r=re.exec(k);if(r&&tpl[i]){out=tpl[i].replace(/\$(\^?)(\d)/g,(_,u,n)=>{const v=trPart(r[n]??'',lang);return u?v.charAt(0).toUpperCase()+v.slice(1):v});break}}
  }
  return m[1]+out.replace(/\(FCFA\)/g,`(${curLabel()})`)+m[3];
}
const t=translate;
/* capture d'une règle : traduit en bloc, sinon élément par élément (listes séparées par des virgules) */
function trPart(s,lang){const w=translate(s,lang);return w===s&&s.includes(', ')?s.split(', ').map(x=>translate(x,lang)).join(', '):w}

const ORIG=new WeakMap(),SKIP=new Set(['SCRIPT','STYLE','TEXTAREA']),ATTRS=['placeholder','title','aria-label','alt'];
function trText(n){
  const p=n.parentNode;if(p&&SKIP.has(p.nodeName))return;
  let r=ORIG.get(n);if(!r||n.nodeValue!==r.t){r={o:n.nodeValue};ORIG.set(n,r)}
  if(p&&p.nodeName==='OPTION'&&!p.hasAttribute('value'))p.setAttribute('value',r.o.trim());/* garde la valeur logique (français) */
  const v=translate(r.o);r.t=v;if(v!==n.nodeValue)n.nodeValue=v;
}
function trEl(el){
  const o=el.__o||(el.__o={});
  for(const a of ATTRS)if(el.hasAttribute(a)){const cur=el.getAttribute(a);if(!(a in o)||cur!==o[a+'_t'])o[a]=cur;const v=translate(o[a]);o[a+'_t']=v;if(v!==cur)el.setAttribute(a,v)}
}
function trNode(root){
  if(!root)return;if(root.nodeType===3){trText(root);return}
  if(root.nodeType!==1)return;
  trEl(root);if(SKIP.has(root.nodeName)||root.hasAttribute('data-notr'))return;
  const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT|NodeFilter.SHOW_ELEMENT,{acceptNode:n=>{if(n.nodeType===1&&(SKIP.has(n.nodeName)||n.hasAttribute('data-notr'))){trEl(n);return NodeFilter.FILTER_REJECT}return NodeFilter.FILTER_ACCEPT}});
  let n;while(n=w.nextNode())n.nodeType===3?trText(n):trEl(n);
}
new MutationObserver(ms=>{for(const m of ms)m.addedNodes.forEach(trNode)}).observe(document.documentElement,{childList:true,subtree:true});
{const _c=window.confirm.bind(window),_p=window.prompt.bind(window);window.confirm=m=>_c(translate(m));window.prompt=(m,d)=>_p(translate(m),d)}

/* ---------- Préférences (langue / pays / devise) ---------- */
const regionName=c=>{try{return new Intl.DisplayNames([LANG],{type:'region'}).of(c)}catch{return c}};
const currencyName=c=>{try{return `${c} — ${new Intl.DisplayNames([LANG],{type:'currency'}).of(c)}`}catch{return c}};
function detectPrefs(){
  let saved=null;try{saved=JSON.parse(localStorage.getItem('lumina.prefs'))}catch{}
  if(saved?.lang)return saved;
  const nav=(navigator.language||'fr').split('-'),lang=LANGS.some(l=>l[0]===nav[0].toLowerCase())?nav[0].toLowerCase():'en';
  const co=COUNTRIES.find(c=>c[0]===(nav[1]||'').toUpperCase())||COUNTRIES.find(c=>c[2]===lang)||COUNTRIES[0];
  return {lang,country:co[0],currency:co[1]};
}
function applyPrefs(p,persist=true){
  LANG=LANGS.some(l=>l[0]===p?.lang)?p.lang:'fr';COUNTRY=p?.country||COUNTRY;CURR=p?.currency||CURR;LOC=mkLoc();
  document.documentElement.lang=LANG;
  if(persist)try{localStorage.setItem('lumina.prefs',JSON.stringify({lang:LANG,country:COUNTRY,currency:CURR}))}catch{}
  trNode(document.body);
}
/* Sélecteurs HTML réutilisables (écran de connexion et réglages) */
const optList=(arr,sel)=>arr.map(([v,l])=>`<option value="${v}" ${v===sel?'selected':''}>${l}</option>`).join('');
const langOpts=sel=>optList(LANGS,sel);
const countryOpts=sel=>optList(COUNTRIES.map(c=>[c[0],regionName(c[0])]).sort((a,b)=>a[1].localeCompare(b[1],LANG)),sel);
const currencyOpts=sel=>optList(CURRENCIES.map(c=>[c,currencyName(c)]),sel);
const countryDefaults=c=>{const x=COUNTRIES.find(k=>k[0]===c);return x?{currency:x[1],lang:x[2]}:{}};

applyPrefs(detectPrefs(),false);
