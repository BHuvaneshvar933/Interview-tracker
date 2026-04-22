# Capsule


## Tech

- Backend: Spring Boot + MongoDB + JWT (`backend/`)
- Frontend: React + Vite + Tailwind (`frontend/`)

## Local Setup

### Backend

Environment variables:

- `MONGODB_URI` (default: `mongodb://localhost:27017/jobtracker`)
- `JWT_SECRET` (required; must be >= 32 chars)
- `PORT` (default: `5001`)

Run:

```bash
cd backend
mvn spring-boot:run
```

### Frontend

Optional environment variables:

- `VITE_API_BASE_URL` (default: `http://localhost:5001`)

Run:

```bash
cd frontend
npm install
npm run dev
```

## Analytics

- Basic: `GET /api/applications/analytics`
- Monthly: `GET /api/applications/analytics/monthly`
- Professional: `GET /api/applications/analytics/pro?from=YYYY-MM-DD&to=YYYY-MM-DD&groupBy=month|day&topN=10`
