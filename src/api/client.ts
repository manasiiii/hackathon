import * as Types from "./types";
import { API_URL } from "./config";

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw new ApiError(response.status, error.detail || "Request failed");
  }

  return response.json();
}

// ============ User API ============

export const users = {
  get: (userId: number) => request<Types.User>(`/api/users/${userId}`),
};

// ============ Journal API ============

export const journals = {
  list: (userId: number, limit = 50) =>
    request<Types.Journal[]>(`/api/journals?user_id=${userId}&limit=${limit}`),

  get: (journalId: number) => request<Types.Journal>(`/api/journals/${journalId}`),

  create: (data: Types.JournalCreate) =>
    request<Types.Journal>("/api/journals", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getAnalytics: (userId: number, days = 30) =>
    request<Types.JournalAnalytics>(`/api/journals/analytics?user_id=${userId}&days=${days}`),

  getQuestion: (userId: number, days = 3) =>
    request<{ question: string; context_used: string[] }>(
      `/api/journals/question?user_id=${userId}&days=${days}`
    ),

};

// ============ Insight API ============

export const insights = {
  getWeekly: (userId: number) =>
    request<Types.Insight | null>(`/api/insights/weekly?user_id=${userId}`),

  getSleepVsEmotions: (userId: number) =>
    request<Types.SleepVsEmotionsResponse>(
      `/api/insights/sleep-vs-emotions?user_id=${userId}`
    ),

  generateWeekly: (userId: number) =>
    request<{ id: number; primary_pattern: string; start_date?: string; end_date?: string; emotion_breakdown: Record<string, number>; top_themes: string[]; insights: string[] }>(
      `/api/insights/weekly/generate?user_id=${userId}`,
      { method: "POST" }
    ),
};

// ============ Health API ============

export const health = {
  getCorrelations: (userId: number, days = 30) =>
    request<Types.HealthMoodCorrelations>(
      `/api/health/correlations?user_id=${userId}&days=${days}`
    ),
};

// ============ Voice API ============

export const voice = {
  getReflection: (content: string) =>
    request<{ response: string }>("/api/voice/reflection", {
      method: "POST",
      body: JSON.stringify({ content }),
    }),
};

// ============ Health Check ============

export const healthCheck = () => request<{ status: string }>("/api/health-check");

// ============ Seed (Dev/Demo) ============

export const seed = {
  run: () =>
    request<{ status: string; message: string }>("/api/seed", {
      method: "POST",
    }),
};

// Export all APIs
export const api = {
  users,
  journals,
  insights,
  health,
  voice,
  healthCheck,
  seed,
};

export default api;
