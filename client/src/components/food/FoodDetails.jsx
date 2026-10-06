import React, { useEffect, useState } from "react";
import { getFoodDetails } from "../../services/foodApi";

const nutrients = [
    { id: 1008, label: "Calories", unit: "kcal" },
    { id: 1003, label: "Protein", unit: "g" },
    { id: 1005, label: "Carbohydrates", unit: "g" },
    { id: 1004, label: "Fat", unit: "g" },
    { id: 1079, label: "Fiber", unit: "g" },
    { id: 2000, label: "Sugar", unit: "g" },
    { id: 1093, label: "Sodium", unit: "mg" }
];

function nutrientAmount(food, nutrientId) {
    const item = food.foodNutrients?.find(
        (nutrient) => Number(nutrient.nutrient?.id) === nutrientId
    );
    if (item?.amount === undefined || item.amount === null) {
        return null;
    }
    const amount = Number(item.amount);
    return Number.isFinite(amount) ? amount : null;
}

function FoodDetails({ fdcId, onClose, onAdd }) {
    const [food, setFood] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let active = true;
        setLoading(true);
        setError("");

        getFoodDetails(fdcId)
            .then((details) => {
                if (active) setFood(details);
            })
            .catch((requestError) => {
                if (active) setError(requestError.message);
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => { active = false; };
    }, [fdcId]);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/80 p-4"
            role="presentation"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="food-details-title"
                className="my-auto max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl"
            >
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">USDA food details</p>
                        <h2 id="food-details-title" className="mt-2 text-2xl font-bold text-white">
                            {food?.description || "Food details"}
                        </h2>
                    </div>
                    <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-slate-300 hover:bg-slate-800">
                        Close
                    </button>
                </div>

                {loading && <p className="mt-6 text-slate-300">Loading nutrition details...</p>}
                {error && <p role="alert" className="mt-6 text-rose-300">{error}</p>}
                {food && !loading && (
                    <>
                        <p className="mt-3 text-sm text-slate-400">
                            Serving: {food.servingSize ? `${Number(Number(food.servingSize).toFixed(1))} ${food.servingSizeUnit || "g"}` : "100 g"}
                            {food.brandName || food.brandOwner ? ` · ${food.brandName || food.brandOwner}` : ""}
                        </p>
                        <dl className="mt-6 grid gap-3 sm:grid-cols-2">
                            {nutrients.map((item) => {
                                const amount = nutrientAmount(food, item.id);
                                return (
                                    <div key={item.id} className="rounded-xl border border-slate-700 bg-slate-950 p-4">
                                        <dt className="text-sm text-slate-400">{item.label}</dt>
                                        <dd className="mt-1 font-semibold text-white">
                                            {amount === null ? "Not provided" : `${amount} ${item.unit}`}
                                        </dd>
                                    </div>
                                );
                            })}
                        </dl>
                        <button
                            type="button"
                            onClick={() => onAdd(food)}
                            className="mt-6 w-full rounded-xl bg-emerald-400 px-5 py-3 font-semibold text-slate-950"
                        >
                            Add to diet
                        </button>
                    </>
                )}
            </section>
        </div>
    );
}

export default FoodDetails;
