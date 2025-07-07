const webpack = require('webpack');

module.exports = {
  webpack: {
    configure: {
      resolve: {
        fallback: {
          fs: false,
          path: require.resolve('path-browserify'),
          crypto: require.resolve('crypto-browserify'),
          stream: require.resolve('stream-browserify'),
          vm: require.resolve('vm-browserify'),
          util: require.resolve('util/'),
          url: require.resolve('url/'),
          querystring: require.resolve('querystring-es3'),
          http: false,
          https: false,
          os: require.resolve('os-browserify/browser'),
          assert: require.resolve('assert/'),
          constants: require.resolve('constants-browserify'),
        },
      },
    },
    plugins: {
      add: [
        new webpack.ProvidePlugin({
          process: 'process/browser',
          Buffer: ['buffer', 'Buffer'],
        }),
      ],
    },
  },
}; 