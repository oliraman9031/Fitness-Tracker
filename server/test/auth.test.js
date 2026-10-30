const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");

process.env.AI_PROVIDER = "rules";
process.env.USDA_API_KEY = "test-usda-api-key";
process.env.USDA_API_URL = "https://usda.test";

const pool = require("../database");
const { app } = require("../server");
const axios = require("axios");

const users = [];
const sessions = new Map();
const foodLogs = [];
const workouts = [];
const progress = [];
const wellnessLogs = [];
const mealRecommendations = [];
const waterEntries = [];
const activityEntries = [];
const sleepLogs = [];
const habitSchedules = [];
let nextUserId = 1;
let nextFoodLogId = 1;
let nextWorkoutId = 1;
let nextProgressId = 1;
let nextMealId = 1;
let nextWaterId = 1;
let nextActivityId = 1;
let server;
let baseUrl;
const originalQuery = pool.query;
const originalConnect = pool.connect;
const nativeFetch = global.fetch;
const originalGeminiKey = process.env.GEMINI_API_KEY;
let geminiMode = "success";

function rows(values) {
  return { rows: values, rowCount: values.length };
}

pool.query = async (query, values = []) => {
  const sql = query.replace(/\s+/g, " ").trim().toLowerCase();

  if (sql.startsWith("select response from food_search_cache")) {
    return rows([]);
  }

  if (sql.startsWith("insert into food_search_cache")) {
    return rows([]);
  }

  if (sql.startsWith("select u.user_id, u.name, u.email from auth_sessions")) {
    const userId = sessions.get(values[0]);
    const user = users.find((item) => item.user_id === userId);
    return rows(user ? [{
      user_id: user.user_id,
      name: user.name,
      email: user.email,
    }] : []);
  }

  if (sql.startsWith("insert into users")) {
    const [, email] = values;
    if (users.some((user) => user.email === email)) {
      const error = new Error("duplicate email");
      error.code = "23505";
      throw error;
    }
    const user = {
      user_id: nextUserId++,
      name: values[0],
      email,
      password_hash: values[2],
    };
    users.push(user);
    return rows([user]);
  }

  if (sql.startsWith("select user_id, name, email, password_hash from users")) {
    const user = users.find((item) => item.email === values[0]);
    return rows(user ? [user] : []);
  }

  if (sql.startsWith("update users set password_hash")) {
    const user = users.find(
      (item) => item.user_id === values[1] && item.password_hash === values[2]
    );
    if (user) user.password_hash = values[0];
    return rows(user ? [user] : []);
  }

  if (sql.startsWith("select name, height_cm, hydration_goal_ml")) {
    const user = users.find((item) => item.user_id === values[0]);
    return rows(user ? [{
      name: user.name,
      height_cm: null,
      hydration_goal_ml: 2000,
      steps_goal: 8000,
      profile_preferences: {},
    }] : []);
  }

  if (sql.startsWith("select height_cm, hydration_goal_ml")) {
    return rows([{
      height_cm: null,
      hydration_goal_ml: 2000,
      steps_goal: 8000,
      profile_preferences: {},
    }]);
  }

  if (sql.startsWith("select steps_goal, hydration_goal_ml")) {
    return rows([{ steps_goal: 8000, hydration_goal_ml: 2000 }]);
  }

  if (sql.startsWith("select hydration_goal_ml")) {
    return rows([{ hydration_goal_ml: 2000 }]);
  }

  if (sql.startsWith("select habit_key, weekdays")) {
    return rows(habitSchedules.filter((item) => item.user_id === values[0]));
  }

  if (sql.startsWith("insert into scheduled_habits")) {
    const current = habitSchedules.find(
      (item) => item.user_id === values[0] && item.habit_key === values[1]
    );
    const schedule = {
      user_id: values[0],
      habit_key: values[1],
      weekdays: values[2],
      target_value: values[3],
      enabled: values[4],
    };
    if (current) Object.assign(current, schedule);
    else habitSchedules.push(schedule);
    return rows([]);
  }

  if (sql.startsWith("insert into auth_sessions")) {
    sessions.set(values[0], values[1]);
    return rows([]);
  }

  if (sql.startsWith("delete from auth_sessions")) {
    if (sql.includes("expires_at")) return rows([]);
    sessions.delete(values[0]);
    return rows([]);
  }

  if (sql.startsWith("insert into food_logs")) {
    const log = {
      food_log_id: nextFoodLogId++,
      user_id: values[0],
      food_name: values[1],
      meal_type: values[2],
      quantity: values[3],
      quantity_unit: values[4],
      calories: values[5],
      protein: values[6],
      carbs: values[7],
      fat: values[8],
      is_consumed: values[9],
      created_at: new Date().toISOString(),
    };
    foodLogs.push(log);
    return rows([log]);
  }

  if (sql.startsWith("update food_logs")) {
    const log = foodLogs.find((item) =>
      item.food_log_id === values[1] && item.user_id === values[2]
    );
    if (!log) return rows([]);
    log.is_consumed = values[0];
    return rows([log]);
  }

  if (sql.includes("from food_logs")) {
    if (sql.includes("json_agg")) {
      const matchingLogs = foodLogs.filter((item) => item.user_id === values[0]);
      return rows([{
        calories: String(matchingLogs.reduce((sum, item) => sum + Number(item.calories || 0), 0)),
        protein: String(matchingLogs.reduce((sum, item) => sum + Number(item.protein || 0), 0)),
        carbs: String(matchingLogs.reduce((sum, item) => sum + Number(item.carbs || 0), 0)),
        fat: String(matchingLogs.reduce((sum, item) => sum + Number(item.fat || 0), 0)),
        fiber: "0",
        sugar: "0",
        sodium: "0",
        consumed_food_count: String(matchingLogs.length),
        meals: matchingLogs,
      }]);
    }
    if (sql.includes("count(*)")) {
      return rows([{
        calories: "0",
        protein: "0",
        carbs: "0",
        fat: "0",
        fiber: "0",
        sugar: "0",
        sodium: "0",
        consumed_food_count: "0",
        meals: [],
      }]);
    }
    return rows(foodLogs.filter((item) => item.user_id === values[0]));
  }

  if (sql.startsWith("insert into workout_logs")) {
    const workout = {
      workout_id: nextWorkoutId++,
      user_id: values[0],
      exercise_name: values[1],
      duration_minutes: values[2],
      calories_burned: values[3],
      notes: values[4],
      completed: values[5],
    };
    workouts.push(workout);
    return rows([workout]);
  }

  if (sql.includes("from workout_logs")) {
    if (sql.includes("json_agg") || sql.includes("sum(")) {
      return rows([{
        estimated_calories_burned: "0",
        workout_minutes: "0",
        completed_workouts: "0",
        activities: [],
      }]);
    }
    return rows(workouts.filter((item) => item.user_id === values[0]));
  }

  if (sql.startsWith("insert into progress_records")) {
    const entry = {
      progress_id: nextProgressId++,
      user_id: values[0],
      weight: values[1],
      recorded_date: new Date().toISOString(),
    };
    progress.push(entry);
    return rows([entry]);
  }

  if (sql.startsWith("insert into daily_wellness_logs")) {
    let log = wellnessLogs.find(
      (item) => item.user_id === values[0] && item.activity_date === values[1]
    );
    if (!log) {
      log = { user_id: values[0], activity_date: values[1] };
      wellnessLogs.push(log);
    }
    Object.assign(log, {
      steps: values[2],
      water_liters: values[3],
      sleep_hours: values[4],
      recovery_rating: values[5],
    });
    const { user_id, ...publicLog } = log;
    return rows([publicLog]);
  }

  if (sql.startsWith("insert into recommended_meals")) {
    let meal = mealRecommendations.find((item) =>
      item.user_id === values[0] &&
      item.recommendation_date === values[1] &&
      item.meal_type === values[2]
    );
    if (!meal) {
      meal = {
        recommended_meal_id: nextMealId++,
        user_id: values[0],
        recommendation_date: values[1],
        meal_type: values[2],
        status: "planned",
      };
      mealRecommendations.push(meal);
    }
    meal.food_name = values[3];
    return rows([{ ...meal }]);
  }

  if (sql.startsWith("select recommended_meal_id")) {
    return rows(mealRecommendations.filter(
      (item) => item.user_id === values[0] && item.recommendation_date === values[1]
    ));
  }

  if (sql.startsWith("update recommended_meals")) {
    const meal = mealRecommendations.find(
      (item) => item.recommended_meal_id === values[0] && item.user_id === values[1]
    );
    if (!meal) return rows([]);
    meal.status = values[2];
    meal.completed_at = meal.status === "completed" ? new Date().toISOString() : null;
    return rows([{ ...meal }]);
  }

  if (sql.startsWith("with updated_food as")) {
    const meal = mealRecommendations.find(
      (item) => item.recommended_meal_id === values[0] && item.user_id === values[1]
    );
    if (!meal) return rows([]);
    meal.status = "planned";
    meal.completed_at = null;
    meal.food_log_id = null;
    return rows([{ ...meal }]);
  }

  if (sql.startsWith("with target as")) {
    const meal = mealRecommendations.find(
      (item) => item.recommended_meal_id === values[0] && item.user_id === values[1]
    );
    if (!meal) return rows([]);
    const foodLog = {
      food_log_id: nextFoodLogId++,
      user_id: values[1],
      food_name: values[2],
      meal_type: values[3],
      quantity: values[4],
      quantity_unit: values[5],
      calories: values[6],
      protein: values[7],
      carbs: values[8],
      fat: values[9],
      is_consumed: true,
      created_at: new Date().toISOString(),
    };
    foodLogs.push(foodLog);
    Object.assign(meal, {
      meal_type: values[3],
      food_name: values[2],
      calories: values[6],
      protein: values[7],
      carbs: values[8],
      fat: values[9],
      status: "completed",
      completed_at: new Date().toISOString(),
      food_log_id: foodLog.food_log_id,
    });
    return rows([{ ...meal }]);
  }

  if (sql.includes("from recommended_meals")) {
    return rows(mealRecommendations.filter((item) => item.user_id === values[0]));
  }

  if (sql.startsWith("insert into daily_water_entries")) {
    const entry = {
      water_entry_id: nextWaterId++,
      user_id: values[0],
      entry_date: values[1],
      amount_ml: values[2],
      created_at: new Date().toISOString(),
    };
    waterEntries.push(entry);
    return rows([entry]);
  }

  if (sql.startsWith("delete from daily_water_entries")) {
    const index = waterEntries.findIndex(
      (item) => item.water_entry_id === values[0] && item.user_id === values[1]
    );
    if (index < 0) return rows([]);
    return rows([waterEntries.splice(index, 1)[0]]);
  }

  if (sql.includes("from daily_water_entries")) {
    const matches = waterEntries.filter((item) => item.user_id === values[0]);
    if (sql.includes("sum(amount_ml)")) {
      return rows(matches.reduce((result, item) => {
        const key = item.entry_date;
        const existing = result.find((row) => row.entry_date === key);
        if (existing) existing.total_ml += item.amount_ml;
        else result.push({ entry_date: key, total_ml: item.amount_ml });
        return result;
      }, []));
    }
    return rows(matches);
  }

  if (sql.startsWith("insert into daily_activity_entries")) {
    const entry = {
      activity_entry_id: nextActivityId++,
      user_id: values[0],
      activity_date: values[1],
      activity_type: values[2],
      steps: values[3],
      distance_m: values[4],
      active_minutes: values[5],
      data_source: values[6],
      created_at: new Date().toISOString(),
    };
    activityEntries.push(entry);
    return rows([entry]);
  }

  if (sql.startsWith("delete from daily_activity_entries")) {
    const index = activityEntries.findIndex(
      (item) => item.activity_entry_id === values[0] && item.user_id === values[1]
    );
    if (index < 0) return rows([]);
    return rows([activityEntries.splice(index, 1)[0]]);
  }

  if (sql.includes("from daily_activity_entries")) {
    const matches = activityEntries.filter((item) => item.user_id === values[0]);
    return rows(matches);
  }

  if (sql.startsWith("insert into sleep_logs")) {
    const log = {
      sleep_log_id: 1,
      user_id: values[0],
      sleep_date: values[1],
      sleep_start: values[2],
      wake_time: values[3],
      duration_minutes: values[4],
      sleep_quality: values[5],
      fatigue_rating: values[6],
      soreness_rating: values[7],
    };
    const index = sleepLogs.findIndex(
      (item) => item.user_id === log.user_id && item.sleep_date === log.sleep_date
    );
    if (index >= 0) sleepLogs[index] = log;
    else sleepLogs.push(log);
    return rows([log]);
  }

  if (sql.includes("from sleep_logs")) {
    return rows(sleepLogs.filter((item) => item.user_id === values[0]));
  }

  if (sql.startsWith("insert into recovery_records")) {
    return rows([]);
  }

  if (sql.includes("from recovery_records")) {
    return rows([]);
  }

  if (sql.includes("from daily_wellness_logs")) {
    const log = wellnessLogs.find(
      (item) => item.user_id === values[0] && item.activity_date === values[1]
    );
    if (!log) return rows([]);
    const { user_id, ...publicLog } = log;
    return rows([publicLog]);
  }

  if (sql.includes("from progress_records")) {
    return rows(progress.filter((item) => item.user_id === values[0]));
  }

  throw new Error(`Unexpected SQL in auth tests: ${sql}`);
};

