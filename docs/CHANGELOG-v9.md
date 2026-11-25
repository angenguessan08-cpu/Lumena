# LUMINA v9 — récapitulatif des corrections

| # | Correction | Fichiers impactés | Migration des données existantes |
|---|---|---|---|
| 1 | Nom unique **LUMINA** (LUMEN-A, LUMENA, LifeOS, NEXORA remplacés) ; slogan et logo retirés du Tableau de bord et de la barre latérale | tous les `.js`, `index.html`, `manifest.json`, `service-worker.js`, `style.css`, `i18n_dict.js`, `README.md`, `mobile/*`, `data/*` (`LUMINA_SEED`) | — |
| 2 | Clés de stockage `nexora.*`, `lumena.*`, `lumen.*`, `lumen-a.*` → `lumina.*` | **`keys-migrate.js`** (nouveau, chargé en premier) | Copie puis suppression de l'ancienne clé **seulement si la copie a réussi** ; la clé `lumina.*` déjà présente a priorité ; idempotent ; `localStorage` et `sessionStorage` |
| 3 | Historique, **annulation** (Ctrl+Z, bouton barre du haut, bouton du toast) et **restauration par module** ; Ctrl+S | `modules9.js` (§1), `app.js` (`toast` : libellé du bouton) | Journal par utilisateur (`lumina.hist.<id>`, 80 dernières entrées, différences par ligne et non copies complètes) ; aucune donnée existante modifiée |
| 4 | Boutons **Enregistrer** explicites + « Annuler la dernière action » sur les pages à saisie directe (budget annuel, épargne, plan, collectif, bourse…) | `modules9.js` (§9) | L'enregistrement au fil de la saisie est conservé ; le bouton le confirme (toast) |
| 5 | Ordre des flux Revenus → Dépenses (fixes, variables, pertes, dettes) → Épargne & investissements ; carte **Synthèse des flux** | `app.js` (`GROUPES`, `GICON`), `modules9.js` | Voir 6 |
| 6 | Taxonomie : « Épargne & Dettes » scindé en **Dettes & Remboursements / Épargne / Investissement Bourse** ; ajout du groupe **Fonds perdus** ; règle Besoins / Envies expliquée | `app.js`, `auth.js`, `modules4.js`, `modules8.js`, `modules9.js` (§2) | Migration au démarrage, **idempotente et annulable** (Réglages → Classification comptable) : sauvegarde avant migration (`DB.mig9Undo`), rapport (`DB.mig9Report`) |
| 7 | **Assurances → Épargne Études Enfants** (type « Épargne », groupe Épargne) | `modules8.js`, `modules9.js` | Catégorie renommée partout (écritures, objectifs, budgets annuels, récap) ; les écritures passent en type « Épargne » ; NSIA / SANLAM saisis ailleurs aussi reclassés |
| 8 | **Retenues bancaires / agios → Fonds perdus / Frais bancaires** | `modules3.js`, `modules9.js` | Renommage de « Retenues Bancaire » (+ variantes) ; budgets conservés |
| 9 | Nettoyage de **« Autres »** par règles lexicales (14 familles de motifs) puis suppression de la catégorie | `modules9.js` | Chaque ligne garde `catAvant` ; les libellés génériques (« Autres dépenses ») vont en Imprévus et sont listés « à vérifier » ; budget de « Autres » reporté sur Imprévus |
| 10 | **Budgets trimestriels** Voyage et Supplément Enfants (T1–T4, janvier / avril / juillet / octobre par défaut) | `modules9.js` (§3), `modules8.js` (onglet) | Écrit dans le Budget annuel des années choisies ; lignes prévues « En attente » en option ; relancé seulement si la configuration change |
| 11 | **Coffre-fort** : liste « Type » toujours remplie (6 types + « Autres documents »), champs structurés, alerte de renouvellement par document, aperçu, guide rapide | `app.js` (`filterOpts`, alertes), `modules9.js` (§7) | Anciens types (Identité, Diplôme, Assurance, Contrat, Autre) convertis ; « Autre » deviné d'après le titre ; alerte 90 j par défaut |
| 12 | **Fonds collectif** : reste, encaissé, rapprochement corrigés ; « **Complet (0 FCFA restant)** » | `modules9.js` (§4) | Aucune ; calcul seulement. L'alerte de la cloche suit le même calcul |
| 13 | **Religion / Culte** masqué par défaut ; visible si l'option est activée ou si une écriture contient dîme, aumône, offrande, culte, église, mosquée, zakat, paroisse, quête, œuvre | `modules8.js`, `app.js`, `modules9.js` (§5) | Aucune |
| 14 | **Filtre d'année maître** 2020 → N+15 (barre du haut) synchronisé avec Tableau de bord, Budget, Finances, Comparaison, Bilan des projets | `app.js` (`years`), `modules9.js` (§6) | Aucune |
| 15 | **Alertes futures** : base réalisé + prévu imposée sur les années futures ; plafonds indexés sur l'**inflation** (3 % par défaut, réglable) ; garde-fou à la saisie aligné | `app.js` (`periodItems`, `targetPeriod`), `modules9.js`, Réglages | Aucune |
| 16 | **Règles et conseils aérés** : étapes numérotées, retraits, « À faire maintenant » chiffré, « Comment lire cette page » | `modules7.js`, `modules9.js` (§8), `style.css` | — |
| 17 | **Couleurs** : vert `#10b981` (revenus, soldes positifs, objectifs atteints) ; rouge `#ef4444` / orange `#f59e0b` (dépenses fixes, dépassements, fonds perdus, alertes) | `style.css`, `app.js` (`amtCls`) | — |
| 18 | PWA : cache `lumina-v18` (anciens caches supprimés), `keys-migrate.js` et `modules9.js` précachés ; zoom A− / A+ conservé (clé `lumina.zoom`) ; en-têtes et barres de filtres collants | `service-worker.js`, `modules8.js`, `style.css` | — |

## Décisions de classement à valider
- **Projets** est rangé dans « Dettes & Remboursements » (engagements de paiement). **Famille** reste dans Besoins.
- Les deux lignes « Soutien église » saisies en type « Épargne » (nov. et déc. 2025) sont rangées dans Épargne, **non modifiées** et signalées dans le rapport.
- Les objectifs d'épargne sans catégorie liée comptent toutes les lignes « Épargne » : ils incluent désormais les contrats « Épargne Études Enfants ».
