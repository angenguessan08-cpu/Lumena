'use strict';
/* =====================================================================
   LUMINA v14 — Proposition automatique de budget annuel
   À partir des revenus (plan de l'année, sinon historique des 12 derniers mois, sinon revenu net du profil)
   et de la répartition réelle des dépenses, l'application propose des cibles mensuelles par poste :
     1. engagements fixes   2. épargne / bourse (% du revenu)   3. dépenses variables ajustées à ce qui reste
   Rien n'est écrit tant que l'utilisateur n'a pas cliqué « Appliquer ».
   ===================================================================== */
const BG = { pct: null, mode: 'equilibre', prop: null, y: null };
const BG_MODES = { prudent: ['Prudent — variables −10 %', .9, 0], equilibre: ['Équilibré — selon vos habitudes', 1, 0], ambitieux: ['Ambitieux épargne — variables −15 %, épargne +5 pts', .85, 5] };
const bgRound = v => v <= 0 ? 0 : v < 5000 ? Math.round(v / 100) * 100 : Math.round(v / 500) * 500;
const bgYm = d => String(d || '').slice(0, 7);

/* moyennes mensuelles réelles sur les 12 derniers mois complets (par catégorie) */
function bgHistory() {
  const T = new Date(), ym = (y, m) => y + '-' + String(m).padStart(2, '0'), months = [];
  let y = T.getFullYear(), m = T.getMonth();            /* mois précédent = dernier mois complet */
  for (let k = 0; k < 12; k++) { if (m === 0) { m = 12; y--; } months.push(ym(y, m)); m--; }
  const set = new Set(months), tiers = typeof isTiersLine === 'function' ? isTiersLine : () => false;
  const items = list('finances').filter(i => typeof counted === 'function' ? counted(i, DS.base) : i.statut !== '❌ Annulé').filter(i => set.has(bgYm(i.date)) && !tiers(i));
  const active = new Set(items.map(i => bgYm(i.date))), span = Math.max(1, active.size), tot = {}, cnt = {};
  items.forEach(i => { const k = i.cat + (kind(i) === 'rev' ? '|r' : '|o'); tot[k] = (tot[k] || 0) + num(i.montant); (cnt[k] = cnt[k] || new Set()).add(bgYm(i.date)); });
  const avg = (cat, rev, fixed) => { const k = cat + (rev ? '|r' : '|o'); if (!tot[k]) return 0; return fixed ? tot[k] / cnt[k].size : tot[k] / span; };
  return { avg, span, hasData: items.length > 0 };
}

