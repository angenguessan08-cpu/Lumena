'use strict';
/* =====================================================================
   LUMINA v11
   1. Pôle Religion / Culte : n'existe plus dans la base initiale ; créé seulement après une écriture religieuse (ou option activée)
   2. Deux référentiels de catégories : PERSONNEL / FAMILIAL et PROFESSIONNEL (activables, extensibles par l'utilisateur)
   3. Commutateur de classement des charges : par groupe · Fixes vs Variables · Coûts directs vs indirects
   4. Catégories et cartes à 0 FCFA sans aucun enregistrement : masquées partout (réapparaissent dès la première saisie)
   5. Provision pour risques (Pro) = 5 % du total des charges, recalculée automatiquement
   ===================================================================== */
const REL_NAMES = ['Dîmes', 'Aumônes', 'Culte & œuvres'];

/* ---------- Référentiels ---------- */
const PRO_GROUPS = ['Achats et matières premières', 'Services extérieurs', 'Personnel', 'Impôts et taxes', 'Charges financières et amortissements', 'Investissements', 'Imprévus / provision pour risques'];
const _mk11 = (nom, type, groupe, cout, desc, extra) => Object.assign({ nom, type, groupe, cout, desc }, extra || {});
const REF_PRO = [
  _mk11('Ventes et prestations', 'Revenu', 'Revenus', '', 'Chiffre d’affaires : ventes de biens et de services.'),
  _mk11('Subventions et autres produits', 'Revenu', 'Revenus', '', 'Subventions, produits exceptionnels.'),
  _mk11('Achats de marchandises', 'Dépense Variable', PRO_GROUPS[0], 'Direct', 'Marchandises revendues.'),
  _mk11('Matières premières et fournitures', 'Dépense Variable', PRO_GROUPS[0], 'Direct', 'Matières, emballages, consommables de production.'),
  _mk11('Loyers et locations', 'Dépense Fixe', PRO_GROUPS[1], 'Indirect', 'Local, matériel loué.'),
  _mk11('Entretien et réparations', 'Dépense Variable', PRO_GROUPS[1], 'Indirect', 'Maintenance du local et du matériel.'),
  _mk11('Assurances professionnelles', 'Dépense Fixe', PRO_GROUPS[1], 'Indirect', 'Multirisque, responsabilité civile, flotte.'),
  _mk11('Honoraires et prestataires', 'Dépense Variable', PRO_GROUPS[1], 'Indirect', 'Comptable, juriste, sous-traitants.'),
  _mk11('Publicité et communication', 'Dépense Variable', PRO_GROUPS[1], 'Indirect', 'Publicité, site web, supports.'),
  _mk11('Déplacements et transport pro', 'Dépense Variable', PRO_GROUPS[1], 'Indirect', 'Carburant, livraisons, missions.'),
  _mk11('Télécoms et internet pro', 'Dépense Fixe', PRO_GROUPS[1], 'Indirect', 'Téléphone, internet, abonnements.'),
  _mk11('Salaires et charges sociales', 'Dépense Fixe', PRO_GROUPS[2], 'Direct', 'Salaires, CNPS et charges sociales.'),
  _mk11('Primes et formation du personnel', 'Dépense Variable', PRO_GROUPS[2], 'Direct', 'Primes, indemnités, formations.'),
  _mk11('Impôts et taxes', 'Dépense Fixe', PRO_GROUPS[3], 'Indirect', 'Patente, TVA à reverser, impôts sur les bénéfices.'),
  _mk11('Intérêts d’emprunt', 'Dépense Fixe', PRO_GROUPS[4], 'Indirect', 'Intérêts des crédits professionnels.'),
  _mk11('Amortissements', 'Dépense Fixe', PRO_GROUPS[4], 'Indirect', 'Dotation annuelle aux amortissements.'),
  _mk11('Fonds perdus / Frais bancaires', 'Dépense Fixe', PRO_GROUPS[4], 'Indirect', 'Retenues bancaires, tenue de compte, agios : fonds perdus.', { fp: 1, existing: true }),
  _mk11('Équipements et matériel', 'Dépense Occasionnelle', PRO_GROUPS[5], 'Indirect', 'Machines, mobilier, outillage.'),
  _mk11('Logiciels et outils numériques', 'Dépense Occasionnelle', PRO_GROUPS[5], 'Indirect', 'Licences, développement, matériel informatique.'),
  _mk11('Imprévus / provision pour risques', 'Dépense Occasionnelle', PRO_GROUPS[6], 'Indirect', 'Provision automatique : 5 % du total des charges.', { provision: 5 })
];
const REF_PERSO = [
  _mk11('Logement et énergie', 'Dépense Fixe', 'Besoins', '', 'Loyer, électricité, eau, gaz.', { alias: ['Logement'] }),
  _mk11('Alimentation et vie courante', 'Dépense Variable', 'Besoins', '', 'Courses, produits d’entretien, hygiène.', { alias: ['Alimentation'] }),
  _mk11('Transport', 'Dépense Variable', 'Besoins', '', 'Carburant, taxi, bus, entretien du véhicule.', { alias: ['Véhicule'] }),
  _mk11('Santé et assurances', 'Dépense Variable', 'Besoins', '', 'Consultations, médicaments, mutuelle, assurance santé.', { alias: ['Santé'] }),
  _mk11('Épargne Études Enfants', 'Épargne', 'Épargne', '', 'Contrats éducation (NSIA, SANLAM…) et épargne études.', { alias: ['Assurances'] }),
  _mk11('Épargne logement (PEL)', 'Épargne', 'Épargne', '', 'Épargne logement : achat ou construction du logement.', { alias: ['Épargne Logement'] }),
  _mk11('Loisirs, abonnements et imprévus', 'Dépense Occasionnelle', 'Envies', '', 'Sorties, abonnements, imprévus du quotidien.', { alias: ['Loisirs'] }),
  _mk11('Investissement bourse', 'Épargne', 'Investissement Bourse', '', 'Investissement Bourse (BRVM) et actifs financiers.', {}),
  _mk11('Remboursements prêt', 'Dépense Fixe', 'Dettes & Remboursements', '', 'Remboursements de prêts et dettes.', { alias: ['Remboursements prêts & Dettes'] })
];
const REF_BOTH = ['Fonds perdus / Frais bancaires', 'Pertes & Amendes', 'Autres revenus', 'Imprévus'];   /* jamais désactivées */
const PERSO_PRO_MARK = new Set(REF_PRO.map(d => nrm(d.nom)));