before(async () => {
  pool.connect = async () => ({
    query: async (sql, values) => {
      if (/^(begin|commit|rollback)$/i.test(sql.trim())) return rows([]);
      return pool.query(sql, values);
    },
    release() {},
  });
  process.env.GEMINI_API_KEY = "test-gemini-api-key";
  global.fetch = async (input, options) => {
    const url = String(input);
    if (!url.includes("generativelanguage.googleapis.com")) {
      return nativeFetch(input, options);
    }
    assert.equal(url.includes("test-gemini-api-key"), false);
    assert.equal(options.headers["x-goog-api-key"], "test-gemini-api-key");
    if (geminiMode === "timeout") {
      const error = new Error("timeout");
      error.name = "TimeoutError";
      throw error;
    }
    if (geminiMode === "failure") {
      return new Response("unavailable", { status: 503 });
    }
    return Response.json({
      candidates: [{
        content: {
          parts: [{
            text: JSON.stringify({
              items: [{
                name: "Grilled chicken",
                portionGrams: 150,
                calories: 248,
                protein: 46.5,
                carbs: 0,
                fat: 5.4,
              }],
            }),
          }],
        },
      }],
    });
  };
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  pool.query = originalQuery;
  pool.connect = originalConnect;
  global.fetch = nativeFetch;
  if (originalGeminiKey === undefined) {
    delete process.env.GEMINI_API_KEY;
  } else {
    process.env.GEMINI_API_KEY = originalGeminiKey;
  }
  await new Promise((resolve, reject) =>
    server.close((error) => error ? reject(error) : resolve())
  );
});

