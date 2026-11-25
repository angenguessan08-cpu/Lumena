'use strict';
/* =====================================================================
   LUMINA v13 — Données & Import
   1. Page « Données & Import » : intégrer son propre historique (CSV, TSV, texte structuré, JSON, Excel .xlsx / .xls / .ods)
      - lecture 100 % locale dans le navigateur (SheetJS embarqué dans vendor/, chargé seulement pour les classeurs Excel)
      - détection de la ligne d'en-tête, des colonnes (date, libellé, montant, débit/crédit, catégorie, type, statut, note)
        et des formats de date / montant ; correspondance modifiable à la main
      - aperçu avant import, détection des doublons, création des catégories manquantes, import annulable
   2. Nettoyage : plus aucune donnée d'exemple chargée ; automatismes dîme / aumônes / culte désactivés et nettoyés
   ===================================================================== */
Object.assign(IC, { upload: '<path d="M12 16V5M7 9l5-5 5 5M5 20h14"/>', file: '<path d="M6 3h8l5 5v13H6z"/><path d="M14 3v5h5"/>' });

/* ---------- Lecture des fichiers ---------- */
const IM = { name: '', aoa: [], sheets: [], sheet: '', wb: null, hdr: 0, map: {}, opts: { sign: 'auto', createCats: true, skipDup: true, status: '✅ Payé' }, last: null, busy: false, error: '', fx: {}, dm: 'dmy', paste: '', dest: 'finances', off: new Set() };
const FIELDS12 = [
  ['date', 'Date', ['date', 'jour', 'day', 'dateoperation', 'datetransaction', 'dateop', 'datevaleur', 'le']],
  ['libelle', 'Libellé / description', ['libelle', 'description', 'designation', 'objet', 'detail', 'operation', 'intitule', 'motif', 'label', 'memo', 'tiers', 'nom', 'beneficiaire']],
  ['montant', 'Montant', ['montant', 'somme', 'amount', 'valeur', 'total', 'prix', 'cout', 'montantfcfa']],
  ['debit', 'Débit (sorties)', ['debit', 'depense', 'depenses', 'sortie', 'sorties', 'retrait', 'decaissement', 'charges']],
  ['credit', 'Crédit (entrées)', ['credit', 'recette', 'recettes', 'entree', 'entrees', 'encaissement', 'depot', 'revenu', 'revenus']],
  ['cat', 'Catégorie', ['categorie', 'category', 'cat', 'rubrique', 'poste', 'compte']],
  ['type', 'Type de flux', ['type', 'nature', 'flux', 'sens', 'typeoperation']],
  ['statut', 'Statut', ['statut', 'etat', 'status']],
  ['note', 'Note', ['note', 'notes', 'remarque', 'remarques', 'commentaire', 'observation', 'observations']]
];
const key12 = s => nrm(String(s == null ? '' : s)).replace(/[^a-z0-9]/g, '');

