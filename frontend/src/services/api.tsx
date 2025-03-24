// API base URL configuration
const API_BASE_URL = 'http://127.0.0.1:5000';

// Reusable fetch function with error handling
export const fetchApi = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    // Try to get error message from response
    try {
      const errorData = await response.json();
      throw new Error(errorData.error || `API error: ${response.status}`);
    } catch (e) {
      // If we can't parse the error as JSON, throw a generic error
      throw new Error(`API error: ${response.status}`);
    }
  }

  return response.json();
};

// Patient API endpoints
export const patientApi = {
  // Get all patients with pagination
  getPatients: (page = 1, limit = 100) => {
    return fetchApi(`/patients?page=${page}&limit=${limit}`);
  },
  
  // Get single patient by client_id
  getPatientById: (clientId: string) => {
    return fetchApi(`/patients/${clientId}`);
  },
  
  // Create new patient
  createPatient: (patientData: any) => {
    return fetchApi('/patients', {
      method: 'POST',
      body: JSON.stringify(patientData)
    });
  },
  
  // Update patient
  updatePatient: (clientId: string, patientData: any) => {
    return fetchApi(`/patients/${clientId}`, {
      method: 'PATCH',
      body: JSON.stringify(patientData)
    });
  },
  
  // Delete patient
  deletePatient: (clientId: string) => {
    return fetchApi(`/patients/${clientId}`, {
      method: 'DELETE'
    });
  },
  
  // Add patient visit
  addPatientVisit: (clientId: string, visitData: any) => {
    return fetchApi(`/patients/${clientId}/visits`, {
      method: 'POST',
      body: JSON.stringify(visitData)
    });
  },

searchPatients: (query: string) => {
  return fetchApi(`/patients/search?query=${encodeURIComponent(query)}`);
},
  
  // Get patient visits
  getPatientVisits: (clientId: string) => {
    return fetchApi(`/patients/${clientId}/visits`);
  }
};

// Dashboard-specific API endpoints
export const dashboardApi = {
  // Get dashboard metrics (stats cards)
  getMetrics: (startDate?: string, endDate?: string) => {
    let url = '/dashboard/metrics';
    
    // Add date parameters if provided
    if (startDate && endDate) {
      url += `?start_date=${startDate}&end_date=${endDate}`;
    }
    
    return fetchApi(url);
  },
  
  getRecentActivity: (limit = 5) => {
    // Add cache-busting parameter to prevent caching
    const timestamp = new Date().getTime();
    return fetchApi(`/dashboard/recent-activity?limit=${limit}&_=${timestamp}`);
  },
  
  clearRecentActivity: () => {
    return fetchApi('/dashboard/clear-activities', {
      method: 'POST'
    });
  },

  getHistoricalTrends: (points = 7, endDate?: string) => {
    let url = `/dashboard/historical-trends?points=${points}`;
    
    // Add end date if provided
    if (endDate) {
      url += `&end_date=${endDate}`;
    }
    
    return fetchApi(url);
  }
};

