# Tariqi

![Flutter](https://img.shields.io/badge/Flutter-3.x-blue)
![Node.js](https://img.shields.io/badge/Node.js-Express-green)
![MongoDB](https://img.shields.io/badge/Database-MongoDB%20Atlas-darkgreen)
![License](https://img.shields.io/badge/License-ISC-lightgrey)

## Demo

| Login, Ride Creation & Search | Ride Request, Pickup, Drop-off & Live Chat |
|--------------------------------|---------------------------------------------|
| <img src="assets/demo/demo.gif" width="250"> | <img src="assets/demo/demo1.gif" width="250"> |

Tariqi is a real-time ride-sharing platform built with Node.js, MongoDB, and Flutter. The backend handles concurrent ride sessions using WebSocket-based live tracking, geospatial driver-passenger matching via MongoDB 2dsphere indexing, and OTP-based phone authentication through Firebase. The system supports a full ride lifecycle — from ride creation and driver matching to live GPS tracking and in-ride chat — across simultaneous active rides.

---

## Architecture

- **Matching:** Geospatial queries using MongoDB 2dsphere indexing to find compatible drivers within a configurable radius, ranked by a priority queue for fast driver-passenger pairing under 700 ms
- **Real-time:** WebSocket connections for live location updates, ride status transitions, and in-ride chat across 50+ concurrent sessions at under 400 ms end-to-end latency
- **Auth:** OTP-based phone authentication via Firebase + JWT for all API route protection and session management
- **Backend:** MVC layered architecture — controllers, models, routes, middleware — with clean separation between business logic and data access
- **Mobile:** Flutter client with GetX state management, OpenStreetMap integration via flutter_map, and real-time UI updates driven by WebSocket events

---

## Features

### Phone Authentication
Secure OTP-based phone authentication via Firebase, with JWT-protected API routes for all subsequent requests.

### Ride Creation
Drivers create rides with pickup location, destination, and available seats — stored with geospatial coordinates for matching queries.

### Geospatial Driver-Passenger Matching
Passengers discover available rides using MongoDB 2dsphere geospatial queries. Matches are ranked by proximity and route compatibility.

### Driver Acceptance Flow
Drivers receive real-time join requests via WebSocket and accept or decline passengers in real-time.

### Live Ride Tracking
Active rides broadcast location updates via WebSocket to all participants, rendered on an interactive map.

### In-Ride Chat
Driver and passengers communicate through a ride-specific WebSocket chat channel during active rides.

---

## Tech Stack

### Backend
- Node.js + Express.js
- MongoDB Atlas + Mongoose (with 2dsphere geospatial indexing)
- WebSockets (real-time location, status, chat)
- JWT Authentication
- Firebase Admin SDK (OTP verification)

### Frontend
- Flutter + Dart
- GetX (state management and routing)
- flutter_map (OpenStreetMap integration)
- Firebase Authentication (OTP)
- Dio (HTTP client)
- Geolocator

---

## Project Structure

### Backend
```
tariqi-backend/
├── controllers/       # Route handlers and business logic
├── models/            # Mongoose schemas (User, Ride, JoinRequest)
├── routes/            # Express route definitions
├── middleware/        # JWT auth, error handling
├── config/            # Database and Firebase config
└── utils/             # WebSocket handlers, helpers
```

### Frontend
```
tariqi-frontend/
├── lib/
│   ├── controller/    # GetX controllers
│   ├── models/        # Data models
│   ├── view/          # UI screens
│   ├── services/      # API and WebSocket services
│   ├── const/         # App constants
│   └── utils/         # Helpers and utilities
```

---

## Getting Started

### Prerequisites
- Node.js v18+
- Flutter SDK 3.x
- MongoDB Atlas account
- Firebase project with Phone Authentication enabled

### Backend Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/PeterKameel18/tariqi.git
   cd tariqi/tariqi-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   Fill in the values in `.env` (see Environment Variables section below).

4. **Start the server**
   ```bash
   npm run dev
   ```
   Backend runs on: `http://localhost:3000`

### Frontend Setup

1. **Navigate to the frontend directory**
   ```bash
   cd tariqi/tariqi-frontend
   ```

2. **Install dependencies**
   ```bash
   flutter pub get
   ```

3. **Run the app**
   ```bash
   flutter run
   ```

---

## Environment Variables

Create a `.env` file inside `tariqi-backend/`:

```env
PORT=3000
MONGO_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_jwt_secret_key
```

See `.env.example` for the full reference.

---

## API Reference

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/send-otp` | Send OTP to phone number via Firebase |
| POST | `/api/auth/verify-otp` | Verify OTP and issue JWT |
| POST | `/api/auth/login` | Login with credentials |
| POST | `/api/auth/signup` | Register new user |

### Rides
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/rides/create` | Create a new ride (driver) |
| POST | `/api/client/get/rides` | Search available rides by location |
| GET | `/api/driver/active-ride` | Get driver's current active ride |

### Join Requests
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/joinRequests` | Passenger requests to join a ride |
| PATCH | `/api/joinRequests/:id` | Driver accepts or declines a request |

### Real-time Events (WebSocket)
| Event | Direction | Description |
|-------|-----------|-------------|
| `location_update` | Client → Server → Clients | Broadcast live GPS coordinates |
| `ride_status_change` | Server → Clients | Notify status transitions |
| `chat_message` | Client → Server → Clients | In-ride chat delivery |
| `join_request` | Server → Driver | Notify driver of new passenger request |

---

## License

ISC License