function bgGenerate(y) {
  const H = bgHistory(), cats = typeof catsPlan === 'function' ? catsPlan() : list('categories'), modeDef = BG_MODES[BG.mode] || BG_MODES.equilibre;
  const pct = (BG.pct != null ? BG.pct : (typeof pcE === 'function' ? pcE() : 15)) + modeDef[2], msgs = [];
  /* 1. Revenus : plan de l'année s'il existe, sinon historique, sinon revenu net du profil */
  const plan = DB.budgets && DB.budgets[y] ? DB.budgets[y] : null, rev = [];
  cats.filter(c => c.type === 'Revenu' && c.nom !== 'Dîmes').forEach(c => {
    const pl = plan && plan[c.nom] ? plan[c.nom].map(num) : null, a = H.avg(c.nom, true, false);
    let p, src;
    if (pl && pl.some(v => v > 0)) { p = pl; src = 'plan de l’année'; }
    else if (a > 0) { p = Array(12).fill(bgRound(a)); src = 'moyenne réelle'; }
    else if (num(c.budget) > 0) { p = Array(12).fill(num(c.budget)); src = 'cible mensuelle'; }
    else return;
    rev.push({ c, p, avg: a, src });
  });
  if (!rev.length) {
    const net = typeof netMensuel === 'function' ? netMensuel(new Date().toISOString().slice(0, 7)) : num(DB.profile?.revenuNet);
    const rc = cats.find(c => c.type === 'Revenu' && c.nom !== 'Dîmes');
    if (net > 0 && rc) { rev.push({ c: rc, p: Array(12).fill(net), avg: 0, src: 'revenu net du profil' }); msgs.push('Aucun revenu planifié ni historique : le revenu net de votre profil sert de base.'); }
  }
  const revM = Array.from({ length: 12 }, (_, m) => rev.reduce((s, r) => s + r.p[m], 0)), R = revM.reduce((a, b) => a + b, 0) / 12;
  if (!(R > 0)) return { empty: true, msgs: ['Ajoutez d’abord vos revenus (écritures, plan annuel ou revenu net dans Réglages) : le budget se calcule à partir d’eux.'] };
  /* 2. Postes de dépenses */
  const fixed = [], vari = [], sav = [];
  cats.filter(c => c.type !== 'Revenu' && c.nom !== 'Dîmes').forEach(c => {
    if (isSav(c)) { sav.push({ c, avg: H.avg(c.nom, false, true), w: Math.max(num(c.budget), H.avg(c.nom, false, true)) }); return; }
    const isF = c.type === 'Dépense Fixe', a = H.avg(c.nom, false, isF), base = isF ? Math.max(a, num(c.budget)) : (a > 0 ? a : num(c.budget));
    if (base <= 0) return;
    (isF ? fixed : vari).push({ c, avg: a, base, v: base });
  });
  const fixT = fixed.reduce((s, r) => s + r.base, 0);
  let S = R * pct / 100, varBase = vari.reduce((s, r) => s + r.base * modeDef[1], 0);
  vari.forEach(r => { r.v = r.base * modeDef[1]; });
  const buffer = R * .03;                                /* coussin pour imprévus */
  let free = R - fixT - S - buffer;
  /* 3. Ajustement si ça ne tient pas : on réduit d'abord le superflu, puis l'essentiel, puis l'épargne (jusqu'à moitié) */
  if (varBase > free) {
    const cut = (rows, floor, need) => { const t = rows.reduce((s, r) => s + r.v, 0); if (!t || need <= 0) return need; const take = Math.min(need, t * (1 - floor)); rows.forEach(r => { r.v -= take * r.v / t; }); return need - take; };
    let need = varBase - free;
    const superflu = vari.filter(r => r.c.groupe !== 'Besoins'), essentiel = vari.filter(r => r.c.groupe === 'Besoins');
    need = cut(superflu, .5, need); need = cut(essentiel, .85, need);
    if (need > 0) { const give = Math.min(S / 2, need); S -= give; need -= give; msgs.push('L’objectif d’épargne a été réduit de moitié au maximum pour que le budget tienne.'); }
    if (need > 0) msgs.push('Même après ajustement, vos charges dépassent vos revenus de ' + fmt(Math.round(need)) + ' par mois : il faut augmenter les revenus ou réduire un engagement fixe.');
    else msgs.push('Vos habitudes de dépense dépassaient ce que permettent vos revenus : les postes non essentiels ont été réduits en priorité.');
  }
  const varT = vari.reduce((s, r) => s + r.v, 0);
  let marge = R - fixT - varT - S;
  if (marge > buffer) { const extra = (marge - buffer) * .5; S += extra; marge -= extra; msgs.push('Un surplus a été constaté : la moitié est ajoutée à l’épargne, le reste reste en marge de sécurité.'); }
  /* 4. Répartition de l'épargne entre les lignes d'épargne */
  const wT = sav.reduce((s, r) => s + r.w, 0);
  if (sav.length) {
    if (wT > 0) sav.forEach(r => { r.v = S * r.w / wT; });
    else { const main = sav.find(r => r.c.nom === 'Épargne') || sav[0]; sav.forEach(r => { r.v = r === main ? S : 0; }); }
  } else if (S > 0) msgs.push('Aucune catégorie d’épargne : créez-en une (ex. « Épargne ») pour y affecter ' + fmt(Math.round(S)) + ' par mois.');
  const row = (r, flat) => ({ c: r.c, avg: r.avg, p: flat ? Array(12).fill(bgRound(r.v != null ? r.v : r.base)) : r.p });
  const out = { rev: rev.map(r => ({ c: r.c, avg: r.avg, p: r.p, src: r.src })), fixed: fixed.map(r => row(r, true)), vari: vari.map(r => row(r, true)), sav: sav.map(r => row(r, true)), msgs, R, pct };
  const sum = rows => rows.reduce((s, x) => s + x.p[0], 0);
  out.fixT = sum(out.fixed); out.varT = sum(out.vari); out.savT = sum(out.sav); out.marge = R - out.fixT - out.varT - out.savT;
  return out;
}

