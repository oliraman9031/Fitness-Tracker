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



const API_BASE = "http://localhost:5000";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Request failed.");
  }

  return data;
}

export function searchFoods(query) {
  return request(
    `/api/food/search?query=${encodeURIComponent(query)}`
  );
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

export function getFoodLogs(userId) {
  return request(`/api/diet/${userId}`);
}

export function updateConsumed(foodLogId, userId, isConsumed) {
  return request(`/api/diet/${foodLogId}/consumed`, {
    method: "PATCH",
    body: JSON.stringify({
      user_id: userId,
      is_consumed: isConsumed,
    }),
  });
}

export function getDailySummary(userId, date) {
  return request(
    `/api/coach/daily-summary/${userId}?date=${encodeURIComponent(date)}`
  );
}

export function saveWorkout(workout) {
  return request("/api/workouts", {
    method: "POST",
    body: JSON.stringify(workout),
  });
}

export function getWorkouts(userId) {
  return request(`/api/workouts/${userId}`);
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
    `/api/coach/meal-plan/${userId}?date=${encodeURIComponent(date)}`
  );
}
