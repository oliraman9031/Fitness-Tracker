const renderLogin = (req, res) => {
    res.render("login", { title: "Login" });
};

const renderRegister = (req, res) => {
    res.render("register", { title: "Create account" });
};

const renderActivity = (req, res) => {
    res.render("activity", { title: "Activity" });
};

const renderDashboard = (req, res) => {
    res.render("dashboard", {
        title: "Dashboard",
        stats: [
            { title: "Steps", value: "7,500", unit: "steps" },
            { title: "Workout", value: "45", unit: "min" },
            { title: "Water", value: "2.2", unit: "L" },
            { title: "Sleep", value: "7.5", unit: "hrs" }
        ]
    });
};

const renderWorkout = (req, res) => {
    res.render("workout", {
        title: "Workout",
        workouts: [
            { name: "Upper Body Push", time: "40 min", focus: "Chest + shoulders" },
            { name: "Lower Body Strength", time: "50 min", focus: "Legs + core" },
            { name: "HIIT Circuit", time: "25 min", focus: "Cardio + burn" }
        ]
    });
};

const renderDiet = (req, res) => {
    res.render("diet", { title: "Diet" });
};

const renderProgress = (req, res) => {
    res.render("progress", { title: "Progress" });
};

const submitLogin = (req, res) => {
    res.status(501).render("login", {
        title: "Login",
        error: "Login authentication is not configured yet."
    });
};

const submitRegister = (req, res) => {
    res.status(501).render("register", {
        title: "Create account",
        message: "Registration is not configured yet."
    });
};

module.exports = {
    renderLogin,
    renderRegister,
    renderDashboard,
    renderWorkout,
    renderDiet,
    renderActivity,
    renderProgress,
    submitLogin,
    submitRegister
};
