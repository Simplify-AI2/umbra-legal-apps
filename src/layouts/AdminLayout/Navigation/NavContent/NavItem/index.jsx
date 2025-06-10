import PropTypes from 'prop-types';
import React, { useContext } from 'react';
import { ListGroup } from 'react-bootstrap';
import { NavLink, useLocation } from 'react-router-dom';

import NavIcon from '../NavIcon';
import NavBadge from '../NavBadge';

import { ConfigContext } from '../../../../../contexts/ConfigContext';
import * as actionType from '../../../../../store/actions';
import useWindowSize from '../../../../../hooks/useWindowSize';

const NavItem = ({ item }) => {
  const windowSize = useWindowSize();
  const configContext = useContext(ConfigContext);
  const { dispatch } = configContext;
  const location = useLocation(); // Get current location

  let itemTitle = item.title;
  // Determine if the current item is the active Dashboard item
  const isActiveDashboard = item.id === 'dashboard' && location.pathname === item.url;

  if (item.icon) {
    // Apply inline style conditionally
    itemTitle = <span className="pcoded-mtext" style={isActiveDashboard ? { color: '#ffffff' } : {}}>{item.title}</span>;
  } else {
     // Apply inline style conditionally even without icon
     itemTitle = <span className="pcoded-mtext" style={isActiveDashboard ? { color: '#ffffff' } : {}}>{item.title}</span>;
  }

  let itemTarget = '';
  if (item.target) {
    itemTarget = '_blank';
  }

  let subContent;
  if (item.external) {
    subContent = (
      <a href={item.url} target="_blank" rel="noopener noreferrer">
        <NavIcon items={item} />
        {itemTitle}
        <NavBadge items={item} />
      </a>
    );
  } else {
    subContent = (
      <NavLink to={item.url} className="nav-link" target={itemTarget}>
        <NavIcon items={item} />
        {itemTitle}
        <NavBadge items={item} />
      </NavLink>
    );
  }
  let mainContent = '';

  if (windowSize.width < 992) {
    mainContent = (
      <ListGroup.Item as="li" bsPrefix=" " className={item.classes} onClick={() => dispatch({ type: actionType.COLLAPSE_MENU })}>
        {subContent}
      </ListGroup.Item>
    );
  } else {
    mainContent = (
      <ListGroup.Item as="li" bsPrefix=" " className={item.classes}>
        {subContent}
      </ListGroup.Item>
    );
  }

  return <React.Fragment>{mainContent}</React.Fragment>;
};

NavItem.propTypes = {
  item: PropTypes.object,
  title: PropTypes.string,
  icon: PropTypes.string,
  target: PropTypes.string,
  external: PropTypes.bool,
  url: PropTypes.string,
  classes: PropTypes.string
};

export default NavItem;