async function request(path, { cookie, ...options } = {}) {
  const headers = new Headers(options.headers || {});
  if (options.body) headers.set("Content-Type", "application/json");
  if (cookie) headers.set("Cookie", cookie);

  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers,
  });
  const data = await response.json().catch(() => null);
  return { response, data };
}

async function uploadImage(cookie, content, mimeType = "image/png") {
  const body = new FormData();
  body.append("image", new Blob([content], { type: mimeType }), "meal.png");
  const response = await fetch(`${baseUrl}/api/food/ai-snap`, {
    method: "POST",
    headers: { Cookie: cookie },
    body,
  });
  return {
    response,
    data: await response.json().catch(() => null),
  };
}

function sessionCookie(response) {
  const value = response.headers.get("set-cookie");
  assert.ok(value, "session cookie is set");
  assert.match(value, /httponly/i);
  assert.match(value, /samesite=strict/i);
  return value.split(";")[0];
}

async function register(name, email) {
  const { response, data } = await request("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({
      name,
      email,
      password: "StrongPassword123!",
    }),
  });
  assert.equal(response.status, 201);
  assert.deepEqual(Object.keys(data.user).sort(), ["email", "id", "name"]);
  return { user: data.user, cookie: sessionCookie(response) };
}

test("registration, login, invalid credentials, and logout", async () => {
  const email = `auth-${Date.now()}@example.test`;
  const created = await register("Test User", email);
  assert.equal(created.user.name, "Test User");
  assert.ok([...sessions.keys()].every((hash) => hash.length === 64));

  const current = await request("/api/auth/me", { cookie: created.cookie });
  assert.equal(current.response.status, 200);
  assert.equal(current.data.user.id, created.user.id);
  assert.equal("password_hash" in current.data.user, false);

  const invalid = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password: "WrongPassword123!" }),
  });
  assert.equal(invalid.response.status, 401);

  const login = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password: "StrongPassword123!" }),
  });
  assert.equal(login.response.status, 200);
  const loginCookie = sessionCookie(login.response);

  const logout = await request("/api/auth/logout", {
    method: "POST",
    cookie: loginCookie,
  });
  assert.equal(logout.response.status, 200);
  const expired = await request("/api/auth/me", { cookie: loginCookie });
  assert.equal(expired.response.status, 401);
});

