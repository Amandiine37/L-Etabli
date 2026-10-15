/* Base technique de l'Établi.
 *
 * RÈGLE DE JUSTESSE : une valeur dont on n'est pas sûr est mise à null
 * (affichée « non renseigné »), ou listée dans `doute` (affichée « à vérifier »).
 * Mieux vaut un trou qu'un chiffre faux sur un établi.
 * Toujours confronter à la fiche technique du fabricant avant d'intervenir.
 *
 * Champs d'un calibre :
 *   id, fabricant, nom, alias[]      — alias = autres noms gravés ou commerciaux
 *   type          'auto' | 'manuel'
 *   diam          diamètre d'emboîtage en mm
 *   lignes        diamètre en lignes (texte, ex. "11½")
 *   haut          hauteur en mm
 *   rubis         nombre de rubis
 *   freq          alternances par heure (A/h)
 *   pr            réserve de marche en heures
 *   levee         angle de levée en degrés (réglage du chronocomparateur)
 *   stop          stop-seconde (la trotteuse s'arrête couronne tirée)
 *   manuel        remontage manuel possible par la couronne
 *   aff           'aucun' | 'date' | 'jour-date' | 'chrono' | 'chrono-date' | 'chrono-jour-date'
 *   base          id du calibre dont il dérive (clone, base)
 *   reperage      où lire le numéro / comment le reconnaître
 *   points[]      points d'atelier (faiblesses connues, particularités)
 *   doute[]       champs à vérifier
 */
