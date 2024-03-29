// eslint-disable-next-line import/no-extraneous-dependencies
const webpack = require('webpack');

module.exports = {
  webpack: {
    plugins: {
      add: [
        new webpack.ProvidePlugin({
          Buffer: ['buffer', 'Buffer'],
        }),
        new webpack.IgnorePlugin({
          checkResource(resource) {
            return /.*\/wordlists\/(?!english).*\.json/.test(resource);
          },
        }),
        new webpack.IgnorePlugin({
          resourceRegExp: /bip39\/src$/,
        }),
      ],
    },
    configure: (webpackConfig) => {
      webpackConfig.resolve = {
        ...webpackConfig?.resolve,
        fallback: {
          ...webpackConfig?.resolve?.fallback,
          buffer: require.resolve('buffer'),
          crypto: require.resolve('crypto-browserify'),
          path: require.resolve('path-browserify'),
          stream: require.resolve('stream-browserify'),
          fs: false,
        },
      };

      return webpackConfig;
    },
  },
};
