export async function getApplications() {
  const response = await fetch("/api/applications");
  if (!response.ok) return [];
  return response.json();
}
