import React from 'react';
import { Nav, Navbar, Image } from 'react-bootstrap';
import { useAuth } from '../../../../contexts/AuthContext';
import avatar4 from '../../../../assets/images/user/avatar-4.jpg';

const NavRight = () => {
  const { user } = useAuth();

  return (
    <Nav className="navbar-nav ml-auto">
      <Nav.Item>
        <Nav.Link className="user-profile">
          <Image
            src={avatar4}
            alt="User Profile"
            className="rounded-circle"
            width="40"
            height="40"
          />
          <span>{user?.email || 'User'}</span>
        </Nav.Link>
      </Nav.Item>
    </Nav>
  );
};

export default NavRight;
