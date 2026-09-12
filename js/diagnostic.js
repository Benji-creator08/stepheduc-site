/* ============================================================
   STEPH'EDUC — Mini-diagnostic d'orientation
   ------------------------------------------------------------
   Découpage volontairement linéaire, pour rester facile à modifier :

     1. DONNÉES      : dimensions, branches, questions et réponses
     2. SCORING      : chaque réponse alimente plusieurs dimensions
     3. INTERPRÉTATION : problème principal, secondaires, niveau
     4. RÉDACTION    : génération du texte à partir du profil
     5. AFFICHAGE    : parcours question par question

   Le moteur est une fonction pure, déterministe et testable depuis
   la console :

     StephDiag.runDiagnostic({
       age: 'adulte', focus: ['chiens'], frequence: 'quotidien',
       intensite: 3, deep: ['loin', 'laisse_only'], impact: 'bloquant',
       essaye: 'plusieurs', bases: ['positions'], objectif: 'chiens',
       particulier: ['longtemps']
     });

   Aucune réponse ne déclenche à elle seule un texte pré-écrit :
   le résultat naît de la combinaison des scores.
   ============================================================ */
(function (window, document) {
  'use strict';

  /* ==========================================================
     1. DONNÉES
     ========================================================== */

  /* Dimensions internes du profil. Une réponse peut en alimenter
     plusieurs à la fois — c'est ce qui permet de distinguer deux
     situations qui portent pourtant le même nom. */
  var DIMS = ['bases', 'laisse', 'rappel', 'reactivite', 'peur',
              'maison', 'solitude', 'socialisation', 'jeune', 'relation'];

  var DIM_LABEL = {
    bases:         "les apprentissages de base",
    laisse:        "la marche en laisse",
    rappel:        "le rappel",
    reactivite:    "les réactions envers les autres chiens",
    peur:          "les peurs et la confiance",
    maison:        "la vie à la maison",
    solitude:      "la gestion de la solitude",
    socialisation: "les rencontres et la socialisation",
    jeune:         "les bases du jeune chien",
    relation:      "la relation et la communication au quotidien"
  };

  /* Même libellé, contracté avec « de » — pour écrire « autour des
     apprentissages de base » et non « autour de les apprentissages ». */
  var DIM_OF = {
    bases:         "des apprentissages de base",
    laisse:        "de la marche en laisse",
    rappel:        "du rappel",
    reactivite:    "des réactions envers les autres chiens",
    peur:          "des peurs et de la confiance",
    maison:        "de la vie à la maison",
    solitude:      "de la gestion de la solitude",
    socialisation: "des rencontres et de la socialisation",
    jeune:         "des bases du jeune chien",
    relation:      "de la relation au quotidien"
  };

  var DIM_SHORT = {
    bases:         "Bases éducatives",
    laisse:        "Marche en laisse",
    rappel:        "Rappel",
    reactivite:    "Réactivité",
    peur:          "Peurs et confiance",
    maison:        "Vie à la maison",
    solitude:      "Solitude",
    socialisation: "Socialisation",
    jeune:         "Jeune chien",
    relation:      "Relation au quotidien"
  };

  /* Format de séance le plus logique selon la dimension dominante.
     Sert à orienter vers le domicile ou le terrain de Mareil-Marly. */
  var DIM_FORMAT = {
    bases: 'mixte', laisse: 'mixte', rappel: 'terrain', reactivite: 'terrain',
    peur: 'domicile', maison: 'domicile', solitude: 'domicile',
    socialisation: 'terrain', jeune: 'domicile', relation: 'domicile'
  };

  /* Branches du questionnaire : elles pilotent la formulation des
     questions 3, 4 et 5, et donc la finesse de l'analyse. */
  var BRANCHES = {
    chiens:   { dim: 'reactivite', label: "les réactions envers les autres chiens", sujet: "ces réactions" },
    peur:     { dim: 'peur',       label: "la peur ou l'anxiété",                   sujet: "ces peurs" },
    laisse:   { dim: 'laisse',     label: "les promenades en laisse",               sujet: "cette difficulté" },
    rappel:   { dim: 'rappel',     label: "le rappel",                              sujet: "ces difficultés de rappel" },
    maison:   { dim: 'maison',     label: "le comportement à la maison",            sujet: "ces difficultés" },
    solitude: { dim: 'solitude',   label: "les moments de solitude",                sujet: "cette difficulté" },
    general:  { dim: 'bases',      label: "l'éducation au quotidien",               sujet: "ces difficultés" }
  };

  /* Ordre de priorité : ce qui demande le plus de nuance passe devant. */
  var BRANCH_ORDER = ['chiens', 'peur', 'solitude', 'maison', 'rappel', 'laisse', 'general'];

  /* Quelle branche pour quel sujet de préoccupation ? */
  var FOCUS_BRANCH = {
    chiens: 'chiens', peur: 'peur', solitude: 'solitude', maison: 'maison',
    rappel: 'rappel', laisse: 'laisse', bases: 'general', chiot: 'general', autre: 'general'
  };

  /* ---------- Question 2 : ce qui préoccupe ---------- */
  var FOCUS_OPTIONS = [
    { v: 'laisse',   label: "Les promenades et la marche en laisse",   s: { laisse: 3, relation: 0.5 } },
    { v: 'rappel',   label: "Le rappel, quand il est détaché",          s: { rappel: 3, relation: 0.5 } },
    { v: 'chiens',   label: "Les réactions envers les autres chiens",   s: { reactivite: 3, socialisation: 2, laisse: 1 } },
    { v: 'peur',     label: "La peur ou l'anxiété",                     s: { peur: 3.5, socialisation: 1, relation: 0.5 } },
    { v: 'maison',   label: "Le comportement à la maison",              s: { maison: 3, relation: 1 } },
    { v: 'solitude', label: "La solitude, les moments d'absence",       s: { solitude: 3.5, maison: 1 } },
    { v: 'bases',    label: "L'éducation générale, les bases",          s: { bases: 3, relation: 1 } },
    { v: 'chiot',    label: "L'arrivée d'un chiot ou d'un jeune chien", s: { jeune: 3, bases: 2, socialisation: 1 } },
    { v: 'autre',    label: "Autre chose, ou je ne sais pas trop",      s: { relation: 2, bases: 1 } }
  ];

  /* ---------- Question 4 : intensité, formulée par branche ----------
     Le niveau (0 à 4) intègre volontairement la capacité de récupération :
     « se calme une fois passé » et « met du temps à redescendre » ne
     décrivent pas du tout la même situation. */
  var INTENSITE = {
    chiens: [
      { v: 0, label: "Il les remarque, mais reste tout à fait gérable",                         frag: "il reste gérable" },
      { v: 1, label: "Il se tend, fixe un instant, puis repart sans insister",                  frag: "il se tend brièvement avant de repartir" },
      { v: 2, label: "Il aboie ou tire fort, puis se calme une fois le chien passé",            frag: "il aboie ou tire fort avant de se calmer" },
      { v: 3, label: "Il devient très difficile à retenir et met du temps à redescendre",       frag: "il devient très difficile à retenir et met du temps à redescendre" },
      { v: 4, label: "Il se met dans un état extrême (grognements, pincements, plus rien ne passe)", frag: "il atteint un état où plus rien ne passe", f: ['contact'] }
    ],
    peur: [
      { v: 0, label: "Il est prudent, puis revient explorer de lui-même",                       frag: "il reste prudent mais revient de lui-même" },
      { v: 1, label: "Il se fige un court instant, puis repart",                                frag: "il se fige un instant avant de repartir" },
      { v: 2, label: "Il recule ou tire pour partir, mais récupère après quelques minutes",     frag: "il cherche à s'éloigner puis récupère" },
      { v: 3, label: "Il tremble, refuse d'avancer et reste tendu longtemps",                   frag: "il reste tendu longtemps après coup" },
      { v: 4, label: "Il panique, cherche à fuir et ne m'entend plus du tout",                  frag: "il panique et ne vous entend plus", f: ['panique'] }
    ],
    laisse: [
      { v: 0, label: "Il tire un peu au départ, puis marche correctement",                      frag: "cela se limite au début de la promenade" },
      { v: 1, label: "Il tire dès qu'il y a quelque chose d'intéressant",                       frag: "il tire dès qu'un élément l'attire" },
      { v: 2, label: "Il tire une bonne partie de la promenade",                                frag: "il tire une bonne partie du trajet" },
      { v: 3, label: "Il tire fort en permanence, la promenade est physique",                   frag: "la promenade est devenue physique" },
      { v: 4, label: "Il tire au point que je ne peux plus le tenir en sécurité",               frag: "vous ne parvenez plus à le tenir en sécurité", f: ['securite'] }
    ],
    rappel: [
      { v: 0, label: "Il revient presque toujours, sauf rare exception",                        frag: "il revient presque toujours" },
      { v: 1, label: "Il revient, mais prend son temps",                                        frag: "il revient en prenant son temps" },
      { v: 2, label: "Il revient seulement s'il n'y a pas de distraction",                      frag: "la moindre distraction suffit à le faire échouer" },
      { v: 3, label: "Il ne revient qu'une fois qu'il a terminé ce qu'il faisait",              frag: "il ne revient qu'une fois sa propre activité terminée" },
      { v: 4, label: "Il ne revient pas, et j'ai déjà eu peur pour sa sécurité",                frag: "sa sécurité a déjà été en jeu", f: ['securite'] }
    ],
    maison: [
      { v: 0, label: "C'est ponctuel et sans réelle conséquence",                               frag: "cela reste ponctuel" },
      { v: 1, label: "C'est gênant, mais nous gérons",                                          frag: "cela reste gérable" },
      { v: 2, label: "Cela se reproduit souvent, malgré ce que nous mettons en place",          frag: "cela se reproduit malgré vos efforts" },
      { v: 3, label: "C'est difficile à vivre au quotidien",                                    frag: "c'est devenu difficile à vivre au quotidien" },
      { v: 4, label: "La situation devient très lourde (dégâts, tensions, voisinage)",          frag: "la situation est devenue très lourde", f: ['lourd'] }
    ],
    solitude: [
      { v: 0, label: "Il s'installe et attend tranquillement",                                  frag: "il attend tranquillement" },
      { v: 1, label: "Il s'agite un moment, puis se calme",                                     frag: "il s'agite puis finit par se calmer" },
      { v: 2, label: "Il aboie ou s'occupe autrement pendant un long moment",                   frag: "l'agitation dure longtemps" },
      { v: 3, label: "Il ne se calme pas vraiment de toute mon absence",                        frag: "il ne redescend pas de toute votre absence" },
      { v: 4, label: "Il panique (hurlements, destructions, il pourrait se blesser)",           frag: "il bascule dans la panique", f: ['panique'] }
    ],
    general: [
      { v: 0, label: "Il apprend vite, c'est surtout par anticipation",                         frag: "il apprend vite" },
      { v: 1, label: "Il comprend à la maison, beaucoup moins dehors",                          frag: "ce qui est acquis à la maison ne tient pas dehors" },
      { v: 2, label: "Il faut souvent répéter, l'excitation prend le dessus",                   frag: "l'excitation prend souvent le dessus" },
      { v: 3, label: "Il n'écoute presque plus dès qu'il se passe quelque chose",               frag: "il décroche dès qu'il se passe quelque chose" },
      { v: 4, label: "Je me sens dépassé(e), je ne sais plus comment m'y prendre",              frag: "vous vous sentez dépassé(e)", f: ['depasse'] }
    ]
  };

  /* ---------- Question 5 : le détail, entièrement dépendant de la branche ----------
     C'est ici que deux « réactivités » deviennent deux situations
     différentes : distance de déclenchement, laisse ou liberté, etc. */
  var DEEP = {
    chiens: {
      question: "Qu'est-ce qui décrit le mieux ces réactions ?",
      lead: "Dans le détail, vous décrivez ",
      options: [
        { v: 'laisse_only', label: "Surtout lorsqu'il est tenu en laisse",              s: { reactivite: 1, laisse: 1.5 },                 frag: "des réactions surtout lorsqu'il est tenu en laisse" },
        { v: 'libre',       label: "Aussi lorsqu'il est détaché",                       s: { reactivite: 1.5, rappel: 1.5 }, p: 1,         frag: "des réactions y compris lorsqu'il est détaché" },
        { v: 'loin',        label: "Il réagit déjà quand l'autre chien est encore loin", s: { reactivite: 2.5 }, p: 1.5, c: 1,             frag: "une réactivité qui se déclenche déjà à bonne distance" },
        { v: 'proche',      label: "Seulement quand l'autre chien est tout près",        s: { reactivite: 0.8, socialisation: 0.5 },       frag: "des réactions uniquement de très près" },
        { v: 'certains',    label: "Avec certains chiens seulement",                     s: { socialisation: 1.5 },                        frag: "des différences nettes selon les chiens rencontrés" },
        { v: 'etroit',      label: "Dans les passages étroits, quand on ne peut pas s'écarter", s: { reactivite: 1 }, c: 0.5,              frag: "une gêne marquée dans les passages étroits" },
        { v: 'partout',     label: "Dans presque toutes les situations",                 s: { reactivite: 2 }, p: 1.5, c: 1.5,             frag: "une réactivité présente dans presque toutes les situations" }
      ]
    },
    peur: {
      question: "Qu'est-ce qui déclenche principalement ces peurs ?",
      lead: "Vous identifiez surtout ",
      options: [
        { v: 'inconnus', label: "Les personnes inconnues",                      s: { peur: 2, socialisation: 1.5 },            frag: "une peur des personnes inconnues" },
        { v: 'enfants',  label: "Les enfants",                                  s: { peur: 1.5, socialisation: 1 }, c: 0.5, p: 0.5, frag: "une peur des enfants" },
        { v: 'bruits',   label: "Les bruits soudains, les détonations",         s: { peur: 2 },                                frag: "une sensibilité aux bruits soudains" },
        { v: 'transport',label: "La voiture, les transports",                   s: { peur: 1.5, maison: 0.5 },                 frag: "une appréhension des trajets" },
        { v: 'lieux',    label: "Les lieux nouveaux, la ville, les magasins",   s: { peur: 2, socialisation: 1 },              frag: "une difficulté dans les environnements nouveaux" },
        { v: 'chiens_p', label: "Les autres chiens",                            s: { peur: 1.5, reactivite: 1.5, socialisation: 1 }, frag: "une peur des autres chiens" },
        { v: 'sonne',    label: "À la maison : la sonnette, les visites",       s: { peur: 1.5, maison: 1.5 },                 frag: "une tension à la maison lors des visites" },
        { v: 'tout',     label: "Presque tout ce qui sort de son quotidien",    s: { peur: 3 }, c: 2, p: 1.5,                  frag: "une appréhension de presque tout ce qui sort de son quotidien" }
      ]
    },
    laisse: {
      question: "Comment cela se passe-t-il concrètement en promenade ?",
      lead: "Dans le détail, vous décrivez ",
      options: [
        { v: 'continu',  label: "Il tire du début à la fin",                          s: { laisse: 2 },                        frag: "une traction continue du début à la fin" },
        { v: 'odeurs',   label: "Il tire dès qu'il y a une odeur à explorer",         s: { laisse: 1, relation: 1 },           frag: "une traction déclenchée par les odeurs" },
        { v: 'chiens_l', label: "Il tire surtout vers les autres chiens",             s: { laisse: 1, reactivite: 1.5, socialisation: 1 }, frag: "une traction dirigée vers les autres chiens" },
        { v: 'gens',     label: "Il se précipite vers les gens",                      s: { laisse: 1, socialisation: 1, relation: 0.5 }, frag: "des élans vers les personnes croisées" },
        { v: 'force',    label: "Il est physiquement difficile à tenir",              s: { laisse: 2 }, p: 1, c: 0.5,          frag: "une force difficile à contenir" },
        { v: 'agace',    label: "Il s'agace quand on le retient",                     s: { laisse: 1, reactivite: 1.5 }, c: 1, p: 1, frag: "de l'agacement lorsque vous le retenez" },
        { v: 'famille',  label: "Certaines personnes du foyer ne peuvent plus le promener", s: { laisse: 1.5, relation: 1 }, p: 1.5, c: 1, frag: "des promenades devenues impossibles pour une partie du foyer" }
      ]
    },
    rappel: {
      question: "Dans quelles situations le rappel échoue-t-il ?",
      lead: "Vous évoquez ",
      options: [
        { v: 'chiens_r', label: "Quand il y a d'autres chiens",                  s: { rappel: 1.5, socialisation: 1 },        frag: "des échecs dès qu'un autre chien est présent" },
        { v: 'piste',    label: "Quand il suit une odeur ou une piste",          s: { rappel: 1.5 },                          frag: "un décrochage dès qu'il suit une piste" },
        { v: 'nouveau',  label: "Dans les endroits qu'il ne connaît pas",        s: { rappel: 1.5, bases: 0.5 },              frag: "des difficultés dans les lieux inconnus" },
        { v: 'toujours', label: "Dès qu'il est détaché, quel que soit l'endroit", s: { rappel: 2.5, bases: 1 }, p: 1,          frag: "un rappel qui ne tient nulle part" },
        { v: 'lent',     label: "Il revient, mais très lentement",               s: { rappel: 1, relation: 1 },               frag: "un retour très lent" },
        { v: 'route',    label: "Il s'éloigne beaucoup, parfois vers une route", s: { rappel: 2.5 }, p: 3, c: 1, f: ['securite'], frag: "des éloignements importants, parfois près d'une route" },
        { v: 'plus_ose', label: "Je n'ose plus le détacher",                     s: { rappel: 2, relation: 1 }, p: 1,         frag: "une liberté que vous ne lui accordez plus" }
      ]
    },
    maison: {
      question: "Que se passe-t-il concrètement à la maison ?",
      lead: "Concrètement, vous évoquez ",
      options: [
        { v: 'destruction', label: "Des destructions",                             s: { maison: 2, solitude: 1 },             frag: "des destructions" },
        { v: 'aboiements',  label: "Des aboiements",                               s: { maison: 2 }, p: 0.5,                  frag: "des aboiements" },
        { v: 'vol',         label: "Il vole, fouille, s'empare des objets",        s: { maison: 1.5, relation: 1 },           frag: "des objets régulièrement subtilisés" },
        { v: 'excitation',  label: "Il est très excité, ne se pose jamais",        s: { maison: 2, relation: 1.5, bases: 1 }, frag: "une excitation permanente" },
        { v: 'proprete',    label: "La propreté n'est pas acquise",                s: { maison: 1.5, bases: 1 },              frag: "une propreté encore incertaine" },
        { v: 'saute',       label: "Il saute sur les personnes qui arrivent",      s: { maison: 1.5, socialisation: 1, bases: 1 }, frag: "des sauts sur les visiteurs" },
        { v: 'regles',      label: "Les règles ne sont pas les mêmes pour tout le monde", s: { relation: 2, bases: 1.5 }, c: 1, frag: "des règles qui varient d'une personne à l'autre" },
        { v: 'tension',     label: "Des tensions avec un autre animal du foyer",   s: { maison: 1.5, socialisation: 1.5 }, c: 1.5, p: 1, frag: "des tensions avec un autre animal du foyer" }
      ]
    },
    solitude: {
      question: "Que se passe-t-il pendant vos absences ?",
      lead: "Pendant vos absences, vous constatez ",
      options: [
        { v: 'aboie',    label: "Il aboie ou hurle",                              s: { solitude: 2, maison: 1 }, p: 1,        frag: "des aboiements ou des hurlements" },
        { v: 'detruit',  label: "Il détruit",                                     s: { solitude: 2, maison: 1.5 },            frag: "des destructions" },
        { v: 'salit',    label: "Il fait ses besoins à l'intérieur",              s: { solitude: 1.5, maison: 1 },            frag: "des accidents de propreté" },
        { v: 'depart',   label: "Il s'angoisse déjà quand je me prépare à partir", s: { solitude: 2.5, peur: 1.5 }, c: 1, p: 1, frag: "une angoisse qui démarre dès les préparatifs" },
        { v: 'apres',    label: "Il s'agite au début puis se calme",              s: { solitude: 0.8 },                       frag: "une agitation qui finit par retomber" },
        { v: 'inconnu',  label: "Je ne sais pas vraiment ce qu'il fait",          s: { solitude: 1 }, c: 0.5,                 frag: "une part d'inconnu sur ce qui se passe réellement" },
        { v: 'voisins',  label: "Le voisinage s'en est plaint",                   s: { solitude: 1.5 }, p: 2, c: 1,           frag: "des plaintes du voisinage" }
      ]
    },
    general: {
      question: "Qu'est-ce qui vous demande le plus d'énergie aujourd'hui ?",
      lead: "Vous évoquez surtout ",
      options: [
        { v: 'mordille',   label: "Les mordillements",                            s: { jeune: 1.5, bases: 1 },                frag: "des mordillements" },
        { v: 'proprete_g', label: "La propreté",                                  s: { bases: 1.5, maison: 1 },               frag: "un apprentissage de la propreté en cours" },
        { v: 'excitation_g', label: "L'excitation, le retour au calme",           s: { bases: 1.5, relation: 1, maison: 1 },  frag: "des difficultés à revenir au calme" },
        { v: 'saute_g',    label: "Il saute sur les gens",                        s: { bases: 1, socialisation: 1 },          frag: "des sauts sur les personnes" },
        { v: 'dehors',     label: "Il écoute à la maison, beaucoup moins dehors", s: { bases: 2, relation: 1, rappel: 1 },    frag: "une écoute qui s'évapore dès qu'on sort" },
        { v: 'nuits',      label: "Les nuits, les moments où il doit rester seul", s: { jeune: 1, maison: 1.5, solitude: 1 }, frag: "des moments de calme et de solitude compliqués" },
        { v: 'socia_g',    label: "Je ne sais pas comment bien le socialiser",    s: { socialisation: 2, jeune: 1 },          frag: "des questions sur sa socialisation" },
        { v: 'demarrer',   label: "Rien de grave : je veux surtout bien démarrer", s: { bases: 1, relation: 0.5 },            frag: "une envie de bien faire dès le départ" }
      ]
    }
  };

  /* ---------- Questions communes ---------- */
  var AGE_OPTIONS = [
    { v: 'chiot',  label: "Moins de 6 mois",   s: { jeune: 4, socialisation: 1.5 }, p: 0.5, c: -0.5,
      frag: "Votre chien a moins de 6 mois : tout ce qui se met en place maintenant comptera longtemps." },
    { v: 'ado',    label: "6 à 12 mois",       s: { jeune: 2.5, bases: 0.5 }, c: 0.5,
      frag: "Votre chien a entre 6 et 12 mois, l'âge où l'on a souvent l'impression que tout régresse d'un coup." },
    { v: 'adulte', label: "1 à 3 ans",         s: { relation: 0.5 },
      frag: "Votre chien a entre 1 et 3 ans : ses habitudes sont prises, mais restent tout à fait modifiables." },
    { v: 'mature', label: "4 à 7 ans",         s: {}, c: 0.5,
      frag: "Votre chien a entre 4 et 7 ans : ses habitudes sont bien installées, ce qui demande de la régularité plutôt que de la nouveauté." },
    { v: 'senior', label: "8 ans et plus",     s: {}, c: 0.5,
      frag: "Votre chien a 8 ans ou plus : à cet âge, on avance en douceur, en tenant compte de son confort." }
  ];

  var FREQUENCE_OPTIONS = [
    { v: 0, label: "Rarement, c'est vraiment ponctuel",             frag: "de façon ponctuelle" },
    { v: 1, label: "De temps en temps",                             frag: "de temps en temps" },
    { v: 2, label: "Plusieurs fois par semaine",                    frag: "plusieurs fois par semaine" },
    { v: 3, label: "Presque tous les jours",                        frag: "presque tous les jours" },
    { v: 4, label: "À chaque fois que la situation se présente",    frag: "systématiquement, dès que la situation se présente" }
  ];

  var IMPACT_OPTIONS = [
    { v: 0, label: "Peu d'impact, cela reste anecdotique",              frag: "sans réellement peser sur votre quotidien" },
    { v: 1, label: "Parfois contraignant",                              frag: "avec une gêne ponctuelle" },
    { v: 2, label: "Régulièrement difficile à gérer",                   frag: "avec une gêne régulière" },
    { v: 3, label: "Très contraignant au quotidien",                    frag: "au point de peser lourdement sur votre quotidien" },
    { v: 4, label: "Cela m'empêche de faire certaines choses normalement", frag: "au point de vous empêcher de faire certaines choses normalement" }
  ];

  var ESSAYE_OPTIONS = [
    { v: 'rien',     label: "Rien de particulier pour l'instant",                  frag: "Vous n'avez pas encore mis en place de travail spécifique" },
    { v: 'internet', label: "Des conseils trouvés en ligne ou en vidéo",           c: 0.5, s: { relation: 0.5 }, frag: "Vous vous êtes appuyé(e) sur des conseils trouvés en ligne" },
    { v: 'perso',    label: "Un travail personnel régulier",                       c: 0.5, f: ['implique'], frag: "Vous travaillez déjà régulièrement de votre côté" },
    { v: 'cours',    label: "Des cours d'éducation",                               c: 1, f: ['deja_travaille'], frag: "Vous avez déjà suivi des cours d'éducation" },
    { v: 'plusieurs',label: "Plusieurs méthodes, sans résultat satisfaisant",      c: 2.5, p: 1, f: ['stagnation'], frag: "Vous avez essayé plusieurs approches sans résultat durable" },
    { v: 'pro',      label: "Un accompagnement par un professionnel",              c: 1.5, f: ['deja_pro'], frag: "Vous avez déjà été accompagné(e) par un professionnel" }
  ];

  /* Question 8 : ce qui est DÉJÀ acquis. Le scoring porte sur ce qui
     manque — d'où le tableau de correspondance ci-dessous. */
  var BASES_OPTIONS = [
    { v: 'attention',   label: "Il est attentif à moi" },
    { v: 'laisse_ok',   label: "Il marche correctement en laisse" },
    { v: 'rappel_ok',   label: "Il revient quand je l'appelle" },
    { v: 'positions',   label: "Assis, couché, pas bouger" },
    { v: 'distractions',label: "Il écoute même avec des distractions" },
    { v: 'calme',       label: "Il sait se poser et rester calme" },
    { v: 'rien',        label: "Rien n'est vraiment acquis pour l'instant", exclusive: true }
  ];

  var BASES_MISSING = {
    attention:    { relation: 1.2, bases: 0.8 },
    laisse_ok:    { laisse: 1.2 },
    rappel_ok:    { rappel: 1.2 },
    positions:    { bases: 1 },
    distractions: { bases: 1, relation: 0.8 },
    calme:        { maison: 1, relation: 0.8 }
  };

  var OBJECTIF_OPTIONS = [
    { v: 'promenades', label: "Des promenades plus sereines",              s: { laisse: 1.5, relation: 0.5 },  frag: "des promenades plus sereines" },
    { v: 'rappel',     label: "Un rappel fiable",                          s: { rappel: 1.5 },                 frag: "un rappel sur lequel vous pouvez compter" },
    { v: 'chiens',     label: "Croiser les autres chiens plus facilement", s: { reactivite: 1.5, socialisation: 1 }, frag: "des croisements plus simples" },
    { v: 'peurs',      label: "Réduire ses peurs",                         s: { peur: 1.5 },                   frag: "un chien moins inquiet" },
    { v: 'maison',     label: "Améliorer la vie à la maison",              s: { maison: 1.5 },                 frag: "une vie à la maison plus paisible" },
    { v: 'comprendre', label: "Mieux comprendre mon chien",                s: { relation: 2 },                 frag: "mieux comprendre votre chien" },
    { v: 'bases',      label: "Acquérir les bases d'éducation",            s: { bases: 1.5 },                  frag: "des bases solides" },
    { v: 'chiot',      label: "Bien démarrer avec un chiot",               s: { jeune: 1.5, bases: 1 },        frag: "un départ réussi" },
    { v: 'serein',     label: "Retrouver une relation plus sereine",       s: { relation: 2 }, p: 0.5,         frag: "une relation plus sereine" }
  ];

  var PARTICULIER_OPTIONS = [
    { v: 'adoption',  label: "Il est arrivé chez nous il y a moins de 3 mois", s: { relation: 1.5, jeune: 0.5 }, c: 0.5, f: ['adoption'],
      frag: "il vient tout juste d'arriver chez vous" },
    { v: 'changement',label: "Un changement récent (déménagement, rythme, foyer)", s: { maison: 1 }, c: 1, p: 0.5,
      frag: "un changement récent est venu bousculer ses repères" },
    { v: 'animal',    label: "L'arrivée d'un autre animal",                  s: { socialisation: 1, maison: 1 }, c: 0.5,
      frag: "un autre animal est arrivé dans le foyer" },
    { v: 'enfant',    label: "L'arrivée d'un enfant",                        s: { maison: 1 }, c: 1, p: 1,
      frag: "l'arrivée d'un enfant a modifié l'équilibre de la maison" },
    { v: 'recent',    label: "Un comportement apparu ou aggravé récemment",  c: 1.5, p: 1.5, f: ['changement'],
      frag: "le comportement est apparu ou s'est aggravé récemment" },
    { v: 'longtemps', label: "La difficulté est présente depuis longtemps",  c: 2, p: 0.5, f: ['installe'],
      frag: "la situation dure depuis longtemps" },
    { v: 'rien',      label: "Rien de particulier", exclusive: true }
  ];

  /* ---------- Le questionnaire : 10 étapes ----------
     text / hint / options sont des fonctions des réponses déjà
     données : c'est ce qui rend le parcours adaptatif. */
  var QUESTIONS = [
    {
      id: 'age', type: 'single',
      text: function () { return "Quel âge a votre chien ?"; },
      hint: function () { return "À difficulté égale, l'âge change complètement la lecture de la situation."; },
      options: function () { return AGE_OPTIONS; }
    },
    {
      id: 'focus', type: 'multi', max: 3,
      text: function () { return "Qu'est-ce qui vous préoccupe le plus aujourd'hui ?"; },
      hint: function () { return "Plusieurs réponses possibles (3 au maximum)."; },
      options: function () { return FOCUS_OPTIONS; }
    },
    {
      id: 'frequence', type: 'single',
      text: function (a) { return "À quelle fréquence rencontrez-vous " + branchOf(a).label + " ?"; },
      hint: function () { return "La fréquence pèse autant que la difficulté elle-même."; },
      options: function () { return FREQUENCE_OPTIONS; }
    },
    {
      id: 'intensite', type: 'single',
      text: function (a) { return "Concrètement, que fait votre chien dans ces moments-là ?"; },
      hint: function (a) { return "Choisissez la description la plus proche de " + branchOf(a).sujet + "."; },
      options: function (a) { return INTENSITE[branchOf(a).key]; }
    },
    {
      id: 'deep', type: 'multi', max: 3,
      text: function (a) { return DEEP[branchOf(a).key].question; },
      hint: function () { return "Plusieurs réponses possibles (3 au maximum)."; },
      options: function (a) { return DEEP[branchOf(a).key].options; }
    },
    {
      id: 'impact', type: 'single',
      text: function () { return "À quel point cela pèse-t-il sur votre quotidien ?"; },
      hint: function () { return "Une même difficulté ne se vit pas de la même façon d'un foyer à l'autre."; },
      options: function () { return IMPACT_OPTIONS; }
    },
    {
      id: 'essaye', type: 'single',
      text: function () { return "Qu'avez-vous déjà essayé ?"; },
      hint: function () { return "Aucune mauvaise réponse : cela aide simplement à savoir d'où l'on part."; },
      options: function () { return ESSAYE_OPTIONS; }
    },
    {
      id: 'bases', type: 'multi', max: 6,
      text: function () { return "Parmi ces apprentissages, lesquels sont déjà bien acquis ?"; },
      hint: function () { return "Cochez tout ce qui est acquis — ou la dernière réponse si ce n'est pas encore le cas."; },
      options: function () { return BASES_OPTIONS; }
    },
    {
      id: 'objectif', type: 'single',
      text: function () { return "Qu'aimeriez-vous obtenir en priorité ?"; },
      hint: function () { return "Votre objectif oriente l'ordre dans lequel on travaille."; },
      options: function () { return OBJECTIF_OPTIONS; }
    },
    {
      id: 'particulier', type: 'multi', max: 3,
      text: function () { return "Un dernier point : y a-t-il un élément de contexte à connaître ?"; },
      hint: function () { return "Plusieurs réponses possibles."; },
      options: function () { return PARTICULIER_OPTIONS; }
    }
  ];

  /* ==========================================================
     2. SCORING
     ========================================================== */

  function branchOf(answers) {
    var focus = toArray(answers && answers.focus);
    var keys = [];
    focus.forEach(function (f) {
      var b = FOCUS_BRANCH[f];
      if (b && keys.indexOf(b) === -1) keys.push(b);
    });
    var key = 'general';
    for (var i = 0; i < BRANCH_ORDER.length; i++) {
      if (keys.indexOf(BRANCH_ORDER[i]) !== -1) { key = BRANCH_ORDER[i]; break; }
    }
    var branch = BRANCHES[key];
    return { key: key, dim: branch.dim, label: branch.label, sujet: branch.sujet };
  }

  function toArray(v) {
    if (v === undefined || v === null) return [];
    return Array.isArray(v) ? v.slice() : [v];
  }

  function findOption(list, v) {
    for (var i = 0; i < list.length; i++) if (String(list[i].v) === String(v)) return list[i];
    return null;
  }

  /* Applique les scores d'une option au profil, avec un coefficient
     éventuel (utilisé pour atténuer certaines réponses selon l'âge). */
  function applyOption(profile, option, weight) {
    if (!option) return;
    var w = (weight === undefined) ? 1 : weight;
    if (option.s) {
      Object.keys(option.s).forEach(function (dim) {
        profile.dims[dim] = (profile.dims[dim] || 0) + option.s[dim] * w;
      });
    }
    if (option.p) profile.priorite += option.p * w;
    if (option.c) profile.complexite += option.c * w;
    if (option.f) option.f.forEach(function (flag) { profile.flags[flag] = true; });
  }

  function computeProfile(answers) {
    var profile = { dims: {}, priorite: 0, complexite: 0, flags: {} };
    DIMS.forEach(function (d) { profile.dims[d] = 0; });

    var branch = branchOf(answers);
    profile.branch = branch;

    /* --- Âge : il modifie la lecture de tout le reste --- */
    var age = findOption(AGE_OPTIONS, answers.age) || AGE_OPTIONS[2];
    profile.age = age;
    applyOption(profile, age);

    /* --- Sujets de préoccupation --- */
    var focus = toArray(answers.focus);
    focus.forEach(function (f) { applyOption(profile, findOption(FOCUS_OPTIONS, f)); });
    profile.focusCount = focus.length;
    if (focus.length > 1) {
      profile.complexite += (focus.length - 1) * 0.9;
      profile.dims.relation += (focus.length - 1) * 0.6;
    }

    /* --- Fréquence : elle pousse surtout la priorité --- */
    var freq = findOption(FREQUENCE_OPTIONS, answers.frequence);
    var freqLvl = freq ? Number(freq.v) : 1;
    profile.freq = freq;
    profile.freqLvl = freqLvl;
    profile.priorite += freqLvl * 1.2;
    profile.dims[branch.dim] += freqLvl * 0.7;
    if (freqLvl >= 3) profile.complexite += 0.5;

    /* --- Intensité : le facteur le plus lourd --- */
    var intens = findOption(INTENSITE[branch.key], answers.intensite);
    var intensLvl = intens ? Number(intens.v) : 1;
    profile.intens = intens;
    profile.intensLvl = intensLvl;
    profile.dims[branch.dim] += intensLvl * 1.6;
    profile.priorite += intensLvl * 1.3;
    profile.complexite += intensLvl * 0.6;
    if (intens && intens.f) intens.f.forEach(function (f) { profile.flags[f] = true; });

    /* --- Détail de la situation --- */
    var deepDef = DEEP[branch.key];
    var deepSelected = [];
    toArray(answers.deep).forEach(function (v) {
      var o = findOption(deepDef.options, v);
      if (o) { deepSelected.push(o); applyOption(profile, o); }
    });
    profile.deep = deepSelected;
    profile.deepLead = deepDef.lead;
    if (deepSelected.length >= 3) profile.complexite += 0.5;

    /* --- Impact quotidien : il tire le niveau d'accompagnement --- */
    var impact = findOption(IMPACT_OPTIONS, answers.impact);
    var impactLvl = impact ? Number(impact.v) : 1;
    profile.impact = impact;
    profile.impactLvl = impactLvl;
    profile.priorite += impactLvl * 1.5;
    profile.complexite += impactLvl * 0.4;

    /* --- Ce qui a déjà été tenté --- */
    var essaye = findOption(ESSAYE_OPTIONS, answers.essaye);
    profile.essaye = essaye;
    applyOption(profile, essaye);

    /* --- Bases : on score ce qui manque --- */
    var acquis = toArray(answers.bases);
    var rien = acquis.indexOf('rien') !== -1;
    var missing = [];
    Object.keys(BASES_MISSING).forEach(function (key) {
      if (rien || acquis.indexOf(key) === -1) {
        missing.push(key);
        var add = BASES_MISSING[key];
        Object.keys(add).forEach(function (dim) { profile.dims[dim] += add[dim]; });
      }
    });
    profile.missingBases = missing;
    profile.basesRien = rien;
    if (rien) { profile.dims.bases += 1.5; profile.complexite += 0.5; }
    if (missing.length === 0) { profile.complexite -= 1; profile.flags.bases_ok = true; }

    /* --- Objectif : il ne crée pas la difficulté, il l'oriente --- */
    var objectif = findOption(OBJECTIF_OPTIONS, answers.objectif);
    profile.objectif = objectif;
    applyOption(profile, objectif);

    /* --- Contexte particulier --- */
    var particulier = [];
    toArray(answers.particulier).forEach(function (v) {
      if (v === 'rien') return;
      var o = findOption(PARTICULIER_OPTIONS, v);
      if (o) { particulier.push(o); applyOption(profile, o); }
    });
    profile.particulier = particulier;

    /* --- Relectures croisées : le même comportement ne se lit pas
       de la même façon selon l'âge et l'histoire du chien --- */
    if (age.v === 'chiot' || age.v === 'ado') {
      /* Chez un jeune chien, réactivité et peurs relèvent d'abord de la
         socialisation et des apprentissages en cours. */
      profile.dims.socialisation += (profile.dims.reactivite + profile.dims.peur) * 0.25;
      profile.dims.jeune += 1;
      profile.complexite -= 0.5;
    }
    if (age.v === 'mature' || age.v === 'senior') {
      if (profile.flags.installe) profile.complexite += 1.5;
    }
    if (age.v === 'senior' && profile.flags.changement) {
      profile.flags.sante = true;
      profile.priorite += 1;
    }
    if (profile.flags.adoption) {
      profile.dims.relation += 1;
      profile.priorite += 0.5;
    }
    if (profile.flags.stagnation || profile.flags.deja_pro) {
      /* Une situation qui résiste au travail déjà fourni demande un
         regard plus global, pas une recette de plus. */
      profile.complexite += 1;
      profile.dims.relation += 0.8;
    }
    if (profile.flags.depasse) profile.priorite += 2;
    if (profile.flags.lourd) profile.priorite += 1.5;

    /* --- Garde-fous : les situations où l'on ne bricole pas --- */
    if (profile.flags.contact) profile.priorite = Math.max(profile.priorite, 14);
    if (profile.flags.securite) profile.priorite = Math.max(profile.priorite, 11);
    if (profile.flags.panique) profile.priorite = Math.max(profile.priorite, 10);

    profile.priorite = round1(Math.max(0, profile.priorite));
    profile.complexite = round1(Math.max(0, profile.complexite));
    DIMS.forEach(function (d) { profile.dims[d] = round1(Math.max(0, profile.dims[d])); });

    return profile;
  }

  function round1(n) { return Math.round(n * 10) / 10; }

  /* ==========================================================
     3. INTERPRÉTATION
     ========================================================== */

  var LEVELS = [
    {
      id: 1,
      name: "Des conseils et les premières bases",
      text: "Dans une situation comme la vôtre, quelques repères bien ciblés suffisent souvent à débloquer les choses. Le bilan offert — par téléphone ou en présentiel — permet déjà de répondre à l'essentiel et de repartir avec des exercices adaptés à votre chien.",
      suite: "Si vous souhaitez aller plus loin, une ou deux séances individuelles (60 € de l'heure) suffisent généralement à installer de bonnes habitudes."
    },
    {
      id: 2,
      name: "Un accompagnement éducatif",
      text: "Ce que vous décrivez se travaille très bien en séances individuelles régulières (60 € de l'heure), avec des exercices à poursuivre entre deux rendez-vous. On avance par étapes, en commençant par ce qui vous gêne le plus au quotidien.",
      suite: "Le bilan offert permet d'abord de définir ensemble le point de départ et le rythme."
    },
    {
      id: 3,
      name: "Un accompagnement personnalisé",
      text: "Les éléments que vous décrivez se répondent entre eux : travailler un point sans tenir compte des autres donne rarement un résultat durable. Un accompagnement individuel construit sur mesure (60 € de l'heure, à votre domicile ou sur le terrain de Mareil-Marly) permet d'avancer dans le bon ordre, au rythme de votre chien.",
      suite: "Tout commence par le bilan offert, qui sert à poser le plan de travail."
    },
    {
      id: 4,
      name: "Un bilan approfondi, en priorité",
      text: "Avant tout exercice technique, la priorité est de comprendre ce qui se joue vraiment pour votre chien et de sécuriser le quotidien. Le bilan, offert et sans engagement, est justement fait pour cela : prendre le temps d'observer, d'échanger, puis de construire un plan progressif.",
      suite: "Les séances individuelles (60 € de l'heure, à domicile ou sur le terrain de Mareil-Marly) prennent ensuite le relais, à un rythme adapté à ce qui aura été observé."
    }
  ];

  var AXES = {
    reactivite: {
      title: "Les émotions face aux autres chiens",
      soft: "Travailler les croisements à une distance où votre chien reste disponible, pour qu'il apprenne qu'un autre chien n'annonce rien de désagréable.",
      hard: "Retrouver d'abord une distance à laquelle il redevient capable d'écouter : c'est la condition de tout le reste, bien avant d'envisager la moindre rencontre."
    },
    peur: {
      title: "La confiance et la gestion des peurs",
      soft: "L'exposer très progressivement à ce qui l'inquiète, toujours en dessous de son seuil de tolérance, et valoriser chaque initiative de sa part.",
      hard: "Faire baisser le niveau de tension avant tout apprentissage : un chien qui a peur n'est pas en état d'apprendre, quelle que soit la qualité de l'exercice."
    },
    laisse: {
      title: "La marche en laisse",
      soft: "Rendre la laisse confortable pour vous deux : une longueur adaptée, un rythme prévisible et des repères clairs.",
      hard: "Reprendre la marche à la base, dans un environnement calme, avant de l'emmener là où tout se complique."
    },
    rappel: {
      title: "Le rappel",
      soft: "Consolider un rappel joyeux, d'abord sans distraction, puis en augmentant progressivement la difficulté.",
      hard: "Reconstruire un rappel fiable dans un cadre sécurisé — le terrain d'éducation est fait pour cela — avant de retrouver de la liberté en milieu ouvert."
    },
    maison: {
      title: "L'équilibre à la maison",
      soft: "Poser des repères simples et les mêmes pour tout le monde : c'est souvent ce qui règle le plus de choses en peu de temps.",
      hard: "Revoir l'organisation du quotidien, les temps de repos et la cohérence des règles, qui expliquent souvent ce qui se joue à la maison."
    },
    solitude: {
      title: "Les moments de solitude",
      soft: "Installer des absences très courtes et positives, pour que rester seul redevienne un non-événement.",
      hard: "Travailler la solitude par étapes vraiment progressives, en partant d'une durée où il reste serein — parfois quelques secondes au début."
    },
    bases: {
      title: "Les apprentissages de base",
      soft: "Consolider les fondamentaux : attention, positions, et surtout leur maintien en présence de distractions.",
      hard: "Reprendre les apprentissages depuis le début, dans le calme, pour lui donner un cadre lisible avant de demander plus."
    },
    socialisation: {
      title: "Les rencontres et la socialisation",
      soft: "Multiplier les expériences positives et bien choisies, en qualité plutôt qu'en quantité.",
      hard: "Choisir soigneusement chaque rencontre et apprendre à lire ses signaux, pour éviter que de mauvaises expériences ne s'accumulent."
    },
    jeune: {
      title: "Les bases du jeune chien",
      soft: "Profiter de cette période clé : socialisation, propreté, solitude et gestion de l'excitation s'installent maintenant beaucoup plus facilement.",
      hard: "Structurer dès maintenant le quotidien d'un jeune chien qui teste beaucoup : repos, règles stables et apprentissages courts mais réguliers."
    },
    relation: {
      title: "La relation et la communication",
      soft: "Mieux décoder ce qu'il exprime et gagner en cohérence dans vos demandes du quotidien.",
      hard: "Reprendre la communication à sa base : ce qu'il comprend de vos demandes, ce que vous lisez de ses signaux, et ce que chacun attend de l'autre."
    }
  };

  function interpret(profile) {
    var dims = profile.dims;
    var ranked = DIMS.slice().sort(function (a, b) {
      if (dims[b] !== dims[a]) return dims[b] - dims[a];
      return DIMS.indexOf(a) - DIMS.indexOf(b); /* déterministe en cas d'égalité */
    });

    var primary = ranked[0];
    var top = dims[primary];
    /* Une dimension secondaire se juge en valeur absolue : une difficulté
       dominante très marquée ne doit pas masquer ce qui l'accompagne. */
    var secondary = ranked.slice(1).filter(function (d) {
      return dims[d] >= 3.5 && dims[d] >= top * 0.2;
    }).slice(0, 3);

    var significant = DIMS.filter(function (d) { return dims[d] >= 3.5; }).length;

    /* Score d'accompagnement : priorité, complexité, ampleur de la
       difficulté dominante et nombre de fronts ouverts. */
    var support = profile.priorite * 1.0
                + profile.complexite * 1.2
                + top * 0.8
                + Math.max(0, significant - 1) * 1.2;

    /* Seuils calibrés sur une série de profils types (voir les tests
       décrits dans le README) : une gêne réelle mais modérée doit rester
       sur de l'accompagnement éducatif, pas sur un bilan prioritaire. */
    var levelIndex = 0;
    if (support >= 38) levelIndex = 3;
    else if (support >= 25) levelIndex = 2;
    else if (support >= 12) levelIndex = 1;

    /* Règles de prudence : elles ne peuvent que relever le niveau. */
    if (profile.flags.panique || profile.flags.securite) levelIndex = Math.max(levelIndex, 2);
    if (profile.flags.contact) levelIndex = 3;
    if (profile.flags.securite && profile.freqLvl >= 2) levelIndex = 3;
    if (profile.flags.depasse && profile.impactLvl >= 3) levelIndex = Math.max(levelIndex, 2);

    return {
      primary: primary,
      secondary: secondary,
      ranked: ranked,
      top: round1(top),
      support: round1(support),
      significant: significant,
      level: LEVELS[levelIndex],
      format: DIM_FORMAT[primary] || 'mixte'
    };
  }

  /* ==========================================================
     4. RÉDACTION
     ========================================================== */

  function joinList(items) {
    var list = items.filter(Boolean);
    if (list.length === 0) return '';
    if (list.length === 1) return list[0];
    return list.slice(0, -1).join(', ') + " et " + list[list.length - 1];
  }

  /* « que » + proposition, avec élision devant une voyelle. */
  function queElide(frag) {
    return /^[aeiouyàâéèêîïôûù]/i.test(frag) ? "qu'" + frag : "que " + frag;
  }

  function buildSummary(profile, reading) {
    var parts = [];
    var branch = profile.branch;

    /* 1. L'âge, posé comme une clé de lecture. */
    parts.push(profile.age.frag);

    /* 2. Le sujet principal, relié à l'âge. */
    var focusSentence = "D'après vos réponses, ce qui vous préoccupe concerne d'abord " + branch.label;
    if (profile.focusCount > 1) {
      focusSentence += ", parmi plusieurs points que vous avez signalés";
    }
    parts.push(focusSentence + ".");

    /* 3. Fréquence + intensité, dans la même phrase : c'est leur
       combinaison qui donne la mesure de la situation. */
    if (profile.freq && profile.intens) {
      parts.push("Cela se produit " + profile.freq.frag + ", et dans ces moments-là, " + profile.intens.frag + ".");
    }

    /* 4. Le détail choisi par le visiteur. */
    if (profile.deep.length) {
      var frags = profile.deep.slice(0, 3).map(function (o) { return o.frag; });
      parts.push(capitalize(profile.deepLead) + joinList(frags) + ".");
    }

    /* 5. L'impact quotidien. */
    if (profile.impact) {
      parts.push("Au jour le jour, cela se vit " + profile.impact.frag + ".");
    }

    /* 6. Ce qui a déjà été tenté, et le contexte particulier. */
    var contexte = [];
    if (profile.essaye) contexte.push(profile.essaye.frag);
    if (profile.particulier.length) {
      var pf = profile.particulier.slice(0, 2).map(function (o) { return queElide(o.frag); });
      contexte.push("vous précisez également " + joinList(pf));
    }
    if (contexte.length) parts.push(joinList(contexte) + ".");

    /* 7. Les dimensions secondaires : ce que le visiteur n'a pas
       forcément relié entre soi. */
    if (reading.secondary.length) {
      /* Deux au maximum dans la phrase : au-delà, elle devient illisible
         — les autres restent visibles sous forme d'étiquettes. */
      var shown = reading.secondary.slice(0, 2);
      var labels = shown.map(function (d) { return DIM_LABEL[d]; });
      parts.push("En arrière-plan, " + joinList(labels) + (shown.length > 1 ? " semblent aussi entrer en jeu." : " semble aussi entrer en jeu."));
    }

    /* 8. Les points de vigilance, formulés avec prudence. */
    if (profile.flags.contact) {
      parts.push("Vous décrivez des réactions qui peuvent aller jusqu'au contact : dans ce cas, mieux vaut ne rien improviser et faire le point avant de travailler quoi que ce soit.");
    } else if (profile.flags.securite) {
      parts.push("Vous évoquez des situations où sa sécurité peut être engagée : c'est le point à sécuriser en premier.");
    } else if (profile.flags.panique) {
      parts.push("Quand un chien bascule dans la panique, il n'est plus en état d'apprendre : faire redescendre cette tension est le préalable à tout le reste.");
    }
    if (profile.flags.changement) {
      parts.push("Un comportement apparu récemment mérite aussi d'être évoqué avec votre vétérinaire, simplement pour écarter une gêne physique.");
    }
    if (profile.flags.depasse && !profile.flags.contact) {
      parts.push("Enfin, le sentiment d'être dépassé(e) que vous exprimez est en soi une information : c'est souvent le signe qu'un regard extérieur ferait gagner beaucoup de temps.");
    }

    return parts.join(' ');
  }

  function buildAxes(profile, reading) {
    var dims = profile.dims;
    var keys = [reading.primary].concat(reading.secondary).slice(0, 3);
    return keys.map(function (dim) {
      var axe = AXES[dim];
      var intense = dims[dim] >= 8 || (dim === profile.branch.dim && profile.intensLvl >= 3);
      var text = intense ? axe.hard : axe.soft;

      /* Nuance liée au contexte : le même axe ne se travaille pas
         pareil chez un chiot ou chez un chien senior. */
      if (dim === 'jeune' && profile.age.v === 'ado') {
        text += " À son âge, la régularité compte davantage que la fermeté.";
      } else if (profile.age.v === 'senior' && (dim === 'reactivite' || dim === 'peur')) {
        text += " Chez un chien plus âgé, on privilégie le confort et des séances courtes.";
      } else if (dim === 'relation' && profile.flags.adoption) {
        text += " Une arrivée récente rend ce point d'autant plus utile : vous êtes encore en train d'apprendre à vous connaître.";
      }
      return { title: axe.title, text: text };
    });
  }

  function buildWhy(profile, reading) {
    var why = [];

    if (profile.intensLvl >= 3) {
      why.push("l'intensité de ce que vous décrivez, qui demande de travailler sous le seuil de réaction de votre chien");
    } else if (profile.intensLvl <= 1) {
      why.push("une difficulté qui reste modérée aujourd'hui, ce qui laisse une belle marge de progression");
    }

    if (profile.freqLvl >= 4) {
      why.push("des épisodes systématiques, qui ancrent l'habitude un peu plus à chaque fois");
    } else if (profile.freqLvl === 3) {
      why.push("une fréquence quasi quotidienne, qui installe l'habitude un peu plus chaque jour");
    } else if (profile.freqLvl <= 1) {
      why.push("une difficulté encore ponctuelle, plus simple à reprendre maintenant que plus tard");
    }

    if (profile.impactLvl >= 3) {
      why.push("le poids réel de la situation sur votre quotidien");
    }

    if (profile.flags.stagnation) {
      why.push("le fait que plusieurs pistes aient déjà été essayées sans résultat durable, ce qui invite à reprendre le problème autrement");
    } else if (profile.flags.deja_pro) {
      why.push("un travail déjà engagé avec un professionnel, sur lequel il est possible de s'appuyer");
    } else if (profile.flags.implique) {
      why.push("votre implication déjà régulière, qui est un vrai atout");
    }

    if (reading.significant >= 3 && reading.level.id >= 3) {
      why.push("plusieurs difficultés qui se répondent entre elles plutôt que de se traiter séparément");
    } else if (reading.significant >= 3) {
      why.push("plusieurs points à travailler, mais qui vont dans le même sens");
    }

    if (profile.age.v === 'chiot') {
      why.push("son âge, qui joue nettement en votre faveur");
    } else if (profile.age.v === 'ado') {
      why.push("la période d'adolescence qu'il traverse, où la régularité paie plus que l'intensité");
    } else if (profile.flags.installe) {
      why.push("l'ancienneté de la situation, qui demande du temps plutôt que des solutions rapides");
    }

    if (profile.flags.adoption) {
      why.push("son arrivée récente, qui change la façon d'aborder les premières séances");
    }

    if (profile.flags.bases_ok) {
      why.push("des bases déjà solides, sur lesquelles on peut directement s'appuyer");
    } else if (profile.basesRien) {
      why.push("des apprentissages encore à construire, qui serviront de socle au reste");
    }

    return why.slice(0, 4);
  }

  function buildFormatLine(reading, profile) {
    if (reading.format === 'terrain') {
      return "Ce type de travail se prête bien aux séances sur le terrain d'éducation de Mareil-Marly, où l'on maîtrise l'environnement, avant de transposer en conditions réelles.";
    }
    if (reading.format === 'domicile') {
      return "Ce travail se fait naturellement à votre domicile, là où les situations se produisent réellement.";
    }
    if (profile.dims.maison >= 5) {
      return "Selon les séances, on peut alterner entre votre domicile et le terrain d'éducation de Mareil-Marly.";
    }
    return "Les séances peuvent se dérouler à votre domicile ou sur le terrain d'éducation de Mareil-Marly, selon ce que l'on travaille.";
  }

  function buildNextStep(profile, reading) {
    var goal = profile.objectif ? profile.objectif.frag : "avancer sereinement";
    var base = "Le bilan est offert et sans engagement : il se fait en présentiel ou par téléphone, et c'est le moment d'évoquer " + profile.branch.label;
    if (reading.level.id >= 3) {
      base += " sans rien laisser de côté";
    }
    base += ". Votre objectif — " + goal + " — servira de fil conducteur.";
    return base;
  }

  function buildTitle(profile, reading) {
    var level = reading.level;
    var calme = profile.intensLvl <= 1 && profile.impactLvl <= 1 && profile.freqLvl <= 1;
    if (level.id === 1 && calme) {
      return "Votre chien semble déjà sur de bonnes bases";
    }
    var around = DIM_OF[reading.primary];
    if (level.id === 4) return "Un bilan approfondi autour " + around;
    if (level.id === 3) return "Un accompagnement personnalisé autour " + around;
    if (level.id === 2) return "Un accompagnement éducatif autour " + around;
    return "Des conseils ciblés autour " + around;
  }

  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /* Fonction principale : réponses → résultat complet. Pure. */
  function runDiagnostic(answers) {
    var profile = computeProfile(answers || {});
    var reading = interpret(profile);
    var points = [reading.primary].concat(reading.secondary).map(function (d) { return DIM_SHORT[d]; });

    return {
      title: buildTitle(profile, reading),
      summary: buildSummary(profile, reading),
      points: points,
      axes: buildAxes(profile, reading),
      level: {
        name: reading.level.name,
        text: reading.level.text + " " + buildFormatLine(reading, profile),
        suite: reading.level.suite
      },
      why: buildWhy(profile, reading),
      nextStep: buildNextStep(profile, reading),
      /* Exposé pour la mise au point : jamais affiché sur le site. */
      debug: {
        branch: profile.branch.key,
        dims: profile.dims,
        priorite: profile.priorite,
        complexite: profile.complexite,
        support: reading.support,
        levelId: reading.level.id,
        flags: Object.keys(profile.flags),
        primary: reading.primary,
        secondary: reading.secondary
      }
    };
  }

  /* ==========================================================
     5. AFFICHAGE
     ========================================================== */

  function init() {
    var quiz = document.getElementById('diag-quiz');
    var result = document.getElementById('diag-result');
    if (!quiz || !result) return;

    var bar = document.getElementById('diag-bar');
    var stepEl = document.getElementById('diag-step');
    var questionEl = document.getElementById('diag-question');
    var hintEl = document.getElementById('diag-hint');
    var answersEl = document.getElementById('diag-answers');
    var backBtn = document.getElementById('diag-back');
    var nextBtn = document.getElementById('diag-next');
    var restartBtn = document.getElementById('diag-restart');
    var editBtn = document.getElementById('diag-edit');

    var answers = {};
    var current = 0;
    var total = QUESTIONS.length;

    function currentQuestion() { return QUESTIONS[current]; }

    /* Une réponse en amont peut invalider les réponses qui en
       dépendent (l'intensité et le détail changent avec la branche). */
    function clearDependent(id) {
      if (id === 'focus') { delete answers.intensite; delete answers.deep; }
    }

    function isAnswered(q) {
      var v = answers[q.id];
      if (q.type === 'multi') return Array.isArray(v) && v.length > 0;
      return v !== undefined && v !== null;
    }

    function renderQuestion(direction) {
      var q = currentQuestion();
      var options = q.options(answers);

      stepEl.textContent = 'Question ' + (current + 1) + ' sur ' + total;
      questionEl.textContent = q.text(answers);
      var hint = q.hint ? q.hint(answers) : '';
      hintEl.textContent = hint;
      hintEl.hidden = !hint;

      answersEl.innerHTML = '';
      var selected = toArray(answers[q.id]).map(String);

      options.forEach(function (opt) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'diag-answer';
        btn.textContent = opt.label;
        btn.dataset.value = String(opt.v);
        if (q.type === 'multi') {
          btn.setAttribute('aria-pressed', selected.indexOf(String(opt.v)) !== -1 ? 'true' : 'false');
          if (selected.indexOf(String(opt.v)) !== -1) btn.classList.add('is-selected');
        } else if (selected.indexOf(String(opt.v)) !== -1) {
          btn.classList.add('is-selected');
        }
        btn.addEventListener('click', function () { onAnswer(q, opt, btn); });
        answersEl.appendChild(btn);
      });

      backBtn.hidden = current === 0;
      nextBtn.hidden = q.type !== 'multi';
      if (q.type === 'multi') {
        nextBtn.disabled = !isAnswered(q);
        nextBtn.textContent = current === total - 1 ? 'Voir mon résultat' : 'Continuer';
      }

      /* Un minimum visible dès la première question : la barre doit
         montrer qu'un parcours démarre, pas paraître vide. */
      bar.style.width = Math.max(4, current / total * 100) + '%';

      /* Relance discrète de l'animation d'apparition. */
      quiz.classList.remove('is-changing');
      void quiz.offsetWidth;
      quiz.classList.add(direction === 'back' ? 'is-changing-back' : 'is-changing');
      if (direction !== 'back') quiz.classList.remove('is-changing-back');
    }

    function onAnswer(q, opt, btn) {
      if (q.type === 'multi') {
        var list = toArray(answers[q.id]).map(String);
        var value = String(opt.v);
        var isOn = list.indexOf(value) !== -1;

        if (isOn) {
          list = list.filter(function (v) { return v !== value; });
        } else if (opt.exclusive) {
          list = [value];
        } else {
          list = list.filter(function (v) {
            var o = findOption(q.options(answers), v);
            return !(o && o.exclusive);
          });
          if (q.max && list.length >= q.max) list.shift(); /* on garde les plus récents */
          list.push(value);
        }
        answers[q.id] = list;
        clearDependent(q.id);
        renderSelection(q, list);
        nextBtn.disabled = list.length === 0;
        return;
      }

      answers[q.id] = opt.v;
      clearDependent(q.id);
      [].forEach.call(answersEl.children, function (el) { el.classList.remove('is-selected'); });
      btn.classList.add('is-selected');
      advance(160);
    }

    function renderSelection(q, list) {
      [].forEach.call(answersEl.children, function (el) {
        var on = list.indexOf(el.dataset.value) !== -1;
        el.classList.toggle('is-selected', on);
        el.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    }

    function advance(delay) {
      window.setTimeout(function () {
        if (current < total - 1) { current++; renderQuestion('next'); }
        else renderResult();
      }, delay || 0);
    }

    function fillList(el, items, builder) {
      el.innerHTML = '';
      items.forEach(function (item) {
        var li = document.createElement('li');
        builder(li, item);
        el.appendChild(li);
      });
    }

    function renderResult() {
      var out = runDiagnostic(answers);
      bar.style.width = '100%';

      document.getElementById('diag-result-title').textContent = out.title;
      document.getElementById('diag-result-text').textContent = out.summary;

      fillList(document.getElementById('diag-points'), out.points, function (li, txt) {
        li.textContent = txt;
      });

      fillList(document.getElementById('diag-axes'), out.axes, function (li, axe) {
        var strong = document.createElement('strong');
        strong.textContent = axe.title;
        var p = document.createElement('span');
        p.textContent = axe.text;
        li.appendChild(strong);
        li.appendChild(p);
      });

      document.getElementById('diag-reco-name').textContent = out.level.name;
      document.getElementById('diag-reco-text').textContent = out.level.text;

      var whyEl = document.getElementById('diag-why');
      var whyIntro = document.getElementById('diag-why-intro');
      if (out.why.length) {
        whyIntro.hidden = false;
        fillList(whyEl, out.why, function (li, txt) { li.textContent = capitalize(txt); });
      } else {
        whyIntro.hidden = true;
        whyEl.innerHTML = '';
      }
      document.getElementById('diag-reco-suite').textContent = out.level.suite;
      document.getElementById('diag-next-text').textContent = out.nextStep;

      quiz.hidden = true;
      result.hidden = false;
      result.classList.remove('is-changing');
      void result.offsetWidth;
      result.classList.add('is-changing');
    }

    function backToQuiz(index) {
      current = index;
      result.hidden = true;
      quiz.hidden = false;
      renderQuestion('back');
    }

    backBtn.addEventListener('click', function () {
      if (current > 0) { current--; renderQuestion('back'); }
    });

    nextBtn.addEventListener('click', function () {
      if (!isAnswered(currentQuestion())) return;
      advance(0);
    });

    restartBtn.addEventListener('click', function () {
      answers = {};
      backToQuiz(0);
    });

    if (editBtn) {
      editBtn.addEventListener('click', function () { backToQuiz(total - 1); });
    }

    renderQuestion('next');
  }

  /* API publique : le moteur est testable sans passer par l'interface. */
  window.StephDiag = {
    QUESTIONS: QUESTIONS,
    BRANCHES: BRANCHES,
    branchOf: branchOf,
    computeProfile: computeProfile,
    runDiagnostic: runDiagnostic,
    init: init
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(window, document);
