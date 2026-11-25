'use strict';
/* LUMINA — comptes utilisateurs.
   Chaque utilisateur possède un espace de données séparé (localStorage « lumina.data.<id> »), protégé par un nom
   d'utilisateur et un mot de passe (haché PBKDF2 + sel). Le premier compte créé est l'administrateur et récupère
   les données déjà présentes sur l'appareil.
   LIMITE : tout reste dans le navigateur de l'appareil. Ce n'est pas un verrou serveur : pour un accès multi-appareils
   réellement sécurisé, il faut une authentification côté serveur (Supabase, Firebase…). */
const U_KEY='lumina.users',S_KEY='lumina.session',L_KEY='lumina.lock',LEGACY_KEY='lifeos.v1';
const dataKey=id=>'lumina.data.'+id;
const users=()=>{try{return JSON.parse(localStorage.getItem(U_KEY))||[]}catch{return[]}};
const putUsers=u=>localStorage.setItem(U_KEY,JSON.stringify(u));
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
const rndSalt=()=>hex(crypto.getRandomValues(new Uint8Array(12)));
async function hashPw(pw,salt){
  try{const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(pw),'PBKDF2',false,['deriveBits']);
    return 'p1:'+hex(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:new TextEncoder().encode(salt),iterations:120000},k,256))}
  catch{let h=2166136261;for(const c of salt+pw+salt){h^=c.charCodeAt(0);h=Math.imul(h,16777619)>>>0}return 'f1:'+h.toString(16)}
}
const getSess=()=>{try{return sessionStorage.getItem(S_KEY)||localStorage.getItem(S_KEY)}catch{return null}};
const setSess=(id,remember)=>{try{sessionStorage.setItem(S_KEY,id);remember?localStorage.setItem(S_KEY,id):localStorage.removeItem(S_KEY)}catch{}};
const clearSess=()=>{try{sessionStorage.removeItem(S_KEY);localStorage.removeItem(S_KEY)}catch{}};

/* Anti-force brute : blocage progressif après 5 échecs */
const lockGet=()=>{try{return JSON.parse(localStorage.getItem(L_KEY))||{n:0,until:0}}catch{return{n:0,until:0}}};
const lockSet=o=>{try{localStorage.setItem(L_KEY,JSON.stringify(o))}catch{}};
const lockLeft=()=>Math.max(0,Math.ceil((lockGet().until-Date.now())/1000));
function lockFail(){const l=lockGet();l.n++;if(l.n>=5)l.until=Date.now()+Math.min(300,30*(l.n-4))*1000;lockSet(l)}

function starterCats(lang){
  const now=new Date().toISOString(),mk=(nom,type,groupe,contenu)=>({id:uid(),created:now,nom:translate(nom,lang),type,groupe,budget:0,contenu:translate(contenu,lang)});
  return [mk('Salaire','Revenu','Revenus','Revenu mensuel principal'),mk('Autres revenus','Revenu','Revenus','Primes, activités annexes'),
    mk('Logement','Dépense Fixe','Besoins','Loyer, électricité, eau'),mk('Alimentation','Dépense Variable','Besoins','Marché, provisions'),
    mk('Transport','Dépense Variable','Besoins','Carburant, taxi, bus'),mk('Santé','Dépense Variable','Besoins','Consultations, médicaments'),
    mk('Éducation','Dépense Variable','Besoins','Scolarité, fournitures, formations'),mk('Communication','Dépense Fixe','Besoins','Téléphone et internet'),
    mk('Loisirs','Dépense Occasionnelle','Envies','Sorties, abonnements, cadeaux'),mk('Personnel','Dépense Occasionnelle','Envies','Vêtements, soins'),
    mk('Épargne','Épargne','Épargne','Précaution et projets'),mk('Remboursements prêt','Dépense Fixe','Dettes & Remboursements','Crédits en cours')];
}

async function createUser(nom,pw,prefs){
  const us=users(),first=!us.length,id=uid(),salt=rndSalt();
  const u={id,nom,key:nom.toLowerCase(),salt,hash:await hashPw(pw,salt),role:first?'admin':'user',created:new Date().toISOString()};
  if(first){
    /* Premier compte : rattache les données existantes (ancienne version sans compte) à l'administrateur */
    const old=localStorage.getItem(LEGACY_KEY);
    if(old){let d={};try{d=JSON.parse(old)||{}}catch{}
      if(d.apiKey)CFG.apiKey=d.apiKey;if(d.model)CFG.model=d.model;if(d.support)CFG.support=d.support;saveCfg();
      ['apiKey','model','support','adminHash','mots'].forEach(k=>delete d[k]);
      d.profile={...d.profile,...prefs};localStorage.setItem(dataKey(id),JSON.stringify(d));localStorage.removeItem(LEGACY_KEY)}
    else localStorage.setItem(dataKey(id),JSON.stringify({seeded:1,profile:{...prefs},categories:[...starterCats(prefs?.lang),...baseCats(prefs)]}));
  }else localStorage.setItem(dataKey(id),JSON.stringify({seeded:1,profile:{...prefs},categories:[...starterCats(prefs?.lang),...baseCats(prefs)]}));
  us.push(u);putUsers(us);return u;
}