test("private endpoints require auth and records stay scoped to the session", async () => {
  const anonymous = await request("/api/diet");
  assert.equal(anonymous.response.status, 401);
  const anonymousFoodSearch = await request("/api/food/search?query=oats");
  assert.equal(anonymousFoodSearch.response.status, 401);

  const first = await register("First User", `first-${Date.now()}@example.test`);
  const second = await register("Second User", `second-${Date.now()}@example.test`);

  const firstFood = await request("/api/diet", {
    method: "POST",
    cookie: first.cookie,
    body: JSON.stringify({
      user_id: second.user.id,
      food_name: "Oats",
      meal_type: "Breakfast",
      quantity: 100,
      calories: 380,
      is_consumed: true,
    }),
  });
  assert.equal(firstFood.response.status, 201);
  assert.equal(firstFood.data.food.user_id, first.user.id);

  const secondFood = await request("/api/diet", {
    method: "POST",
    cookie: second.cookie,
    body: JSON.stringify({
      food_name: "Rice",
      calories: 200,
      is_consumed: true,
    }),
  });
  assert.equal(secondFood.response.status, 201);

  const firstLogs = await request("/api/diet", { cookie: first.cookie });
  const secondLogs = await request("/api/diet", { cookie: second.cookie });
  assert.deepEqual(firstLogs.data.map((log) => log.food_name), ["Oats"]);
  assert.deepEqual(secondLogs.data.map((log) => log.food_name), ["Rice"]);
  const legacyCrossUserRead = await request(
    `/api/diet/${second.user.id}`,
    { cookie: first.cookie }
  );
  assert.equal(legacyCrossUserRead.response.status, 404);

  const crossUserUpdate = await request(
    `/api/diet/${secondFood.data.food.food_log_id}/consumed`,
    {
      method: "PATCH",
      cookie: first.cookie,
      body: JSON.stringify({ is_consumed: false, user_id: second.user.id }),
    }
  );
  assert.equal(crossUserUpdate.response.status, 404);
  assert.equal(secondFood.data.food.is_consumed, true);

  const workout = await request("/api/workouts", {
    method: "POST",
    cookie: first.cookie,
    body: JSON.stringify({
      user_id: second.user.id,
      exercise_name: "Walking",
      duration_minutes: 30,
      calories_burned: 120,
    }),
  });
  assert.equal(workout.response.status, 201);
  assert.equal(workout.data.workout.user_id, first.user.id);
  const otherWorkouts = await request("/api/workouts", {
    cookie: second.cookie,
  });
  assert.deepEqual(otherWorkouts.data, []);

  const weight = await request("/api/progress", {
    method: "POST",
    cookie: first.cookie,
    body: JSON.stringify({ user_id: second.user.id, weight: 72.5 }),
  });
  assert.equal(weight.response.status, 201);
  assert.equal(weight.data.progress.user_id, first.user.id);
  const otherProgress = await request("/api/progress", {
    cookie: second.cookie,
  });
  assert.deepEqual(otherProgress.data, []);

  const coach = await request("/api/coach/recommendations", {
    method: "POST",
    cookie: first.cookie,
    body: JSON.stringify({
      user_id: second.user.id,
      available_time_minutes: 20,
      date: new Date().toISOString().slice(0, 10),
    }),
  });
  assert.equal(coach.response.status, 200);
  assert.equal(coach.data.source, "rules");
});

