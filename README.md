# Grocery List Manager 🛒

A minimal, full-stack workshop application built with **React**, **Node.js (Express)**, **Prisma (SQLite)**, and passwordless authentication powered by **Minimoth OTP**.

---

## ✨ Features & Constraints

* **Strictly Minimal Workshop Architecture:**
  * **Frontend (3 Pages):**
    1. Phone & OTP Authentication (Minimoth API)
    2. Grocery Lists Overview (Create & view lists)
    3. List Details & Items (Add items with quantity and check them off)
  * **Backend (5 API Endpoints):**
    1. `POST /api/auth/send-otp` - Send OTP via Minimoth
    2. `POST /api/auth/verify-otp` - Verify OTP & login/register user
    3. `GET /api/lists` - Fetch lists for user (with items)
    4. `POST /api/lists` - Create a new grocery list
    5. `POST /api/items` - Add a new grocery item to a list
  * **Database (3 Models):** `User`, `List`, and `Item` stored in local SQLite database.
* **OTP Authentication:** WhatsApp-first OTP delivery with automatic SMS fallback via [Minimoth](https://minimoth.dev).
* **Responsive UI:** Custom organic market aesthetic with emerald/mint palettes, card layouts, and mobile-friendly design.

---

## 📁 Project Structure

```
grocery-list-manager/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma      # 3 Models: User, List, Item
│   ├── .env                   # Minimoth API Key & DB URL
│   ├── .env.example
│   ├── package.json
│   └── server.js              # Express server with 5 API endpoints
├── frontend/
│   ├── src/
│   │   ├── App.jsx            # 3 Frontend Pages (Auth, Lists, Detail)
│   │   ├── index.css          # Clean custom CSS styling
│   │   └── main.jsx
│   ├── .env                   # Frontend API URL configuration
│   ├── .env.example
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
* [Node.js](https://nodejs.org/) (v18 or higher)
* [npm](https://www.npmjs.com/)

---

### 1. Backend Setup

1. Open a terminal and navigate to `backend`:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   Copy `.env.example` to `.env` (or verify that `.env` exists):
   ```env
   PORT=4000
   DATABASE_URL="file:./dev.db"
   MINIMOTH_API_KEY=mm_live_d600c6e9962d16a6ae4da405b01267c68f45ae96b794e38d775455957b406a31650e3ca3eccb4fd0682b1c37a77cfa0b
   ```

4. Push the database schema to SQLite:
   ```bash
   npx prisma db push
   ```

5. Start the backend server:
   ```bash
   npm start
   ```
   *The server will run on [http://localhost:4000](http://localhost:4000).*

---

### 2. Frontend Setup

1. Open a second terminal and navigate to `frontend`:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   Verify `.env`:
   ```env
   VITE_API_URL=http://localhost:4000/api
   ```

4. Start the frontend development server:
   ```bash
   npm run dev
   ```
   *The application will open on [http://localhost:5173](http://localhost:5173).*

---

## 📡 API Reference

| Method | Endpoint | Description | Payload / Query |
|---|---|---|---|
| `POST` | `/api/auth/send-otp` | Sends OTP to phone via Minimoth | `{ "phone": "+919876543210" }` |
| `POST` | `/api/auth/verify-otp` | Verifies code & registers/logs in user | `{ "phone": "+919876543210", "code": "123456" }` |
| `GET` | `/api/lists` | Gets all lists and items for user | `?userId=1` |
| `POST` | `/api/lists` | Creates a new grocery list | `{ "userId": 1, "title": "Weekly Market" }` |
| `POST` | `/api/items` | Adds an item to a list | `{ "listId": 1, "name": "Almond Milk", "quantity": "2 pk" }` |

---

## 🔐 Authentication Flow

1. User enters mobile number with country code (e.g. `+919876543210`).
2. Backend calls Minimoth API (`https://api.minimoth.dev/v1/otp/send`) using `MINIMOTH_API_KEY`.
3. Minimoth delivers a 6-digit OTP to the user's WhatsApp (with SMS fallback).
4. User enters the 6-digit code.
5. Backend verifies the code via `https://api.minimoth.dev/v1/otp/verify`.
6. On success, the user is created/retrieved in SQLite, authenticated, and redirected to their grocery lists.
