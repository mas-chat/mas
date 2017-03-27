const path = require('path');
const webpack = require('webpack');
const DashboardPlugin = require('webpack-dashboard/plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const prefix = path.resolve(__dirname);
const nodeEnv = process.env.NODE_ENV;
const isProduction = nodeEnv === 'production';

console.log(`MODE: ${isProduction ? 'production' : 'development'}`); // eslint-disable-line no-console

const config = {
  entry: `${prefix}/src/app.js`,
  output: {
    path: `${prefix}/dist`,
    publicPath: '/sector17/',
    filename: isProduction ? 'app-[hash].js' : 'app.js'
  },
  module: {
    rules: [{
      test: /\.js$/,
      exclude: /(node_modules)/,
      use: 'babel-loader'
    }, {
      test: /\.css$/,
      use: [
        'style-loader',
        'css-loader?importLoader=1&modules&localIdentName=[path]_[local]_[hash:base64:7]'
      ]
    }, {
      test: /\.(ttf|eot|woff|woff2)$/,
      use: 'url-loader?limit=3000'
    }, {
      test: /\.svg$/,
      use: 'file-loader'
    }]
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: JSON.stringify(nodeEnv)
      }
    }),
    new HtmlWebpackPlugin({
      title: 'MAS',
      hash: isProduction
    })
  ],
  devServer: {
    stats: {
      assets: true,
      colors: true,
      reasons: true,
      children: false,
      chunks: false,
      modules: false
    }
  }
};

if (!isProduction) {
  config.plugins.push(new DashboardPlugin());
}

module.exports = config;
