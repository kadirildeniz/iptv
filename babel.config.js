module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', {
        jsxImportSource: 'react',
      }]
    ],
    plugins: [
      'react-native-reanimated/plugin',
    ],
    overrides: [
      {
        exclude: /node_modules/,
        plugins: [
          ['@babel/plugin-proposal-decorators', { 'legacy': true }],
          ['@babel/plugin-transform-class-properties', { 'loose': true }],
        ]
      }
    ]
  };
};