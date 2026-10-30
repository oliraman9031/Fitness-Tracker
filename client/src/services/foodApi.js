// const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// function localDate() {
//     const now = new Date();
//     const year = now.getFullYear();
//     const month = String(now.getMonth() + 1).padStart(2, "0");
//     const day = String(now.getDate()).padStart(2, "0");
//     return `${year}-${month}-${day}`;
// }

// async function request(path, options) {
//     const response = await fetch(`${API_URL}${path}`, options);
//     const data = await response.json().catch(() => ({}));

//     if (!response.ok) {
//         throw new Error(data.message || `Request failed (${response.status})`);
//     }

//     return data;
// }

// export async function searchFoods(query) {
//     const data = await request(`/food/search?query=${encodeURIComponent(query)}`);
//     return Array.isArray(data.foods) ? data.foods : [];
// }

// export async function getFoodDetails(fdcId) {
//     return request(`/food/${encodeURIComponent(fdcId)}`);
// }

// export async function saveFood(food) {
//     const data = await request("/food/save", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(food)
//     });
//     return data.food;
// }

// export async function addFoodToDiet(foodLog) {
//     return request("/diet", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ ...foodLog, logged_date: foodLog.logged_date || localDate() })
//     });
// }

// export async function getDietLogs(userId) {
//     return request(`/diet/${encodeURIComponent(userId)}?date=${localDate()}`);
// }



const defaultApiHost =
  typeof window === "undefined" ? "localhost" : window.location.hostname;
const API_BASE = (
  import.meta.env.VITE_API_URL || `http://${defaultApiHost}:5000/api`
).replace(/\/+$/, "");

function localDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      credentials: "include",
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(
        `Cannot reach the STHIRA API at ${API_BASE}. Start the backend and check VITE_API_URL and CORS settings.`
      );
    }
    throw error;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.message || `Request failed (${response.status}).`);
    error.status = response.status;
    throw error;
  }

  return data;
}

export function getCurrentUser() {
  return request("/auth/me");
}

export function login(credentials) {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

export function registerAccount(details) {
  return request("/auth/register", {
    method: "POST",
    body: JSON.stringify(details),
  });
}

export function logout() {
  return request("/auth/logout", { method: "POST" });
}

export function searchFoods(query) {
  return request(
    `/food/search?query=${encodeURIComponent(query)}`
  );
}

export function getFoodDetails(fdcId) {
  return request(`/food/${encodeURIComponent(fdcId)}`);
}

export function saveFood(food) {
  return request("/diet", {
    method: "POST",
    body: JSON.stringify({ ...food, logged_date: food.logged_date || localDate() }),
  });
}

export function getFoodLogs() {
  return request("/diet");
}

export function updateConsumed(foodLogId, isConsumed) {
  return request(`/diet/${foodLogId}/consumed`, {
    method: "PATCH",
    body: JSON.stringify({
      is_consumed: isConsumed,
    }),
  });
}

export function getDailySummary(date) {
  return request(
    `/coach/daily-summary?date=${encodeURIComponent(date)}`
  );
}

export function saveWorkout(workout) {
  return request("/workouts", {
    method: "POST",
    body: JSON.stringify({ ...workout, workout_date: workout.workout_date || localDate() }),
  });
}

export function getWorkouts() {
  return request("/workouts");
}

export function getRecommendations(data) {
  return request("/coach/recommendations", {
    method: "POST",
    body: JSON.stringify({ ...data, date: data.date || localDate() }),
  });
}

export function saveMealPlan(date, planData) {
  return request("/coach/meal-plan", {
    method: "POST",
    body: JSON.stringify({
      date,
      plan_data: planData,
    }),
  });
}

export function getMealPlan(date) {
  return request(
    `/coach/meal-plan?date=${encodeURIComponent(date)}`
  );
}

export function getWellnessLog(date) {
  return request(`/wellness/daily?date=${encodeURIComponent(date)}`);
}

export function saveWellnessLog(log) {
  return request("/wellness/daily", {
    method: "PUT",
    body: JSON.stringify(log),
  });
}

export function getProgress() {
  return request("/progress");
}

export function saveProgress(weight) {
  return request("/progress", {
    method: "POST",
    body: JSON.stringify({ weight: Number(weight) }),
  });
}

export function getRecommendedMeals(date) {
  return request(`/diet/recommendations?date=${encodeURIComponent(date)}`);
}

export function saveRecommendedMeals(date, meals) {
  return request("/diet/recommendations", {
    method: "PUT",
    body: JSON.stringify({ date, meals }),
  });
}

export function updateRecommendedMeal(mealId, status, actualFood) {
  return request(`/diet/recommendations/${mealId}`, {
    method: "PATCH",
    body: JSON.stringify({
      status,
      ...(actualFood ? { actual_food: actualFood } : {}),
    }),
  });
}

export function getWater(date) {
  return request(`/wellness/water?date=${encodeURIComponent(date)}`);
}

export function addWater(date, amountMl) {
  return request("/wellness/water", {
    method: "POST",
    body: JSON.stringify({ entry_date: date, amount_ml: amountMl }),
  });
}

export function removeWater(entryId) {
  return request(`/wellness/water/${entryId}`, { method: "DELETE" });
}

export function getActivities(date) {
  return request(`/wellness/activities?date=${encodeURIComponent(date)}`);
}

export function addActivity(activity) {
  return request("/wellness/activities", {
    method: "POST",
    body: JSON.stringify(activity),
  });
}

export function removeActivity(entryId) {
  return request(`/wellness/activities/${entryId}`, { method: "DELETE" });
}

export function getSleep(date) {
  return request(`/wellness/sleep?date=${encodeURIComponent(date)}`);
}

export function saveSleep(sleep) {
  return request("/wellness/sleep", {
    method: "PUT",
    body: JSON.stringify(sleep),
  });
}

export function getWellnessProfile() {
  return request("/wellness/profile");
}

export function updateWellnessProfile(profile) {
  return request("/wellness/profile", {
    method: "PATCH",
    body: JSON.stringify(profile),
  });
}

export function getHabitSchedule() {
  return request("/wellness/schedule");
}

export function saveHabitSchedule(schedules) {
  return request("/wellness/schedule", {
    method: "PUT",
    body: JSON.stringify({ schedules }),
  });
}

export function getConsistency(date, days = 7) {
  const timezoneOffsetMinutes = new Date().getTimezoneOffset();
  return request(
    `/wellness/consistency?date=${encodeURIComponent(date)}&days=${days}&timezone_offset_minutes=${timezoneOffsetMinutes}`
  );
}

export function getRecovery(date, days = 14) {
  return request(
    `/wellness/recovery?date=${encodeURIComponent(date)}&days=${days}`
  );
}

export function getProgressAnalysis(date) {
  const timezoneOffsetMinutes = new Date().getTimezoneOffset();
  return request(
    `/progress/analysis?date=${encodeURIComponent(date)}&timezone_offset_minutes=${timezoneOffsetMinutes}`
  );
}
