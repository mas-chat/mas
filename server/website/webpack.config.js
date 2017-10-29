const path = require('path');
const webpack = require('webpack');
const ManifestPlugin = require('webpack-manifest-plugin');
const OptimizeCssAssetsPlugin = require('optimize-css-assets-webpack-plugin');

const prefix = path.resolve(__dirname);
const nodeEnv = process.env.NODE_ENV;

const isProduction = nodeEnv === 'production';

console.log(`Production mode: ${isProduction}`); // eslint-disable-line no-console

const config = {
    entry: `${prefix}/javascripts/app.js`,
    output: {
        path: `${prefix}/dist`,
        publicPath: '/website-assets/',
        filename: isProduction ? 'app-[hash].js' : 'app.js'
    },
    module: {
        rules: [ {
            test: /\.js$/,
            exclude: /(node_modules)/,
            use: 'babel-loader'
        }, {
            test: /\.(scss|css)$/,
            use: [
                'style-loader',
                'css-loader?modules&importLoaders=3&localIdentName=[path][name]---[local]',
                'postcss-loader',
                'sass-loader',
                'bulma-loader?theme=stylesheets/bulma-theme.scss'
            ]
        }, {
            test: /\.(ttf|eot|svg|woff|woff2)$/,
            use: 'url-loader?limit=10000'
        }, {
            test: /\.(png|jpg)$/,
            use: 'url-loader?limit=8192'
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
        new ManifestPlugin(),
        new OptimizeCssAssetsPlugin()
    ]
};

module.exports = config;
