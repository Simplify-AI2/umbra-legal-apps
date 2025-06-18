import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { BASE_URL } from '../config/constant';

const ProtectedRoute = ({ children }) => {
  // Bypass authentication check and directly return children
  return children;
};

export default ProtectedRoute; 