function regGroup(g) {
  if (!g || GROUPES.includes(g)) return;
  if (g === 'Investissements') GROUPES.push(g);
  else { const i = GROUPES.indexOf('Épargne'); GROUPES.splice(i < 0 ? GROUPES.length : i, 0, g); }
  if (!GICON[g]) GICON[g] = 'folder';
}
function ensureGroups() {
  if (typeof RELIG !== 'undefined' && !GROUPES.includes(RELIG) && (DB.profile || {}).religion === 'Oui') regGroup(RELIG);
  if (typeof RELIG !== 'undefined' && !((DB.profile || {}).religion === 'Oui') && !list('categories').some(c => c.groupe === RELIG)) { const i = GROUPES.indexOf(RELIG); if (i >= 0) GROUPES.splice(i, 1); }
  PRO_GROUPS.forEach(g => { if (list('categories').some(c => c.groupe === g)) regGroup(g); });
  list('categories').forEach(c => regGroup(c.groupe));
}

/* ---------- Utilisation d'une catégorie ---------- */
let _use = { k: '', set: new Set() };
function usedSet() {
  const k = [typeof DATA_REV === 'undefined' ? 0 : DATA_REV, list('finances').length, list('categories').length, list('objectifs').length].join(':');
  if (_use.k === k) return _use.set;
  const s = new Set();
  list('finances').forEach(i => { if (i.cat) s.add(i.cat); });
  list('objectifs').forEach(o => { if (o.cat) s.add(o.cat); });
  Object.values(DB.budgets || {}).forEach(B => Object.keys(B || {}).forEach(n => { if ((B[n] || []).some(v => num(v) > 0)) s.add(n); }));
  _use = { k, set: s }; return s;
}
const catUsed = c => num(c.budget) > 0 || usedSet().has(c.nom);
/* masquée des tableaux, cartes et budgets tant qu'elle est à 0 FCFA sans aucun enregistrement */
const catDormant = c => !catUsed(c) || (!!c.off && !usedSet().has(c.nom));
/* masquée aussi des listes de saisie : seulement l'autre référentiel non utilisé */
const catOffUnused = c => !!c.off && !usedSet().has(c.nom) && !(num(c.budget) > 0);

