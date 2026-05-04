// Données de démo pré-chargées

export const INITIAL_PERSONNEL = [
  // ── Encadrement ─────────────────────────────────────────────────────────
  { id: 'p_arthur',    nom: 'PERRET',      prenom: 'Arthur',    type: 'ELS',           qualification: 'RES', role: 'RS',   societe: '',        actif: true },
  { id: 'p_yann',      nom: 'VICTORINO',   prenom: 'Yann',      type: 'ELS',           qualification: 'CA',  role: 'CA',   societe: '',        actif: true },
  { id: 'p_yohann',    nom: 'COLOMBET',    prenom: 'Yohann',    type: 'ELS',           qualification: 'CA',  role: 'CA',   societe: '',        actif: true },
  { id: 'p_fabien',    nom: 'BARDOTTI',    prenom: 'Fabien',    type: 'ELS',           qualification: 'CA',  role: 'CA',   societe: '',        actif: true },

  // ── Équipe Yann VICTORINO ────────────────────────────────────────────────
  { id: 'p_thomas',    nom: 'MARTIN',      prenom: 'Thomas',    type: 'ELS',           qualification: 'CE',  role: 'TECH', societe: '',        actif: true },
  { id: 'p_nicolas',   nom: 'DUPONT',      prenom: 'Nicolas',   type: 'ELS',           qualification: 'EL',  role: 'TECH', societe: '',        actif: true },
  { id: 'p_maxime',    nom: 'BERNARD',     prenom: 'Maxime',    type: 'ELS',           qualification: 'AP',  role: 'TECH', societe: '',        actif: true },
  { id: 'p_florian',   nom: 'RENARD',      prenom: 'Florian',   type: 'Intérimaire',   qualification: 'INT', role: 'TECH', societe: 'Manpower', actif: true },

  // ── Équipe Yohann COLOMBET ───────────────────────────────────────────────
  { id: 'p_kevin',     nom: 'ROBERT',      prenom: 'Kevin',     type: 'ELS',           qualification: 'CE',  role: 'TECH', societe: '',        actif: true },
  { id: 'p_antoine',   nom: 'MOREAU',      prenom: 'Antoine',   type: 'ELS',           qualification: 'EL',  role: 'TECH', societe: '',        actif: true },
  { id: 'p_julien',    nom: 'SIMON',       prenom: 'Julien',    type: 'Intérimaire',   qualification: 'INT', role: 'TECH', societe: 'Adecco',  actif: true },

  // ── Équipe Fabien BARDOTTI ───────────────────────────────────────────────
  { id: 'p_pierre',    nom: 'LAURENT',     prenom: 'Pierre',    type: 'ELS',           qualification: 'CE',  role: 'TECH', societe: '',        actif: true },
  { id: 'p_sebastien', nom: 'MICHEL',      prenom: 'Sébastien', type: 'ELS',           qualification: 'EL',  role: 'TECH', societe: '',        actif: true },
  { id: 'p_romain',    nom: 'GARCIA',      prenom: 'Romain',    type: 'ELS',           qualification: 'AP',  role: 'TECH', societe: '',        actif: true },
  { id: 'p_lucas',     nom: 'PETIT',       prenom: 'Lucas',     type: 'Sous-traitant', qualification: 'EL',  role: 'TECH', societe: 'ELEC42',  actif: true },
];

export const INITIAL_AFFAIRES = [
  // ── Yann VICTORINO ──────────────────────────────────────────────────────
  { id: 'a_els2412128', numero: 'ELS2412128', intitule: 'STEP CLERMONT',          client: 'SUEZ',       adresse: 'Clermont-Ferrand (63)', heuresPrevues: 4868, caId: 'p_yann',   statut: 'active',    colorIndex: 0 },
  { id: 'a_els2501045', numero: 'ELS2501045', intitule: 'TOITURE PV AUCHAN',      client: 'AUCHAN',     adresse: 'Roanne (42)',           heuresPrevues: 1240, caId: 'p_yann',   statut: 'active',    colorIndex: 1 },

  // ── Yohann COLOMBET ─────────────────────────────────────────────────────
  { id: 'a_els2503012', numero: 'ELS2503012', intitule: 'BÂTIMENT INDUSTRIEL',    client: 'ALSTOM',     adresse: 'Saint-Chamond (42)',    heuresPrevues: 2100, caId: 'p_yohann', statut: 'active',    colorIndex: 2 },
  { id: 'a_els2412089', numero: 'ELS2412089', intitule: 'RÉSEAU HTA ZAE NORD',    client: 'ENEDIS',     adresse: 'Montbrison (42)',       heuresPrevues:  860, caId: 'p_yohann', statut: 'active',    colorIndex: 3 },

  // ── Fabien BARDOTTI ──────────────────────────────────────────────────────
  { id: 'a_els2502034', numero: 'ELS2502034', intitule: 'CENTRALE PV FERME',      client: 'SAS AGRI63', adresse: 'Ambert (63)',           heuresPrevues: 3200, caId: 'p_fabien', statut: 'active',    colorIndex: 4 },
  { id: 'a_els2411210', numero: 'ELS2411210', intitule: 'MAINTENANCE USINE',      client: 'MICHELIN',   adresse: 'Clermont-Ferrand (63)', heuresPrevues:  560, caId: 'p_fabien', statut: 'en attente', colorIndex: 5 },
];

