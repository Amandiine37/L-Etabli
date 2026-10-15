# L'Établi — atelier horloger

Application perso pour réparer des montres mécaniques et automatiques, pensée pour le
téléphone à l'établi. Installable sur l'écran d'accueil, marche **sans internet**.
Les données (montres, photos, interventions) restent **sur le téléphone** : rien n'est envoyé en ligne.

## Ce qu'elle fait

| Onglet | Contenu |
|---|---|
| **Mes montres** | Fiche par montre (marque, réf., calibre, boîte), photos, interventions datées. |
| ↳ Photos | Repères numérotés posés sur la photo (plan des vis avant démontage), avec une note par repère. |
| ↳ Interventions | Type, constat, pièces, huiles, **mesures avant / après** (6 positions + 24 h) avec analyse, et pour une « Révision complète » les 34 étapes à cocher. |
| **Identifier** | Photo du mouvement + critères (numéro gravé, remontage, affichage, fréquence, rubis, diamètre, stop-seconde, marque) → calibres possibles classés, avec ✓ / ✗ par critère. |
| **Calibres** | Base de 55 calibres courants (ETA, Sellita, Soprod, Seiko, Orient, Citizen, Miyota, Rolex, Tudor, Omega, Zenith, Lemania, Valjoux, Unitas, Vostok, Poljot…) + tes calibres perso. |
| **Atelier** | Analyse rapide de mesures, diagnostic par symptôme, tableau des huiles, ordre de révision, outils (correction d'amplitude selon l'angle de levée, marche sans appareil, fréquences, lignes ↔ mm). |

## Justesse des données

- `donnees.js` contient toute la base technique. **Une valeur incertaine est laissée à `null`
  (affichée « non renseigné ») ou listée dans `doute` (affichée « à vérifier »)**. Ne jamais
  remplir un trou de mémoire : confronter à la fiche technique officielle du fabricant.
- Les repères d'amplitude, de défaut de repère et les tolérances ETA sont des repères d'atelier,
  pas des normes. Les huiles : la fiche de service du fabricant prime toujours.

## Fichiers

- `index.html` — page et styles · `app.js` — l'application · `donnees.js` — la base technique
- `sw.js` — fonctionnement hors connexion · `manifest.webmanifest` + `icon-*.png` — installation
- `_icones.py` — régénère les icônes (`python _icones.py`) · `serve.py` — serveur de test local (port 4220)

## À chaque nouvelle version

Changer le numéro **aux deux endroits ensemble** :
1. `VERSION` et les `?v=…` de la liste `ASSETS` dans `sw.js` ;
2. les `?v=…` des deux `<script>` en bas d'`index.html`.

Sans ça, le téléphone garde l'ancienne version en cache.

## Sauvegarde

Réglages (roue crantée) → « Sauvegarder (avec photos) » produit un fichier `.json` à garder
ailleurs que sur le téléphone. « Restaurer » remplace toutes les données par celles du fichier.
