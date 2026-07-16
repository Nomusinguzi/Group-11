# SYM-CARE Backend

REST API + USSD (`*384#`) gateway for the SYM-CARE digital healthcare access
platform. Node.js + Express + MySQL.

> **Consistency guarantee:** triage classification (`utils/triage.js`) and
> distance ranking (`utils/distance.js`) are each implemented exactly once and
> imported by both the app-facing REST routes and the USSD handler
> (`routes/ussd.js`), so a patient gets the same urgency level and the same
> nearest-clinic ranking whether they use the smartphone app or a feature
> phone.

## 1. Setup

### Prerequisites
- Node.js 18+
- MySQL 8+ (or a compatible MariaDB)

### Steps

```bash
# 1. Install dependencies
cd backend
npm install

# 2. Create your .env file
cp .env.example .env
# then edit .env and fill in DB credentials, JWT_SECRET, and ENCRYPTION_KEY

# 3. Generate a 32-byte encryption key for ENCRYPTION_KEY
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 4. Create the database and tables (also seeds 5 sample clinics)
mysql -u root -p < models/schema.sql

# 5. Start the server
npm run dev     # with nodemon, auto-restart on change
# or
npm start        # plain node
```

The API listens on `http://localhost:4000` by default (`PORT` in `.env`).
Check it's up with:

```bash
curl http://localhost:4000/health
```

### Connecting the USSD gateway (Africa's Talking)

1. Create a sandbox app at https://account.africastalking.com/.
2. Register a USSD channel (sandbox provides a shared shortcode like `*384*XXXX#`).
3. Point the channel's callback URL at `https://<your-deployed-host>/ussd`
   (must be publicly reachable — use ngrok or similar for local testing).
4. Africa's Talking will POST `sessionId`, `phoneNumber`, `serviceCode`, and
   `text` as `application/x-www-form-urlencoded` — already handled by
   `express.urlencoded()` in `server.js`.

## 2. Project structure

```
backend/
├── server.js                  # Express app entry point
├── config/
│   └── db.js                  # MySQL connection pool
├── middleware/
│   ├── auth.js                # JWT sign/verify + role-based access control
│   └── encryption.js          # AES-256-GCM encrypt/decrypt for clinical notes
├── routes/
│   ├── auth.js                # /auth/register, /auth/login
│   ├── patients.js            # /patients/me, /patients/me/history
│   ├── clinics.js             # /clinics/nearby, /clinics/:id
│   ├── symptoms.js            # /symptoms (app channel triage)
│   ├── sos.js                 # /sos (create + status)
│   └── ussd.js                # /ussd (feature-phone menu, same triage/distance logic)
├── utils/
│   ├── triage.js              # SHARED triage engine (app + USSD)
│   └── distance.js            # SHARED haversine distance ranking (app + USSD)
├── models/
│   └── schema.sql             # MySQL schema + seed clinics
├── package.json
└── .env.example
```

## 3. Auth model

- Passwords hashed with **bcrypt** (`bcryptjs`, 10 salt rounds).
- Sessions are **JWTs** (`jsonwebtoken`), signed with `JWT_SECRET`, 7-day
  expiry, sent as `Authorization: Bearer <token>`.