function openSession(u){
  ME=u;KEY=dataKey(u.id);DB=load();
  if(!DB.profile?.nom)DB.profile={...DB.profile,nom:u.nom};
  applyPrefs(DB.profile?.lang?DB.profile:{lang:'fr',country:'CI',currency:'XOF'});
  boot();if(typeof migrate2==='function')migrate2();if(typeof migrate4==='function')migrate4();document.body.classList.remove('locked');render();
}
function logout(){
  clearSess();ME=null;DB={};KEY=null;chat=[];Object.keys(UI).forEach(k=>delete UI[k]);
  document.querySelectorAll('.ov').forEach(o=>o.remove());$('#toast').innerHTML='';
  $('#main').innerHTML='';$('#nav').innerHTML='';
  view='dash';history.replaceState(null,'',location.pathname);document.body.classList.add('locked');showAuth('in');
}

function showAuth(mode,keep={}){
  const a=$('#auth'),first=!users().length,canUp=first||CFG.signup!=='off';
  mode=first?'up':(mode==='up'&&canUp?'up':'in');
  const up=mode==='up';
  if(first&&localStorage.getItem(LEGACY_KEY)&&!localStorage.getItem('lumina.prefs'))applyPrefs({lang:'fr',country:'CI',currency:'XOF'});
  a.innerHTML=`<div class="auth-wrap"><aside class="auth-side"><img src="logo.svg" alt=""><h1>LUMINA</h1><p class="lead">Ne plus naviguer à l’aveugle : la clarté sur vos comptes, mois par mois, poste par poste.</p>
   <ul><li>${ic('wallet')} Budget, épargne et objectifs</li><li>${ic('rocket')} Projets, contacts et notes</li><li>${ic('shield')} Un espace privé pour chaque utilisateur</li></ul></aside>
   <div class="auth-form"><div class="auth-mini"><img src="logo.svg" alt=""><b>LUMINA</b></div>
   <h2>${up?(first?'Créer le compte administrateur':'Créer un compte'):'Connexion'}</h2>
   <p class="mute">${up?(first?'Le premier compte est administrateur : les données déjà présentes sur cet appareil lui seront rattachées.':'Choisissez un nom d’utilisateur et un mot de passe personnels.'):'Accédez à votre espace personnel.'}</p>
   <form id="af"><div><label for="al">Langue</label><select id="al">${langOpts(LANG)}</select></div>${up?`<div class="fg"><div><label for="aco">Pays</label><select id="aco">${countryOpts(COUNTRY)}</select></div><div><label for="acu">Devise</label><select id="acu">${currencyOpts(CURR)}</select></div></div>`:''}${up?religionBlock({}):''}<div><label for="an">Nom d’utilisateur</label><input id="an" autocomplete="username" required minlength="2" maxlength="40" value="${esc(keep.nom||'')}" autofocus></div>
   <div><label for="ap">Mot de passe</label><div class="pw"><input id="ap" type="password" autocomplete="${up?'new-password':'current-password'}" required><button type="button" class="ghost eye" id="eye" aria-label="Afficher le mot de passe">${ic('eye')}</button></div></div>
   ${up?'<div><label for="ac">Confirmer le mot de passe</label><input id="ac" type="password" autocomplete="new-password" required></div>':'<label class="chk"><input type="checkbox" id="ar"> Rester connecté sur cet appareil</label>'}
   <p class="auth-err" id="aerr" role="alert"></p><button class="wide">${up?'Créer mon compte':'Se connecter'}</button></form>
   <p class="auth-sw">${first?'':up?'Déjà un compte ? <a href="#" data-m="in">Se connecter</a>':(canUp?'Pas encore de compte ? <a href="#" data-m="up">Créer un compte</a>':'La création de comptes est désactivée : contactez l’administrateur.')}</p>
   ${up?'':'<p class="mute small">Mot de passe oublié ? Demandez à l’administrateur de le réinitialiser.</p>'}</div></div>`;
  a.querySelectorAll('[data-m]').forEach(l=>l.onclick=e=>{e.preventDefault();showAuth(l.dataset.m)});
  const redo=p=>{const nom=$('#an').value;applyPrefs(p);showAuth(mode,{nom})};
  $('#al').onchange=()=>redo({lang:$('#al').value,country:$('#aco')?.value||COUNTRY,currency:$('#acu')?.value||CURR});
  if(up){$('#aco').onchange=()=>{const c=$('#aco').value,x=countryDefaults(c);redo({lang:x.lang||LANG,country:c,currency:x.currency||CURR})};$('#acu').onchange=()=>{CURR=$('#acu').value;applyPrefs({lang:LANG,country:COUNTRY,currency:CURR},false)}}
  $('#eye').onclick=()=>{const p=$('#ap');p.type=p.type==='password'?'text':'password'};
  $('#af').onsubmit=async ev=>{ev.preventDefault();const err=$('#aerr'),btn=ev.target.querySelector('button.wide');err.textContent='';btn.disabled=true;
    const nom=$('#an').value.trim(),pw=$('#ap').value;
    try{
      if(up){
        if(!first&&CFG.signup==='off')throw new Error('La création de comptes est désactivée.');
        if(nom.length<2)throw new Error('Le nom doit comporter au moins 2 caractères.');
        if(pw.length<6)throw new Error('Mot de passe : 6 caractères minimum.');
        if(pw!==$('#ac').value)throw new Error('Les deux mots de passe sont différents.');
        if(users().some(u=>u.key===nom.toLowerCase()))throw new Error('Ce nom d’utilisateur existe déjà.');
        const u=await createUser(nom,pw,{lang:$('#al').value,country:$('#aco').value,currency:$('#acu').value,...religionRead(n=>$('#af').elements[n]?.value)});setSess(u.id,false);openSession(u);
      }else{
        const w=lockLeft();if(w)throw new Error(`Trop de tentatives. Réessayez dans ${w} s.`);
        const u=users().find(x=>x.key===nom.toLowerCase());
        if(!u||await hashPw(pw,u.salt)!==u.hash){lockFail();throw new Error('Nom d’utilisateur ou mot de passe incorrect.')}
        lockSet({n:0,until:0});setSess(u.id,$('#ar').checked);openSession(u);
      }
    }catch(e){err.textContent=e.message}finally{btn.disabled=false}
  };
}

