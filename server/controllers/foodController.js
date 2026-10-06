const usdaService = require("../services/usdaService");
const foodQueries = require("../db/foodQueries");

const optionalNonNegativeNumber = (value, fieldName) => {
    if (value === undefined || value === null ||
        (typeof value === "string" && value.trim() === "")) {
        return { valid: true, value: null };
    }

    if (typeof value !== "number" && typeof value !== "string") {
        return { valid: false, fieldName };
    }

    const number = Number(value);
    if (!Number.isFinite(number) || number < 0) {
        return { valid: false, fieldName };
    }

    return { valid: true, value: number };
};

const searchFood = async (req, res) => {
    try {
        const query = typeof req.query.query === "string" ? req.query.query.trim() : "";

        if (!query) {
            return res.status(400).json({
                message: "Food search query is required"
            });
        }

        const data = await usdaService.searchFoods(query);

        res.json(data);
    } catch (error) {
        console.error("USDA search error:", error.message);

        res.status(usdaService.getErrorStatus(error)).json({
            message: "Failed to search food data",
            error: error.message
        });
    }
};

const getFood = async (req, res) => {
    try {
        const { fdcId } = req.params;
        if (!/^\d+$/.test(fdcId) || !Number.isSafeInteger(Number(fdcId)) || Number(fdcId) <= 0) {
            return res.status(400).json({ message: "A valid food ID is required" });
        }

        const data = await usdaService.getFoodDetails(fdcId);

        res.json(data);
    } catch (error) {
        console.error("USDA food details error:", error.message);

        res.status(usdaService.getErrorStatus(error)).json({
            message: "Failed to get food details",
            error: error.message
        });
    }
};

const saveFood = async (req, res) => {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const foodData = Array.isArray(body.foodNutrients)
        ? usdaService.mapFoodDetails(body)
        : body;
    const { fdcId, name, brand, servingSize, servingUnit } = foodData;
    const id = typeof fdcId === "number" || typeof fdcId === "string"
        ? Number(fdcId)
        : NaN;

    if (!Number.isSafeInteger(id) || id <= 0) {
        return res.status(400).json({ message: "A valid fdcId is required" });
    }

    if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({ message: "A food name is required" });
    }

    if (brand !== undefined && brand !== null && typeof brand !== "string") {
        return res.status(400).json({ message: "Brand must be a string" });
    }

    if (servingUnit !== undefined && servingUnit !== null && typeof servingUnit !== "string") {
        return res.status(400).json({ message: "Serving unit must be a string" });
    }

    const numericFields = {
        servingSize,
        calories: foodData.calories,
        protein: foodData.protein,
        carbohydrates: foodData.carbohydrates,
        fat: foodData.fat,
        fiber: foodData.fiber,
        sugar: foodData.sugar,
        sodium: foodData.sodium
    };
    const normalizedFields = {};

    for (const [fieldName, value] of Object.entries(numericFields)) {
        const result = optionalNonNegativeNumber(value, fieldName);
        if (!result.valid) {
            return res.status(400).json({
                message: `${result.fieldName} must be a non-negative number`
            });
        }
        normalizedFields[fieldName] = result.value;
    }

    try {
        const food = await foodQueries.saveFood({
            fdcId: id,
            name: name.trim(),
            brand: brand?.trim() || null,
            servingSize: normalizedFields.servingSize,
            servingUnit: servingUnit?.trim() || null,
            calories: normalizedFields.calories,
            protein: normalizedFields.protein,
            carbohydrates: normalizedFields.carbohydrates,
            fat: normalizedFields.fat,
            fiber: normalizedFields.fiber,
            sugar: normalizedFields.sugar,
            sodium: normalizedFields.sodium
        });

        res.status(201).json({
            message: "Food saved successfully",
            food
        });
    } catch (error) {
        console.error("Failed to save food:", error);
        res.status(500).json({ message: "Unable to save food" });
    }
};

module.exports = {
    searchFood,
    getFood,
    saveFood
};