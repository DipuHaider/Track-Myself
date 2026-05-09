export async function getAnalyticsSummary() {
  const response = await fetch("/api/analytics");
  if (!response.ok) return null;
  return response.json();
}
