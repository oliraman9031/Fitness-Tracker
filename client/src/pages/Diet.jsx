import React, { useCallback, useEffect, useMemo, useState } from "react";
import Navbar from "../components/NavBar";
import Sidebar from "../components/Sidebar";
import FoodCard from "../components/food/FoodCard";
import FoodDetails from "../components/food/FoodDetails";
import FoodSearch from "../components/food/FoodSearch";
import {
    addFoodToDiet,
    getDietLogs,
    getFoodDetails,
    saveFood
} from "../services/foodApi";

const userId = 1;
const mealTypes = ["Breakfast", "Lunch", "Dinner", "Snack"];
const nutritionFields = [
    { key: "calories", label: "Calories", unit: "kcal" },
    { key: "protein", label: "Protein", unit: "g" },
    { key: "carbs", label: "Carbs", unit: "g" },
    { key: "fat", label: "Fat", unit: "g" },
    { key: "fiber", label: "Fiber", unit: "g" },
    { key: "sugar", label: "Sugar", unit: "g" },
    { key: "sodium", label: "Sodium", unit: "mg" }
];

function totalFor(logs, field) {
    return logs.reduce((total, log) => total + (Number(log[field]) || 0), 0);
}

function formatNutrition(value) {
    return Number(value.toFixed(1)).toString();
}

