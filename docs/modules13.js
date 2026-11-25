'use strict';
/* =====================================================================
   LUMINA v13b
   1. Bilan des projets : tableau récapitulatif (En cours / Échecs / Projection N+1)
      + détection automatique des projets à partir des lignes « Projets » du fichier
   2. Objectifs d'épargne : détection automatique depuis les écritures « Épargne »
      + lecture du classeur Excel (onglet « Épargne » : objectifs et cibles)
   ===================================================================== */
const G13 = () => { DB.g13 = DB.g13 || { projets: [], objectifs: [] }; return DB.g13; };
const gkey = s => n7(s);

/* ---------- 1. PROJETS : détection depuis les écritures ---------- */
function projGroups() {
  const m = new Map();
  list('finances').filter(i => i.cat === 'Projets' && i.statut !== '❌ Annulé' && !isTiersLine(i) && i.libelle).forEach(i => {
    const k = n7(i.libelle), g = m.get(k) || { k, nom: String(i.libelle).trim(), real: 0, pend: [], last: '', first: '9999', lastReal: '' };
    if (isReal7(i)) { g.real += num(i.montant); if (i.date > g.lastReal) g.lastReal = i.date; } else if (i.statut === '⏳ En attente') g.pend.push(i);
    if (i.date > g.last) g.last = i.date; if (i.date < g.first) g.first = i.date;
    m.set(k, g);
  });
  return [...m.values()];
}
function guessStatus(g) {
  if (g.pend.length) return 'En cours';
  const lim = new Date(); lim.setMonth(lim.getMonth() - 6);
  return g.lastReal && g.lastReal >= lim.toISOString().slice(0, 10) ? 'En cours' : FAIL;
}
function ensureProjects() {
  if (!ME || !DB || !list('finances').length) return 0;
  const P = list('projets'), seen = G13().projets, linked = new Set(P.filter(p => p.lien).map(p => n7(p.lien)));
  let n = 0;
  projGroups().forEach(g => {
    if (linked.has(g.k) || seen.includes(g.k)) return;
    const mensuel = g.pend.length ? Math.round(sum7(g.pend) / g.pend.length) : 0;
    P.push({ id: uid(), created: new Date().toISOString(), nom: g.nom, statut: guessStatus(g), lien: g.nom, titulaire: 'Moi', paiement: 'Fonds propres',
      debut: g.first === '9999' ? '' : g.first, echeance: g.pend.length ? g.pend.map(i => i.date).sort().pop() : '', mensuel, budget: 0, depense: 0, taches: '',
      note: 'Créé automatiquement depuis vos écritures « Projets » : vérifiez le statut dans le Bilan des projets.' });
    seen.push(g.k); n++;
  });
  if (n) { _tc = null; save(); }
  return n;
}
const projTotals = (p, N1) => {
  const s = pStats(p, String(+N1 - 1)), L = s.L, td = today();
  const plan = L.filter(i => (i.date || '').startsWith(N1) && !(isReal7(i) && i.date <= td)).reduce((x, i) => x + num(i.montant), 0);
  let proj = plan, src = 'planifié';
  if (!proj && num(p.mensuel) && p.echeance && p.echeance >= N1 + '-01-01') {
    let c = 0; for (let m = 1; m <= 12; m++) if (N1 + '-' + String(m).padStart(2, '0') <= ymOf(p.echeance)) c++;
    proj = c * num(p.mensuel); src = 'mensualité';
  }
  if (!proj && (p.statut === 'En cours' || p.statut === 'En pause')) {
    const ago = new Date(); ago.setFullYear(ago.getFullYear() - 1);
    proj = L.filter(i => isReal7(i) && i.date >= ago.toISOString().slice(0, 10)).reduce((x, i) => x + num(i.montant), 0); src = 'proposé (12 derniers mois)';
  }
  return { s, proj, src };
};
function recapRows(N1) {
  return list('projets').filter(p => p.lien || num(p.depense) || p.statut === FAIL).map(p => ({ p, ...projTotals(p, N1) }));
}
/* classification fine des projets : 7 familles avec code couleur */
const PCLS = {
  ok:   { l: 'En cours — sur la bonne voie', c: '#16a34a', i: '🟢' },
  watch:{ l: 'En cours — à surveiller (retard / inactif)', c: '#f59e0b', i: '🟠' },
  wait: { l: 'En attente / en pause / idée', c: '#2563eb', i: '🔵' },
  fail: { l: 'Échec', c: '#dc2626', i: '🔴' },
  aban: { l: 'Abandonné', c: '#6b7280', i: '⚫' },
  done: { l: 'Terminé / acquis', c: '#0d9488', i: '✅' },
  third:{ l: 'Suivi pour un tiers', c: '#9333ea', i: '🟣' }
};
function projClass(p) {
  const st = p.statut || '';
  if (st === FAIL) return p.sortie === 'Abandonné' ? 'aban' : 'fail';
  if (st === 'Terminé') return 'done';
  if (st === SUIVI || /^tiers/i.test(p.titulaire || '')) return 'third';
  if (st === 'En attente' || st === 'En pause' || st === 'Idée') return 'wait';
  const td = today(), L = projLines(p), late = L.some(i => i.statut === '⏳ En attente' && i.date < td);
  const lim = new Date(); lim.setMonth(lim.getMonth() - 3); const l3 = lim.toISOString().slice(0, 10);
  const fut = L.some(i => i.statut === '⏳ En attente' && i.date >= td), recent = L.some(i => isReal7(i) && i.date >= l3);
  if (late) return 'watch';
  return fut || recent || !L.length ? 'ok' : 'watch';
}
const pbadge = k => `<span style="display:inline-block;padding:2px 9px;border-radius:99px;font-size:.78em;font-weight:700;color:#fff;background:${PCLS[k].c}">${PCLS[k].i} ${PCLS[k].l.split(' — ')[0]}${k === 'ok' ? ' ✔' : ''}</span>`;
function recapHTML(N, N1) {
  const R = recapRows(N1).map(r => ({ ...r, k: projClass(r.p) })), ST = ['En cours', 'En attente', 'En pause', 'Terminé', FAIL, SUIVI];
  const sel = r => `<select data-g13="st" data-id="${esc(r.p.id)}" style="width:auto">${ST.map(s => `<option value="${esc(s)}" ${s === r.p.statut ? 'selected' : ''}>${esc(s === FAIL ? 'Échec / Abandonné' : s)}</option>`).join('')}</select>${r.p.statut === FAIL ? `<select data-g13="so" data-id="${esc(r.p.id)}" style="width:auto;margin-left:4px">${['Échec', 'Abandonné'].map(s => `<option ${s === (r.p.sortie || 'Échec') ? 'selected' : ''}>${s}</option>`).join('')}</select>` : ''}`;
  const chips = Object.keys(PCLS).map(k => { const G = R.filter(r => r.k === k); return G.length ? `<span style="border-left:6px solid ${PCLS[k].c};padding:6px 10px;background:var(--card,#fff);border-radius:8px;box-shadow:0 1px 3px #0002"><b>${G.length}</b> ${PCLS[k].i} ${PCLS[k].l}<br><small class="mute">${nf(G.reduce((x, r) => x + r.s.cumAll, 0))} FCFA</small></span>` : ''; }).join('');
  const body = Object.keys(PCLS).map(k => {
    const G = R.filter(r => r.k === k); if (!G.length) return '';
    const dead = k === 'fail' || k === 'aban', T = fn => G.reduce((x, r) => x + fn(r), 0), c = PCLS[k].c;
    return `<tr style="background:${c}22"><td colspan="6" style="border-left:6px solid ${c}"><b>${PCLS[k].i} ${PCLS[k].l}</b> (${G.length})</td></tr>` +
      G.map(r => `<tr><td style="border-left:6px solid ${c}">${esc(r.p.nom)}<br>${pbadge(k)}</td><td>${sel(r)}</td><td class="num">${nf(r.s.cumAll)}</td><td class="num">${dead ? '—' : (r.s.reste ? nf(r.s.reste) : '—')}</td><td class="num">${dead ? '—' : (r.proj ? nf(r.proj) + `<br><small class="mute">${r.src}</small>` : '—')}</td><td>${esc(r.s.fin || '—')}</td></tr>`).join('') +
      `<tr class="trow"><td>Sous-total</td><td></td><td class="num">${nf(T(r => r.s.cumAll))}</td><td class="num">${dead ? '—' : nf(T(r => r.s.reste))}</td><td class="num">${dead ? '—' : nf(T(r => r.proj))}</td><td></td></tr>`;
  }).join('');
  const tot = R.filter(r => ['ok', 'watch', 'wait'].includes(r.k)).reduce((x, r) => x + r.proj, 0);
  return `<div class="card"><h2>${ic('list')} Tableau récapitulatif des projets</h2>
  ${R.length ? `<div style="display:flex;flex-wrap:wrap;gap:10px;margin:0 0 12px">${chips}</div><div class="tw"><table class="mgrid"><thead><tr><th>Projet</th><th>Statut (modifiable)</th><th class="num">Injecté à ce jour</th><th class="num">Reste à payer</th><th class="num">Projection ${N1}</th><th>Dernière échéance</th></tr></thead><tbody>${body}
  <tr class="trow"><td><b>Total projection ${N1} (projets actifs)</b></td><td></td><td></td><td></td><td class="num"><b>${nf(tot)}</b></td><td></td></tr></tbody></table></div>
  <p class="mute small" style="margin:8px 0 0">Classement automatique : 🟢 versements à venir ou payés ces 3 derniers mois · 🟠 échéance dépassée ou aucun versement récent · 🔵 en attente · 🔴 échec · ⚫ abandonné · ✅ terminé · 🟣 pour un tiers. Corrigez le statut dans la liste si besoin.</p>`
  : `<p class="mute">Aucune ligne « Projets » trouvée dans vos écritures. Importez votre fichier dans « Analyse du fichier ».</p>`}</div>`;
}
{
  const orig = PAGES.bilanproj;
  PAGES.bilanproj = function (el) {
    ensureProjects();
    orig(el);
    const N = BP.y || String(new Date().getFullYear()), N1 = String(+N + 1), h = el.querySelector('.tiles');
    if (h) { const after = h.nextElementSibling && h.nextElementSibling.tagName === 'P' ? h.nextElementSibling : h; after.insertAdjacentHTML('afterend', recapHTML(N, N1)); }
    const x = el.querySelector('#bpx');
    if (x) x.onclick = () => {
      const R = recapRows(N1), rows = R.map(r => [r.p.nom, PCLS[projClass(r.p)].l, r.s.cumAll, r.p.statut === FAIL ? 0 : r.s.reste, r.p.statut === FAIL ? 0 : r.proj, r.s.fin]);
      download(xlsx([{ name: 'Récap projets', rows: [['Projet', 'Statut', 'Injecté à ce jour', 'Reste à payer', 'Projection ' + N1, 'Dernière échéance'], ...rows] }]), `lumina-recap-projets-${N}.xlsx`);
      toast('✔ Fichier Excel téléchargé');
    };
  };
}

