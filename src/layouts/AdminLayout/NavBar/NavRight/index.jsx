import React, { useState } from 'react';
import { Card, ListGroup, Dropdown } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import PerfectScrollbar from 'react-perfect-scrollbar';

import ChatList from './ChatList';

import avatar1 from '../../../../assets/images/user/avatar-1.jpg';
import avatar2 from '../../../../assets/images/user/avatar-2.jpg';
import avatar3 from '../../../../assets/images/user/avatar-3.jpg';
import avatar4 from '../../../../assets/images/user/avatar-4.jpg';

const NavRight = () => {
  const [listOpen, setListOpen] = useState(false);

  const notiData = [
    {
      name: 'Joseph William',
      image: avatar2,
      details: 'Purchase New Theme and make payment',
      activity: '30 min'
    },
    {
      name: 'Sara Soudein',
      image: avatar3,
      details: 'currently login',
      activity: '30 min'
    },
    {
      name: 'Suzen',
      image: avatar4,
      details: 'Purchase New Theme and make payment',
      activity: 'yesterday'
    }
  ];

  return (
    <React.Fragment>
      <ListGroup as="ul" bsPrefix=" " className="navbar-nav ml-auto" id="navbar-right">
        <ListGroup.Item as="li" bsPrefix=" ">
          <Dropdown align={'end'} className="drp-user">
            <Dropdown.Toggle as={Link} variant="link" to="#" id="dropdown-basic">
              <i className="icon feather icon-settings" />
            </Dropdown.Toggle>
            <Dropdown.Menu align="end" className="profile-notification">
              <div className="pro-head">
                <img src={avatar1} className="img-radius" alt="User Profile" />
                <span>UMBRA User</span>
                <Link to="#" className="dud-logout" title="Logout">
                  <i className="feather icon-log-out" />
                </Link>
              </div>
              <ListGroup as="ul" bsPrefix=" " variant="flush" className="pro-body">
                <ListGroup.Item as="li" bsPrefix=" ">
                  <Link to="#" className="dropdown-item">
                    <i className="feather icon-settings" /> Settings
                  </Link>
                </ListGroup.Item>
                <ListGroup.Item as="li" bsPrefix=" ">
                  <Link to="#" className="dropdown-item">
                    <i className="feather icon-user" /> Profile
                  </Link>
                </ListGroup.Item>
                <ListGroup.Item as="li" bsPrefix=" ">
                  <Link to="#" className="dropdown-item">
                    <i className="feather icon-mail" /> My Messages
                  </Link>
                </ListGroup.Item>
                <ListGroup.Item as="li" bsPrefix=" ">
                  <Link to="#" className="dropdown-item">
                    <i className="feather icon-lock" /> Logout
                  </Link>
                </ListGroup.Item>
              </ListGroup>
            </Dropdown.Menu>
          </Dropdown>
        </ListGroup.Item>
      </ListGroup>
      <ChatList listOpen={listOpen} closed={() => setListOpen(false)} />
    </React.Fragment>
  );
};

export default NavRight;
