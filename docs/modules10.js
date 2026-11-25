'use strict';
/* =====================================================================
   LUMINA v10 — Groupes et catégories personnalisés
   Dans chaque liste « Catégorie » ou « Groupe » des formulaires, l'option « + Ajouter un groupe / une catégorie… »
   permet de créer ses propres entrées. Elles sont :
   - enregistrées dans le profil local (clé « lumina.customCategories », une entrée par utilisateur) ;
   - créées comme vraies catégories du compte (DB.categories) : elles apparaissent donc aussitôt dans le Tableau de bord,
     le Budget annuel, le Détail par catégorie et les Bilans ;
   - affichées EN PREMIER dans les listes des formulaires.
   ===================================================================== */
const CC_KEY = 'lumina.customCategories', CC_NEW = '__new__', CC_LABEL = '+ Ajouter un groupe / une catégorie…';
function ccRead() { try { return JSON.parse(localStorage.getItem(CC_KEY) || '{}') || {}; } catch (e) { return {}; } }
function ccMine() { const all = ccRead(), m = (ME && all[ME.id]) || {}; return { groups: m.groups || [], cats: m.cats || [] }; }
function ccWrite(m) {
  if (!ME) return;
  try { const all = ccRead(); all[ME.id] = m; localStorage.setItem(CC_KEY, JSON.stringify(all)); }
  catch (e) { toast('⚠ Stockage plein : la catégorie est créée mais non mémorisée dans le profil.'); }
}
function ccRegisterGroup(g) {
  if (!GROUPES.includes(g)) { const i = GROUPES.indexOf('Épargne'); GROUPES.splice(i < 0 ? GROUPES.length : i, 0, g); }
  if (!GICON[g]) GICON[g] = 'folder';
}
/* Rétablit groupes et catégories du profil (après connexion, import ou restauration) */
function ccEnsure() {
  if (!ME) return;
  const m = ccMine();
  m.groups.forEach(ccRegisterGroup);
  let ch = false;
  m.cats.forEach(c => {
    ccRegisterGroup(c.groupe);
    if (!list('categories').some(x => x.nom === c.nom)) {
      list('categories').push({ id: uid(), created: new Date().toISOString(), nom: c.nom, type: c.type, groupe: c.groupe, budget: 0, contenu: 'Catégorie créée par l’utilisateur', perso: 1 });
      ch = true;
    }
  });
  if (ch) save();
}
const ccIsMine = n => ccMine().cats.some(c => c.nom === n);

const ccWrapRender = render;
render = function () { try { ccEnsure(); } catch (e) { console.error('Catégories personnalisées :', e); } return ccWrapRender.apply(this, arguments); };

function ccPanel(sel, kind) {
  const box = document.createElement('div');
  box.className = 'card cc-panel full';
  box.style.cssText = 'margin-top:8px;padding:10px';
  const isCat = kind === 'cat';
  box.innerHTML = `<div class="fg">
    <div><label>${isCat ? 'Nom de la catégorie' : 'Nom du groupe'}</label><input data-cc="nom" maxlength="60" placeholder="${isCat ? 'ex. Cantine, Transport scolaire…' : 'ex. Famille élargie…'}"></div>
    ${isCat ? `<div><label>Groupe</label><select data-cc="groupe">${GROUPES.map(g => `<option>${esc(g)}</option>`).join('')}<option value="${CC_NEW}">+ Nouveau groupe…</option></select></div>
    <div data-cc-ng style="display:none"><label>Nom du nouveau groupe</label><input data-cc="ngroupe" maxlength="60"></div>
    <div><label>Type habituel</label><select data-cc="type">${TYPES.map(t => `<option>${esc(t)}</option>`).join('')}</select></div>` : ''}
  </div>
  <div class="mact" style="margin-top:8px"><button type="button" class="ghost" data-cc="cancel">Annuler</button><button type="button" data-cc="ok">💾 Enregistrer</button></div>`;
  return box;
}

