const express = require("express");
const router = express.Router();

const {
    searchFood,
    getFood,
    saveFood
} = require("../controllers/foodController");

router.post("/save", saveFood);
router.get("/search", searchFood);
router.get("/:fdcId", getFood);

module.exports = router;