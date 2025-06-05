import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import routes, { renderRoutes } from './routes';

const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        {renderRoutes(routes)}
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
