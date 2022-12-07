import React from 'react';

const SocketStateContext = React.createContext();
const SocketDispatchContext = React.createContext();

const socketReducer = (state, action) => {
  switch (action.type) {
    case 'NEW_BLOCK':
      return {
        ...state,
        latestBlock: action.payload,
      };
    case 'CONSTANTS':
      return {
        ...state,
        constants: action.payload,
      };
    case 'SOCKET_CONNECTED':
      return {
        ...state,
        connectionStatus: 'connected',
      };
    case 'SOCKET_DISCONNECTED':
      return {
        ...state,
        connectionStatus: 'disconnected',
      };
    default: {
      throw new Error(`Unhandled action type: ${action.type}`);
    }
  }
};

// eslint-disable-next-line react/prop-types
function SocketProvider({ children }) {
  const [state, dispatch] = React.useReducer(socketReducer, {
    latestBlock: null,
    connectionStatus: 'disconnected',
  });

  return (
    <SocketStateContext.Provider value={state}>
      <SocketDispatchContext.Provider value={dispatch}>
        {children}
      </SocketDispatchContext.Provider>
    </SocketStateContext.Provider>
  );
}

const useSocketState = () => {
  const context = React.useContext(SocketStateContext);
  if (context === undefined) {
    throw new Error('useSocketState must be used within a SocketProvider');
  }
  return context;
};

const useSocketDispatch = () => {
  const context = React.useContext(SocketDispatchContext);
  if (context === undefined) {
    throw new Error('useSocketDispatch must be used within a SocketProvider');
  }
  return context;
};

const updateLatestBlock = (dispatch, block) => {
  dispatch({
    type: 'NEW_BLOCK',
    payload: block,
  });
};

const updateConstants = (dispatch, constants) => {
  dispatch({
    type: 'CONSTANTS',
    payload: constants,
  });
};

const updateConnection = (dispatch, connected) => {
  if (connected) {
    return dispatch({
      type: 'SOCKET_CONNECTED',
    });
  }
  return dispatch({
    type: 'SOCKET_DISCONNECTED',
  });
};

export {
  SocketProvider,
  useSocketState,
  useSocketDispatch,
  updateLatestBlock,
  updateConnection,
  updateConstants,
};
