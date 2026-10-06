const validateProgress = (req, res, next) => {
    const { user_id, weight } = req.body;

    if (!user_id || weight === undefined || weight === "") {
        return res.status(400).json({ message: "User ID and weight are required" });
    }

    const numericWeight = Number(weight);
    if (!Number.isFinite(numericWeight) || numericWeight <= 0) {
        return res.status(400).json({ message: "Weight must be a positive number" });
    }

    next();
};

module.exports = { validateProgress };
