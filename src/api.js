const API = import.meta.env.VITE_API_URL;

export async function api(path, options = {}) {
  const token = sessionStorage.getItem("adminToken");
  const res = await fetch(API + path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const data = await res.json().catch(() => null);

  // expired or invalid session: go back to the login page
  if (res.status === 401 && token) {
    sessionStorage.removeItem("adminToken");
    window.location.reload();
  }
  if (!res.ok) throw new Error(data?.message || "Something went wrong");
  return data;
}
