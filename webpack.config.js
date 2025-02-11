const path = require('path');

module.exports = {
    mode: 'production',
    name: 'desktop',
    entry: './src/index.js',
    output: {
        filename: '[name].bundle.js',
        chunkFilename: '[name].chunk.js',
        path: path.resolve(__dirname, 'dist/desktop/v2'),
        publicPath: 'https://feur-inc.github.io/BetterX/desktop/v2/'
    },
    optimization: {
        splitChunks: {
            chunks: 'all',
            minSize: 20000,
            minChunks: 1,
        }
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
};