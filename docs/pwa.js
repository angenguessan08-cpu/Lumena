'use strict';
/* LUMINA — PWA : installation, hors-ligne, menu mobile, tableaux adaptés aux petits écrans. */
const IS_IOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const IS_STANDALONE = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
let deferredInstall = null;
Object.assign(IC, {
  install: '<path d="M12 3v12M7 10l5 5 5-5M5 20h14"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>'
});

/* ---- Bouton « Installer l'application » ---- */
function installHelp() {
  const ov = document.createElement('div');
  ov.className = 'ov';
  ov.innerHTML = `<div class="card modal"><h2>${ic('install')} Installer LUMINA</h2>
   ${IS_IOS
     ? '<p><b>iPhone / iPad (Safari)</b> : touchez le bouton Partager, puis « Sur l’écran d’accueil », puis « Ajouter ».</p>'
     : '<p><b>Android (Chrome, Edge, Brave)</b> : menu ⋮ puis « Installer l’application » (ou « Ajouter à l’écran d’accueil »).</p><p><b>Ordinateur (Chrome, Edge, Brave)</b> : icône d’installation à droite de la barre d’adresse.</p><p><b>Safari (Mac)</b> : Fichier puis « Ajouter au Dock ».</p>'}
   <p class="mute small">L’application doit être ouverte depuis une adresse https:// (ou localhost) pour pouvoir être installée.</p><div class="mact"><button data-x>Fermer</button></div></div>`;
  document.body.appendChild(ov);
  ov.onclick = e => { if (e.target === ov || e.target.closest('[data-x]')) ov.remove(); };
}
async function installApp() {
  if (deferredInstall) {
    deferredInstall.prompt();
    const r = await deferredInstall.userChoice;
    deferredInstall = null;
    if (r.outcome === 'accepted') toast('✔ Installation lancée');
    syncInstallBtn();
  } else installHelp();
}
function syncInstallBtn() {
  const b = document.getElementById('install');
  if (b) b.style.display = IS_STANDALONE() ? 'none' : '';
}
{
  const top = document.getElementById('top'), bell = document.getElementById('bell');
  if (top && bell) {
    const m = document.createElement('button');
    m.id = 'menu'; m.className = 'ghost icon'; m.setAttribute('aria-label', 'Menu'); m.innerHTML = ic('menu');
    top.prepend(m);
    const b = document.createElement('button');
    b.id = 'install'; b.className = 'ghost'; b.innerHTML = ic('install') + ' <span class="lbl">Installer l’application</span>';
    bell.before(b); b.onclick = installApp;
    const bg = document.createElement('div');
    bg.id = 'navbg'; document.body.appendChild(bg);
    m.onclick = () => document.body.classList.toggle('navopen');
    bg.onclick = () => document.body.classList.remove('navopen');
    document.getElementById('nav').addEventListener('click', e => { if (e.target.closest('a[data-go]')) document.body.classList.remove('navopen'); });
    syncInstallBtn();
  }
}
addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstall = e; syncInstallBtn(); });
addEventListener('appinstalled', () => { deferredInstall = null; syncInstallBtn(); toast('✔ LUMINA est installée'); });

/* ---- Hors-ligne : bandeau et reprise automatique au retour de la connexion ---- */
{
  const bar = document.createElement('div');
  bar.id = 'offline';
  bar.textContent = 'Hors-ligne : vos données restent disponibles sur cet appareil.';
  document.body.appendChild(bar);
  const upd = () => bar.classList.toggle('on', !navigator.onLine);
  upd();
  addEventListener('offline', upd);
  addEventListener('online', () => {
    upd();
    if (typeof ME !== 'undefined' && ME) {
      toast('✔ Connexion rétablie : mise à jour…');
      try { navigator.serviceWorker && navigator.serviceWorker.ready.then(r => { r.update(); return r.sync && r.sync.register('lumina-sync'); }).catch(() => {}); } catch (e) {}
      setTimeout(() => { if (typeof refreshData === 'function') refreshData(); if (typeof loadMeteo === 'function') loadMeteo(true); }, 400);
    }
  });
  try {
    navigator.serviceWorker && navigator.serviceWorker.addEventListener('message', e => {
      if (e.data && e.data.type === 'sync' && ME && typeof refreshData === 'function') refreshData();
    });
  } catch (e) {}
}

/* ---- Réglages : carte « Application » ---- */
{
  const base = PAGES.reglages;
  PAGES.reglages = el => {
    base(el);
    const c = document.createElement('div');
    c.className = 'card';
    c.innerHTML = `<h2>${ic('install')} Application</h2><p class="mute">Installez LUMINA sur votre téléphone ou votre ordinateur pour l’ouvrir comme une application, même sans connexion.</p>
      <p class="acts" style="margin:0"><button id="inst2" ${IS_STANDALONE() ? 'disabled' : ''}>${ic('install')} ${IS_STANDALONE() ? 'Déjà installée' : 'Installer l’application'}</button></p>
      <p class="mute small" style="margin:8px 0 0">État : ${navigator.onLine ? 'en ligne' : 'hors-ligne'} · données enregistrées sur cet appareil (pensez à l’export Excel).</p>`;
    el.appendChild(c);
    c.querySelector('#inst2').onclick = installApp;
  };
}

/* ---- Tableaux : étiquettes pour l'affichage en cartes sur petit écran ---- */
function stackTables() {
  document.querySelectorAll('#main table:not(.mgrid)').forEach(t => {
    if (t.dataset.stk) return;
    t.dataset.stk = '1'; t.classList.add('stk');
    const hs = [...t.querySelectorAll('thead th')].map(h => h.textContent.trim());
    t.querySelectorAll('tbody tr').forEach(tr => [...tr.children].forEach((td, i) => { if (hs[i]) td.dataset.label = hs[i]; }));
  });
}
{
  const r0 = render;
  render = function () { r0.apply(this, arguments); stackTables(); document.body.classList.remove('navopen'); };
  new MutationObserver(() => { if (typeof ME !== 'undefined' && ME) stackTables(); }).observe(document.getElementById('main'), { childList: true, subtree: true });
}