test("registration validates input and rejects duplicate emails", async () => {
  const email = `duplicate-${Date.now()}@example.test`;
  await register("Valid User", email);
  assert.match(
    users.find((user) => user.email === email).password_hash,
    /^\$2[aby]\$/
  );

  const duplicate = await request("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({
      name: "Another User",
      email: email.toUpperCase(),
      password: "StrongPassword123!",
    }),
  });
  assert.equal(duplicate.response.status, 409);

  const weakPassword = await request("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({
      name: "Weak Password",
      email: `weak-${Date.now()}@example.test`,
      password: "short",
    }),
  });
  assert.equal(weakPassword.response.status, 400);

  const invalidOrigin = await request("/api/auth/login", {
    method: "POST",
    headers: { Origin: "https://attacker.example" },
    body: JSON.stringify({ email, password: "StrongPassword123!" }),
  });
  assert.equal(invalidOrigin.response.status, 403);
});

test("legacy plaintext password is upgraded after successful login", async () => {
  const email = `legacy-${Date.now()}@example.test`;
  const password = "LegacyPassword123";
  const user = {
    user_id: nextUserId++,
    name: "Legacy User",
    email,
    password_hash: password,
  };
  users.push(user);

  const result = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  assert.equal(result.response.status, 200);
  assert.equal(result.data.user.email, email);
  assert.match(user.password_hash, /^\$2[aby]\$/);

  const rejected = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password: "wrong-password" }),
  });
  assert.equal(rejected.response.status, 401);
});