- Roles: `patient`, `vht` (Village Health Team), `clinic_staff`, `admin`.
  `middleware/auth.js` exports `requireRole(...roles)` for role-gated routes
  (e.g. only `vht`/`clinic_staff`/`admin` can update an SOS alert's status).

## 4. Encryption

Clinical notes in the `visits` table (`encrypted_notes` column) are encrypted
with **AES-256-GCM** (`middleware/encryption.js`). The key is a 32-byte value
stored as a 64-character hex string in `ENCRYPTION_KEY`. Notes are decrypted
only inside `GET /patients/me/history`, for the authenticated owner of the
record.

## 5. Full API reference

All request/response bodies are JSON unless noted otherwise. Authenticated
routes require `Authorization: Bearer <token>`.

### `POST /auth/register`
Create a new account.

**Body:**
```json
{
  "phone": "+256700111222",
  "password": "a-strong-password",
  "full_name": "Grace Namutebi",
  "role": "patient",
  "date_of_birth": "1990-04-12",
  "sex": "female",
  "district": "Mukono"
}
```
**Response `201`:**
```json
{ "token": "<jwt>", "user": { "id": 1, "phone": "+256700111222", "full_name": "Grace Namutebi", "role": "patient" } }
```

### `POST /auth/login`
**Body:** `{ "phone": "+256700111222", "password": "a-strong-password" }`
**Response `200`:** same shape as register.

### `GET /patients/me`
**Auth required.** Returns the authenticated user's profile.

### `GET /patients/me/history`
**Auth required.** Returns `{ visits, referrals, symptom_reports }` for the
authenticated patient. `visits[].notes` is decrypted server-side before being
returned.

### `GET /clinics/nearby?lat=&lng=&openOnly=true`
Public. Returns all clinics ranked by haversine distance from `(lat, lng)`,
each with a `distance_km` field. `openOnly=true` filters to `status='open'`.

### `GET /clinics/:id`
Public. Returns a single clinic record.

### `POST /symptoms`
**Auth required.** Runs the shared triage engine and stores the report.

**Body:**
```json
{
  "chestPain": false,
  "breathingDifficulty": false,
  "heavyBleeding": false,
  "lossOfConsciousness": false,
  "fever": true,
  "durationDays": 4,
  "painLocation": "abdomen"
}
```
**Response `201`:**
```json
{ "report_id": 12, "urgency_level": "soon", "advice": "Your symptoms have lasted a while..." }
```

**Triage rules** (identical on the USSD channel):
- `chestPain` OR `breathingDifficulty` OR `heavyBleeding` OR `lossOfConsciousness` → **emergency**
- `fever` AND `durationDays >= 3`, OR any symptom with `durationDays >= 7` → **soon**
- otherwise → **routine**

### `POST /sos`
**Auth required.** Auto-assigns the nearest clinic with `status='open'` and
logs the alert.

**Body:** `{ "lat": 0.3536, "lng": 32.7556 }`
**Response `201`:**
```json
{
  "alert_id": 5,
  "status": "dispatched",
  "assigned_clinic": { "id": 1, "name": "Mukono Health Centre IV", "distance_km": 0.4, "phone": "+256700000001" }
}
```

### `GET /sos/:id`
**Auth required.** Poll the live status of an SOS alert (`dispatched` →
`en_route` → `arrived`, or `cancelled`).

### `PATCH /sos/:id/status`
**Auth required, role `vht` / `clinic_staff` / `admin` only.**
**Body:** `{ "status": "en_route" }` (one of `dispatched`, `en_route`,
`arrived`, `cancelled`).

### `POST /ussd`
Webhook for Africa's Talking. Consumes
`application/x-www-form-urlencoded` with fields `sessionId`, `phoneNumber`,
`serviceCode`, `text`. Responds with plain text prefixed `CON ` (menu
continues) or `END ` (session ends), per the Africa's Talking USSD spec.

Menu map:
```
(empty)  -> root menu
1        -> register (name -> district -> 4-digit PIN -> confirm)
2        -> find nearby clinics (uses registered district as location proxy)
3        -> symptom checker (chest pain -> breathing -> fever -> duration -> result)
4        -> SOS (auto-assigns nearest open clinic using registered district)
5        -> check latest SOS status
```

## 6. Assumptions made

- USSD has no GPS, so district (chosen at registration) is used as a location
  proxy via a small `DISTRICT_COORDS` lookup table, and passed into the same
  `rankClinicsByDistance()` used by the REST routes — this is the one place
  app and USSD differ in *input*, not in *logic*.
- `clinic_staff` accounts are expected to be provisioned with a `clinic_id`
  by an admin (not self-registerable via public `/auth/register` in this
  version).
- SMS notifications (e.g. notifying a clinic of a new SOS alert) are not
  wired up in this version — the `AT_API_KEY` env var is reserved for that
  follow-up.
