/* eslint  @typescript-eslint/no-var-requires: off */

const { merge } = require('webpack-merge');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const common = require('./webpack.common.js');

module.exports = merge(common, {
  mode: 'development',
  devtool: 'eval-cheap-source-map',
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
    overlay: true,
    dev: {
      index: '',
      publicPath: '/app'
    },
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true
      },
      '/': {
        target: 'http://localhost:3000',
        bypass: req => {
          if (req.url.startsWith('/app')) {
            return '/app/index.html';
          }

          return null;
        }
      }
    }
  }
});
