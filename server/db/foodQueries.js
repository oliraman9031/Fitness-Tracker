const pool = require("../database");

const saveFood = async (food) => {
    const result = await pool.query(
        `INSERT INTO foods
            (fdc_id, name, brand, serving_size, serving_unit, calories, protein,
             carbohydrates, fat, fiber, sugar, sodium)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (fdc_id) DO UPDATE SET
            name = EXCLUDED.name,
            brand = EXCLUDED.brand,
            serving_size = EXCLUDED.serving_size,
            serving_unit = EXCLUDED.serving_unit,
            calories = EXCLUDED.calories,
            protein = EXCLUDED.protein,
            carbohydrates = EXCLUDED.carbohydrates,
            fat = EXCLUDED.fat,
            fiber = EXCLUDED.fiber,
            sugar = EXCLUDED.sugar,
            sodium = EXCLUDED.sodium
         RETURNING *`,
        [
            food.fdcId,
            food.name,
            food.brand,
            food.servingSize,
            food.servingUnit,
            food.calories,
            food.protein,
            food.carbohydrates,
            food.fat,
            food.fiber,
            food.sugar,
            food.sodium
        ]
    );

    return result.rows[0];
};

module.exports = { saveFood };