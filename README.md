# LUMENA / LUMINA

Application personnelle de pilotage (budget, épargne, projets, objectifs), hors-ligne (PWA), sans serveur.

## Structure du dépôt
```
LUMENA/
├── docs/             Application web publiée (index.html, app.js, modules, i18n, PWA, photos)
├── documentation/    Cahier des charges, plan d'action, phase 0 (PDF/Word)
├── data-privee/      Données personnelles (ignoré par Git, jamais publié)
├── .github/workflows/pages.yml   Déploiement automatique GitHub Pages
├── .gitignore  LICENSE  README.md
```
Le guide d'utilisation de l'application est dans [docs/README.md](docs/README.md).

## Lancer en local
```
cd docs
python -m http.server 8080
```
puis ouvrir http://localhost:8080

## Publier sur GitHub Pages
```
git init -b main
git add .
git commit -m "LUMENA : première publication"
git remote add origin https://github.com/<utilisateur>/<depot>.git
git push -u origin main
```
Sur GitHub : **Settings → Pages → Source : GitHub Actions** (le workflow fourni déploie `docs/`).
Variante sans workflow : Source **Deploy from a branch → main → /docs**.

Site : `https://<utilisateur>.github.io/<depot>/`

Attention : GitHub distingue majuscules et minuscules dans les noms de fichiers.
