const RAW_BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL)
  ? import.meta.env.VITE_API_BASE_URL
  : 'http://localhost:5000';

export const API_BASE_URL = RAW_BASE_URL.replace(/\/+$/, '').endsWith('/api')
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

  let response;
  try {
    response = await fetch(url, config);
  } catch (error) {
    return {
      ok: false,
      status: 0,
      data: {
        success: false,
        error: `Backend API server unreachable (${API_BASE_URL}). Please check backend server status.`,
      },
      message: error.message,
    };
  }

  let data;
  try {
    data = await response.json();
  } catch {
    data = {
      success: false,
      error: `Unexpected response from server (HTTP ${response.status}).`,
    };
  }
  return {
    ok: response.ok,
    status: response.status,
    data: data,
  };
}

export const apiService = {
  // 1. Health Check
  async checkHealth() {
    return await fetchAPI('/health', { method: 'GET' });
  },

  // 2. Authentication
  async register(userData) {
    // Patient self-registration only (requires a verification_token from verify-otp).
    // Doctor accounts are created by the Admin via createUser().
    return await fetchAPI('/auth/register/patient', {
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

  async getCurrentUser() {
    return await fetchAPI('/auth/me', { method: 'GET' });
  },

  // ------------------------------------------------------------------
  // Email OTP self-registration (Patient only). The OTP is emailed by the
  // backend and never returned by the API. Verification returns a
  // verification_token that the registration endpoint re-checks server-side.
  // ------------------------------------------------------------------
  async sendEmailOtp(email) {
    return await fetchAPI('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ email, purpose: 'patient_signup' }),
    });
  },

  async verifyEmailOtp(email, otp) {
    return await fetchAPI('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp, purpose: 'patient_signup' }),
    });
  },

  async getRegistrationDoctors() {
    return await fetchAPI('/auth/doctors', { method: 'GET' });
  },

  // Care-team relationship
  async getMyDoctor() {
    return await fetchAPI('/auth/me/doctor', { method: 'GET' });
  },

  async getMyPatients() {
    return await fetchAPI('/auth/me/patients', { method: 'GET' });
  },

  // Password reset by email
  async forgotPassword(email) {
    return await fetchAPI('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async resetPassword(token, newPassword) {
    return await fetchAPI('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, new_password: newPassword }),
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

  /**
   * Downloads a report PDF. The request carries the signed-in user's token;
   * the backend only serves reports the user is allowed to access.
   */
  async downloadReport(reportId, fileName = null) {
    const downloadUrl = `${API_BASE_URL}/reports/${encodeURIComponent(reportId)}/download`;
    const token = localStorage.getItem('ckd_token');
    try {
      const response = await fetch(downloadUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) {
        let message = `Download failed (HTTP ${response.status}).`;
        try {
          const body = await response.json();
          if (body?.error) message = body.error;
        } catch { /* non-JSON error body */ }
        return { ok: false, status: response.status, error: message };
      }
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${fileName || reportId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);
      return { ok: true, message: 'PDF report download started' };
    } catch (err) {
      return { ok: false, error: err.message || 'Download failed.' };
    }
  },

  // 8. Patient portal (patient role only; always scoped to the signed-in patient)
  async getPatientProfile() {
    return await fetchAPI('/patient/profile', { method: 'GET' });
  },

  async getPatientOverview() {
    return await fetchAPI('/patient/overview', { method: 'GET' });
  },

  async getPatientReports() {
    return await fetchAPI('/patient/reports', { method: 'GET' });
  },

  async getPatientReport(reportId) {
    return await fetchAPI(`/patient/reports/${encodeURIComponent(reportId)}`, { method: 'GET' });
  },

  async getPatientReviews() {
    return await fetchAPI('/patient/reviews', { method: 'GET' });
  },

  // 9. Doctor reviews (doctors write for their assigned patients)
  async getReviews(patientId) {
    return await fetchAPI(`/reviews?patient_id=${encodeURIComponent(patientId)}`, { method: 'GET' });
  },

  async createReview(review) {
    return await fetchAPI('/reviews', { method: 'POST', body: JSON.stringify(review) });
  },

  async updateReview(reviewId, review) {
    return await fetchAPI(`/reviews/${reviewId}`, { method: 'PUT', body: JSON.stringify(review) });
  },

  async deleteReview(reviewId) {
    return await fetchAPI(`/reviews/${reviewId}`, { method: 'DELETE' });
  },

  // 10. Notifications (own only)
  async getNotifications() {
    return await fetchAPI('/notifications', { method: 'GET' });
  },

  async markNotificationRead(notificationId) {
    return await fetchAPI(`/notifications/${notificationId}/read`, { method: 'POST' });
  },

  async markAllNotificationsRead() {
    return await fetchAPI('/notifications/read-all', { method: 'POST' });
  },
};

export default apiService;
