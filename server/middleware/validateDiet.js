const { isISODate } = require("../utils/dateValidation");

const validateDiet = (req, res, next) => {
    const { user_id, food_name, calories, protein, carbs, fat } = req.body;

    if (req.body.food_id !== undefined) {
        const userId = Number(user_id);
        const foodId = Number(req.body.food_id);
        const quantity = Number(req.body.quantity);
        const mealTypes = ["Breakfast", "Lunch", "Dinner", "Snack"];

        if (!Number.isSafeInteger(userId) || userId <= 0 ||
            !Number.isSafeInteger(foodId) || foodId <= 0) {
            return res.status(400).json({ message: "Valid user and food IDs are required" });
        }

        if (!Number.isFinite(quantity) || quantity <= 0) {
            return res.status(400).json({ message: "Quantity must be greater than zero" });
        }

        if (!mealTypes.includes(req.body.meal_type)) {
            return res.status(400).json({ message: "Choose a valid meal type" });
        }

        if (typeof req.body.quantity_unit !== "string" || !req.body.quantity_unit.trim()) {
            return res.status(400).json({ message: "A quantity unit is required" });
        }

        if (req.body.logged_date !== undefined && !isISODate(req.body.logged_date)) {
            return res.status(400).json({ message: "A valid log date is required" });
        }

        return next();
    }

    if (!user_id || !food_name || calories === undefined || calories === "") {
        return res.status(400).json({
            message: "User ID, food name, and calories are required"
        });
    }

    const values = [calories, protein, carbs, fat]
        .filter((value) => value !== undefined && value !== "")
        .map(Number);

    if (values.some((value) => !Number.isFinite(value))) {
        return res.status(400).json({ message: "Nutrition values must be numbers" });
    }

    next();
};

module.exports = { validateDiet };
