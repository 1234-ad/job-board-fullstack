import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { authAPI } from '../services/api';

// Initial state
const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

// Action types
const AUTH_ACTIONS = {
  LOGIN_START: 'LOGIN_START',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  LOGOUT: 'LOGOUT',
  REGISTER_START: 'REGISTER_START',
  REGISTER_SUCCESS: 'REGISTER_SUCCESS',
  REGISTER_FAILURE: 'REGISTER_FAILURE',
  LOAD_USER_START: 'LOAD_USER_START',
  LOAD_USER_SUCCESS: 'LOAD_USER_SUCCESS',
  LOAD_USER_FAILURE: 'LOAD_USER_FAILURE',
  UPDATE_PROFILE_SUCCESS: 'UPDATE_PROFILE_SUCCESS',
  CLEAR_ERROR: 'CLEAR_ERROR',
};

// Reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case AUTH_ACTIONS.LOGIN_START:
    case AUTH_ACTIONS.REGISTER_START:
    case AUTH_ACTIONS.LOAD_USER_START:
      return {
        ...state,
        isLoading: true,
        error: null,
      };

    case AUTH_ACTIONS.LOGIN_SUCCESS:
    case AUTH_ACTIONS.REGISTER_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };

    case AUTH_ACTIONS.LOAD_USER_SUCCESS:
    case AUTH_ACTIONS.UPDATE_PROFILE_SUCCESS:
      return {
        ...state,
        user: action.payload,
        isLoading: false,
        error: null,
      };

    case AUTH_ACTIONS.LOGIN_FAILURE:
    case AUTH_ACTIONS.REGISTER_FAILURE:
    case AUTH_ACTIONS.LOAD_USER_FAILURE:
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
      };

    case AUTH_ACTIONS.LOGOUT:
      return {
        ...initialState,
        isLoading: false,
      };

    case AUTH_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };

    default:
      return state;
  }
};

// Create context
const AuthContext = createContext();

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Auth provider component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Load user on app start
  useEffect(() => {
    loadUser();
  }, []);

  // Load user from token
  const loadUser = async () => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      dispatch({ type: AUTH_ACTIONS.LOAD_USER_FAILURE, payload: 'No token found' });
      return;
    }

    try {
      dispatch({ type: AUTH_ACTIONS.LOAD_USER_START });
      const response = await authAPI.getProfile();
      
      dispatch({ 
        type: AUTH_ACTIONS.LOAD_USER_SUCCESS, 
        payload: response.data 
      });
    } catch (error) {
      console.error('Load user error:', error);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      dispatch({ 
        type: AUTH_ACTIONS.LOAD_USER_FAILURE, 
        payload: error.error || 'Failed to load user' 
      });
    }
  };

  // Login function
  const login = async (credentials) => {
    try {
      dispatch({ type: AUTH_ACTIONS.LOGIN_START });
      const response = await authAPI.login(credentials);
      
      // Store token and user in localStorage
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      dispatch({ 
        type: AUTH_ACTIONS.LOGIN_SUCCESS, 
        payload: response.data 
      });
      
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Login error:', error);
      dispatch({ 
        type: AUTH_ACTIONS.LOGIN_FAILURE, 
        payload: error.error || 'Login failed' 
      });
      return { success: false, error: error.error || 'Login failed' };
    }
  };

  // Register function
  const register = async (userData) => {
    try {
      dispatch({ type: AUTH_ACTIONS.REGISTER_START });
      const response = await authAPI.register(userData);
      
      // Store token and user in localStorage
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      dispatch({ 
        type: AUTH_ACTIONS.REGISTER_SUCCESS, 
        payload: response.data 
      });
      
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Register error:', error);
      dispatch({ 
        type: AUTH_ACTIONS.REGISTER_FAILURE, 
        payload: error.error || 'Registration failed' 
      });
      return { success: false, error: error.error || 'Registration failed' };
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    dispatch({ type: AUTH_ACTIONS.LOGOUT });
  };

  // Update profile function
  const updateProfile = async (profileData) => {
    try {
      const response = await authAPI.updateProfile(profileData);
      
      // Update user in localStorage
      localStorage.setItem('user', JSON.stringify(response.data));
      
      dispatch({ 
        type: AUTH_ACTIONS.UPDATE_PROFILE_SUCCESS, 
        payload: response.data 
      });
      
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Update profile error:', error);
      return { success: false, error: error.error || 'Profile update failed' };
    }
  };

  // Change password function
  const changePassword = async (passwordData) => {
    try {
      const response = await authAPI.changePassword(passwordData);
      return { success: true, message: response.message };
    } catch (error) {
      console.error('Change password error:', error);
      return { success: false, error: error.error || 'Password change failed' };
    }
  };

  // Clear error function
  const clearError = () => {
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
  };

  // Check if user has specific role
  const hasRole = (role) => {
    return state.user?.role === role;
  };

  // Check if user has any of the specified roles
  const hasAnyRole = (roles) => {
    return roles.includes(state.user?.role);
  };

  // Get user's full name
  const getUserFullName = () => {
    if (!state.user) return '';
    return `${state.user.first_name} ${state.user.last_name}`.trim();
  };

  // Context value
  const value = {
    // State
    user: state.user,
    token: state.token,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    error: state.error,
    
    // Actions
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    loadUser,
    clearError,
    
    // Utilities
    hasRole,
    hasAnyRole,
    getUserFullName,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;