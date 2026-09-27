const RAW_BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL)
  ? import.meta.env.VITE_API_BASE_URL
  : 'http://localhost:5000';

const API_BASE_URL = RAW_BASE_URL.replace(/\/+$/, '').endsWith('/api')
  ? RAW_BASE_URL.replace(/\/+$/, '')
  : `${RAW_BASE_URL.replace(/\/+$/, '')}/api`;


/**
 * Generic fetch wrapper with error handling
 */
async function fetchAPI(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = localStorage.getItem('ckd_token');
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();
    return {
      ok: response.ok,
      status: response.status,
      data: data,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      data: {
        success: false,
        error: 'Backend API server unreachable (http://localhost:5000). Please check backend server status.',
      },
      message: error.message,
    };
  }
}

export const apiService = {
  // 1. Health Check
  async checkHealth() {
    return await fetchAPI('/health', { method: 'GET' });
  },

  // 2. Authentication
  async register(userData) {
    return await fetchAPI('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  async login(credentials) {
    return await fetchAPI('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },

  async changePassword(newPassword) {
    return await fetchAPI('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ new_password: newPassword }),
    });
  },

  // 2b. Admin User Management
  async getUsers(params = {}) {
    const query = new URLSearchParams(params).toString();
    const endpoint = query ? `/admin/users?${query}` : '/admin/users';
    return await fetchAPI(endpoint, { method: 'GET' });
  },

  async createUser(userData) {
    return await fetchAPI('/admin/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  async updateUser(userId, userData) {
    return await fetchAPI(`/admin/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  },

  async resetUserPassword(userId, newPassword) {
    return await fetchAPI(`/admin/users/${userId}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ new_password: newPassword }),
    });
  },

  async toggleUserStatus(userId) {
    return await fetchAPI(`/admin/users/${userId}/toggle-status`, {
      method: 'POST',
    });
  },

  async deleteUser(userId) {
    return await fetchAPI(`/admin/users/${userId}`, {
      method: 'DELETE',
    });
  },

  // 3. Patients
  async getPatients() {
    return await fetchAPI('/patients', { method: 'GET' });
  },

  async getPatientById(patientId) {
    return await fetchAPI(`/patients/${patientId}`, { method: 'GET' });
  },

  async getPatientPredictions(patientId) {
    return await fetchAPI(`/patients/${patientId}/predictions`, { method: 'GET' });
  },

  // 4. Predictions ML API
  async getPredictions() {
    return await fetchAPI('/predictions', { method: 'GET' });
  },

  async createPrediction(predictionData) {
    return await fetchAPI('/predictions', {
      method: 'POST',
      body: JSON.stringify(predictionData),
    });
  },

  // Alias for backward compatibility
  async createPredictionFoundation(predictionData) {
    return await this.createPrediction(predictionData);
  },

  // 5. SHAP Explanation API
  async getPredictionExplanation(predictionId, inputFeatures = null) {
    return await fetchAPI(`/predictions/${predictionId}/explanation`, {
      method: 'POST',
      body: JSON.stringify(inputFeatures ? { input_features: inputFeatures } : {}),
    });
  },

  // 6. Analytics & Model Comparison
  async getAnalytics() {
    return await fetchAPI('/analytics', { method: 'GET' });
  },

  async getModelComparison() {
    return await fetchAPI('/analytics/model-comparison', { method: 'GET' });
  },

  // 7. Medical PDF Reports API
  async generateMedicalReport(predictionId) {
    return await fetchAPI(`/reports/${predictionId}`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },

  async getReports() {
    return await fetchAPI('/reports', { method: 'GET' });
  },

  async getReport(reportId) {
    return await fetchAPI(`/reports/${reportId}`, { method: 'GET' });
  },

  async downloadReport(reportId) {
    const downloadUrl = `${API_BASE_URL}/reports/${reportId}/download`;
    try {
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error(`Download failed with status ${response.status}`);
      }
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${reportId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);
      return { ok: true, message: 'PDF report download started' };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },
};

export default apiService;
