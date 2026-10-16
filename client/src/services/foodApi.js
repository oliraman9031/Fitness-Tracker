import { apiRequest } from "./api";

export function analyzeFoodImage(image) {
  const formData = new FormData();
  formData.append("image", image);
  return apiRequest("/food/ai-snap", {
    method: "POST",
    body: formData,
  });
}

export function matchUSDAFood(name) {
  return apiRequest("/food/ai-snap/usda-match", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export function searchFoods(query) {
  return apiRequest(`/food/search?query=${encodeURIComponent(query)}`);
}

export function getFoodDetails(fdcId) {
  return apiRequest(`/food/${encodeURIComponent(fdcId)}`);
}

export function saveFood(food) {
  return apiRequest("/diet", {
    method: "POST",
    body: JSON.stringify(food),
  });
}

export function getFoodLogs() {
  return apiRequest("/diet");
}

export function updateConsumed(foodLogId, isConsumed) {
  return apiRequest(`/diet/${foodLogId}/consumed`, {
    method: "PATCH",
    body: JSON.stringify({ is_consumed: isConsumed }),
  });
}

export function getDailySummary(date) {
  return apiRequest(
    `/coach/daily-summary?date=${encodeURIComponent(date)}`
  );
}

export function saveWorkout(workout) {
  return apiRequest("/workouts", {
    method: "POST",
    body: JSON.stringify(workout),
  });
}

export function getWorkouts() {
  return apiRequest("/workouts");
}

export function getRecommendations(data) {
  return apiRequest("/coach/recommendations", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function saveMealPlan(date, planData) {
  return apiRequest("/coach/meal-plan", {
    method: "POST",
    body: JSON.stringify({ date, plan_data: planData }),
  });
}

export function getMealPlan(date) {
  return apiRequest(
    `/coach/meal-plan?date=${encodeURIComponent(date)}`
  );
}
