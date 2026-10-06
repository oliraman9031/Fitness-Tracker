# STHIRA — Fitness & Wellness Tracker

STHIRA is a full-stack fitness and wellness platform designed to help users organize their fitness journey in one place. It provides a foundation for tracking progress, managing workouts and nutrition, and visualizing fitness-related data through a simple web interface.

## 🚀 Features

* 📊 **Progress Tracking** — Record and monitor fitness progress over time.
* 🏋️ **Workout Planning** — Organize workout-related information and routines.
* 🥗 **Nutrition Planning** — Maintain meal and nutrition-related information.
* 📈 **Progress Visualization** — View fitness progress through charts and data visualizations.
* 👤 **User Profile** — Store user-related fitness information.
* 🔌 **REST API** — Backend APIs for managing application data.
* 🗄️ **PostgreSQL Database** — Persistent storage for application data.
* 📱 **Responsive Interface** — Designed to provide a clean experience across different screen sizes.

## 🛠️ Tech Stack

### Frontend

* React.js
* JavaScript
* CSS / Tailwind CSS

### Backend

* Node.js
* Express.js
* REST APIs

### Database

* PostgreSQL

### Development Tools

* Git & GitHub
* Postman
* VS Code
* npm

## 🏗️ Project Architecture

```text
STHIRA/
│
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Application pages
│   │   └── ...
│   └── package.json
│
├── server/                 # Node.js + Express backend
│   ├── routes/             # API routes
│   ├── controllers/        # Request handling logic
│   ├── models/             # Database-related logic
│   ├── db/                 # Database configuration
│   └── server.js           # Backend entry point
│
└── README.md
```

> The exact folder structure may vary depending on the current development branch.

## ⚙️ Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/oliraman9031/Fitness-Tracker.git
cd Fitness-Tracker
```

### 2. Install frontend dependencies

```bash
cd client
npm install
```

### 3. Install backend dependencies

Open another terminal:

```bash
cd server
npm install
```

### 4. Configure environment variables

Create a `.env` file inside the `server` directory.

Example:

```env
PORT=5000

DB_USER=your_postgres_username
DB_HOST=localhost
DB_NAME=sthira
DB_PASSWORD=your_postgres_password
DB_PORT=5432
USDA_API_URL=https://api.nal.usda.gov/fdc/v1
USDA_API_KEY=your_usda_api_key
```

Do **not** commit your `.env` file to GitHub.

### 5. Set up PostgreSQL

Create a PostgreSQL database named:

```text
sthira
```

Then create the required tables used by the backend.

### 6. Start the backend

From the `server` directory:

```bash
npm run dev
```

The backend should run on:

```text
http://localhost:5000
```

### 7. Start the frontend

From the frontend directory:

```bash
npm run dev
```

The frontend will then be available at `http://localhost:5173`.

## 🔌 API

The backend provides REST API endpoints for application functionality.

Example progress endpoint:

```text
GET /api/progress
```

The API communicates with the PostgreSQL database to retrieve and manage fitness-related data.

### USDA food logging

The Diet page searches USDA foods, displays detailed nutrition, and adds selected foods to a meal. Food quantities use the serving unit supplied by USDA; nutrients are scaled by the entered amount. Today's nutrition totals are shown on both the Diet page and Dashboard.

The backend creates the USDA food catalog and search-cache tables at startup, and adds the food relationship and nutrition fields to the existing `food_logs` table. Search results are cached in PostgreSQL for 24 hours.

Relevant endpoints:

```text
GET  /api/food/search?query=chicken
GET  /api/food/:fdcId
POST /api/food/save
POST /api/diet
GET  /api/diet/:userId
```

Start the backend and frontend in separate terminals, then open `http://localhost:5173/diet`.

## 📊 Progress Tracking

STHIRA includes a progress-tracking system that allows fitness data to be stored and visualized over time.

For example:

```text
Date        Weight
-------------------
January     76 kg
February    74.5 kg
March       73 kg
April       72 kg
May         71 kg
June        70.4 kg
```

The frontend can use this information to generate progress charts and provide users with a clearer view of their fitness journey.

## 🎯 Project Goals

STHIRA was designed with the following goals:

* Build a practical full-stack application.
* Provide a centralized fitness-tracking platform.
* Use RESTful APIs for frontend-backend communication.
* Store fitness data using PostgreSQL.
* Present progress using meaningful visualizations.
* Maintain a modular and scalable project structure.
* Create a foundation for future intelligent fitness features.

## 🔮 Future Improvements

Potential future improvements include:

* 🔐 User authentication and authorization
* 🤖 AI-based workout recommendations
* 🥗 Personalized nutrition recommendations
* 📊 Advanced fitness analytics
* 📅 Workout scheduling
* 🔔 Reminders and notifications
* 📱 Mobile application
* ☁️ Cloud deployment
* 🧠 ML-based fitness insights

## 📚 Learning Outcomes

This project demonstrates practical experience with:

* Full-stack web development
* React component development
* Node.js and Express
* REST API design
* PostgreSQL database integration
* CRUD operations
* Frontend-backend communication
* Data visualization
* Git and GitHub workflow
* Environment configuration

## 👨‍💻 Author

**Raman Oli**

GitHub: [@oliraman9031](https://github.com/oliraman9031)

## 📄 License

This project is intended for educational and development purposes.
