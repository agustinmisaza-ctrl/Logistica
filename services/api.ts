import { InventoryRecord, MovementRequest, ProjectProgress, Site, Tool, Transaction, User } from "../types";

// URL ajustada al default de uvicorn (127.0.0.1 en vez de localhost para evitar problemas de resolución)
const API_URL = "http://127.0.0.1:8000"; 

// Headers estándar para comunicar con FastAPI
const HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json'
};

// Helper para manejar respuestas
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || `Error ${response.status}: ${response.statusText}`);
  }
  return response.json();
}

// Wrapper to handle network errors gracefully (catches 'Failed to fetch')
async function safeFetch<T>(url: string, options?: RequestInit): Promise<T> {
    try {
        const response = await fetch(url, options);
        return await handleResponse<T>(response);
    } catch (error: any) {
        // TypeError: Failed to fetch usually happens on network failure (DNS, connection refused, CORS)
        if (error instanceof TypeError && error.message === 'Failed to fetch') {
             console.error(`Network Error: Could not connect to ${url}`);
             // We include 'Failed to fetch' in the message so App.tsx can still detect it if needed
             throw new Error(`No se pudo conectar con el servidor (Failed to fetch). Verifique que el backend esté ejecutándose en ${API_URL}`);
        }
        throw error;
    }
}

export const apiService = {
  // Autenticación
  login: async (username: string, password: string): Promise<User> => {
    return safeFetch<User>(`${API_URL}/login`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ username, password })
    });
  },

  getSites: async (): Promise<Site[]> => {
    return safeFetch<Site[]>(`${API_URL}/sites`, { headers: HEADERS });
  },

  getInventory: async (): Promise<InventoryRecord[]> => {
    return safeFetch<InventoryRecord[]>(`${API_URL}/inventory`, { headers: HEADERS });
  },

  getTools: async (): Promise<Tool[]> => {
    return safeFetch<Tool[]>(`${API_URL}/tools`, { headers: HEADERS });
  },

  getMovements: async (): Promise<MovementRequest[]> => {
    return safeFetch<MovementRequest[]>(`${API_URL}/movements`, { headers: HEADERS });
  },

  getTransactions: async (): Promise<Transaction[]> => {
    return safeFetch<Transaction[]>(`${API_URL}/transactions`, { headers: HEADERS });
  },

  getProgress: async (): Promise<ProjectProgress[]> => {
    return safeFetch<ProjectProgress[]>(`${API_URL}/project-progress`, { headers: HEADERS });
  },

  // User Management Endpoints
  getUsers: async (): Promise<User[]> => {
    return safeFetch<User[]>(`${API_URL}/users`, { headers: HEADERS });
  },

  createUser: async (userData: any): Promise<User> => {
    return safeFetch<User>(`${API_URL}/users`, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify(userData)
    });
  }
};
