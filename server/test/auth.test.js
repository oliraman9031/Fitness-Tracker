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
let nextUserId = 1;
let nextFoodLogId = 1;
let nextWorkoutId = 1;
let nextProgressId = 1;
let server;
let baseUrl;
const originalQuery = pool.query;
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

  if (sql.includes("from progress_records")) {
    return rows(progress.filter((item) => item.user_id === values[0]));
  }

  throw new Error(`Unexpected SQL in auth tests: ${sql}`);
};

before(async () => {
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
