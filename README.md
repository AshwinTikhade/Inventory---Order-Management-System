# Production-Ready Containerized Inventory & Order Management System

A full-stack, containerized **Inventory & Order Management System** designed for businesses to manage products, customer directories, and transactional orders with atomic stock checks, live count analytics, and a premium dark glassmorphic responsive user interface.

---

## 🚀 Key Features

### 📦 Product Catalog Management
- **Full CRUD Support**: Add new products, browse catalog items, update pricing or stock, and delete items.
- **Relational Integrity**: SKU codes are strictly unique. Item stock levels are prevented from becoming negative.

### 👥 Customer Directory
- **Customer Profiles**: Record customer names, email addresses, and phone contacts.
- **Unique Records**: Strict email uniqueness constraints prevent duplicate buyer registrations.

### 🛒 Fulfill Order Builder
- **Multi-Line Transactions**: Compile orders containing multiple distinct products in real-time.
- **Real-Time Stock Checking**: Enforces inventory boundary conditions at the input line level, blocking purchases that exceed active stock.
- **Auto-Pricing & Totals**: The backend automatically aggregates unit prices and calculates grand totals, preventing client-side tampering.
- **Atomic Stock Adjustments**: Placing an order instantly deducts items from active stock. Deleting or cancelling an order automatically returns the items to stock.

### 📊 Interactive Analytics Dashboard
- **Count Metrics**: Displays live count cards for Total Products, Total Customers, and Fulfillments.
- **Low Stock Alerts**: Color-coded notifications for items running critically low (< 10 units) or fully out-of-stock.

---

## 🛠️ Technology Stack

- **Frontend**: React (Vite), JavaScript, Vanilla CSS (Dark Glassmorphic design).
- **Backend API**: Python, FastAPI, SQLAlchemy, Uvicorn.
- **Databases**:
  - **Local Development**: SQLite (`inventory.db`) for rapid offline testing.
  - **Production / Containers**: PostgreSQL (`postgres:15-alpine`).
- **Orchestration**: Docker, Docker Compose.
- **Version Control**: Git.

---

## 📂 Project Structure

```text
├── backend/
│   ├── app/
│   │   ├── config.py         # Pydantic environment configuration
│   │   ├── database.py       # SQLAlchemy database connection setup
│   │   ├── main.py           # FastAPI server and CRUD API endpoints
│   │   ├── models.py         # SQLAlchemy ORM Database Schemas
│   │   └── schemas.py        # Pydantic Request/Response validation models
│   ├── Dockerfile            # Lightweight Python slim image setup
│   ├── requirements.txt      # Production Python dependencies (Postgres)
│   └── requirements-local.txt# Local Python dependencies (SQLite)
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx           # Main React UI view and modal handlers
│   │   ├── index.css         # Custom dark slate styling sheet
│   │   └── main.jsx          # React app DOM bootstrap
│   ├── Dockerfile            # Node.js alpine development image
│   ├── index.html            # Vite entry point html
│   └── vite.config.js        # Vite dev server and polling watcher
│
├── .env.example              # Template for environment settings
├── docker-compose.yml        # Services orchestration (DB, API, Client)
└── README.md                 # Project documentation (this file)
```

---

## ⚙️ Configuration (.env)

The root directory contains a `.env` file for credentials. The backend automatically switches engines depending on the configuration:

```env
# Database Configuration
POSTGRES_USER=inventory_user
POSTGRES_PASSWORD=inventory_secret_123
POSTGRES_DB=inventory_management

# API Configuration
# DATABASE_URL=postgresql://inventory_user:inventory_secret_123@db:5432/inventory_management
ENV=dev
```

* **Local dev**: Keep `DATABASE_URL` commented out to fall back automatically to standard local **SQLite** (`backend/inventory.db`).
* **Docker Compose**: The compose stack automatically overrides `DATABASE_URL` to point to the dedicated PostgreSQL service container inside the isolated bridge network.

---

## 💻 How to Run Locally (Without Docker)

### Prerequisites
- Python 3.10+
- Node.js 18+

### Step 1: Launch the Backend Service
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Activate your python virtual environment:
   ```bash
   # Windows (PowerShell)
   venv\Scripts\Activate.ps1
   
   # macOS/Linux
   source venv/bin/activate
   ```
3. Run the FastAPI development server:
   ```bash
   python -m uvicorn app.main:app --port 8000
   ```
   *The API will start at `http://127.0.0.1:8000`. Swagger documentation is available at `http://127.0.0.1:8000/docs`.*

### Step 2: Launch the Frontend Client
1. Open a new terminal tab and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Launch Vite dev server:
   ```bash
   # Bypassing Windows CMD shell space wrappers:
   node node_modules/vite/bin/vite.js --host 0.0.0.0
   ```
   *The React interface will run at `http://localhost:5173/`.*

---

## 🐳 How to Run with Docker Compose

Ensure Docker Desktop is active on your machine, then run:

1. Navigate to the root directory containing `docker-compose.yml`.
2. Start the service stack:
   ```bash
   docker compose up --build
   ```
This command automatically orchestrates:
- **PostgreSQL Database** running on port `5432` with named volume persistence.
- **FastAPI API Server** running on port `8000` (hooked directly into the PG bridge).
- **React Frontend Client** running on port `5173`.

To stop the containers and keep data intact:
```bash
docker compose down
```

---

## 🌐 Deployment Instructions

### 1. Backend & PostgreSQL Deployment (Render / Railway)
- **Database**: Spin up a managed PostgreSQL database. Copy the connection string.
- **API Server**: Link your GitHub repository. Select Docker as the environment.
- Add environment variables:
  - `DATABASE_URL` = `<your-managed-postgres-connection-string>`
  - `ENV` = `production`

### 2. Frontend Deployment (Vercel / Netlify)
- Link the `frontend/` directory to Vercel/Netlify.
- Set build command to `npm run build` and output directory to `dist`.
- Add environment variables:
  - `VITE_API_URL` = `<your-deployed-backend-api-url>`
