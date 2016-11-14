import React from 'react';
import { render } from 'react-dom';
import { Router, Route, browserHistory } from 'react-router';

import Desktop from './components/desktop';

const rootElement = document.createElement('div');
rootElement.id = 'root';
document.body.appendChild(rootElement);

render((
  <Router history={browserHistory}>
    <Route path="/app_v2" component={Desktop} />
  </Router>
), document.getElementById('root'));