/* ---------- 1. Religion : pas de base initiale, création à la demande ---------- */
let SHOW_EMPTY_CATS = false;
const NEUTRAL_GIVING = 'Dons et contributions';
function removeEmptyReligion() {
  if (DB.mig12rel) return false;
  DB.mig12rel = 1;
  const C = list('categories'), F = list('finances'), moved = [];
  const has = C.some(c => REL_NAMES.includes(c.nom)) || F.some(i => REL_NAMES.includes(i.cat));
  if (!has) return true;
  const undo = { cats: clone9(C.filter(c => REL_NAMES.includes(c.nom))), lines: [], budgets: {} };
  F.forEach(i => { if (REL_NAMES.includes(i.cat)) { undo.lines.push([i.id, i.cat]); i.cat = NEUTRAL_GIVING; moved.push(i.id); } });
  list('objectifs').forEach(o => { if (REL_NAMES.includes(o.cat)) o.cat = NEUTRAL_GIVING; });
  const keep = C.filter(c => !REL_NAMES.includes(c.nom));
  let tgt = keep.find(c => c.nom === NEUTRAL_GIVING), bud = C.filter(c => REL_NAMES.includes(c.nom) && c.nom !== 'Dîmes').reduce((s, c) => s + num(c.budget), 0);
  if (!tgt && (moved.length || bud)) { tgt = { id: uid(), created: new Date().toISOString(), nom: NEUTRAL_GIVING, type: 'Dépense Variable', groupe: 'Envies', budget: 0, contenu: 'Dons, offrandes, cotisations et contributions de toute nature (catégorie neutre).' }; keep.push(tgt); }
  if (tgt) tgt.budget = num(tgt.budget) + bud;
  Object.entries(DB.budgets || {}).forEach(([y, B]) => {
    if (!B) return; undo.budgets[y] = {};
    REL_NAMES.forEach(n => { if (B[n]) { undo.budgets[y][n] = B[n]; if (n !== 'Dîmes' && tgt) B[NEUTRAL_GIVING] = B[NEUTRAL_GIVING] ? B[NEUTRAL_GIVING].map((v, k) => num(v) + num(B[n][k])) : B[n]; delete B[n]; } });
  });
  DB.categories = keep;
  DB.mig12Undo = undo; DATA_REV++;
  return true;
}
function ensureReligionCats() {
  if (!(typeof religionVisible === 'function' && religionVisible())) return false;
  let ch = false;
  REL_NAMES.forEach(n => { if (!list('categories').some(c => c.nom === n)) { ensureCat(n); ch = true; } });
  return ch;
}

/* ---------- 2. Référentiels ---------- */
const profile11 = () => (DB.profile = DB.profile || {});
const activeRef = () => profile11().referentiel || '';
const REF_LABEL = { perso: 'Personnel / Familial', pro: 'Professionnel', both: 'Les deux (mixte)', '': 'Non défini' };

