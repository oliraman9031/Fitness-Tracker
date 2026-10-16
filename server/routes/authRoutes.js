const crypto = require("crypto");
const express = require("express");
const bcrypt = require("bcrypt");
const pool = require("../database");
const {
  clearSessionCookie,
  hashSessionToken,
  readSessionCookie,
  requireAuth,
  setSessionCookie,
} = require("../middleware/authenticate");

const router = express.Router();
const BCRYPT_ROUNDS = 12;

function publicUser(user) {
  return {
    id: user.user_id,
    name: user.name,
    email: user.email,
  };
}

async function createSession(userId, res) {
  const token = crypto.randomBytes(32).toString("hex");
  await pool.query("DELETE FROM auth_sessions WHERE expires_at <= NOW()");
  await pool.query(
    `INSERT INTO auth_sessions (token_hash, user_id, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
    [hashSessionToken(token), userId]
  );
  setSessionCookie(res, token);
}

router.post("/register", async (req, res) => {
  const { name, email, password } = req.body || {};

  if (
    typeof name !== "string" ||
    name.trim().length < 1 ||
    name.trim().length > 100 ||
    typeof email !== "string" ||
    email.trim().length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
    typeof password !== "string" ||
    [...password].length < 12 ||
    Buffer.byteLength(password, "utf8") > 72
  ) {
    return res.status(400).json({
      message:
        "Enter a valid name and email, and a password of at least 12 characters and at most 72 UTF-8 bytes.",
    });
  }

  try {
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING user_id, name, email`,
      [name.trim(), email.trim().toLowerCase(), passwordHash]
    );

    await createSession(result.rows[0].user_id, res);
    return res.status(201).json({ user: publicUser(result.rows[0]) });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ message: "An account with this email already exists." });
    }
    console.error("Account registration failed:", error.code || error.name);
    return res.status(500).json({ message: "Unable to create account." });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (
    typeof email !== "string" ||
    email.trim().length > 254 ||
    typeof password !== "string" ||
    Buffer.byteLength(password, "utf8") > 72
  ) {
    return res.status(400).json({ message: "Enter a valid email and password." });
  }

  try {
    const result = await pool.query(
      `SELECT user_id, name, email, password_hash
       FROM users
       WHERE LOWER(email) = $1`,
      [email.trim().toLowerCase()]
    );
    const user = result.rows[0];

    if (
      !user ||
      typeof user.password_hash !== "string" ||
      !user.password_hash.startsWith("$2") ||
      !(await bcrypt.compare(password, user.password_hash))
    ) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    await createSession(user.user_id, res);
    return res.json({ user: publicUser(user) });
  } catch (error) {
    console.error("Account login failed:", error.code || error.name);
    return res.status(500).json({ message: "Unable to log in." });
  }
});

router.get("/me", requireAuth(pool), (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
    },
  });
});

router.post("/logout", requireAuth(pool), async (req, res, next) => {
  const token = readSessionCookie(req);

  try {
    await pool.query("DELETE FROM auth_sessions WHERE token_hash = $1", [
      hashSessionToken(token),
    ]);
    clearSessionCookie(res);
    return res.json({ message: "Logged out successfully." });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