test("local Vite origins can access the API while unrelated origins are rejected", async () => {
  const localOrigin = "http://127.0.0.1:5174";
  const allowed = await request("/api/auth/me", {
    headers: { Origin: localOrigin },
  });
  assert.equal(allowed.response.status, 401);
  assert.equal(
    allowed.response.headers.get("access-control-allow-origin"),
    localOrigin
  );
  assert.equal(
    allowed.response.headers.get("access-control-allow-credentials"),
    "true"
  );

  const rejected = await request("/api/auth/login", {
    method: "POST",
    headers: { Origin: "https://unrelated.example" },
    body: JSON.stringify({ email: "test@example.test", password: "password" }),
  });
  assert.equal(rejected.response.status, 403);
});

test("daily wellness check-ins save, update, and stay scoped to the session", async () => {
  const first = await register(
    "Wellness User",
    `wellness-${Date.now()}@example.test`
  );
  const second = await register(
    "Other Wellness User",
    `wellness-other-${Date.now()}@example.test`
  );
  const date = new Date().toISOString().slice(0, 10);
  const checkIn = {
    activity_date: date,
    steps: 8200,
    water_liters: 2.4,
    sleep_hours: 7.5,
    recovery_rating: 4,
  };

  const anonymous = await request(`/api/wellness/daily?date=${date}`);
  assert.equal(anonymous.response.status, 401);

  const saved = await request("/api/wellness/daily", {
    method: "PUT",
    cookie: first.cookie,
    body: JSON.stringify(checkIn),
  });
  assert.equal(saved.response.status, 200);
  assert.equal(saved.data.log.steps, 8200);

  const updated = await request("/api/wellness/daily", {
    method: "PUT",
    cookie: first.cookie,
    body: JSON.stringify({ ...checkIn, steps: 9100, recovery_rating: 3 }),
  });
  assert.equal(updated.response.status, 200);
  assert.equal(updated.data.log.steps, 9100);
  assert.equal(wellnessLogs.length, 1);

  const ownLog = await request(`/api/wellness/daily?date=${date}`, {
    cookie: first.cookie,
  });
  assert.equal(ownLog.data.log.recovery_rating, 3);
  const otherLog = await request(`/api/wellness/daily?date=${date}`, {
    cookie: second.cookie,
  });
  assert.equal(otherLog.data.log, null);

  const summary = await request(`/api/coach/daily-summary?date=${date}`, {
    cookie: first.cookie,
  });
  assert.equal(summary.response.status, 200);
  assert.equal(summary.data.date, date);
  assert.equal(summary.data.activity.workout_minutes, "0");

  const invalid = await request("/api/wellness/daily", {
    method: "PUT",
    cookie: first.cookie,
    body: JSON.stringify({ ...checkIn, water_liters: 21 }),
  });
  assert.equal(invalid.response.status, 400);
});

