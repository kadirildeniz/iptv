const { withAndroidManifest } = require('@expo/config-plugins');

const withAndroidTVFeatures = (config) => {
  return withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults;
    const manifest = androidManifest.manifest;
    const application = manifest.application[0];

    // tools namespace ekleniyor
    if (!manifest.$['xmlns:tools']) {
      manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }

    // uses-features
    if (!manifest['uses-feature']) {
      manifest['uses-feature'] = [];
    }

    const featuresToAdd = [
      {
        '$': {
          'android:name': 'android.hardware.touchscreen',
          'android:required': 'false',
          'tools:replace': 'android:required'
        },
      },
      {
        '$': {
          'android:name': 'android.hardware.faketouch',
          'android:required': 'false',
          'tools:replace': 'android:required'
        },
      },
      {
        '$': {
          'android:name': 'android.software.leanback',
          'android:required': 'false',
          'tools:replace': 'android:required'
        },
      },
    ];

    featuresToAdd.forEach((feature) => {
      manifest['uses-feature'] = manifest['uses-feature'].filter(
        (f) => f.$['android:name'] !== feature.$['android:name']
      );
      manifest['uses-feature'].push(feature);
    });

    // 1. Android TV Banner (Afiş) eklenmesi
    application.$['android:banner'] = '@drawable/tv_banner';

    // 2. Main Activity içindeki hatalı Intent Filter temizliği ve doğru enjeksiyon
    const activities = application.activity || [];
    const mainActivity = activities.find(
      (act) => act.$['android:name'] === '.MainActivity'
    ) || activities[0];

    if (mainActivity) {
      // İçerisinde MAIN action bulunduran hatalı intent filterları (bozuk Leanback vb.) tamamen siliyoruz
      if (mainActivity['intent-filter']) {
        mainActivity['intent-filter'] = mainActivity['intent-filter'].filter(
          (filter) => {
            const hasMainAction = filter.action && filter.action.some(
              (a) => a.$['android:name'] === 'android.intent.action.MAIN'
            );
            return !hasMainAction;
          }
        );
      } else {
        mainActivity['intent-filter'] = [];
      }

      // Uygulamanın TV'de Launcher'da görünmesi için "Temiz" MAIN Intent-Filter'ını ekliyoruz
      mainActivity['intent-filter'].push({
        action: [
          { $: { 'android:name': 'android.intent.action.MAIN' } }
        ],
        category: [
          { $: { 'android:name': 'android.intent.category.LAUNCHER' } },
          { $: { 'android:name': 'android.intent.category.LEANBACK_LAUNCHER' } }
        ]
      });
    }

    return config;
  });
};

module.exports = withAndroidTVFeatures;