function findDef(def) {
  const C = list('categories'), names = [def.nom, ...(def.alias || [])].map(nrm);
  for (const n of names) { const c = C.find(x => nrm(x.nom) === n); if (c) return c; }
  return null;
}
function applyRef(mode) {
  const p = profile11();
  const snap = { categories: clone9(list('categories')), budgets: clone9(DB.budgets || {}), cats: list('finances').filter(i => i.cat).map(i => [i.id, i.cat]), objectifs: list('objectifs').map(o => [o.id, o.cat || '']), referentiel: p.referentiel || '', ts: Date.now() };
  const defs = mode === 'pro' ? REF_PRO : mode === 'perso' ? REF_PERSO : [...REF_PERSO, ...REF_PRO];
  const C = list('categories');
  /* les catégories existantes sont toutes « personnelles » tant qu'elles ne portent pas d'étiquette */
  C.forEach(c => { if (!c.ref) c.ref = REF_BOTH.includes(c.nom) ? 'both' : PERSO_PRO_MARK.has(nrm(c.nom)) ? 'pro' : 'perso'; });
  let added = 0, renamed = 0;
  defs.forEach(def => {
    const isPro = REF_PRO.includes(def);
    let c = findDef(def);
    if (c) {
      if (c.nom !== def.nom && !def.existing && !C.some(x => x.nom === def.nom)) { renameCat(c.nom, def.nom); c = findDef(def) || c; renamed++; }
      c.off = 0;
      if (isPro && def.existing && mode === 'pro') c.groupe = def.groupe;
      if (isPro && def.fp) c.fp = 1;
      if (!c.cout && def.cout) c.cout = def.cout;
      if (def.provision && !c.provision) c.provision = def.provision;
    } else {
      c = { id: uid(), created: new Date().toISOString(), nom: def.nom, type: def.type, groupe: def.groupe, budget: 0, contenu: def.desc, ref: isPro ? 'pro' : 'perso' };
      if (def.cout) c.cout = def.cout; if (def.provision) c.provision = def.provision; if (def.fp) c.fp = 1;
      C.push(c); added++;
    }
    if (!c.ref || c.ref === 'perso' && isPro) c.ref = isPro ? 'pro' : 'perso';
  });
  /* l'autre référentiel : désactivé s'il n'a aucun enregistrement */
  list('categories').forEach(c => {
    if (c.ref === 'both') { c.off = 0; return; }
    c.off = (mode === 'perso' && c.ref === 'pro') || (mode === 'pro' && c.ref === 'perso') ? 1 : 0;
  });
  if (mode !== 'pro') list('categories').forEach(c => { if (c.fp && PRO_GROUPS.includes(c.groupe)) c.groupe = 'Fonds perdus'; });
  p.referentiel = mode; if (!p.classement) p.classement = 'groupe';
  DB.mig11Undo = Object.assign(DB.mig11Undo || {}, { ref: snap });
  ensureGroups(); DATA_REV++;
  return { added, renamed };
}
function undoRef() {
  const s = DB.mig11Undo && DB.mig11Undo.ref; if (!s) return;
  DB.categories = s.categories; DB.budgets = s.budgets;
  const m = new Map(s.cats); list('finances').forEach(i => { if (m.has(i.id)) i.cat = m.get(i.id); });
  const o = new Map(s.objectifs); list('objectifs').forEach(x => { if (o.has(x.id)) x.cat = o.get(x.id); });
  profile11().referentiel = s.referentiel; delete DB.mig11Undo.ref; DATA_REV++;
}

/* ---------- 5. Provision pour risques ---------- */
const provBase = c => list('categories').filter(x => x !== c && !x.provision && x.type !== 'Revenu' && x.type !== 'Épargne' && x.type !== 'Investissement' && !REL_NAMES.includes(x.nom));
function provisionTarget(c, rev, y, m) {
  const pct = num(c.provision) / 100;
  return provBase(c).reduce((s, x) => s + targetPeriod(x, rev, y, m), 0) * pct;
}
function syncProvision() {
  const c = list('categories').find(x => x.provision); if (!c) return false;
  const pct = num(c.provision) / 100, base = provBase(c); let ch = false;
  const mb = Math.round(base.reduce((s, x) => s + num(x.budget), 0) * pct);
  if (num(c.budget) !== mb) { c.budget = mb; ch = true; }
  Object.entries(DB.budgets || {}).forEach(([y, B]) => {
    if (!B) return;
    const arr = Array.from({ length: 12 }, (_, m) => Math.round(base.reduce((s, x) => s + num((B[x.nom] || Array(12).fill(num(x.budget)))[m]), 0) * pct));
    const cur = B[c.nom] || [];
    if (arr.some((v, m) => num(cur[m]) !== v)) { B[c.nom] = arr; ch = true; }
  });
  return ch;
}

