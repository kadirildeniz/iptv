module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', {
        jsxImportSource: 'react',
      }]
    ],
    plugins: [
      // 1. WatermelonDB için bu satırı EN ÜSTE ekleyin (Sıralama çok önemli!)
      ['@babel/plugin-proposal-decorators', { 'legacy': true }],
      
      // 2. Reanimated ve diğerleri bunun altında kalmalı
      'react-native-reanimated/plugin',
    ],
  };
};