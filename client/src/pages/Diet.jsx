
import React, { useEffect, useState } from "react";
import Navbar from "../components/NavBar";
import Sidebar from "../components/Sidebar";
import {
  searchFoods,
  getFoodDetails,
  saveFood,
  getFoodLogs,
  updateConsumed,
} from "../services/foodApi";

const USER_ID = 1; // Prototype only; replace with authenticated user.

const emptyFood = {
  food_name: "",
  meal_type: "Breakfast",
  quantity: "100",
  calories: "",
  protein: "",
  carbs: "",
  fat: "",
};

function extractNutrients(food) {
  const result = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  };

  const nutrients = food.foodNutrients || [];

  for (const item of nutrients) {
    const nutrientName = (
      item.nutrient?.name ||
      item.nutrientName ||
      item.name ||
      ""
    ).toLowerCase();

    const value = Number(
      item.amount ?? item.value ?? item.nutrient?.amount ?? 0
    );

    if (!Number.isFinite(value)) continue;

    if (nutrientName.includes("energy") &&
        (nutrientName.includes("kcal") ||
         (item.nutrient?.unitName || item.unitName || "").toLowerCase() === "kcal")) {
      result.calories = value;
    } else if (
      nutrientName === "protein" ||
      nutrientName.includes("protein,")
    ) {
      result.protein = value;
    } else if (
      nutrientName.includes("carbohydrate, by difference") ||
      nutrientName === "carbohydrate"
    ) {
      result.carbs = value;
    } else if (
      nutrientName === "total lipid (fat)" ||
      nutrientName === "total fat"
    ) {
      result.fat = value;
    }
  }

  return result;
}

function localDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function Diet() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [food, setFood] = useState(emptyFood);
  const [foodLogs, setFoodLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [quantity, setQuantity] = useState("100");

  async function loadFoodLogs() {
    try {
      const data = await getFoodLogs(USER_ID);
      setFoodLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    loadFoodLogs();
  }, []);

  async function handleSearch(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!query.trim()) return;

    setLoading(true);

    try {
      const data = await searchFoods(query.trim());
      const foods = Array.isArray(data)
        ? data
        : data.foods || data.data?.foods || [];

      setResults(foods);

      if (!foods.length) {
        setMessage("No foods found. Try another search.");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function selectFood(item) {
    setError("");
    setMessage("");

    try {
      const detail = await getFoodDetails(item.fdcId);
      const nutrients = extractNutrients(detail);

      setFood({
        ...emptyFood,
        food_name: detail.description || item.description,
        calories: String(nutrients.calories),
        protein: String(nutrients.protein),
        carbs: String(nutrients.carbs),
        fat: String(nutrients.fat),
      });

      setQuantity("100");
      setMessage(
        "Food details loaded. Confirm the nutrient values and serving size before saving."
      );
    } catch (err) {
      setError(err.message);
    }
  }

  function handleFieldChange(event) {
    setFood((previous) => ({
      ...previous,
      [event.target.name]: event.target.value,
    }));
  }

  async function handleAddFood(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    const grams = Number(quantity);

    if (!Number.isFinite(grams) || grams <= 0) {
      setError("Enter a valid serving size in grams.");
      return;
    }

    setSaving(true);

    try {
      // USDA nutrients are commonly reported per 100 g for
      // applicable food data types. Scale them to the chosen portion.
      const factor = grams / 100;

      const payload = {
        user_id: USER_ID,
        food_name: food.food_name,
        meal_type: food.meal_type,
        quantity: grams,
        quantity_unit: "g",
        calories: Number(food.calories || 0) * factor,
        protein: Number(food.protein || 0) * factor,
        carbs: Number(food.carbs || 0) * factor,
        fat: Number(food.fat || 0) * factor,
        is_consumed: true,
      };

      await saveFood(payload);
      setFood(emptyFood);
      setQuantity("100");
      setMessage("Food added successfully.");
      await loadFoodLogs();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleConsumed(item) {
    setError("");

    try {
      await updateConsumed(
        item.food_log_id,
        USER_ID,
        !item.is_consumed
      );
      await loadFoodLogs();
    } catch (err) {
      setError(err.message);
    }
  }

  const today = localDate();

  const todaysLogs = foodLogs.filter((item) => {
    const createdDate = item.created_at
      ? new Date(item.created_at).toLocaleDateString("en-CA")
      : "";
    return createdDate === today;
  });

  const consumed = todaysLogs.filter((item) => item.is_consumed);

  const totalCalories = consumed.reduce(
    (sum, item) => sum + Number(item.calories || 0),
    0
  );

  const totalProtein = consumed.reduce(
    (sum, item) => sum + Number(item.protein || 0),
    0
  );

  const totalCarbs = consumed.reduce(
    (sum, item) => sum + Number(item.carbs || 0),
    0
  );

  const totalFat = consumed.reduce(
    (sum, item) => sum + Number(item.fat || 0),
    0
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar />

      <div className="mx-auto flex max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <Sidebar />

        <main className="min-w-0 flex-1 space-y-6">
          <header>
            <p className="text-xs uppercase tracking-[0.32em] text-emerald-300">
              USDA Nutrition
            </p>
            <h1 className="mt-3 text-3xl font-bold">Diet & Food Tracker</h1>
            <p className="mt-2 text-slate-400">
              Search food, log your portions and mark meals as eaten.
            </p>
          </header>

          {error && (
            <p role="alert" className="rounded-xl bg-red-950 p-3 text-red-200">
              {error}
            </p>
          )}

          {message && (
            <p className="rounded-xl bg-emerald-950 p-3 text-emerald-200">
              {message}
            </p>
          )}

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Calories", totalCalories, "kcal"],
              ["Protein", totalProtein, "g"],
              ["Carbs", totalCarbs, "g"],
              ["Fat", totalFat, "g"],
            ].map(([label, value, unit]) => (
              <div
                key={label}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
              >
                <p className="text-sm text-slate-400">{label} consumed today</p>
                <p className="mt-2 text-2xl font-bold text-emerald-300">
                  {Number(value).toFixed(1)} {unit}
                </p>
              </div>
            ))}
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-xl font-semibold">Search USDA foods</h2>

            <form onSubmit={handleSearch} className="mt-4 flex gap-3">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search chicken, oats, rice..."
                className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3"
              />
              <button
                disabled={loading}
                className="rounded-xl bg-emerald-400 px-5 py-3 font-semibold text-slate-950 disabled:opacity-50"
              >
                {loading ? "Searching..." : "Search"}
              </button>
            </form>

            <div className="mt-4 space-y-3">
              {results.map((item) => (
                <div
                  key={item.fdcId}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 p-4"
                >
                  <div>
                    <h3 className="font-medium">
                      {item.description || "Unnamed food"}
                    </h3>
                    <p className="text-sm text-slate-400">
                      USDA ID: {item.fdcId}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => selectFood(item)}
                    className="rounded-lg bg-slate-700 px-4 py-2"
                  >
                    Select food
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-xl font-semibold">Add food to today's log</h2>

            <form onSubmit={handleAddFood} className="mt-4 space-y-4">
              <input
                name="food_name"
                value={food.food_name}
                onChange={handleFieldChange}
                placeholder="Select a USDA food above, or enter food name"
                required
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3"
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <select
                  name="meal_type"
                  value={food.meal_type}
                  onChange={handleFieldChange}
                  className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3"
                >
                  <option>Breakfast</option>
                  <option>Lunch</option>
                  <option>Dinner</option>
                  <option>Snack</option>
                </select>

                <input
                  type="number"
                  min="1"
                  step="1"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  placeholder="Serving size (g)"
                  required
                  className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3"
                />

                {[
                  ["calories", "Calories per 100 g"],
                  ["protein", "Protein per 100 g"],
                  ["carbs", "Carbs per 100 g"],
                  ["fat", "Fat per 100 g"],
                ].map(([name, placeholder]) => (
                  <input
                    key={name}
                    name={name}
                    type="number"
                    min="0"
                    step="any"
                    value={food[name]}
                    onChange={handleFieldChange}
                    placeholder={placeholder}
                    className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3"
                  />
                ))}
              </div>

              <p className="text-sm text-slate-400">
                Check the USDA food data type and serving basis before using
                the per-100 g scaling. Branded foods and other serving-based
                records may need different handling.
              </p>

              <button
                disabled={saving}
                className="rounded-xl bg-gradient-to-r from-violet-400 to-cyan-400 px-6 py-3 font-semibold text-slate-950 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Add to diet"}
              </button>
            </form>
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-xl font-semibold">Today's food log</h2>

            <div className="mt-4 space-y-3">
              {todaysLogs.map((item) => (
                <label
                  key={item.food_log_id}
                  className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-800 p-4"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(item.is_consumed)}
                    onChange={() => toggleConsumed(item)}
                    className="h-5 w-5 accent-emerald-400"
                  />

                  <div className="min-w-0 flex-1">
                    <p
                      className={`font-semibold ${
                        item.is_consumed
                          ? "text-white"
                          : "text-slate-400"
                      }`}
                    >
                      {item.food_name}
                    </p>
                    <p className="text-sm text-slate-400">
                      {item.meal_type} ·{" "}
                      {item.quantity
                        ? `${item.quantity} ${item.quantity_unit || "g"}`
                        : "Portion not specified"}
                    </p>
                  </div>

                  <p className="whitespace-nowrap text-emerald-300">
                    {Number(item.calories).toFixed(0)} kcal
                  </p>
                </label>
              ))}

              {!todaysLogs.length && (
                <p className="text-slate-400">
                  No food logs recorded today.
                </p>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