test("meal recommendations stay separate from actual food until an explicit USDA replacement", async () => {
  const first = await register(
    "Meal Check-in User",
    `meal-checkin-${Date.now()}@example.test`
  );
  const second = await register(
    "Other Meal User",
    `meal-other-${Date.now()}@example.test`
  );
  const date = new Date().toISOString().slice(0, 10);
  const initialFoodLogCount = foodLogs.length;
  const saved = await request("/api/diet/recommendations", {
    method: "PUT",
    cookie: first.cookie,
    body: JSON.stringify({
      date,
      meals: [
        { meal_type: "Breakfast", food_name: "Balanced breakfast suggestion" },
      ],
    }),
  });
  assert.equal(saved.response.status, 200);
  const recommendation = saved.data.meals[0];
  assert.equal(recommendation.status, "planned");
  assert.equal(foodLogs.length, initialFoodLogCount);

  const checkedIn = await request(
    `/api/diet/recommendations/${recommendation.recommended_meal_id}`,
    {
      method: "PATCH",
      cookie: first.cookie,
      body: JSON.stringify({ status: "completed" }),
    }
  );
  assert.equal(checkedIn.response.status, 200);
  assert.equal(checkedIn.data.meal.status, "completed");
  assert.equal(foodLogs.length, initialFoodLogCount);

  const undone = await request(
    `/api/diet/recommendations/${recommendation.recommended_meal_id}`,
    {
      method: "PATCH",
      cookie: first.cookie,
      body: JSON.stringify({ status: "planned" }),
    }
  );
  assert.equal(undone.response.status, 200);
  assert.equal(undone.data.meal.status, "planned");

  const replacement = await request(
    `/api/diet/recommendations/${recommendation.recommended_meal_id}`,
    {
      method: "PATCH",
      cookie: first.cookie,
      body: JSON.stringify({
        status: "completed",
        actual_food: {
          food_name: "Oats",
          meal_type: "Breakfast",
          fdc_id: 12345,
          quantity: 100,
          quantity_unit: "g",
          calories: 380,
          protein: 13,
          carbs: 68,
          fat: 7,
        },
      }),
    }
  );
  assert.equal(replacement.response.status, 200);
  assert.equal(replacement.data.meal.food_log_id, foodLogs[initialFoodLogCount].food_log_id);
  assert.equal(foodLogs[initialFoodLogCount].is_consumed, true);

  const otherUser = await request(
    `/api/diet/recommendations/${recommendation.recommended_meal_id}`,
    {
      method: "PATCH",
      cookie: second.cookie,
      body: JSON.stringify({ status: "completed" }),
    }
  );
  assert.equal(otherUser.response.status, 404);
});

test("water, activity, sleep, and schedule records persist per authenticated user", async () => {
  const first = await register(
    "Tracking User",
    `tracking-${Date.now()}@example.test`
  );
  const second = await register(
    "Other Tracking User",
    `tracking-other-${Date.now()}@example.test`
  );
  const date = new Date().toISOString().slice(0, 10);

  const water = await request("/api/wellness/water", {
    method: "POST",
    cookie: first.cookie,
    body: JSON.stringify({ entry_date: date, amount_ml: 350 }),
  });
  assert.equal(water.response.status, 201);
  const waterSummary = await request(`/api/wellness/water?date=${date}`, {
    cookie: first.cookie,
  });
  assert.equal(waterSummary.data.total_ml, 350);
  const otherWater = await request(`/api/wellness/water?date=${date}`, {
    cookie: second.cookie,
  });
  assert.equal(otherWater.data.total_ml, 0);
  const removedWater = await request(
    `/api/wellness/water/${water.data.entry.water_entry_id}`,
    { method: "DELETE", cookie: first.cookie }
  );
  assert.equal(removedWater.response.status, 200);

  const activity = await request("/api/wellness/activities", {
    method: "POST",
    cookie: first.cookie,
    body: JSON.stringify({
      activity_date: date,
      activity_type: "Walking",
      steps: 4200,
      distance_m: 3100,
      active_minutes: 35,
      data_source: "manual",
    }),
  });
  assert.equal(activity.response.status, 201);
  assert.equal(activity.data.entry.steps, 4200);

  const sleep = await request("/api/wellness/sleep", {
    method: "PUT",
    cookie: first.cookie,
    body: JSON.stringify({
      sleep_date: date,
      duration_hours: 7.5,
      sleep_quality: 4,
      fatigue_rating: 2,
      soreness_rating: 1,
    }),
  });
  assert.equal(sleep.response.status, 200);
  assert.equal(sleep.data.sleep.duration_minutes, 450);
  assert.equal(sleep.data.sleep.sleep_start, null);
  assert.equal(sleep.data.sleep.wake_time, null);

  const schedules = await request("/api/wellness/schedule", {
    method: "PUT",
    cookie: first.cookie,
    body: JSON.stringify({
      schedules: [
        {
          habit_key: "water",
          weekdays: [0, 1, 2, 3, 4, 5, 6],
          target_value: 2000,
          enabled: true,
        },
        {
          habit_key: "workout",
          weekdays: [1, 3, 5],
          target_value: null,
          enabled: true,
        },
      ],
    }),
  });
  assert.equal(schedules.response.status, 200);
  assert.equal(habitSchedules.length, 2);
});