var CALIBRES = [
  {
    id: "eta-2824-2", fabricant: "ETA", nom: "2824-2", alias: ["2824", "ETA 2824"],
    type: "auto", diam: 25.60, lignes: "11½", haut: 4.60, rubis: 25, freq: 28800, pr: 38,
    levee: 50, stop: true, manuel: true, aff: "date", base: null,
    reperage: "Masse oscillante bidirectionnelle à roulement. Numéro « 2824-2 » gravé sur la platine ou un pont, souvent visible en retirant la masse. Antichoc Incabloc, réglage Etachron (raquette + porte-piton mobile ; vis de réglage fin sur les qualités supérieures).",
    points: [
      "Remontage automatique par deux roues d'inversion : pièce d'usure classique. Ne pas les huiler ; si le remontage patine ou fait du bruit, les remplacer.",
      "Réglage Etachron : la raquette et le piton se règlent séparément (marche / défaut de repère).",
      "Mouvement le plus cloné du monde (Sellita SW200-1, Soprod, clones asiatiques) : la plupart des pièces sont proches mais vérifier la compatibilité référence par référence."
    ],
    doute: []
  },
  {
    id: "sellita-sw200-1", fabricant: "Sellita", nom: "SW200-1", alias: ["SW200", "Oris 733", "Calibre 5"],
    type: "auto", diam: 25.60, lignes: "11½", haut: 4.60, rubis: 26, freq: 28800, pr: 38,
    levee: 50, stop: true, manuel: true, aff: "date", base: "eta-2824-2",
    reperage: "Quasi identique au 2824-2 ; le 26e rubis est sur la roue d'inversion / renvoi selon les versions. Marquage « SW200 » ou « Sellita » sur un pont.",
    points: [
      "Architecture du 2824-2 : même logique de révision et de lubrification.",
      "Les versions récentes annoncent une réserve de marche allongée (environ 41 h) : vérifier la version gravée.",
      "Oris 733 et TAG Heuer Calibre 5 sont des SW200-1 ou 2824-2 décorés / renommés."
    ],
    doute: ["levee"]
  },
  {
    id: "eta-2892-a2", fabricant: "ETA", nom: "2892-A2", alias: ["2892", "2892-2", "Omega 1120"],
    type: "auto", diam: 25.60, lignes: "11½", haut: 3.60, rubis: 21, freq: 28800, pr: 42,
    levee: 50, stop: true, manuel: true, aff: "date", base: null,
    reperage: "Plus plat que le 2824 (3,60 mm). Base de nombreux modules (chronographes Dubois-Dépraz, GMT) et de l'Omega 1120.",
    points: [
      "Mouvement haut de gamme d'ETA : tolérances serrées, finition souvent supérieure.",
      "Si un module est monté côté cadran (chrono, GMT), le déposer et le réviser à part, avec sa propre fiche."
    ],
    doute: []
  },
  {
    id: "sellita-sw300-1", fabricant: "Sellita", nom: "SW300-1", alias: ["SW300"],
    type: "auto", diam: 25.60, lignes: "11½", haut: 3.60, rubis: 25, freq: 28800, pr: 42,
    levee: null, stop: true, manuel: true, aff: "date", base: "eta-2892-a2",
    reperage: "Équivalent Sellita du 2892-A2. Marquage « SW300 ».",
    points: ["Même logique de révision que le 2892-A2 ; versions récentes à réserve de marche allongée."],
    doute: []
  },
  {
    id: "eta-2836-2", fabricant: "ETA", nom: "2836-2", alias: ["2836"],
    type: "auto", diam: 25.60, lignes: "11½", haut: 5.05, rubis: 25, freq: 28800, pr: 38,
    levee: 50, stop: true, manuel: true, aff: "jour-date", base: "eta-2824-2",
    reperage: "2824-2 avec affichage jour + date (plus haut : 5,05 mm). Disque des jours côté cadran.",
    points: [
      "Mécanique de base du 2824-2 ; la minuterie jour/date côté cadran ajoute des sautoirs à contrôler.",
      "Jour rapide : selon la version, en tournant les aiguilles en arrière ou par la couronne en position intermédiaire."
    ],
    doute: []
  },
  {
    id: "sellita-sw220-1", fabricant: "Sellita", nom: "SW220-1", alias: ["SW220"],
    type: "auto", diam: 25.60, lignes: "11½", haut: 5.05, rubis: 26, freq: 28800, pr: 38,
    levee: null, stop: true, manuel: true, aff: "jour-date", base: "eta-2836-2",
    reperage: "Équivalent Sellita du 2836-2. Marquage « SW220 ».",
    points: ["Même logique que le 2836-2."],
    doute: []
  },
  {
    id: "eta-2801-2", fabricant: "ETA", nom: "2801-2", alias: ["2801"],
    type: "manuel", diam: 25.60, lignes: "11½", haut: 3.35, rubis: 17, freq: 28800, pr: 42,
    levee: 50, stop: true, manuel: true, aff: "aucun", base: null,
    reperage: "Version à remontage manuel de la famille 28xx. Pas de masse oscillante.",
    points: ["Remontage manuel uniquement : ne pas forcer en fin de remontage (pas de bride glissante)."],
    doute: ["levee"]
  },
  {
    id: "eta-2671", fabricant: "ETA", nom: "2671", alias: [],
    type: "auto", diam: 17.20, lignes: "7¾", haut: 4.80, rubis: 25, freq: 28800, pr: 38,
    levee: null, stop: true, manuel: true, aff: "date", base: null,
    reperage: "Petit automatique pour montres dames (17,20 mm). Numéro gravé sur la platine.",
    points: ["Pièces minuscules : prévoir des brucelles fines et un plateau à couvercle.", "Spiral très fin : extrême prudence au nettoyage du balancier."],
    doute: []
  },
  {
    id: "eta-2000-1", fabricant: "ETA", nom: "2000-1", alias: ["2000"],
    type: "auto", diam: 19.40, lignes: "8¾", haut: 3.60, rubis: 20, freq: 28800, pr: 40,
    levee: null, stop: true, manuel: true, aff: "date", base: null,
    reperage: "Automatique de petit diamètre (19,40 mm), montres dames ou boîtes petites.",
    points: [],
    doute: []
  },
  {
    id: "eta-7750", fabricant: "ETA / Valjoux", nom: "7750", alias: ["Valjoux 7750", "Calibre 16", "Breitling B13"],
    type: "auto", diam: 30.00, lignes: "13¼", haut: 7.90, rubis: 25, freq: 28800, pr: 42,
    levee: 50, stop: true, manuel: true, aff: "chrono-jour-date", base: null,
    reperage: "Chronographe à came (pas de roue à colonnes), compteurs 30 min à 12 h et 12 h à 6 h. Masse qui remonte dans un seul sens : on l'entend « tourner libre » dans l'autre, c'est normal.",
    points: [
      "Chronographe à came : réviser la bascule et le levier de la came, points de graisse précis — suivre la fiche ETA.",
      "Le rotor qui « claque » ou flotte un peu est typique du 7750 ; un frottement sur le fond, lui, ne l'est pas.",
      "Très nombreuses déclinaisons (7753 : compteurs à 3-6-9, date seule…) : identifier la variante exacte avant de commander une pièce.",
      "Réserve de marche annoncée en hausse sur les productions récentes : vérifier la version."
    ],
    doute: []
  },
  {
    id: "sellita-sw500", fabricant: "Sellita", nom: "SW500", alias: ["SW500-1"],
    type: "auto", diam: 30.00, lignes: "13¼", haut: 7.90, rubis: 25, freq: 28800, pr: null,
    levee: null, stop: true, manuel: true, aff: "chrono-jour-date", base: "eta-7750",
    reperage: "Équivalent Sellita du 7750. Marquage « SW500 ».",
    points: ["Même logique que le 7750 ; réserve de marche selon la génération (à relever sur la fiche Sellita)."],
    doute: []
  },
  {
    id: "eta-6497", fabricant: "ETA / Unitas", nom: "6497", alias: ["Unitas 6497", "6497-1", "6497-2"],
    type: "manuel", diam: 36.60, lignes: "16½", haut: 4.50, rubis: 17, freq: 18000, pr: 46,
    levee: null, stop: false, manuel: true, aff: "aucun", base: null,
    reperage: "Grand mouvement de montre de poche (36,60 mm), petite seconde à 9 h quand la couronne est à 3 h. Fréquence lente (2,5 Hz) : la trotteuse fait 5 pas par seconde.",
    points: [
      "Idéal pour apprendre : pièces grandes, très documenté.",
      "La version -2 ajoute un stop-seconde selon les productions : vérifier.",
      "Utilisé par Panerai (anciens calibres OP) et de nombreux montres « marine » ou squelettes."
    ],
    doute: ["pr", "stop"]
  },
  {
    id: "eta-6498", fabricant: "ETA / Unitas", nom: "6498", alias: ["Unitas 6498", "6498-1", "6498-2"],
    type: "manuel", diam: 36.60, lignes: "16½", haut: 4.50, rubis: 17, freq: 18000, pr: 46,
    levee: null, stop: false, manuel: true, aff: "aucun", base: "eta-6497",
    reperage: "Comme le 6497 mais petite seconde à 6 h (couronne à 3 h).",
    points: ["Même révision que le 6497."],
    doute: ["pr", "stop"]
  },
  {
    id: "peseux-7001", fabricant: "ETA / Peseux", nom: "7001", alias: ["Peseux 7001", "ETA 7001"],
    type: "manuel", diam: 23.30, lignes: "10½", haut: 2.50, rubis: 17, freq: 21600, pr: 42,
    levee: null, stop: false, manuel: true, aff: "aucun", base: null,
    reperage: "Mouvement manuel extra-plat (2,50 mm), petite seconde à 6 h.",
    points: ["Très plat : attention aux ponts fins, ne pas forcer au remontage des vis."],
    doute: ["stop"]
  },
  {
    id: "eta-c07-111", fabricant: "ETA", nom: "C07.111 (Powermatic 80)", alias: ["Powermatic 80", "C07.111", "H-10", "C07.611", "Caliber 80", "C07.621"],
    type: "auto", diam: 25.60, lignes: "11½", haut: null, rubis: 23, freq: 21600, pr: 80,
    levee: null, stop: true, manuel: true, aff: "date", base: "eta-2824-2",
    reperage: "Dérivé du 2824 ralenti à 3 Hz pour 80 h de réserve (Tissot Powermatic 80, Hamilton H-10, Mido Caliber 80 selon les variantes).",
    points: [
      "Certaines variantes n'ont pas de raquette accessible (réglage en usine) : vérifier avant de promettre un réglage de marche.",
      "Pièces spécifiques (barillet, échappement) peu diffusées hors réseau Swatch Group : se renseigner sur la disponibilité avant d'ouvrir.",
      "Certaines variantes ont un spiral en silicium (versions « Silicium ») : antimagnétique mais cassant, il ne se retouche pas comme un spiral métallique."
    ],
    doute: ["rubis"]
  },
  {
    id: "seiko-nh35", fabricant: "Seiko (TMI)", nom: "NH35A", alias: ["NH35", "4R35", "4R35A"],
    type: "auto", diam: 27.40, lignes: null, haut: 5.32, rubis: 24, freq: 21600, pr: 41,
    levee: 53, stop: true, manuel: true, aff: "date", base: null,
    reperage: "Masse marquée « SII » ou « Seiko Instruments », numéro « NH35A » gravé sur le pont. 4R35 = même mouvement sous marque Seiko.",
    points: [
      "Remontage par « Magic Lever » (cliquet à deux bras) : pièce d'usure, la remplacer si le remontage auto est faible.",
      "Antichoc Diashock : les pierres de contre-pivot se démontent différemment d'Incabloc (ressort à trois branches).",
      "Mouvement très courant et peu coûteux : souvent plus rentable d'échanger que de réviser, mais excellent pour s'entraîner."
    ],
    doute: []
  },
  {
    id: "seiko-nh36", fabricant: "Seiko (TMI)", nom: "NH36A", alias: ["NH36", "4R36", "4R36A"],
    type: "auto", diam: 27.40, lignes: null, haut: 5.32, rubis: 24, freq: 21600, pr: 41,
    levee: 53, stop: true, manuel: true, aff: "jour-date", base: "seiko-nh35",
    reperage: "NH35A avec jour + date. « NH36A » ou « 4R36 » gravé.",
    points: ["Même logique que le NH35A ; un sautoir de plus pour le jour."],
    doute: []
  },
  {
    id: "seiko-7s26", fabricant: "Seiko", nom: "7S26", alias: ["7S26A", "7S26B", "7S26C", "7S36"],
    type: "auto", diam: 27.40, lignes: null, haut: 5.32, rubis: 21, freq: 21600, pr: 41,
    levee: 53, stop: false, manuel: false, aff: "jour-date", base: null,
    reperage: "Seiko 5 et SKX classiques. Ni stop-seconde ni remontage manuel : la couronne ne remonte pas la montre. 7S36 = version 23 rubis.",
    points: [
      "Pas de remontage manuel : pour tester, secouer la montre ou utiliser un remontoir.",
      "Magic Lever : principale cause de remontage automatique faible.",
      "Amplitudes plus basses que sur un mouvement suisse à 4 Hz : ne pas juger avec les mêmes repères."
    ],
    doute: []
  },
  {
    id: "seiko-6r15", fabricant: "Seiko", nom: "6R15", alias: ["6R15A", "6R15B", "6R15C", "6R15D"],
    type: "auto", diam: 27.40, lignes: null, haut: null, rubis: 23, freq: 21600, pr: 50,
    levee: 53, stop: true, manuel: true, aff: "date", base: null,
    reperage: "Seiko Prospex / Presage milieu de gamme. Ressort Spron.",
    points: ["Ressort de barillet en alliage Spron : commander la pièce Seiko exacte, pas un équivalent générique."],
    doute: []
  },
  {
    id: "seiko-6r35", fabricant: "Seiko", nom: "6R35", alias: ["6R35A"],
    type: "auto", diam: 27.40, lignes: null, haut: null, rubis: 24, freq: 21600, pr: 70,
    levee: 53, stop: true, manuel: true, aff: "date", base: "seiko-6r15",
    reperage: "Successeur du 6R15 à 70 h de réserve.",
    points: [],
    doute: []
  },
  {
    id: "seiko-6309", fabricant: "Seiko", nom: "6309", alias: ["6309A", "6309B"],
    type: "auto", diam: null, lignes: null, haut: null, rubis: 17, freq: 21600, pr: null,
    levee: null, stop: false, manuel: false, aff: "jour-date", base: null,
    reperage: "Plongeuses Seiko vintage (années 1970-80, « Turtle » 6309-7040). Variantes 17 ou 21 rubis selon les marchés.",
    points: [
      "Mouvement ancien : pièces d'occasion fréquentes, vérifier l'usure des pivots du rouage.",
      "Pas de remontage manuel ni de stop-seconde."
    ],
    doute: ["rubis"]
  },
  {
    id: "miyota-8215", fabricant: "Miyota (Citizen)", nom: "8215", alias: ["8205", "821A"],
    type: "auto", diam: 26.00, lignes: "11½", haut: 5.67, rubis: 21, freq: 21600, pr: 42,
    levee: null, stop: false, manuel: true, aff: "date", base: null,
    reperage: "Masse marquée « Miyota » ou « Japan », remontage dans un seul sens (masse bruyante, c'est normal). Pas de stop-seconde.",
    points: [
      "Masse qui « grince » ou tourne librement dans un sens : comportement normal du 82xx, pas une panne.",
      "Mouvement d'entrée de gamme : échange standard souvent plus économique que révision."
    ],
    doute: []
  },
  {
    id: "miyota-9015", fabricant: "Miyota (Citizen)", nom: "9015", alias: ["9039", "9019"],
    type: "auto", diam: 26.00, lignes: "11½", haut: 3.90, rubis: 24, freq: 28800, pr: 42,
    levee: null, stop: true, manuel: true, aff: "date", base: null,
    reperage: "Concurrent japonais du 2824 (4 Hz, plat). 9039 = sans date.",
    points: ["Pièces moins diffusées que les ETA/Sellita : vérifier la disponibilité avant de commander."],
    doute: []
  },
  {
    id: "rolex-3135", fabricant: "Rolex", nom: "3135", alias: ["3135"],
    type: "auto", diam: 28.50, lignes: "12½", haut: 6.00, rubis: 31, freq: 28800, pr: 48,
    levee: 52, stop: true, manuel: true, aff: "date", base: null,
    reperage: "Pont de balancier traversant (tenu des deux côtés), balancier à vis Microstella, pas de raquette. Submariner Date, Datejust (génération précédente).",
    points: [
      "Pas de raquette : la marche se règle avec les écrous Microstella du balancier, à l'outil dédié. Ne pas chercher de raquette.",
      "Inverseur à roues rouges (roues d'inversion) : usure fréquente, remplacer plutôt que nettoyer si le remontage faiblit.",
      "Axe de masse oscillante : son usure laisse la masse toucher le pont — à contrôler à chaque révision."
    ],
    doute: []
  },
  {
    id: "rolex-3235", fabricant: "Rolex", nom: "3235", alias: [],
    type: "auto", diam: 28.50, lignes: "12½", haut: 6.00, rubis: 31, freq: 28800, pr: 70,
    levee: null, stop: true, manuel: true, aff: "date", base: "rolex-3135",
    reperage: "Successeur du 3135 : échappement Chronergy, 70 h de réserve.",
    points: ["Échappement Chronergy (géométrie spécifique) : suivre strictement la fiche Rolex pour la lubrification de l'échappement."],
    doute: []
  },
  {
    id: "rolex-1570", fabricant: "Rolex", nom: "1570", alias: ["1560", "1520"],
    type: "auto", diam: 28.50, lignes: "12½", haut: null, rubis: 26, freq: 19800, pr: null,
    levee: null, stop: null, manuel: true, aff: "aucun", base: null,
    reperage: "Rolex vintage (années 1960-70, Submariner 5513, Explorer 1016). 19 800 A/h (2,75 Hz). Le stop-seconde est arrivé en cours de production.",
    points: ["Pièces d'époque rares et chères : documenter chaque pièce remplacée (originale ou service)."],
    doute: ["diam"]
  },
  {
    id: "omega-8500", fabricant: "Omega", nom: "8500", alias: ["8501", "8800", "8900"],
    type: "auto", diam: 29.00, lignes: null, haut: 5.50, rubis: 39, freq: 25200, pr: 60,
    levee: null, stop: true, manuel: true, aff: "date", base: null,
    reperage: "Échappement co-axial, deux barillets, 3,5 Hz (25 200 A/h : 7 pas de trotteuse par seconde).",
    points: [
      "Échappement co-axial : ne PAS le lubrifier comme une ancre suisse classique. Suivre impérativement la fiche Omega.",
      "Fréquence peu courante : régler le chronocomparateur sur 25 200 A/h, sinon la lecture est fausse."
    ],
    doute: ["haut"]
  },
  {
    id: "omega-861", fabricant: "Omega", nom: "861 / 1861", alias: ["861", "1861", "Lemania 1873"],
    type: "manuel", diam: 27.00, lignes: "12", haut: 6.87, rubis: 17, freq: 21600, pr: null,
    levee: null, stop: false, manuel: true, aff: "chrono", base: null,
    reperage: "Chronographe manuel à came de la Speedmaster (dérivé Lemania 1873). 1861 = 18 rubis, finition rhodiée.",
    points: ["Chronographe : déposer la mécanique chrono avant le rouage, garder des photos de chaque étape (ressorts en fil)."],
    doute: ["haut"]
  },
  {
    id: "vostok-2416b", fabricant: "Vostok", nom: "2416B", alias: ["2416", "2415", "2414"],
    type: "auto", diam: 24.00, lignes: null, haut: null, rubis: 31, freq: 19800, pr: null,
    levee: null, stop: false, manuel: true, aff: "date", base: null,
    reperage: "Vostok Amphibia / Komandirskie. 19 800 A/h. Pas de stop-seconde, pas de date rapide.",
    points: [
      "Pas de date rapide : on avance la date en faisant aller-retour les aiguilles entre environ 20 h et minuit.",
      "Remontage manuel à la couronne un peu « rugueux » : c'est d'origine.",
      "Boîte Amphibia : étanchéité par pression du fond ; vérifier le joint plutôt que serrer davantage."
    ],
    doute: ["diam"]
  }
  ,
  /* ----- Ajouts du 15/10 (v1.1) ----- */
  {
    id: "eta-2893-2", fabricant: "ETA", nom: "2893-2", alias: ["2893", "2893-1"],
    type: "auto", diam: 25.60, lignes: "11½", haut: 4.10, rubis: 21, freq: 28800, pr: 42,
    levee: 50, stop: true, manuel: true, aff: "date", base: "eta-2892-a2",
    reperage: "2892 avec aiguille de deuxième fuseau horaire (GMT 24 h) réglable par la couronne.",
    points: ["Mécanisme GMT côté cadran : le déposer et le photographier avant de toucher au reste."],
    doute: ["levee"]
  },
  {
    id: "eta-2895-2", fabricant: "ETA", nom: "2895-2", alias: ["2895", "2895-1"],
    type: "auto", diam: 25.60, lignes: "11½", haut: 4.35, rubis: 30, freq: 28800, pr: 42,
    levee: null, stop: true, manuel: true, aff: "date", base: "eta-2892-a2",
    reperage: "Famille 2892 avec petite seconde à 6 h.",
    points: [],
    doute: ["haut", "rubis"]
  },
  {
    id: "eta-2894-2", fabricant: "ETA", nom: "2894-2", alias: ["2894"],
    type: "auto", diam: 28.00, lignes: "12½", haut: 6.10, rubis: 37, freq: 28800, pr: 42,
    levee: null, stop: true, manuel: true, aff: "chrono-date", base: "eta-2892-a2",
    reperage: "Chronographe modulaire : module chrono posé côté cadran sur une base 2892.",
    points: ["Module côté cadran : le réviser à part, avec sa fiche ; la base se traite comme un 2892-A2."],
    doute: ["haut"]
  },
  {
    id: "eta-7753", fabricant: "ETA / Valjoux", nom: "7753", alias: ["Valjoux 7753"],
    type: "auto", diam: 30.00, lignes: "13¼", haut: 7.90, rubis: 27, freq: 28800, pr: 42,
    levee: 50, stop: true, manuel: true, aff: "chrono-date", base: "eta-7750",
    reperage: "Variante du 7750 : compteurs à 3, 6 et 9 h, date seule, correcteur de date sur le flanc de la boîte.",
    points: ["Même révision que le 7750 ; les pièces de compteurs diffèrent, vérifier la référence."],
    doute: ["rubis"]
  },
  {
    id: "soprod-a10", fabricant: "Soprod", nom: "A10", alias: ["A10-2"],
    type: "auto", diam: 25.60, lignes: "11½", haut: 3.60, rubis: 25, freq: 28800, pr: 42,
    levee: null, stop: true, manuel: true, aff: "date", base: null,
    reperage: "Alternative suisse au 2892-A2, mêmes cotes d'emboîtage. Marquage « Soprod » ou « A10 ».",
    points: ["Pièces propres à Soprod : ne pas supposer qu'une pièce de 2892 convient."],
    doute: ["pr"]
  },
  {
    id: "seiko-nh38", fabricant: "Seiko (TMI)", nom: "NH38A", alias: ["NH38", "4R38"],
    type: "auto", diam: 27.40, lignes: null, haut: 5.32, rubis: 24, freq: 21600, pr: 41,
    levee: 53, stop: true, manuel: true, aff: "aucun", base: "seiko-nh35",
    reperage: "NH35A sans date (pas de disque de date).",
    points: ["Même révision que le NH35A."],
    doute: []
  },
  {
    id: "seiko-nh34", fabricant: "Seiko (TMI)", nom: "NH34A", alias: ["NH34", "4R34"],
    type: "auto", diam: null, lignes: null, haut: null, rubis: 24, freq: 21600, pr: 41,
    levee: 53, stop: true, manuel: true, aff: "date", base: "seiko-nh35",
    reperage: "Version GMT de la famille NH : aiguille 24 h réglable.",
    points: ["Mécanisme GMT côté cadran à photographier avant démontage."],
    doute: ["rubis", "levee"]
  },
  {
    id: "seiko-8l35", fabricant: "Seiko", nom: "8L35", alias: ["8L35A", "8L35B"],
    type: "auto", diam: null, lignes: null, haut: null, rubis: 26, freq: 28800, pr: 50,
    levee: null, stop: true, manuel: true, aff: "aucun", base: null,
    reperage: "Base non décorée du 9S55 Grand Seiko, utilisée dans les Marinemaster et Prospex haut de gamme.",
    points: ["Finition et tolérances proches du Grand Seiko : traiter avec le même soin."],
    doute: []
  },
  {
    id: "seiko-6139", fabricant: "Seiko", nom: "6139", alias: ["6139A", "6139B"],
    type: "auto", diam: null, lignes: null, haut: null, rubis: 17, freq: 21600, pr: null,
    levee: null, stop: false, manuel: false, aff: "chrono-jour-date", base: null,
    reperage: "Chronographe automatique vintage (1969, « Pogue »). Roue à colonnes et embrayage vertical, compteur 30 min.",
    points: [
      "Roue à colonnes + embrayage vertical : architecture différente des chronos à came. Photographier chaque étape.",
      "Pas de remontage manuel : tester sur remontoir ou en secouant."
    ],
    doute: ["rubis"]
  },
  {
    id: "orient-f6922", fabricant: "Orient", nom: "F6922", alias: ["F692"],
    type: "auto", diam: null, lignes: null, haut: null, rubis: 22, freq: 21600, pr: 40,
    levee: null, stop: true, manuel: true, aff: "jour-date", base: null,
    reperage: "Calibre maison Orient (Mako III, Kamasu…). Masse marquée « Orient ».",
    points: ["Pièces surtout disponibles via le réseau Orient / Seiko Epson : vérifier avant d'ouvrir."],
    doute: []
  },
  {
    id: "orient-f6724", fabricant: "Orient", nom: "F6724", alias: ["F672"],
    type: "auto", diam: null, lignes: null, haut: null, rubis: 22, freq: 21600, pr: 40,
    levee: null, stop: true, manuel: true, aff: "aucun", base: null,
    reperage: "Calibre maison Orient sans date (Bambino récentes).",
    points: [],
    doute: ["aff"]
  },
  {
    id: "orient-46943", fabricant: "Orient", nom: "46943", alias: ["46941", "469"],
    type: "auto", diam: null, lignes: null, haut: null, rubis: 21, freq: 21600, pr: 40,
    levee: null, stop: false, manuel: false, aff: "jour-date", base: null,
    reperage: "Ancien calibre Orient (Mako, Ray de première génération). Ni stop-seconde ni remontage manuel.",
    points: ["Pas de remontage manuel : tester sur remontoir ou en secouant."],
    doute: []
  },
  {
    id: "citizen-8200", fabricant: "Citizen", nom: "8200", alias: ["8203", "8204"],
    type: "auto", diam: null, lignes: null, haut: null, rubis: 21, freq: 21600, pr: 42,
    levee: null, stop: false, manuel: false, aff: "date", base: null,
    reperage: "Calibre maison Citizen (Promaster NY00xx). 8203 = jour + date.",
    points: ["Ni stop-seconde ni remontage manuel."],
    doute: ["pr"]
  },
  {
    id: "zenith-el-primero-400", fabricant: "Zenith", nom: "El Primero 400", alias: ["El Primero", "400", "3019 PHC", "400B"],
    type: "auto", diam: 30.00, lignes: "13¼", haut: 6.50, rubis: 31, freq: 36000, pr: 50,
    levee: null, stop: null, manuel: true, aff: "chrono-date", base: null,
    reperage: "Chronographe automatique à roue à colonnes, 5 Hz : la trotteuse fait 10 pas par seconde.",
    points: [
      "Haute fréquence (36 000 A/h) : régler le chronocomparateur en conséquence, sinon la lecture est fausse.",
      "Les mobiles rapides s'usent plus vite : contrôler soigneusement les pivots de l'échappement."
    ],
    doute: []
  },
  {
    id: "lemania-5100", fabricant: "Lemania", nom: "5100", alias: ["5100"],
    type: "auto", diam: null, lignes: null, haut: null, rubis: 17, freq: 21600, pr: null,
    levee: null, stop: null, manuel: true, aff: "chrono-jour-date", base: null,
    reperage: "Chronographe automatique robuste (montres militaires, Sinn, Tutima, Omega). Compteur des minutes au centre.",
    points: ["Certaines pièces du chronographe sont en plastique technique : vérifier la compatibilité des produits de nettoyage avec la fiche."],
    doute: ["aff"]
  },
  {
    id: "valjoux-72", fabricant: "Valjoux", nom: "72", alias: ["Valjoux 72", "Rolex 72B", "Rolex 722"],
    type: "manuel", diam: null, lignes: "13", haut: null, rubis: 17, freq: 18000, pr: null,
    levee: null, stop: false, manuel: true, aff: "chrono", base: null,
    reperage: "Chronographe manuel vintage à roue à colonnes, trois compteurs (Daytona d'époque, Heuer, Breitling…).",
    points: ["Pièce de collection : documenter chaque pièce changée (originale ou de service)."],
    doute: []
  },
  {
    id: "valjoux-7733", fabricant: "Valjoux", nom: "7733", alias: ["7734", "7736"],
    type: "manuel", diam: null, lignes: "13", haut: null, rubis: 17, freq: 18000, pr: null,
    levee: null, stop: false, manuel: true, aff: "chrono", base: null,
    reperage: "Chronographe manuel vintage à came, ancêtre du 7750. 7734 = avec date, 7736 = trois compteurs.",
    points: ["Fréquence selon l'époque de production : vérifier sur la fiche avant de régler le chronocomparateur."],
    doute: ["freq"]
  },
  {
    id: "omega-321", fabricant: "Omega", nom: "321", alias: ["321"],
    type: "manuel", diam: 27.00, lignes: "12", haut: null, rubis: 17, freq: 18000, pr: null,
    levee: null, stop: false, manuel: true, aff: "chrono", base: null,
    reperage: "Chronographe manuel à roue à colonnes des premières Speedmaster (dérivé Lemania 2310).",
    points: ["Calibre de collection très recherché : documenter précisément toute pièce remplacée."],
    doute: []
  },
  {
    id: "omega-3861", fabricant: "Omega", nom: "3861", alias: ["3861"],
    type: "manuel", diam: 27.00, lignes: "12", haut: null, rubis: 26, freq: 21600, pr: 50,
    levee: null, stop: true, manuel: true, aff: "chrono", base: "omega-861",
    reperage: "Successeur du 1861 dans la Speedmaster (2019) : échappement co-axial, spiral silicium, stop-seconde.",
    points: ["Échappement co-axial : lubrification selon la fiche Omega, pas comme une ancre classique."],
    doute: ["diam"]
  },
  {
    id: "rolex-3035", fabricant: "Rolex", nom: "3035", alias: ["3035"],
    type: "auto", diam: 28.50, lignes: "12½", haut: null, rubis: 27, freq: 28800, pr: null,
    levee: null, stop: true, manuel: true, aff: "date", base: null,
    reperage: "Prédécesseur du 3135 (fin des années 1970-80) : premier calibre Rolex à 4 Hz avec date rapide.",
    points: ["Roues d'inversion : même point d'usure que sur le 3135."],
    doute: ["diam"]
  },
  {
    id: "rolex-3130", fabricant: "Rolex", nom: "3130", alias: ["3130"],
    type: "auto", diam: 28.50, lignes: "12½", haut: null, rubis: 31, freq: 28800, pr: 48,
    levee: null, stop: true, manuel: true, aff: "aucun", base: "rolex-3135",
    reperage: "3135 sans date (Submariner sans date, Explorer).",
    points: ["Même révision que le 3135."],
    doute: ["diam"]
  },
  {
    id: "rolex-3186", fabricant: "Rolex", nom: "3186", alias: ["3185", "3186"],
    type: "auto", diam: 28.50, lignes: "12½", haut: null, rubis: 31, freq: 28800, pr: 48,
    levee: null, stop: true, manuel: true, aff: "date", base: "rolex-3135",
    reperage: "Base 3135 avec aiguille GMT (GMT-Master II, Explorer II).",
    points: ["Mécanisme GMT côté cadran à photographier avant démontage."],
    doute: ["diam"]
  },
  {
    id: "rolex-4130", fabricant: "Rolex", nom: "4130", alias: ["4130"],
    type: "auto", diam: 30.50, lignes: null, haut: 6.50, rubis: 44, freq: 28800, pr: 72,
    levee: null, stop: true, manuel: true, aff: "chrono", base: null,
    reperage: "Chronographe automatique maison de la Daytona (2000-2023) : roue à colonnes, embrayage vertical.",
    points: ["Embrayage vertical : pas de « saut » de la trotteuse chrono au départ, c'est normal."],
    doute: []
  },
  {
    id: "tudor-mt5602", fabricant: "Tudor", nom: "MT5602", alias: ["MT5602", "MT5612", "MT5402"],
    type: "auto", diam: null, lignes: null, haut: null, rubis: 25, freq: 28800, pr: 70,
    levee: null, stop: true, manuel: true, aff: "aucun", base: null,
    reperage: "Calibre maison Tudor (Black Bay, Pelagos), spiral silicium. MT5612 = avec date.",
    points: ["Spiral silicium : antimagnétique mais cassant, il ne se retouche pas comme un spiral métallique."],
    doute: []
  },
  {
    id: "vostok-2409", fabricant: "Vostok", nom: "2409", alias: ["2409A", "2409"],
    type: "manuel", diam: null, lignes: null, haut: null, rubis: 17, freq: 19800, pr: null,
    levee: null, stop: false, manuel: true, aff: "aucun", base: null,
    reperage: "Manuel Vostok (Komandirskie à remontage manuel).",
    points: ["Remontage un peu « rugueux » d'origine, comme le 2416B."],
    doute: []
  },
  {
    id: "poljot-3133", fabricant: "Poljot", nom: "3133", alias: ["3133", "31659"],
    type: "manuel", diam: 31.00, lignes: null, haut: null, rubis: 23, freq: 21600, pr: null,
    levee: null, stop: false, manuel: true, aff: "chrono", base: null,
    reperage: "Chronographe manuel russe à came, dérivé du Valjoux 7734 (Sturmanskie, Okeah). 31659 = version plus récente.",
    points: ["Pièces encore trouvables d'occasion : comparer les références avant de mélanger 3133 et 31659."],
    doute: []
  }
];

