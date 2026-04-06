/**
 * SPS API Client Utility
 * Unified fetcher for tactical modules
 */

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`/api/${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'API Error');
  }

  return data;
}

export const api = {
  auth: {
    login: (credentials: any) => apiFetch('auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  },
  dashboard: {
    getMapData: () => apiFetch('dashboard/map'),
  },
  judicial: {
    freeze: (params: any) => apiFetch('judicial/freeze', { method: 'POST', body: JSON.stringify(params) }),
  },
  shifts: {
    checkin: (params: any) => apiFetch('shifts/checkin', { method: 'POST', body: JSON.stringify(params) }),
    checkout: (params: any) => apiFetch('shifts/checkout', { method: 'POST', body: JSON.stringify(params) }),
  },
  incidents: {
    report: (params: any) => apiFetch('incidents/report', { method: 'POST', body: JSON.stringify(params) }),
  },
  tickets: {
    create: (params: any) => apiFetch('tickets', { method: 'POST', body: JSON.stringify(params) }),
    list: (clientId?: string) => apiFetch(`tickets${clientId ? `?client_id=${clientId}` : ''}`),
  },
  cameras: {
    list: () => apiFetch('cameras'),
    findEscape: (params: any) => apiFetch('cameras', { method: 'POST', body: JSON.stringify(params) }),
  },
  feedback: {
    submit: (params: any) => apiFetch('feedback', { method: 'POST', body: JSON.stringify(params) }),
  },
  patrols: {
    validateCheckpoint: (params: any) => apiFetch('patrols/checkpoint', { method: 'POST', body: JSON.stringify(params) }),
  }
};
