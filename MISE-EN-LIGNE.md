# Mettre L'Établi en ligne (GitHub Pages)

Même méthode que pour Reventes : un dépôt **public** sur ton compte GitHub **perso**
`amandiine37` (jamais le compte OptimaHR), des fichiers déposés depuis le navigateur.
Rien à installer.

Adresse finale : **https://amandiine37.github.io/etabli/**

> Le dépôt est public : le code de l'appli est visible, mais **tes montres, photos et
> mesures ne partent jamais en ligne**. Elles restent dans le téléphone.

## 1. Créer le dépôt

1. Sur github.com, connectée avec `amandiine37` : bouton **+** en haut à droite → **New repository**.
2. Nom du dépôt : `etabli`.
3. Cocher **Public**. Ne rien cocher d'autre (pas de README, pas de .gitignore).
4. **Create repository**.

## 2. Déposer les fichiers

1. Sur la page du dépôt vide, cliquer le lien **uploading an existing file**.
2. Ouvrir le dossier `Documents\Projets perso\etabli-horloger` et **glisser les 11 fichiers**
   dans la page :
   `index.html`, `app.js`, `donnees.js`, `sw.js`, `manifest.webmanifest`,
   `icon-192.png`, `icon-512.png`, `README.md`, `MISE-EN-LIGNE.md`, `_icones.py`, `serve.py`
   (les deux `.py` ne servent pas en ligne, ils gardent juste une copie du projet).
3. En bas : **Commit changes**.

## 3. Activer la page

1. Dans le dépôt : **Settings** → **Pages** (menu de gauche).
2. *Source* : **Deploy from a branch**. *Branch* : **main**, dossier **/ (root)** → **Save**.
3. Attendre 1 à 2 minutes, puis recharger : l'adresse apparaît en haut de la page Pages.

## 4. Installer sur le téléphone

- **Android (Chrome)** : ouvrir l'adresse → menu ⋮ → **Ajouter à l'écran d'accueil** (ou **Installer l'application**).
- **iPhone (Safari)** : ouvrir l'adresse → bouton **Partager** → **Sur l'écran d'accueil**.

Lancer une fois l'appli avec internet : elle marche ensuite hors connexion.
Au premier appui sur l'appareil photo, le téléphone demande l'autorisation : accepter.

## Mettre à jour plus tard

1. Je modifie les fichiers et je change le numéro de version (`sw.js` et `index.html`).
2. Tu redéposes **les fichiers modifiés** de la même façon (**Add file** → **Upload files**) :
   GitHub remplace ceux qui ont le même nom.
3. Sur le téléphone, fermer puis rouvrir l'appli avec internet : la nouvelle version se charge.

## Sauvegarde (important)

Les données ne vivent que dans le téléphone. Si l'appli est supprimée ou les données du
navigateur effacées, tout est perdu. Penser à **Réglages (roue crantée) → Sauvegarder (avec photos)**
de temps en temps, et à garder le fichier ailleurs (Drive, ordinateur).
