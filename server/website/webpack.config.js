const path = require('path');
const webpack = require('webpack');
const DashboardPlugin = require('webpack-dashboard/plugin');

const prefix = path.resolve(__dirname);
const nodeEnv = process.env.NODE_ENV;

const isProduction = nodeEnv === 'production';

console.log(`Production mode: ${isProduction}`); // eslint-disable-line no-console

const config = {
    entry: `${prefix}/javascripts/app.js`,
    output: {
        path: `${prefix}/dist`,
        publicPath: '/dist/',
        filename: 'app.js'
    },
    module: {
        loaders: [ {
            test: /\.js$/,
            exclude: /(node_modules|bower_components)/,
            loader: 'babel',
            query: {
                presets: [ 'es2015' ]
            }
        }, {
            test: /\.scss$/,
            loaders: [ 'style', 'css', 'sass' ]
        }, {
            test: /\.css$/,
            loader: 'style!css?modules'
        }, {
            test: /\.(ttf|eot|svg|woff|woff2)$/,
            loader: 'url?limit=10000'
        } ]
    },
    plugins: [
        new webpack.DefinePlugin({
            'process.env': {
                NODE_ENV: JSON.stringify(nodeEnv)
            }
        })
    ]
};

if (!isProduction) {
    config.plugins.push(new DashboardPlugin());
}

module.exports = config;
