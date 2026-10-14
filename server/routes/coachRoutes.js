
const express = require("express");
const OpenAI = require("openai");
const pool = require("../database");

const router = express.Router();

const AI_PROVIDER = (process.env.AI_PROVIDER || "ollama").toLowerCase();
const OLLAMA_BASE_URL = (
  process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434"
).replace(/\/+$/, "");
const AI_MODEL =
  process.env.AI_MODEL ||
  (AI_PROVIDER === "openai"
    ? process.env.OPENAI_MODEL || "gpt-4.1-mini"
    : "qwen2.5:3b");
const openai = AI_PROVIDER === "openai" && process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const coachInstructions = `
You are the STHIRA fitness and nutrition assistant.
Return valid JSON only.

Use this structure:
{
  "activityRecommendations": [
    {"name":"", "durationMinutes": 0, "reason": ""}
  ],
  "mealSuggestions": [
    {"meal":"", "suggestion": ""}
  ],
  "threeDayMealPlan": [
    {
      "day": 1,
      "meals": [
        {"meal":"Breakfast", "suggestion": ""},
        {"meal":"Lunch", "suggestion": ""},
        {"meal":"Dinner", "suggestion": ""}
      ]
    }
  ],
  "explanation": "",
  "safetyNotes": ""
}

Rules:
- Give practical, beginner-friendly recommendations.
- Never tell a user to burn off food calories or skip meals to compensate.
- Consider the logged food intake and activity history as context, but never
  calculate an exercise target from food calories or describe exercise as
  earning or cancelling food.
- Do not prescribe calorie deficits, extreme exercise, or restrictive diets.
- Food intake and calorie-burn estimates are not exact measures of fitness.
- Respect the user's stated food preference.
- Do not invent USDA nutrient values.
- Suggest balanced meals and reasonable activity options.
- Always return a balanced three-day meal plan suitable for the stated diet
  preference. If an activity was not completed or only partly completed,
  make the plan supportive and practical for the coming days, without
  restricting food or suggesting extra exercise as compensation.
- If the user reports fatigue, pain, or inability to complete activity,
  recommend rest or a gentler option.
- The plan is general information, not medical advice.
`;

async function requestOllamaRecommendations(context) {
  let response;

  try {
    response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: AI_MODEL,
        stream: false,
        format: "json",
        options: { temperature: 0.3 },
        messages: [
          { role: "system", content: coachInstructions },
          { role: "user", content: JSON.stringify(context) },
        ],
      }),
      signal: AbortSignal.timeout(120000),
    });
  } catch (error) {
    const unavailable = new Error(
      `Cannot reach Ollama at ${OLLAMA_BASE_URL}. Install and start Ollama, then download the model with "ollama pull ${AI_MODEL}".`
    );
    unavailable.code =
      error.name === "TimeoutError" || error.name === "AbortError"
        ? "ollama_timeout"
        : "ollama_unavailable";
    throw unavailable;
  }

  const responseText = await response.text();
  let data;

  try {
    data = JSON.parse(responseText);
  } catch {
    const invalidResponse = new Error(
      `Ollama returned an invalid response (HTTP ${response.status}).`
    );
    invalidResponse.status = response.status;
    throw invalidResponse;
  }

  if (!response.ok) {
    const providerError = new Error(
      data.error || `Ollama request failed (HTTP ${response.status}).`
    );
    providerError.status = response.status;
    providerError.code = response.status === 404 ? "model_not_found" : undefined;
    throw providerError;
  }

  if (typeof data.message?.content !== "string" || !data.message.content) {
    throw new Error("Ollama returned an empty recommendation.");
  }

  return data.message.content;
}

function validDate(date) {
  return typeof date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    !Number.isNaN(Date.parse(`${date}T00:00:00Z`));
}

