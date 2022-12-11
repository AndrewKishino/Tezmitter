/* eslint-disable global-require */
import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';
import Headroom from 'headroom.js';

function AppNavbar({
  account,
  connectDapp,
  disconnectDapp,
  reInitializeSapling,
  saplingAccount,
}) {
  useEffect(() => {
    const headroom = new Headroom(document.getElementById('navbar-main'));
    headroom.init();
  }, []);

  return (
    <Navbar
      id="navbar-main"
      collapseOnSelect
      expand="lg"
      bg="dark"
      variant="dark"
    >
      <Container>
        <Navbar.Brand className="me-0">
          <Link to="/" style={{ color: '#fff', textDecoration: 'none' }}>
            <img
              alt="Logo"
              src={require('assets/img/logo/logo.png')}
              width="30"
              height="30"
              className="d-inline-block align-top"
            />{' '}
            TEZMITTER
          </Link>
        </Navbar.Brand>
        <Nav className="ms-auto d-inline-block">
          {saplingAccount ? (
            <OverlayTrigger
              placement="bottom"
              delay={{ show: 250, hide: 400 }}
              overlay={<Tooltip>Reset Sapling Account</Tooltip>}
            >
              <Button
                className="me-2"
                onClick={reInitializeSapling}
              >{`${saplingAccount.slice(0, 6)}...${saplingAccount.slice(
                -6,
              )}`}</Button>
            </OverlayTrigger>
          ) : (
            <Button className="me-2">Load Sapling Account</Button>
          )}
          {account ? (
            <OverlayTrigger
              placement="bottom"
              delay={{ show: 250, hide: 400 }}
              overlay={<Tooltip>Disconnect Wallet</Tooltip>}
            >
              <Button onClick={disconnectDapp}>{`${account.slice(
                0,
                6,
              )}...${account.slice(-6)}`}</Button>
            </OverlayTrigger>
          ) : (
            <Button onClick={() => connectDapp(false)}>Connect Wallet</Button>
          )}
        </Nav>
      </Container>
    </Navbar>
  );
}

AppNavbar.propTypes = {
  account: PropTypes.string,
  connectDapp: PropTypes.func.isRequired,
  disconnectDapp: PropTypes.func.isRequired,
  reInitializeSapling: PropTypes.func.isRequired,
  saplingAccount: PropTypes.string,
};

AppNavbar.defaultProps = {
  account: '',
  saplingAccount: '',
};

export default AppNavbar;
