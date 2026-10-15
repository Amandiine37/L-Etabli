/* Service worker : rend l'app utilisable hors connexion.
 *
 * Strategie « reseau d'abord » : tant qu'il y a du reseau, on sert la
 * derniere version (donc les mises a jour arrivent toutes seules) ; sans
 * reseau, on rejoue la copie mise en cache.
 *
 * IMPORTANT — a chaque livraison : incrementer VERSION ci-dessous.
 * C'est la modification de ce fichier qui declenche le bandeau
 * « Une nouvelle version est prete » dans l'application. Sans elle, le
 * navigateur ne voit aucune mise a jour et le bandeau n'apparait jamais.
 */
var VERSION = "1.1";
var CACHE = "etabli-v" + VERSION;
var ASSETS = [
  "./",
  "./index.html",
  "./donnees.js?v=1.1",
  "./app.js?v=1.1",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(ASSETS);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (noms) {
      return Promise.all(noms.map(function (nom) {
        return nom === CACHE ? null : caches.delete(nom);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", function (event) {
  var req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(req).then(function (res) {
      if (res && res.status === 200) {
        var copie = res.clone();
        caches.open(CACHE).then(function (cache) { cache.put(req, copie); });
      }
      return res;
    }).catch(function () {
      return caches.match(req).then(function (hit) {
        // Navigation hors ligne : servir la page d'accueil mise en cache.
        return hit || (req.mode === "navigate" ? caches.match("./index.html") : undefined);
      });
    })
  );
});
