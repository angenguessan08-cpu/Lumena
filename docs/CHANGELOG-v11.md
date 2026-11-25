# LUMINA v11

| # | Correctif | Fichiers | Migration |
|---|---|---|---|
| 1 | Barre `#top` : actions à gauche (Ajout rapide, Annuler, Actualiser, Installer), outils système groupés à droite (`#bell{margin-left:auto}` : cloche, A−/100 %/A+, thème, profil, déconnexion). Aucune recherche ni sélecteur d'année | `style.css` | — |
| 2 | Pôle Religion / Culte absent de la base initiale (catégories Dîmes, Aumônes retirées du jeu de départ). Dîme de 10 % : taux 0 et encadré de saisie masqué tant qu'aucune écriture religieuse n'existe. Les 3 catégories sont créées à la première écriture religieuse ou si l'option est activée | `data/base_excel.js`, `app.js`, `modules11.js` | Catégories Dîmes / Aumônes / Culte & œuvres **sans aucune écriture** supprimées une fois (sauvegarde `DB.mig11Undo.relCats`) |
| 3 | Deux référentiels **Personnel / Familial** et **Professionnel** (ou les deux), choisis dans Catégories ; les catégories de l'autre référentiel sont désactivées tant qu'elles n'ont aucun enregistrement ; catégories personnalisées toujours possibles (v10) | `modules11.js` | Référentiel Personnel appliqué une fois (renommages : Logement → Logement et énergie, etc.) ; **annulable** (« Annuler ce changement ») |
| 4 | Pro : 7 groupes, frais bancaires / agios classés en Charges financières (restent en rouge, fonds perdus), **provision pour risques = 5 % du total des charges** (taux réglable), recalculée aussi dans les budgets annuels | `modules11.js`, `app.js` (`targetPeriod`, `amtCls`) | — |
| 5 | Commutateur de classement des charges : par groupe · **Fixes vs Variables** · **Coûts directs vs indirects** (champ « Nature du coût » sur chaque catégorie) | `modules11.js` | — |
| 6 | Catégories et cartes à 0 FCFA sans budget ni écriture masquées (tableau de bord, bilans, budget annuel) ; réapparition immédiate à la première saisie. Les listes de saisie les gardent | `modules11.js`, `app.js`, `modules3.js` | — |
| 7 | Ordre Revenus → Dépenses → Épargne & Investissements (Dettes séparées) : déjà en v9 ; groupes Pro insérés avant l'Épargne, « Investissements » après | `modules11.js`, `modules10.js` | — |
| 8 | Cache PWA `lumina-v20` | `service-worker.js` | — |

## À savoir
- Vos 108 écritures « Dîmes / Aumônes » viennent de votre Excel : ce sont de vraies saisies, le pôle reste donc visible pour ce compte. Un compte neuf n'a aucun pôle religieux.
- « Imprévus » (v9) et « Fonds perdus / Frais bancaires » restent communs aux deux référentiels.
- Le classement Fixes/Variables et Direct/Indirect s'affiche dans la page Catégories (et la colonne « Classement »).

# v12 — application neutre (aucun groupe spirituel par défaut)

| # | Correctif | Fichiers | Migration |
|---|---|---|---|
| 1 | Groupe « Religion / Culte » retiré de la liste des groupes ; plus de détection par mots-clés ; plus de dîme ni cible de 10 % par défaut | `app.js`, `modules8.js`, `modules9.js` | — |
| 2 | Catégories Dîmes, Aumônes, Culte & œuvres supprimées ; leurs écritures (et budgets) passent dans la catégorie neutre **Dons et contributions** (groupe Envies), à renommer ou déplacer librement | `modules11.js` | Une seule fois ; sauvegarde `DB.mig12Undo` ; non appliquée si l'utilisateur a activé l'option dans Réglages |
| 3 | Les groupes et catégories spirituels se créent via « + Ajouter un groupe / une catégorie… » (v10) | `modules10.js` | — |
| 4 | Table Catégories : catégories vides masquées (interrupteur « Afficher les catégories vides ») | `modules11.js` | — |
| 5 | Cache `lumina-v21` | `service-worker.js` | — |
