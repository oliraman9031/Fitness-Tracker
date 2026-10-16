const usdaService = require("../services/usdaService");
const aiFoodSnapService = require("../services/aiFoodSnapService");
const foodQueries = require("../db/foodQueries");
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

const uploadImage = require("multer")({
    storage: require("multer").memoryStorage(),
    limits: { fileSize: MAX_IMAGE_BYTES, files: 1, fields: 0 },
    fileFilter(req, file, callback) {
        const supported = ["image/jpeg", "image/png", "image/webp"];
        if (!supported.includes(file.mimetype)) {
            return callback(new Error("Upload a JPEG, PNG, or WebP image."));
        }
        return callback(null, true);
    }
}).single("image");

const hasValidImageSignature = (buffer, mimeType) => {
    if (mimeType === "image/jpeg") {
        return buffer.length >= 3 &&
            buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    }
    if (mimeType === "image/png") {
        return buffer.subarray(0, 8).equals(
            Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
        );
    }
    if (mimeType === "image/webp") {
        return buffer.length >= 12 &&
            buffer.toString("ascii", 0, 4) === "RIFF" &&
            buffer.toString("ascii", 8, 12) === "WEBP";
    }
    return false;
};

const analyzeFoodSnap = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: "Choose a food image to scan." });
    }

    if (!hasValidImageSignature(req.file.buffer, req.file.mimetype)) {
        return res.status(400).json({
            message: "The file contents do not match a supported image type."
        });
    }

    try {
        const items = await aiFoodSnapService.analyzeFoodImage(
            req.file.buffer,
            req.file.mimetype
        );
        return res.json({
            items,
            note: "Food and portion estimates are visual approximations. Review and edit before logging."
        });
    } catch (error) {
        if (error.name === "TimeoutError" || error.name === "AbortError") {
            return res.status(504).json({
                message: "Food image analysis timed out. Please try again."
            });
        }
        if (error.statusCode) {
            return res.status(error.statusCode).json({ message: error.message });
        }
        console.error("Food image analysis failed:", error.name || "Error");
        return res.status(502).json({
            message: "Unable to analyze this image right now. Please try again."
        });
    }
};

const matchUSDAFood = async (req, res) => {
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    if (!name || name.length > 120) {
        return res.status(400).json({
            message: "Enter a food name of at most 120 characters."
        });
    }

    try {
        const match = await usdaService.matchFoodNutrition(name);
        return res.json({ match });
    } catch (error) {
        console.error("USDA nutrition match failed:", error.message);
        return res.status(usdaService.getErrorStatus(error)).json({
            message: "USDA food matching is temporarily unavailable."
        });
    }
};

const handleImageUpload = (req, res, next) => {
    uploadImage(req, res, (error) => {
        if (!error) return next();
        if (error.code === "LIMIT_FILE_SIZE") {
            return res.status(413).json({ message: "Image must be 6 MB or smaller." });
        }
        if (error.code === "LIMIT_FILE_COUNT" || error.code === "LIMIT_UNEXPECTED_FILE") {
            return res.status(400).json({ message: "Upload one image file at a time." });
        }
        return res.status(400).json({
            message: error.message || "Unable to read the uploaded image."
        });
    });
};

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
    handleImageUpload,
    analyzeFoodSnap,
    matchUSDAFood,
    searchFood,
    getFood,
    saveFood
};