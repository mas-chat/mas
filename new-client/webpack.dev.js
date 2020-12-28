const { merge } = require('webpack-merge');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const common = require('./webpack.common.js');
console.timeLog('1')
module.exports = merge(common, {
  mode: 'development',
  devtool: 'inline-source-map',
  plugins: [
    new HtmlWebpackPlugin({
      template: '!!handlebars-loader!html/index.html',
      templateParameters: {
        jsConfig: '{ auth: { google: true, yahoo: true } }'
      },
      historyApiFallback: true
    })
  ],
  devServer: {}
});
