const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export async function apiRequest(path, options = {}) {
  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      ...(options.body && !isFormData
        ? { "Content-Type": "application/json" }
        : {}),
      ...options.headers,
    },
  });
  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : null;

  if (!response.ok) {
    if (
      response.status === 401 &&
      path !== "/auth/login" &&
      path !== "/auth/register"
    ) {
      window.dispatchEvent(new Event("sthira:unauthorized"));
    }
    const error = new Error(
      data?.message || `Request failed (${response.status}).`
    );
    error.status = response.status;
    throw error;
  }

  return data;
}

export function getCurrentUser() {
  return apiRequest("/auth/me");
}

export function login(email, password) {
  return apiRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function register(name, email, password) {
  return apiRequest("/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
}

export function logout() {
  return apiRequest("/auth/logout", { method: "POST" });
}

export async function getActivities() {
  return apiRequest("/activities");
}