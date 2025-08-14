Projet de tableau de bord destiné à des équipes de communicants -Gestion de plans de communication interactifs-

Ce projet contient deux parties principales :

Frontend : application Angular située dans le dossier frontend/

Backend : API Express située dans le dossier backend/

📂 Structure du projet
/
├── frontend/    # Application Angular
├── backend/     # API Express
└── README.md    # Ce fichier

🚀 Installation
1. Cloner le dépôt
git clone <https://github.com/FlorianSlgs/plan-com/tree/1669100e5a4bbc780aff7082baf057a5cf879dc4>
cd <plan-com>

2. Installation des dépendances
Frontend
cd frontend
npm install

Backend
cd backend
npm install

▶️ Lancer le projet
Lancer le backend
cd backend
npm start


Par défaut, l’API tourne sur http://localhost:3000 (modifiable dans la config fichier ".env")

Lancer le frontend
cd frontend
npm start


Par défaut, l’application est disponible sur http://localhost:4200

⚙️ Variables d’environnement

Créer un fichier .env dans backend/ avec :

PORT=3000 (ou autre)

PGUSER= PGPASSWORD= PGHOST= PGDATABASE= PGPORT= (à configurer sur postgreSQL)

JWT_SECRET= (choisir la clef de cryptage)

CORS=http://localhost:4200 (pour angular, à modifier si besoin)

PORT=3000 (modifiable si besoin)


(Ajouter d’autres variables selon vos besoins)

📦 Build pour la production
Frontend
cd frontend
npm build --configuration production

🛠 Technologies utilisées

Frontend : Angular

Backend : Node.js + Express

Gestion des dépendances : npm