/* ---------- Destinations : chaque fichier est rangé dans SES données (jamais dans le budget par erreur) ---------- */
const txt12 = v => String(v == null ? '' : v).trim();
const absAmt12 = v => { const a = parseAmount12(v); return a == null ? 0 : Math.abs(a); };
function time12(v) {
  if (v == null || v === '') return '';
  if (Object.prototype.toString.call(v) === '[object Date]') return isNaN(v) ? '' : String(v.getHours()).padStart(2, '0') + ':' + String(v.getMinutes()).padStart(2, '0');
  if (typeof v === 'number') { if (v >= 0 && v < 1) { const m = Math.round(v * 1440); return String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); } return ''; }
  const m = String(v).match(/(\d{1,2})\s*[h:]\s*(\d{2})?/i); return m && +m[1] < 24 ? String(+m[1]).padStart(2, '0') + ':' + (m[2] || '00') : '';
}
const oneOf12 = (v, opts, dflt) => { const k = nrm(txt12(v)); return opts.find(o => nrm(o) === k) || (k && opts.find(o => nrm(o).startsWith(k))) || dflt; };
const DEST = {
  finances: { label: 'Budget & finances (écritures)', coll: 'finances' },
  projets: {
    label: 'Projets', coll: 'projets', req: 'nom',
    fields: [['nom', 'Nom du projet *', ['nom', 'projet', 'nomduprojet', 'intitule', 'titre', 'name', 'project', 'designation']], ['statut', 'Statut', ['statut', 'etat', 'status', 'phase']], ['echeance', 'Échéance', ['echeance', 'datefin', 'fin', 'deadline', 'datelimite', 'livraison', 'date']], ['budget', 'Budget', ['budget', 'cout', 'coutestime', 'montant', 'budgetprevu']], ['depense', 'Dépensé', ['depense', 'depenses', 'realise', 'engage', 'consomme', 'coutreel']], ['taches', 'Tâches', ['taches', 'tache', 'etapes', 'actions']], ['note', 'Note', ['note', 'notes', 'remarque', 'commentaire', 'description', 'observation']]],
    build: c => { const nom = txt12(c('nom')); if (!nom) return null; const s = nrm(txt12(c('statut')));
      return { nom, statut: /termin|fini|clos|done|achev|livre/.test(s) ? 'Terminé' : /pause|suspen|attente|bloqu/.test(s) ? 'En pause' : /idee|futur|a venir/.test(s) ? 'Idée' : 'En cours', echeance: parseDate12(c('echeance')) || '', budget: absAmt12(c('budget')), depense: absAmt12(c('depense')), taches: txt12(c('taches')), note: txt12(c('note')) }; },
    dk: r => nrm(r.nom), why: 'nom du projet absent',
    cols: [['Projet', r => r.nom], ['Statut', r => r.statut], ['Échéance', r => r.echeance], ['Budget', r => r.budget ? fmt12(r.budget) : '']]
  },
  taches: {
    label: 'Tâches à faire', coll: 'taches', req: 'titre',
    fields: [['titre', 'Tâche *', ['tache', 'taches', 'titre', 'intitule', 'action', 'libelle', 'description', 'todo', 'nom', 'afaire', 'objet']], ['echeance', 'Échéance', ['echeance', 'date', 'datelimite', 'deadline', 'pour', 'dateecheance']], ['heure', 'Heure', ['heure', 'horaire', 'time']], ['priorite', 'Priorité', ['priorite', 'urgence', 'priority', 'importance']], ['statut', 'Statut', ['statut', 'etat', 'fait', 'status', 'avancement']], ['cat', 'Catégorie', ['categorie', 'category', 'type', 'projet', 'domaine']], ['note', 'Notes', ['note', 'notes', 'remarque', 'commentaire', 'observation']]],
    build: c => { const titre = txt12(c('titre')); if (!titre) return null; const s = nrm(txt12(c('statut'))), p = nrm(txt12(c('priorite')));
      return { titre, echeance: parseDate12(c('echeance')) || '', heure: time12(c('heure')), priorite: /haut|urgent|high|critique|^1$/.test(p) ? 'Haute' : /bas|low|faible|^3$/.test(p) ? 'Basse' : 'Moyenne', statut: /^(fait|oui|ok|x|vrai|true)$|termin|done|complet|clos|✓|✔/.test(s) ? 'Fait' : /cours|progress|demarr/.test(s) ? 'En cours' : 'À faire', cat: oneOf12(c('cat'), ['Personnel', 'Travail', 'Finances', 'Santé', 'Projet', 'Famille'], 'Personnel'), repete: 'Aucune', note: txt12(c('note')) }; },
    dk: r => nrm(r.titre) + '|' + r.echeance, why: 'intitulé de la tâche absent',
    cols: [['Tâche', r => r.titre], ['Échéance', r => r.echeance], ['Priorité', r => r.priorite], ['Statut', r => r.statut]]
  },
  planning: {
    label: 'Planning (événements)', coll: 'planning', req: 'titre',
    fields: [['titre', 'Événement *', ['evenement', 'titre', 'intitule', 'objet', 'rdv', 'rendezvous', 'activite', 'nom', 'libelle', 'description']], ['date', 'Date *', ['date', 'jour', 'le', 'datedebut', 'quand']], ['heure', 'Début', ['heure', 'debut', 'heuredebut', 'horaire', 'de']], ['fin', 'Fin', ['fin', 'heurefin', 'a', 'jusqua']], ['lieu', 'Lieu', ['lieu', 'endroit', 'adresse', 'salle', 'place']], ['cat', 'Catégorie', ['categorie', 'category', 'type']], ['note', 'Notes', ['note', 'notes', 'remarque', 'commentaire', 'observation']]],
    build: c => { const titre = txt12(c('titre')), date = parseDate12(c('date')); if (!titre || !date) return null;
      return { titre, date, heure: time12(c('heure')), fin: time12(c('fin')), lieu: txt12(c('lieu')), cat: oneOf12(c('cat'), (typeof EVC !== 'undefined' ? EVC : ['Rendez-vous']), 'Rendez-vous'), repete: 'Aucune', jusqua: '', note: txt12(c('note')) }; },
    dk: r => r.date + '|' + r.heure + '|' + nrm(r.titre), why: 'titre ou date illisible',
    cols: [['Date', r => r.date], ['Heure', r => r.heure], ['Événement', r => r.titre], ['Lieu', r => r.lieu]]
  },
  notes: {
    label: 'Notes & idées', coll: 'notes', req: 'titre',
    fields: [['titre', 'Titre', ['titre', 'idee', 'note', 'sujet', 'nom', 'objet', 'intitule']], ['cat', 'Catégorie', ['categorie', 'category', 'type', 'nature']], ['texte', 'Contenu', ['texte', 'contenu', 'description', 'detail', 'details', 'commentaire', 'remarque', 'notes']], ['date', 'Date', ['date', 'creele', 'datecreation', 'jour']]],
    build: c => { let titre = txt12(c('titre')); const texte = txt12(c('texte')); if (!titre && !texte) return null; if (!titre) titre = texte.slice(0, 60); const d = parseDate12(c('date'));
      const r = { titre, cat: oneOf12(c('cat'), ['Idée', 'Note', 'Réunion', 'À faire'], 'Idée'), texte }; if (d) r.created = d + 'T12:00:00.000Z'; return r; },
    dk: r => nrm(r.titre) + '|' + nrm(r.texte).slice(0, 60), why: 'titre et contenu absents',
    cols: [['Titre', r => r.titre], ['Catégorie', r => r.cat], ['Contenu', r => (r.texte || '').slice(0, 70)]]
  },
  journal: {
    label: 'Journal', coll: 'journal', req: 'date',
    fields: [['date', 'Date *', ['date', 'jour', 'le']], ['reussi', 'J’ai réussi…', ['reussi', 'reussite', 'reussites', 'succes', 'texte', 'contenu', 'journal', 'entree', 'note', 'notes', 'description']], ['appris', 'J’ai appris…', ['appris', 'apprentissage', 'lecon', 'lecons']], ['demain', 'Demain je dois…', ['demain', 'priorite', 'aufaire', 'prochainesetapes']]],
    build: c => { const date = parseDate12(c('date')); if (!date) return null; const r = { date, reussi: txt12(c('reussi')), appris: txt12(c('appris')), demain: txt12(c('demain')) }; return r.reussi || r.appris || r.demain ? r : null; },
    dk: r => r.date, why: 'date illisible ou entrée vide',
    cols: [['Date', r => r.date], ['Réussi', r => (r.reussi || '').slice(0, 50)], ['Appris', r => (r.appris || '').slice(0, 40)], ['Demain', r => (r.demain || '').slice(0, 40)]]
  }
};
const curFields = () => IM.dest === 'finances' ? FIELDS12 : DEST[IM.dest].fields;
/* devine la destination d'après le nom du fichier / de la feuille, puis les en-têtes */
const NAMEHINT = [['projets', /projet|project/], ['taches', /tache|task|todo|a faire/], ['planning', /planning|agenda|calendrier|evenement|rendez|rdv/], ['journal', /journal|diary/], ['notes', /\bnotes?\b|idee|ideas?/], ['finances', /budget|financ|transaction|ecriture|releve|operation|depense|revenu|compte/]];
function guessDest(name, sheet) {
  const nm = nrm((name || '') + ' ' + (sheet || ''));
  for (const [d, re] of NAMEHINT) if (re.test(nm)) return d;
  const keys = new Set(); IM.aoa.slice(0, 12).forEach(r => r.forEach(c => { const k = key12(c); if (k && !/^\d+(\.\d+)?$/.test(k)) keys.add(k); }));
  const has = a => a.filter(x => keys.has(x)).length;
  const fin = has(['montant', 'debit', 'credit', 'libelle', 'categorie', 'depense', 'revenu']);
  const sc = { projets: has(['projet', 'nomduprojet', 'echeance', 'avancement', 'taches', 'budget', 'depense']), taches: has(['tache', 'priorite', 'echeance', 'fait', 'statut']), planning: has(['evenement', 'heure', 'lieu', 'debut', 'fin']), journal: has(['reussi', 'appris', 'demain', 'journal']), notes: has(['idee', 'contenu', 'sujet', 'texte']) };
  const best = Object.entries(sc).sort((a, b) => b[1] - a[1])[0];
  return best && best[1] >= 2 && best[1] > fin ? best[0] : 'finances';
}

