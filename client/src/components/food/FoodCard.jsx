import React from "react";

function getNutrient(food, nutrientId) {
    const nutrient = food.foodNutrients?.find((item) =>
        Number(item.nutrientId ?? item.nutrient?.id) === nutrientId
    );
    const value = nutrient?.value ?? nutrient?.amount;
    return value === undefined || value === null ? null : Number(value);
}

function format(value) {
    return value === null ? "—" : Number(value.toFixed(1)).toString();
}

function FoodCard({ food, onView, onAdd, adding }) {
    const serving = food.servingSize
        ? `${format(Number(food.servingSize))} ${food.servingSizeUnit || "g"}`
        : food.householdServingFullText || "Serving size not listed";
    const brand = food.brandName || food.brandOwner;
    const calories = getNutrient(food, 1008);
    const protein = getNutrient(food, 1003);

    return (
        <article className="flex flex-col justify-between gap-5 rounded-2xl border border-slate-700 bg-slate-950/80 p-5 sm:flex-row sm:items-center">
            <div className="min-w-0">
                <h3 className="font-semibold text-white">{food.description}</h3>
                {brand && <p className="mt-1 text-sm text-slate-400">{brand}</p>}
                <p className="mt-2 text-sm text-slate-400">Serving: {serving}</p>
                <p className="mt-2 text-sm text-slate-300">
                    {calories === null ? "Calories unavailable" : `${format(calories)} kcal`}
                    {" · "}
                    {protein === null ? "Protein unavailable" : `${format(protein)} g protein`}
                </p>
            </div>
            <div className="flex shrink-0 gap-2">
                <button
                    type="button"
                    onClick={() => onView(food.fdcId)}
                    className="rounded-xl border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
                >
                    View details
                </button>
                <button
                    type="button"
                    onClick={() => onAdd(food.fdcId)}
                    disabled={adding}
                    className="rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
                >
                    {adding ? "Loading..." : "Add to diet"}
                </button>
            </div>
        </article>
    );
}

export default FoodCard;
