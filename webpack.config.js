const path = require('path')

module.exports = {
  target: 'node',
  entry: './src/parser.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'parser.js',
    library: "mark-to-jsonml",
    libraryTarget: "umd"
  },
  module: {
    rules: [
      {
        test: /\.m?js$/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
            "plugins": [
              ["@babel/plugin-proposal-decorators", { "legacy": true }],
              ["@babel/plugin-proposal-class-properties"],
              ["babel-plugin-transform-remove-console"]
            ]
          }
        }
      }
    ]
  }
}
