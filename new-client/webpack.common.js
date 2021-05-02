/* eslint  @typescript-eslint/no-var-requires: off */

const CopyPlugin = require('copy-webpack-plugin');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');

module.exports = {
  entry: './src/index.tsx',
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.json']
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: 'ts-loader',
        exclude: /node_modules/,
        options: {
          transpileOnly: true
        }
      },
      {
        test: /\.js$/,
        use: 'source-map-loader',
        enforce: 'pre'
      }
    ]
  },
  plugins: [
    new CopyPlugin({
      patterns: [{ from: '../client/public/assets/sounds/staple_gun.mp3', to: 'staple_gun.mp3' }]
    }),
    new ForkTsCheckerWebpackPlugin()
  ]
};
