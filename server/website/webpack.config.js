const path = require('path');
const webpack = require('webpack');
const DashboardPlugin = require('webpack-dashboard/plugin');
const ManifestPlugin = require('webpack-manifest-plugin');

const prefix = path.resolve(__dirname);
const nodeEnv = process.env.NODE_ENV;

const isProduction = nodeEnv === 'production';

console.log(`Production mode: ${isProduction}`); // eslint-disable-line no-console

const config = {
    entry: `${prefix}/javascripts/app.js`,
    output: {
        path: `${prefix}/dist`,
        publicPath: '/dist/',
        filename: isProduction ? 'app-[hash].js' : 'app.js'
    },
    module: {
        rules: [ {
            test: /\.js$/,
            exclude: /(node_modules|bower_components)/,
            use: [ {
                loader: 'babel',
                query: {
                    presets: [ 'es2015' ]
                }
            } ]
        }, {
            test: /\.scss$/,
            use: [ 'style', 'css', 'postcss', 'sass' ]
        }, {
            test: /\.css$/,
            use: [ 'style', 'css?modules', 'postcss' ]
        }, {
            test: /\.(ttf|eot|svg|woff|woff2)$/,
            use: 'url?limit=10000'
        } ]
    },
    plugins: [
        new webpack.DefinePlugin({
            'process.env': {
                NODE_ENV: JSON.stringify(nodeEnv)
            }
        }),
        new webpack.ProvidePlugin({
            Promise: 'bluebird'
        }),
        new ManifestPlugin()
    ]
};

if (!isProduction) {
    config.plugins.push(new DashboardPlugin());
}

module.exports = config;
