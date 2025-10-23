module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Bu 'plugins' dizisi ve içindeki satır zorunludur
    plugins: [
      'react-native-reanimated/plugin',
    ],
  };
};