const validateProgress = (req, res, next) => {
    const { weight } = req.body;

    if (weight === undefined || weight === "") {
        return res.status(400).json({ message: "Weight is required" });
    }

    if (typeof weight !== "number" && typeof weight !== "string") {
        return res.status(400).json({ message: "Weight must be a positive number" });
    }

    const numericWeight = Number(weight);
    if (!Number.isFinite(numericWeight) || numericWeight <= 0 || numericWeight > 9999.99) {
        return res.status(400).json({ message: "Weight must be between 0 and 9999.99" });
    }

    next();
};

module.exports = { validateProgress };
