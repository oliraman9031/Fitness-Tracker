const axios = require("axios");
const pool = require("../database");

const USDA_API_URL = process.env.USDA_API_URL;
const USDA_API_KEY = process.env.USDA_API_KEY;

const searchFoods = async (query) => {
    const normalizedQuery = query.trim().toLowerCase();
    const cached = await pool.query(
        `SELECT response
         FROM food_search_cache
         WHERE search_query = $1 AND expires_at > NOW()`,
        [normalizedQuery]
    );

    if (cached.rowCount > 0) {
        return cached.rows[0].response;
    }

    if (!USDA_API_KEY) {
        const error = new Error("USDA API key is not configured");
        error.statusCode = 503;
        throw error;
    }

    const response = await axios.get(
        `${USDA_API_URL}/foods/search`,
        {
            params: {
                api_key: USDA_API_KEY,
                query: normalizedQuery,
                pageSize: 10
            },
            timeout: 15000
        }
    );

    await pool.query(
        `INSERT INTO food_search_cache (search_query, response, expires_at)
         VALUES ($1, $2::jsonb, NOW() + INTERVAL '24 hours')
         ON CONFLICT (search_query) DO UPDATE SET
            response = EXCLUDED.response,
            expires_at = EXCLUDED.expires_at`,
        [normalizedQuery, JSON.stringify(response.data)]
    );

    return response.data;
};

const getFoodDetails = async (fdcId) => {
    if (!USDA_API_KEY) {
        const error = new Error("USDA API key is not configured");
        error.statusCode = 503;
        throw error;
    }

    const response = await axios.get(
        `${USDA_API_URL}/food/${fdcId}`,
        {
            params: {
                api_key: USDA_API_KEY
            },
            timeout: 15000
        }
    );

    return response.data;
};

const mapFoodDetails = (food) => {
    const nutrientsById = new Map(
        (Array.isArray(food.foodNutrients) ? food.foodNutrients : [])
            .filter((item) => item?.nutrient?.id !== undefined)
            .map((item) => [Number(item.nutrient.id), item.amount])
    );
    const getNutrientAmount = (nutrientId) => {
        const amount = nutrientsById.get(nutrientId);
        if (amount === undefined || amount === null || amount === "") {
            return null;
        }

        const number = Number(amount);
        return Number.isFinite(number) ? number : null;
    };

    return {
        fdcId: food.fdcId,
        name: food.description,
        brand: food.brandName || food.brandOwner || null,
        servingSize: food.servingSize ?? null,
        servingUnit: food.servingSizeUnit ?? null,
        calories: getNutrientAmount(1008),
        protein: getNutrientAmount(1003),
        carbohydrates: getNutrientAmount(1005),
        fat: getNutrientAmount(1004),
        fiber: getNutrientAmount(1079),
        sugar: getNutrientAmount(2000),
        sodium: getNutrientAmount(1093)
    };
};

const matchFoodNutrition = async (name) => {
    const normalizedName = name
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    if (!normalizedName) return null;

    const results = await searchFoods(name);
    const foods = Array.isArray(results?.foods) ? results.foods : [];
    const inputWords = new Set(normalizedName.split(" "));
    let bestMatch = null;
    let bestScore = 0;

    for (const food of foods) {
        if (!["Foundation", "SR Legacy"].includes(food.dataType)) continue;
        const description = typeof food.description === "string"
            ? food.description
            : "";
        const normalizedDescription = description
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, " ")
            .replace(/\s+/g, " ")
            .trim();
        const descriptionWords = new Set(normalizedDescription.split(" "));
        const overlap = [...inputWords].filter((word) =>
            descriptionWords.has(word)
        ).length;
        const score =
            (2 * overlap) / (inputWords.size + descriptionWords.size);

        if (score > bestScore) {
            bestScore = score;
            bestMatch = food;
        }
    }

    if (!bestMatch || bestScore < 0.8) return null;

    const nutrients = new Map(
        (Array.isArray(bestMatch.foodNutrients) ? bestMatch.foodNutrients : [])
            .map((item) => [Number(item.nutrientId), Number(item.value)])
    );
    const nutrition = {
        calories: nutrients.get(1008),
        protein: nutrients.get(1003),
        carbs: nutrients.get(1005),
        fat: nutrients.get(1004)
    };

    if (Object.values(nutrition).some((value) => !Number.isFinite(value))) {
        return null;
    }

    return {
        name: bestMatch.description,
        dataType: bestMatch.dataType,
        fdcId: bestMatch.fdcId,
        nutritionPer100g: nutrition
    };
};

const getErrorStatus = (error) => {
    if (Number.isInteger(error.statusCode)) {
        return error.statusCode;
    }

    if (error.response) {
        if (error.response.status === 404) {
            return 404;
        }
        return 502;
    }

    if (error.isAxiosError) {
        return 502;
    }

    if (error.code === "ECONNREFUSED" || error.code === "ETIMEDOUT" ||
        (typeof error.code === "string" && error.code.startsWith("08"))) {
        return 503;
    }

    return 500;
};

module.exports = {
    searchFoods,
    getFoodDetails,
    mapFoodDetails,
    matchFoodNutrition,
    getErrorStatus
};