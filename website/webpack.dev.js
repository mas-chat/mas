const { merge } = require('webpack-merge');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const common = require('./webpack.common.js');

module.exports = merge(common, {
  mode: 'development',
  devtool: 'inline-source-map',
  plugins: [
    new HtmlWebpackPlugin({
      template: '!!handlebars-loader!html/index.hbs',
      templateParameters: {
        config: '{ auth: { google: true, yahoo: true } }'
      },
      historyApiFallback: true
    })
  ],
  devServer: {}
});
