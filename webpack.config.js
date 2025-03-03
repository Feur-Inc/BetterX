const path = require('path');
const webpack = require('webpack');
const packageJson = require('./package.json');

module.exports = {
    mode: 'production',
    name: 'desktop',
    entry: './src/index.js',
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'dist/desktop/v2'),
        publicPath: 'https://feur-inc.github.io/BetterX/desktop/v2/'
    },
    optimization: {
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
        alias: {
            '@utils': path.resolve(__dirname, 'src/utils'),
            '@api': path.resolve(__dirname, 'src/api'),
        },
        fallback: {
            // Add fallback for directories that might not exist
            './userplugins': false
        }
    },
    stats: {
        warningsFilter: [
            /Can't resolve '.\/userplugins'/,
        ],
    },
    target: 'node',
    plugins: [
        new webpack.DefinePlugin({
            'process.env.BUILD_DATE': JSON.stringify(new Date().toISOString()),
            'process.env.BUILD_TIMESTAMP': JSON.stringify(Date.now()),
            'process.env.BUNDLE_VERSION': JSON.stringify(packageJson.version)
        })
    ]
};