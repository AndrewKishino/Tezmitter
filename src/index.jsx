import React from 'react';
import { createRoot } from 'react-dom/client';

import Main from 'views/Main';

import { SocketProvider } from 'context/SocketContext';

import 'assets/scss/app.scss';
import 'assets/vendor/font-awesome/css/fontawesome.css';
import 'assets/vendor/font-awesome/css/duotone.css';
import 'assets/vendor/font-awesome/css/solid.css';
import 'assets/vendor/font-awesome/css/brands.css';
import 'assets/vendor/tezmitter-fonts/css/tezmitter-fonts.css';

const container = document.getElementById('root');

const root = createRoot(container);

root.render(
  <SocketProvider>
    <Main />
  </SocketProvider>,
);