/* ---- Gestion du compte connecté ---- */
async function changeMyPassword(){
  const r=await passModal('Changer mon mot de passe',['Mot de passe actuel','Nouveau mot de passe (6 caractères min.)','Confirmer le nouveau mot de passe']);if(!r)return;
  const us=users(),u=us.find(x=>x.id===ME.id);
  if(await hashPw(r[0],u.salt)!==u.hash){toast('⛔ Mot de passe actuel incorrect');return}
  if(r[1].length<6||r[1]!==r[2]){toast('⚠ Nouveau mot de passe trop court ou différent de la confirmation');return}
  u.salt=rndSalt();u.hash=await hashPw(r[1],u.salt);putUsers(us);ME=u;toast('✔ Mot de passe modifié');
}
async function deleteMyAccount(){
  const us=users();
  if(ME.role==='admin'&&us.length>1&&us.filter(x=>x.role==='admin').length<2){toast('⚠ Promouvez d’abord un autre administrateur.');return}
  const r=await passModal('Supprimer mon compte',['Mot de passe (confirmation)']);if(!r)return;
  const u=us.find(x=>x.id===ME.id);if(await hashPw(r[0],u.salt)!==u.hash){toast('⛔ Mot de passe incorrect');return}
  if(!confirm('Supprimer définitivement ce compte et toutes ses données ? Pensez à exporter votre classeur Excel avant.'))return;
  localStorage.removeItem(dataKey(ME.id));localStorage.removeItem('lumina.hist.'+ME.id);putUsers(us.filter(x=>x.id!==ME.id));logout();
}

/* ---- Administration des utilisateurs ---- */
async function adminResetPw(id){
  const us=users(),u=us.find(x=>x.id===id);if(!u)return;
  const r=await passModal(`Nouveau mot de passe pour « ${esc(u.nom)} »`,['Nouveau mot de passe (6 caractères min.)','Confirmer']);if(!r)return;
  if(r[0].length<6||r[0]!==r[1]){toast('⚠ Mot de passe invalide ou différent');return}
  u.salt=rndSalt();u.hash=await hashPw(r[0],u.salt);putUsers(us);toast('✔ Mot de passe réinitialisé : communiquez-le à l’utilisateur');
}
function adminToggleRole(id){const us=users(),u=us.find(x=>x.id===id);if(!u||u.id===ME.id)return;u.role=u.role==='admin'?'user':'admin';putUsers(us);toast('✔ Rôle modifié');render()}
function adminDeleteUser(id){
  const us=users(),u=us.find(x=>x.id===id);if(!u||u.id===ME.id)return;
  if(!confirm(`Supprimer le compte « ${u.nom} » et toutes ses données ? Cette action est définitive.`))return;
  localStorage.removeItem(dataKey(id));localStorage.removeItem('lumina.hist.'+id);putUsers(us.filter(x=>x.id!==id));toast('🗑 Compte supprimé');render();
}

function startAuth(){
  const id=getSess(),u=id&&users().find(x=>x.id===id);
  if(u)openSession(u);else{if(id)clearSess();showAuth('in')}
}
startAuth();
