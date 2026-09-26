import React, { createContext, useContext, useState, useEffect } from 'react';
import { DEMO_USERS } from '../data/mockData';
import apiService from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Store extra registered demo accounts created during session
  const [registeredDemoUsers, setRegisteredDemoUsers] = useState([]);
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

  // Initialize Auth State from sessionStorage if available
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = sessionStorage.getItem('ckd_demo_session');
      return saved ? JSON.parse(saved) : DEMO_USERS.patient; // Default demo session for immediate viewing
    } catch {
      return DEMO_USERS.patient;
    }
  });

  const saveSession = (user) => {
    setCurrentUser(user);
    if (user) {
      sessionStorage.setItem('ckd_demo_session', JSON.stringify(user));
    } else {
      sessionStorage.removeItem('ckd_demo_session');
    }
  };

  /**
   * Login Function (Connects to Flask Backend API with Demo Fallback)
   */
  const login = async (email, password, selectedRole) => {
    // Basic validation
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

    // 1. Try Backend API login first
    try {
      const apiRes = await apiService.login({
        email: cleanEmail,
        password: password,
        role: selectedRole
      });

      if (apiRes.ok && apiRes.data?.success) {
        const backendUser = apiRes.data.user;
        const sessionUser = {
          id: backendUser.id,
          name: backendUser.name,
          email: backendUser.email,
          role: backendUser.role,
          mrn: `PAT-${backendUser.id}`,
          loggedIn: true
        };
        saveSession(sessionUser);
        return { success: true, redirectPath: `/${sessionUser.role}`, user: sessionUser };
      }
    } catch (e) {
      // Backend unreachable or error, continue to demo fallback
    }

    // 2. Check predefined demo accounts
    let foundUser = Object.values(DEMO_USERS).find(
      u => u.email.toLowerCase() === cleanEmail && u.password === password && u.role === selectedRole
    );

    // Check dynamically registered demo accounts
    if (!foundUser) {
      foundUser = registeredDemoUsers.find(
        u => u.email.toLowerCase() === cleanEmail && u.password === password && u.role === selectedRole
      );
    }

    if (foundUser) {
      const sessionUser = {
        id: foundUser.id,
        name: foundUser.name,
        email: foundUser.email,
        role: foundUser.role,
        mrn: foundUser.mrn || 'MRN-DEMO-01',
        license: foundUser.license || 'MD-DEMO-01',
        assignedDoctor: foundUser.assignedDoctor || 'Dr. Aris Thorne',
        avatar: foundUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        loggedIn: true
      };
      saveSession(sessionUser);

      const redirectPath = `/${sessionUser.role}`;
      return { success: true, redirectPath, user: sessionUser };
    }

    return { 
      success: false, 
      error: `Invalid credentials or role mismatch for ${selectedRole.toUpperCase()}. Please check your email and password.` 
    };
  };

  /**
   * Quick 1-Click Demo Login
   */
  const quickDemoLogin = (role) => {
    const user = DEMO_USERS[role] || DEMO_USERS.patient;
    const sessionUser = {
      ...user,
      loggedIn: true
    };
    saveSession(sessionUser);
    return `/${role}`;
  };

  /**
   * Signup Function (Connects to Flask Backend API)
   */
  const signupDemo = async ({ name, email, password, confirmPassword, role }) => {
    if (!name || !name.trim()) {
      return { success: false, error: 'Full name is required.' };
    }
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
    if (password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long.' };
    }
    if (password !== confirmPassword) {
      return { success: false, error: 'Passwords do not match.' };
    }
    if (!role) {
      return { success: false, error: 'Please select a role.' };
    }

    // Critical Requirement: Admin signup is strictly prohibited
    if (role === 'admin') {
      return { success: false, error: 'Admin account creation is not allowed via registration.' };
    }

    // 1. Try Backend API registration
    try {
      const apiRes = await apiService.register({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: password,
        role: role
      });

      if (apiRes.ok && apiRes.data?.success) {
        return { success: true, message: 'Account registered successfully in database.' };
      } else if (apiRes.data?.error) {
        return { success: false, error: apiRes.data.error };
      }
    } catch (e) {
      // Fall through to local fallback registration if backend down
    }

    // Create new demo user object (Fallback)
    const newDemoUser = {
      id: `usr-demo-${Date.now()}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: password,
      role: role,
      mrn: role === 'patient' ? `MRN-${Math.floor(100000 + Math.random() * 900000)}` : undefined,
      license: role === 'doctor' ? `MD-${Math.floor(100000 + Math.random() * 900000)}` : undefined,
      avatar: role === 'doctor' 
        ? 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150' 
        : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
    };

    setRegisteredDemoUsers(prev => [...prev, newDemoUser]);
    return { success: true, message: 'Demo account created successfully.' };
  };

  /**
   * Demo Logout Function
   */
  const logout = () => {
    saveSession(null);
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      backendAvailable,
      login,
      quickDemoLogin,
      signupDemo,
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

