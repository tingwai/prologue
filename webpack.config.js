const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = (env) => {
  const isFirefox = env && env.target === 'firefox';
  const manifestFile = isFirefox ? 'manifest-firefox.json' : 'manifest.json';
  const outputDir = isFirefox ? 'dist-firefox' : 'dist-chrome';
  
  console.log(`Building for: ${isFirefox ? 'Firefox' : 'Chrome'} -> ${outputDir}`);
  
  return {
  entry: {
    content: './src/content.ts',
    background: './src/background.ts',
    options: './src/options.ts',
    popup: './src/popup.ts',
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
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, outputDir),
    clean: true,
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: `src/${manifestFile}`, to: 'manifest.json' },
        { from: 'src/options.html', to: 'options.html' },
        { from: 'src/popup.html', to: 'popup.html' },
        { from: 'src/styles.css', to: 'styles.css' },
      ],
    }),
  ],
  };
};