/* ---------- 2. OBJECTIFS D'ÉPARGNE : détection et lecture du classeur ---------- */
const GOAL_MOT = n => { const s = nrm(n); return /precaution|urgence/.test(s) ? 'précaution' : /projet/.test(s) ? 'projet' : /bourse|invest/.test(s) ? 'bourse' : String(n).trim().split(/\s+/).slice(-1)[0] || ''; };
function goalSince(mot) {
  const d = list('finances').filter(i => i.type === 'Épargne' && i.statut !== '❌ Annulé' && (i.libelle || '').toLowerCase().includes(mot.toLowerCase())).map(i => i.date).filter(Boolean).sort();
  return d[0] || '';
}
function addGoal(nom, cible, mot) {
  const k = gkey(nom); mot = mot || GOAL_MOT(nom);
  const ex = list('objectifs').find(o => gkey(o.nom) === k || (o.mot && o.mot === mot));
  if (ex) { if (cible && !num(ex.cible)) { ex.cible = cible; return 1; } return 0; }
  list('objectifs').push({ id: uid(), created: new Date().toISOString(), nom, cible: cible || 0, mot, cat: '', depuis: goalSince(mot), note: 'Créé automatiquement depuis votre fichier.' });
  G13().objectifs.push(k); return 1;
}
function ensureGoals(force) {
  if (!ME || !DB || !list('finances').length) return 0;
  if (!force && list('objectifs').length) return 0;
  const groups = new Map();
  list('finances').filter(i => i.type === 'Épargne' && i.statut !== '❌ Annulé' && /pr[eé]caution|projet|bourse/i.test(i.libelle || '')).forEach(i => {
    const mot = GOAL_MOT(i.libelle), nom = { 'précaution': 'Épargne de précaution (fonds d’urgence)', projet: 'Épargne de projet', bourse: 'Bourse Enfant' }[mot];
    groups.set(mot, nom);
  });
  let n = 0; groups.forEach((nom, mot) => { if (!G13().objectifs.includes(gkey(nom)) || force) n += addGoal(nom, 0, mot); });
  if (n) save();
  return n;
}
async function importGoalsFromXlsx(file) {
  if (typeof loadSheetJS === 'function') await loadSheetJS();
  return importGoalsFromWb(XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true }));
}
function importGoalsFromWb(wb) {
  const name = wb.SheetNames.find(s => /pargne/i.test(s) && !/budget/i.test(s));
  if (!name) { toast('Aucun onglet « Épargne » trouvé dans ce fichier.'); return; }
  const a = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: null, raw: true });
  const hi = a.findIndex(r => r.some(c => /^objectif/i.test(String(c || '').trim())) && r.some(c => /^cible/i.test(String(c || '').trim())));
  if (hi < 0) { toast('Tableau « Objectif / Cible » introuvable dans l’onglet « ' + name + ' ».'); return; }
  let n = 0;
  for (let i = hi + 1; i < a.length; i++) {
    const v = a[i].filter(c => c !== null && c !== ''), nom = String(v[0] || '').trim();
    if (!nom || /^total/i.test(nom)) break;
    n += addGoal(nom, Math.round(num(v[1])), '');
  }
  if (n) { save(); render(); toast(`✔ ${n} objectif(s) lu(s) dans « ${name} »`); } else toast('Objectifs déjà à jour.');
}
{
  const t0 = MODULES.objectifs.top;
  MODULES.objectifs.top = function () {
    if (ensureGoals()) setTimeout(render, 0);
    return t0() + `<div class="card"><h2>${ic('upload')} Remplir depuis mon fichier</h2>
    <p class="mute small" style="margin:0 0 8px">LUMINA parcourt vos écritures « Épargne » (précaution, projet, bourse) ou votre classeur Excel pour créer les objectifs et leurs cibles.</p>
    <div class="acts"><button class="ghost" data-g13="detect">${ic('refresh')} Détecter depuis mes écritures</button>
    <label class="ghost" style="cursor:pointer;display:inline-flex;gap:6px;align-items:center;padding:8px 12px;border:1px solid var(--line2);border-radius:10px">${ic('upload')} Lire mon fichier Excel<input type="file" accept=".xlsx,.xls,.xlsm,.ods" data-g13="file" style="display:none"></label></div></div>`;
  };
}
document.addEventListener('click', ev => {
  const b = ev.target.closest?.('[data-g13="detect"]'); if (!b) return;
  const n = ensureGoals(true); render(); toast(n ? `✔ ${n} objectif(s) créé(s)` : 'Aucune écriture d’épargne à regrouper.');
});
document.addEventListener('change', ev => {
  const e = ev.target; if (!e.matches?.('[data-g13]')) return;
  if (e.dataset.g13 === 'so') { const p = list('projets').find(x => String(x.id) === e.dataset.id); if (p) { p.sortie = e.value; save(); render(); } }
  else if (e.dataset.g13 === 'st') { const p = list('projets').find(x => String(x.id) === e.dataset.id); if (p) { p.statut = e.value; _tc = null; save(); render(); } }
  else if (e.dataset.g13 === 'file' && e.files[0]) importGoalsFromXlsx(e.files[0]).catch(err => toast('Lecture impossible : ' + err.message)).finally(() => { e.value = ''; });
});
{ const b0 = boot; boot = function () { b0.apply(this, arguments); ensureProjects(); ensureGoals(); }; }