function loadSheetJS() {
  if (window.XLSX) return Promise.resolve(window.XLSX);
  return new Promise((ok, ko) => {
    const s = document.createElement('script'); s.src = 'vendor/xlsx.full.min.js';
    s.onload = () => window.XLSX ? ok(window.XLSX) : ko(new Error('Bibliothèque Excel introuvable'));
    s.onerror = () => ko(new Error('Bibliothèque Excel indisponible (hors-ligne avant le premier chargement ?)'));
    document.head.appendChild(s);
  });
}
function detectDelim(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim()).slice(0, 12);
  let best = ';', bs = -1;
  [';', '\t', ',', '|'].forEach(d => {
    const counts = lines.map(l => { let n = 0, q = false; for (const ch of l) { if (ch === '"') q = !q; else if (ch === d && !q) n++; } return n; });
    if (!counts.length || !counts[0]) return;
    const same = counts.filter(c => c === counts[0]).length, score = same * 10 + counts[0];
    if (score > bs) { bs = score; best = d; }
  });
  return best;
}
function parseDelim(text, d) {
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
    else if (ch === '"') q = true;
    else if (ch === d) { row.push(cur); cur = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cur); cur = ''; if (row.some(c => c.trim() !== '')) rows.push(row); row = []; }
    else cur += ch;
  }
  row.push(cur); if (row.some(c => c.trim() !== '')) rows.push(row);
  return rows;
}
function decodeText(buf) {
  let t = new TextDecoder('utf-8').decode(buf);
  if (t.includes('�')) { try { t = new TextDecoder('windows-1252').decode(buf); } catch (e) { } }
  return t.replace(/^﻿/, '');
}
function jsonToAoa(j) {
  if (!Array.isArray(j)) {
    const k = Object.keys(j || {}).find(x => Array.isArray(j[x]) && j[x].length && typeof j[x][0] === 'object' && /financ|transac|oper|ecriture|mouvement/i.test(x)) || Object.keys(j || {}).find(x => Array.isArray(j[x]) && j[x].length && typeof j[x][0] === 'object');
    if (!k) throw new Error('JSON : aucune liste d’enregistrements trouvée');
    j = j[k];
  }
  if (j.length && Array.isArray(j[0])) return j;
  const keys = []; j.forEach(o => Object.keys(o || {}).forEach(k => { if (!keys.includes(k)) keys.push(k); }));
  return [keys, ...j.map(o => keys.map(k => { const v = (o || {})[k]; return v != null && typeof v === 'object' ? JSON.stringify(v) : v; }))];
}
function aoaFromSheet(ws) { return XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '', blankrows: false }); }
/* ---------- Adaptation automatique : nettoyage de texte, tolérance aux fautes ---------- */
/* répare l'encodage cassé (Ã© → é), espaces spéciaux, caractères invisibles, espaces multiples */
function clean12(v) {
  if (v == null) return '';
  let s = String(v), o = s;
  if (/[ÃÂ][\u0080-¿]|â€/.test(s)) { try { const r = decodeURIComponent(escape(s)); if (r && !r.includes('�')) s = r; } catch (e) { } }
  s = s.replace(/[  -   　]/g, ' ').replace(/[​-‍⁠﻿]/g, '').replace(/[“”«»]/g, '"').replace(/[‘’`´]/g, "'").replace(/\s+/g, ' ').trim();
  if (s !== o.trim()) fix12('texte');
  return s;
}
const fix12 = k => { IM.fx[k] = (IM.fx[k] || 0) + 1; };
const FIXLABEL = { texte: 'texte nettoyé (espaces, encodage)', cat: 'catégories rapprochées (fautes, casse, accents)', type: 'types de flux déduits ou corrigés', statut: 'statuts corrigés', date: 'dates reconstituées', fill: 'dates reprises de la ligne précédente', signe: 'montants interprétés (signe, CR/DB, devise)', total: 'lignes de total ignorées', lib: 'libellés complétés' };
/* distance d'édition (Levenshtein) */
function lev12(a, b) {
  if (a === b) return 0; if (!a.length) return b.length; if (!b.length) return a.length;
  let p = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const c = [i];
    for (let j = 1; j <= b.length; j++) c[j] = Math.min(p[j] + 1, c[j - 1] + 1, p[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    p = c;
  }
  return p[b.length];
}
const tol12 = n => n <= 3 ? 0 : n <= 6 ? 1 : 2;
const near12 = (a, b) => { if (!a || !b) return false; if (a === b) return true; const t = tol12(Math.min(a.length, b.length)); return t > 0 && Math.abs(a.length - b.length) <= t && lev12(a, b) <= t; };
/* un mot proche d'un des mots-clés ? (fautes de frappe : « revnu », « depence », « epagne ») */
const nearAny12 = (txt, words) => nrm(txt).split(/[^a-z0-9]+/).filter(w => w.length >= 4).some(w => words.some(k => near12(w, k)));
/* « alimentaton » → « Alimentation » ; « SANTE » → « Santé » (via catégories connues) ; sinon majuscule initiale */
function pretty12(s) {
  s = String(s || '').trim(); if (!s) return s;
  if (s === s.toUpperCase() && /[A-ZÀ-Ý]/.test(s) || s === s.toLowerCase()) s = s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  return s;
}
function sniffKind(buf, ext) {
  const u = new Uint8Array(buf.slice(0, 8));
  if (u[0] === 0x50 && u[1] === 0x4b) return 'xlsx';                                    /* zip : xlsx, ods… */
  if (u[0] === 0xd0 && u[1] === 0xcf && u[2] === 0x11) return 'xls';                    /* OLE : ancien .xls */
  if (u[0] === 0x25 && u[1] === 0x50 && u[2] === 0x44 && u[3] === 0x46) return 'pdf';  /* %PDF */
  if (['xlsx', 'xls', 'xlsm', 'xlsb', 'ods'].includes(ext)) return 'xlsx';
  return 'text';
}
function htmlToAoa(t) {
  const d = new DOMParser().parseFromString(t, 'text/html'), tabs = [...d.querySelectorAll('table')];
  if (!tabs.length) throw new Error('HTML : aucun tableau trouvé');
  const best = tabs.sort((a, b) => b.rows.length - a.rows.length)[0];
  return [...best.rows].map(r => [...r.cells].map(c => c.textContent.trim()));
}
/* texte aligné en colonnes (espaces multiples) ou une valeur par ligne séparée par espaces */
function parseSmart(t) {
  const lines = t.split(/\r?\n/).filter(l => l.trim());
  const d = detectDelim(t), hasD = lines.slice(0, 12).some(l => l.includes(d));
  if (hasD) return parseDelim(t, d);
  const rows = lines.map(l => l.trim().split(/\s{2,}|\t/));
  if (rows.some(r => r.length > 1)) return rows;
  return lines.map(l => l.trim().split(/\s+/));
}
async function readFile12(file) {
  IM.error = ''; IM.name = file.name; IM.wb = null; IM.sheets = []; IM.sheet = ''; IM.last = null; IM.fx = {}; IM.off = new Set(); IM.dest = 'finances';
  const ext = (file.name.split('.').pop() || '').toLowerCase(), buf = await file.arrayBuffer(), kind = sniffKind(buf, ext);
  if (kind === 'pdf') throw new Error('PDF : le texte d’un PDF n’est pas lisible de façon fiable. Exportez-le en CSV ou Excel (ou copiez le tableau dans le champ « Coller » ci-dessus).');
  if (kind === 'xlsx' || kind === 'xls') {
    await loadSheetJS();
    IM.wb = XLSX.read(buf, { type: 'array', cellDates: true });
    IM.sheets = IM.wb.SheetNames.slice();
    /* choisit l'onglet qui ressemble le plus à une liste de transactions (date + montant lisibles) */
    let bestS = IM.sheets[0], bestN = -1;
    const nh = NAMEHINT.find(([, re]) => re.test(nrm(file.name)));
    if (nh && nh[0] !== 'finances') { bestN = 1e9; bestS = IM.sheets.find(n => nh[1].test(nrm(n))) || IM.sheets[0]; }   /* fichier « projet », « tâches »… : pas de recherche d'onglet « transactions » */
    IM.sheets.forEach(n => {
      if (bestN === 1e9) return;
      try {
        const a = aoaFromSheet(IM.wb.Sheets[n]).filter(r => r.some(c => String(c == null ? '' : c).trim() !== ''));
        if (!a.length) return;
        IM.aoa = a; autoDetect();
        const M = IM.map; if (M.date == null || (M.montant == null && M.debit == null && M.credit == null)) return;
        let k = 0; a.slice(IM.hdr + 1, IM.hdr + 400).forEach(r => { if (parseDate12(r[M.date]) && [M.montant, M.debit, M.credit].some(c => c != null && parseAmount12(r[c]))) k++; });
        if (k > bestN) { bestN = k; bestS = n; }
      } catch (e) { }
    });
    IM.sheet = bestS; IM.aoa = aoaFromSheet(IM.wb.Sheets[IM.sheet]);
  } else {
    textToAoa(decodeText(buf), ext);
  }
  finishRead();
}
function textToAoa(t, ext) {
  t = t.replace(/^﻿/, '');
  if (ext === 'html' || ext === 'htm' || /^\s*<(!doctype|html|table)/i.test(t)) { IM.aoa = htmlToAoa(t); return; }
  if (/^\s*[\[{]/.test(t)) {
    try { IM.aoa = jsonToAoa(JSON.parse(t)); return; } catch (e) { }
    /* JSON lignes (NDJSON) */
    try { const arr = t.split(/\r?\n/).filter(l => l.trim()).map(l => JSON.parse(l)); IM.aoa = jsonToAoa(arr); return; } catch (e) { }
  }
  IM.aoa = parseSmart(t);
}
function finishRead() {
  IM.aoa = IM.aoa.filter(r => r.some(c => String(c == null ? '' : c).trim() !== ''));
  if (!IM.aoa.length) throw new Error('Le fichier est vide');
  /* lignes plus courtes que l'en-tête (cellules vides en fin de ligne) : complétées pour garder l'alignement */
  const w = Math.max(...IM.aoa.slice(0, 50).map(r => r.length));
  IM.aoa = IM.aoa.map(r => r.length < w ? r.concat(Array(w - r.length).fill('')) : r);
  IM.dest = guessDest(IM.name === 'Texte collé' ? '' : IM.name, IM.sheet);
  autoDetect();
}
function readPasted(text) {
  IM.error = ''; IM.name = 'Texte collé'; IM.wb = null; IM.sheets = []; IM.sheet = ''; IM.last = null; IM.fx = {}; IM.off = new Set(); IM.dest = 'finances';
  textToAoa(text, '');
  finishRead();
}
function pickSheet(name) {
  IM.sheet = name; IM.aoa = aoaFromSheet(IM.wb.Sheets[name]).filter(r => r.some(c => String(c == null ? '' : c).trim() !== ''));
  IM.last = null; IM.off = new Set();
  const nh = NAMEHINT.find(([, re]) => re.test(nrm(name))); if (nh) IM.dest = nh[0];
  autoDetect();
}

/* ---------- Détection des colonnes ---------- */
function headerScore(row) {
  let s = 0; row.forEach(c => { const k = key12(c); if (!k || /^\d+(\.\d+)?$/.test(k)) return; if (curFields().some(f => f[2].includes(k))) s += 3; else if (typeof c === 'string' && c.trim()) s += 1; });
  return s;
}
function autoDetect() {
  let best = 0, bs = -1;
  IM.aoa.slice(0, 12).forEach((r, i) => { const s = headerScore(r) - (r.filter(c => typeof c === 'number').length * 2); if (s > bs) { bs = s; best = i; } });
  IM.hdr = best; remap();
}
function headers12() { const seen = {}; return (IM.aoa[IM.hdr] || []).map((h, i) => { let n = String(h == null ? '' : h).trim() || 'Colonne ' + (i + 1); if (seen[n]) n += ' (' + (++seen[n]) + ')'; else seen[n] = 1; return n; }); }
function remap() {
  const H = headers12(), map = {}, used = new Set();
  curFields().forEach(([f, , syn]) => {
    let ix = H.findIndex((h, i) => !used.has(i) && syn.includes(key12(h)));
    if (ix < 0) ix = H.findIndex((h, i) => !used.has(i) && syn.some(s => s.length > 3 && key12(h).includes(s)));
    /* en-tête avec une faute de frappe (« montan », « libelé », « catgorie ») */
    if (ix < 0) ix = H.findIndex((h, i) => !used.has(i) && key12(h).length > 3 && syn.some(s => s.length > 3 && near12(key12(h), s)));
    if (ix >= 0) { map[f] = ix; used.add(ix); }
  });
  if (IM.dest !== 'finances') {
    /* destinations hors budget : le champ principal retombe sur la première colonne de texte, la date sur la première colonne de dates */
    const rows = IM.aoa.slice(IM.hdr + 1, IM.hdr + 21), F = curFields().map(f => f[0]);
    if (F.includes('date') && map.date == null) { const c = H.findIndex((h, i) => !used.has(i) && rows.length && rows.filter(r => parseDate12(r[i])).length / rows.length > .7); if (c >= 0) { map.date = c; used.add(c); } }
    const main = F[0]; if (main !== 'date' && map[main] == null) { const c = H.findIndex((h, i) => !used.has(i) && rows.some(r => typeof r[i] === 'string' && r[i].trim().length > 2)); if (c >= 0) { map[main] = c; used.add(c); } }
    IM.map = map; IM.last = null; detectDateOrder(); return;
  }
  /* aucune colonne « date » nommée : première colonne dont les valeurs ressemblent à des dates */
  if (map.date == null) {
    const rows = IM.aoa.slice(IM.hdr + 1, IM.hdr + 21);
    for (let c = 0; c < H.length; c++) { if (used.has(c)) continue; const ok = rows.filter(r => parseDate12(r[c])).length; if (rows.length && ok / rows.length > .7) { map.date = c; used.add(c); break; } }
  }
  if (map.montant == null && map.debit == null && map.credit == null) {
    const rows = IM.aoa.slice(IM.hdr + 1, IM.hdr + 21);
    for (let c = 0; c < H.length; c++) { if (used.has(c)) continue; const ok = rows.filter(r => parseAmount12(r[c]) != null).length; if (rows.length && ok / rows.length > .7) { map.montant = c; used.add(c); break; } }
  }
  if (map.libelle == null) { const c = H.findIndex((h, i) => !used.has(i) && IM.aoa.slice(IM.hdr + 1, IM.hdr + 11).some(r => typeof r[i] === 'string' && r[i].trim().length > 2)); if (c >= 0) map.libelle = c; }
  IM.map = map; IM.last = null;
  detectDateOrder();
}
/* jour/mois ou mois/jour : tranché par les valeurs non ambiguës de la colonne (ex. 25/03 → jour en premier) */
function detectDateOrder() {
  IM.dm = 'dmy'; if (IM.map.date == null) return;
  let a = 0, b = 0;
  IM.aoa.slice(IM.hdr + 1, IM.hdr + 400).forEach(r => {
    const v = r[IM.map.date]; if (typeof v !== 'string') return;
    const m = v.match(/(?:^|\D)(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4}|\d{2})(?!\d)/); if (!m) return;
    if (+m[1] > 12) a++; else if (+m[2] > 12) b++;
  });
  if (b > a) IM.dm = 'mdy';
}

/* ---------- Valeurs ---------- */
const MOIS12 = { janv: 1, janvier: 1, jan: 1, fevr: 2, fevrier: 2, fev: 2, mars: 3, mar: 3, avr: 4, avril: 4, mai: 5, juin: 6, juil: 7, juillet: 7, aout: 8, sept: 9, septembre: 9, sep: 9, oct: 10, octobre: 10, nov: 11, novembre: 11, dec: 12, decembre: 12 };
Object.assign(MOIS12, { jan: 1, january: 1, feb: 2, february: 2, march: 3, apr: 4, april: 4, may: 5, june: 6, jun: 6, july: 7, jul: 7, aug: 8, august: 8, september: 9, october: 10, november: 11, december: 12, janeiro: 1, fevereiro: 2, marco: 3, abril: 4, maio: 5, junho: 6, julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12, enero: 1, febrero: 2, marzo: 3, mayo: 5, junio: 6, julio: 7, septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12 });
/* nom de mois, avec tolérance aux fautes (« fevrier », « decembe ») */
function monthOf12(w) {
  if (MOIS12[w]) return MOIS12[w];
  if (w.length < 5) return 0;
  const k = Object.keys(MOIS12).find(x => x.length >= 5 && near12(w, x)); return k ? MOIS12[k] : 0;
}
const ymd12 = (y, m, d) => { y = +y; m = +m; d = +d; if (y < 100) y += 2000; if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1990 || y > 2100) return null; return y + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0'); };
function parseDate12(v) {
  if (v == null || v === '') return null;
  if (Object.prototype.toString.call(v) === '[object Date]') { if (isNaN(v)) return null; const d = new Date(v.getTime() + 30000); return ymd12(d.getFullYear(), d.getMonth() + 1, d.getDate()); }
  if (typeof v === 'number') { if (v > 20000 && v < 80000) { const d = new Date(Math.round((v - 25569) * 86400000)); return ymd12(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()); } return null; }
  const s = String(v).replace(/[  ]/g, ' ').trim(); let m;
  if ((m = s.match(/(?:^|\D)(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})(?!\d)/))) return ymd12(m[1], m[2], m[3]);
  if ((m = s.match(/(?:^|\D)(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4}|\d{2})(?!\d)/))) { const mdy = IM.dm === 'mdy'; return +m[1] > 12 ? ymd12(m[3], m[2], m[1]) : +m[2] > 12 ? ymd12(m[3], m[1], m[2]) : mdy ? ymd12(m[3], m[1], m[2]) : ymd12(m[3], m[2], m[1]); }
  const ns = nrm(s);
  if ((m = ns.match(/(?:^|[^a-z0-9])(\d{1,2})(?:er|st|nd|rd|th)?\s*(?:de\s+|d')?([a-z]+)\.?,?\s+(\d{4}|\d{2})(?!\d)/)) && monthOf12(m[2])) return ymd12(m[3], monthOf12(m[2]), m[1]);
  /* « March 5, 2024 », « mars 2024 » (→ 1er du mois) */
  if ((m = ns.match(/(?:^|[^a-z0-9])([a-z]+)\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})(?!\d)/)) && monthOf12(m[1])) return ymd12(m[3], monthOf12(m[1]), m[2]);
  if ((m = ns.match(/^([a-z]+)\.?\s+(\d{4})$/)) && monthOf12(m[1])) return ymd12(m[2], monthOf12(m[1]), 1);
  if (/^\d{5}(\.\d+)?$/.test(s)) return parseDate12(parseFloat(s));
  return null;
}
function parseAmount12(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return isFinite(v) ? v : null;
  if (Object.prototype.toString.call(v) === '[object Date]') return null;
  let s = String(v).trim(); if (!s) return null;
  let neg = /^\(.*\)$/.test(s) || /^-/.test(s) || /-$/.test(s) || /^−/.test(s) || /\bdb\b|débit/i.test(s);
  neg = neg || /^−|^–|^—/.test(s);
  let mult = 1; if (/^[^a-z]*\d[\d\s.,]*\s*k\b/i.test(s)) mult = 1000; else if (/^[^a-z]*\d[\d\s.,]*\s*(m|mio|million)s?\b/i.test(s)) mult = 1e6;
  if (/[a-z]{3,}/i.test(s.replace(/fcfa|xof|cfa|eur|usd|mad|gnf|xaf|francs?|euros?|dollars?|million|mio|d[ée]bit|cr[ée]dit/gi, ''))) return null;   /* « 12 janvier », « abc » : pas un montant */
  s = s.replace(/[^\d.,]/g, ''); if (!/\d/.test(s)) return null;
  const lc = s.lastIndexOf(','), ld = s.lastIndexOf('.');
  if (lc >= 0 && ld >= 0) s = lc > ld ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  else if (lc >= 0) s = (s.match(/,/g).length === 1 && /,\d{1,2}$/.test(s)) ? s.replace(',', '.') : s.replace(/,/g, '');
  else if (ld >= 0 && (s.match(/\./g).length > 1 || /\.\d{3}$/.test(s))) s = s.replace(/\./g, '');
  const n = parseFloat(s) * mult; return isFinite(n) ? (neg ? -n : n) : null;
}
const T_REV = /revenu|recette|entree|salaire|credit|income|encaiss|produit|vente|prime/, T_EPA = /epargne|invest|bourse|saving|placement|brvm/, T_FIX = /fixe/, T_OCC = /occasion|exception/, T_DEP = /depense|sortie|debit|charge|achat|paiement|expense|decaiss/;
const W_EPA = ['epargne', 'investissement', 'bourse', 'saving', 'savings', 'placement', 'brvm'], W_REV = ['revenu', 'revenus', 'recette', 'recettes', 'entree', 'salaire', 'credit', 'income', 'encaissement', 'produit', 'vente', 'prime'],
  W_FIX = ['fixe', 'fixed'], W_OCC = ['occasionnelle', 'occasionnel', 'exceptionnelle', 'exception'], W_DEP = ['depense', 'depenses', 'sortie', 'debit', 'charge', 'charges', 'achat', 'paiement', 'expense', 'decaissement', 'variable'];
function typeFromText(t) {
  const s = nrm(t || ''); if (!s) return '';
  if (T_EPA.test(s)) return 'Épargne'; if (T_REV.test(s)) return 'Revenu'; if (T_FIX.test(s)) return 'Dépense Fixe'; if (T_OCC.test(s)) return 'Dépense Occasionnelle'; if (T_DEP.test(s)) return 'Dépense Variable';
  /* fautes de frappe : « revnu », « depence fixe », « epagne » */
  if (nearAny12(s, W_EPA)) return 'Épargne'; if (nearAny12(s, W_REV)) return 'Revenu';
  const dep = nearAny12(s, W_DEP);
  if (nearAny12(s, W_FIX)) return 'Dépense Fixe'; if (nearAny12(s, W_OCC)) return 'Dépense Occasionnelle'; if (dep) return 'Dépense Variable';
  return '';
}
function statusFrom(t, dflt) {
  const s = nrm(t || ''); if (!s) return dflt;
  if (/attente|prevu|planifi|pending|a venir|todo|a payer/.test(s) || nearAny12(s, ['attente', 'prevu', 'pending', 'planifie'])) return '⏳ En attente';
  if (/annul|cancel/.test(s) || nearAny12(s, ['annule', 'cancelled'])) return '❌ Annulé';
  if (/auto|permanent|recurr/.test(s) || nearAny12(s, ['automatique', 'permanent'])) return '🔁 Automatique';
  return '✅ Payé';
}

/* ---------- Conversion ---------- */
function convertOther() {
  const D = DEST[IM.dest], rows = IM.aoa.slice(IM.hdr + 1), M = IM.map, cell = r => f => M[f] == null ? '' : r[M[f]];
  const exist = new Set(list(D.coll).map(D.dk)), seen = new Set(), ok = [], bad = [], dup = [];
  IM.fx = {};
  rows.forEach((r, ix) => {
    r = r.map(c => typeof c === 'string' ? clean12(c) : c);
    const rec = D.build(cell(r));
    if (!rec) { if (r.some(c => String(c).trim() !== '')) bad.push({ n: IM.hdr + ix + 2, why: D.why }); return; }
    const k = D.dk(rec);
    if (IM.opts.skipDup && (exist.has(k) || seen.has(k))) { dup.push(rec); return; }
    seen.add(k); ok.push({ ...rec, _ix: ix });
  });
  IM.last = { fx: { ...IM.fx }, ok, bad, dup, newCats: [], rev: 0, epa: 0, dep: 0, total: rows.length };
  return IM.last;
}
function convert() {
  if (IM.dest !== 'finances') return convertOther();
  const rows = IM.aoa.slice(IM.hdr + 1), M = IM.map, o = IM.opts, cell = (r, f) => M[f] == null ? '' : r[M[f]];
  const hasNeg = rows.some(r => { const a = parseAmount12(cell(r, 'montant')); return a != null && a < 0; });
  const exist = new Set(list('finances').map(i => [i.date, i.type, nrm(i.libelle || ''), num(i.montant)].join('|')));
  const catIdx = new Map(list('categories').map(c => [nrm(c.nom), c]));
  const ok = [], bad = [], dup = [], newCats = new Map();
  IM.fx = {}; let lastDate = null;
  /* rapproche un nom de catégorie d'une catégorie connue ou déjà vue dans le fichier (casse, accents, pluriel, fautes) */
  const seen = new Map();
  const matchCat = name => {
    const k = nrm(name), sg = k.replace(/s$/, '');
    let c = catIdx.get(k) || catIdx.get(sg) || catIdx.get(k + 's');
    if (!c) { const f = [...catIdx.keys()].find(x => near12(k, x)); if (f) c = catIdx.get(f); }
    if (c) { if (nrm(c.nom) !== k || c.nom !== name) fix12('cat'); return c.nom; }
    if (seen.has(k)) return seen.get(k);
    const f = [...seen.keys()].find(x => near12(k, x) || x.replace(/s$/, '') === sg);
    if (f) { fix12('cat'); return seen.get(f); }
    const p = pretty12(name); if (p !== name) fix12('cat'); seen.set(k, p); return p;
  };
  rows.forEach((r, ix) => {
    r = r.map(c => typeof c === 'string' ? clean12(c) : c);
    const lib0 = String(cell(r, 'libelle') == null ? '' : cell(r, 'libelle'));
    /* lignes de total / solde / report : jamais importées */
    const first = r.find(c => typeof c === 'string' && c.trim());
    if (first && /^(sous[- ]?)?total|^solde|^report|^cumul|^somme\b/.test(nrm(first)) && !parseDate12(cell(r, 'date'))) { fix12('total'); return; }
    let date = parseDate12(cell(r, 'date'));
    if (date) lastDate = date;
    else if (lastDate && (cell(r, 'date') === '' || cell(r, 'date') == null) && (lib0 || cell(r, 'montant') !== '' || (M.debit != null && r[M.debit] !== '') || (M.credit != null && r[M.credit] !== ''))) { date = lastDate; fix12('fill'); }
    let amt = null, dir = '';
    const deb = M.debit != null ? parseAmount12(r[M.debit]) : null, cre = M.credit != null ? parseAmount12(r[M.credit]) : null;
    if ((deb && Math.abs(deb) > 0) || (cre && Math.abs(cre) > 0)) { if (cre && Math.abs(cre) > 0 && !(deb && Math.abs(deb) > 0)) { amt = Math.abs(cre); dir = 'rev'; } else { amt = Math.abs(deb); dir = 'dep'; } }
    else if (M.montant != null) { const a = parseAmount12(r[M.montant]); if (a != null) { amt = Math.abs(a); dir = a < 0 ? 'dep' : 'pos'; } }
    const lib = String(cell(r, 'libelle') == null ? '' : cell(r, 'libelle')).trim();
    { const dr = cell(r, 'date'); if (date && typeof dr === 'string' && dr.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(dr.trim())) fix12('date'); }
    if (!date || amt == null || !amt) { if (r.some(c => String(c).trim() !== '') && (date || amt != null || lib)) bad.push({ n: IM.hdr + ix + 2, why: !date ? 'date illisible' + (M.date == null ? ' – aucune colonne Date détectée' : ' : « ' + String(cell(r, 'date')).slice(0, 25) + ' »') : 'montant absent ou nul' }); return; }
    /* type de flux */
    const rawType = String(cell(r, 'type') || '').trim();
    let type = typeFromText(rawType), catName = String(cell(r, 'cat') == null ? '' : cell(r, 'cat')).trim().replace(/\s+/g, ' ');
    if (catName) catName = matchCat(catName);
    const known = catName ? catIdx.get(nrm(catName)) : null;
    const amtRaw = M.montant != null ? r[M.montant] : (M.debit != null && r[M.debit] !== '' ? r[M.debit] : M.credit != null ? r[M.credit] : '');
    if (typeof amtRaw === 'string' && amtRaw.trim()) fix12('signe');
    if (!type) {
      if (dir === 'rev') type = 'Revenu';
      else if (dir === 'dep') type = 'dep';
      else if (o.sign === 'rev') type = 'Revenu'; else if (o.sign === 'dep') type = 'dep';
      else if (hasNeg) type = 'Revenu';                       /* le fichier utilise le signe : positif = revenu */
      else type = known && known.type ? known.type : (T_REV.test(nrm(lib)) ? 'Revenu' : 'dep');
    }
    if (type === 'dep') type = known && /^Dépense/.test(known.type || '') ? known.type : 'Dépense Variable';
    else if (/^Dépense/.test(type) && known && /^Dépense/.test(known.type || '') && !typeFromText(String(cell(r, 'type') || '')).match(/Fixe|Occasionnelle/)) type = known.type;
    /* catégorie */
    if (!catName) {
      const g = (typeof AUTRES_RULES !== 'undefined') ? AUTRES_RULES.find(([re]) => re.test(nrm(lib))) : null;
      catName = type === 'Revenu' ? 'Autres revenus' : type === 'Épargne' ? 'Épargne' : (g ? g[1] : 'Imprévus');
    }
    let cat = catIdx.get(nrm(catName)); let catFinal = cat ? cat.nom : catName;
    if (!cat) {
      if (!o.createCats) { catFinal = type === 'Revenu' ? 'Autres revenus' : type === 'Épargne' ? 'Épargne' : 'Imprévus'; }
      else if (!newCats.has(nrm(catName))) newCats.set(nrm(catName), { nom: catName, type, n: 0 });
      if (newCats.has(nrm(catName))) newCats.get(nrm(catName)).n++;
    }
    if (!TYPES.includes(rawType)) fix12('type');
    if (!lib) fix12('lib');
    const stRaw = String(cell(r, 'statut') || '').trim(); const stFin = statusFrom(stRaw, o.status);
    if (stRaw && !STATUTS.includes(stRaw)) fix12('statut');
    const line = { date, type, cat: catFinal, libelle: lib || catFinal, montant: Math.round(amt * 100) / 100, statut: stFin, note: String(cell(r, 'note') || '').trim(), _ix: ix };
    const dk = [line.date, line.type, nrm(line.libelle), line.montant].join('|');
    if (o.skipDup && exist.has(dk)) { dup.push(line); return; }
    ok.push(line);
  });
  const sum = t => ok.filter(l => l.type === t).reduce((s, l) => s + l.montant, 0);
  IM.last = { fx: { ...IM.fx }, ok, bad, dup, newCats: [...newCats.values()], rev: sum('Revenu'), epa: sum('Épargne'), dep: ok.filter(l => /^Dépense/.test(l.type)).reduce((s, l) => s + l.montant, 0), total: rows.length };
  return IM.last;
}

/* ---------- Import ---------- */
function groupFor(c) {
  if (c.type === 'Revenu') return 'Revenus';
  if (c.type === 'Épargne') return /bourse|brvm|action|titre|invest/.test(nrm(c.nom)) ? 'Investissement Bourse' : 'Épargne';
  return typeof inferGroup === 'function' ? inferGroup({ nom: c.nom, type: c.type, groupe: '' }) : 'Besoins';
}
function commitImport() {
  const R = IM.last || convert(), sel = R.ok.filter(l => !IM.off.has(l._ix)); if (!sel.length) { toast('Rien à importer'); return; }
  const batch = 'imp' + Date.now(), now = new Date().toISOString(), addedCats = [], D = DEST[IM.dest], src = 'Import : ' + IM.name;
  if (IM.dest !== 'finances') {
    sel.forEach(({ _ix, ...rec }) => list(D.coll).push({ id: uid(), created: now, ...rec, source: src, importe: true, imp: batch, impDest: IM.dest }));
    save(); const n = sel.length; IM.last = null; IM.aoa = []; IM.name = ''; IM.off = new Set(); render();
    toast(`✔ ${n} ligne(s) importée(s) dans « ${D.label} »`, () => undoImport(batch), '↩ Annuler cet import'); return;
  }
  const usedCats = new Set(sel.map(l => nrm(l.cat)));
  R.newCats.filter(c => usedCats.has(nrm(c.nom))).forEach(c => {
    if (list('categories').some(x => nrm(x.nom) === nrm(c.nom))) return;
    const o = { id: uid(), created: now, nom: c.nom, type: c.type, groupe: groupFor(c), budget: 0, contenu: 'Créée à l’import de « ' + IM.name + ' »', impBatch: batch };
    list('categories').push(o); addedCats.push(o.id);
  });
  sel.forEach(({ _ix, ...l }) => list('finances').push({ id: uid(), created: now, ...l, note: (l.note ? l.note + ' · ' : '') + src, source: src, importe: true, imp: batch, impDest: 'finances' }));
  if (typeof DATA_REV !== 'undefined') DATA_REV++;
  save();
  const n = sel.length; IM.last = null; IM.aoa = []; IM.name = ''; IM.off = new Set();
  render();
  toast(`✔ ${n} écriture(s) importée(s)${addedCats.length ? `, ${addedCats.length} catégorie(s) créée(s)` : ''}`, () => undoImport(batch), '↩ Annuler cet import');
}
function undoImport(batch) {
  let n = 0;
  Object.values(DEST).forEach(D => { const a = list(D.coll); n += a.filter(i => i.imp === batch).length; DB[D.coll] = a.filter(i => i.imp !== batch); });
  DB.categories = list('categories').filter(c => c.impBatch !== batch || list('finances').some(i => i.cat === c.nom));
  if (typeof DATA_REV !== 'undefined') DATA_REV++;
  save(); render(); toast(`↩ Import annulé (${n} écriture(s) retirées)`);
}
const importBatches = () => { const m = new Map(); Object.entries(DEST).forEach(([k, D]) => list(D.coll).forEach(i => { if (i.imp) { const b = m.get(i.imp) || { id: i.imp, n: 0, file: '', dest: D.label }; b.n++; b.file = (i.source || i.note || '').split('Import : ').pop(); m.set(i.imp, b); } })); return [...m.values()].reverse(); };

/* ---------- Données d'exemple d'anciennes versions ---------- */
const isSample = { f: i => /^xl\d+$/.test(String(i.id)), c: c => /^cat\d+b?$/.test(String(c.id)), o: o => /^ob\d+$/.test(String(o.id)) };
const sampleCount = () => list('finances').filter(isSample.f).length + list('categories').filter(isSample.c).length + list('objectifs').filter(isSample.o).length;
function removeSample() {
  const n = sampleCount();
  DB.finances = list('finances').filter(i => !isSample.f(i));
  DB.objectifs = list('objectifs').filter(o => !isSample.o(o));
  /* catégories d'exemple : retirées seulement si plus aucune écriture ne les utilise */
  DB.categories = list('categories').filter(c => !isSample.c(c) || list('finances').some(i => i.cat === c.nom));
  if (typeof DATA_REV !== 'undefined') DATA_REV++;
  save(); render(); toast(`✔ ${n} élément(s) d’exemple supprimés`);
}

/* ---------- Page ---------- */
const fmt12 = n => (typeof fmt === 'function' ? fmt(n) : String(n));
function importPage(el) {
  const R = IM.aoa.length ? (IM.last || convert()) : null, H = IM.aoa.length ? headers12() : [];
  const sel = (f, label) => `<div><label>${label}</label><select data-im="map" data-f="${f}"><option value="">— aucune —</option>${H.map((h, i) => `<option value="${i}" ${IM.map[f] === i ? 'selected' : ''}>${esc(h)}</option>`).join('')}</select></div>`;
  const batches = importBatches(), samples = sampleCount(), isFin = IM.dest === 'finances';
  const nSel = R ? R.ok.filter(l => !IM.off.has(l._ix)).length : 0, SEL = R ? R.ok.filter(l => !IM.off.has(l._ix)) : [];
  const sumSel = f => SEL.filter(f).reduce((s, l) => s + l.montant, 0);
  const prevRows = R ? R.ok.slice(0, 40) : [], DD = DEST[IM.dest];
  const chk = l => `<td><input type="checkbox" data-im="row" data-ix="${l._ix}" ${IM.off.has(l._ix) ? '' : 'checked'} aria-label="Importer cette ligne"></td>`;
  el.innerHTML = `<div class="head"><h1>${ic('upload')} Données & Import</h1></div>
  <div class="card guide"><h2>${ic('bulb')} Intégrer votre propre historique</h2>
   <ol class="steps"><li><b>Choisissez votre fichier</b><span>CSV, TSV ou texte structuré (séparateur détecté), JSON, Excel (.xlsx, .xls, .ods). Le fichier est lu dans votre appareil : rien n’est envoyé sur Internet.</span></li>
   <li><b>Vérifiez la correspondance</b><span>LUMINA reconnaît les colonnes date, libellé, montant (ou débit / crédit), catégorie, type de flux. Corrigez-les au besoin.</span></li>
   <li><b>Contrôlez l’aperçu, puis importez</b><span>Les doublons sont ignorés et l’import reste annulable (bouton du message ou Ctrl+Z).</span></li></ol>
   <div class="drop" id="im-drop" style="border:2px dashed var(--line2);border-radius:14px;padding:22px;text-align:center;margin-top:10px">
     ${ic('file')} <b>${IM.name ? esc(IM.name) : 'Déposez un fichier ici'}</b><br><span class="mute small">ou</span><br>
     <input type="file" id="im-file" accept=".csv,.tsv,.txt,.json,.jsonl,.ndjson,.html,.htm,.xlsx,.xls,.xlsm,.xlsb,.ods,text/*,application/json" style="max-width:340px"></div>
   <details style="margin-top:10px"${IM.paste ? ' open' : ''}><summary class="mute small">…ou collez un tableau (copié depuis Excel, un site, un message)</summary>
     <textarea id="im-paste" rows="5" style="width:100%;margin-top:6px" placeholder="Date;Libellé;Montant&#10;05/03/2024;Courses;-12 500">${esc(IM.paste)}</textarea>
     <p><button class="ghost" data-im="paste">${ic('file')} Analyser le texte collé</button></p></details>
   <p class="mute small">LUMINA corrige automatiquement : encodage et espaces, fautes de frappe (catégories, types, statuts, en-têtes), formats de date et de montant, lignes de total, dates manquantes. Chaque correction est comptée dans l’aperçu.</p>
   ${IM.busy ? '<p class="mute">Lecture du fichier…</p>' : ''}${IM.error ? `<p class="bad">⚠ ${esc(IM.error)}</p>` : ''}</div>
  ${IM.aoa.length ? `<div class="card"><h2>Correspondance des colonnes</h2><div class="fg">
    <div class="full"><label><b>Où ranger ce fichier ?</b></label><select data-im="dest">${Object.entries(DEST).map(([k, d]) => `<option value="${k}" ${k === IM.dest ? 'selected' : ''}>${esc(d.label)}</option>`).join('')}</select>
      <p class="mute small" style="margin:4px 0 0">Choisi automatiquement d’après le nom du fichier et ses colonnes. Un fichier de projets n’alimente jamais le budget.</p></div>
    ${IM.sheets.length > 1 ? `<div><label>Feuille</label><select data-im="sheet">${IM.sheets.map(s => `<option ${s === IM.sheet ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select></div>` : ''}
    <div><label>Ligne d’en-tête</label><select data-im="hdr">${IM.aoa.slice(0, 12).map((r, i) => `<option value="${i}" ${i === IM.hdr ? 'selected' : ''}>Ligne ${i + 1} : ${esc(r.slice(0, 4).map(c => String(c).slice(0, 14)).join(' | '))}</option>`).join('')}</select></div>
    ${curFields().map(([f, l]) => sel(f, l)).join('')}
    ${isFin ? `<div><label>Sens des montants si le fichier ne l’indique pas</label><select data-im="sign"><option value="auto" ${IM.opts.sign === 'auto' ? 'selected' : ''}>Automatique (signe, catégorie)</option><option value="dep" ${IM.opts.sign === 'dep' ? 'selected' : ''}>Tout est une dépense</option><option value="rev" ${IM.opts.sign === 'rev' ? 'selected' : ''}>Tout est un revenu</option></select></div>
    <div><label>Statut par défaut</label><select data-im="status">${STATUTS.map(s => `<option ${s === IM.opts.status ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select></div>` : ''}
    <div class="full">${isFin ? `<label class="chk"><input type="checkbox" data-im="createCats" ${IM.opts.createCats ? 'checked' : ''}> Créer les catégories absentes de LUMINA</label>` : ''}
      <label class="chk"><input type="checkbox" data-im="skipDup" ${IM.opts.skipDup ? 'checked' : ''}> Ignorer les lignes déjà présentes (doublons)</label></div></div></div>
  <div class="card"><h2>Aperçu</h2>
   <p class="small"><b>Destination : ${esc(DD.label)}</b></p>
   <div class="grid"><div class="stat s1"><small>À importer</small><b>${nSel}</b></div>${isFin ? `<div class="stat"><small>Revenus</small><b class="good">${fmt12(sumSel(l => l.type === 'Revenu'))}</b></div><div class="stat"><small>Dépenses</small><b class="warn">${fmt12(sumSel(l => /^Dépense/.test(l.type)))}</b></div><div class="stat"><small>Épargne</small><b>${fmt12(sumSel(l => l.type === 'Épargne'))}</b></div>` : ''}<div class="stat"><small>Doublons ignorés</small><b>${R.dup.length}</b></div><div class="stat"><small>Lignes illisibles</small><b class="${R.bad.length ? 'bad' : ''}">${R.bad.length}</b></div></div>
   ${Object.keys(R.fx).length ? `<p class="small"><b>${ic('bulb')} Corrections automatiques :</b> ${Object.entries(R.fx).filter(([, n]) => n).map(([k, n]) => `<span class="pill">${n} ${esc(FIXLABEL[k] || k)}</span>`).join(' ')}</p>` : ''}
   ${R.newCats.length ? `<p class="small">Catégories qui seront créées : ${R.newCats.map(c => `<span class="pill brand">${esc(c.nom)} (${c.n})</span>`).join(' ')}</p>` : ''}
   ${R.bad.length ? `<p class="small mute">Lignes ignorées : ${R.bad.slice(0, 8).map(b => `n°${b.n} (${b.why})`).join(', ')}${R.bad.length > 8 ? '…' : ''}</p>` : ''}
   ${R.ok.length && !isFin ? `<div class="tw"><table><thead><tr><th>Importer</th>${DD.cols.map(c => `<th>${esc(c[0])}</th>`).join('')}</tr></thead><tbody>${prevRows.map(l => `<tr>${chk(l)}${DD.cols.map(c => `<td>${esc(String(c[1](l) == null ? '' : c[1](l)))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>${R.ok.length > 40 ? `<p class="mute small">… et ${R.ok.length - 40} autre(s) (importées avec le reste).</p>` : ''}
   <p class="small"><button class="ghost" data-im="all">Tout cocher</button> <button class="ghost" data-im="none">Tout décocher</button></p>` : ''}
   ${R.ok.length && isFin ? `<div class="tw"><table><thead><tr><th>Importer</th><th>Date</th><th>Type</th><th>Catégorie</th><th>Libellé</th><th class="num">Montant</th></tr></thead><tbody>${prevRows.map(l => `<tr>${chk(l)}<td>${esc(l.date)}</td><td>${typeof badge === 'function' ? badge(l.type) : esc(l.type)}</td><td>${esc(l.cat)}</td><td>${esc(l.libelle)}</td><td class="num"><b class="${l.type === 'Revenu' ? 'good' : /^Dépense Fixe/.test(l.type) ? 'bad' : /^Dépense/.test(l.type) ? 'warn' : ''}">${l.type === 'Revenu' ? '+' : '−'} ${fmt12(l.montant)}</b></td></tr>`).join('')}</tbody></table></div>${R.ok.length > 40 ? `<p class="mute small">… et ${R.ok.length - 40} autre(s) (importées avec le reste).</p>` : ''}
   <p class="small"><button class="ghost" data-im="all">Tout cocher</button> <button class="ghost" data-im="none">Tout décocher</button></p>` : ''}${R.ok.length ? '' : '<p class="empty">Aucune ligne exploitable : vérifiez la destination, la ligne d’en-tête et les colonnes obligatoires (*).</p>'}
   <div class="mact" style="margin-top:10px"><button class="ghost" data-im="cancel">Annuler</button><button data-im="go" ${nSel ? '' : 'disabled'}>${ic('save')} Importer ${nSel} ligne(s) dans « ${esc(DD.label)} »</button></div></div>` : ''}
  ${batches.length ? `<div class="card"><h2>Imports réalisés</h2><div class="tw"><table><thead><tr><th>Fichier</th><th>Destination</th><th class="num">Lignes</th><th class="num">Action</th></tr></thead><tbody>${batches.map(b => `<tr><td>${esc(b.file)}</td><td>${esc(b.dest)}</td><td class="num">${b.n}</td><td class="num"><button class="ghost danger" data-im="undo" data-b="${esc(b.id)}">${ic('undo')} Annuler cet import</button></td></tr>`).join('')}</tbody></table></div></div>` : ''}
  ${samples ? `<div class="card"><h2>Données d’exemple d’une ancienne version</h2><p class="mute">${samples} élément(s) issus de l’ancien fichier Excel de démonstration sont encore dans ce compte. LUMINA ne charge plus ce fichier ; vous pouvez retirer ces éléments (vos propres saisies et imports ne sont pas touchés).</p><p><button class="ghost danger" data-im="rmsample">${ic('trash')} Supprimer les données d’exemple</button></p></div>` : ''}`;

  const redraw = () => importPage(el);
  const fi = el.querySelector('#im-file'), dz = el.querySelector('#im-drop');
  const take = async f => { if (!f) return; IM.busy = true; IM.error = ''; redraw(); try { await readFile12(f); } catch (e) { IM.error = e.message || String(e); IM.aoa = []; } IM.busy = false; redraw(); };
  if (fi) fi.onchange = () => take(fi.files[0]);
  if (dz) { dz.ondragover = ev => { ev.preventDefault(); dz.style.background = 'var(--brand-soft)'; }; dz.ondragleave = () => { dz.style.background = ''; }; dz.ondrop = ev => { ev.preventDefault(); dz.style.background = ''; take(ev.dataTransfer.files[0]); }; }
  el.onchange = ev => {
    const t = ev.target, k = t.dataset && t.dataset.im; if (!k) return;
    if (k === 'row') { const ix = +t.dataset.ix; if (t.checked) IM.off.delete(ix); else IM.off.add(ix); redraw(); return; }
    if (k === 'dest') { IM.dest = t.value; IM.off = new Set(); remap(); }
    else if (k === 'map') IM.map[t.dataset.f] = t.value === '' ? undefined : +t.value;
    else if (k === 'hdr') { IM.hdr = +t.value; remap(); }
    else if (k === 'sheet') { pickSheet(t.value); }
    else if (k === 'createCats' || k === 'skipDup') IM.opts[k] = t.checked;
    else if (k === 'sign' || k === 'status') IM.opts[k] = t.value;
    IM.last = null; redraw();
  };
  el.onclick = ev => {
    const b = ev.target.closest('[data-im]'); if (!b || b.tagName === 'SELECT' || b.tagName === 'INPUT') return; const k = b.dataset.im;
    if (k === 'go') commitImport();
    else if (k === 'all') { IM.off = new Set(); redraw(); }
    else if (k === 'none') { IM.off = new Set((IM.last ? IM.last.ok : []).map(l => l._ix)); redraw(); }
    else if (k === 'paste') { const ta = el.querySelector('#im-paste'); IM.paste = ta ? ta.value : ''; if (!IM.paste.trim()) { IM.error = 'Rien à analyser : collez d’abord votre tableau.'; } else { try { readPasted(IM.paste); } catch (e) { IM.error = e.message || String(e); IM.aoa = []; } } redraw(); }
    else if (k === 'cancel') { IM.aoa = []; IM.name = ''; IM.last = null; redraw(); }
    else if (k === 'undo') { if (confirm('Retirer toutes les écritures de cet import ?')) undoImport(b.dataset.b); }
    else if (k === 'rmsample') { if (confirm('Supprimer les données d’exemple de l’ancien fichier Excel ?')) removeSample(); }
  };
}
PAGES.importer = importPage;
{ const i = NAV.findIndex(n => n[0] === 'historique'); NAV.splice(i < 0 ? NAV.length : i, 0, ['importer', 'upload', 'Données & Import']); }

/* ---------- Nettoyage au démarrage : plus aucun automatisme religieux ---------- */
function migrate13() {
  if (!ME || !DB || DB.mig13) return false;
  DB.mig13 = 1;
  const p = (DB.profile = DB.profile || {});
  Object.assign(p, { religion: 'Non', dimeMode: 'never', dimeAuto: 'Non', aumoneOn: 'Non' });
  ['dimeTaux', 'aumoneMontant', 'aumoneFreq', 'culteMontant'].forEach(k => { delete p[k]; });
  /* lignes de dîme créées automatiquement : deviennent de simples écritures libres, sans lien ni taux */
  list('finances').forEach(i => { if (i.auto && i.lien && /^dîme/i.test(i.libelle || '') || i.dimeTaux != null) { delete i.auto; delete i.lien; delete i.dimeTaux; } });
  DB.mig12rel = 0; if (typeof removeEmptyReligion === 'function') removeEmptyReligion();
  return true;
}
{
  const b1 = boot;
  boot = function () {
    b1.apply(this, arguments);
    try { if (ME && migrate13()) { if (typeof HIST !== 'undefined') HIST.mute++; try { save(); } finally { if (typeof HIST !== 'undefined') HIST.mute--; } } } catch (e) { console.error('LUMINA v13 :', e); }
  };
}
