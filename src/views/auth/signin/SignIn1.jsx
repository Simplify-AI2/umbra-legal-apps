import React from 'react';
import { Card, Button, Alert } from 'react-bootstrap';
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import umbraLogo from '../../../assets/images/UMBRA-logobig.png';

import Breadcrumb from '../../../layouts/AdminLayout/Breadcrumb';

import { CopyToClipboard } from 'react-copy-to-clipboard';

import AuthLogin from './JWTLogin';

const Signin1 = () => {
  const { user } = useAuth();
  // user.email - user's email
  // user.role - user's role (from user_metadata.full_name)

  return (
    <React.Fragment>
      <Breadcrumb />
      <div className="auth-wrapper">
        <div className="auth-content">
          <Card className="borderless text-center">
            <Card.Body>
              <div className="mb-4">
                <img src={umbraLogo} alt="UMBRA Logo" style={{ height: '60px', width: 'auto' }} />
              </div>
              <AuthLogin />
            </Card.Body>
          </Card>
        </div>
      </div>
    </React.Fragment>
  );
};

export default Signin1;
