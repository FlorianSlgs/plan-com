# Plan Communication Dashboard

**Projet de tableau de bord destiné à des équipes de communicants**

*Gestion de plans de communication interactifs*

---

## 📁 Structure du projet

Ce projet contient deux parties principales :

- **Frontend** : application Angular située dans le dossier `frontend/`
- **Backend** : API Express située dans le dossier `backend/`

```
/
├── frontend/     # Application Angular
├── backend/      # API Express
└── README.md     # Ce fichier
```

---

## 🚀 Installation

### 1. Cloner le dépôt

```bash
git clone https://github.com/FlorianSlgs/plan-com/tree/1669100e5a4bbc780aff7082baf057a5cf879dc4
cd plan-com
```

### 2. Installation des dépendances

**Frontend :**
```bash
cd frontend
npm install
```

**Backend :**
```bash
cd backend
npm install
```

---

## ▶️ Lancer le projet

### Lancer le backend

```bash
cd backend
npm start
```

> 📍 Par défaut, l'API tourne sur **http://localhost:3000** (modifiable dans la config fichier `.env`)

### Lancer le frontend

```bash
cd frontend
npm start
```

> 📍 Par défaut, l'application est disponible sur **http://localhost:4200**

---

## ⚙️ Variables d'environnement

Créer un fichier `.env` dans `backend/` avec :

```env
PORT=3000                           # (ou autre)
PGUSER=                            # PostgreSQL user
PGPASSWORD=                        # PostgreSQL password
PGHOST=                            # PostgreSQL host
PGDATABASE=                        # PostgreSQL database
PGPORT=                            # PostgreSQL port (à configurer sur postgreSQL)
JWT_SECRET=                        # (choisir la clef de cryptage)
CORS=http://localhost:4200         # (pour angular, à modifier si besoin)
```

*(Ajouter d'autres variables selon vos besoins)*

---

## 📦 Build pour la production

**Frontend :**
```bash
cd frontend
npm build --configuration production
```

---

## 🛠 Technologies utilisées

- **Frontend** : Angular
- **Backend** : Node.js + Express
- **Gestion des dépendances** : npm