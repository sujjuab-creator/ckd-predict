import React, { createContext, useContext, useState, useEffect } from 'react';
import apiService from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [backendAvailable, setBackendAvailable] = useState(false);

  // Check backend health on mount
  useEffect(() => {
    apiService.checkHealth().then(res => {
      if (res.ok && res.data?.status === 'ok') {
        setBackendAvailable(true);
      } else {
        setBackendAvailable(false);
      }
    });
  }, []);

  // Initialize Auth State from sessionStorage if available (defaults to null for unauthenticated users)
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = sessionStorage.getItem('ckd_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const saveSession = (user, token = null) => {
    setCurrentUser(user);
    if (user) {
      sessionStorage.setItem('ckd_session', JSON.stringify(user));
      if (token) {
        localStorage.setItem('ckd_token', token);
      }
    } else {
      sessionStorage.removeItem('ckd_session');
      localStorage.removeItem('ckd_token');
    }
  };

  /**
   * Login Function (Connects directly to Flask Backend API and Database)
   */
  const login = async (email, password, selectedRole) => {
    if (!email || !email.trim()) {
      return { success: false, error: 'Email address is required.' };
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return { success: false, error: 'Please enter a valid email address.' };
    }
    if (!password) {
      return { success: false, error: 'Password is required.' };
    }
    if (!selectedRole) {
      return { success: false, error: 'Please select a user role.' };
    }

    const cleanEmail = email.trim().toLowerCase();

    try {
      const apiRes = await apiService.login({
        email: cleanEmail,
        password: password,
        role: selectedRole
      });

      if (apiRes.ok && apiRes.data?.success) {
        const backendUser = apiRes.data.user;
        const token = apiRes.data.token;
        const sessionUser = {
          id: backendUser.id,
          name: backendUser.name,
          email: backendUser.email,
          role: backendUser.role,
          status: backendUser.status || 'Active',
          isTemporaryPassword: backendUser.is_temporary_password || false,
          mrn: backendUser.role === 'patient' ? (backendUser.patient_id || `PAT-${backendUser.id}`) : undefined,
          loggedIn: true
        };
        saveSession(sessionUser, token);
        return { success: true, redirectPath: `/${sessionUser.role}`, user: sessionUser };
      } else if (apiRes.data?.error) {
        return { success: false, error: apiRes.data.error };
      }
    } catch (e) {
      return { success: false, error: 'Authentication failed. Please check network connection.' };
    }

    return { 
      success: false, 
      error: `Invalid credentials or role mismatch for ${selectedRole.toUpperCase()}. Please check your email and password.` 
    };
  };

  /**
   * Signup Function (Public registration disabled in hospital mode)
   */
  const signup = async () => {
    return {
      success: false,
      error: 'Public self-registration is disabled. Patient and Doctor accounts must be created by the Hospital Administrator.'
    };
  };

  /**
   * Logout Function
   */
  const logout = () => {
    saveSession(null, null);
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      backendAvailable,
      login,
      signup,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}


