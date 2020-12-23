const path = require('path');
const { merge } = require('webpack-merge');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const { WebpackManifestPlugin } = require('webpack-manifest-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const common = require('./webpack.common.js');

module.exports = merge(common, {
  mode: 'production',
  output: {
    filename: '[name]-[contenthash].bundle.js',
    publicPath: '/website-assets/',
    path: path.resolve(__dirname, '../website-dist/website-assets')
  },
  plugins: [
    new CleanWebpackPlugin(),
    new WebpackManifestPlugin(),
    new HtmlWebpackPlugin({
      inject: 'body',
      filename: '../index.hbs',
      template: 'html/index.hbs'
    })
  ]
});
