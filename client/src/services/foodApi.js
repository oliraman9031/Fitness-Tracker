const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    // The API uses an HttpOnly session cookie. Without credentials,
    // protected endpoints respond with 401 even when the user is logged in.
    credentials: "include",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || `Request failed (${response.status}).`);
  }

  return data;
}

export function searchFoods(query) {
  return request(`/api/food/search?query=${encodeURIComponent(query)}`);
}

export function getFoodDetails(fdcId) {
  return request(`/api/food/${encodeURIComponent(fdcId)}`);
}

export function saveFood(food) {
  return request("/api/diet", {
    method: "POST",
    body: JSON.stringify(food),
  });
}

// The authenticated backend identifies the user from the session cookie.
// There is no GET /api/diet/:userId route.
export function getFoodLogs() {
  return request("/api/diet");
}

export function updateConsumed(foodLogId, isConsumed) {
  return request(`/api/diet/${encodeURIComponent(foodLogId)}/consumed`, {
    method: "PATCH",
    body: JSON.stringify({ is_consumed: isConsumed }),
  });
}

// The backend route is GET /api/coach/daily-summary?date=YYYY-MM-DD.
// It does not accept a user ID in the URL.
export function getDailySummary(date) {
  return request(
    `/api/coach/daily-summary?date=${encodeURIComponent(date)}`
  );
}

export function getProgress() {
  return request("/api/progress");
}

export function saveProgress(weight) {
  return request("/api/progress", {
    method: "POST",
    body: JSON.stringify({ weight: Number(weight) }),
  });
}

export function saveWorkout(workout) {
  return request("/api/workouts", {
    method: "POST",
    body: JSON.stringify(workout),
  });
}

export function getWorkouts(userId) {
  return request(`/api/workouts/${encodeURIComponent(userId)}`);
}

export function getRecommendations(data) {
  return request("/api/coach/recommendations", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function saveMealPlan(userId, date, planData) {
  return request("/api/coach/meal-plan", {
    method: "POST",
    body: JSON.stringify({
      user_id: userId,
      date,
      plan_data: planData,
    }),
  });
}

export function getMealPlan(userId, date) {
  return request(
    `/api/coach/meal-plan?date=${encodeURIComponent(date)}`
  );
}
