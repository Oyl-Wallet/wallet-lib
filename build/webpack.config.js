const path = require('path');

module.exports = {
  target: 'node',
  mode: 'production',
  entry: './run-s.js',
  output: {
    filename: 'run-s.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true
  },
  optimization: {
    minimize: true
  },
  externals: [
    /^node:.*/,  // Exclude node: protocol imports
    /^@nodejs\/.*/  // Exclude @nodejs scoped modules
  ],
  node: {
    __dirname: false,
    __filename: false
  }
};
