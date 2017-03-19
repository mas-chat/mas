import React from 'react';
import { render } from 'react-dom';
import { BrowserRouter as Router, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import configureStore from './store/configureStore';
import Desktop from './components/Desktop';
import DevTools from './components/DevTools';
import socket from './utils/socket';
import './app.css';

const store = configureStore();

socket.configure(store);
socket.start();

const rootElement = document.createElement('div');
rootElement.id = 'root';

document.body.appendChild(rootElement);

const devTools = process.env.NODE_ENV === 'production' ? null : <DevTools />;

render(
  <Provider store={store}>
    <span>
      <Router>
        <Route path="/sector17" component={Desktop} />
      </Router>
      {devTools}
    </span>
  </Provider>,
  document.getElementById('root')
);
