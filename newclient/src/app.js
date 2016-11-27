import React from 'react';
import { render } from 'react-dom';
import { Router, Route, browserHistory } from 'react-router';
import { Provider } from 'react-redux';
import configureStore from './store/configureStore';
import Desktop from './components/Desktop';
import DevTools from './components/DevTools';
import socket from './utils/socket';

const store = configureStore.default();

socket.configure(store);
socket.start();

const rootElement = document.createElement('div');
rootElement.id = 'root';
document.body.appendChild(rootElement);

// TODO: Don't add devtools in production builds

render(
  <Provider store={store}>
    <span>
      <Router history={browserHistory}>
        <Route path="/sector17" component={Desktop} />
      </Router>
      <DevTools />
    </span>
  </Provider>,
  document.getElementById('root')
);
