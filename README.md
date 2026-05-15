# UrbanLens: AI-Powered Civic Infrastructure Tracker

UrbanLens is a crowdsourced, AI-driven platform designed to bridge the gap between citizens and municipal authorities. By leveraging computer vision and spatial data, the platform streamlines the reporting, validation, and resolution of civic issues like potholes, garbage dumps, and broken streetlights.

## Team Details
- **Team Name:** Team Techno 5
- **Members:**
  - Sneha M N : 1BM25MC090
  - Sharanya M P : 1BM25MC089
  - Shreya Karn : 1BM25MC115
  - Pavan R Shetty : 1BM25MC064
  - Srujan J K  Upadhya : 1BM25MC093
  - Tarun P : 1BM25MC100
  - Puttamma M : 1BM25MC069
  - Tejdeep B N : 1BM25MC102

## Tech Stack
- **Frontend:** React Native (Expo SDK 54), Expo Router, TypeScript
- **Backend:** Node.js, Express.js
- **Database:** PostgreSQL with PostGIS (Spatial Data extension)
- **AI/ML:** Google Gemini 2.0 Flash (Vision API) for automated issue classification and severity detection
- **Styling:** Glassmorphism UI with Vanilla CSS/StyleSheet

## Key Features
- **AI Image Analysis:** Automatically detects issue types (pothole, garbage, etc.) and severity from photos.
- **Geo-Deduplication:** Uses PostGIS `ST_DWithin` to merge reports within a 10m radius and prevent duplicate tickets.
- **Ward-Scoped Routing:** Automatically routes issues to the specific municipal ward officer.
- **Contractor Bidding System:** Transparent system where contractors bid on repairs and officials assign work based on cost and rating.
- **Gamification:** Citizens earn points and badges (Bronze, Silver, Gold) for verified reporting.
- **Location Validation:** Municipal officers must be within 100m of the reported issue to upload an "after-repair" photo.

## Setup Instructions

### Prerequisites
- **Node.js:** v18 or higher
- **PostgreSQL:** v14 or higher (with PostGIS installed)
- **Expo CLI:** `npm install -g expo-cli`

### 1. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables:
   Create a `.env` file in the `backend/` folder:
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=urbanlens
   DB_USER=postgres
   DB_PASSWORD=your_password
   JWT_SECRET=your_jwt_secret
   GEMINI_API_KEY=your_gemini_api_key
   PORT=5000
   ```
4. Initialize and Seed the database:
   ```bash
   npm run init-db
   npm run seed
   ```
5. Start the server:
   ```bash
   npm start
   ```

### 2. Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure API URL:
   Update `frontend/config/env.ts` with your local IP:
   ```typescript
   export const ENV = {
     API_BASE_URL: "http://localhost:5000/api",
   };
   ```
4. Start the app:
   ```bash
   npx expo start
   ```
   *Note: Use 'w' to open in browser (web) or scan the QR code with the Expo Go app.*

## Dependencies
- **Backend:** `express`, `pg`, `bcrypt`, `jsonwebtoken`, `multer`, `@google/generative-ai`, `uuid`
- **Frontend:** `expo`, `expo-router`, `react-native-web`, `expo-image-picker`, `expo-location`

## Repository Structure
- `/backend`: Node.js/Express server and API routes
- `/backend/db`: Database initialization and seeding scripts
- `/backend/uploads`: Storage for user-reported and repair images
- `/frontend/app`: Expo Router screens (Citizen, Officer, Admin, Contractor portals)
- `/frontend/components`: Reusable UI components