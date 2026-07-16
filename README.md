# SYM-CARE — Connected Care. Healthier Communities.

A production-ready healthcare platform connecting patients, Village Health Teams (VHTs) and clinics across Uganda. This repository contains the fully integrated **frontend** (React + Vite + TanStack Router + Tailwind) and **backend** (Node.js + Express + MySQL + JWT).

---

## 1. Project overview

- **Frontend** — Premium React application (TanStack Start / Vite) providing patient onboarding, dashboard, clinic locator, symptom triage, SOS, appointments, medical records and notifications. All data is live from the backend API; no mock data.
- **Backend** — Node/Express REST API backed by MySQL. Handles authentication (JWT, phone + password), clinics, patients, symptom triage, SOS dispatch, appointments, notifications and a USSD gateway.

---

## 2. Folder structure

```
Project/
├── frontend/                 # React + Vite (TanStack Start) app
│   ├── src/
│   ├── public/
│   ├── package.json
│   ├── vite.config.ts
│   └── .env.example
├── backend/                  # Node.js + Express + MySQL API
│   ├── config/               # DB pool
│   ├── middleware/           # JWT auth
│   ├── models/               # schema.sql + schema_v2.sql
│   ├── routes/               # auth, patients, clinics, symptoms, sos, ussd,
│   │                         # appointments, notifications
│   ├── utils/
│   ├── server.js
│   ├── package.json
│   └── .env.example
└── README.md
```

---

## 3. Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9 (bundled with Node)
- **MySQL** ≥ 8

---

## 4. Database setup

1. Start MySQL and create the database:

```sql
CREATE DATABASE sym_care;
```

2. Import the base schema and the additive v2 migration (appointments + notifications):

```bash
mysql -u root -p sym_care < backend/models/schema.sql
mysql -u root -p sym_care < backend/models/schema_v2.sql
```

Both scripts are idempotent — re-running is safe.

---

## 5. Backend installation

```bash
cd backend
cp .env.example .env       # then edit values
npm install
npm start
```

Edit `backend/.env`:

```
PORT=4000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=sym_care
JWT_SECRET=change_me_to_a_long_random_string
```

The API listens on **http://localhost:4000** and exposes:

- `POST /auth/register`, `POST /auth/login`
- `GET /patients/me`, `GET /patients/me/history`
- `GET /clinics/nearby`
- `POST /symptoms`
- `POST /sos`, `GET /sos/:id`
- `GET /appointments/me`, `POST /appointments`, `PATCH /appointments/:id/status`, `GET /appointments/upcoming/count`
- `GET /notifications/me`, `PATCH /notifications/:id/read`
- `POST /ussd`
- `GET /health`

---

## 6. Frontend installation

```bash
cd frontend
cp .env.example .env       # optional — defaults to http://localhost:4000
npm install
npm run dev
```

The dev server runs on **http://localhost:8080** (Vite). Set `VITE_API_URL` in `frontend/.env` if your backend runs elsewhere:

```
VITE_API_URL=http://localhost:4000
```

Build for production:

```bash
npm run build
npm run start
```

---

## 7. Default ports

| Service   | Port  |
|-----------|-------|
| Frontend  | 8080  |
| Backend   | 4000  |
| MySQL     | 3306  |

---

## 8. Quick start (TL;DR)

Terminal 1 — backend:

```bash
cd backend && npm install && npm start
```

Terminal 2 — frontend:

```bash
cd frontend && npm install && npm run dev
```

Open **http://localhost:8080**, register with a phone number + password, and you're in.

---

## 9. Notes

- Secrets are never committed. `.env.example` files are provided in both `frontend/` and `backend/`.
- CORS is enabled by default on the backend. For production, restrict `cors()` in `backend/server.js` to your deployed frontend origin.
- Auth uses phone + password. JWT tokens are stored in the browser's `localStorage` under `sym_care_token`.
