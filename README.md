# STHIRA — AI-Powered Fitness & Wellness Tracker

**STHIRA** is a full-stack fitness and wellness application designed to help users track their health activities, monitor nutrition, manage workouts, and receive personalized fitness guidance. It combines a modern web interface with nutrition data and AI-powered features to support more informed fitness decisions.

## ✨ Features

### 🔐 Authentication & Data Privacy
- User authentication and protected application features.
- User-specific data access and isolation.
- Backend authorization to help prevent users from accessing other users' records.

### 🤖 AI Fitness Coach
- Personalized fitness and nutrition guidance.
- Recommendations based on available user activity, workout, and food-log data.
- Fallback recommendations when the configured AI service is unavailable.

### 📸 Gemini AI Food Snap
- Analyze food images using Gemini AI.
- Estimate the food items and their nutritional information.
- Help users log meals more conveniently.
- Treat image-based nutrition values as estimates, not exact measurements.

### 🥗 Nutrition Tracking
- Search for foods using the USDA FoodData Central API.
- Retrieve available nutrition information for food items.
- Record meals and monitor nutritional intake.

### 🏋️ Workout Tracking
- Record workouts and physical activities.
- Track workout completion and estimated calories burned.
- Maintain activity records to support fitness monitoring.

### 📊 Progress Dashboard
- View fitness and activity summaries.
- Monitor progress using available health and workout data.
- Review logged meals and nutrition information.

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| React | Frontend user interface |
| Node.js | Backend runtime |
| Express.js | REST API and server |
| PostgreSQL | Relational database |
| JavaScript | Application logic |
| Gemini API | AI-powered food image analysis |
| USDA FoodData Central API | Food and nutrition data |
| Ollama | Optional local AI experimentation, if configured |

## 🏗️ Architecture

```text
React Frontend
      |
      | HTTP / REST API
      v
Node.js + Express Backend
      |
      +---- Authentication & Authorization
      |
      +---- AI Fitness Coach
      |
      +---- Gemini Food Image Analysis
      |
      +---- USDA Food Search
      |
      v
PostgreSQL Database
```

External AI and nutrition services are accessed through the backend where configured. Sensitive API keys should remain on the server rather than being exposed in frontend code.

## 🚀 Getting Started

### Prerequisites

Install the following before running the project:

- Node.js and npm
- PostgreSQL
- Git
- API credentials for the external services you want to enable

### 1. Clone the repository

```bash
git clone https://github.com/oliraman9031/Fitness-Tracker.git
cd Fitness-Tracker
```

Switch to the development branch if that is where your latest changes are located:

```bash
git switch feature/ai-fitness-coach
git pull origin feature/ai-fitness-coach
```

### 2. Set up the backend

```bash
cd server
npm install
```

Create a `.env` file in the backend directory using the environment variable names expected by your code.

Example configuration:

```env
PORT=5000
DATABASE_URL=your_postgresql_connection_string
GEMINI_API_KEY=your_gemini_api_key
USDA_API_KEY=your_usda_api_key
```

**Important:** These are example variable names. Check your backend configuration and use the exact names required by your implementation. Never commit real credentials to GitHub.

### 3. Configure the database

Create your PostgreSQL database and apply the schema or migrations included in the project.

For example, if your database is named `sthira`, ensure the database configuration points to it and all required tables have been created.

### 4. Start the backend

From the `server` directory, run the command configured in your `package.json`, commonly:

```bash
npm run dev
```

If the project does not have a `dev` script, check the available scripts in `package.json`.

### 5. Start the frontend

Open another terminal, navigate to the frontend directory, and install its dependencies:

```bash
npm install
```

Start the frontend using the script defined in its `package.json`, commonly:

```bash
npm run dev
```

Open the local URL printed in your terminal.

## 🔌 API Integration

The backend may expose endpoints for the following features, depending on the current implementation:

| Feature | Example endpoint |
|---|---|
| Progress tracking | `/api/progress` |
| Diet tracking | `/api/diet` |
| Health records | `/api/health` |
| Food search | `/api/food/search?query=chicken` |
| Food details | `/api/food/:fdcId` |

Use the actual routes defined in the backend as the source of truth.

## 🔒 Security Considerations

- Keep API keys and database credentials in environment variables.
- Verify user identity on the backend before reading or modifying user-specific records.
- Validate and sanitize incoming API requests.
- Apply authorization checks to all protected endpoints.
- Avoid exposing sensitive health or personal information in logs.
- Use HTTPS and secure deployment configuration in production.

## 🧠 Future Improvements

- Machine-learning-based activity and progress insights.
- Improved personalized recommendations using historical fitness data.
- Nutrition prediction and meal-planning improvements.
- More comprehensive fitness analytics and visualizations.
- Automated testing, API documentation, and deployment pipelines.

## 🎯 Project Goal

STHIRA aims to bring fitness tracking, nutrition monitoring, and AI-assisted wellness guidance together in one application. The project demonstrates full-stack development, database integration, REST API design, and practical AI service integration.

## 👨‍💻 Author

**Raman Oli**

- GitHub: [@oliraman9031](https://github.com/oliraman9031)
- Project: [STHIRA Fitness Tracker](https://github.com/oliraman9031/Fitness-Tracker)

---

*Built as a full-stack project exploring AI-assisted fitness, nutrition tracking, and personalized wellness technology.*
