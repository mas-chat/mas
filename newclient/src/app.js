import React from 'react';
import { render } from 'react-dom';
import { Router, Route, browserHistory } from 'react-router';
import { Provider } from 'react-redux';
import configureStore from './store/configureStore';
import Desktop from './components/desktop';
import socket from './utils/socket';

const store = configureStore();

socket.configure(store);
socket.start();

const rootElement = document.createElement('div');
rootElement.id = 'root';
document.body.appendChild(rootElement);

render(
  <Provider store={store}>
    <Router history={browserHistory}>
      <Route path="/app_v2" component={Desktop} />
    </Router>
  </Provider>,
  document.getElementById('root')
);
