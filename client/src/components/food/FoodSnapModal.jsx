import React, { useEffect, useRef, useState } from "react";
import { analyzeFoodImage, matchUSDAFood } from "../../services/foodApi";

const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const SUPPORTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

function updateItem(items, index, changes) {
  return items.map((item, itemIndex) =>
    itemIndex === index ? { ...item, ...changes } : item
  );
}

function handleFileChange(event, selectImage) {
  selectImage(event.target.files?.[0]);
  event.target.value = "";
}

export default function FoodSnapModal({ onClose, onSave }) {
  const [image, setImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [savingIndex, setSavingIndex] = useState(null);
  const filePicker = useRef(null);
  const cameraPicker = useRef(null);

  useEffect(() => {
    if (!image) {
      setPreviewUrl("");
      return undefined;
    }
    const objectUrl = URL.createObjectURL(image);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [image]);

  function selectImage(file) {
    setError("");
    setItems([]);
    setNote("");
    if (!file) return;
    if (!SUPPORTED_TYPES.includes(file.type)) {
      setImage(null);
      setError("Choose a JPEG, PNG, or WebP image.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setImage(null);
      setError("Image must be 6 MB or smaller.");
      return;
    }
    setImage(file);
  }

  async function analyzeImage() {
    if (!image) {
      setError("Choose an image before scanning.");
      return;
    }
    setLoading(true);
    setError("");
    setItems([]);
    try {
      const result = await analyzeFoodImage(image);
      setItems(
        result.items.map((item) => ({
          ...item,
          food_name: item.name,
          portion_grams: String(item.portionGrams),
          meal_type: "Snack",
          ...Object.fromEntries(
            Object.entries(item.nutritionPer100g).map(([key, value]) => [
              key,
              String(value),
            ])
          ),
          visualNutrition: Object.fromEntries(
            Object.entries(item.nutritionPer100g).map(([key, value]) => [
              key,
              String(value),
            ])
          ),
          usdaMatch: null,
          matching: false,
          saved: false,
          saveError: "",
        }))
      );
      setNote(result.note || "");
      if (!result.items.length) {
        setError("No food was recognized. Try a clearer photo.");
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function lookupUSDA(index) {
    const item = items[index];
    setItems((previous) =>
      updateItem(previous, index, { matching: true, saveError: "" })
    );
    try {
      const { match } = await matchUSDAFood(item.food_name);
      if (!match) {
        setItems((previous) =>
          updateItem(previous, index, {
            matching: false,
            usdaMatch: null,
            saveError: "No close USDA match found; using editable visual estimates.",
          })
        );
        return;
      }
      setItems((previous) =>
        updateItem(previous, index, {
          matching: false,
          usdaMatch: match,
          calories: String(match.nutritionPer100g.calories),
          protein: String(match.nutritionPer100g.protein),
          carbs: String(match.nutritionPer100g.carbs),
          fat: String(match.nutritionPer100g.fat),
          saveError: "",
        })
      );
    } catch (requestError) {
      setItems((previous) =>
        updateItem(previous, index, {
          matching: false,
          saveError: `${requestError.message} Visual estimates are still available.`,
        })
      );
    }
  }

  async function saveItem(index) {
    const item = items[index];
    const portion = Number(item.portion_grams);
    const macros = ["calories", "protein", "carbs", "fat"].map((key) =>
      Number(item[key])
    );
    if (
      !item.food_name.trim() ||
      !Number.isFinite(portion) ||
      portion < 1 ||
      portion > 3000 ||
      macros.some(
        (value, macroIndex) =>
          !Number.isFinite(value) ||
          value < 0 ||
          value > (macroIndex === 0 ? 9000 : 100)
      )
    ) {
      setItems((previous) =>
        updateItem(previous, index, {
          saveError: "Enter a food name, portion from 1 to 3000 g, and valid nutrition values.",
        })
      );
      return;
    }

    setSavingIndex(index);
    setItems((previous) =>
      updateItem(previous, index, { saveError: "" })
    );
    try {
      await onSave({
        food_name: item.food_name.trim(),
        meal_type: item.meal_type,
        portion_grams: portion,
        calories_per_100g: macros[0],
        protein_per_100g: macros[1],
        carbs_per_100g: macros[2],
        fat_per_100g: macros[3],
      });
      setItems((previous) =>
        updateItem(previous, index, { saved: true, saveError: "" })
      );
    } catch (requestError) {
      setItems((previous) =>
        updateItem(previous, index, { saveError: requestError.message })
      );
    } finally {
      setSavingIndex(null);
    }
  }

  function closeOnEscape(event) {
    if (event.key === "Escape" && !loading && savingIndex === null) {
      onClose();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/80 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onKeyDown={closeOnEscape}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="food-snap-title"
        className="max-h-[95vh] w-full max-w-3xl overflow-y-auto rounded-t-3xl border border-slate-700 bg-slate-900 p-5 shadow-2xl sm:rounded-3xl sm:p-7"
      >
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-violet-300">
              AI food estimate
            </p>
            <h2 id="food-snap-title" className="mt-2 text-2xl font-bold">
              Scan Food
            </h2>
            <p className="mt-2 max-w-xl text-sm text-slate-400">
              Take a photo or choose an image. Review and edit every estimate
              before adding it to your existing food log.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading || savingIndex !== null}
            aria-label="Close Scan Food"
            className="rounded-lg px-3 py-2 text-slate-300 hover:bg-slate-800 disabled:opacity-50"
          >
            Close
          </button>
        </header>

        <div className="mt-5 flex flex-wrap gap-3">
          <input
            ref={cameraPicker}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            className="sr-only"
            onChange={(event) => handleFileChange(event, selectImage)}
          />
          <input
            ref={filePicker}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(event) => handleFileChange(event, selectImage)}
          />
          <button
            type="button"
            onClick={() => cameraPicker.current?.click()}
            className="rounded-xl border border-slate-600 px-4 py-3 text-sm font-semibold hover:bg-slate-800"
          >
            Take a photo
          </button>
          <button
            type="button"
            onClick={() => filePicker.current?.click()}
            className="rounded-xl border border-slate-600 px-4 py-3 text-sm font-semibold hover:bg-slate-800"
          >
            Choose image
          </button>
        </div>

        {previewUrl && (
          <div className="mt-5 grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <img
              src={previewUrl}
              alt="Preview of selected food"
              className="max-h-72 w-full rounded-2xl border border-slate-700 bg-slate-950 object-contain"
            />
            <button
              type="button"
              onClick={analyzeImage}
              disabled={loading}
              className="rounded-xl bg-gradient-to-r from-violet-400 to-cyan-400 px-5 py-3 font-semibold text-slate-950 disabled:opacity-50"
            >
              {loading ? "Analyzing image..." : "Analyze photo"}
            </button>
          </div>
        )}

        {loading && (
          <p role="status" className="mt-4 text-sm text-cyan-200">
            Estimating food, portion sizes, and nutrition...
          </p>
        )}
        {error && (
          <p role="alert" className="mt-4 rounded-xl bg-red-950 p-3 text-sm text-red-200">
            {error}
          </p>
        )}
        {note && items.length > 0 && (
          <p className="mt-4 rounded-xl bg-amber-950/60 p-3 text-sm text-amber-100">
            {note}
          </p>
        )}

        {items.map((item, index) => (
          <article
            key={`${item.name}-${index}`}
            className="mt-5 rounded-2xl border border-slate-700 bg-slate-950/70 p-4 sm:p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-lg font-semibold">Detected item {index + 1}</h3>
              {item.saved && (
                <span className="rounded-full bg-emerald-950 px-3 py-1 text-sm text-emerald-200">
                  Saved to food log
                </span>
              )}
            </div>

            <label className="mt-4 block text-sm text-slate-300">
              Food name
              <input
                value={item.food_name}
                maxLength={120}
                disabled={item.saved || item.matching}
                onChange={(event) =>
                  setItems((previous) =>
                    updateItem(previous, index, {
                      food_name: event.target.value,
                      usdaMatch: null,
                      calories: item.visualNutrition.calories,
                      protein: item.visualNutrition.protein,
                      carbs: item.visualNutrition.carbs,
                      fat: item.visualNutrition.fat,
                    })
                  )
                }
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white"
              />
            </label>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="text-sm text-slate-300">
                Portion (g)
                <input
                  type="number"
                  min="1"
                  max="3000"
                  step="1"
                  value={item.portion_grams}
                  disabled={item.saved}
                  onChange={(event) =>
                    setItems((previous) =>
                      updateItem(previous, index, {
                        portion_grams: event.target.value,
                      })
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white"
                />
              </label>
              <label className="text-sm text-slate-300">
                Meal
                <select
                  value={item.meal_type}
                  disabled={item.saved}
                  onChange={(event) =>
                    setItems((previous) =>
                      updateItem(previous, index, {
                        meal_type: event.target.value,
                      })
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white"
                >
                  <option>Breakfast</option>
                  <option>Lunch</option>
                  <option>Dinner</option>
                  <option>Snack</option>
                </select>
              </label>
              {[
                ["calories", "Calories", 9000],
                ["protein", "Protein (g)", 100],
                ["carbs", "Carbs (g)", 100],
                ["fat", "Fat (g)", 100],
              ].map(([key, label]) => (
                <label key={key} className="text-sm text-slate-300">
                  {label} per 100 g
                  <input
                    type="number"
                    min="0"
                    max={String(key === "calories" ? 9000 : 100)}
                    step="any"
                    value={item[key]}
                    disabled={item.saved || item.matching}
                    onChange={(event) =>
                      setItems((previous) =>
                        updateItem(previous, index, {
                          [key]: event.target.value,
                        })
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white"
                  />
                </label>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={item.saved || item.matching}
                onClick={() => lookupUSDA(index)}
                className="rounded-xl border border-emerald-500/50 px-4 py-2 text-sm font-semibold text-emerald-200 hover:bg-emerald-950 disabled:opacity-50"
              >
                {item.matching
                  ? "Looking up USDA..."
                  : item.usdaMatch
                    ? `USDA match: ${item.usdaMatch.name}`
                    : "Improve with USDA"}
              </button>
              <button
                type="button"
                disabled={item.saved || savingIndex !== null}
                onClick={() => saveItem(index)}
                className="rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
              >
                {savingIndex === index
                  ? "Saving..."
                  : item.saved
                    ? "Added"
                    : "Confirm and add to log"}
              </button>
            </div>
            {item.usdaMatch && (
              <p className="mt-2 text-xs text-emerald-200">
                Nutrition fields updated from USDA {item.usdaMatch.dataType}
                data; values remain editable.
              </p>
            )}
            {item.saveError && (
              <p role="alert" className="mt-3 text-sm text-amber-200">
                {item.saveError}
              </p>
            )}
          </article>
        ))}

        <footer className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-600 px-5 py-3 text-sm font-semibold hover:bg-slate-800"
          >
            Done
          </button>
        </footer>
      </section>
    </div>
  );
}