function ccAttach(root) {
  const form = root.querySelector('form'); if (!form || form.dataset.cc) return;
  const catSel = form.querySelector('select[name=cat]'), grpSel = form.querySelector('select[name=groupe]');
  const isCatForm = root.querySelector('h2') && /Catégories?\b/.test(root.querySelector('h2').textContent) && !!grpSel;
  const targets = [];
  if (catSel && form.querySelector('[name=montant]')) targets.push([catSel, 'cat']);           /* opérations */
  else if (catSel && form.querySelector('[name=cible]')) targets.push([catSel, 'cat']);        /* objectifs */
  if (grpSel) targets.push([grpSel, 'groupe']);                                                 /* fiche catégorie */
  if (!targets.length) return;
  form.dataset.cc = '1';
  /* empêche d'enregistrer la valeur technique si la création n'a pas été validée */
  form.addEventListener('submit', ev => { if ([...form.querySelectorAll('select')].some(s => s.value === CC_NEW)) { ev.preventDefault(); ev.stopImmediatePropagation(); toast('Validez ou annulez d’abord l’ajout du groupe / de la catégorie.'); } }, true);
  targets.forEach(([sel, kind]) => {
    /* les créations de l'utilisateur d'abord */
    if (kind === 'cat') {
      const mine = ccMine().cats.map(c => c.nom), opts = [...sel.options];
      mine.slice().reverse().forEach(n => { const o = opts.find(x => x.value === n); if (o) sel.insertBefore(o, sel.options[sel.options[0] && sel.options[0].value === '' ? 1 : 0]); });
    } else {
      const mine = ccMine().groups, opts = [...sel.options];
      mine.slice().reverse().forEach(n => { const o = opts.find(x => x.value === n); if (o) sel.insertBefore(o, sel.options[0]); });
    }
    const add = document.createElement('option'); add.value = CC_NEW; add.textContent = CC_LABEL; sel.appendChild(add);
    let prev = sel.value, panel = null;
    sel.addEventListener('change', () => {
      if (sel.value !== CC_NEW) { prev = sel.value; if (panel) { panel.remove(); panel = null; } return; }
      if (panel) return;
      panel = ccPanel(sel, kind); sel.parentElement.appendChild(panel);
      const q = s => panel.querySelector(`[data-cc="${s}"]`);
      q('nom').focus();
      const gsel = q('groupe'); if (gsel) gsel.addEventListener('change', () => { panel.querySelector('[data-cc-ng]').style.display = gsel.value === CC_NEW ? '' : 'none'; });
      const close = () => { panel.remove(); panel = null; sel.value = prev; };
      q('cancel').onclick = close;
      q('ok').onclick = () => {
        const nom = q('nom').value.trim().replace(/\s+/g, ' ');
        if (!nom) { toast('Saisissez un nom.'); q('nom').focus(); return; }
        const m = ccMine();
        if (kind === 'groupe') {
          const ex = GROUPES.find(g => nrm(g) === nrm(nom));
          if (!ex) { ccRegisterGroup(nom); m.groups.unshift(nom); ccWrite(m); }
          const g = ex || nom;
          if (![...sel.options].some(o => o.value === g)) { const o = document.createElement('option'); o.value = o.textContent = g; sel.insertBefore(o, sel.options[0]); }
          prev = g; panel.remove(); panel = null; sel.value = g; toast('✔ Groupe « ' + g + ' » ajouté'); return;
        }
        let groupe = q('groupe').value;
        if (groupe === CC_NEW) {
          const ng = q('ngroupe').value.trim().replace(/\s+/g, ' ');
          if (!ng) { toast('Saisissez le nom du nouveau groupe.'); q('ngroupe').focus(); return; }
          const ex = GROUPES.find(g => nrm(g) === nrm(ng));
          groupe = ex || ng; if (!ex) { ccRegisterGroup(ng); m.groups.unshift(ng); }
        }
        const type = q('type').value, exist = list('categories').find(c => nrm(c.nom) === nrm(nom));
        const final = exist ? exist.nom : nom;
        if (!exist) {
          list('categories').push({ id: uid(), created: new Date().toISOString(), nom, type, groupe, budget: 0, contenu: 'Catégorie créée par l’utilisateur', perso: 1 });
          m.cats.unshift({ nom, groupe, type }); ccWrite(m); save();
        }
        if (![...sel.options].some(o => o.value === final)) { const o = document.createElement('option'); o.value = o.textContent = final; sel.insertBefore(o, sel.options[sel.options[0] && sel.options[0].value === '' ? 1 : 0]); }
        const ts = form.querySelector('select[name=type]'); if (ts && !exist) ts.value = type; else if (ts && exist && exist.type) ts.value = exist.type;
        prev = final; panel.remove(); panel = null; sel.value = final;
        toast(exist ? '« ' + final + ' » existe déjà : sélectionnée' : '✔ Catégorie « ' + final + ' » ajoutée au groupe « ' + groupe + ' »');
      };
    });
  });
}

/* L'ouverture d'un formulaire crée une fenêtre « .ov » : on la complète aussitôt */
new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => { if (n.nodeType === 1 && n.classList.contains('ov')) { try { ccAttach(n); } catch (e) { console.error(e); } } })))
  .observe(document.body, { childList: true });
