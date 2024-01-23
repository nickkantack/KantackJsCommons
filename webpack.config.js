
const path = require('path');

module.exports = {
  mode: 'production',
  entry: './main.js', // Entry point of your application
  output: {
    filename: 'KJSC.js', // Output file name
    path: path.resolve(__dirname, 'dist'), // Output directory
    globalObject: 'this',
    library: {
      name: 'KJSC',
      type: 'umd'
    }
  },
};