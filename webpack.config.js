const path = require('path');

module.exports = {
    mode: 'production',
    name: 'desktop',
    entry: './src/index.js',
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'dist/desktop'),
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