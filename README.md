# STHIRA | AI-Powered Fitness & Wellness Platform

**Track your progress. Understand your nutrition. Train smarter.**

STHIRA is a full-stack fitness and wellness platform built to bring workout tracking, nutrition management, progress analytics, and AI-assisted coaching into one application. It combines a React-based interface, a Node.js and Express backend, PostgreSQL data storage, and AI integrations to help users make more informed fitness decisions.

The project focuses on connecting practical fitness tracking with intelligent features, including AI-assisted food recognition, nutrition lookup, and personalized wellness recommendations.

## ✨ Key Features

### 🔐 Secure Authentication & Data Isolation
- Authenticated access to protected features.
- Server-side identity verification and authorization for user-specific records.
- Data isolation designed to prevent users from accessing one another's information.

### 🤖 AI Fitness Coach
- Personalized fitness and nutrition guidance based on available user data.
- Recommendations informed by logged meals, workout activity, and progress information where supported.
- Fallback recommendations to preserve basic coaching functionality when the external AI service is unavailable.

### 📸 Gemini AI Food Snap
- Analyze food images using Google's Gemini AI.
- Identify likely food items and obtain estimated nutritional information.
- Simplify meal logging by connecting image-based analysis with nutrition tracking.
- Combine AI-generated estimates with nutrition data where supported by the application.

*AI-generated food recognition and nutritional estimates may not be exact and should be reviewed before logging.*

### 🥗 Nutrition Management
- Search food items using the USDA FoodData Central API.
- Retrieve available nutritional information.
- Record meals and monitor dietary intake.
- Connect food logging with the application's broader wellness workflow.

### 🏋️ Workout & Activity Tracking
- Record workouts and physical activities.
- Track workout completion and estimated calories burned.
- Maintain activity history for progress monitoring.

### 📊 Progress Analytics
- Monitor fitness activity and progress through a centralized dashboard.
- Review available workout, nutrition, and wellness records.
- Present tracked information in a structured, accessible interface.

## 🧰 Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React, JavaScript |
| Backend | Node.js, Express.js |
| Database | PostgreSQL |
| API architecture | REST APIs |
| AI integration | Google Gemini API |
| Nutrition data | USDA FoodData Central API |
| Development tools | Git, GitHub, npm |

*Ollama can be listed as an additional technology once local model integration is implemented and verified.*

## 🏛️ System Architecture

```text
                    STHIRA
                      |
             React Frontend
                      |
                REST APIs
                      |
           Node.js + Express
                      |
        +-------------+-------------+
        |             |             |
   Authentication   AI Services   Nutrition API
        |             |             |
        |        Gemini AI       USDA FoodData
        |             |             |
        +-------------+-------------+
                      |
                 PostgreSQL
```

The frontend communicates with the backend through REST APIs. The backend handles application logic, verifies access to protected resources, interacts with PostgreSQL, and connects to external AI and nutrition services as configured.

## 🚀 Getting Started

### Prerequisites

- Node.js and npm
- PostgreSQL
- Git
- API keys for the external services you intend to use

### 1. Clone the repository

```bash
git clone https://github.com/oliraman9031/Fitness-Tracker.git
cd Fitness-Tracker
```

Switch to the branch containing the latest implementation:

```bash
git switch feature/ai-fitness-coach
git pull origin feature/ai-fitness-coach
```

### 2. Install backend dependencies

```bash
cd server
npm install
```

### 3. Configure environment variables

Create a `.env` file in the backend directory. Use the exact variable names expected by your code.

Example:

```env
PORT=5000
DATABASE_URL=your_database_connection_string
GEMINI_API_KEY=your_gemini_api_key
USDA_API_KEY=your_usda_api_key
```

These names are illustrative; your implementation may use different database configuration variables.

**Security:** Never commit API keys, passwords, or production credentials to GitHub. Add `.env` to `.gitignore`.

### 4. Configure PostgreSQL

Create the database and apply the schema or migrations provided by the project. Verify that the required tables and database credentials are configured correctly.

### 5. Run the backend

From the `server` directory, use the appropriate script from `package.json`. For example:

```bash
npm run dev
```

### 6. Run the frontend

Open a separate terminal and navigate to the frontend directory:

```bash
npm install
npm run dev
```

Use the local URL displayed in the terminal to open the application.

*The commands above assume the corresponding npm scripts exist. Follow the actual project structure and `package.json` files if your setup differs.*

## 🔌 API Overview

The application includes backend functionality for fitness records, nutrition tracking, and food lookup. Example routes include:

| Endpoint | Purpose |
|---|---|
| `/api/progress` | Fitness progress records |
| `/api/diet` | Diet-related records |
| `/api/health` | Health-related records |
| `/api/food/search?query=chicken` | Search for food items |
| `/api/food/:fdcId` | Retrieve food details |

The exact request methods, authentication requirements, and response formats are defined by the backend implementation.

## 🔒 Security & Reliability

STHIRA's backend architecture is designed to support responsible handling of personal fitness data.

- Verify authenticated users on protected endpoints.
- Enforce user-level authorization for database operations.
- Keep API credentials on the server.
- Validate incoming requests and handle errors consistently.
- Provide fallback behavior for supported AI features when external services are unavailable.
- Avoid exposing sensitive user data in application logs.

## 🗺️ Development Roadmap

Potential areas for future development include:

- Machine-learning-based fitness trend analysis.
- Improved personalized workout and nutrition recommendations.
- More advanced progress visualizations.
- Automated backend and frontend testing.
- Expanded API documentation and deployment automation.

## 🎯 Engineering Focus

STHIRA brings together several practical software engineering concepts:

- Full-stack application development.
- REST API design and integration.
- Relational database modeling with PostgreSQL.
- Authentication and authorization.
- Integration of external AI services.
- Third-party nutrition data integration.
- Error handling and fallback behavior.

## 👨‍💻 Author

**Raman Oli**

GitHub: [@oliraman9031](https://github.com/oliraman9031)

Repository: [STHIRA — Fitness Tracker](https://github.com/oliraman9031/Fitness-Tracker)

---

*STHIRA — bringing fitness tracking, nutrition intelligence, and AI-assisted wellness together in one platform.*