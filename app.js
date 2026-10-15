/* L'Établi — application d'atelier horloger.
 * Données sur l'appareil (IndexedDB : les photos sont trop lourdes pour le localStorage).
 * Aucune donnée ne part sur internet.
 */
(function () {
  "use strict";

  /* ---------- Outils ---------- */
  function $(sel, racine) { return (racine || document).querySelector(sel); }
  function $$(sel, racine) { return Array.prototype.slice.call((racine || document).querySelectorAll(sel)); }
  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function nouvelId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function aujourdhui() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function dateFr(iso) {
    if (!iso) return "";
    var p = iso.slice(0, 10).split("-");
    return p.length === 3 ? p[2] + "/" + p[1] + "/" + p[0] : iso;
  }
  function nombre(v) {
    if (v === "" || v == null) return null;
    var n = parseFloat(String(v).replace(",", ".").replace(/\s/g, ""));
    return isFinite(n) ? n : null;
  }
  function fmt(n, dec) {
    if (n == null || !isFinite(n)) return "—";
    return n.toLocaleString("fr-FR", { minimumFractionDigits: dec || 0, maximumFractionDigits: dec || 0 });
  }
  function signe(n, dec) {
    if (n == null || !isFinite(n)) return "—";
    return (n > 0 ? "+" : n < 0 ? "−" : "") + fmt(Math.abs(n), dec);
  }
  function normaliser(t) {
    return String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");
  }
  var ICONES = {
    chevron: '<svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>',
    montre: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="6"/><path d="M12 9v3l2 1"/><path d="M9 6.5 9.6 2h4.8l.6 4.5M9 17.5l.6 4.5h4.8l.6-4.5"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    photo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
    galerie: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/></svg>',
    crayon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>',
    epingle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s7-6.5 7-12a7 7 0 0 0-14 0c0 5.5 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/></svg>'
  };

  /* ---------- Stockage (IndexedDB) ---------- */
  var STORES = ["montres", "interventions", "photos", "calibres"];
  var db = null;
  function ouvrirBase() {
    return new Promise(function (ok, ko) {
      var req = indexedDB.open("etabli", 1);
      req.onupgradeneeded = function () {
        var d = req.result;
        STORES.forEach(function (s) { if (!d.objectStoreNames.contains(s)) d.createObjectStore(s, { keyPath: "id" }); });
      };
      req.onsuccess = function () { db = req.result; ok(); };
      req.onerror = function () { ko(req.error); };
    });
  }
  function tout(store) {
    return new Promise(function (ok, ko) {
      var r = db.transaction(store).objectStore(store).getAll();
      r.onsuccess = function () { ok(r.result || []); };
      r.onerror = function () { ko(r.error); };
    });
  }
  function ecrire(store, obj) {
    return new Promise(function (ok, ko) {
      var t = db.transaction(store, "readwrite");
      t.objectStore(store).put(obj);
      t.oncomplete = function () { ok(obj); };
      t.onerror = function () { ko(t.error); };
    });
  }
  function effacer(store, id) {
    return new Promise(function (ok, ko) {
      var t = db.transaction(store, "readwrite");
      t.objectStore(store).delete(id);
      t.oncomplete = function () { ok(); };
      t.onerror = function () { ko(t.error); };
    });
  }
  function viderStore(store) {
    return new Promise(function (ok, ko) {
      var t = db.transaction(store, "readwrite");
      t.objectStore(store).clear();
      t.oncomplete = function () { ok(); };
      t.onerror = function () { ko(t.error); };
    });
  }

  /* Données en mémoire : tout est chargé au démarrage, l'écriture suit. */
  var D = { montres: [], interventions: [], photos: [], calibres: [] };
  var urlsPhotos = {};
  function urlPhoto(p) {
    if (!p || !p.blob) return "";
    if (!urlsPhotos[p.id]) urlsPhotos[p.id] = URL.createObjectURL(p.blob);
    return urlsPhotos[p.id];
  }
  function enregistrer(store, obj) {
    var liste = D[store];
    var i = liste.findIndex(function (x) { return x.id === obj.id; });
    if (i >= 0) liste[i] = obj; else liste.push(obj);
    return ecrire(store, obj);
  }
  function supprimer(store, id) {
    D[store] = D[store].filter(function (x) { return x.id !== id; });
    if (store === "photos" && urlsPhotos[id]) { URL.revokeObjectURL(urlsPhotos[id]); delete urlsPhotos[id]; }
    return effacer(store, id);
  }

  /* ---------- Préférences légères (localStorage, facultatif) ---------- */
  function lirePref(cle, defaut) { try { var v = localStorage.getItem("etabli_" + cle); return v == null ? defaut : JSON.parse(v); } catch (e) { return defaut; } }
  function ecrirePref(cle, v) { try { localStorage.setItem("etabli_" + cle, JSON.stringify(v)); } catch (e) { /* stockage indisponible : on continue */ } }
  function appliquerTheme() {
    var t = lirePref("theme", "auto");
    if (t === "auto") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", t);
    var sombre = t === "dark" || (t === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    $('meta[name="theme-color"]').setAttribute("content", sombre ? "#121519" : "#F4F1EA");
  }

  /* ---------- Calibres ---------- */
  function tousCalibres() { return CALIBRES.map(function (c) { return c; }).concat(D.calibres); }
  function calibre(id) {
    if (!id) return null;
    return D.calibres.find(function (c) { return c.id === id; }) || CALIBRES.find(function (c) { return c.id === id; }) || null;
  }
  function nomCalibre(c) { return c ? (c.fabricant ? c.fabricant + " " : "") + c.nom : ""; }
  var LIB_AFF = { "aucun": "Heures, minutes (secondes)", "date": "Date", "jour-date": "Jour + date", "chrono": "Chronographe", "chrono-date": "Chronographe + date", "chrono-jour-date": "Chronographe + jour + date" };
  function estJaponais(c) { return c && /seiko|miyota|citizen|orient|vostok/i.test(c.fabricant || ""); }
  function lignesDe(c) {
    if (c.lignes) return c.lignes + " lignes";
    if (c.diam) return "≈ " + fmt(c.diam / LIGNE_MM, 1) + " lignes";
    return null;
  }

  /* ---------- Navigation ---------- */
  var etat = { onglet: lirePref("onglet", "montres"), pile: [], sousAtelier: "mesures" };
  var brouillonId = { mesures: {}, calibre: "" };

  /* Bouton retour du téléphone : on garde UNE seule entrée d'historique
   * tant qu'un écran est ouvert, et on la recrée après chaque retour. */
  var histoire = false;
  function assurerHistoire() {
    if (histoire) return;
    try { history.pushState({ etabli: 1 }, ""); histoire = true; } catch (e) { /* aperçu sans historique */ }
  }
  function ouvrir(ecran) {
    etat.pile.push(ecran);
    assurerHistoire();
    rendre(true);
  }
  function retour() {
    if (!etat.pile.length) return;
    if (etat.pile.length === 1 && histoire) { history.back(); return; }
    etat.pile.pop(); rendre(true);
  }
  window.addEventListener("popstate", function () {
    histoire = false;
    if (etat.pile.length) {
      etat.pile.pop();
      if (etat.pile.length) assurerHistoire();
      rendre(true);
    }
  });
  function remplacerEcran(ecran) { etat.pile[etat.pile.length - 1] = ecran; rendre(true); }

  function rendre(enHaut) {
    var vue = $("#vue");
    var haut = etat.pile[etat.pile.length - 1];
    var titre = "L'Établi", sousTitre = "";
    var html;
    if (haut) {
      var r = ECRANS[haut.type](haut);
      html = r.html; titre = r.titre; sousTitre = r.sous || "";
    } else {
      var r2 = ONGLETS[etat.onglet]();
      html = r2.html; titre = r2.titre; sousTitre = r2.sous || "";
    }
    vue.innerHTML = html;
    $("#titre").innerHTML = esc(titre) + (sousTitre ? "<small>" + esc(sousTitre) + "</small>" : "");
    $("#btn-retour").classList.toggle("cache", !haut);
    $$("nav.onglets button").forEach(function (b) {
      if (b.dataset.onglet === etat.onglet && !haut) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
    });
    if (enHaut) window.scrollTo(0, 0);
    if (haut && APRES[haut.type]) APRES[haut.type](haut);
    if (!haut && APRES["onglet-" + etat.onglet]) APRES["onglet-" + etat.onglet]();
  }

  function toast(msg) {
    var t = document.createElement("div");
    t.className = "toast"; t.textContent = msg; t.setAttribute("role", "status");
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2600);
  }

  /* ---------- Photos : compression ---------- */
  function compresser(fichier, maxCote) {
    maxCote = maxCote || 2000;
    return new Promise(function (ok, ko) {
      var url = URL.createObjectURL(fichier);
      var img = new Image();
      img.onload = function () {
        var r = Math.min(1, maxCote / Math.max(img.naturalWidth, img.naturalHeight));
        var w = Math.round(img.naturalWidth * r), h = Math.round(img.naturalHeight * r);
        var cv = document.createElement("canvas"); cv.width = w; cv.height = h;
        cv.getContext("2d").drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        cv.toBlob(function (b) { b ? ok({ blob: b, l: w, h: h }) : ko(new Error("Compression impossible")); }, "image/jpeg", 0.86);
      };
      img.onerror = function () { URL.revokeObjectURL(url); ko(new Error("Image illisible")); };
      img.src = url;
    });
  }
  var cibleAjoutPhoto = null; // { montreId } ou { identification: true }
  function demanderPhoto(cible, galerie) {
    cibleAjoutPhoto = cible;
    var e = galerie ? $("#entree-photo-galerie") : $("#entree-photo");
    e.value = "";
    e.click();
  }
  function recevoirPhotos(fichiers) {
    var cible = cibleAjoutPhoto; cibleAjoutPhoto = null;
    if (!cible || !fichiers.length) return;
    Promise.all(Array.prototype.map.call(fichiers, function (f) { return compresser(f); })).then(function (res) {
      if (cible.identification) {
        etat.photoIdent = res[0];
        rendre(false);
        return;
      }
      var ids = [];
      var travaux = res.map(function (r) {
        var p = { id: nouvelId(), montreId: cible.montreId, blob: r.blob, l: r.l, h: r.h, legende: "", reperes: [], date: new Date().toISOString() };
        ids.push(p.id);
        return enregistrer("photos", p);
      });
      return Promise.all(travaux).then(function () {
        if (ids.length === 1) ouvrir({ type: "photo", id: ids[0] });
        else { rendre(false); toast(ids.length + " photos ajoutées"); }
      });
    }).catch(function (e) { toast("Photo non enregistrée : " + e.message); });
  }

  /* ======================================================================
   *  ONGLET : MES MONTRES
   * ==================================================================== */
  function photosDe(montreId) {
    return D.photos.filter(function (p) { return p.montreId === montreId; }).sort(function (a, b) { return a.date < b.date ? -1 : 1; });
  }
  function interventionsDe(montreId) {
    return D.interventions.filter(function (i) { return i.montreId === montreId; }).sort(function (a, b) { return a.date < b.date ? 1 : -1; });
  }
  function titreMontre(m) { return [m.marque, m.modele].filter(Boolean).join(" ") || "Montre sans nom"; }

  var ONGLETS = {};
  ONGLETS.montres = function () {
    var liste = D.montres.slice().sort(function (a, b) { return titreMontre(a).localeCompare(titreMontre(b), "fr"); });
    var h = '<div class="titre-section"><h2>Mes montres</h2><button class="btn principal petit" data-action="nouvelle-montre">' + ICONES.plus + ' Ajouter</button></div>';
    if (!liste.length) {
      h += '<div class="carte vide">' + ICONES.montre + '<p><b>Ton établi est vide.</b><br>Ajoute une montre pour garder ses photos, son calibre, chaque intervention et les mesures avant / après.</p>' +
        '<div class="actions" style="justify-content:center"><button class="btn principal" data-action="nouvelle-montre">' + ICONES.plus + ' Ajouter une montre</button>' +
        '<button class="btn" data-action="onglet" data-onglet="identifier">Identifier un calibre</button></div></div>';
      return { html: h, titre: "L'Établi", sous: "Atelier horloger" };
    }
    liste.forEach(function (m) {
      var ph = photosDe(m.id)[0];
      var c = calibre(m.calibreId);
      var der = interventionsDe(m.id)[0];
      var etatPuce = m.etat === "atelier" ? '<span class="puce attention">À l\'établi</span>' : m.etat === "attente" ? '<span class="puce">En attente de pièce</span>' : '<span class="puce ok">En service</span>';
      h += '<button class="liste-item" data-action="voir-montre" data-id="' + m.id + '">' +
        (ph ? '<img class="vignette" alt="" src="' + urlPhoto(ph) + '">' : '<span class="vignette">' + ICONES.montre + '</span>') +
        '<span class="etire"><b>' + esc(titreMontre(m)) + '</b><br><span class="doux petit">' + esc(c ? nomCalibre(c) : (m.calibreLibre || "Calibre non identifié")) + '</span>' +
        '<span class="puces" style="margin-top:4px">' + etatPuce + (der ? '<span class="puce">' + esc(dateFr(der.date)) + '</span>' : '') + '</span></span>' +
        ICONES.chevron + '</button>';
    });
    return { html: h, titre: "L'Établi", sous: D.montres.length + " montre" + (D.montres.length > 1 ? "s" : "") };
  };

  var ECRANS = {};
  var APRES = {};

  ECRANS.montre = function (e) {
    var m = D.montres.find(function (x) { return x.id === e.id; });
    if (!m) return { html: '<p class="vide">Montre introuvable.</p>', titre: "Montre" };
    var c = calibre(m.calibreId);
    var phs = photosDe(m.id);
    var ints = interventionsDe(m.id);
    var h = '<div class="carte"><div class="ligne haut"><div class="etire">' +
      '<h2>' + esc(titreMontre(m)) + '</h2>' +
      '<p class="doux petit" style="margin:4px 0 0">' + esc([m.reference && "Réf. " + m.reference, m.serie && "N° " + m.serie, m.annee].filter(Boolean).join(" · ")) + '</p></div>' +
      '<button class="icone-btn" aria-label="Modifier la montre" data-action="modifier-montre" data-id="' + m.id + '">' + ICONES.crayon + '</button></div>';
    if (m.notes) h += '<p style="white-space:pre-wrap;margin:10px 0 0">' + esc(m.notes) + '</p>';
    var infos = [];
    if (m.diamBoite) infos.push("Boîte " + esc(m.diamBoite) + " mm");
    if (m.entreCornes) infos.push("Entre-cornes " + esc(m.entreCornes) + " mm");
    if (m.verre) infos.push("Verre " + esc(m.verre));
    if (m.etancheite) infos.push("Étanche " + esc(m.etancheite));
    if (infos.length) h += '<div class="puces" style="margin-top:10px">' + infos.map(function (i) { return '<span class="puce">' + i + '</span>'; }).join("") + '</div>';
    h += '</div>';

    h += '<div class="titre-section"><h3>Calibre</h3></div>';
    if (c) {
      h += '<button class="liste-item" data-action="voir-calibre" data-id="' + c.id + '"><span class="etire"><b>' + esc(nomCalibre(c)) + '</b><br>' +
        '<span class="doux petit num">' + resumeCalibre(c) + '</span></span>' + ICONES.chevron + '</button>';
    } else {
      h += '<div class="carte"><p style="margin:0">' + (m.calibreLibre ? "<b>" + esc(m.calibreLibre) + "</b> (hors base). " : "Calibre non identifié. ") +
        '</p><div class="actions"><button class="btn petit" data-action="identifier-pour" data-id="' + m.id + '">Identifier le calibre</button></div></div>';
    }

    h += '<div class="titre-section"><h3>Photos</h3><span class="doux petit">Touche une photo pour poser des repères</span></div><div class="photos">';
    phs.forEach(function (p) {
      h += '<button data-action="voir-photo" data-id="' + p.id + '" aria-label="Photo ' + esc(p.legende || "") + '"><img alt="" src="' + urlPhoto(p) + '">' +
        (p.reperes && p.reperes.length ? '<span class="puce laiton nb">' + p.reperes.length + ' repère' + (p.reperes.length > 1 ? "s" : "") + '</span>' : "") + '</button>';
    });
    h += '<button class="ajout-photo" data-action="prendre-photo" data-id="' + m.id + '" aria-label="Prendre une photo">' + ICONES.photo + '</button>';
    h += '<button class="ajout-photo" data-action="galerie-photo" data-id="' + m.id + '" aria-label="Choisir dans la galerie">' + ICONES.galerie + '</button>';
    h += '</div>';

    h += '<div class="titre-section"><h3>Interventions</h3><button class="btn principal petit" data-action="nouvelle-intervention" data-id="' + m.id + '">' + ICONES.plus + ' Nouvelle</button></div>';
    if (!ints.length) h += '<p class="doux petit">Aucune intervention. Commence par une « Révision complète » : la liste des étapes et les mesures avant / après sont prévues.</p>';
    ints.forEach(function (it) {
      var av = analyser(it.avant || {}, c), ap = analyser(it.apres || {}, c);
      var resume = [];
      if (av.moyenne != null) resume.push("avant " + signe(av.moyenne, 1) + " s/j");
      if (ap.moyenne != null) resume.push("après " + signe(ap.moyenne, 1) + " s/j");
      var prog = progression(it);
      h += '<button class="liste-item" data-action="voir-intervention" data-id="' + it.id + '"><span class="etire"><b>' + esc(it.type || "Intervention") + '</b>' +
        (it.titre ? " — " + esc(it.titre) : "") + '<br><span class="doux petit">' + esc(dateFr(it.date)) + (resume.length ? " · " + esc(resume.join(", ")) : "") + '</span>' +
        (prog ? '<span class="puces" style="margin-top:4px"><span class="puce ' + (prog.fait === prog.total ? "ok" : "laiton") + '">Étapes ' + prog.fait + '/' + prog.total + '</span></span>' : "") +
        '</span>' + ICONES.chevron + '</button>';
    });
    return { html: h, titre: titreMontre(m), sous: c ? nomCalibre(c) : "" };
  };

  function resumeCalibre(c) {
    var p = [];
    p.push(c.type === "auto" ? "Automatique" : "Manuel");
    if (c.freq) p.push(fmt(c.freq) + " A/h");
    if (c.rubis) p.push(c.rubis + " rubis");
    if (c.diam) p.push(fmt(c.diam, 2) + " mm");
    if (c.levee) p.push("levée " + c.levee + "°");
    return esc(p.join(" · "));
  }

  /* Formulaire montre */
  ECRANS["form-montre"] = function (e) {
    var m = e.id ? D.montres.find(function (x) { return x.id === e.id; }) : { calibreId: e.calibreId || "", etat: "atelier" };
    var options = '<option value="">— Non identifié —</option>' + tousCalibres().slice().sort(function (a, b) { return nomCalibre(a).localeCompare(nomCalibre(b), "fr"); })
      .map(function (c) { return '<option value="' + c.id + '"' + (c.id === m.calibreId ? " selected" : "") + '>' + esc(nomCalibre(c)) + '</option>'; }).join("");
    var h = '<form id="form-montre" class="carte" autocomplete="off">' +
      '<div class="grille-2"><label class="champ"><span>Marque</span><input type="text" name="marque" value="' + esc(m.marque) + '" list="liste-marques"></label>' +
      '<label class="champ"><span>Modèle</span><input type="text" name="modele" value="' + esc(m.modele) + '"></label></div>' +
      '<datalist id="liste-marques">' + MARQUES.map(function (x) { return '<option value="' + esc(x.nom) + '">'; }).join("") + '</datalist>' +
      '<div class="grille-2"><label class="champ"><span>Référence</span><input type="text" name="reference" value="' + esc(m.reference) + '"></label>' +
      '<label class="champ"><span>N° de série</span><input type="text" name="serie" value="' + esc(m.serie) + '"></label></div>' +
      '<div class="grille-2"><label class="champ"><span>Année / époque</span><input type="text" name="annee" value="' + esc(m.annee) + '" placeholder="ex. 1974"></label>' +
      '<label class="champ"><span>État</span><select name="etat">' +
      [["atelier", "À l'établi"], ["attente", "En attente de pièce"], ["service", "En service"]].map(function (o) { return '<option value="' + o[0] + '"' + (m.etat === o[0] ? " selected" : "") + '>' + o[1] + '</option>'; }).join("") +
      '</select></label></div>' +
      '<label class="champ"><span>Calibre</span><select name="calibreId">' + options + '</select><small>Pas dans la liste ? Laisse « Non identifié » et note-le ci-dessous, ou ajoute-le dans l\'onglet Calibres.</small></label>' +
      '<label class="champ"><span>Calibre (si hors base)</span><input type="text" name="calibreLibre" value="' + esc(m.calibreLibre) + '" placeholder="ex. Orient F6922"></label>' +
      '<div class="grille-2"><label class="champ"><span>Diamètre de boîte (mm)</span><input type="text" inputmode="decimal" name="diamBoite" value="' + esc(m.diamBoite) + '"></label>' +
      '<label class="champ"><span>Entre-cornes (mm)</span><input type="text" inputmode="decimal" name="entreCornes" value="' + esc(m.entreCornes) + '"></label></div>' +
      '<div class="grille-2"><label class="champ"><span>Verre</span><input type="text" name="verre" value="' + esc(m.verre) + '" placeholder="saphir, minéral, plexi…"></label>' +
      '<label class="champ"><span>Étanchéité</span><input type="text" name="etancheite" value="' + esc(m.etancheite) + '" placeholder="ex. 100 m"></label></div>' +
      '<label class="champ"><span>Notes</span><textarea name="notes" placeholder="Provenance, état d\'arrivée, particularités…">' + esc(m.notes) + '</textarea></label>' +
      '<div class="actions"><button class="btn principal" type="submit">Enregistrer</button>' +
      (e.id ? '<button class="btn danger" type="button" data-action="supprimer-montre" data-id="' + e.id + '">Supprimer</button>' : "") + '</div></form>';
    return { html: h, titre: e.id ? "Modifier la montre" : "Nouvelle montre" };
  };
  APRES["form-montre"] = function (e) {
    $("#form-montre").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var f = new FormData(ev.target);
      var m = e.id ? Object.assign({}, D.montres.find(function (x) { return x.id === e.id; })) : { id: nouvelId(), cree: new Date().toISOString() };
      ["marque", "modele", "reference", "serie", "annee", "etat", "calibreId", "calibreLibre", "diamBoite", "entreCornes", "verre", "etancheite", "notes"].forEach(function (k) {
        m[k] = String(f.get(k) || "").trim();
      });
      enregistrer("montres", m).then(function () {
        var photo = e.photo;
        var suite = photo ? enregistrer("photos", { id: nouvelId(), montreId: m.id, blob: photo.blob, l: photo.l, h: photo.h, legende: "Mouvement", reperes: [], date: new Date().toISOString() }) : Promise.resolve();
        return suite.then(function () {
          if (photo) etat.photoIdent = null;
          toast("Montre enregistrée");
          if (e.id) retour(); else remplacerEcran({ type: "montre", id: m.id });
        });
      });
    });
  };

  /* ---------- Visionneuse de photo avec repères (plan des vis) ---------- */
  ECRANS.photo = function (e) {
    var p = D.photos.find(function (x) { return x.id === e.id; });
    if (!p) return { html: '<p class="vide">Photo introuvable.</p>', titre: "Photo" };
    var pose = !!e.pose;
    var h = '<div class="message info petit" style="margin:0 0 10px">' + (pose
      ? "<b>Touche la photo</b> à l'endroit de la vis ou de la pièce. Tu pourras écrire une note pour chaque repère."
      : "Avant de démonter, pose un repère numéroté sur chaque vis : longueur, tête, pont d'origine. Au remontage, tu sauras où va chacune.") + '</div>';
    h += '<div class="visionneuse' + (pose ? " pose" : "") + '" id="visionneuse"><img alt="' + esc(p.legende || "Photo") + '" src="' + urlPhoto(p) + '" draggable="false">';
    (p.reperes || []).forEach(function (r, i) {
      h += '<button class="repere' + (e.actif === i ? " actif" : "") + '" style="left:' + (r.x * 100) + '%;top:' + (r.y * 100) + '%" data-action="choisir-repere" data-i="' + i + '" aria-label="Repère ' + (i + 1) + '">' + (i + 1) + '</button>';
    });
    h += '</div><div class="actions">' +
      '<button class="btn ' + (pose ? "principal" : "") + '" data-action="mode-pose">' + ICONES.epingle + (pose ? " Terminer les repères" : " Poser des repères") + '</button></div>';
    h += '<form class="carte" id="form-photo" style="margin-top:14px"><label class="champ"><span>Légende</span><input type="text" name="legende" value="' + esc(p.legende) + '" placeholder="ex. côté ponts avant démontage"></label>';
    if ((p.reperes || []).length) {
      h += '<h3 style="margin:4px 0 6px">Repères</h3><ol class="liste-reperes">';
      p.reperes.forEach(function (r, i) {
        h += '<li><span class="repere">' + (i + 1) + '</span><input type="text" data-repere="' + i + '" value="' + esc(r.texte) + '" placeholder="ex. vis longue, pont de rouage"' + (e.actif === i ? ' autofocus' : '') + '>' +
          '<button type="button" class="icone-btn" aria-label="Supprimer le repère ' + (i + 1) + '" data-action="supprimer-repere" data-i="' + i + '">×</button></li>';
      });
      h += '</ol>';
    }
    h += '<div class="actions"><button class="btn principal" type="submit">Enregistrer</button><button class="btn danger" type="button" data-action="supprimer-photo" data-id="' + p.id + '">Supprimer la photo</button></div></form>';
    return { html: h, titre: p.legende || "Photo", sous: (p.reperes || []).length + " repère(s)" };
  };
  function sauverChampsPhoto(p) {
    var f = $("#form-photo"); if (!f) return;
    p.legende = f.elements.legende.value.trim();
    $$("[data-repere]", f).forEach(function (inp) { var r = p.reperes[+inp.dataset.repere]; if (r) r.texte = inp.value.trim(); });
  }
  APRES.photo = function (e) {
    var p = D.photos.find(function (x) { return x.id === e.id; });
    if (!p) return;
    var vis = $("#visionneuse");
    vis.addEventListener("click", function (ev) {
      if (!e.pose || ev.target.closest(".repere")) return;
      var r = vis.getBoundingClientRect();
      var x = (ev.clientX - r.left) / r.width, y = (ev.clientY - r.top) / r.height;
      if (x < 0 || x > 1 || y < 0 || y > 1) return;
      sauverChampsPhoto(p);
      p.reperes = p.reperes || [];
      p.reperes.push({ x: Math.round(x * 10000) / 10000, y: Math.round(y * 10000) / 10000, texte: "" });
      enregistrer("photos", p).then(function () { e.actif = p.reperes.length - 1; rendre(false); });
    });
    $("#form-photo").addEventListener("submit", function (ev) {
      ev.preventDefault();
      sauverChampsPhoto(p);
      enregistrer("photos", p).then(function () { toast("Photo enregistrée"); retour(); });
    });
  };

  /* ---------- Intervention ---------- */
  function progression(it) {
    if (it.type !== "Révision complète") return null;
    var total = 0, fait = 0;
    PROCEDURE.forEach(function (g) { g.etapes.forEach(function (s) { total++; if (it.etapes && it.etapes[s.id]) fait++; }); });
    return { total: total, fait: fait };
  }

  ECRANS.intervention = function (e) {
    var it = e.brouillon || D.interventions.find(function (x) { return x.id === e.id; });
    if (!it) return { html: '<p class="vide">Intervention introuvable.</p>', titre: "Intervention" };
    var m = D.montres.find(function (x) { return x.id === it.montreId; });
    var c = m ? calibre(m.calibreId) : null;
    var h = '<form id="form-int" autocomplete="off"><div class="carte">' +
      '<div class="grille-2"><label class="champ"><span>Date</span><input type="date" name="date" value="' + esc(it.date) + '"></label>' +
      '<label class="champ"><span>Type</span><select name="type">' + TYPES_INTERVENTION.map(function (t) { return '<option' + (t === it.type ? " selected" : "") + '>' + esc(t) + '</option>'; }).join("") + '</select></label></div>' +
      '<label class="champ"><span>Titre (facultatif)</span><input type="text" name="titre" value="' + esc(it.titre) + '" placeholder="ex. remplacement du ressort"></label>' +
      '<label class="champ"><span>Constat et travaux</span><textarea name="notes" placeholder="Ce que tu as trouvé, ce que tu as fait…">' + esc(it.notes) + '</textarea></label>' +
      '<label class="champ"><span>Pièces remplacées</span><textarea name="pieces" style="min-height:64px" placeholder="ex. ressort de barillet GR…, joint de fond…">' + esc(it.pieces) + '</textarea></label>' +
      '<label class="champ"><span>Huiles utilisées</span><input type="text" name="huiles" value="' + esc(it.huiles) + '" placeholder="ex. 9010, 9415, HP-1300, 9504, 8217"></label>' +
      '</div>';

    h += '<details class="pli" open><summary>Mesures AVANT</summary><div class="contenu">' + tableMesures("avant", it.avant || {}, c) + '</div></details>';
    h += '<details class="pli"' + (it.apres && Object.keys(it.apres).length ? " open" : "") + '><summary>Mesures APRÈS</summary><div class="contenu">' + tableMesures("apres", it.apres || {}, c) + '</div></details>';

    if (it.type === "Révision complète") {
      var pr = progression(it);
      h += '<details class="pli" open><summary>Étapes de révision <span class="puce laiton" id="prog-etapes">' + pr.fait + '/' + pr.total + '</span></summary><div class="contenu">' +
        '<div class="barre-progres" style="margin-bottom:8px"><div id="barre-etapes" style="width:' + Math.round(pr.fait / pr.total * 100) + '%"></div></div>';
      PROCEDURE.forEach(function (g) {
        h += '<h3 style="margin:12px 0 4px">' + esc(g.groupe) + '</h3>';
        g.etapes.forEach(function (s) {
          var fait = it.etapes && it.etapes[s.id];
          h += '<label class="etape' + (fait ? " faite" : "") + '"><input type="checkbox" data-etape="' + s.id + '"' + (fait ? " checked" : "") + '><span>' + esc(s.texte) + '</span></label>';
        });
      });
      h += '</div></details>';
    }
    h += '<div class="actions"><button class="btn principal" type="submit">Enregistrer</button>' +
      (e.id ? '<button class="btn danger" type="button" data-action="supprimer-intervention" data-id="' + e.id + '">Supprimer</button>' : "") + '</div></form>';
    return { html: h, titre: e.id ? (it.type || "Intervention") : "Nouvelle intervention", sous: m ? titreMontre(m) : "" };
  };
  function lireIntervention(form, base) {
    var f = new FormData(form);
    var it = Object.assign({}, base);
    ["date", "type", "titre", "notes", "pieces", "huiles"].forEach(function (k) { it[k] = String(f.get(k) || "").trim(); });
    it.avant = lireMesures(form, "avant");
    it.apres = lireMesures(form, "apres");
    var etapes = Object.assign({}, base.etapes || {});
    $$("[data-etape]", form).forEach(function (cb) { if (cb.checked) etapes[cb.dataset.etape] = true; else delete etapes[cb.dataset.etape]; });
    it.etapes = etapes;
    return it;
  }
  APRES.intervention = function (e) {
    var base = e.brouillon || D.interventions.find(function (x) { return x.id === e.id; });
    var m = D.montres.find(function (x) { return x.id === base.montreId; });
    var c = m ? calibre(m.calibreId) : null;
    var form = $("#form-int");
    brancherMesures(form, c);
    form.elements.type.addEventListener("change", function () {
      // Le type change la forme (étapes) : on garde la saisie et on redessine.
      e.brouillon = lireIntervention(form, base);
      rendre(false);
    });
    form.addEventListener("change", function (ev) {
      if (!ev.target.dataset.etape) return;
      ev.target.closest(".etape").classList.toggle("faite", ev.target.checked);
      var cases = $$("[data-etape]", form), n = cases.filter(function (x) { return x.checked; }).length;
      $("#prog-etapes").textContent = n + "/" + cases.length;
      $("#barre-etapes").style.width = Math.round(n / cases.length * 100) + "%";
    });
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var it = lireIntervention(form, base);
      if (!it.id) it.id = nouvelId();
      enregistrer("interventions", it).then(function () {
        toast("Intervention enregistrée"); retour();
      });
    });
  };

  /* ---------- Mesures au chronocomparateur ---------- */
  function tableMesures(prefixe, val, c) {
    var h = '<table class="mesures" data-mesures="' + prefixe + '"><thead><tr><th>Position</th><th>Marche<br>s/j</th><th>Amplitude<br>°</th><th>Repère<br>ms</th></tr></thead><tbody>';
    POSITIONS.forEach(function (p) {
      var v = val[p.id] || {};
      h += '<tr><td>' + esc(p.id) + '<br><span class="doux" style="font-weight:400;font-size:.72rem">' + esc(p.nom) + '</span></td>' +
        '<td><input type="text" inputmode="decimal" name="' + prefixe + '.' + p.id + '.marche" value="' + esc(v.marche) + '" aria-label="Marche ' + esc(p.nom) + '"></td>' +
        '<td><input type="text" inputmode="decimal" name="' + prefixe + '.' + p.id + '.ampl" value="' + esc(v.ampl) + '" aria-label="Amplitude ' + esc(p.nom) + '"></td>' +
        '<td><input type="text" inputmode="decimal" name="' + prefixe + '.' + p.id + '.repere" value="' + esc(v.repere) + '" aria-label="Repère ' + esc(p.nom) + '"></td></tr>';
    });
    var v24 = val.h24 || {};
    h += '<tr><td colspan="4" style="padding-top:10px;text-align:left"><span class="doux petit">Après 24 h sans remontage (cadran haut) — pour juger le ressort :</span></td></tr>' +
      '<tr><td>CH 24 h</td><td><input type="text" inputmode="decimal" name="' + prefixe + '.h24.marche" value="' + esc(v24.marche) + '" aria-label="Marche après 24 heures"></td>' +
      '<td><input type="text" inputmode="decimal" name="' + prefixe + '.h24.ampl" value="' + esc(v24.ampl) + '" aria-label="Amplitude après 24 heures"></td>' +
      '<td><input type="text" inputmode="decimal" name="' + prefixe + '.h24.repere" value="' + esc(v24.repere) + '" aria-label="Repère après 24 heures"></td></tr>';
    h += '</tbody></table>';
    h += '<p class="doux petit" style="margin:6px 0 0">Chronocomparateur réglé sur <b>' + (c && c.freq ? fmt(c.freq) + " A/h" : "la fréquence du calibre") + '</b> et un angle de levée de <b>' +
      (c && c.levee ? c.levee + "°" : "… (inconnu : l'amplitude lue peut être fausse)") + '</b>. La marche et le repère, eux, ne dépendent pas de l\'angle de levée.</p>';
    h += '<div class="analyse" id="analyse-' + prefixe + '">' + rendreAnalyse(analyser(val, c), c) + '</div>';
    return h;
  }
  function lireMesures(form, prefixe) {
    var res = {};
    POSITIONS.map(function (p) { return p.id; }).concat(["h24"]).forEach(function (pos) {
      var o = {};
      ["marche", "ampl", "repere"].forEach(function (k) {
        var el = form.elements[prefixe + "." + pos + "." + k];
        if (el && el.value.trim() !== "") o[k] = el.value.trim();
      });
      if (Object.keys(o).length) res[pos] = o;
    });
    return res;
  }
  function brancherMesures(form, c) {
    $$("table[data-mesures]", form).forEach(function (t) {
      var pre = t.dataset.mesures;
      t.addEventListener("input", function () {
        $("#analyse-" + pre).innerHTML = rendreAnalyse(analyser(lireMesures(form, pre), c), c);
      });
    });
  }

  /* Calculs : rien d'inventé, uniquement des moyennes, écarts et comparaisons à des repères. */
  function analyser(val, c) {
    var marches = [], amps = [], reps = [], horiz = [], vert = [], ampH = [], ampV = [];
    POSITIONS.forEach(function (p) {
      var v = val[p.id] || {};
      var m = nombre(v.marche), a = nombre(v.ampl), r = nombre(v.repere);
      if (m != null) { marches.push({ pos: p.id, v: m }); (p.id === "CH" || p.id === "CB" ? horiz : vert).push(m); }
      if (a != null) { amps.push({ pos: p.id, v: a }); (p.id === "CH" || p.id === "CB" ? ampH : ampV).push(a); }
      if (r != null) reps.push(Math.abs(r));
    });
    function moy(t) { return t.length ? t.reduce(function (s, x) { return s + x; }, 0) / t.length : null; }
    var res = { n: marches.length };
    if (marches.length) {
      var vals = marches.map(function (x) { return x.v; });
      res.moyenne = moy(vals);
      res.ecart = marches.length > 1 ? Math.max.apply(null, vals) - Math.min.apply(null, vals) : null;
      res.min = marches.reduce(function (a, b) { return b.v < a.v ? b : a; });
      res.max = marches.reduce(function (a, b) { return b.v > a.v ? b : a; });
    }
    if (horiz.length && vert.length) res.hv = moy(horiz) - moy(vert);
    var ch = val.CH && nombre(val.CH.ampl);
    res.amplCH = ch != null ? ch : (ampH.length ? moy(ampH) : null);
    if (ampH.length && ampV.length) res.chute = moy(ampH) - moy(ampV);
    if (reps.length) res.repere = Math.max.apply(null, reps);
    var h24 = val.h24 || {};
    var a24 = nombre(h24.ampl), m24 = nombre(h24.marche);
    if (a24 != null && ch != null) res.chute24 = ch - a24;
    if (m24 != null && val.CH && nombre(val.CH.marche) != null) res.derive24 = m24 - nombre(val.CH.marche);
    return res;
  }
  function niveauAmplitude(a) { return REPERES.amplitude.find(function (r) { return a >= r.min; }); }
  function niveauRepere(r) { return REPERES.repere.find(function (x) { return r <= x.max; }); }
  function qualiteETA(moyenne, ecart) {
    var q = [{ nom: "Top", m: 4, e: 15 }, { nom: "Élaboré", m: 7, e: 20 }, { nom: "Standard", m: 12, e: 30 }];
    for (var i = 0; i < q.length; i++) if (Math.abs(moyenne) <= q[i].m && (ecart == null || ecart <= q[i].e)) return q[i].nom;
    return null;
  }
  function rendreAnalyse(a, c) {
    if (!a.n && a.amplCH == null && a.repere == null) return '<p class="doux petit" style="margin:0">Saisis au moins une position pour voir l\'analyse. Astuce : commence par cadran haut, couronne remontée à fond.</p>';
    var h = '<div class="indicateurs">';
    if (a.moyenne != null) h += '<div class="indicateur"><b>' + signe(a.moyenne, 1) + '</b><span>marche moyenne (s/j)</span></div>';
    if (a.ecart != null) h += '<div class="indicateur"><b>' + fmt(a.ecart, 1) + '</b><span>écart max entre positions (s/j)</span></div>';
    if (a.hv != null) h += '<div class="indicateur"><b>' + signe(a.hv, 1) + '</b><span>horizontal − vertical (s/j)</span></div>';
    if (a.amplCH != null) h += '<div class="indicateur"><b>' + fmt(a.amplCH) + '°</b><span>amplitude à plat</span></div>';
    if (a.chute != null) h += '<div class="indicateur"><b>' + fmt(a.chute) + '°</b><span>chute d\'amplitude à plat → debout</span></div>';
    if (a.repere != null) h += '<div class="indicateur"><b>' + fmt(a.repere, 1) + '</b><span>défaut de repère max (ms)</span></div>';
    h += '</div>';
    var msgs = [];
    if (a.amplCH != null) {
      var na = niveauAmplitude(a.amplCH);
      var t = "Amplitude à plat : <b>" + na.libelle.toLowerCase() + "</b>. " + na.texte;
      if (estJaponais(c) && a.amplCH < 270) t += " Sur ce calibre japonais à 3 Hz, compter environ 20 à 30° de moins que sur un suisse à 4 Hz.";
      if (c && !c.levee) t += " Angle de levée inconnu : la valeur peut être décalée (voir l'outil de correction dans Atelier › Outils).";
      msgs.push([na.niveau, t]);
    }
    if (a.chute != null) {
      if (a.chute > 50) msgs.push(["alerte", "Chute de " + fmt(a.chute) + "° entre plat et debout : au-delà d'environ 50°, suspecter les pivots du balancier (usure, pivot abîmé, pierre fendue) ou un manque d'huile aux contre-pivots."]);
      else if (a.chute >= 0) msgs.push(["ok", "Chute plat → debout de " + fmt(a.chute) + "° : normale (en général 20 à 40°)."]);
    }
    if (a.repere != null) {
      var nr = niveauRepere(a.repere);
      msgs.push([nr.niveau, "Défaut de repère : <b>" + nr.libelle.toLowerCase() + "</b> (" + fmt(a.repere, 1) + " ms)." + (nr.niveau === "alerte" ? " Corriger avec le porte-piton (Etachron) ou en tournant la virole." : "")]);
    }
    if (a.moyenne != null && a.n >= 3 && !estJaponais(c)) {
      var q = qualiteETA(a.moyenne, a.ecart);
      msgs.push([q ? "ok" : "attention", q ? "Dans les tolérances de réglage ETA « " + q + " » (repère usine pour la famille 2824-2)." : "Hors des tolérances de réglage usine ETA les plus larges (± 12 s/j de moyenne, 30 s/j d'écart)."]);
    }
    if (a.moyenne != null && Math.abs(a.moyenne) > 120) msgs.push(["alerte", "Marche de plusieurs minutes par jour : vérifier la <b>magnétisation</b> avant tout (boussole), puis le spiral."]);
    if (a.hv != null && Math.abs(a.hv) > 15) msgs.push(["attention", "Grand écart entre positions à plat et debout (" + signe(a.hv, 1) + " s/j) : regarder l'état des pivots et l'équilibre du balancier."]);
    if (a.chute24 != null) {
      msgs.push([a.chute24 > 60 ? "alerte" : a.chute24 > 40 ? "attention" : "ok", "Perte d'amplitude sur 24 h : " + fmt(a.chute24) + "°." + (a.chute24 > 60 ? " Ressort de barillet fatigué ou frottements : à remplacer / contrôler." : a.chute24 > 40 ? " Un peu forte : surveiller le ressort." : " Bon isochronisme.")]);
    }
    if (a.derive24 != null) msgs.push([Math.abs(a.derive24) > 10 ? "attention" : "ok", "La marche varie de " + signe(a.derive24, 1) + " s/j entre plein remontage et 24 h."]);
    msgs.forEach(function (m) { h += '<div class="message ' + m[0] + '">' + m[1] + '</div>'; });
    return h;
  }

  /* ======================================================================
   *  ONGLET : IDENTIFIER
   * ==================================================================== */
  var ident = lirePref("ident", {});
  function scoreCalibre(c, q) {
    var crit = [], points = 0, elimine = false, graveOk = false;
    function ajoute(nom, statut, poids) {
      crit.push({ nom: nom, statut: statut });
      if (statut === "oui") points += poids;
      if (statut === "non") { points -= poids * 2; if (poids >= 3) elimine = true; }
    }
    if (q.texte) {
      var t = normaliser(q.texte);
      var cibles = [c.nom, c.fabricant + c.nom].concat(c.alias || []).map(normaliser);
      var trouve = t.length >= 2 && cibles.some(function (x) { return x && (x.indexOf(t) >= 0 || (t.length >= 3 && t.indexOf(x) >= 0 && x.length >= 3)); });
      crit.push({ nom: "Numéro gravé « " + q.texte + " »", statut: trouve ? "oui" : "inconnu" });
      if (trouve) { points += 12; graveOk = true; }
    }
    if (q.type) ajoute(q.type === "auto" ? "Automatique" : "Manuel", c.type === q.type ? "oui" : "non", 3);
    if (q.aff) {
      var aff = c.aff || "aucun";
      var ok = q.aff === "chrono" ? aff.indexOf("chrono") === 0 : aff === q.aff;
      ajoute(q.aff === "aucun" ? "Sans date" : LIB_AFF[q.aff], ok ? "oui" : "non", 3);
    }
    if (q.freq) {
      var f = +q.freq;
      ajoute(fmt(f) + " A/h", c.freq == null ? "inconnu" : c.freq === f ? "oui" : "non", c.freq == null ? 0 : 3);
    }
    if (q.rubis) {
      var r = +q.rubis;
      ajoute(r + " rubis", c.rubis == null ? "inconnu" : c.rubis === r ? "oui" : "non", c.rubis == null ? 0 : 2);
    }
    if (q.diam) {
      var d = nombre(q.diam);
      if (d != null) ajoute("Ø " + fmt(d, 2) + " mm", c.diam == null ? "inconnu" : Math.abs(c.diam - d) <= 0.8 ? "oui" : "non", c.diam == null ? 0 : 2);
    }
    if (q.stop === "oui" || q.stop === "non") {
      var s = q.stop === "oui";
      ajoute(s ? "Stop-seconde" : "Sans stop-seconde", c.stop == null ? "inconnu" : c.stop === s ? "oui" : "non", c.stop == null ? 0 : 1);
    }
    if (q.manuel === "oui" || q.manuel === "non") {
      var mm = q.manuel === "oui";
      ajoute(mm ? "Remontage à la couronne" : "Pas de remontage à la couronne", c.manuel === mm ? "oui" : "non", 2);
    }
    if (q.marque) {
      var mq = MARQUES.find(function (x) { return normaliser(x.nom) === normaliser(q.marque); });
      if (mq && mq.calibres.indexOf(c.id) >= 0) { crit.push({ nom: "Courant chez " + mq.nom, statut: "oui" }); points += 2; }
    }
    // Le numéro gravé prime : on garde le calibre, les désaccords restent visibles (✗).
    return { c: c, points: points, crit: crit, elimine: elimine && !graveOk };
  }
  ONGLETS.identifier = function () {
    var q = ident;
    function seg(nom, options) {
      return '<div class="segment" role="radiogroup">' + options.map(function (o) {
        return '<label><input type="radio" name="' + nom + '" value="' + o[0] + '"' + ((q[nom] || "") === o[0] ? " checked" : "") + '><span>' + o[1] + '</span></label>';
      }).join("") + '</div>';
    }
    var h = '<div class="carte"><h3>Photo du mouvement</h3>';
    if (etat.photoIdent) {
      h += '<img alt="Mouvement photographié" src="' + (etat.photoIdent.url || (etat.photoIdent.url = URL.createObjectURL(etat.photoIdent.blob))) + '" style="width:100%;border-radius:10px;display:block;margin-bottom:8px">' +
        '<p class="doux petit" style="margin:0 0 8px">Cherche dessus les inscriptions décrites plus bas, puis remplis les critères. La photo sera rangée dans la fiche montre si tu en crées une.</p>';
    } else {
      h += '<p class="doux petit" style="margin:0 0 8px">Prends le mouvement de face, bien éclairé, sans reflet (lumière rasante sur le côté). Zoome ensuite sur la photo pour lire les gravures.</p>';
    }
    h += '<div class="actions" style="margin-top:0"><button class="btn" data-action="photo-ident">' + ICONES.photo + (etat.photoIdent ? " Reprendre" : " Prendre une photo") + '</button>' +
      '<button class="btn" data-action="galerie-ident">' + ICONES.galerie + ' Galerie</button></div></div>';

    h += '<details class="pli"><summary>Où lire le numéro du calibre ?</summary><div class="contenu petit">' +
      '<p><b>Sous la masse oscillante</b> (automatiques) : le numéro est souvent gravé sur le pont ou la platine, visible en tournant la masse ou en la déposant.</p>' +
      '<p><b>Près du balancier</b> : sur le coq ou la platine juste à côté (ETA, Sellita).</p>' +
      '<p><b>Côté cadran</b> (montre ouverte, cadran déposé) : beaucoup de calibres portent le numéro sur la platine sous le cadran.</p>' +
      '<p><b>Seiko / TMI</b> : « NH35A », « 4R36 », « 7S26 » gravé sur le pont ; la masse porte souvent « SII » ou le logo Seiko.</p>' +
      '<p><b>Miyota</b> : « MIYOTA » ou « JAPAN » et le nombre de rubis gravés.</p>' +
      '<p><b>Logo seul ?</b> Un petit écusson ETA ou Unitas, ou « Swiss » + « 25 jewels », restreint déjà fortement la liste.</p>' +
      '<p><b>Compter la fréquence sans appareil</b> : compte les petits pas de la trotteuse en une seconde. 5 pas = 18 000, 5,5 = 19 800, 6 = 21 600, 7 = 25 200, 8 = 28 800 A/h. Le plus simple : filmer la trotteuse au ralenti avec le téléphone.</p>' +
      '</div></details>';

    h += '<form id="form-ident" class="carte" autocomplete="off">' +
      '<label class="champ"><span>Inscription gravée (numéro, nom)</span><input type="search" name="texte" value="' + esc(q.texte) + '" placeholder="ex. 2824, NH35, 7S26…"></label>' +
      '<label class="champ"><span>Marque de la montre</span><input type="text" name="marque" list="ident-marques" value="' + esc(q.marque) + '" placeholder="ex. Tissot"></label>' +
      '<datalist id="ident-marques">' + MARQUES.map(function (x) { return '<option value="' + esc(x.nom) + '">'; }).join("") + '</datalist>' +
      '<div class="champ"><span style="display:block;font-size:.86rem;font-weight:600;margin-bottom:6px">Remontage</span>' + seg("type", [["", "Je ne sais pas"], ["auto", "Automatique (masse)"], ["manuel", "Manuel"]]) + '</div>' +
      '<div class="champ" style="margin-top:12px"><span style="display:block;font-size:.86rem;font-weight:600;margin-bottom:6px">Affichage</span>' + seg("aff", [["", "?"], ["aucun", "Sans date"], ["date", "Date"], ["jour-date", "Jour + date"], ["chrono", "Chrono"]]) + '</div>' +
      '<div class="grille-2" style="margin-top:12px"><label class="champ"><span>Fréquence</span><select name="freq"><option value="">Je ne sais pas</option>' +
      FREQUENCES.map(function (f) { return '<option value="' + f.ah + '"' + (String(q.freq) === String(f.ah) ? " selected" : "") + '>' + fmt(f.ah) + ' A/h (' + fmt(f.pas, 1) + ' pas/s)</option>'; }).join("") + '</select></label>' +
      '<label class="champ"><span>Nombre de rubis</span><input type="text" inputmode="numeric" name="rubis" value="' + esc(q.rubis) + '" placeholder="ex. 25"></label></div>' +
      '<label class="champ"><span>Diamètre du mouvement (mm)</span><input type="text" inputmode="decimal" name="diam" value="' + esc(q.diam) + '" placeholder="mesuré au pied à coulisse"><small>Tolérance ± 0,8 mm. Mesure le mouvement, pas la boîte.</small></label>' +
      '<div class="champ"><span style="display:block;font-size:.86rem;font-weight:600;margin-bottom:6px">Couronne tirée à fond, la trotteuse s\'arrête ?</span>' + seg("stop", [["", "?"], ["oui", "Oui"], ["non", "Non"]]) + '</div>' +
      '<div class="champ" style="margin-top:12px"><span style="display:block;font-size:.86rem;font-weight:600;margin-bottom:6px">On peut la remonter à la couronne ?</span>' + seg("manuel", [["", "?"], ["oui", "Oui"], ["non", "Non"]]) + '</div>' +
      '<div class="actions"><button class="btn" type="button" data-action="raz-ident">Tout effacer</button></div></form>';
    h += '<div id="resultats-ident"></div>';
    return { html: h, titre: "Identifier un calibre", sous: "Critère par critère" };
  };
  function rendreResultatsIdent() {
    var q = ident;
    var rempli = Object.keys(q).some(function (k) { return q[k]; });
    var zone = $("#resultats-ident"); if (!zone) return;
    if (!rempli) { zone.innerHTML = '<p class="doux petit">Renseigne un ou plusieurs critères : la liste des calibres possibles se met à jour au fur et à mesure.</p>'; return; }
    var res = tousCalibres().map(function (c) { return scoreCalibre(c, q); })
      .filter(function (r) { return !r.elimine && r.points > 0; })
      .sort(function (a, b) { return b.points - a.points; });
    var h = '<div class="titre-section"><h3>' + (res.length ? res.length + " calibre" + (res.length > 1 ? "s" : "") + " possible" + (res.length > 1 ? "s" : "") : "Aucun calibre de la base ne correspond") + '</h3></div>';
    if (!res.length) h += '<div class="carte petit">Ce calibre n\'est peut-être pas encore dans la base (elle couvre les calibres les plus courants). Tu peux l\'ajouter dans l\'onglet <b>Calibres</b>, il sera ensuite proposé ici.</div>';
    var max = res.length ? res[0].points : 1;
    res.slice(0, 8).forEach(function (r, i) {
      h += '<div class="carte"><div class="ligne haut"><div class="etire"><b>' + esc(nomCalibre(r.c)) + '</b>' + (r.c.perso ? ' <span class="puce laiton">perso</span>' : '') +
        '<br><span class="doux petit num">' + resumeCalibre(r.c) + '</span></div><span class="score">' + Math.max(0, Math.round(r.points / max * 100)) + '%</span></div>' +
        '<div style="margin-top:8px">' + r.crit.map(function (k) { return '<div class="critere ' + k.statut + '"><i>' + (k.statut === "oui" ? "✓" : k.statut === "non" ? "✗" : "?") + '</i>' + esc(k.nom) + '</div>'; }).join("") + '</div>' +
        (r.c.reperage ? '<p class="petit" style="margin:8px 0 0">' + esc(r.c.reperage) + '</p>' : '') +
        '<div class="actions"><button class="btn petit" data-action="voir-calibre" data-id="' + r.c.id + '">Fiche technique</button>' +
        '<button class="btn petit' + (i === 0 ? " principal" : "") + '" data-action="montre-depuis-calibre" data-id="' + r.c.id + '">' + (etat.cibleIdent ? "Attribuer à la montre" : "Créer la fiche montre") + '</button></div></div>';
    });
    h += '<p class="doux petit">Le pourcentage compare les calibres entre eux, ce n\'est pas une certitude : seul le numéro gravé confirme l\'identification.</p>';
    zone.innerHTML = h;
  }
  APRES["onglet-identifier"] = function () {
    var f = $("#form-ident");
    function lire() {
      var d = new FormData(f), q = {};
      ["texte", "marque", "type", "aff", "freq", "rubis", "diam", "stop", "manuel"].forEach(function (k) { var v = String(d.get(k) || "").trim(); if (v) q[k] = v; });
      ident = q; ecrirePref("ident", q); rendreResultatsIdent();
    }
    f.addEventListener("input", lire); f.addEventListener("change", lire);
    rendreResultatsIdent();
    if (etat.cibleIdent) {
      var m = D.montres.find(function (x) { return x.id === etat.cibleIdent; });
      if (m) $("#vue").insertAdjacentHTML("afterbegin", '<div class="message info" style="margin:0 0 12px">Identification pour <b>' + esc(titreMontre(m)) + '</b>. <button class="btn petit" data-action="annuler-cible">Annuler</button></div>');
    }
  };

  /* ======================================================================
   *  ONGLET : CALIBRES
   * ==================================================================== */
  var filtreCal = { texte: "", type: "" };
  ONGLETS.calibres = function () {
    var h = '<div class="titre-section"><h2>Calibres</h2><button class="btn petit" data-action="nouveau-calibre">' + ICONES.plus + ' Ajouter</button></div>' +
      '<input type="search" id="recherche-cal" placeholder="Rechercher : 2824, Seiko, chrono…" value="' + esc(filtreCal.texte) + '" aria-label="Rechercher un calibre" style="margin-bottom:8px">' +
      '<div class="segment" style="margin-bottom:12px" id="filtre-type">' + [["", "Tous"], ["auto", "Automatiques"], ["manuel", "Manuels"]].map(function (o) {
        return '<label><input type="radio" name="ftype" value="' + o[0] + '"' + (filtreCal.type === o[0] ? " checked" : "") + '><span>' + o[1] + '</span></label>';
      }).join("") + '</div><div id="liste-cal"></div>' +
      '<p class="doux petit">Les valeurs viennent des fiches techniques publiées par les fabricants. Les champs marqués <span class="puce attention">à vérifier</span> ou laissés vides doivent être confirmés sur la fiche officielle avant d\'intervenir.</p>';
    return { html: h, titre: "Calibres", sous: tousCalibres().length + " dans la base" };
  };
  function rendreListeCal() {
    var t = normaliser(filtreCal.texte);
    var liste = tousCalibres().filter(function (c) {
      if (filtreCal.type && c.type !== filtreCal.type) return false;
      if (!t) return true;
      var champ = normaliser([c.fabricant, c.nom].concat(c.alias || []).join(" ") + " " + (LIB_AFF[c.aff] || ""));
      var marques = MARQUES.filter(function (mq) { return mq.calibres.indexOf(c.id) >= 0; }).map(function (mq) { return normaliser(mq.nom); }).join(" ");
      return champ.indexOf(t) >= 0 || marques.indexOf(t) >= 0;
    }).sort(function (a, b) { return nomCalibre(a).localeCompare(nomCalibre(b), "fr", { numeric: true }); });
    $("#liste-cal").innerHTML = liste.length ? liste.map(function (c) {
      return '<button class="liste-item" data-action="voir-calibre" data-id="' + c.id + '"><span class="etire"><b>' + esc(nomCalibre(c)) + '</b>' + (c.perso ? ' <span class="puce laiton">perso</span>' : '') +
        '<br><span class="doux petit num">' + resumeCalibre(c) + '</span></span>' + ICONES.chevron + '</button>';
    }).join("") : '<p class="vide">Aucun calibre trouvé.</p>';
  }
  APRES["onglet-calibres"] = function () {
    $("#recherche-cal").addEventListener("input", function (e) { filtreCal.texte = e.target.value; rendreListeCal(); });
    $("#filtre-type").addEventListener("change", function (e) { filtreCal.type = e.target.value; rendreListeCal(); });
    rendreListeCal();
  };

  ECRANS.calibre = function (e) {
    var c = calibre(e.id);
    if (!c) return { html: '<p class="vide">Calibre introuvable.</p>', titre: "Calibre" };
    var doute = c.doute || [];
    function val(champ, texte) {
      var v = c[champ];
      if (v == null || v === "") return '<span class="manque">non renseigné</span>';
      return texte + (doute.indexOf(champ) >= 0 ? ' <span class="puce attention">à vérifier</span>' : "");
    }
    var oui = function (b) { return b == null ? null : b ? "Oui" : "Non"; };
    var f = c.freq ? FREQUENCES.find(function (x) { return x.ah === c.freq; }) : null;
    var lignes = [
      ["Remontage", c.type === "auto" ? "Automatique" : "Manuel", "type"],
      ["Affichage", LIB_AFF[c.aff] || c.aff, "aff"],
      ["Diamètre", c.diam != null ? fmt(c.diam, 2) + " mm" + (lignesDe(c) ? " (" + esc(lignesDe(c)) + ")" : "") : null, "diam"],
      ["Hauteur", c.haut != null ? fmt(c.haut, 2) + " mm" : null, "haut"],
      ["Rubis", c.rubis, "rubis"],
      ["Fréquence", c.freq ? fmt(c.freq) + " A/h · " + fmt(c.freq / 7200, 2) + " Hz · " + fmt(c.freq / 3600, 1) + " pas/s" : null, "freq"],
      ["Réserve de marche", c.pr != null ? c.pr + " h" : null, "pr"],
      ["Angle de levée", c.levee != null ? c.levee + "°" : null, "levee"],
      ["Stop-seconde", oui(c.stop), "stop"],
      ["Remontage à la couronne", oui(c.manuel), "manuel"]
    ];
    var h = '<div class="carte"><table class="specs num"><tbody>' + lignes.map(function (l) {
      return '<tr><th>' + l[0] + '</th><td>' + val(l[2], l[1] == null ? "" : esc(l[1])) + '</td></tr>';
    }).join("") + '</tbody></table></div>';
    if (c.levee == null) h += '<div class="message attention" style="margin-top:-4px;margin-bottom:12px">Angle de levée inconnu : au chronocomparateur, la <b>marche</b> et le <b>repère</b> restent justes, mais l\'<b>amplitude</b> affichée dépend de cet angle. Cherche-le sur la fiche technique du fabricant.</div>';
    if (c.base) { var b = calibre(c.base); if (b) h += '<button class="liste-item" data-action="voir-calibre" data-id="' + b.id + '"><span class="etire"><span class="doux petit">Dérivé de / équivalent à</span><br><b>' + esc(nomCalibre(b)) + '</b></span>' + ICONES.chevron + '</button>'; }
    var derives = tousCalibres().filter(function (x) { return x.base === c.id; });
    if (derives.length) h += '<div class="carte"><h3>Calibres dérivés ou équivalents</h3><div class="puces">' + derives.map(function (x) { return '<button class="puce laiton" style="border:0;cursor:pointer" data-action="voir-calibre" data-id="' + x.id + '">' + esc(nomCalibre(x)) + '</button>'; }).join("") + '</div></div>';
    if (c.alias && c.alias.length) h += '<div class="carte"><h3>Autres noms</h3><div class="puces">' + c.alias.map(function (a) { return '<span class="puce">' + esc(a) + '</span>'; }).join("") + '</div></div>';
    if (c.reperage) h += '<div class="carte"><h3>Le reconnaître</h3><p style="margin:0">' + esc(c.reperage) + '</p></div>';
    if (c.points && c.points.length) h += '<div class="carte"><h3>Points d\'atelier</h3><ul style="margin:0;padding-left:20px">' + c.points.map(function (p) { return '<li style="margin-bottom:6px">' + esc(p) + '</li>'; }).join("") + '</ul></div>';
    var marques = MARQUES.filter(function (mq) { return mq.calibres.indexOf(c.id) >= 0; });
    if (marques.length) h += '<div class="carte"><h3>Rencontré chez</h3><div class="puces">' + marques.map(function (mq) { return '<span class="puce">' + esc(mq.nom) + '</span>'; }).join("") + '</div></div>';
    var montres = D.montres.filter(function (m) { return m.calibreId === c.id; });
    if (montres.length) h += '<div class="carte"><h3>Tes montres avec ce calibre</h3>' + montres.map(function (m) { return '<button class="liste-item" style="box-shadow:none" data-action="voir-montre" data-id="' + m.id + '"><span class="etire">' + esc(titreMontre(m)) + '</span>' + ICONES.chevron + '</button>'; }).join("") + '</div>';
    if (c.perso) h += '<div class="actions"><button class="btn" data-action="modifier-calibre" data-id="' + c.id + '">' + ICONES.crayon + ' Modifier</button></div>';
    else h += '<p class="doux petit">Fiche de la base intégrée. Toujours confronter à la fiche technique officielle du fabricant avant d\'intervenir.</p>';
    return { html: h, titre: nomCalibre(c), sous: c.perso ? "Calibre perso" : "Fiche technique" };
  };

  ECRANS["form-calibre"] = function (e) {
    var c = e.id ? calibre(e.id) : { type: "auto", aff: "date" };
    function ch(nom, lib, type, aide) {
      return '<label class="champ"><span>' + lib + '</span><input type="text"' + (type ? ' inputmode="' + type + '"' : "") + ' name="' + nom + '" value="' + esc(c[nom] == null ? "" : c[nom]) + '">' + (aide ? '<small>' + aide + '</small>' : "") + '</label>';
    }
    function sel(nom, lib, opts) {
      return '<label class="champ"><span>' + lib + '</span><select name="' + nom + '">' + opts.map(function (o) {
        var v = c[nom] === true ? "oui" : c[nom] === false ? "non" : (c[nom] == null ? "" : c[nom]);
        return '<option value="' + o[0] + '"' + (String(v) === o[0] ? " selected" : "") + '>' + o[1] + '</option>';
      }).join("") + '</select></label>';
    }
    var h = '<form id="form-calibre" class="carte" autocomplete="off">' +
      '<div class="grille-2">' + ch("fabricant", "Fabricant") + ch("nom", "Numéro / nom") + '</div>' +
      '<div class="grille-2">' + sel("type", "Remontage", [["auto", "Automatique"], ["manuel", "Manuel"]]) +
      sel("aff", "Affichage", Object.keys(LIB_AFF).map(function (k) { return [k, LIB_AFF[k]]; })) + '</div>' +
      '<div class="grille-2">' + ch("diam", "Diamètre (mm)", "decimal") + ch("haut", "Hauteur (mm)", "decimal") + '</div>' +
      '<div class="grille-2">' + ch("rubis", "Rubis", "numeric") + ch("freq", "Fréquence (A/h)", "numeric", "ex. 28800") + '</div>' +
      '<div class="grille-2">' + ch("pr", "Réserve de marche (h)", "decimal") + ch("levee", "Angle de levée (°)", "decimal") + '</div>' +
      '<div class="grille-2">' + sel("stop", "Stop-seconde", [["", "?"], ["oui", "Oui"], ["non", "Non"]]) + sel("manuel", "Remontage couronne", [["", "?"], ["oui", "Oui"], ["non", "Non"]]) + '</div>' +
      '<label class="champ"><span>Autres noms (séparés par des virgules)</span><input type="text" name="alias" value="' + esc((c.alias || []).join(", ")) + '"></label>' +
      '<label class="champ"><span>Le reconnaître</span><textarea name="reperage">' + esc(c.reperage) + '</textarea></label>' +
      '<label class="champ"><span>Points d\'atelier (un par ligne)</span><textarea name="points">' + esc((c.points || []).join("\n")) + '</textarea></label>' +
      '<label class="champ"><span>Source des données</span><input type="text" name="source" value="' + esc(c.source) + '" placeholder="ex. fiche technique fabricant, page 3"></label>' +
      '<div class="actions"><button class="btn principal" type="submit">Enregistrer</button>' + (e.id ? '<button class="btn danger" type="button" data-action="supprimer-calibre" data-id="' + e.id + '">Supprimer</button>' : '') + '</div></form>';
    return { html: h, titre: e.id ? "Modifier le calibre" : "Nouveau calibre" };
  };
  APRES["form-calibre"] = function (e) {
    $("#form-calibre").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var f = new FormData(ev.target);
      var g = function (k) { return String(f.get(k) || "").trim(); };
      if (!g("nom")) { toast("Indique au moins le numéro du calibre"); return; }
      var tri = function (v) { return v === "oui" ? true : v === "non" ? false : null; };
      var c = {
        id: e.id || "perso-" + nouvelId(), perso: true, fabricant: g("fabricant"), nom: g("nom"), type: g("type"), aff: g("aff"),
        diam: nombre(g("diam")), lignes: null, haut: nombre(g("haut")), rubis: nombre(g("rubis")), freq: nombre(g("freq")),
        pr: nombre(g("pr")), levee: nombre(g("levee")), stop: tri(g("stop")), manuel: tri(g("manuel")), base: null,
        alias: g("alias") ? g("alias").split(",").map(function (s) { return s.trim(); }).filter(Boolean) : [],
        reperage: g("reperage"), points: g("points") ? g("points").split("\n").map(function (s) { return s.trim(); }).filter(Boolean) : [],
        source: g("source"), doute: []
      };
      enregistrer("calibres", c).then(function () { toast("Calibre enregistré"); if (e.id) retour(); else remplacerEcran({ type: "calibre", id: c.id }); });
    });
  };

  /* ======================================================================
   *  ONGLET : ATELIER
   * ==================================================================== */
  var SOUS = [["mesures", "Mesures"], ["diagnostic", "Diagnostic"], ["huiles", "Huiles"], ["revision", "Révision"], ["outils", "Outils"]];
  ONGLETS.atelier = function () {
    var h = '<div class="sous-onglets" role="toolbar">' + SOUS.map(function (s) {
      return '<button data-action="sous-atelier" data-sous="' + s[0] + '" aria-pressed="' + (etat.sousAtelier === s[0]) + '">' + s[1] + '</button>';
    }).join("") + '</div>';
    h += SOUS_VUES[etat.sousAtelier]();
    return { html: h, titre: "Atelier", sous: SOUS.find(function (s) { return s[0] === etat.sousAtelier; })[1] };
  };
  var SOUS_VUES = {};
  SOUS_VUES.mesures = function () {
    var c = calibre(brouillonId.calibre);
    var opts = '<option value="">— Calibre (facultatif) —</option>' + tousCalibres().slice().sort(function (a, b) { return nomCalibre(a).localeCompare(nomCalibre(b), "fr", { numeric: true }); })
      .map(function (x) { return '<option value="' + x.id + '"' + (x.id === brouillonId.calibre ? " selected" : "") + '>' + esc(nomCalibre(x)) + '</option>'; }).join("");
    return '<div class="message info petit" style="margin-top:0">Analyse rapide d\'une lecture au chronocomparateur, sans l\'enregistrer. Pour garder les mesures, crée une intervention dans la fiche de la montre.</div>' +
      '<form id="form-mesures-rapides" class="carte" autocomplete="off"><label class="champ"><span>Calibre</span><select name="calibre">' + opts + '</select></label>' +
      tableMesures("rapide", brouillonId.mesures, c) + '<div class="actions"><button class="btn" type="button" data-action="raz-mesures">Effacer</button></div></form>' +
      '<details class="pli"><summary>Tolérances de réglage ETA (repère)</summary><div class="contenu"><table class="specs num"><tbody>' +
      '<tr><th>Qualité</th><td><b>Moyenne · écart max (s/j)</b></td></tr>' +
      REPERES.qualites.map(function (q) { return '<tr><th>' + esc(q.nom) + '</th><td>' + esc(q.moyenne) + ' · ' + esc(q.ecart) + '</td></tr>'; }).join("") +
      '</tbody></table><p class="doux petit">Repères de réglage en usine de la famille 2824-2. Un mouvement révisé chez soi en « Standard » est déjà un bon résultat.</p></div></details>';
  };
  APRES["onglet-atelier"] = function () {
    var f = $("#form-mesures-rapides");
    if (f) {
      var c = calibre(brouillonId.calibre);
      brancherMesures(f, c);
      f.addEventListener("input", function () { brouillonId.mesures = lireMesures(f, "rapide"); });
      f.elements.calibre.addEventListener("change", function (e) { brouillonId.mesures = lireMesures(f, "rapide"); brouillonId.calibre = e.target.value; rendre(false); });
    }
    var o = $("#form-outils");
    if (o) { o.addEventListener("input", calculerOutils); calculerOutils(); }
  };

  SOUS_VUES.diagnostic = function () {
    return '<p class="doux petit" style="margin-top:0">Causes classées de la plus fréquente à la plus rare, avec le contrôle à faire.</p>' +
      DIAGNOSTICS.map(function (d) {
        return '<details class="pli"><summary>' + esc(d.titre) + '</summary><div class="contenu">' + d.causes.map(function (c, i) {
          var niv = c.frequence === "très fréquente" ? "alerte" : c.frequence === "fréquente" ? "attention" : "";
          return '<div class="cause"><div class="ligne"><b class="etire">' + (i + 1) + '. ' + esc(c.cause) + '</b><span class="puce ' + niv + '">' + esc(c.frequence) + '</span></div><p class="petit" style="margin:4px 0 0">' + esc(c.controle) + '</p></div>';
        }).join("") + '</div></details>';
      }).join("");
  };
  SOUS_VUES.huiles = function () {
    return '<div class="message attention petit" style="margin-top:0">Repère général pour un mouvement suisse à ancre. <b>La fiche de service du fabricant prime toujours</b> (Seiko, Rolex, Omega co-axial ont leurs règles).</div>' +
      LUBRIFICATION.map(function (g) {
        return '<details class="pli"><summary>' + esc(g.groupe) + '</summary><div class="contenu"><table class="huiles"><tbody>' + g.lignes.map(function (l) {
          return '<tr><td>' + esc(l.piece) + '</td><td><span class="puce laiton">' + esc(l.produit) + '</span>' + (l.note ? '<div class="petit doux" style="margin-top:4px">' + esc(l.note) + '</div>' : '') + '</td></tr>';
        }).join("") + '</tbody></table></div></details>';
      }).join("") +
      '<div class="carte petit"><h3>Règles d\'or</h3><ul style="margin:0;padding-left:20px"><li>Moins c\'est mieux : une huile qui déborde migre et attire la saleté.</li><li>Une burette par huile, jamais mélangées.</li><li>Huiler après avoir vérifié que chaque mobile tourne librement à sec.</li><li>Les huiles ont une date de péremption : noter la date d\'ouverture sur le flacon.</li></ul></div>';
  };
  SOUS_VUES.revision = function () {
    return '<p class="doux petit" style="margin-top:0">Ordre d\'atelier d\'une révision complète. Pour cocher les étapes au fil du travail, crée une intervention « Révision complète » sur la fiche de la montre.</p>' +
      PROCEDURE.map(function (g) {
        return '<details class="pli"><summary>' + esc(g.groupe) + ' <span class="puce">' + g.etapes.length + '</span></summary><div class="contenu"><ol style="margin:0;padding-left:20px">' +
          g.etapes.map(function (s) { return '<li style="margin-bottom:6px">' + esc(s.texte) + '</li>'; }).join("") + '</ol></div></details>';
      }).join("");
  };
  SOUS_VUES.outils = function () {
    return '<form id="form-outils" autocomplete="off">' +
      '<div class="carte"><h3>Corriger une amplitude (angle de levée)</h3><p class="doux petit" style="margin-top:0">Si le chronocomparateur était réglé sur le mauvais angle de levée, l\'amplitude affichée est fausse dans la même proportion. La marche et le repère, eux, sont justes.</p>' +
      '<div class="grille-2"><label class="champ"><span>Amplitude lue (°)</span><input type="text" inputmode="decimal" name="ampLue" placeholder="ex. 280"></label>' +
      '<label class="champ"><span>Angle réglé sur l\'appareil (°)</span><input type="text" inputmode="decimal" name="leveeReglee" placeholder="ex. 52"></label></div>' +
      '<label class="champ"><span>Angle de levée réel du calibre (°)</span><input type="text" inputmode="decimal" name="leveeReelle" placeholder="ex. 50"></label>' +
      '<div class="message info" id="res-amp">—</div></div>' +

      '<div class="carte"><h3>Marche sans chronocomparateur</h3><p class="doux petit" style="margin-top:0">Compare la montre à une heure de référence (horloge atomique en ligne, téléphone) à deux moments. Écart en secondes : positif si la montre avance.</p>' +
      '<div class="grille-2"><label class="champ"><span>1er relevé</span><input type="datetime-local" name="t1"></label><label class="champ"><span>Écart (s)</span><input type="text" inputmode="decimal" name="e1" placeholder="ex. 2"></label></div>' +
      '<div class="grille-2"><label class="champ"><span>2e relevé</span><input type="datetime-local" name="t2"></label><label class="champ"><span>Écart (s)</span><input type="text" inputmode="decimal" name="e2" placeholder="ex. 17"></label></div>' +
      '<div class="message info" id="res-marche">—</div></div>' +

      '<div class="carte"><h3>Fréquence</h3><div class="grille-2"><label class="champ"><span>Alternances / heure</span><input type="text" inputmode="numeric" name="ah" placeholder="ex. 28800"></label>' +
      '<label class="champ"><span>ou Hertz</span><input type="text" inputmode="decimal" name="hz" placeholder="ex. 4"></label></div><div class="message info" id="res-freq">—</div></div>' +

      '<div class="carte"><h3>Lignes ↔ millimètres</h3><p class="doux petit" style="margin-top:0">1 ligne = 2,2558 mm. Les tailles en lignes sont des appellations arrondies : un « 11½ lignes » mesure en réalité 25,60 mm. Pour commander, se fier aux mm de la fiche.</p><div class="grille-2"><label class="champ"><span>Lignes</span><input type="text" inputmode="decimal" name="lignes" placeholder="ex. 11,5"></label>' +
      '<label class="champ"><span>ou mm</span><input type="text" inputmode="decimal" name="mm" placeholder="ex. 25,6"></label></div><div class="message info" id="res-lignes">—</div></div>' +
      '</form>';
  };
  function calculerOutils() {
    var f = $("#form-outils"); if (!f) return;
    var v = function (n) { return nombre(f.elements[n].value); };
    var a = v("ampLue"), lr = v("leveeReglee"), lv = v("leveeReelle");
    $("#res-amp").innerHTML = a && lr && lv ? "Amplitude réelle : <b>" + fmt(a * lv / lr) + "°</b> (" + fmt(a) + " × " + fmt(lv, 1) + " ÷ " + fmt(lr, 1) + ")" : "Renseigne les trois valeurs.";
    var t1 = f.elements.t1.value, t2 = f.elements.t2.value, e1 = v("e1"), e2 = v("e2");
    if (t1 && t2 && e1 != null && e2 != null) {
      var jours = (new Date(t2) - new Date(t1)) / 86400000;
      if (jours <= 0) $("#res-marche").textContent = "Le 2e relevé doit être après le 1er.";
      else $("#res-marche").innerHTML = "Marche : <b>" + signe((e2 - e1) / jours, 1) + " s/j</b> sur " + fmt(jours, 2) + " jour(s)." + (jours < 1 ? " Pour une mesure fiable, attendre au moins 24 h." : "");
    } else $("#res-marche").textContent = "Renseigne les deux relevés.";
    var ah = v("ah"), hz = v("hz");
    if (ah) $("#res-freq").innerHTML = "<b>" + fmt(ah / 7200, 2) + " Hz</b> · " + fmt(ah / 3600, 2) + " pas de trotteuse / s · période " + fmt(7200000 / ah, 1) + " ms";
    else if (hz) $("#res-freq").innerHTML = "<b>" + fmt(hz * 7200) + " A/h</b> · " + fmt(hz * 2, 2) + " pas de trotteuse / s";
    else $("#res-freq").textContent = "Renseigne l'une des deux valeurs.";
    var li = v("lignes"), mm = v("mm");
    if (li) $("#res-lignes").innerHTML = "<b>" + fmt(li * LIGNE_MM, 2) + " mm</b>";
    else if (mm) $("#res-lignes").innerHTML = "<b>" + fmt(mm / LIGNE_MM, 2) + " lignes</b>";
    else $("#res-lignes").textContent = "Renseigne l'une des deux valeurs.";
  }

  /* ======================================================================
   *  RÉGLAGES ET SAUVEGARDE
   * ==================================================================== */
  ECRANS.reglages = function () {
    var t = lirePref("theme", "auto");
    var nbPh = D.photos.length;
    var h = '<div class="carte"><h3>Apparence</h3><div class="segment" id="choix-theme">' + [["auto", "Automatique"], ["light", "Clair"], ["dark", "Sombre"]].map(function (o) {
      return '<label><input type="radio" name="theme" value="' + o[0] + '"' + (t === o[0] ? " checked" : "") + '><span>' + o[1] + '</span></label>';
    }).join("") + '</div></div>';
    h += '<div class="carte"><h3>Sauvegarde</h3><p class="petit" style="margin-top:0">Tes données (' + D.montres.length + ' montre(s), ' + D.interventions.length + ' intervention(s), ' + nbPh + ' photo(s), ' + D.calibres.length + ' calibre(s) perso) restent <b>sur ce téléphone uniquement</b>. Si tu changes de téléphone ou vides les données du navigateur, elles sont perdues : sauvegarde régulièrement.</p>' +
      '<div class="actions"><button class="btn principal" data-action="sauvegarder">Sauvegarder (avec photos)</button><button class="btn" data-action="sauvegarder-sans">Sans les photos</button></div>' +
      '<div class="actions"><button class="btn" data-action="restaurer">Restaurer une sauvegarde</button></div></div>';
    h += '<div class="carte petit"><h3>À propos des données techniques</h3><p style="margin-top:0">Les fiches calibres, tableaux d\'huiles et repères de mesure sont des aides d\'atelier tirées de la documentation publique des fabricants. Une valeur incertaine est laissée vide ou marquée « à vérifier » plutôt qu\'inventée. Avant toute intervention, confronter à la fiche technique officielle du calibre.</p></div>';
    return { html: h, titre: "Réglages" };
  };
  APRES.reglages = function () {
    $("#choix-theme").addEventListener("change", function (e) { ecrirePref("theme", e.target.value); appliquerTheme(); });
  };
  function blobVersTexte(b) {
    return new Promise(function (ok) { var r = new FileReader(); r.onload = function () { ok(r.result); }; r.readAsDataURL(b); });
  }
  function texteVersBlob(d) {
    var p = d.split(","), mime = (p[0].match(/:(.*?);/) || [])[1] || "image/jpeg";
    var bin = atob(p[1]), n = bin.length, u = new Uint8Array(n);
    while (n--) u[n] = bin.charCodeAt(n);
    return new Blob([u], { type: mime });
  }
  function sauvegarder(avecPhotos) {
    var photos = avecPhotos ? Promise.all(D.photos.map(function (p) {
      return blobVersTexte(p.blob).then(function (t) { var c = Object.assign({}, p); c.blob = t; return c; });
    })) : Promise.resolve(D.photos.map(function (p) { var c = Object.assign({}, p); delete c.blob; return c; }));
    photos.then(function (ph) {
      var data = { format: "etabli-horloger", version: 1, date: new Date().toISOString(), montres: D.montres, interventions: D.interventions, photos: ph, calibres: D.calibres };
      var blob = new Blob([JSON.stringify(data)], { type: "application/json" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "etabli-sauvegarde-" + aujourdhui() + (avecPhotos ? "" : "-sans-photos") + ".json";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
      toast("Sauvegarde créée");
    });
  }
  function restaurer(texte) {
    var data;
    try { data = JSON.parse(texte); } catch (e) { toast("Fichier illisible"); return; }
    if (!data || data.format !== "etabli-horloger") { toast("Ce n'est pas une sauvegarde de l'Établi"); return; }
    if (!confirm("Remplacer toutes les données de ce téléphone par cette sauvegarde du " + dateFr(data.date) + " ?")) return;
    var photos = (data.photos || []).filter(function (p) { return p.blob; }).map(function (p) { var c = Object.assign({}, p); c.blob = texteVersBlob(p.blob); return c; });
    Object.keys(urlsPhotos).forEach(function (k) { URL.revokeObjectURL(urlsPhotos[k]); });
    urlsPhotos = {};
    Promise.all(STORES.map(viderStore)).then(function () {
      D = { montres: data.montres || [], interventions: data.interventions || [], photos: photos, calibres: data.calibres || [] };
      return Promise.all(STORES.reduce(function (acc, s) { return acc.concat(D[s].map(function (o) { return ecrire(s, o); })); }, []));
    }).then(function () { etat.pile = []; etat.onglet = "montres"; rendre(true); toast("Sauvegarde restaurée"); });
  }

  /* ======================================================================
   *  ACTIONS (délégation)
   * ==================================================================== */
  var ACTIONS = {
    retour: retour,
    reglages: function () { ouvrir({ type: "reglages" }); },
    onglet: function (el) { allerOnglet(el.dataset.onglet); },
    "nouvelle-montre": function () { ouvrir({ type: "form-montre" }); },
    "voir-montre": function (el) { ouvrir({ type: "montre", id: el.dataset.id }); },
    "modifier-montre": function (el) { ouvrir({ type: "form-montre", id: el.dataset.id }); },
    "supprimer-montre": function (el) {
      var id = el.dataset.id;
      if (!confirm("Supprimer cette montre, ses photos et ses interventions ? C'est définitif.")) return;
      var t = [supprimer("montres", id)];
      D.photos.filter(function (p) { return p.montreId === id; }).forEach(function (p) { t.push(supprimer("photos", p.id)); });
      D.interventions.filter(function (i) { return i.montreId === id; }).forEach(function (i) { t.push(supprimer("interventions", i.id)); });
      Promise.all(t).then(function () { allerOnglet("montres"); toast("Montre supprimée"); });
    },
    "prendre-photo": function (el) { demanderPhoto({ montreId: el.dataset.id }, false); },
    "galerie-photo": function (el) { demanderPhoto({ montreId: el.dataset.id }, true); },
    "voir-photo": function (el) { ouvrir({ type: "photo", id: el.dataset.id }); },
    "mode-pose": function () {
      var e = etat.pile[etat.pile.length - 1];
      var p = D.photos.find(function (x) { return x.id === e.id; });
      sauverChampsPhoto(p);
      enregistrer("photos", p).then(function () { e.pose = !e.pose; e.actif = null; rendre(false); });
    },
    "choisir-repere": function (el) {
      var e = etat.pile[etat.pile.length - 1];
      var p = D.photos.find(function (x) { return x.id === e.id; });
      sauverChampsPhoto(p); e.actif = +el.dataset.i; rendre(false);
    },
    "supprimer-repere": function (el) {
      var e = etat.pile[etat.pile.length - 1];
      var p = D.photos.find(function (x) { return x.id === e.id; });
      sauverChampsPhoto(p);
      p.reperes.splice(+el.dataset.i, 1);
      enregistrer("photos", p).then(function () { e.actif = null; rendre(false); });
    },
    "supprimer-photo": function (el) {
      if (!confirm("Supprimer cette photo et ses repères ?")) return;
      supprimer("photos", el.dataset.id).then(function () { toast("Photo supprimée"); retour(); });
    },
    "nouvelle-intervention": function (el) {
      ouvrir({ type: "intervention", id: null, brouillon: { montreId: el.dataset.id, date: aujourdhui(), type: "Révision complète", etapes: {}, avant: {}, apres: {} } });
    },
    "voir-intervention": function (el) {
      var it = D.interventions.find(function (x) { return x.id === el.dataset.id; });
      ouvrir({ type: "intervention", id: it.id });
    },
    "supprimer-intervention": function (el) {
      if (!confirm("Supprimer cette intervention ?")) return;
      supprimer("interventions", el.dataset.id).then(function () { toast("Intervention supprimée"); retour(); });
    },
    "voir-calibre": function (el) { ouvrir({ type: "calibre", id: el.dataset.id }); },
    "nouveau-calibre": function () { ouvrir({ type: "form-calibre" }); },
    "modifier-calibre": function (el) { ouvrir({ type: "form-calibre", id: el.dataset.id }); },
    "supprimer-calibre": function (el) {
      var utilise = D.montres.some(function (m) { return m.calibreId === el.dataset.id; });
      if (!confirm(utilise ? "Des montres utilisent ce calibre : elles redeviendront « non identifiées ». Supprimer ?" : "Supprimer ce calibre ?")) return;
      D.montres.filter(function (m) { return m.calibreId === el.dataset.id; }).forEach(function (m) { m.calibreId = ""; enregistrer("montres", m); });
      supprimer("calibres", el.dataset.id).then(function () { allerOnglet("calibres"); toast("Calibre supprimé"); });
    },
    "photo-ident": function () { demanderPhoto({ identification: true }, false); },
    "galerie-ident": function () { demanderPhoto({ identification: true }, true); },
    "raz-ident": function () { ident = {}; ecrirePref("ident", {}); etat.photoIdent = null; rendre(false); },
    "annuler-cible": function () { etat.cibleIdent = null; rendre(false); },
    "identifier-pour": function (el) { etat.cibleIdent = el.dataset.id; allerOnglet("identifier"); },
    "montre-depuis-calibre": function (el) {
      if (etat.cibleIdent) {
        var m = D.montres.find(function (x) { return x.id === etat.cibleIdent; });
        etat.cibleIdent = null;
        if (m) {
          m.calibreId = el.dataset.id;
          var photo = etat.photoIdent;
          var suite = photo ? enregistrer("photos", { id: nouvelId(), montreId: m.id, blob: photo.blob, l: photo.l, h: photo.h, legende: "Mouvement", reperes: [], date: new Date().toISOString() }) : Promise.resolve();
          suite.then(function () { return enregistrer("montres", m); }).then(function () {
            etat.photoIdent = null; etat.onglet = "montres"; ecrirePref("onglet", "montres");
            etat.pile = []; ouvrir({ type: "montre", id: m.id }); toast("Calibre attribué");
          });
          return;
        }
      }
      etat.onglet = "montres"; ecrirePref("onglet", "montres");
      ouvrir({ type: "form-montre", calibreId: el.dataset.id, photo: etat.photoIdent });
    },
    "sous-atelier": function (el) { etat.sousAtelier = el.dataset.sous; rendre(false); },
    "raz-mesures": function () { brouillonId.mesures = {}; rendre(false); },
    sauvegarder: function () { sauvegarder(true); },
    "sauvegarder-sans": function () { sauvegarder(false); },
    restaurer: function () { var e = $("#entree-restauration"); e.value = ""; e.click(); }
  };
  function allerOnglet(o) {
    etat.pile = [];
    etat.onglet = o; ecrirePref("onglet", o); rendre(true);
  }

  document.addEventListener("click", function (ev) {
    var b = ev.target.closest("[data-onglet]");
    if (b && b.closest("nav.onglets")) { allerOnglet(b.dataset.onglet); return; }
    var el = ev.target.closest("[data-action]");
    if (!el) return;
    var f = ACTIONS[el.dataset.action];
    if (f) { ev.preventDefault(); f(el); }
  });
  $("#entree-photo").addEventListener("change", function (e) { recevoirPhotos(e.target.files); });
  $("#entree-photo-galerie").addEventListener("change", function (e) { recevoirPhotos(e.target.files); });
  $("#entree-restauration").addEventListener("change", function (e) {
    var f = e.target.files[0]; if (!f) return;
    var r = new FileReader(); r.onload = function () { restaurer(r.result); }; r.readAsText(f);
  });
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", appliquerTheme);

  /* ---------- Démarrage ---------- */
  appliquerTheme();
  ouvrirBase().then(function () {
    return Promise.all(STORES.map(function (s) { return tout(s).then(function (l) { D[s] = l; }); }));
  }).then(function () {
    if (!ONGLETS[etat.onglet]) etat.onglet = "montres";
    rendre(true);
  }).catch(function (e) {
    $("#vue").innerHTML = '<div class="carte"><b>Impossible d\'ouvrir le stockage de l\'appareil.</b><p class="petit">' + esc(e && e.message) + '</p><p class="petit">En navigation privée, certains navigateurs bloquent le stockage. Ouvre l\'appli dans une fenêtre normale.</p></div>';
  });

  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("sw.js").catch(function () { /* hors ligne indisponible, l'appli marche quand même */ });
  }
})();
