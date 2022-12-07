const path = require('path');
// eslint-disable-next-line import/no-extraneous-dependencies
const webpack = require('webpack');

const WORKER_FILE = './src/workers/sapling.js';
const WORKER_BUNDLE_FILE = 'sapling.bundle.js';

create();

async function create() {
  try {
    console.log(`\nWorker file ${WORKER_FILE}`);
    await createWorkerBundle(WORKER_FILE, WORKER_BUNDLE_FILE);
    console.log(`\nCreated worker bundle ${WORKER_BUNDLE_FILE}`);
  } catch (err) {
    console.error(err);
  }
}

/**
 * Generate a bundle of the worker code using Webpack
 * @param {string} workerFile        For example 'worker.js'
 * @param {string} workerBundleFile  For example 'dist/worker.bundle.js'
 */
function createWorkerBundle(workerFile, workerBundleFile) {
  return new Promise((resolve, reject) => {
    const config = {
      entry: workerFile,
      output: {
        filename: workerBundleFile,
        path: path.resolve(__dirname, 'build/static/js'),
        publicPath: '/static/js/',
      },
      target: 'webworker',
      mode: 'production',
      resolve: {
        fallback: {
          buffer: require.resolve('buffer'),
          crypto: require.resolve('crypto-browserify'),
          path: require.resolve('path-browserify'),
          stream: require.resolve('stream-browserify'),
        },
      },
      plugins: [
        new webpack.ProvidePlugin({
          Buffer: ['buffer', 'Buffer'],
        }),
        new webpack.IgnorePlugin({
          resourceRegExp: /^\.\/wordlists\/(?!english)/,
        }),
        new webpack.IgnorePlugin({
          resourceRegExp: /bip39\/src$/,
        }),
      ],
    };

    webpack(config).run((err, stats) => {
      if (err) {
        console.log(err);
      }

      process.stdout.write(`${stats.toString()}\n`);

      if (stats.hasErrors()) {
        reject(
          new Error(`Webpack errors:\n${stats.toJson().errors.join('\n')}`),
        );
      }

      resolve();
    });
  });
}