test("Food Snap rejects invalid uploads, provider failures, and timeouts", async () => {
  const account = await register("Food Snap User", `snap-errors-${Date.now()}@example.test`);

  const invalidMime = await uploadImage(account.cookie, "not an image", "text/plain");
  assert.equal(invalidMime.response.status, 400);

  const invalidSignature = await uploadImage(
    account.cookie,
    "not a png",
    "image/png"
  );
  assert.equal(invalidSignature.response.status, 400);

  geminiMode = "failure";
  const providerFailure = await uploadImage(
    account.cookie,
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  );
  assert.equal(providerFailure.response.status, 503);

  geminiMode = "timeout";
  const timeout = await uploadImage(
    account.cookie,
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  );
  assert.equal(timeout.response.status, 504);
  geminiMode = "success";
});

test("Food Snap estimates can be confirmed into the existing food log and dashboard", async () => {
  const account = await register("Food Snap Save", `snap-save-${Date.now()}@example.test`);
  const png = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0, 0, 0, 0,
  ]);
  const analysis = await uploadImage(account.cookie, png);
  assert.equal(analysis.response.status, 200);
  assert.equal(analysis.data.items[0].name, "Grilled chicken");
  assert.equal(analysis.data.items[0].portionGrams, 150);
  assert.equal(analysis.data.items[0].nutritionPer100g.calories, 165.33);

  const portionScale = analysis.data.items[0].portionGrams / 100;
  const save = await request("/api/diet", {
    method: "POST",
    cookie: account.cookie,
    body: JSON.stringify({
      food_name: analysis.data.items[0].name,
      meal_type: "Lunch",
      quantity: analysis.data.items[0].portionGrams,
      quantity_unit: "g",
      calories: analysis.data.items[0].nutritionPer100g.calories * portionScale,
      protein: analysis.data.items[0].nutritionPer100g.protein * portionScale,
      carbs: analysis.data.items[0].nutritionPer100g.carbs * portionScale,
      fat: analysis.data.items[0].nutritionPer100g.fat * portionScale,
      is_consumed: true,
    }),
  });
  assert.equal(save.response.status, 201);
  assert.equal(save.data.food.food_name, "Grilled chicken");
  assert.ok(Math.abs(Number(save.data.food.calories) - 248) < 0.01);

  const logs = await request("/api/diet", { cookie: account.cookie });
  assert.equal(logs.data.length, 1);
  assert.equal(logs.data[0].food_name, "Grilled chicken");

  const today = new Date().toISOString().slice(0, 10);
  const dashboard = await request(
    `/api/coach/daily-summary?date=${today}`,
    { cookie: account.cookie }
  );
  assert.equal(dashboard.response.status, 200);
  assert.ok(Math.abs(Number(dashboard.data.nutrition.calories) - 248) < 0.01);
});

test("Food Snap can replace estimates with a close USDA match", async () => {
  const account = await register("USDA Match User", `snap-usda-${Date.now()}@example.test`);
  const originalGet = axios.get;
  axios.get = async (_url, { params }) => ({
    data: {
      foods: params.query === "tofu"
        ? [{
            fdcId: 124,
            description: "Tofu yogurt",
            dataType: "SR Legacy",
            foodNutrients: [
              { nutrientId: 1008, value: 94 },
              { nutrientId: 1003, value: 3.5 },
              { nutrientId: 1005, value: 16 },
              { nutrientId: 1004, value: 1.8 },
            ],
          }]
        : [{
            fdcId: 123,
            description: "Chicken breast, grilled",
            dataType: "SR Legacy",
            foodNutrients: [
              { nutrientId: 1008, value: 165 },
              { nutrientId: 1003, value: 31 },
              { nutrientId: 1005, value: 0 },
              { nutrientId: 1004, value: 3.6 },
            ],
          }],
    },
  });
  try {
    const result = await request("/api/food/ai-snap/usda-match", {
      method: "POST",
      cookie: account.cookie,
      body: JSON.stringify({ name: "grilled chicken breast" }),
    });
    assert.equal(result.response.status, 200);
    assert.equal(result.data.match.fdcId, 123);
    assert.equal(result.data.match.nutritionPer100g.calories, 165);
    const mismatch = await request("/api/food/ai-snap/usda-match", {
      method: "POST",
      cookie: account.cookie,
      body: JSON.stringify({ name: "tofu" }),
    });
    assert.equal(mismatch.response.status, 200);
    assert.equal(mismatch.data.match, null);
  } finally {
    axios.get = originalGet;
  }
});
