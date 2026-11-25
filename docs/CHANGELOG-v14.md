# LUMINA v14 — budget annuel modifiable, cohérence des écrans vides

| # | Correctif | Fichiers |
|---|---|---|
| 1 | **Budget annuel : « Ajouter une ligne »** sous le tableau (nom du poste, type, groupe, montant mensuel). Crée la catégorie si besoin et remplit les 12 mois ; bouton corbeille sur chaque ligne (met le poste à 0 s'il a des écritures, sinon le supprime). Annulable (Ctrl+Z / « Annuler la dernière action ») | `modules3.js`, `style.css`, `i18n_dict5.js` |
| 2 | **Budget annuel vide sur un compte neuf** : les catégories à 0 étaient masquées aussi dans le tableau de planification, si bien qu'aucune ligne n'était saisissable. Le tableau « Planifier » propose désormais toutes les catégories utilisables ; le tableau « réel vs budget » ne montre que les postes ayant un budget ou un mouvement | `modules3.js` |
| 3 | Budget / Tableau de bord : « Aucune catégorie. » alors que des catégories existent → message explicite avec liens « Préparer mon budget annuel » et « Ajouter une écriture » | `app.js` |
| 4 | Catégories : « Aucun résultat avec ces filtres » sans filtre actif → message indiquant que les catégories vides sont masquées, avec bouton pour les afficher | `app.js` |
| 5 | Texte « Catégories à 0 FCFA » affiché quelle que soit la devise → devise de l'utilisateur ; explication alignée sur le nouveau comportement | `modules11.js` |
| 6 | Reste de la dîme supprimé (v13) : « La dîme se calcule sur les revenus prévus » retiré de Budget annuel (4 langues) | `modules3.js`, `i18n_dict3.js` |
| 7 | Montants « −0 » / « − 0 € » (écart nul affiché comme négatif) | `i18n.js`, `modules3.js`, `app.js` |
| 8 | Alerte « Journal : rien écrit depuis 3 jours » dès la création du compte → comptée depuis la date de création | `modules5.js` |
| 9 | Graphique sans données : axe « 0 0 1 1 1 » → graduations entières | `modules4.js` |
| 10 | Mois abrégés incohérents en anglais / espagnol / portugais (« June », « August » au milieu de « Jan, Feb… ») | `i18n_dict.js` |
| 11 | Accessibilité : bouton Ajout rapide nommé, menu nommé, messages annoncés aux lecteurs d'écran, couleur de barre du téléphone qui suit le thème clair/sombre, description de page, message sans JavaScript | `index.html`, `app.js` |
| 12 | Cache hors-ligne `lumina-v23` (les appareils reçoivent la nouvelle version) | `service-worker.js` |

## Non modifié (à décider)
- `old/data/base_excel.js` contient encore des données personnelles : à retirer avant tout partage ou hébergement.
- En anglais / espagnol / portugais, certains titres restent en français (ex. « Synthèse des flux », « Données & Import »).
- Les prix du catalogue « Actualités & opportunités » sont en FCFA mais s'affichent avec la devise choisie, sans conversion.
