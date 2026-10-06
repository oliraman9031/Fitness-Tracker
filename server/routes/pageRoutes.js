const express = require("express");
const pageController = require("../controllers/pageController");

const router = express.Router();

router.get("/", (req, res) => res.redirect("/dashboard"));
router.get("/dashboard", pageController.renderDashboard);
router.get("/workout", pageController.renderWorkout);
router.get("/diet", pageController.renderDiet);
router.get("/login", pageController.renderLogin);
router.post("/login", pageController.submitLogin);
router.get("/register", pageController.renderRegister);
router.post("/register", pageController.submitRegister);
router.get("/activity", pageController.renderActivity);
router.get("/progress", pageController.renderProgress);

module.exports = router;
