# LUMINA v10 — compléments à la v9

Les points 1 à 7 de la demande étaient déjà couverts par la v9 (voir `CHANGELOG-v9.md`). La v10 traite les écarts restants.

| # | Correction | Fichiers | Migration |
|---|---|---|---|
| 1 | **Recherche globale retirée** de la barre `#top` (la recherche reste dans chaque module : champ « Rechercher dans… ») | `index.html`, `app.js`, `auth.js` | — |
| 2 | **Sélecteur d'année retiré** de `#top`. L'année se choisit dans les filtres de chaque page (Tableau de bord, Budget, Finances, Comparaison, Bilan des projets) et reste synchronisée entre elles (2020 → N+15) | `modules9.js` | — |
| 3 | **Filtre Du / Au** : réagit maintenant à `input` en plus de `change` (filtrage immédiat à la saisie ou au choix de la date) | `app.js` | — |
| 4 | **« + Ajouter un groupe / une catégorie… »** dans les listes Catégorie (opérations, objectifs) et Groupe (fiche catégorie). Les créations vont dans `lumina.customCategories` (par utilisateur), deviennent de vraies catégories (donc visibles partout) et passent en tête des listes | **`modules10.js`** (nouveau) | Aucune donnée existante modifiée ; les catégories du profil sont recréées si elles manquent (import, restauration) |
| 5 | Cache PWA `lumina-v19`, `modules10.js` précaché | `service-worker.js` | Anciens caches supprimés à l'activation |

## À valider
- `mobile/twa-manifest.json` conserve `lumena.keystore` / alias `nexora` : ce sont les identifiants de la clé de signature Android existante, les renommer empêcherait de publier des mises à jour. À changer seulement si vous recréez la clé.
- Le test n'a pu être fait qu'en contrôle de syntaxe (`node --check`) ; ouvrez l'application une fois pour vérifier le formulaire d'ajout de catégorie.