function Diet() {
    const [results, setResults] = useState([]);
    const [foodLogs, setFoodLogs] = useState([]);
    const [logsLoading, setLogsLoading] = useState(true);
    const [pageError, setPageError] = useState("");
    const [detailsId, setDetailsId] = useState(null);
    const [pendingFood, setPendingFood] = useState(null);
    const [quantity, setQuantity] = useState("");
    const [mealType, setMealType] = useState("Breakfast");
    const [addingId, setAddingId] = useState(null);
    const [saving, setSaving] = useState(false);

    const loadFoodLogs = useCallback(async () => {
        setLogsLoading(true);
        try {
            setFoodLogs(await getDietLogs(userId));
            setPageError("");
        } catch (error) {
            setPageError(error.message);
        } finally {
            setLogsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadFoodLogs();
    }, [loadFoodLogs]);

    const totals = useMemo(
        () => Object.fromEntries(nutritionFields.map(({ key }) => [key, totalFor(foodLogs, key)])),
        [foodLogs]
    );

    function prepareFood(food) {
        setDetailsId(null);
        setPendingFood(food);
        const servingSize = Number(food.servingSize);
        setQuantity(String(Number.isFinite(servingSize) && servingSize > 0
            ? Number(servingSize.toFixed(2))
            : 100));
        setMealType("Breakfast");
        setPageError("");
    }

    async function openAddForm(fdcId) {
        setAddingId(fdcId);
        setPageError("");
        try {
            prepareFood(await getFoodDetails(fdcId));
        } catch (error) {
            setPageError(error.message);
        } finally {
            setAddingId(null);
        }
    }

    async function handleAddToDiet(event) {
        event.preventDefault();
        const amount = Number(quantity);
        if (!Number.isFinite(amount) || amount <= 0) {
            setPageError("Enter a quantity greater than zero.");
            return;
        }

        setSaving(true);
        setPageError("");
        try {
            const savedFood = await saveFood(pendingFood);
            await addFoodToDiet({
                user_id: userId,
                food_id: savedFood.id,
                meal_type: mealType,
                quantity: amount,
                quantity_unit: savedFood.serving_unit || "g"
            });
            setPendingFood(null);
            await loadFoodLogs();
        } catch (error) {
            setPageError(error.message);
        } finally {
            setSaving(false);
        }
    }

    const quantityUnit = pendingFood?.servingSizeUnit || "g";

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100">
            <Navbar />
            <div className="mx-auto flex max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:px-8">
                <Sidebar />
                <main className="min-w-0 flex-1 space-y-6">
                    <section className="rounded-[32px] border border-slate-800 bg-slate-900/80 p-6">
                        <p className="text-xs uppercase tracking-[0.32em] text-emerald-300">Nutrition</p>
                        <h1 className="mt-3 text-3xl font-bold text-white">Diet</h1>
                        <p className="mt-2 text-slate-400">
                            Search USDA foods, choose a meal, and track nutrition for the amount you eat.
                        </p>
                    </section>

                    <section className="rounded-2xl border border-slate-700 bg-slate-900/80 p-5">
                        <div className="flex flex-wrap items-end justify-between gap-4">
                            <div>
                                <p className="text-sm text-slate-400">Today's nutrition</p>
                                <p className="mt-1 text-3xl font-bold text-emerald-300">
                                    {formatNutrition(totals.calories)} kcal
                                </p>
                            </div>
                            <p className="text-sm text-slate-400">Totals update when a food is added.</p>
                        </div>
                        <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
                            {nutritionFields.slice(1).map(({ key, label, unit }) => (
                                <div key={key} className="rounded-xl border border-slate-700 bg-slate-950 p-3">
                                    <dt className="text-xs text-slate-400">{label}</dt>
                                    <dd className="mt-1 font-semibold text-white">
                                        {formatNutrition(totals[key])} {unit}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    </section>

                    <FoodSearch onResults={setResults} />

                    {pageError && (
                        <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-200">
                            {pageError}
                        </p>
                    )}

                    {results.length > 0 && (
                        <section className="space-y-3" aria-label="USDA search results">
                            <h2 className="text-xl font-semibold text-white">Search results</h2>
                            {results.map((food) => (
                                <FoodCard
                                    key={food.fdcId}
                                    food={food}
                                    onView={setDetailsId}
                                    onAdd={openAddForm}
                                    adding={addingId === food.fdcId}
                                />
                            ))}
                        </section>
                    )}

                    <section className="rounded-2xl border border-slate-700 bg-slate-900/80 p-5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h2 className="text-xl font-semibold text-white">Today's meals</h2>
                                <p className="mt-1 text-sm text-slate-400">
                                    Nutrition values are scaled to each logged quantity.
                                </p>
                            </div>
                        </div>

                        {logsLoading ? (
                            <p className="mt-5 text-slate-400">Loading today's food...</p>
                        ) : foodLogs.length === 0 ? (
                            <p className="mt-5 text-slate-400">No foods logged today. Search above to add a meal.</p>
                        ) : (
                            <div className="mt-5 space-y-5">
                                {mealTypes.filter((meal) => foodLogs.some((item) => item.meal_type === meal)).map((meal) => (
                                    <div key={meal}>
                                        <h3 className="mb-2 font-semibold text-cyan-200">{meal}</h3>
                                        <div className="space-y-2">
                                            {foodLogs.filter((item) => item.meal_type === meal).map((item) => (
                                                <article
                                                    key={item.food_log_id}
                                                    className="flex flex-col justify-between gap-3 rounded-xl border border-slate-700 bg-slate-950/70 p-4 sm:flex-row sm:items-center"
                                                >
                                                    <div>
                                                        <h4 className="font-medium text-white">{item.food_name}</h4>
                                                        <p className="mt-1 text-sm text-slate-400">
                                                            {item.quantity} {item.quantity_unit}
                                                        </p>
                                                    </div>
                                                    <div className="text-sm text-slate-300 sm:text-right">
                                                        <p className="font-semibold text-emerald-300">
                                                            {formatNutrition(Number(item.calories) || 0)} kcal
                                                        </p>
                                                        <p className="mt-1">
                                                            Protein {formatNutrition(Number(item.protein) || 0)} g
                                                            {" · "}Carbs {formatNutrition(Number(item.carbs) || 0)} g
                                                            {" · "}Fat {formatNutrition(Number(item.fat) || 0)} g
                                                        </p>
                                                    </div>
                                                </article>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                </main>
            </div>

            {detailsId !== null && (
                <FoodDetails
                    fdcId={detailsId}
                    onClose={() => setDetailsId(null)}
                    onAdd={prepareFood}
                />
            )}

            {pendingFood && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/80 p-4"
                    role="presentation"
                >
                    <form
                        onSubmit={handleAddToDiet}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="add-food-title"
                        className="my-auto w-full max-w-lg rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl"
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-xs uppercase tracking-[0.25em] text-emerald-300">Add to diet</p>
                                <h2 id="add-food-title" className="mt-2 text-2xl font-bold text-white">{pendingFood.description}</h2>
                            </div>
                            <button
                                type="button"
                                onClick={() => setPendingFood(null)}
                                className="rounded-lg px-3 py-2 text-slate-300 hover:bg-slate-800"
                            >
                                Close
                            </button>
                        </div>
                        <label className="mt-6 block text-sm font-medium text-slate-300" htmlFor="meal-type">
                            Meal
                        </label>
                        <select
                            id="meal-type"
                            value={mealType}
                            onChange={(event) => setMealType(event.target.value)}
                            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                        >
                            {mealTypes.map((meal) => <option key={meal}>{meal}</option>)}
                        </select>
                        <label className="mt-4 block text-sm font-medium text-slate-300" htmlFor="food-quantity">
                            Quantity ({quantityUnit})
                        </label>
                        <input
                            id="food-quantity"
                            type="number"
                            min="0.01"
                            step="any"
                            required
                            value={quantity}
                            onChange={(event) => setQuantity(event.target.value)}
                            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                        />
                        <p className="mt-2 text-sm text-slate-400">
                            USDA nutrition is based on {formatNutrition(Number(pendingFood.servingSize) || 100)} {quantityUnit}.
                        </p>
                        {saving && <p className="mt-3 text-sm text-cyan-200">Saving food and adding meal...</p>}
                        <button
                            type="submit"
                            disabled={saving}
                            className="mt-6 w-full rounded-xl bg-emerald-400 px-5 py-3 font-semibold text-slate-950 disabled:opacity-60"
                        >
                            {saving ? "Adding..." : "Add to diet"}
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}

export default Diet;