// ── Planning démo ────────────────────────────────────────────────────────────
// W17 : 20–24 avr. | W18 : 27 avr.–1 mai (1 mai = férié)
// W19 : 4–8 mai (8 mai = férié) | W20 : 11–15 mai (14 mai = Ascension)
function pk(pid, w, d) {
  return `${pid}_2026-W${String(w).padStart(2,'0')}_${d}`;
}

const A0 = 'a_els2412128'; // STEP CLERMONT    (Yann)
const A1 = 'a_els2501045'; // TOITURE PV       (Yann)
const A2 = 'a_els2503012'; // BÂTIMENT ALSTOM  (Yohann)
const A3 = 'a_els2412089'; // RÉSEAU HTA       (Yohann)
const A4 = 'a_els2502034'; // CENTRALE PV      (Fabien)
const A5 = 'a_els2411210'; // MAINTENANCE      (Fabien)

export const INITIAL_PLANNING = {

  // ════════════════════════════════════════════════════════
  //  ÉQUIPE YANN — Thomas, Nicolas, Maxime, Florian
  // ════════════════════════════════════════════════════════

  // Thomas MARTIN (CE) — STEP CLERMONT toutes semaines
  [pk('p_thomas',17,0)]:A0, [pk('p_thomas',17,1)]:A0, [pk('p_thomas',17,2)]:A0, [pk('p_thomas',17,3)]:A0, [pk('p_thomas',17,4)]:A0,
  [pk('p_thomas',18,0)]:A0, [pk('p_thomas',18,1)]:A0, [pk('p_thomas',18,2)]:A0, [pk('p_thomas',18,3)]:A0,
  [pk('p_thomas',19,0)]:A0, [pk('p_thomas',19,1)]:A0, [pk('p_thomas',19,2)]:A0, [pk('p_thomas',19,3)]:A0,
  [pk('p_thomas',20,0)]:A0, [pk('p_thomas',20,1)]:A0, [pk('p_thomas',20,2)]:A0, [pk('p_thomas',20,4)]:A0,
  [pk('p_thomas',21,0)]:A0, [pk('p_thomas',21,1)]:A0, [pk('p_thomas',21,2)]:A0, [pk('p_thomas',21,3)]:A0, [pk('p_thomas',21,4)]:A0,

  // Nicolas DUPONT (EL) — STEP CLERMONT + CP en W18
  [pk('p_nicolas',17,0)]:A0, [pk('p_nicolas',17,1)]:A0, [pk('p_nicolas',17,2)]:A0, [pk('p_nicolas',17,3)]:A0, [pk('p_nicolas',17,4)]:A0,
  [pk('p_nicolas',18,0)]:'CP', [pk('p_nicolas',18,1)]:'CP', [pk('p_nicolas',18,2)]:'CP', [pk('p_nicolas',18,3)]:'CP',
  [pk('p_nicolas',19,0)]:A0, [pk('p_nicolas',19,1)]:A0, [pk('p_nicolas',19,2)]:A0, [pk('p_nicolas',19,3)]:A0,
  [pk('p_nicolas',20,0)]:A0, [pk('p_nicolas',20,1)]:A0, [pk('p_nicolas',20,2)]:A0, [pk('p_nicolas',20,4)]:A0,
  [pk('p_nicolas',21,0)]:A0, [pk('p_nicolas',21,1)]:A0, [pk('p_nicolas',21,2)]:A0, [pk('p_nicolas',21,3)]:A0, [pk('p_nicolas',21,4)]:A0,

  // Maxime BERNARD (AP) — TOITURE PV AUCHAN
  [pk('p_maxime',17,0)]:A1, [pk('p_maxime',17,1)]:A1, [pk('p_maxime',17,2)]:A1, [pk('p_maxime',17,3)]:A1, [pk('p_maxime',17,4)]:A1,
  [pk('p_maxime',18,0)]:A1, [pk('p_maxime',18,1)]:A1, [pk('p_maxime',18,2)]:A1, [pk('p_maxime',18,3)]:A1,
  [pk('p_maxime',19,0)]:A1, [pk('p_maxime',19,1)]:'AM', [pk('p_maxime',19,2)]:A1, [pk('p_maxime',19,3)]:A1,
  [pk('p_maxime',20,0)]:A1, [pk('p_maxime',20,1)]:A1, [pk('p_maxime',20,2)]:A1, [pk('p_maxime',20,4)]:A1,
  [pk('p_maxime',21,0)]:A1, [pk('p_maxime',21,1)]:A1, [pk('p_maxime',21,2)]:A1, [pk('p_maxime',21,3)]:A1, [pk('p_maxime',21,4)]:A1,

  // Florian RENARD (INT/Manpower) — TOITURE PV puis STEP
  [pk('p_florian',17,0)]:A1, [pk('p_florian',17,1)]:A1, [pk('p_florian',17,2)]:A1, [pk('p_florian',17,3)]:A1, [pk('p_florian',17,4)]:A1,
  [pk('p_florian',18,0)]:A1, [pk('p_florian',18,1)]:A1, [pk('p_florian',18,2)]:A1, [pk('p_florian',18,3)]:A1,
  [pk('p_florian',19,0)]:A0, [pk('p_florian',19,1)]:A0, [pk('p_florian',19,2)]:A0, [pk('p_florian',19,3)]:A0,
  [pk('p_florian',20,0)]:A0, [pk('p_florian',20,1)]:A0, [pk('p_florian',20,4)]:A0,

  // ════════════════════════════════════════════════════════
  //  ÉQUIPE YOHANN — Kevin, Antoine, Julien
  // ════════════════════════════════════════════════════════

  // Kevin ROBERT (CE) — BÂTIMENT INDUSTRIEL ALSTOM
  [pk('p_kevin',17,0)]:A2, [pk('p_kevin',17,1)]:A2, [pk('p_kevin',17,2)]:A2, [pk('p_kevin',17,3)]:A2, [pk('p_kevin',17,4)]:A2,
  [pk('p_kevin',18,0)]:A2, [pk('p_kevin',18,1)]:A2, [pk('p_kevin',18,2)]:A2, [pk('p_kevin',18,3)]:A2,
  [pk('p_kevin',19,0)]:A2, [pk('p_kevin',19,1)]:A2, [pk('p_kevin',19,2)]:A2, [pk('p_kevin',19,3)]:A2,
  [pk('p_kevin',20,0)]:A2, [pk('p_kevin',20,1)]:A2, [pk('p_kevin',20,2)]:A2, [pk('p_kevin',20,4)]:A2,
  [pk('p_kevin',21,0)]:A2, [pk('p_kevin',21,1)]:A2, [pk('p_kevin',21,2)]:A2, [pk('p_kevin',21,3)]:A2, [pk('p_kevin',21,4)]:A2,

  // Antoine MOREAU (EL) — BÂTIMENT ALSTOM puis RÉSEAU HTA
  [pk('p_antoine',17,0)]:A2, [pk('p_antoine',17,1)]:A2, [pk('p_antoine',17,2)]:A2, [pk('p_antoine',17,3)]:A2, [pk('p_antoine',17,4)]:A2,
  [pk('p_antoine',18,0)]:A2, [pk('p_antoine',18,1)]:A2, [pk('p_antoine',18,2)]:'FORMATION', [pk('p_antoine',18,3)]:'FORMATION',
  [pk('p_antoine',19,0)]:A3, [pk('p_antoine',19,1)]:A3, [pk('p_antoine',19,2)]:A3, [pk('p_antoine',19,3)]:A3,
  [pk('p_antoine',20,0)]:A3, [pk('p_antoine',20,1)]:A3, [pk('p_antoine',20,2)]:A3, [pk('p_antoine',20,4)]:A3,
  [pk('p_antoine',21,0)]:A3, [pk('p_antoine',21,1)]:A3, [pk('p_antoine',21,2)]:A3, [pk('p_antoine',21,3)]:A3, [pk('p_antoine',21,4)]:A3,

  // Julien SIMON (INT/Adecco) — RÉSEAU HTA ZAE
  [pk('p_julien',17,0)]:A3, [pk('p_julien',17,1)]:A3, [pk('p_julien',17,2)]:A3, [pk('p_julien',17,3)]:A3, [pk('p_julien',17,4)]:A3,
  [pk('p_julien',18,0)]:A3, [pk('p_julien',18,1)]:A3, [pk('p_julien',18,2)]:A3, [pk('p_julien',18,3)]:A3,
  [pk('p_julien',19,0)]:A3, [pk('p_julien',19,1)]:A3, [pk('p_julien',19,3)]:A3,
  [pk('p_julien',20,0)]:A3, [pk('p_julien',20,2)]:A3, [pk('p_julien',20,4)]:A3,

  // ════════════════════════════════════════════════════════
  //  ÉQUIPE FABIEN — Pierre, Sébastien, Romain, Lucas
  // ════════════════════════════════════════════════════════

  // Pierre LAURENT (CE) — CENTRALE PV FERME
  [pk('p_pierre',17,0)]:A4, [pk('p_pierre',17,1)]:A4, [pk('p_pierre',17,2)]:A4, [pk('p_pierre',17,3)]:A4, [pk('p_pierre',17,4)]:A4,
  [pk('p_pierre',18,0)]:A4, [pk('p_pierre',18,1)]:A4, [pk('p_pierre',18,2)]:A4, [pk('p_pierre',18,3)]:A4,
  [pk('p_pierre',19,0)]:A4, [pk('p_pierre',19,1)]:A4, [pk('p_pierre',19,2)]:A4, [pk('p_pierre',19,3)]:A4,
  [pk('p_pierre',20,0)]:A4, [pk('p_pierre',20,1)]:A4, [pk('p_pierre',20,2)]:A4, [pk('p_pierre',20,4)]:A4,
  [pk('p_pierre',21,0)]:A4, [pk('p_pierre',21,1)]:A4, [pk('p_pierre',21,2)]:A4, [pk('p_pierre',21,3)]:A4, [pk('p_pierre',21,4)]:A4,

  // Sébastien MICHEL (EL) — CENTRALE PV + CP
  [pk('p_sebastien',17,0)]:A4, [pk('p_sebastien',17,1)]:A4, [pk('p_sebastien',17,2)]:A4, [pk('p_sebastien',17,3)]:A4, [pk('p_sebastien',17,4)]:A4,
  [pk('p_sebastien',18,0)]:'CP', [pk('p_sebastien',18,1)]:'CP', [pk('p_sebastien',18,2)]:'CP', [pk('p_sebastien',18,3)]:'CP',
  [pk('p_sebastien',19,0)]:A4, [pk('p_sebastien',19,1)]:A4, [pk('p_sebastien',19,2)]:A4, [pk('p_sebastien',19,3)]:A4,
  [pk('p_sebastien',20,0)]:A4, [pk('p_sebastien',20,1)]:A4, [pk('p_sebastien',20,2)]:A4, [pk('p_sebastien',20,4)]:A4,
  [pk('p_sebastien',21,0)]:A4, [pk('p_sebastien',21,1)]:A4, [pk('p_sebastien',21,3)]:A4, [pk('p_sebastien',21,4)]:A4,

  // Romain GARCIA (AP) — MAINTENANCE MICHELIN
  [pk('p_romain',17,0)]:A5, [pk('p_romain',17,1)]:A5, [pk('p_romain',17,2)]:A5, [pk('p_romain',17,3)]:A5, [pk('p_romain',17,4)]:A5,
  [pk('p_romain',18,0)]:A5, [pk('p_romain',18,1)]:A5, [pk('p_romain',18,3)]:A5,
  [pk('p_romain',19,0)]:A5, [pk('p_romain',19,2)]:A5, [pk('p_romain',19,3)]:A5,
  [pk('p_romain',20,0)]:A5, [pk('p_romain',20,1)]:A5, [pk('p_romain',20,4)]:A5,

  // Lucas PETIT (SST/ELEC42) — CENTRALE PV
  [pk('p_lucas',17,0)]:A4, [pk('p_lucas',17,1)]:A4, [pk('p_lucas',17,2)]:A4, [pk('p_lucas',17,3)]:A4, [pk('p_lucas',17,4)]:A4,
  [pk('p_lucas',18,0)]:A4, [pk('p_lucas',18,1)]:A4, [pk('p_lucas',18,2)]:A4, [pk('p_lucas',18,3)]:A4,
  [pk('p_lucas',19,0)]:A4, [pk('p_lucas',19,1)]:A4, [pk('p_lucas',19,2)]:A4, [pk('p_lucas',19,3)]:A4,
  [pk('p_lucas',20,0)]:A4, [pk('p_lucas',20,2)]:A4, [pk('p_lucas',20,4)]:A4,
};
