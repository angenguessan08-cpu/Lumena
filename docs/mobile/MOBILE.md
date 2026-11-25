# LUMINA — installer sur mobile et générer l'APK

LUMINA est une PWA : elle s'installe déjà depuis le navigateur (bouton « Installer l'application »). L'APK n'est utile que pour
une distribution hors navigateur (Play Store, partage de fichier). Deux voies, à choisir.

## Prérequis communs
- L'application doit être servie en **HTTPS** (ou `localhost`) pour que le service worker et l'installation fonctionnent.
  Hébergements gratuits possibles : GitHub Pages, Netlify, Cloudflare Pages (déposer le contenu du dossier `lumina/`).
- **Avant de publier** : supprimer le dossier `data/` (données personnelles) et `old/`, puis retirer les deux lignes
  `<script src="data/…">` de `index.html` pour éviter une erreur 404 (le script `npm run web` le fait automatiquement).
- Les icônes sont dans `icons/` (192, 512, maskable 512, apple-touch 180). Pour les régénérer depuis `logo.svg` :
  ouvrir `logo.svg` dans un éditeur ou un outil comme https://maskable.app/editor, exporter en PNG 512×512 et 192×192
  (fond `#140e1c`, logo à ~60 % de la largeur pour la version « maskable »).

## Voie A — Capacitor (APK autonome, fonctionne hors-ligne)
Nécessite Node 18+, Java 17 et Android Studio (SDK Android).

```bash
cd lumina/mobile
npm install
npm run web          # copie l'application dans mobile/www (sans old/, sans data/, sans mobile/)
npx cap add android  # une seule fois
npm run sync         # recopie le web et synchronise le projet Android
npm run apk          # génère android/app/build/outputs/apk/debug/app-debug.apk
```
- Installer l'APK de test : `adb install android/app/build/outputs/apk/debug/app-debug.apk`
  (ou copier le fichier sur le téléphone et l'ouvrir ; autoriser les sources inconnues).
- APK / AAB signé pour le Play Store : `npx cap open android` puis *Build > Generate Signed Bundle / APK*.
- Icône Android : `npx @capacitor/assets generate --android` après avoir placé `icons/icon-512.png` dans `mobile/assets/icon-only.png`
  et `icons/maskable-512.png` dans `mobile/assets/icon-foreground.png`.
- Les données restent dans le stockage de l'application (WebView) : pensez à l'export Excel régulier.

## Voie B — TWA (Trusted Web Activity, via Bubblewrap)
L'APK ouvre simplement votre site HTTPS en plein écran. Nécessite un site déjà hébergé.

```bash
npm i -g @bubblewrap/cli
cd lumina/mobile
# éditer twa-manifest.json : remplacer "host" par votre domaine
bubblewrap init --manifest https://VOTRE-DOMAINE/manifest.json
bubblewrap build     # produit app-release-signed.apk et app-release-bundle.aab
```
Puis publier `https://VOTRE-DOMAINE/.well-known/assetlinks.json` avec l'empreinte SHA-256 affichée par `bubblewrap fingerprint`
(sans cela, la barre d'adresse reste visible dans l'application).

## iPhone / iPad
Pas d'APK : ouvrir le site dans Safari, bouton Partager, « Sur l'écran d'accueil ».

## Ce qui n'est pas inclus
- Aucune synchronisation serveur : les données restent sur l'appareil. Au retour de la connexion, l'application relit ses données
  locales, met à jour son cache et la météo. Une vraie synchronisation entre appareils demande un serveur (Supabase, Firebase…).
