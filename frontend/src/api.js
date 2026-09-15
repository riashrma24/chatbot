export const API_BASE = "http://127.0.0.1:8000";

export function getPageContent(slug) {
  return fetch(`${API_BASE}/content/${slug}`).then((res) => res.json());
}
