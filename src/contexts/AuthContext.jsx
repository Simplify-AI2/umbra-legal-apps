import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '../config/supabase';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState({ id: '1', email: 'user@example.com' }); // Mock authenticated user
  const [loading, setLoading] = useState(false);

  const signIn = async (email, password) => {
    // Bypass actual authentication
    return { user: { id: '1', email } };
  };

  const signOut = async () => {
    // Bypass actual signout
    return;
  };

  const value = {
    user,
    loading,
    signIn,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 