/* Marques de montres -> calibres souvent rencontrés (indicatif, à confirmer
 * en ouvrant : une même marque change de fournisseur selon les années). */
var MARQUES = [
  { nom: "Tissot", calibres: ["eta-2824-2", "eta-c07-111", "eta-2836-2"], note: "Powermatic 80 sur la plupart des automatiques récentes ; ETA 2824-2 avant." },
  { nom: "Hamilton", calibres: ["eta-c07-111", "eta-2824-2", "eta-7750"], note: "H-10 (famille Powermatic 80) sur les modèles récents ; H-21 = base 7750." },
  { nom: "Mido", calibres: ["eta-c07-111", "eta-2836-2"], note: "Caliber 80 (famille Powermatic 80)." },
  { nom: "Certina", calibres: ["eta-c07-111", "eta-2824-2"], note: "" },
  { nom: "Longines", calibres: ["eta-2824-2", "eta-2892-a2"], note: "Calibres « L » = bases ETA ; relever le numéro L exact." },
  { nom: "Omega", calibres: ["eta-2892-a2", "omega-8500", "omega-861", "omega-321", "omega-3861", "lemania-5100"], note: "1120 = 2892-A2 ; co-axiaux à partir des années 2000." },
  { nom: "Rolex", calibres: ["rolex-3135", "rolex-3235", "rolex-1570", "rolex-3035", "rolex-3130", "rolex-3186", "rolex-4130", "valjoux-72"], note: "Calibres maison ; Daytona d'époque sur base Valjoux 72, puis 4130." },
  { nom: "Tudor", calibres: ["eta-2824-2", "eta-2892-a2", "tudor-mt5602"], note: "Bases ETA avant les calibres maison MT56xx." },
  { nom: "TAG Heuer", calibres: ["eta-2824-2", "sellita-sw200-1", "eta-7750", "sellita-sw500"], note: "Calibre 5 = 2824-2 / SW200-1 ; Calibre 16 = 7750." },
  { nom: "Breitling", calibres: ["eta-7750", "eta-2824-2"], note: "B13 = 7750 ; B17 = base 2824-2 ; B01 = maison." },
  { nom: "Oris", calibres: ["sellita-sw200-1", "sellita-sw220-1", "sellita-sw300-1"], note: "Calibres « Oris 7xx » = bases Sellita décorées." },
  { nom: "Sinn", calibres: ["sellita-sw200-1", "eta-2824-2", "eta-7750", "sellita-sw500", "lemania-5100"], note: "" },
  { nom: "Steinhart", calibres: ["eta-2824-2", "sellita-sw200-1", "eta-6498"], note: "" },
  { nom: "Panerai", calibres: ["eta-6497", "eta-6498"], note: "Anciens calibres OP = bases Unitas ; maison P.xxxx ensuite." },
  { nom: "Seiko", calibres: ["seiko-7s26", "seiko-nh36", "seiko-6r15", "seiko-6r35", "seiko-6309", "seiko-8l35", "seiko-6139", "seiko-nh34"], note: "Seiko 5 : 7S26 puis 4R36 ; Prospex : 6R15 / 6R35." },
  { nom: "Orient", calibres: ["orient-f6922", "orient-f6724", "orient-46943"], note: "Calibres maison." },
  { nom: "Citizen", calibres: ["miyota-8215", "miyota-9015", "citizen-8200"], note: "Miyota appartient à Citizen ; calibres Citizen propres aussi (8200…)." },
  { nom: "Invicta", calibres: ["seiko-nh35", "seiko-nh36", "miyota-8215"], note: "" },
  { nom: "Bulova", calibres: ["miyota-8215", "miyota-9015"], note: "" },
  { nom: "Vostok", calibres: ["vostok-2416b", "vostok-2409"], note: "" },
  { nom: "Zenith", calibres: ["zenith-el-primero-400"], note: "El Primero et ses dérivés." },
  { nom: "Heuer (vintage)", calibres: ["valjoux-72", "valjoux-7733"], note: "Chronographes manuels d'époque sur bases Valjoux." },
  { nom: "Tutima", calibres: ["lemania-5100", "eta-7750"], note: "" },
  { nom: "Poljot / Sturmanskie", calibres: ["poljot-3133"], note: "" },
  { nom: "Microbrands (Dan Henry, Baltic, Seagull…)", calibres: ["seiko-nh35", "miyota-9015", "sellita-sw200-1"], note: "Très souvent NH35A, Miyota 9015 ou SW200-1." }
];

