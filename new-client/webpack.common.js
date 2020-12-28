module.exports = {
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /(node_modules)/,
        use: 'babel-loader'
      },
      {
        test: /\.scss$/,
        use: ['style-loader', 'css-loader', 'postcss-loader', 'sass-loader']
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader?modules', 'postcss-loader', 'sass-loader']
      },
      {
        test: /\.(ttf|eot|svg|woff|woff2)$/,
        use: 'url-loader?limit=10000'
      },
      {
        test: /\.(png|jpg)$/,
        use: 'url-loader?limit=8192'
      }
    ]
  }
};
