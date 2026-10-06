const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

function localDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

async function request(path, options) {
    const response = await fetch(`${API_URL}${path}`, options);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.message || `Request failed (${response.status})`);
    }

    return data;
}

export async function searchFoods(query) {
    const data = await request(`/food/search?query=${encodeURIComponent(query)}`);
    return Array.isArray(data.foods) ? data.foods : [];
}

export async function getFoodDetails(fdcId) {
    return request(`/food/${encodeURIComponent(fdcId)}`);
}

export async function saveFood(food) {
    const data = await request("/food/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(food)
    });
    return data.food;
}

export async function addFoodToDiet(foodLog) {
    return request("/diet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...foodLog, logged_date: foodLog.logged_date || localDate() })
    });
}

export async function getDietLogs(userId) {
    return request(`/diet/${encodeURIComponent(userId)}?date=${localDate()}`);
}
