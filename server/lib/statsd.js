'use strict';

const StatsD = require('hot-shots');
const conf = require('./conf');

let statsdConnection = null;

exports.gauge = function gauge(name, value) {
  if (conf.get('statsd:enabled')) {
    if (!statsdConnection) {
      statsdConnection = new StatsD(conf.get('statsd:host'), conf.get('statsd:port'));
    }

    statsdConnection.gauge(name, value);
  }
};
