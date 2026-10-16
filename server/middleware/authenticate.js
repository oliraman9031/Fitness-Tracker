const crypto = require("crypto");

const SESSION_COOKIE = "sthira_session";

function readSessionCookie(req) {
  const cookie = req.headers.cookie
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`));
  return cookie?.slice(SESSION_COOKIE.length + 1);
}

function hashSessionToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function requireAuth(pool, onUnauthorized) {
  const reject = onUnauthorized || ((req, res, message) => {
    res.status(401).json({ message });
  });

  return async (req, res, next) => {
    const token = readSessionCookie(req);

    if (!token || typeof token !== "string") {
      return reject(req, res, "Authentication required.");
    }

    try {
      const result = await pool.query(
        `SELECT u.user_id, u.name, u.email
         FROM auth_sessions s
         JOIN users u ON u.user_id = s.user_id
         WHERE s.token_hash = $1 AND s.expires_at > NOW()`,
        [hashSessionToken(token)]
      );

      if (!result.rowCount) {
        res.clearCookie(SESSION_COOKIE, cookieOptions());
        return reject(req, res, "Session expired. Please log in again.");
      }

      req.user = {
        id: result.rows[0].user_id,
        name: result.rows[0].name,
        email: result.rows[0].email,
      };
      return next();
    } catch (error) {
      return next(error);
    }
  };
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure:
      process.env.SESSION_COOKIE_SECURE === "true" ||
      (process.env.SESSION_COOKIE_SECURE !== "false" &&
        process.env.NODE_ENV === "production"),
    sameSite: "strict",
    path: "/",
  };
}

function setSessionCookie(res, token) {
  res.cookie(SESSION_COOKIE, token, {
    ...cookieOptions(),
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE, cookieOptions());
}

module.exports = {
  SESSION_COOKIE,
  readSessionCookie,
  hashSessionToken,
  requireAuth,
  setSessionCookie,
  clearSessionCookie,
};