/* statuts de projet : ajout de « En attente » et de la nature de la sortie */
{ const f = MODULES.projets.fields, st = f.find(x => x.k === 'statut');
  if (!st.o.includes('En attente')) st.o.splice(1, 0, 'En attente');
  if (!f.some(x => x.k === 'sortie')) f.splice(f.findIndex(x => x.k === 'statut') + 1, 0, { k: 'sortie', l: 'Si échec / abandon : nature', o: ['Échec', 'Abandonné'] }); }

/* =====================================================================
   3. ANALYSE INTELLIGENTE DU CLASSEUR : tous les onglets lus, pages créées
   ===================================================================== */
const SX = { info: null, name: '', wb: null };
const slug13 = s => 'sx_' + n7(s).replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
const MANAGED = /dashboard|budget|synth|reporting|cat[eé]gor|saisie/i;
function sheetGrid(ws) {
  let a = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false, dateNF: 'yyyy-mm-dd', blankrows: false });
  a = a.map(r => r.map(c => String(c == null ? '' : c).trim())).filter(r => r.some(Boolean));
  const w = Math.max(0, ...a.map(r => { let l = r.length; while (l && !r[l - 1]) l--; return l; })), keep = [];
  for (let c = 0; c < w; c++) if (a.some(r => r[c])) keep.push(c);
  return a.map(r => keep.slice(0, 30).map(c => r[c] || '')).slice(0, 800);
}
function kindOfSheet(name, g) {
  const flat = g.slice(0, 12).map(r => r.join('|').toLowerCase());
  if (flat.some(r => /\bdate\b/.test(r) && /montant/.test(r))) return 'ecritures';
  if (/pargne/i.test(name) && flat.some(r => /objectif/.test(r) && /cible/.test(r))) return 'objectifs';
  if (MANAGED.test(name)) return 'gere';
  return 'nouveau';
}
async function scanWorkbook(file) {
  if (typeof loadSheetJS === 'function') await loadSheetJS();
  const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
  SX.wb = wb; SX.name = file.name;
  SX.info = wb.SheetNames.map(n => { const g = sheetGrid(wb.Sheets[n]); return { n, g, k: kindOfSheet(n, g), cells: g.reduce((x, r) => x + r.filter(Boolean).length, 0) }; });
  let made = 0;
  SX.info.forEach(s => { if (s.k === 'nouveau' && s.cells) { saveSheetPage(s); made++; } if (s.k === 'objectifs') { try { importGoalsFromWb(wb); } catch (e) { } } });
  ensureProjects(); ensureGoals(); let nb = 0; const notBudget = /projet|project|tache|task|todo|planning|agenda|journal|\bnotes?\b|idee/i.test(file.name);   /* fichier de projets, tâches… : jamais lu comme budget */
  try { if (!notBudget) nb = importBudgetsFromWb(wb); } catch (e) { console.error(e); }
  save(); render();
  toast(`✔ ${nb} budget(s) cible lu(s) · ${wb.SheetNames.length} onglet(s) analysé(s) · ${made} page(s) créée(s)`);
}
function saveSheetPage(s) {
  const L = G13(); L.sheets = L.sheets || [];
  const key = slug13(s.n), ex = L.sheets.find(x => x.key === key), o = { key, name: s.n, file: SX.name, at: new Date().toISOString(), rows: s.g };
  if (ex) Object.assign(ex, o); else L.sheets.push(o);
}
function syncSheetNav() {
  if (!ME || !DB) return;
  for (let i = NAV.length - 1; i >= 0; i--) if (String(NAV[i][0]).startsWith('sx_')) NAV.splice(i, 1);
  let at = NAV.findIndex(n => n[0] === 'fichier13');
  if (at < 0) { at = NAV.findIndex(n => n[0] === 'importer'); if (at < 0) at = Math.max(0, NAV.findIndex(n => n[0] === 'reglages') - 1); NAV.splice(at + 1, 0, ['fichier13', 'file', 'Analyse du fichier']); at++; }
  (G13().sheets || []).forEach((s, i) => { NAV.splice(at + 1 + i, 0, [s.key, 'grid', '📄 ' + s.name]); PAGES[s.key] = el => sheetPage(el, s.key); });
}
function gridHTML(g) {
  if (!g.length) return '<p class="mute">Feuille vide.</p>';
  const isN = c => /^-?[\d\s.,%]+$/.test(c) && /\d/.test(c);
  const hd = g[0].filter(Boolean).length >= 2 ? g[0] : null;
  return `<div class="tw" style="max-height:70vh;overflow:auto"><table class="mgrid">${hd ? `<thead><tr>${hd.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead>` : ''}<tbody>${g.slice(hd ? 1 : 0).map(r => `<tr>${r.map(c => `<td class="${isN(c) ? 'num' : ''}">${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function sheetPage(el, key) {
  const s = (G13().sheets || []).find(x => x.key === key);
  if (!s) { el.innerHTML = '<div class="card">Page introuvable.</div>'; return; }
  el.innerHTML = `<div class="head"><h1>${ic('grid')} ${esc(s.name)}</h1><div class="acts"><button class="ghost" id="sxx">${ic('download')} Excel</button><button class="ghost" data-g13="rm" data-key="${esc(key)}">${ic('trash')} Retirer cette page</button></div></div>
  <p class="mute small">Créée automatiquement depuis « ${esc(s.file)} » · ${s.rows.length} ligne(s) · ${new Date(s.at).toLocaleDateString('fr-FR')}</p><div class="card">${gridHTML(s.rows)}</div>`;
  el.querySelector('#sxx').onclick = () => download(xlsx([{ name: s.name.slice(0, 30), rows: s.rows }]), `lumina-${key}.xlsx`);
}
const KLAB = { ecritures: ['Écritures (transactions)', '#2563eb', 'Gérées par « Données & Import » et le module Finances'], objectifs: ['Objectifs d’épargne', '#16a34a', 'Lus pour créer vos objectifs et leurs cibles'], gere: ['Déjà géré par LUMINA', '#6b7280', 'Calculé par l’application (budget, tableau de bord…)'], nouveau: ['Feuille non prévue', '#f59e0b', 'Page créée automatiquement'] };
PAGES.fichier13 = function (el) {
  const pages = G13().sheets || [];
  el.innerHTML = `<div class="head"><h1>${ic('file')} Analyse du fichier</h1></div>
  <div class="card"><h2>${ic('upload')} Lire un classeur Excel en entier</h2><p class="mute small" style="margin:0 0 8px">LUMINA parcourt chaque onglet, reconnaît les écritures, les objectifs d’épargne et les projets, et crée une page pour chaque feuille non prévue. Rien n’est envoyé sur Internet.</p>
  <input type="file" accept=".xlsx,.xls,.xlsm,.ods" data-g13="scan"></div>
  ${SX.info ? `<div class="card"><h2>${ic('list')} Onglets de « ${esc(SX.name)} »</h2><div class="tw"><table class="mgrid"><thead><tr><th>Onglet</th><th>Type détecté</th><th class="num">Cellules renseignées</th><th>Action</th></tr></thead><tbody>${SX.info.map((s, i) => { const K = KLAB[s.k], has = pages.some(p => p.key === slug13(s.n)); return `<tr><td style="border-left:6px solid ${K[1]}">${esc(s.n)}</td><td><span style="color:#fff;background:${K[1]};padding:2px 9px;border-radius:99px;font-size:.78em">${K[0]}</span><br><small class="mute">${K[2]}</small></td><td class="num">${nf(s.cells)}</td><td>${has ? `<button class="ghost" data-go="${slug13(s.n)}">Ouvrir la page</button>` : s.cells ? `<button class="ghost" data-g13="mk" data-i="${i}">Créer une page</button>` : '<span class="mute">vide</span>'}</td></tr>`; }).join('')}</tbody></table></div></div>` : ''}
  <div class="card"><h2>${ic('grid')} Pages créées depuis vos fichiers (${pages.length})</h2>${pages.length ? `<div style="display:flex;flex-wrap:wrap;gap:8px">${pages.map(p => `<span style="display:inline-flex;gap:2px"><button class="ghost" data-go="${esc(p.key)}">📄 ${esc(p.name)} <small class="mute">(${p.rows.length} l.)</small></button><button class="ghost danger" data-g13="rm" data-key="${esc(p.key)}" title="Retirer cette page" aria-label="Retirer ${esc(p.name)}">${ic('trash')}</button></span>`).join('')}</div><p style="margin:10px 0 0"><button class="ghost danger" data-g13="rmall">${ic('trash')} Retirer toutes ces pages</button></p>` :'<p class="mute">Aucune page pour l’instant.</p>'}</div>`;
};
document.addEventListener('change', ev => { const e = ev.target; if (e.matches?.('[data-g13="scan"]') && e.files[0]) scanWorkbook(e.files[0]).catch(err => toast('Lecture impossible : ' + err.message)).finally(() => { e.value = ''; }); });
document.addEventListener('click', ev => {
  const b = ev.target.closest?.('[data-g13="mk"],[data-g13="rm"],[data-g13="rmall"]'); if (!b) return;
  if (b.dataset.g13 === 'rmall') { if (!confirm('Retirer toutes les pages créées depuis vos fichiers ? Vos autres données ne sont pas touchées.')) return; G13().sheets = []; save(); view = 'fichier13'; render(); }
  else if (b.dataset.g13 === 'mk') { saveSheetPage(SX.info[+b.dataset.i]); save(); render(); }
  else { G13().sheets = (G13().sheets || []).filter(s => s.key !== b.dataset.key); save(); view = 'fichier13'; render(); }
});
{ const r0 = render; render = function () { try { syncSheetNav(); } catch (e) { console.error(e); } return r0.apply(this, arguments); }; }

/* =====================================================================
   4. VISUELS DES CARTES PROJETS : illustration choisie selon le libellé
   ===================================================================== */
const PIMG = [
  [/village/, '🏘️', '#8d5524', '#4d8f3a'],
  [/terrain|parcelle|lotissement|foncier/, '🏞️', '#7c5a2b', '#4d8f3a'],
  [/champ|mais|maïs|manioc|plantation|culture|agricul|cacao|hevea|anacarde|ferme/, '🌽', '#a3a32d', '#2e7d32'],
  [/boeuf|bœuf|elevage|élevage|poulet|porc|betail|bétail|mouton/, '🐂', '#8d6e63', '#558b2f'],
  [/magasin|boutique|commerce|vente|marche|marché|shop/, '🏪', '#1565c0', '#00acc1'],
  [/cosmetique|cosmétique|beaute|beauté|pommade/, '💄', '#ad1457', '#ec407a'],
  [/mobile money|money|transfert|wave|orange/, '📱', '#ef6c00', '#fbc02d'],
  [/formation|cours|ecole|école|etude|étude|diplome|diplôme/, '🎓', '#283593', '#5c6bc0'],
  [/creche|crèche|garderie|enfant|bebe|bébé/, '🧸', '#f06292', '#ffb74d'],
  [/maison|immeuble|villa|appartement|logement|construction|batiment|bâtiment/, '🏠', '#455a64', '#26a69a'],
  [/voiture|auto|vehicule|véhicule|moto|taxi|transport/, '🚗', '#37474f', '#607d8b'],
  [/restaurant|maquis|alimentation|cuisine|boulangerie/, '🍽️', '#bf360c', '#ff8a65'],
  [/bourse|action|invest|brvm/, '📈', '#1b5e20', '#43a047'],
  [/voyage|tourisme|hotel|hôtel/, '✈️', '#0277bd', '#4fc3f7'],
  [/sante|santé|clinique|pharmacie/, '⚕️', '#00695c', '#4db6ac'],
  [/entretien|reparation|réparation|travaux/, '🛠️', '#546e7a', '#90a4ae']
];
const PKEY = [[/village/, 'village'], [/terrain|parcelle|lotissement|foncier/, 'terrain'], [/champ|mais|maïs|manioc|plantation|culture|agricul|cacao|hevea|anacarde|ferme/, 'champ'], [/boeuf|bœuf|elevage|élevage|poulet|porc|betail|bétail|mouton/, 'elevage'], [/magasin|boutique|commerce|vente|marche|marché|shop/, 'magasin'], [/cosmetique|cosmétique|beaute|beauté|pommade/, 'cosmetique'], [/mobile money|money|transfert|wave|orange/, 'mobile'], [/formation|cours|seminaire|séminaire|atelier|certification|diplome|diplôme|ecole|école|etude|étude/, 'formation'], [/creche|crèche|garderie|enfant|bebe|bébé/, 'creche'], [/maison|immeuble|villa|appartement|logement|construction|batiment|bâtiment/, 'maison'], [/voiture|auto|vehicule|véhicule|moto|taxi|transport/, 'voiture'], [/restaurant|maquis|alimentation|cuisine|boulangerie/, 'restaurant'], [/bourse|action|invest|brvm/, 'bourse'], [/voyage|tourisme|hotel|hôtel/, 'voyage'], [/sante|santé|clinique|pharmacie/, 'sante'], [/entretien|reparation|réparation|travaux/, 'travaux']];
function projVisual(nom) {
  const s = String(nom || '').toLowerCase(), m = PIMG.find(x => x[0].test(s)), k = PKEY.find(x => x[0].test(s));
  return m ? { e: m[1], a: m[2], b: m[3], k: k ? k[1] : 'projet' } : { e: '🚀', a: '#6a2c91', b: '#10b981', k: 'projet' };
}
{
  const pc = projectCard;
  projectCard = function (i) {
    let h = pc(i);
    if (!i.photo) {
      const v = projVisual(i.nom + ' ' + (i.lien || ''));
      h = h.replace('<div class="ph">🚀</div>', `<div class="ph" style="background:linear-gradient(135deg,${v.a},${v.b});font-size:56px;position:relative;overflow:hidden"><span>${v.e}</span><img src="photos/${v.k}.jpg" alt="${esc(i.nom || '')}" title="Photo Wikimedia Commons : voir photos/CREDITS.md" loading="lazy" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover" onerror="this.remove()"><small style="position:absolute;left:0;right:0;bottom:0;padding:18px 10px 6px;color:#fff;font-size:12px;font-weight:700;background:linear-gradient(transparent,#000a);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(i.nom || '')}</small></div>`);
    }
    return h;
  };
  MODULES.projets.card = projectCard;
}

/* =====================================================================
   5. BUDGET CIBLE : lecture du classeur (Budget + Budget N+1) et affichage au tableau de bord
   ===================================================================== */
/* « Dîmes et Aumônes » (onglets Budget) = catégorie « Religion » des écritures (libellés Dîmes, Aumône) */
const BALIAS = { 'dividente': ['dividendes'], 'dimes et aumones': ['religion', 'dimes', 'aumones', 'dons et contributions'], 'religion': ['dimes et aumones', 'dimes', 'aumones', 'dons et contributions'], 'retenues bancaires': ['retenues bancaire'], 'investissement bourse': ['investissement bourse', 'bourse'] };
function catByName13(name, nature) {
  const k = n7(name), C = list('categories'), cand = [k, ...(BALIAS[k] || [])];
  for (const x of cand) { const c = C.find(c => n7(c.nom) === x); if (c) return c; }
  /* absente de l'application : créée (type d'après la « Nature » du budget, sinon d'après les écritures) */
  const nat = n7(typeof nature === 'string' ? nature : ''), lines = list('finances').filter(i => n7(i.cat) === k);
  const t = /revenu/.test(nat) ? 'Revenu' : /epargne|invest/.test(nat) ? 'Épargne' : /fixe/.test(nat) ? 'Dépense Fixe' : /occasion/.test(nat) ? 'Dépense Occasionnelle' : /variable/.test(nat) ? 'Dépense Variable' : (lines[0]?.type && TYPES.includes(lines[0].type) ? lines[0].type : 'Dépense Variable');
  const c = { id: uid(), created: new Date().toISOString(), nom: String(name).trim(), type: t, groupe: '', budget: 0, contenu: 'Créée depuis le budget de votre classeur.' };
  c.groupe = typeof groupFor === 'function' ? groupFor(c) : 'Besoins';
  C.push(c); return c;
}
const nz = v => { const x = typeof v === 'number' ? v : parseFloat(String(v).replace(/\s/g, '').replace(',', '.')); return isFinite(x) ? x : 0; };
function importBudgetsFromWb(wb) {
  let nY = 0, nC = 0;
  wb.SheetNames.forEach(sn => {
    const isN1 = /budget\s*n\+1/i.test(sn), isB = !isN1 && /budget/i.test(sn) && !/[ée]pargne/i.test(sn);
    if (!isN1 && !isB) return;
    const a = XLSX.utils.sheet_to_json(wb.Sheets[sn], { header: 1, defval: null, raw: true });
    const hi = a.findIndex(r => r.some(c => /^cat[eé]gorie/i.test(String(c || ''))) && r.some(c => /^janv/i.test(String(c || ''))));
    if (hi < 0) return;
    const yrs = a.slice(0, hi).flat().filter(v => typeof v === 'number' && v >= 2000 && v <= 2100);
    const y = String(yrs.length ? (isN1 ? Math.max(...yrs) : Math.min(...yrs)) : new Date().getFullYear() + (isN1 ? 1 : 0));
    const H = a[hi].map(c => String(c || '').replace(/\s+/g, ' ').trim()), ci = H.findIndex(h => /^cat[eé]gorie/i.test(h)), m0 = H.findIndex(h => /^janv/i.test(h)), pv = H.findIndex(h => /^pr[eé]vu mensuel/i.test(h));
    DB.budgets = DB.budgets || {};
    for (let i = hi + 1; i < a.length; i++) {
      const r = a[i], nom = String(r[ci] || '').trim();
      if (!nom) continue; if (/^total/i.test(nom)) { if (isB) break; else continue; }
      if (/^(solde|[0-9])/i.test(nom) || /sous-total/i.test(String(r[ci + 1] || ''))) continue;
      const c = catByName13(nom, r[ci + 1]); if (!c) continue;
      if (isN1) {
        const v = Array.from({ length: 12 }, (_, m) => Math.round(nz(r[m0 + m])));
        if (v.some(Boolean)) { (DB.budgets[y] = DB.budgets[y] || {})[c.nom] = v; nY++; }
      } else if (pv >= 0) {
        const p = Math.round(nz(r[pv]));
        if (p > 0) { if (!num(c.budget)) c.budget = p; if (!DB.budgets[y]?.[c.nom]) (DB.budgets[y] = DB.budgets[y] || {})[c.nom] = Array(12).fill(p); nC++; }
      }
    }
  });
  return nY + nC;
}
/* si une année n'a pas de plan, la cible reprend le plan de l'année la plus proche (jamais de « 0 » à tort) */
{
  const tp0 = targetPeriod;
  targetPeriod = function (c, rev, y, m) {
    const v = tp0.apply(this, arguments);
    if (v || y === 'all' || c.nom === 'Dîmes' || c.provision) return v;
    const ys = Object.keys(DB.budgets || {}).filter(k => DB.budgets[k]?.[c.nom] && DB.budgets[k][c.nom].some(x => num(x))).sort((p, q) => Math.abs(p - y) - Math.abs(q - y));
    if (!ys.length) return v;
    const b = DB.budgets[ys[0]][c.nom], all = !m || m === '0';
    return all ? b.reduce((x, k) => x + num(k), 0) : num(b[+m - 1]);
  };
}
function budgetCibleCard() {
  const real = periodItems(DS.y, DS.m, BASES[1]), all = periodItems(DS.y, DS.m, BASES[0]);
  const revT = sumK(all, 'rev'), rowsA = budgetRows(all, revT, nMonths()).filter(x => x.c.type !== 'Revenu');
  const per = DS.m && DS.m !== '0' ? MOIS_L[+DS.m - 1] + ' ' : '', yl = DS.y === 'all' ? 'toutes les années' : DS.y;
  const sc = (arr, c) => arr.filter(i => i.cat === c.nom && kind(i) !== 'rev').reduce((x, i) => x + num(i.montant), 0);
  const rows = rowsA.map(({ c, t }) => { const p = sc(real, c), tot = sc(all, c); return { c, t, p, e: Math.max(0, tot - p) }; }).filter(x => x.t || x.p || x.e);
  const good = c => c.type === 'Épargne' || c.type === 'Investissement' || /[ée]pargne|bourse/i.test(c.nom);
  const T = rows.reduce((s, x) => s + x.t, 0), P = rows.reduce((s, x) => s + x.p, 0), E = rows.reduce((s, x) => s + x.e, 0);
  const tbl = rows.length ? `<div class="tw"><table class="mgrid"><thead><tr><th>Catégorie</th><th class="num">Budget cible</th><th class="num">Payé</th><th class="num">Engagé (en attente)</th><th class="num">Disponible</th><th class="num">% consommé</th><th>Statut</th></tr></thead><tbody>${rows.map(({ c, t, p, e }) => { const d = t - p - e, u = t ? (p + e) / t * 100 : 0, g = good(c), over = !g && t > 0 && p + e > t + .5; return `<tr><td>${esc(c.nom)}</td><td class="num">${t ? fmt(t) : '—'}</td><td class="num">${fmt(p)}</td><td class="num">${e ? `<span class="warn">${fmt(e)}</span>` : '—'}</td><td class="num ${t && d < 0 && !g ? 'bad' : 'good'}">${t ? fmt(d) : '—'}</td><td class="num">${t ? pct(u) : '—'}</td><td>${!t ? '—' : over ? '<span class="pill bad">⚠ Dépassé</span>' : (p >= t && g) ? '<span class="pill good">🎯 Atteint</span>' : e && p + e > t * .9 ? '<span class="pill warn">⏳ Presque</span>' : '<span class="pill good">✅ OK</span>'}</td></tr>`; }).join('')}
  <tr class="trow"><td>Total</td><td class="num">${fmt(T)}</td><td class="num">${fmt(P)}</td><td class="num">${fmt(E)}</td><td class="num">${fmt(T - P - E)}</td><td class="num">${T ? pct((P + E) / T * 100) : '—'}</td><td></td></tr></tbody></table></div>
  <p class="mute small" style="margin:8px 0 0">Payé = ✅ Payé + 🔁 Automatique · Engagé = ⏳ En attente (décidé, pas encore réglé) · ❌ Annulé exclu · Disponible = cible − payé − engagé.</p>`
    : `<p class="mute">Aucun budget cible trouvé. Lisez votre classeur dans « Analyse du fichier » ou préparez votre <a href="#" data-go="budgetan">budget annuel</a>.</p>`;
  /* contrôle d'équilibre : revenus fiables (encaissés) − charges − épargne − engagements */
  const rf = sumK(real, 'rev'), ra = Math.max(0, revT - rf), ch = sumK(real, 'dep'), ep = sumK(real, 'epa'), eng = sumK(all, 'dep') - ch + (sumK(all, 'epa') - ep);
  const solde = rf - ch - ep - eng, soldeAtt = solde + ra;
  const tops = rows.filter(x => !good(x.c) && ['Envies', 'Fonds perdus'].includes(x.c.groupe) && (x.p + x.e) > 0).sort((a, b) => (b.p + b.e) - (a.p + a.e)).slice(0, 3);
  const lvl = solde >= 0 ? 'ok' : soldeAtt >= 0 ? 'warn' : 'bad';
  const msg = solde >= 0 ? 'Budget équilibré : vos revenus encaissés couvrent charges, épargne et engagements.' : soldeAtt >= 0 ? `Déséquilibre temporaire : il manque ${fmt(-solde)} tant que ${fmt(ra)} de revenus attendus ne sont pas reçus.` : `Déséquilibre : charges, épargne et engagements dépassent vos revenus de ${fmt(-soldeAtt)}.${tops.length ? ' Pistes d’ajustement : ' + tops.map(x => `${esc(x.c.nom)} (${fmt(x.p + x.e)})`).join(', ') + '.' : ''}`;
  const ctl = `<div class="card"><h2>${ic('shield')} Contrôle d’équilibre — ${per}${yl}</h2>
  <div class="tiles"><div class="tile a1"><small>Revenus encaissés (fiables)</small><b class="good">${fmt(rf)}</b></div><div class="tile a2"><small>Charges payées</small><b>${fmt(ch)}</b></div><div class="tile a3"><small>Épargne versée</small><b>${fmt(ep)}</b></div><div class="tile a4"><small>Engagements à payer</small><b class="${eng ? 'warn' : ''}">${fmt(eng)}</b></div><div class="tile a1"><small>Reste disponible</small><b class="${solde < 0 ? 'bad' : 'good'}">${fmt(solde)}</b></div></div>
  <div class="al ${lvl}" style="margin-top:10px"><span class="ai">${ic(lvl === 'ok' ? 'check' : 'alert')}</span><div>${msg}${ra ? ` <span class="mute">Revenus attendus non encaissés : ${fmt(ra)}.</span>` : ''}</div></div></div>`;
  return `${ctl}<div class="card"><h2>${ic('target')} Budget cible — ${per}${yl}</h2>${tbl}</div>`;
}
{
  const d0 = PAGES.dash || dash;
  PAGES.dash = function (el) { d0(el); const g = el.querySelector('.grid'); if (g) { try { g.insertAdjacentHTML('afterend', budgetCibleCard()); } catch (e) { console.error(e); } } };
}

/* « Religion » : catégorie visible partout (jamais masquée avec le pôle Religion / Culte) */
function fixReligion() {
  if (!ME || !DB) return;
  let ch = 0;
  list('categories').forEach(c => { if (n7(c.nom) === 'religion' && (c.groupe === 'Religion / Culte' || !GROUPES.includes(c.groupe))) { c.groupe = 'Besoins'; ch++; } });
  const used = list('finances').some(i => n7(i.cat) === 'religion');
  if (used && !list('categories').some(c => n7(c.nom) === 'religion')) {
    const c = catByName13('Religion', 'Dépense Fixe'); if (c) { c.groupe = 'Besoins'; c.contenu = 'Dîmes et aumônes'; ch++; }
  }
  if (ch) { DATA_REV++; save(); }
}
{ const b2 = boot; boot = function () { b2.apply(this, arguments); try { fixReligion(); } catch (e) { console.error(e); } }; }
{ const r2 = render; render = function () { try { fixReligion(); } catch (e) { } return r2.apply(this, arguments); }; }

/* =====================================================================
   6. SCÉNARIOS DE BUDGET PRÉVISIONNEL (prudent / réaliste / optimiste)
   Construits sur le budget PROPRE à chaque utilisateur (plan annuel, sinon cibles mensuelles,
   sinon réalisé de la dernière année) : aucune donnée de fichier n'est présupposée.
   ===================================================================== */
const SC_DEF = {
  prudent:   { l: 'Prudent',   c: '#dc2626', rev: 0,   fixe: 4,   varia: 5,   imp: 7, lv: 0, d: 'Revenus stables, charges en hausse, seuls les revenus confirmés comptent' },
  realiste:  { l: 'Réaliste',  c: '#2563eb', rev: 3,   fixe: 3,   varia: 3.5, imp: 5, lv: 1, d: 'Évolutions modérées, revenus confirmés et estimés' },
  optimiste: { l: 'Optimiste', c: '#16a34a', rev: 5,   fixe: 2.5, varia: 2.5, imp: 3, lv: 2, d: 'Revenus en progression, tous les revenus espérés comptent' }
};
const CERT = ['Confirmé', 'Estimé', 'Incertain'];
const SC = () => { DB.scen13 = DB.scen13 || { h: 10, p: {}, adj: [] }; const S = DB.scen13; Object.keys(SC_DEF).forEach(k => { S.p[k] = { ...SC_DEF[k], ...(S.p[k] || {}) }; }); return S; };
function scBase() {
  const ys = Object.keys(DB.budgets || {}).filter(y => Object.values(DB.budgets[y] || {}).some(a => (a || []).some(v => num(v)))).map(Number);
  let y0 = ys.length ? Math.max(...ys) : new Date().getFullYear(), src = ys.length ? `votre plan budgétaire ${y0}` : 'vos cibles mensuelles × 12';
  const cats = list('categories').filter(c => !(typeof catHidden === 'function' && catHidden(c)));
  const B = { rev: 0, fixe: 0, varia: 0, epa: 0, rows: [] };
  const fill = f => { B.rev = B.fixe = B.varia = B.epa = 0; B.rows = []; const rv = cats.filter(c => c.type === 'Revenu').reduce((s, c) => s + f(c, 0), 0); cats.forEach(c => { const v = f(c, rv); if (!v) return; const k = c.type === 'Revenu' ? 'rev' : c.type === 'Épargne' ? 'epa' : c.type === 'Dépense Fixe' ? 'fixe' : 'varia'; B[k] += v; B.rows.push([c.nom, k, v]); }); };
  fill((c, rv) => targetPeriod(c, rv, String(y0), '0'));
  if (!B.rev && !B.fixe && !B.varia) { /* aucun budget : réalisé de la dernière année avec données */
    const ly = dataYears().filter(y => +y <= new Date().getFullYear()).pop();
    if (ly) { y0 = +ly; src = `votre réalisé ${ly}`; const a = periodItems(String(ly), '0', BASES[1]); fill(c => a.filter(i => i.cat === c.nom).reduce((s, i) => s + num(i.montant), 0)); }
  }
  return { ...B, y0, src };
}
function scRun(k, B, S) {
  const p = S.p[k], out = [];
  let cum = 0;
  for (let i = 1; i <= S.h; i++) {
    const y = B.y0 + i, g = (r, n) => Math.pow(1 + r / 100, n);
    let rev = B.rev * g(p.rev, i), fixe = B.fixe * g(p.fixe, i), varia = B.varia * g(p.varia, i), epa = B.epa * g(p.rev, i), adjR = 0, adjD = 0;
    S.adj.forEach(a => { const lv = CERT.indexOf(a.cert); if (lv > p.lv) return; const on = a.rec === 'Chaque année' ? y >= +a.year : y === +a.year; if (!on) return; if (a.nature === 'Revenu') adjR += num(a.montant); else adjD += num(a.montant); });
    rev += adjR; const imp = (fixe + varia) * p.imp / 100, ch = fixe + varia + imp + adjD, solde = rev - ch - epa; cum += solde;
    out.push({ y, rev, fixe, varia, imp, adjD, epa, solde, cum });
  }
  return out;
}
function scenPage(el) {
  const S = SC(), B = scBase(), R = {}; Object.keys(SC_DEF).forEach(k => R[k] = scRun(k, B, S));
  const ks = Object.keys(SC_DEF), yrs = R.realiste.map(r => r.y);
  const inp = (k, f) => `<input type="number" step="0.5" data-sc13="p" data-k="${k}" data-f="${f}" value="${S.p[k][f]}" style="width:90px">`;
  const verdict = k => { const d = R[k].find(r => r.solde < 0); return d ? `<span class="pill bad">⚠ Déficit dès ${d.y}</span>` : `<span class="pill good">✅ Équilibré sur ${S.h} ans</span>`; };
  const yt = k => `<div class="tw" style="margin-top:6px"><table class="mgrid"><thead><tr><th>Année</th><th class="num">Revenus</th><th class="num">Charges fixes</th><th class="num">Charges variables</th><th class="num">Imprévus</th><th class="num">Événements</th><th class="num">Épargne</th><th class="num">Solde</th><th class="num">Cumul</th></tr></thead><tbody>${R[k].map(r => `<tr><td>${r.y}</td><td class="num">${fmt(r.rev)}</td><td class="num">${fmt(r.fixe)}</td><td class="num">${fmt(r.varia)}</td><td class="num">${fmt(r.imp)}</td><td class="num">${r.adjD ? fmt(r.adjD) : '—'}</td><td class="num">${fmt(r.epa)}</td><td class="num ${r.solde < 0 ? 'bad' : 'good'}"><b>${fmt(r.solde)}</b></td><td class="num ${r.cum < 0 ? 'bad' : ''}">${fmt(r.cum)}</td></tr>`).join('')}</tbody></table></div>`;
  el.innerHTML = `<div class="head"><h1>${ic('chart')} Scénarios budgétaires</h1><div class="acts"><button class="ghost" data-sc13="reset">${ic('refresh')} Valeurs par défaut</button><button class="ghost" id="scx">${ic('download')} Excel</button></div></div>
  <div class="card"><h2>${ic('target')} Point de départ</h2><p style="margin:0">Basé sur <b>${esc(B.src)}</b> : revenus <b>${fmt(B.rev)}</b> · charges fixes <b>${fmt(B.fixe)}</b> · charges variables <b>${fmt(B.varia)}</b> · épargne <b>${fmt(B.epa)}</b> par an.</p>
  ${B.rev || B.fixe || B.varia ? '' : `<p class="mute">Aucun budget trouvé : préparez votre <a href="#" data-go="budgetan">budget annuel</a> ou ajoutez des écritures, les scénarios s’en nourriront automatiquement.</p>`}
  <div class="fg" style="margin-top:8px"><div><label>Durée de la projection (années)</label><select data-sc13="h">${[5, 8, 10, 12, 15].map(n => `<option ${n === S.h ? 'selected' : ''}>${n}</option>`).join('')}</select></div></div></div>
  <div class="card"><h2>${ic('settings')} Hypothèses (modifiables, propres à votre foyer)</h2><div class="tw"><table class="mgrid"><thead><tr><th>Hypothèse (par an)</th>${ks.map(k => `<th style="border-top:4px solid ${SC_DEF[k].c}">${SC_DEF[k].l}</th>`).join('')}</tr></thead><tbody>
  <tr><td>Progression des revenus et de l’épargne (%)</td>${ks.map(k => `<td>${inp(k, 'rev')}</td>`).join('')}</tr>
  <tr><td>Hausse des charges fixes (%)</td>${ks.map(k => `<td>${inp(k, 'fixe')}</td>`).join('')}</tr>
  <tr><td>Hausse des charges variables (%)</td>${ks.map(k => `<td>${inp(k, 'varia')}</td>`).join('')}</tr>
  <tr><td>Réserve d’imprévus (% des charges)</td>${ks.map(k => `<td>${inp(k, 'imp')}</td>`).join('')}</tr>
  <tr><td>Événements pris en compte</td>${ks.map(k => `<td><small class="mute">${CERT.slice(0, SC_DEF[k].lv + 1).join(' + ')}</small></td>`).join('')}</tr></tbody></table></div>
  <p class="mute small" style="margin:8px 0 0">Formule : montant de départ × (1 + taux)<sup>n</sup>, n = nombre d’années depuis ${B.y0}. ${ks.map(k => `<b style="color:${SC_DEF[k].c}">${SC_DEF[k].l}</b> : ${SC_DEF[k].d}.`).join(' ')}</p></div>
  <div class="card"><h2>${ic('calendar')} Événements futurs (prime, achat, nouveau revenu, projet…)</h2>
  <p class="mute small" style="margin:0 0 8px">Un revenu espéré n’est jamais présenté comme garanti : indiquez son niveau de certitude, il ne compte que dans les scénarios concernés.</p>
  ${S.adj.length ? `<div class="tw"><table class="mgrid"><thead><tr><th>Libellé</th><th>Nature</th><th class="num">Montant / an</th><th>À partir de</th><th>Fréquence</th><th>Certitude</th><th></th></tr></thead><tbody>${S.adj.map((a, i) => `<tr><td>${esc(a.label)}</td><td>${esc(a.nature)}</td><td class="num">${fmt(a.montant)}</td><td>${esc(a.year)}</td><td>${esc(a.rec)}</td><td>${esc(a.cert)}</td><td><button class="ghost" data-sc13="deladj" data-i="${i}">${ic('trash')}</button></td></tr>`).join('')}</tbody></table></div>` : ''}
  <div class="fg" style="margin-top:8px"><div><label>Libellé</label><input id="sa-l" placeholder="Ex. Prime d’ancienneté"></div><div><label>Nature</label><select id="sa-n"><option>Revenu</option><option>Dépense</option></select></div><div><label>Montant (FCFA)</label><input id="sa-m" type="number" min="0"></div><div><label>À partir de</label><select id="sa-y">${yrs.map(y => `<option>${y}</option>`).join('')}</select></div><div><label>Fréquence</label><select id="sa-r"><option>Chaque année</option><option>Une fois</option></select></div><div><label>Certitude</label><select id="sa-c">${CERT.map(c => `<option>${c}</option>`).join('')}</select></div></div>
  <p style="margin:8px 0 0"><button data-sc13="addadj">${ic('plus')} Ajouter l’événement</button></p></div>
  <div class="card"><h2>${ic('chart')} Solde annuel selon le scénario</h2>${combo({ labels: yrs, bars: [], lines: ks.map(k => ({ n: SC_DEF[k].l, v: R[k].map(r => Math.round(r.solde)), c: SC_DEF[k].c })), h: 220 })}
  <div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:10px">${ks.map(k => `<div style="border-left:6px solid ${SC_DEF[k].c};padding:6px 12px;background:var(--card,#fff);border-radius:8px;box-shadow:0 1px 3px #0002"><b>${SC_DEF[k].l}</b><br>${verdict(k)}<br><small class="mute">Cumul final : ${fmt(R[k][R[k].length - 1].cum)}</small></div>`).join('')}</div></div>
  ${ks.map(k => `<details class="card"${k === 'realiste' ? ' open' : ''}><summary><b style="color:${SC_DEF[k].c}">${SC_DEF[k].l}</b> — détail année par année</summary>${yt(k)}</details>`).join('')}`;
  el.querySelector('#scx').onclick = () => download(xlsx(ks.map(k => ({ name: SC_DEF[k].l, rows: [['Année', 'Revenus', 'Charges fixes', 'Charges variables', 'Imprévus', 'Événements', 'Épargne', 'Solde', 'Cumul'], ...R[k].map(r => [r.y, ...[r.rev, r.fixe, r.varia, r.imp, r.adjD, r.epa, r.solde, r.cum].map(Math.round)])] }))), 'lumina-scenarios.xlsx');
}
PAGES.scen13 = scenPage;
{ const i = NAV.findIndex(n => n[0] === 'budgetia'); NAV.splice(i < 0 ? NAV.length : i + 1, 0, ['scen13', 'chart', 'Scénarios budgétaires']); NAVG[0].m.push('scen13'); TABL.scen13 = 'Scénarios'; }
document.addEventListener('change', ev => {
  const e = ev.target, k = e.dataset?.sc13; if (!k || !DB) return;
  const S = SC();
  if (k === 'p') S.p[e.dataset.k][e.dataset.f] = Math.max(-50, Math.min(100, +e.value || 0));
  else if (k === 'h') S.h = +e.value;
  else return;
  save(); render();
});
document.addEventListener('click', ev => {
  const b = ev.target.closest?.('[data-sc13]'); if (!b || b.tagName === 'INPUT' || b.tagName === 'SELECT') return;
  const S = SC(), k = b.dataset.sc13, q = id => document.getElementById(id)?.value;
  if (k === 'reset') { S.p = {}; save(); render(); }
  else if (k === 'deladj') { S.adj.splice(+b.dataset.i, 1); save(); render(); }
  else if (k === 'addadj') { const m = +q('sa-m'); if (!q('sa-l')?.trim() || !m) { toast('⚠ Libellé et montant requis'); return; } S.adj.push({ label: q('sa-l').trim(), nature: q('sa-n'), montant: m, year: q('sa-y'), rec: q('sa-r'), cert: q('sa-c') }); save(); render(); toast('✔ Événement ajouté'); }
});
