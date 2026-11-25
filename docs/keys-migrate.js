/* LUMINA — migration transparente des clés de stockage.
   Les versions précédentes (LifeOS / LUMEN-A / LUMENA / NEXORA) enregistraient les données sous « nexora.* »,
   « lumena.* », « lumen.* » ou « lumen-a.* ». Ce script, chargé AVANT tout autre, copie chaque clé vers « lumina.* »
   puis supprime l'ancienne UNIQUEMENT si la copie a réussi (jamais de perte : en cas de quota plein, l'ancienne
   clé est conservée et relue par le nom d'origine). Il est idempotent : sans ancienne clé, il ne fait rien.
   La clé historique « lifeos.v1 » (première version sans comptes) reste lue par auth.js pour rattacher ces données
   au premier compte administrateur. */
(function () {
  'use strict';
  var OLD = /^(nexora|lumena|lumen-a|lumen)\./i;
  function move(store) {
    var moved = 0, kept = 0, keys = [], i;
    try { for (i = 0; i < store.length; i++) keys.push(store.key(i)); } catch (e) { return { moved: 0, kept: 0 }; }
    keys.forEach(function (k) {
      if (!k || !OLD.test(k)) return;
      var nk = k.replace(OLD, 'lumina.');
      try {
        var v = store.getItem(k);
        if (v === null) return;
        if (store.getItem(nk) === null) store.setItem(nk, v);      /* la clé « lumina.* » existante a priorité */
        if (store.getItem(nk) !== null) { store.removeItem(k); moved++; }
      } catch (e) { kept++; }                                        /* quota plein : on garde l'ancienne clé */
    });
    return { moved: moved, kept: kept };
  }
  var ls = null; try { ls = window.localStorage; } catch (e) {}
  var r1 = ls ? move(ls) : { moved: 0, kept: 0 }, r2 = { moved: 0, kept: 0 };
  try { r2 = move(window.sessionStorage); } catch (e) {}
  try {
    if (r1.moved + r2.moved) localStorage.setItem('lumina.keysMigrated', new Date().toISOString());
    window.LUMINA_KEYS_MIGRATION = { moved: r1.moved + r2.moved, kept: r1.kept + r2.kept };
  } catch (e) {}
})();
