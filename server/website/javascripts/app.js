//
//   Copyright 2014 Ilkka Oksanen <iao@iki.fi>
//
//   Licensed under the Apache License, Version 2.0 (the "License");
//   you may not use this file except in compliance with the License.
//   You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
//   Unless required by applicable law or agreed to in writing,
//   software distributed under the License is distributed on an "AS
//   IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
//   express or implied.  See the License for the specific language
//   governing permissions and limitations under the License.
//

import React from 'react';
import { render } from 'react-dom';
import {
    BrowserRouter as Router,
    Route,
    Switch
} from 'react-router-dom';

import '!!style!css!sass!../stylesheets/pages.scss';
import 'file?name=favicon.ico!../favicon.ico';

import Layout from './components/layout';
import AboutPage from './components/pages/about';
import HomePage from './components/pages/home';
import TOSPage from './components/pages/tos';
import SupportPage from './components/pages/support';
import PricingPage from './components/pages/pricing';

render((
    <Router>
        <Layout>
            <Switch>
                <Route exact path='/' component={HomePage} />
                <Route path="/home" component={HomePage} />
                <Route path="/support" component={SupportPage} />
                <Route path="/about" component={AboutPage} />
                <Route path="/tos" component={TOSPage} />
                <Route path="/pricing" component={PricingPage} />
            </Switch>
        </Layout>
    </Router>
), document.getElementById('main'));
