/**
 * 704 API Client Utility
 * Unified fetcher for tactical modules
 */

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  try {
    const response = await fetch(`/api/${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    let data;
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      // Si no es JSON, capturamos el texto para depuración
      const text = await response.text();
      throw new Error(`SERVER_ERROR: Status ${response.status}. ${text.slice(0, 100)}`);
    }

    if (!response.ok) {
      throw new Error(data.error || `API_ERROR: ${response.status}`);
    }

    return data;
  } catch (error: any) {
    console.error(`Fetch failure on ${endpoint}:`, error);
    // Propagamos un error más útil que "fetch failed"
    if (error.name === 'TypeError' && error.message === 'fetch failed') {
      throw new Error('NETWORK_ERROR: No se pudo conectar con el servidor. Verifica las variables de entorno en Vercel.');
    }
    throw error;
  }
}

export const api = {
  auth: {
    login: (credentials: any) => apiFetch('auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  },
  dashboard: {
    getMapData: () => apiFetch('dashboard/map'),
  },
  staff: {
    create: (data: any) => apiFetch('employees', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => apiFetch(`employees/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    list: () => apiFetch('employees'),
  },
  objectives: {
    create: (data: any) => apiFetch('objectives', { method: 'POST', body: JSON.stringify(data) }),
    list: () => apiFetch('objectives'),
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
