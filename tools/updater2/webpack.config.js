const webpack = require('webpack')
const path = require('path')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const HtmlWebpackInlineSourcePlugin = require('html-webpack-inline-source-plugin')

module.exports = ({ claspPush } = {}) => {
  const plugins = [
    new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/), // ignore moment-locales to reduce bundle size
    new CopyWebpackPlugin(['static/_.js']),
    new HtmlWebpackPlugin({
      template: './src/browser.html',
      chunks: ['browser'],
      inlineSource: '.(js|css)$',
    }),
    new HtmlWebpackInlineSourcePlugin(),
  ]

  return {
    entry: {
      server: './src/server.js',
      browser: './src/browser.js',
    },
    output: {
      path: path.join(__dirname, 'build'),
      libraryTarget: 'this',
      filename: '[name].js',
    },
    mode: 'development',
    devtool: 'source-map',
    module: {
      rules: [
        {
          test: /\.js$/,
          include: path.resolve(__dirname, 'src'),
          use: [
            'babel-loader?cacheDirectory=true',
            'eslint-loader?cache=true',
          ],
        },
      ],
    },
    plugins,
  }
}
