const express = require("express");
const progressController = require("../controllers/progresscontroller");
const { validateProgress } = require("../middleware/validateProgress");

const router = express.Router();

router.get("/analysis", progressController.getAnalysis);
router.post("/", validateProgress, progressController.addProgress);
router.get("/", progressController.getProgress);

module.exports = router;