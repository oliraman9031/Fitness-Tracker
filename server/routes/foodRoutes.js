const express = require("express");
const router = express.Router();

const {
    handleImageUpload,
    analyzeFoodSnap,
    matchUSDAFood,
    searchFood,
    getFood,
    saveFood
} = require("../controllers/foodController");

router.post("/ai-snap", handleImageUpload, analyzeFoodSnap);
router.post("/ai-snap/usda-match", matchUSDAFood);
router.post("/save", saveFood);
router.get("/search", searchFood);
router.get("/:fdcId", getFood);

module.exports = router;