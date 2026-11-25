# LUMINA

> Ne plus naviguer à l’aveugle : la clarté sur vos comptes, mois par mois, poste par poste.

Application personnelle hors-ligne (PWA), sans serveur. Ouvrir `index.html` (ou `python -m http.server 8080`).

## Comptes
- Premier lancement : créer le compte **administrateur** (il récupère les données déjà présentes sur l'appareil).
- Chaque utilisateur a un espace de données séparé (nom + mot de passe, haché PBKDF2).
- L'administrateur gère les comptes (réinitialisation, suppression, rôles) dans « Administration ».
- Limite : tout reste dans le navigateur de l'appareil. Pour un accès multi-appareils sécurisé, prévoir une authentification serveur (Supabase…).

## Avant de partager / héberger
`base_excel.js` contient des données personnelles lisibles par tous : supprimez-le une fois les données importées dans votre compte.

## Langues, pays et devises
- Chaque utilisateur choisit sa langue, son pays et sa devise (à l'inscription, modifiable dans Réglages).
- Langues : français, English, Español, Português. Les textes sont traduits via `i18n_dict.js` (colonnes : fr, en, es, pt) ; un texte absent reste en français.
- Pour ajouter une langue : l'ajouter dans `LANGS` (`i18n.js`) et ajouter une colonne à chaque ligne de `i18n_dict.js`.
- Changer la devise change l'affichage, pas les montants (aucune conversion).

## Modules santé, projets et micro-investissement
- **Projets** : radar de risques (retard, budget, cadence), prévision de fin, analyse IA optionnelle, partage du point projets.
- **Micro-investissement local** (menu Argent) : carnet de suivi des projets locaux soutenus, portefeuille, simulateur. Ne collecte ni ne transfère d'argent.
- **Traitements** (menu Personnel) : prises du jour, rappels (application ouverte), interactions courantes, partage avec un proche.
- **Nutrition personnalisée** : besoins, menus hebdomadaires adaptés au profil et à 5 marqueurs génétiques (saisie ou fichier ADN brut lu localement).
- **Bien-être mental** : bilan quotidien, signaux d'alerte, conseils, ressources d'aide par pays.
- Fonctionnalités nécessitant un serveur (non incluses) : synchronisation temps réel entre appareils, notifications push hors application, vraie mise en relation investisseurs / entrepreneurs, paiements.

## v3 : bourse, budget annuel, plan 15 ans, fonds collectif
- **Bourse BRVM** : ordres (achat, vente, dividende, division d'actions), CMP, frais SGI/BRVM paramétrables, gains/pertes par ligne et par société, allocation sectorielle. Les cours se saisissent à la main (brvm.org / SGI) ; aucune cotation en direct n'est récupérée.
- **Budget annuel** : plan mois par mois par catégorie (copie de l'année précédente, départ du réel), tableau réel vs budget. Le plan alimente les cibles partout.
- **Plan financier 15 ans** : projection simplifiée par scénario (prudent / réaliste / optimiste) avec stress-test.
- **Fonds collectif** (facultatif, Réglages) : collecté, restes à payer, trésorerie, rapprochement.
- **Conseils** sur chaque rubrique et **alertes clignotantes** (cloche en haut à droite ; animation désactivée si le système demande de réduire les animations).
- Années disponibles : de N-3 à N+15 (ou plus si vos données vont plus loin).
- Supprimer `base_excel.js` ET `base_excel2.js` avant de partager l'application.

## v5
- **Fonds collectif** : date de prise, échéance, payé / reste à payer, signalisation clignotante après échéance, bouton « ± Versement » (incrémente ou décrémente), « Sortie » (dépense du fonds), total attendu modifiable (20 655 000 par défaut).
- **Toutes les années** dans le Tableau de bord, et page **Comparaison d’années** (sélection libre, courbes, tableau par catégorie).
- **Investissements** : allocation du patrimoine incluant le portefeuille BRVM ; objectif retraite avec budget proposé, actions à mener et idées.
- **Objectifs d’épargne** : montants proposés (mensuel / annuel) calculés pour chaque utilisateur à partir de ses revenus, crédits et prélèvements.
- **Alertes** planning, tâches, collectif, anniversaires, journal. Barre de filtres figée, titres agrandis.
- Fichiers ajoutés : modules5.js, i18n_dict5.js. Supprimer base_excel.js et base_excel2.js avant de partager.

## v6
- **Rangement** : les anciennes sauvegardes (`app.js.bak-*`) et copies de `index.html` sont dans `old/` (non chargées par l'application). Les fichiers actifs restent à la racine de `lifeos/`.
- **Dîme par utilisateur** : choix à l'inscription, dans l'assistant de démarrage et dans Réglages — « me demander à chaque revenu », « proposée automatiquement » ou « je ne paie pas la dîme ». À chaque revenu, la dîme est confirmée (ou refusée) et son taux est modifiable ; avec « ne paie pas », le taux vaut 0 dans tous les calculs (budget, plan, tableau de bord). Un sélecteur est aussi présent sur Budget annuel et Plan financier.
- **Projets** : titulaire, gestionnaire, mensualité, personnes concernées avec montant par personne (une ligne « Nom : montant »), type de paiement. Les champs de suivi (statut, dates, budget, tâches, photo) sont conservés : le Radar IA en dépend.
- **Charte** : texte blanc (thème sombre) ou noir (thème clair) ; rouge / orange réservés aux alertes et dépassements.
- **Récap par catégorie** : vue Annuelle / Mensuelle / Par poste et « Échelle figée » mémorisées par compte ; la catégorie sélectionnée ne change plus d'elle-même et la page garde sa position de défilement.
- **Actualités & opportunités** (menu Organisation) : alertes saisonnières selon le pays, météo locale facultative (open-meteo.com, uniquement après activation), projets clés en main classés par pertinence avec devis détaillé, budget prévisionnel, plan de financement, création du projet en un clic, export Excel, analyse IA (clé API requise ; recherche web tentée si disponible). Les prix du catalogue sont des ordres de grandeur en FCFA, à confirmer par des devis locaux.
- **Actualiser** : bouton dans la barre du haut et sur chaque page principale ; relit les données du compte, relance les migrations, vide le cache météo et redessine la page.
- Fichier ajouté : `modules6.js`.

## v7
- **Correction des données** (`modules7.js`, au premier chargement, annulable) : supprime les écritures fantômes de novembre 2026 (revenu 250 000, prêt 115 000, assurance 69 000) et les doublons exacts, restaure les lignes manquantes de novembre 2026, normalise statuts et catégories, classe les projets (échecs, actifs, terrain pour un tiers). Réservé aux données issues du classeur Excel ; rapport dans Réglages.
- **Bilan des projets** : injecté au 31/12/N (actifs / échecs / tiers), reste à payer, projection N+1 mois par mois. Les lignes Finances d'un projet sont rattachées par leur libellé (champs du formulaire projet). Un projet dont le titulaire commence par « Tiers » est exclu de toutes vos sorties et totaux.
- **Budget cible & conseils** : budget du mois (engagements, essentiels, épargne, variables), plan de rattrapage épargne / bourse, conseils sur les dépenses personnelles, boutons IA.
- **Garde-fous** : alerte à la saisie (dépassement de catégorie, du budget variable, solde négatif sans précaution suffisante) et dans la cloche ; désactivable.
- **Profil et règles** par utilisateur (Réglages) : profil de revenus, zone, % d'épargne, aumônes, projets pour tiers, dîme.
- **PWA** : `manifest.json`, `service-worker.js` (hors-ligne), bouton « Installer l'application », menu mobile, tableaux en cartes. APK : voir `mobile/MOBILE.md`.

## v8
- **Pratique religieuse** (obligatoire à l'inscription, à l'assistant de démarrage et, pour les comptes existants, par une question au premier chargement) : Oui / Non. « Oui » ouvre le taux de la dîme, son mode de prélèvement, le montant et la fréquence des aumônes et les autres dépenses de culte. « Non » met la dîme et les aumônes à 0 et masque le pôle Religion / Culte (tant qu'il n'a aucune écriture).
- **Pôle Religion / Culte** (Dîmes, Aumônes, Culte & œuvres) et ligne **Assurances** en charges fixes obligatoires (NSIA, SANLAM, décès parents).
- **Barre latérale** : Budget, Projets, Catégories, Épargne & Investissements regroupent leurs sous-pages sous des onglets.
- **Projets** : pastilles de statut (vert émeraude, indigo, rouge/ambre), montant total engagé, taux d'avancement ou de perte.
- **Zoom A− / A+** dans la barre du haut (80 % à 160 %, mémorisé).
- **Filtres** : changer l'année remet le mois à zéro ; choisir un mois règle l'année correspondante.
- **Nord de la Côte d'Ivoire** : zone « Côte d'Ivoire — Nord (Korhogo) » dans Réglages (météo de Korhogo, alertes saisonnières locales, projets anacarde, karité, embouche ovine, séchage de mangues).
- Fichier ajouté : `modules8.js`.

## v9 — LUMINA (nomenclature, historique, taxonomie comptable)
- **Nom officiel unique : LUMINA** (anciennement LifeOS / LUMEN-A / LUMENA / NEXORA). Les clés de stockage `nexora.*`, `lumena.*`, `lumen.*`, `lumen-a.*` sont copiées vers `lumina.*` au premier chargement par `keys-migrate.js` (l'ancienne clé n'est supprimée qu'une fois la copie réussie ; aucune donnée n'est perdue). La clé historique `lifeos.v1` reste lue pour rattacher les très anciennes données au premier compte administrateur.
- **Historique et annulation** : chaque enregistrement est journalisé (état précédent). `Ctrl+Z`, le bouton « Annuler la dernière action » (barre du haut ou message de confirmation) et la page « Historique & restauration » (restauration par module). `Ctrl+S` = Enregistrer. Les pages à saisie directe (budget annuel, épargne, plan, collectif…) ont un bouton **Enregistrer** explicite.
- **Taxonomie comptable** : ordre des flux Revenus → Dépenses (fixes, variables, pertes, dettes) → Épargne & investissements. Groupes : Revenus, Besoins, Envies, Dettes & Remboursements, Fonds perdus, Religion / Culte, Épargne, Investissement Bourse (l'ancien « Épargne & Dettes » est scindé). Assurances (NSIA, SANLAM, études) = « Épargne Études Enfants » ; retenues bancaires et agios = « Fonds perdus / Frais bancaires » ; la catégorie « Autres » est vidée par règles lexicales. Migration automatique, idempotente et **annulable** (Réglages → Classification comptable).
- **Budgets trimestriels** (Budget → Budgets trimestriels) : Budget Voyage et Supplément Enfants alloués en T1–T4 (janvier, avril, juillet, octobre par défaut).
- **Fonds collectif** : « Complet (0 FCFA restant) » quand le total attendu est atteint et les créances soldées, sans fausse alerte de rapprochement.
- **Religion / Culte** masqué par défaut ; affiché si la pratique est activée ou si une écriture contient un mot-clé religieux.
- **Filtre d'année maître** (barre du haut) de 2020 à N+15 : Tableau de bord, Budget, Synthèse annuelle, Comparaison, Reporting. **Alertes futures** : base réalisé + prévu/engagé et plafonds indexés sur l'inflation (3 % par défaut, Réglages).
- **Coffre-fort** : types prédéfinis, alerte de renouvellement par document, pièce jointe avec aperçu, guide d'utilisation.
- Fichiers ajoutés : `keys-migrate.js`, `modules9.js`. Cache hors-ligne : `lumina-v18`.
