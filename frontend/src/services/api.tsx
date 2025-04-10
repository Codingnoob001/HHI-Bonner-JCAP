// API base URL configuration
const API_BASE_URL = "http://127.0.0.1:5000";

// Reusable fetch function with error handling
export const fetchApi = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
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
  // Add to patientApi in api.tsx
  getPatientGoalsHistory: (clientId: string) => {
    return fetchApi(`/patients/${clientId}/goals-history`);
  },
  // In api.tsx, add this to the patientApi object if it doesn't exist already:
  getPatientGoals: (clientId: string) => {
    return fetchApi(`/patients/${clientId}/goals`);
  },

  // Get single patient by client_id
  getPatientById: (clientId: string) => {
    return fetchApi(`/patients/${clientId}`);
  },

  // Create new patient
  createPatient: (patientData: any) => {
    return fetchApi("/patients", {
      method: "POST",
      body: JSON.stringify(patientData),
    });
  },

  // Update patient
  updatePatient: (clientId: string, patientData: any) => {
    console.log("API updatePatient called with data:", patientData);

    // Create a copy of the data to avoid modifying the original
    const data = { ...patientData };

    // Check if goals data exists and process it if needed
    if (data.goals) {
      // If goals are in an object format, keep it as is - the backend expects this format
      console.log("Goals data included in update request:", data.goals);
    }

    return fetchApi(`/patients/${clientId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    })
      .then((response) => {
        console.log("Update patient response:", response);
        return response;
      })
      .catch((error) => {
        console.error("Error in updatePatient API call:", error);
        throw error;
      });
  },

  // Delete patient
  deletePatient: (clientId: string) => {
    return fetchApi(`/patients/${clientId}`, {
      method: "DELETE",
    });
  },

  // Add patient visit
  addPatientVisit: (clientId: string, visitData: any) => {
    return fetchApi(`/patients/${clientId}/visits`, {
      method: "POST",
      body: JSON.stringify(visitData),
    });
  },

  searchPatients: (query: string) => {
    return fetchApi(`/patients/search?query=${encodeURIComponent(query)}`);
  },

  // Get patient visits
  getPatientVisits: (clientId: string) => {
    return fetchApi(`/patients/${clientId}/visits`);
  },
};

// Dashboard-specific API endpoints
export const dashboardApi = {
  // Get dashboard metrics (stats cards)
  getMetrics: (startDate?: string, endDate?: string) => {
    let url = "/dashboard/metrics";

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
    return fetchApi("/dashboard/clear-activities", {
      method: "POST",
    });
  },

  getHistoricalTrends: (points = 7, endDate?: string) => {
    let url = `/dashboard/historical-trends?points=${points}`;

    // Add end date if provided
    if (endDate) {
      url += `&end_date=${endDate}`;
    }

    return fetchApi(url);
  },
};


// Reports API endpoints
export const reportsApi = {
  // Get comprehensive summary for a date range
  getComprehensiveSummary: (startDate: string, endDate: string) => {
    return fetchApi(`/reports/comprehensive-summary?start_date=${startDate}&end_date=${endDate}`);
  },
  
  // Get gender distribution for a date range
  getGenderDistribution: (startDate: string, endDate: string) => {
    return fetchApi(`/reports/gender?start_date=${startDate}&end_date=${endDate}`);
  },
  
  // Get age distribution for a date range
  getAgeDistribution: (startDate: string, endDate: string) => {
    return fetchApi(`/reports/age-distribution?start_date=${startDate}&end_date=${endDate}`);
  },
  
  // Get race/ethnicity distribution for a date range
  getRaceDistribution: (startDate: string, endDate: string) => {
    return fetchApi(`/reports/race-distribution?start_date=${startDate}&end_date=${endDate}`);
  },
  
  // Get language distribution for a date range
  getLanguageDistribution: (startDate: string, endDate: string) => {
    return fetchApi(`/reports/language-distribution?start_date=${startDate}&end_date=${endDate}`);
  },
  
  // Get event attendance for a date range
  getEventAttendance: (startDate: string, endDate: string) => {
    return fetchApi(`/reports/event-attendance?start_date=${startDate}&end_date=${endDate}`);
  },
  
  // Get health metrics for a date range
  getHealthImprovements: (startDate: string, endDate: string) => {
    return fetchApi(`/reports/health-improvements?start_date=${startDate}&end_date=${endDate}`);
  },
  
  // Get weight changes for a date range
  getWeightChanges: (startDate: string, endDate: string) => {
    return fetchApi(`/reports/weight-changes?start_date=${startDate}&end_date=${endDate}`);
  },
  
  // Get BMI changes for a date range
  getBMIChanges: (startDate: string, endDate: string) => {
    return fetchApi(`/reports/bmi-changes?start_date=${startDate}&end_date=${endDate}`);
  },
  
  // Export report data as a downloadable file (PDF, Excel, etc.)
  exportReport: async (startDate: string, endDate: string, format: 'pdf' | 'excel' = 'pdf') => {
    const url = `${API_BASE_URL}/reports/export?start_date=${startDate}&end_date=${endDate}&format=${format}`;
    
    // For file downloads, we need to handle the response differently
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }
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
    
    // Return the raw response for handling the download
    return response;
  }
};