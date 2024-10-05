const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const AdmZip = require('adm-zip');
const { version } = require('./package.json');

class ZipPlugin {
    constructor(options) {
      this.options = options;
    }
  
    apply(compiler) {
      compiler.hooks.afterEmit.tapAsync('ZipPlugin', (compilation, callback) => {
        const zip = new AdmZip();
        const outputPath = path.join(compilation.options.output.path, `../${this.options.filename}`);
        
        zip.addLocalFolder(compilation.options.output.path);
        zip.writeZip(outputPath);
        
        console.log(`Created ${outputPath}`);
        callback();
      });
    }
  }

const commonConfig = {
    mode: 'production',
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
    },
};

module.exports = [
    {
        ...commonConfig,
        name: 'firefox',
        entry: './src/index.js',
        output: {
            filename: 'bundle.js',
            path: path.resolve(__dirname, 'dist/firefox'),
        },
        plugins: [
            new CopyPlugin({
                patterns: [
                    { from: './manifest/firefox.json', to: 'manifest.json' },
                ],
            }),
            new ZipPlugin({
                filename: `betterx-firefox-v${version}.zip`
            })
        ],
    },
    {
        ...commonConfig,
        name: 'chrome',
        entry: './src/index.js',
        output: {
            filename: 'bundle.js',
            path: path.resolve(__dirname, 'dist/chrome'),
        },
        plugins: [
            new CopyPlugin({
                patterns: [
                    { from: './manifest/chrome.json', to: 'manifest.json' },
                ],
            }),
            new ZipPlugin({
                filename: `betterx-chrome-v${version}.zip`
            })
        ],
    },
    {
        ...commonConfig,
        name: 'desktop',
        entry: './src/index.js',
        output: {
            filename: 'bundle.js',
            path: path.resolve(__dirname, 'dist/desktop'),
        },
        target: 'node',
    },
];