// Get a combined daily summary.
router.get("/daily-summary/:userId", async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const date = req.query.date || new Date().toISOString().slice(0, 10);

    if (!Number.isInteger(userId) || userId <= 0 || !validDate(date)) {
      return res.status(400).json({
        message: "Valid user ID and date (YYYY-MM-DD) are required.",
      });
    }

    const [nutrition, workouts] = await Promise.all([
      pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE is_consumed) AS consumed_food_count,
           COALESCE(SUM(calories) FILTER (WHERE is_consumed), 0) AS calories,
           COALESCE(SUM(protein) FILTER (WHERE is_consumed), 0) AS protein,
           COALESCE(SUM(carbs) FILTER (WHERE is_consumed), 0) AS carbs,
           COALESCE(SUM(fat) FILTER (WHERE is_consumed), 0) AS fat,
           COALESCE(SUM(fiber) FILTER (WHERE is_consumed), 0) AS fiber,
           COALESCE(SUM(sugar) FILTER (WHERE is_consumed), 0) AS sugar,
           COALESCE(SUM(sodium) FILTER (WHERE is_consumed), 0) AS sodium,
           COALESCE(
             json_agg(
               json_build_object(
                 'name', food_name,
                 'mealType', meal_type,
                 'quantity', quantity,
                 'calories', calories,
                 'protein', protein,
                 'carbs', carbs,
                 'fat', fat
               )
             ) FILTER (WHERE is_consumed),
             '[]'::json
           ) AS meals
         FROM food_logs
         WHERE user_id = $1
           AND created_at >= $2::date
           AND created_at < ($2::date + INTERVAL '1 day')`,
        [userId, date]
      ),
      pool.query(
        `SELECT
           COALESCE(SUM(calories_burned) FILTER (WHERE completed), 0) AS estimated_calories_burned,
           COALESCE(SUM(duration_minutes) FILTER (WHERE completed), 0) AS workout_minutes,
           COUNT(*) FILTER (WHERE completed) AS completed_workouts,
           COALESCE(
             json_agg(
               json_build_object(
                 'exercise', exercise_name,
                 'durationMinutes', duration_minutes,
                 'caloriesBurned', calories_burned,
                 'completed', completed
               )
               ORDER BY created_at DESC
             ),
             '[]'::json
           ) AS activities
         FROM workout_logs
         WHERE user_id = $1
           AND created_at >= $2::date
           AND created_at < ($2::date + INTERVAL '1 day')`,
        [userId, date]
      ),
    ]);

    return res.json({
      date,
      nutrition: nutrition.rows[0],
      activity: workouts.rows[0],
    });
  } catch (error) {
    console.error("Coach daily summary:", error);
    return res.status(500).json({
      message: "Unable to load daily summary.",
    });
  }
});

// Generate exercise suggestions and balanced meal ideas.
router.post("/recommendations", async (req, res) => {
  try {
    const {
      user_id,
      available_time_minutes = 20,
      preferred_activities = ["walking", "mobility"],
      diet_preference = "no preference",
      fitness_goal = "general fitness",
      date = new Date().toISOString().slice(0, 10),
    } = req.body;

    const userId = Number(user_id);
    const availableTime = Number(available_time_minutes);

    if (
      !Number.isInteger(userId) ||
      userId <= 0 ||
      !Number.isInteger(availableTime) ||
      availableTime < 5 ||
      availableTime > 180 ||
      !validDate(date)
    ) {
      return res.status(400).json({
        message: "Valid user ID, date and available time (5–180 minutes) are required.",
      });
    }

    // Load the user's confirmed food intake and completed activity.
    const [nutrition, workouts] = await Promise.all([
      pool.query(
        `SELECT
           COALESCE(SUM(calories), 0) AS calories,
           COALESCE(SUM(protein), 0) AS protein,
           COALESCE(SUM(carbs), 0) AS carbs,
           COALESCE(SUM(fat), 0) AS fat,
           COALESCE(
             json_agg(
               json_build_object(
                 'name', food_name,
                 'mealType', meal_type,
                 'calories', calories
               )
             ) FILTER (WHERE is_consumed),
             '[]'::json
           ) AS meals
         FROM food_logs
         WHERE user_id = $1
           AND created_at >= $2::date
           AND created_at < ($2::date + INTERVAL '1 day')
           AND is_consumed = TRUE`,
        [userId, date]
      ),
      pool.query(
        `SELECT
           COALESCE(SUM(calories_burned) FILTER (WHERE completed), 0) AS estimated_calories_burned,
           COALESCE(SUM(duration_minutes) FILTER (WHERE completed), 0) AS workout_minutes,
           COUNT(*) FILTER (WHERE completed) AS completed_workouts,
           COALESCE(
             json_agg(
               json_build_object(
                 'exercise', exercise_name,
                 'durationMinutes', duration_minutes,
                 'caloriesBurned', calories_burned,
                 'completed', completed
               )
             ),
             '[]'::json
           ) AS activities
         FROM workout_logs
         WHERE user_id = $1
           AND created_at >= $2::date
           AND created_at < ($2::date + INTERVAL '1 day')`,
        [userId, date]
      ),
    ]);

    const context = {
      date,
      availableTimeMinutes: availableTime,
      fitnessGoal: String(fitness_goal).slice(0, 100),
      preferredActivities: Array.isArray(preferred_activities)
        ? preferred_activities.slice(0, 10).map(String)
        : [],
      dietPreference: String(diet_preference).slice(0, 100),
      nutrition: nutrition.rows[0],
      activity: workouts.rows[0],
    };

    if (AI_PROVIDER === "rules") {
      return res.json({
        source: "rules",
        recommendations: {
          activityRecommendations: [
            {
              name: "Comfortable walk",
              durationMinutes: Math.min(availableTime, 20),
              reason: "A simple, adjustable activity for general fitness.",
            },
            {
              name: "Gentle mobility",
              durationMinutes: 5,
              reason: "An optional low-intensity alternative.",
            },
          ],
          mealSuggestions: [
            {
              meal: "Next meal",
              suggestion:
                "Choose a balanced meal with a protein source, vegetables or fruit, carbohydrates and healthy fats, according to your preferences.",
            },
          ],
          threeDayMealPlan: [],
          explanation:
            "These general suggestions do not use a generative AI model.",
          safetyNotes:
            "Do not exercise to compensate for food. Rest or choose a gentler activity when needed.",
        },
      });
    }

    let textOutput;

    if (AI_PROVIDER === "ollama") {
      textOutput = await requestOllamaRecommendations(context);
    } else if (AI_PROVIDER === "openai") {
      if (!openai) {
        return res.status(503).json({
          message:
            "OPENAI_API_KEY is required when AI_PROVIDER=openai. Use the default local Ollama provider for recommendations without API credits.",
        });
      }

      const response = await openai.responses.create({
        model: AI_MODEL,
        instructions: coachInstructions,
        input: JSON.stringify(context),
      });
      textOutput = response.output_text;
    } else {
      return res.status(500).json({
        message:
          "Invalid AI_PROVIDER configuration. Choose ollama, openai, or rules.",
      });
    }

    if (!textOutput) {
      throw new Error("The AI returned an empty response.");
    }

    let recommendations;

    try {
      recommendations = JSON.parse(textOutput);
    } catch {
      console.error("AI returned invalid JSON:", textOutput);
      return res.status(502).json({
        message: "The AI returned an invalid response. Please try again.",
      });
    }

    if (
      !recommendations ||
      !Array.isArray(recommendations.activityRecommendations) ||
      !Array.isArray(recommendations.mealSuggestions) ||
      !Array.isArray(recommendations.threeDayMealPlan) ||
      typeof recommendations.explanation !== "string" ||
      typeof recommendations.safetyNotes !== "string"
    ) {
      console.error("AI returned an incomplete recommendation payload.");
      return res.status(502).json({
        message: "The AI returned incomplete guidance. Please try again.",
      });
    }

    return res.json({
      source: AI_PROVIDER,
      recommendations,
    });
  } catch (error) {
    console.error("Coach recommendations:", error);

    if (
      error.code === "insufficient_quota" ||
      error.code === "credit_balance_exhausted" ||
      error.type === "insufficient_quota"
    ) {
      return res.status(503).json({
        message:
          "AI recommendations are temporarily unavailable because the configured AI account has no API credits. Add credits or check billing, then try again.",
      });
    }

    if (error.code === "model_not_found") {
      return res.status(503).json({
        message: `The local model "${AI_MODEL}" is not downloaded. Run "ollama pull ${AI_MODEL}" and try again.`,
      });
    }

    if (error.code === "ollama_unavailable") {
      return res.status(503).json({
        message:
          error.message ||
          "Cannot reach Ollama. Start Ollama and try again.",
      });
    }

    if (error.code === "ollama_timeout") {
      return res.status(504).json({
        message:
          "The local AI model took too long to respond. Try again or use a smaller Ollama model.",
      });
    }

    if (error.status === 401) {
      return res.status(503).json({
        message:
          "AI recommendations are unavailable because the server AI credentials are invalid.",
      });
    }

    if (error.status === 429) {
      return res.status(503).json({
        message:
          "The AI service is temporarily rate-limited. Please try again shortly.",
      });
    }

    return res.status(500).json({
      message: "Unable to generate recommendations.",
    });
  }
});

// Save a three-day meal plan for a date.
router.post("/meal-plan", async (req, res) => {
  try {
    const { user_id, date, plan_data } = req.body;
    const userId = Number(user_id);

    if (
      !Number.isInteger(userId) ||
      userId <= 0 ||
      !validDate(date) ||
      !plan_data ||
      !Array.isArray(plan_data.threeDayMealPlan)
    ) {
      return res.status(400).json({
        message: "Valid user ID, date and meal plan are required.",
      });
    }

    const result = await pool.query(
      `INSERT INTO meal_plans (user_id, plan_date, plan_data)
       VALUES ($1, $2, $3::jsonb)
       ON CONFLICT (user_id, plan_date)
       DO UPDATE SET plan_data = EXCLUDED.plan_data,
                     created_at = NOW()
       RETURNING *`,
      [userId, date, JSON.stringify(plan_data)]
    );

    return res.status(201).json({
      message: "Meal plan saved.",
      plan: result.rows[0],
    });
  } catch (error) {
    console.error("Save meal plan:", error);
    return res.status(500).json({
      message: "Unable to save meal plan.",
    });
  }
});

// Retrieve the saved plan for a date.
router.get("/meal-plan/:userId", async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const date = req.query.date;

    if (
      !Number.isInteger(userId) ||
      userId <= 0 ||
      !validDate(date)
    ) {
      return res.status(400).json({
        message: "Valid user ID and date are required.",
      });
    }

    const result = await pool.query(
      `SELECT *
       FROM meal_plans
       WHERE user_id = $1 AND plan_date = $2`,
      [userId, date]
    );

    if (!result.rowCount) {
      return res.status(404).json({ message: "No saved plan for this date." });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.error("Get meal plan:", error);
    return res.status(500).json({
      message: "Unable to retrieve meal plan.",
    });
  }
});

module.exports = router;