function bgCard(y) {
  const P = BG.prop && BG.y === y ? BG.prop : null, mode = BG.mode, pct = BG.pct != null ? BG.pct : (typeof pcE === 'function' ? pcE() : 15);
  let body = '';
  if (P && P.empty) body = `<div class="al warn"><span class="ai">${ic('alert')}</span><div>${esc(P.msgs[0])}</div></div>`;
  else if (P) {
    const all = [...P.fixed, ...P.vari, ...P.sav], ann = r => r.p.reduce((a, b) => a + b, 0);
    const line = (r, lab) => `<tr><td>${esc(r.c.nom)}</td><td class="mute">${esc(lab)}</td><td class="num mute">${r.avg ? nf(r.avg) : '—'}</td><td class="num"><b>${nf(r.p[0])}</b></td><td class="num">${nf(ann(r))}</td></tr>`;
    body = `<div class="tiles"><div class="tile a1"><small>Revenu moyen / mois</small><b>${fmt(P.R)}</b></div><div class="tile a3"><small>Engagements fixes</small><b>${fmt(P.fixT)}</b></div><div class="tile a2"><small>Dépenses variables</small><b>${fmt(P.varT)}</b></div><div class="tile a4"><small>Épargne / bourse (${Math.round(P.pct)} %)</small><b class="good">${fmt(P.savT)}</b></div><div class="tile ${P.marge < 0 ? 'a2' : 'a1'}"><small>Marge de sécurité</small><b class="${P.marge < 0 ? 'bad' : ''}">${fmt(P.marge)}</b></div></div>
    ${P.msgs.map(m => `<div class="al warn"><span class="ai">${ic('bulb')}</span><div>${esc(m)}</div></div>`).join('')}
    <div class="tw"><table class="mgrid"><thead><tr><th>Poste</th><th>Nature</th><th class="num">Réel moyen / mois</th><th class="num">Cible proposée / mois</th><th class="num">Total ${esc(y)}</th></tr></thead><tbody>
    ${P.rev.map(r => `<tr><td>${esc(r.c.nom)}</td><td class="mute">Revenu · ${esc(r.src)}</td><td class="num mute">${r.avg ? nf(r.avg) : '—'}</td><td class="num"><b>${nf(r.p.reduce((a, b) => a + b, 0) / 12)}</b></td><td class="num">${nf(r.p.reduce((a, b) => a + b, 0))}</td></tr>`).join('')}
    ${P.fixed.map(r => line(r, 'Charge fixe')).join('')}${P.vari.map(r => line(r, 'Variable')).join('')}${P.sav.map(r => line(r, 'Épargne')).join('')}
    <tr class="trow"><td>Total sorties</td><td></td><td></td><td class="num">${nf(all.reduce((s, r) => s + r.p[0], 0))}</td><td class="num">${nf(all.reduce((s, r) => s + ann(r), 0))}</td></tr></tbody></table></div>
    <p class="acts" style="margin:10px 0 0"><button data-bg="apply">${ic('check')} Appliquer au budget ${esc(y)}</button><button class="ghost" data-bg="drop">Ignorer</button></p>
    <p class="mute small" style="margin:6px 0 0">Méthode : revenus (plan, sinon moyenne des 12 derniers mois) → charges fixes → épargne (% du revenu) → dépenses variables ajustées à ce qui reste, en réduisant d’abord le superflu. Montants arrondis. Rien n’est modifié avant « Appliquer » ; vous pourrez ensuite ajuster chaque mois.</p>`;
  }
  return `<div class="card" id="bgprop"><h2>${ic('sparkles')} Proposer mon budget annuel ${esc(y)}</h2>
  <p class="mute small" style="margin:0 0 10px">L’application calcule des cibles par poste à partir de vos revenus et de la répartition réelle de vos dépenses.</p>
  <div class="fg"><div><label>Part des revenus à épargner / investir (%)</label><input type="number" min="0" max="80" step="1" data-bgin="pct" value="${esc(pct)}"></div>
  <div><label>Style de budget</label><select data-bgin="mode">${Object.entries(BG_MODES).map(([k, v]) => `<option value="${k}" ${k === mode ? 'selected' : ''}>${esc(v[0])}</option>`).join('')}</select></div></div>
  <p class="acts" style="margin:10px 0"><button data-bg="gen">${ic('sparkles')} Générer la proposition</button></p>${body}</div>`;
}
function bgInject(el) {
  if (!el) return; const old = el.querySelector('#bgprop'); if (old) old.remove();
  const h = el.querySelector('.head'); if (h) h.insertAdjacentHTML('afterend', bgCard(YY()));
}
{ const pb = PAGES.budgetan; if (pb) PAGES.budgetan = el => { pb(el); bgInject(el); };
  if (typeof budgetanPage === 'function') { const raw = budgetanPage; budgetanPage = function (el) { raw(el); bgInject(el); }; } }   /* refreshPage() appelle budgetanPage directement */

document.addEventListener('change', ev => {
  const e = ev.target, k = e.dataset && e.dataset.bgin; if (!k || !ME) return;
  if (k === 'pct') BG.pct = Math.min(80, Math.max(0, num(e.value))); else if (k === 'mode') BG.mode = e.value;
  BG.prop = null;
});
document.addEventListener('click', ev => {
  const b = ev.target.closest('[data-bg]'); if (!b || !ME) return; const x = b.dataset.bg, y = YY();
  if (x === 'gen') {
    const inp = document.querySelector('[data-bgin="pct"]'); if (inp) BG.pct = Math.min(80, Math.max(0, num(inp.value)));
    const sel = document.querySelector('[data-bgin="mode"]'); if (sel) BG.mode = sel.value;
    BG.y = y; BG.prop = bgGenerate(y); render(); setTimeout(() => document.getElementById('bgprop')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30);
  } else if (x === 'drop') { BG.prop = null; render(); }
  else if (x === 'apply') {
    const P = BG.prop; if (!P || P.empty) return;
    if (DB.budgets?.[y] && !confirm('Remplacer les cibles de ' + y + ' par cette proposition ? (les postes absents de la proposition sont conservés)')) return;
    const B = ensureBudget(y);
    [...P.rev, ...P.fixed, ...P.vari, ...P.sav].forEach(r => { B[r.c.nom] = r.p.map(v => Math.max(0, Math.round(v))); });
    DB.budgetsGen = { ...(DB.budgetsGen || {}), [y]: { at: new Date().toISOString(), pct: P.pct, mode: BG.mode } };
    BG.prop = null; save(); render(); toast('✔ Budget ' + y + ' appliqué : ajustez les montants mois par mois si besoin');
  }
});
