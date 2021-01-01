/* eslint  @typescript-eslint/no-var-requires: off */

const path = require('path');
const webpack = require('webpack');
const { merge } = require('webpack-merge');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const common = require('./webpack.common.js');

module.exports = merge(common, {
  mode: 'production',
  output: {
    filename: '[name]-[contenthash].bundle.js',
    publicPath: '/client-assets/',
    path: path.resolve(__dirname, 'dist/client-assets')
  },
  plugins: [
    new webpack.ProgressPlugin(),
    new CleanWebpackPlugin(),
    new HtmlWebpackPlugin({
      inject: 'body',
      filename: '../index.html',
      template: 'html/index.html',
      minify: false // It's small in any case. This preservers the revision comment
    })
  ]
});