/* Repères de fréquence : pas de trotteuse par seconde = A/h / 3600. */
var FREQUENCES = [
  { ah: 18000, hz: 2.5, pas: 5 },
  { ah: 19800, hz: 2.75, pas: 5.5 },
  { ah: 21600, hz: 3, pas: 6 },
  { ah: 25200, hz: 3.5, pas: 7 },
  { ah: 28800, hz: 4, pas: 8 },
  { ah: 36000, hz: 5, pas: 10 }
];

/* Lubrification générique d'un mouvement suisse à ancre (type 2824).
 * Les fiches fabricant priment TOUJOURS : ceci est un repère d'atelier. */
var LUBRIFICATION = [
  { groupe: "Barillet", lignes: [
    { piece: "Ressort de barillet neuf", produit: "Aucun", note: "Livré pré-lubrifié dans sa bague : le poser tel quel, ne pas le nettoyer." },
    { piece: "Paroi du barillet (automatique)", produit: "Graisse de freinage Moebius 8217", note: "Fine couche sur la paroi où glisse la bride : sans elle, la bride patine trop tôt ou pas assez." },
    { piece: "Ressort réutilisé (manuel)", produit: "Moebius 8200", note: "Fine couche sur les spires une fois propre." },
    { piece: "Arbre de barillet (portées)", produit: "Moebius HP-1300 ou D5", note: "Petite goutte dans les trous du barillet et du couvercle." }
  ]},
  { groupe: "Rouage", lignes: [
    { piece: "Roue de centre, roue moyenne (pivots)", produit: "Moebius HP-1300", note: "Goutte au fond de la noyure, côté platine et côté pont." },
    { piece: "Roue de seconde (pivots)", produit: "Moebius HP-1300 ou 9010", note: "Selon la fiche : 9010 si mobile rapide." },
    { piece: "Roue d'échappement (pivots)", produit: "Moebius 9010", note: "Mobile rapide : huile fluide, dose minimale." }
  ]},
  { groupe: "Échappement", lignes: [
    { piece: "Roue d'échappement + ancre", produit: "Épilame (Fixodrop) avant huilage", note: "L'épilame empêche l'huile de s'étaler. À refaire après chaque nettoyage." },
    { piece: "Levées de l'ancre (palettes)", produit: "Moebius 9415 (ou 941)", note: "Une micro-goutte sur la palette de sortie, puis faire tourner pour répartir sur plusieurs dents." },
    { piece: "Pivots de l'ancre", produit: "Rien ou 9010 très léger", note: "Selon la fiche : beaucoup de fabricants les laissent à sec." },
    { piece: "Échappement co-axial (Omega)", produit: "Selon fiche Omega", note: "Ne pas appliquer la règle des palettes classiques." }
  ]},
  { groupe: "Balancier", lignes: [
    { piece: "Pierres de contre-pivot (antichoc)", produit: "Moebius 9010", note: "Goutte sur la contre-pierre, pierre posée dessus : la goutte doit couvrir environ la moitié du diamètre, sans déborder." },
    { piece: "Spiral", produit: "JAMAIS d'huile", note: "Une trace d'huile colle les spires : la montre avance énormément." }
  ]},
  { groupe: "Remontoir et mise à l'heure", lignes: [
    { piece: "Tirette, bascule, ressort de bascule", produit: "Moebius 9504", note: "Graisse aux points de contact et d'articulation." },
    { piece: "Pignon coulant, pignon de remontoir", produit: "Moebius 9504", note: "Sur les dentures Breguet et sur la tige." },
    { piece: "Roue de couronne, rochet (dentures)", produit: "Moebius 9504", note: "" },
    { piece: "Roues d'inversion (2824, 3135…)", produit: "Aucun", note: "Ne pas huiler ; remplacer si elles patinent." },
    { piece: "Magic Lever (Seiko)", produit: "Selon fiche Seiko", note: "Contrôler l'usure des bras avant tout." }
  ]},
  { groupe: "Calendrier", lignes: [
    { piece: "Sautoirs, doigt de date", produit: "Moebius 9504 (léger)", note: "Points de contact seulement." },
    { piece: "Disque de date (portée)", produit: "Moebius 9010 très léger ou à sec", note: "Selon fiche." }
  ]},
  { groupe: "Boîte", lignes: [
    { piece: "Joints de fond, de couronne", produit: "Graisse silicone", note: "Joints neufs à chaque révision ; graisse en film mince." }
  ]}
];

