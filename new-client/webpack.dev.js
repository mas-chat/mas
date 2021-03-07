/* eslint  @typescript-eslint/no-var-requires: off */

const { merge } = require('webpack-merge');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const common = require('./webpack.common.js');

module.exports = merge(common, {
  mode: 'development',
  devtool: 'inline-source-map',
  output: {
    publicPath: '/app/'
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: '!!handlebars-loader!html/index.html',
      templateParameters: {
        jsConfig: '{ auth: { google: true, yahoo: true } }'
      },
      historyApiFallback: true
    })
  ],
  devServer: {
    host: 'localhost',
    open: true,
    openPage: 'app',
    historyApiFallback: {
      index: '/app',
      verbose: true
    },
    overlay: true,
    dev: {
      publicPath: '/app'
    },
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3200',
        ws: true
      },
      '^/(auth|login|api|register|forgot-password|reset-password|confirm-email|files|about|home|tos|pricing|support|website-assets)': {
        target: 'http://localhost:3200'
      }
    }
  }
});
