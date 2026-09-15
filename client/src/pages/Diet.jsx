import React, { useEffect, useState } from "react";
import Navbar from "../components/NavBar";
import Sidebar from "../components/Sidebar";

function Diet() {
    const [food, setFood] = useState({
        food_name: "",
        meal_type: "Breakfast",
        quantity: "",
        calories: "",
        protein: "",
        carbs: "",
        fat: ""
    });

    const [foodLogs, setFoodLogs] = useState([]);

    const userId = 1; // temporary until JWT authentication

    function handleChange(e) {
        setFood({
            ...food,
            [e.target.name]: e.target.value
        });
    }

    async function handleSubmit(e) {
        e.preventDefault();

        try {
            const response = await fetch(
                "http://localhost:5000/api/diet",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        user_id: userId,
                        ...food
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                alert(data.message);
                return;
            }

            alert("Food added successfully!");

            setFood({
                food_name: "",
                meal_type: "Breakfast",
                quantity: "",
                calories: "",
                protein: "",
                carbs: "",
                fat: ""
            });

            loadFoodLogs();

        } catch (error) {
            console.error(error);
            alert("Unable to connect to server.");
        }
    }

    async function loadFoodLogs() {
        try {
            const response = await fetch(
                `http://localhost:5000/api/diet/${userId}`
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Unable to load food logs");
            }

            setFoodLogs(Array.isArray(data) ? data : []);

        } catch (error) {
            console.error(error);
            setFoodLogs([]);
        }
    }

    useEffect(() => {
        loadFoodLogs();
    }, []);

    const totalCalories = foodLogs.reduce(
        (total, item) => total + Number(item.calories),
        0
    );

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100">

            <Navbar />

            <div className="mx-auto flex max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:px-8">

                <Sidebar />

                <main className="flex-1">

                    <div className="rounded-[32px] border border-slate-800 bg-slate-900/80 p-6">

                        <p className="text-xs uppercase tracking-[0.32em] text-emerald-300">
                            Nutrition
                        </p>

                        <h1 className="mt-3 text-3xl font-bold text-white">
                            Diet
                        </h1>

                        {/* Today's Calories */}

                        <div className="mt-6 rounded-2xl border border-slate-700 bg-slate-950 p-5">
                            <p className="text-sm text-slate-400">
                                Today's calorie intake
                            </p>

                            <h2 className="mt-2 text-4xl font-bold text-emerald-300">
                                {totalCalories.toFixed(0)} kcal
                            </h2>
                        </div>

                        {/* Add Food */}

                        <form
                            onSubmit={handleSubmit}
                            className="mt-6 rounded-2xl border border-slate-700 bg-slate-950 p-5"
                        >

                            <h2 className="text-xl font-semibold text-white">
                                Add Food
                            </h2>

                            <div className="mt-4 grid gap-4 md:grid-cols-2">

                                <input
                                    name="food_name"
                                    value={food.food_name}
                                    onChange={handleChange}
                                    placeholder="Food name"
                                    className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3"
                                    required
                                />

                                <select
                                    name="meal_type"
                                    value={food.meal_type}
                                    onChange={handleChange}
                                    className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3"
                                >
                                    <option>Breakfast</option>
                                    <option>Lunch</option>
                                    <option>Snack</option>
                                    <option>Dinner</option>
                                </select>

                                <input
                                    name="quantity"
                                    value={food.quantity}
                                    onChange={handleChange}
                                    placeholder="Quantity"
                                    className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3"
                                />

                                <input
                                    name="calories"
                                    type="number"
                                    value={food.calories}
                                    onChange={handleChange}
                                    placeholder="Calories (kcal)"
                                    className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3"
                                    required
                                />

                                <input
                                    name="protein"
                                    type="number"
                                    value={food.protein}
                                    onChange={handleChange}
                                    placeholder="Protein (g)"
                                    className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3"
                                />

                                <input
                                    name="carbs"
                                    type="number"
                                    value={food.carbs}
                                    onChange={handleChange}
                                    placeholder="Carbs (g)"
                                    className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3"
                                />

                                <input
                                    name="fat"
                                    type="number"
                                    value={food.fat}
                                    onChange={handleChange}
                                    placeholder="Fat (g)"
                                    className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3"
                                />

                            </div>

                            <button
                                type="submit"
                                className="mt-5 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 px-6 py-3 font-semibold text-slate-950"
                            >
                                Add Food
                            </button>

                        </form>

                        {/* Food Logs */}

                        <div className="mt-8">

                            <h2 className="text-xl font-semibold text-white">
                                Today's Food
                            </h2>

                            <div className="mt-4 space-y-3">

                                {foodLogs.map((item) => (
                                    <div
                                        key={item.food_log_id}
                                        className="flex items-center justify-between rounded-2xl border border-slate-700 bg-slate-950/70 p-4"
                                    >
                                        <div>
                                            <h3 className="font-semibold text-white">
                                                {item.food_name}
                                            </h3>

                                            <p className="text-sm text-slate-400">
                                                {item.meal_type} • {item.quantity}
                                            </p>
                                        </div>

                                        <p className="font-semibold text-emerald-300">
                                            {item.calories} kcal
                                        </p>
                                    </div>
                                ))}

                            </div>

                        </div>

                    </div>

                </main>

            </div>

        </div>
    );
}

export default Diet;