/* Repères chronocomparateur.
 * Les seuils d'amplitude sont des repères d'atelier pour un mouvement à
 * ancre suisse en bon état, couronne remontée à fond, cadran haut. */
var REPERES = {
  amplitude: [
    { min: 315, libelle: "Trop haute", niveau: "alerte", texte: "Au-delà d'environ 315-320°, risque de rebattement (la cheville heurte l'extérieur des cornes de l'ancre). Vérifier le ressort et l'angle de levée réglé." },
    { min: 270, libelle: "Très bonne", niveau: "ok", texte: "Mouvement propre, huilé, ressort en forme." },
    { min: 250, libelle: "Bonne", niveau: "ok", texte: "" },
    { min: 220, libelle: "Moyenne", niveau: "attention", texte: "Acceptable sur un mouvement ancien ou japonais ; sur un suisse récent, une révision approche." },
    { min: 180, libelle: "Faible", niveau: "alerte", texte: "Révision à prévoir : huiles sèches, encrassement ou ressort fatigué." },
    { min: 0, libelle: "Très faible", niveau: "alerte", texte: "Risque d'arrêt. Chercher un frottement, un pivot abîmé ou un ressort cassé." }
  ],
  repere: [
    { max: 0.6, libelle: "Bon", niveau: "ok" },
    { max: 1.0, libelle: "Acceptable", niveau: "attention" },
    { max: 99, libelle: "À corriger", niveau: "alerte" }
  ],
  /* Repères ETA de réglage en usine (famille 2824-2), en s/j :
   * marche moyenne / écart maximal entre positions. */
  qualites: [
    { nom: "Standard", moyenne: "± 12", ecart: "30" },
    { nom: "Élaboré", moyenne: "± 7", ecart: "20" },
    { nom: "Top", moyenne: "± 4", ecart: "15" },
    { nom: "Chronomètre (COSC)", moyenne: "−4 / +6", ecart: "selon norme ISO 3159" }
  ]
};

