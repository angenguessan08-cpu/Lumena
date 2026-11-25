/* Données personnelles complémentaires (portefeuille BRVM, fonds collectif DTA) — importées une seule fois
   dans le compte du premier administrateur. À SUPPRIMER avant de partager ou d'héberger l'application. */
window.LUMINA_SEED2={
 bourse:[
  {date:'2024-12-02',societe:'NSIA',secteur:'Banque',profil:'Croissance',qte:2,pu:7440,horizon:5},
  {date:'2024-12-10',societe:'NSIA',secteur:'Banque',profil:'Croissance',qte:4,pu:7390,horizon:5},
  {date:'2025-01-10',societe:'ECOBANK',secteur:'Banque',profil:'Rente',qte:10,pu:8325,horizon:10},
  {date:'2025-01-10',societe:'CIE',secteur:'Service public',profil:'Rente',qte:10,pu:2185,horizon:10},
  {date:'2025-01-10',societe:'NESTLE CI',secteur:'Industrie',profil:'Croissance',qte:5,pu:7960,horizon:5},
  {date:'2025-01-10',societe:'SIB',secteur:'Banque',profil:'Rente',qte:8,pu:3500,horizon:10},
  {date:'2025-01-13',societe:'SODECI',secteur:'Service public',profil:'Rente',qte:5,pu:5550,horizon:10},
  {date:'2025-02-20',societe:'SONATEL',secteur:'Télécommunication',profil:'Rente',qte:4,pu:24855,horizon:10},
  {date:'2025-02-20',societe:'SONATEL',secteur:'Télécommunication',profil:'Rente',qte:5,pu:24990,horizon:10},
  {date:'2025-02-20',societe:'ECOBANK',secteur:'Banque',profil:'Rente',qte:5,pu:8200,horizon:10},
  {date:'2025-02-20',societe:'CIE',secteur:'Service public',profil:'Rente',qte:10,pu:2180,horizon:10},
  {date:'2025-03-28',societe:'SIB',secteur:'Banque',profil:'Rente',qte:8,pu:4375,horizon:10},
  {date:'2025-04-16',societe:'NSIA',secteur:'Banque',profil:'Croissance',qte:5,pu:8250,horizon:5},
  {date:'2025-04-16',societe:'SIB',secteur:'Banque',profil:'Rente',qte:8,pu:4460,horizon:10}
 ],
 /* Cours de clôture BRVM du 16/11/2026 (brvm.org) — à actualiser régulièrement */
 cours:{NSIA:16600,ECOBANK:15345,CIE:4900,'NESTLE CI':13095,SIB:8515,SODECI:12200,SONATEL:4145},
 coursDate:'2026-11-16',
 splits:[{date:'2026-10-26',societe:'SONATEL',coef:10}],
 collectif:[
  {date:'2026-11-16',type:'Collecté',personne:'DTA DAYS',libelle:'DTA DAYS',montant:2015000},
  {date:'2026-11-16',type:'Collecté',personne:'Tristan',libelle:'Tristan',montant:50000},
  {date:'2026-11-16',type:'Reste à payer',personne:'Mintan',libelle:'Reste à payer — Mintan',montant:150000,note:'Annotation du fichier d’origine : « Reste 50000 » (à vérifier)'},
  {date:'2026-11-16',type:'Reste à payer',personne:'Gadou',libelle:'Reste à payer — Gadou',montant:125000},
  {date:'2026-11-16',type:'Reste à payer',personne:'Natou',libelle:'Reste à payer — Natou',montant:150000},
  {date:'2026-11-16',type:'Reste à payer',personne:'Franck',libelle:'Reste à payer — Franck',montant:240000},
  {date:'2026-11-16',type:'Espèce',personne:'',libelle:'Espèce',montant:110500},
  {date:'2026-11-16',type:'Banque',personne:'',libelle:'Banque (DTA)',montant:1290000}
 ],
 collectifNom:'DTA'
};
