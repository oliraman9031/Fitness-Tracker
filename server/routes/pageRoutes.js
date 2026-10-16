const express = require("express");
const pageController = require("../controllers/pageController");
const pool = require("../database");
const { requireAuth } = require("../middleware/authenticate");

const router = express.Router();
const pageAuth = requireAuth(pool, (req, res) => res.redirect("/login"));

router.get("/", (req, res) => res.redirect("/dashboard"));
router.get("/login", pageController.renderLogin);
router.post("/login", pageController.submitLogin);
router.get("/register", pageController.renderRegister);
router.post("/register", pageController.submitRegister);
router.get("/dashboard", pageAuth, pageController.renderDashboard);
router.get("/workout", pageAuth, pageController.renderWorkout);
router.get("/diet", pageAuth, pageController.renderDiet);
router.get("/activity", pageAuth, pageController.renderActivity);
router.get("/progress", pageAuth, pageController.renderProgress);

module.exports = router;