var POSITIONS = [
  { id: "CH", nom: "Cadran haut" },
  { id: "CB", nom: "Cadran bas" },
  { id: "CouB", nom: "Couronne bas" },
  { id: "CouH", nom: "Couronne haut" },
  { id: "CouG", nom: "Couronne gauche" },
  { id: "CouD", nom: "Couronne droite" }
];

/* Diagnostic : symptôme -> causes probables, du plus fréquent au plus rare.
 * Chaque cause a un contrôle concret à faire. */
var DIAGNOSTICS = [
  { id: "avance", titre: "Avance de plusieurs minutes par jour", causes: [
    { cause: "Mouvement magnétisé", controle: "Poser une boussole près de la montre et la faire bouger : si l'aiguille de la boussole dévie, démagnétiser. Au chronocomparateur, le tracé est souvent « éclaté ». Première chose à vérifier, toujours.", frequence: "très fréquente" },
    { cause: "Spires du spiral collées (huile, choc)", controle: "À la loupe, balancier en marche : les spires doivent « respirer » sans se toucher. Nettoyer le balancier seul si une trace d'huile est visible.", frequence: "fréquente" },
    { cause: "Spiral déformé ou sorti de la raquette", controle: "Vérifier que le spiral passe entre les goupilles de raquette et reste plat et concentrique.", frequence: "occasionnelle" },
    { cause: "Raquette déplacée", controle: "Comparer la position de la raquette avec des photos d'avant intervention.", frequence: "occasionnelle" }
  ]},
  { id: "retard", titre: "Retard important", causes: [
    { cause: "Amplitude faible (huiles sèches, encrassement)", controle: "Mesurer l'amplitude cadran haut, remontée à fond. Sous ~220° sur un mouvement suisse : révision.", frequence: "très fréquente" },
    { cause: "Ressort de barillet fatigué", controle: "Amplitude qui chute fort entre plein remontage et après 24 h. Remplacer le ressort à la révision.", frequence: "fréquente" },
    { cause: "Balancier qui frotte", controle: "Écouter et observer : un frottement du balancier sur le pont ou le cadran donne une amplitude qui varie selon les positions.", frequence: "occasionnelle" }
  ]},
  { id: "arret", titre: "La montre s'arrête", causes: [
    { cause: "Pas remontée / remontage auto défaillant", controle: "Remonter à la main (si possible) : si elle repart et tient, chercher du côté du remontage automatique (roues d'inversion, Magic Lever, roulement de masse).", frequence: "très fréquente" },
    { cause: "Ressort de barillet cassé", controle: "La couronne tourne sans jamais offrir de résistance et sans bruit de cliquet. Ouvrir le barillet.", frequence: "fréquente" },
    { cause: "Pivot de balancier cassé", controle: "Le balancier bouge mal, penche ou touche. Observer à la loupe : un pivot cassé se voit, le balancier « danse ». Remplacer l'axe de balancier.", frequence: "occasionnelle" },
    { cause: "Encrassement extrême / huiles figées", controle: "Amplitude très faible en toutes positions, la montre repart en la secouant puis s'arrête.", frequence: "fréquente" }
  ]},
  { id: "arret-heure", titre: "S'arrête toujours à la même heure", causes: [
    { cause: "Aiguilles qui se touchent", controle: "Regarder de profil : l'aiguille des minutes ou la trotteuse frotte l'aiguille des heures, le cadran ou le verre. Corriger la hauteur des aiguilles.", frequence: "très fréquente" },
    { cause: "Mécanisme de date qui force (vers minuit)", controle: "Si l'arrêt a lieu entre 21 h et 1 h : contrôler le doigt de date, le sautoir, le disque.", frequence: "fréquente" }
  ]},
  { id: "positions", titre: "Grosses différences de marche selon les positions", causes: [
    { cause: "Pivots de balancier usés ou abîmés", controle: "Forte chute d'amplitude entre positions horizontales et verticales (plus de ~50°). Contrôler les pivots et les pierres.", frequence: "fréquente" },
    { cause: "Balancier mal équilibré (balourd)", controle: "Écarts entre positions verticales importants alors que les horizontales sont proches. Équilibrage = travail fin, à la potence ou à l'outil d'équilibrage.", frequence: "occasionnelle" },
    { cause: "Spiral non concentrique ou non plat", controle: "Observer le spiral de dessus et de profil pendant que le balancier oscille.", frequence: "occasionnelle" }
  ]},
  { id: "repere", titre: "Défaut de repère élevé (boiterie)", causes: [
    { cause: "Virole ou piton décalé", controle: "Au-delà de ~1 ms : sur un réglage Etachron, tourner le porte-piton ; sinon tourner la virole sur l'axe (balancier déposé). Petits pas, mesurer à chaque fois.", frequence: "très fréquente" }
  ]},
  { id: "remontage-auto", titre: "Le remontage automatique ne marche pas (ou mal)", causes: [
    { cause: "Roues d'inversion usées (2824, 3135…)", controle: "Masse déposée, tourner chaque roue d'inversion à la main : elle doit entraîner dans un sens et tourner libre dans l'autre. Sinon remplacer.", frequence: "très fréquente" },
    { cause: "Magic Lever usé (Seiko)", controle: "Observer les deux bras du cliquet : bouts arrondis ou déformés = remplacer.", frequence: "très fréquente" },
    { cause: "Roulement de masse oscillante usé", controle: "Jeu latéral de la masse, frottement sur le fond ou les ponts (traces brillantes, bruit de frottement).", frequence: "fréquente" },
    { cause: "Vis de masse desserrée", controle: "Resserrer la vis du roulement ; vérifier qu'elle ne frotte pas.", frequence: "occasionnelle" }
  ]},
  { id: "couronne-vide", titre: "La couronne tourne dans le vide", causes: [
    { cause: "Tige cassée ou dévissée de la couronne", controle: "Tirer la couronne : si elle vient sans résistance ou que la tige reste dans le mouvement, la tige est cassée ou dévissée.", frequence: "très fréquente" },
    { cause: "Tirette / pignon coulant", controle: "La couronne ne change plus de position correctement : contrôler la tirette, la bascule et leur ressort.", frequence: "fréquente" }
  ]},
  { id: "date", titre: "La date ne saute pas, ou à moitié", causes: [
    { cause: "Sautoir de date affaibli ou mal positionné", controle: "Le disque de date doit être tenu fermement entre deux dents.", frequence: "fréquente" },
    { cause: "Date changée pendant la zone interdite", controle: "Sur beaucoup de calibres, régler la date entre ~21 h et ~3 h abîme le mécanisme. Vérifier les dents du disque et le doigt.", frequence: "fréquente" }
  ]},
  { id: "condensation", titre: "Buée sous le verre", causes: [
    { cause: "Joint de fond, de couronne ou de verre défaillant", controle: "URGENT : ouvrir et sécher, sinon rouille sous 24-48 h. Changer les joints, tester l'étanchéité.", frequence: "très fréquente" },
    { cause: "Couronne vissée non vissée", controle: "Vérifier qu'elle se visse jusqu'au bout et que le tube n'est pas abîmé.", frequence: "fréquente" }
  ]}
];

