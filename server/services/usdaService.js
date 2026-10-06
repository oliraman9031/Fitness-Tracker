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
            }
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
            }
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
    getErrorStatus
};