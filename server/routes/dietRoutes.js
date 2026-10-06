const express = require("express");
const dietController = require("../controllers/dietController");
const { validateDiet } = require("../middleware/validateDiet");

const router = express.Router();

router.post("/", validateDiet, dietController.createFoodLog);
router.get("/:userId", dietController.getFoodLogs);

module.exports = router;