/* Révision complète : étapes à cocher, dans l'ordre d'atelier. */
var PROCEDURE = [
  { groupe: "Avant d'ouvrir", etapes: [
    { id: "p-photo-boite", texte: "Photographier la montre fermée (cadran, fond, numéros)." },
    { id: "p-mesure-avant", texte: "Mesurer au chronocomparateur, remontée à fond, dans les 6 positions (onglet Mesures)." },
    { id: "p-magnet", texte: "Tester la magnétisation à la boussole ; démagnétiser si besoin et remesurer." },
    { id: "p-etanch-avant", texte: "Noter l'étanchéité annoncée et tester si possible." }
  ]},
  { groupe: "Démontage", etapes: [
    { id: "d-armer", texte: "Laisser désarmer le ressort (retenir le cliquet et laisser filer doucement à la couronne)." },
    { id: "d-emboitage", texte: "Retirer la tige (poussoir de tirette), sortir le mouvement, remettre la tige." },
    { id: "d-aiguilles", texte: "Déposer les aiguilles (protéger le cadran), puis le cadran. Photographier." },
    { id: "d-masse", texte: "Déposer la masse oscillante et le mécanisme automatique." },
    { id: "d-balancier", texte: "Déposer le coq et le balancier EN PREMIER parmi les organes réglants (ressort désarmé)." },
    { id: "d-ancre", texte: "Déposer le pont d'ancre et l'ancre." },
    { id: "d-rouage", texte: "Pont de rouage, rouage, puis pont de barillet et barillet. Photographier chaque vis avant dépose (plan des vis)." },
    { id: "d-remontoir", texte: "Côté cadran : calendrier, minuterie, mécanisme de remontoir et mise à l'heure." },
    { id: "d-barillet", texte: "Ouvrir le barillet, contrôler le ressort (le remplacer à chaque révision si possible)." }
  ]},
  { groupe: "Nettoyage et contrôle", etapes: [
    { id: "n-inspection", texte: "Inspecter à la loupe : pivots, dents, pierres fendues, traces d'usure." },
    { id: "n-nettoyage", texte: "Nettoyer les pièces (machine ou bains), balancier et pièces fragiles à part." },
    { id: "n-antichoc", texte: "Nettoyer les pierres de contre-pivot démontées des antichocs." },
    { id: "n-secher", texte: "Sécher, aucune trace : manipuler ensuite aux doigtiers / brucelles uniquement." },
    { id: "n-epilame", texte: "Épilamer roue d'échappement et ancre (si la fiche le demande)." }
  ]},
  { groupe: "Remontage et lubrification", etapes: [
    { id: "r-barillet", texte: "Barillet : ressort, graisse de freinage, arbre huilé, couvercle." },
    { id: "r-rouage", texte: "Rouage : vérifier que chaque mobile tourne librement AVANT huilage (souffler dessus, il doit tourner)." },
    { id: "r-huile-rouage", texte: "Huiler les pivots du rouage (voir onglet Huiles)." },
    { id: "r-ancre", texte: "Ancre et pont d'ancre ; contrôler les ébats." },
    { id: "r-huile-palettes", texte: "Huiler les palettes (micro-dose), répartir en faisant tourner." },
    { id: "r-balancier", texte: "Huiler les contre-pivots, reposer les antichocs, poser le balancier." },
    { id: "r-remontoir", texte: "Mécanisme de remontoir graissé, calendrier, minuterie." },
    { id: "r-auto", texte: "Mécanisme automatique et masse oscillante." }
  ]},
  { groupe: "Réglage", etapes: [
    { id: "g-mesure", texte: "Laisser tourner 30 min, puis mesurer dans les 6 positions." },
    { id: "g-repere", texte: "Corriger le défaut de repère (< 0,6 ms visé)." },
    { id: "g-marche", texte: "Régler la marche moyenne à la raquette (ou masselottes)." },
    { id: "g-24h", texte: "Remesurer après 24 h sans remontage (isochronisme)." }
  ]},
  { groupe: "Emboîtage et final", etapes: [
    { id: "e-cadran", texte: "Cadran, aiguilles (hauteurs et parallélisme contrôlés de profil), date réglée hors zone interdite." },
    { id: "e-joints", texte: "Joints neufs graissés, emboîtage, fond serré au bon couple." },
    { id: "e-etanch", texte: "Test d'étanchéité." },
    { id: "e-final", texte: "Contrôle final sur plusieurs jours ; noter les mesures « après » dans l'intervention." }
  ]}
];

var TYPES_INTERVENTION = [
  "Révision complète", "Réglage", "Remplacement de pièce", "Diagnostic",
  "Étanchéité / joints", "Verre", "Bracelet / boîte", "Autre"
];

var LIGNE_MM = 2.2558;