/* ---------- 3. Classement des charges ---------- */
const CLASS_LABEL = { groupe: 'Par groupe (Besoins, Envies…)', fixvar: 'Fixes vs Variables', direct: 'Coûts directs vs indirects' };
const classMode = () => profile11().classement || 'groupe';
const fixOrVar = c => c.type === 'Dépense Fixe' ? 'Fixe' : 'Variable';
function classCell(c) {
  if (classMode() === 'direct') return c.cout ? `<span class="pill brand">${esc(c.cout)}</span>` : '<span class="mute">—</span>';
  return `<span class="pill ${c.type === 'Dépense Fixe' ? 'bad' : 'warn'}">${fixOrVar(c)}</span>`;
}
function classSection() {
  const mode = classMode(); if (mode === 'groupe') return '';
  const a = periodItems(DS.y, DS.m, DS.base), rv = sumK(a, 'rev'), months = DS.m === '0' ? 12 : 1;
  const rows = budgetRows(a, rv, months).filter(x => x.c.type !== 'Revenu' && x.c.type !== 'Épargne' && x.c.type !== 'Investissement');
  const B = mode === 'fixvar'
    ? [['Charges fixes', x => x.c.type === 'Dépense Fixe', 'bad', 'alert'], ['Charges variables', x => x.c.type !== 'Dépense Fixe', 'warn', 'wallet']]
    : [['Coûts directs', x => x.c.cout === 'Direct', 'bad', 'alert'], ['Coûts indirects', x => x.c.cout === 'Indirect', 'warn', 'wallet'], ['Non qualifiés', x => x.c.cout !== 'Direct' && x.c.cout !== 'Indirect', 'mute', 'folder']];
  const tot = rows.reduce((s, x) => s + x.t, 0) || 1;
  return `<div class="cls11">${B.map(([title, f, cls, icon]) => {
    const rs = rows.filter(f).sort((p, q) => q.t - p.t || q.r - p.r), t = rs.reduce((s, x) => s + x.t, 0), r = rs.reduce((s, x) => s + x.r, 0);
    if (!rs.length) return '';
    return `<section class="grp">${recapCard({ title, icon, sub: `${rs.length} catégorie(s) · ${pct(t / tot * 100)} des charges prévues`, p: t ? r / t * 100 : 0, over: r > t + .5 && t > 0,
      tiles: [tile('Budget cible', fmt(t), '', 'a1'), tile('Réalisé', fmt(r), cls, 'a4'), tile('Reste', fmt(t - r), t - r < 0 ? 'bad' : '', 'a0')] })}
      <div class="card tw"><table><thead><tr><th>Catégorie</th><th>Groupe</th><th class="num">Cible</th><th class="num">Réalisé</th></tr></thead><tbody>${rs.map(x => `<tr class="fx"><td>${esc(x.c.nom)}</td><td>${esc(x.c.groupe || '')}</td><td class="num">${fmt(x.t)}</td><td class="num ${cls}">${fmt(x.r)}</td></tr>`).join('')}</tbody></table></div></section>`;
  }).join('')}</div>`;
}
function refCard() {
  const p = profile11(), mode = activeRef(), prov = list('categories').find(c => c.provision);
  const hidden = list('categories').filter(c => catDormant(c)).length;
  return `<div class="card guide" id="ref11"><h2>${ic('grid')} Référentiel de catégories et classement</h2>
  <div class="filt"><div><label>Référentiel actif : <b>${esc(REF_LABEL[mode])}</b></label>
    <select id="ref11sel">${['perso', 'pro', 'both'].map(m => `<option value="${m}" ${m === mode ? 'selected' : ''}>${REF_LABEL[m]}</option>`).join('')}</select></div>
    <div><label>&nbsp;</label><button class="ghost" data-x11="showempty">${ic('eye')} ${SHOW_EMPTY_CATS ? 'Masquer' : 'Afficher'} les catégories vides (${hidden})</button> <button data-x11="apply">${ic('save')} Appliquer le référentiel</button>${DB.mig11Undo && DB.mig11Undo.ref ? ` <button class="ghost" data-x11="undoref">${ic('undo')} Annuler ce changement</button>` : ''}</div>
    <div><label>Classer les charges</label><select data-x11="class">${Object.entries(CLASS_LABEL).map(([k, v]) => `<option value="${k}" ${k === classMode() ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
    ${prov ? `<div><label>Provision pour risques (% des charges)</label><input type="number" min="0" max="50" step="0.5" data-x11="prov" value="${num(prov.provision)}" style="max-width:110px"></div>` : ''}</div>
  <ol class="steps"><li><b>Personnel / Familial</b><span>Logement et énergie · Alimentation et vie courante · Transport · Santé et assurances · Épargne Études Enfants et Logement · Loisirs, abonnements et imprévus · Investissement Bourse (BRVM) · Remboursements prêts et dettes.</span></li>
  <li><b>Professionnel</b><span>Achats et matières premières · Services extérieurs · Personnel · Impôts et taxes · Charges financières et amortissements (frais bancaires et agios = fonds perdus) · Investissements · Imprévus / provision pour risques (5 % du total des charges).</span></li>
  <li><b>Vos propres catégories</b><span>Dans n’importe quel formulaire, choisissez « + Ajouter un groupe / une catégorie… ». Les catégories de l’autre référentiel sont masquées tant qu’elles n’ont aucun enregistrement.</span></li>
  <li><b>${t('Catégories à 0')} ${curLabel()}</b><span>${tp('{n} catégorie(s) sans budget ni écriture sont masquées des cartes et des bilans ; elles restent proposées dans Budget annuel pour y saisir un montant, et réapparaissent partout dès la première saisie.',{n:hidden})}</span></li></ol></div>`;
}

/* ---------- Table Catégories : catégories vides masquées (interrupteur pour les afficher) ---------- */
{
  const f0 = filtered;
  filtered = function (k) {
    const r = f0.apply(this, arguments);
    if (k !== 'categories' || !ME || SHOW_EMPTY_CATS) return r;
    return r.filter(c => !catDormant(c) || c.perso);
  };
}

/* ---------- Branchements ---------- */
{
  const m = MODULES.categories;
  if (m) {
    const t0 = m.top;
    m.top = function () { return (ME ? refCard() + classSection() : '') + (t0 ? t0.apply(this, arguments) : ''); };
    const ix = m.fields.findIndex(f => f.k === 'contenu');
    m.fields.splice(ix < 0 ? m.fields.length : ix, 0, { k: 'cout', l: 'Nature du coût (pro)', t: 'select', o: ['', 'Direct', 'Indirect'] });
    const j = m.cols.findIndex(c => c.k === 'groupe');
    m.cols.splice(j < 0 ? m.cols.length : j + 1, 0, { l: 'Classement', nosort: 1, f: classCell });
  }
}
document.addEventListener('change', ev => {
  const s = ev.target; if (!ME || !s || !s.dataset) return;
  if (s.dataset.x11 === 'class') { profile11().classement = s.value; save(); render(); }
  else if (s.dataset.x11 === 'prov') { const c = list('categories').find(x => x.provision); if (c) { c.provision = Math.max(0, Math.min(50, num(s.value))); syncProvision(); save(); render(); toast('✔ Provision : ' + c.provision + ' %'); } }
});
document.addEventListener('click', ev => {
  const b = ev.target.closest && ev.target.closest('button[data-x11]'); if (!b || !ME) return;
  if (b.dataset.x11 === 'apply') {
    const sel = document.getElementById('ref11sel'); if (!sel) return;
    if (!confirm('Appliquer le référentiel « ' + REF_LABEL[sel.value] + ' » ?\nLes catégories sont ajoutées ou renommées, vos écritures suivent automatiquement. Vous pourrez annuler ce changement.')) return;
    const r = applyRef(sel.value); syncProvision(); save(); render();
    toast(`✔ Référentiel appliqué : ${r.added} ajoutée(s), ${r.renamed} renommée(s)`);
  } else if (b.dataset.x11 === 'showempty') { SHOW_EMPTY_CATS = !SHOW_EMPTY_CATS; render(); }
  else if (b.dataset.x11 === 'undoref') { undoRef(); save(); render(); toast('↩ Référentiel précédent rétabli'); }
});

/* À chaque affichage : groupes, catégories religieuses à la demande, provision */
const _render11 = render;
render = function () {
  if (ME) {
    try {
      ensureGroups();
      let ch = ensureReligionCats();
      if (syncProvision()) ch = true;
      if (ch) { if (typeof HIST !== 'undefined') HIST.mute++; try { save(); } finally { if (typeof HIST !== 'undefined') HIST.mute--; } DATA_REV++; }
    } catch (e) { console.error('LUMINA v11 :', e); }
  }
  return _render11.apply(this, arguments);
};
/* Au démarrage : retrait du pôle religieux vide, puis référentiel Personnel appliqué une seule fois */
{
  const b1 = boot;
  boot = function () {
    try { ensureGroups(); } catch (e) { }
    b1.apply(this, arguments);
    try {
      if (!ME) return;
      let ch = removeEmptyReligion();
      if (!DB.mig11 && list('categories').length) {
        DB.mig11 = 1; if (!activeRef()) { applyRef('perso'); } ch = true;
      }
      if (ch) { if (typeof HIST !== 'undefined') HIST.mute++; try { save(); } finally { if (typeof HIST !== 'undefined') HIST.mute--; } }
    } catch (e) { console.error('LUMINA v11 :', e); }
  };
}
