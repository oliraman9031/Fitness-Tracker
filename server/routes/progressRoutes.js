const express = require("express");
const progressController = require("../controllers/progressController");
const { validateProgress } = require("../middleware/validateProgress");

const router = express.Router();

router.post("/", validateProgress, progressController.addProgress);
router.get("/:userId", progressController.getProgress);

module.exports = router;