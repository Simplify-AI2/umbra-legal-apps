import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Logout = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handleLogout = async () => {
      try {
        await signOut();
        navigate('/login');
      } catch (error) {
        console.error('Error during logout:', error);
        navigate('/login');
      }
    };

    handleLogout();
  }, [signOut, navigate]);

  return null; // This component doesn't render anything
};

export default Logout; 