import { ENV } from "../config/env";

export async function getRequest(endpoint: string) {
  const response = await fetch(`${ENV.API_BASE_URL}${endpoint}`);
  return response.json();
}

export async function postRequest(endpoint: string, data: any) {
  const response = await fetch(`${ENV.API_BASE_URL}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  return response.json();
}