const { withAndroidManifest } = require('@expo/config-plugins');
const { withAndroidAssets } = require('./withAndroidAssets');
const path = require('path');

/**
 * Android TV desteği için gereken tüm manifest ve asset işlemlerini yönetir.
 * @param {object} config
 * @param {{ tvBanner: string }} options
 */
const withAndroidTVFeatures = (config, options = {}) => {
  const { tvBanner } = options;

  if (!tvBanner) {
    throw new Error('[withAndroidTVFeatures] "tvBanner" seçeneği zorunludur. app.json içinde belirtin.');
  }

  const bannerFileName = path.basename(tvBanner, path.extname(tvBanner)); // → "tv_banner"

  // 1. Asset'i drawable'a kopyala
  config = withAndroidAssets(config, [
    {
      src: tvBanner,
      destDir: 'drawable',
      destFileName: `${bannerFileName}.png`,
    },
  ]);

  // 2. Manifest düzenlemelerini uygula
  config = withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    const application = manifest.application[0];

    // Tools namespace
    manifest.$['xmlns:tools'] ??= 'http://schemas.android.com/tools';

    // TV için zorunlu feature tanımları
    manifest['uses-feature'] ??= [];

    const tvFeatures = [
      'android.hardware.touchscreen',
      'android.hardware.faketouch',
      'android.software.leanback',
    ];

    tvFeatures.forEach((featureName) => {
      manifest['uses-feature'] = manifest['uses-feature'].filter(
        (f) => f.$['android:name'] !== featureName
      );
      manifest['uses-feature'].push({
        $: {
          'android:name': featureName,
          'android:required': 'false',
          'tools:replace': 'android:required',
        },
      });
    });

    // Banner referansı
    application.$['android:banner'] = `@drawable/${bannerFileName}`;

    // MainActivity intent-filter: hem mobile hem TV launcher
    const activities = application.activity ?? [];
    const mainActivity =
      activities.find((a) => a.$['android:name'] === '.MainActivity') ?? activities[0];

    if (!mainActivity) {
      throw new Error('[withAndroidTV] MainActivity bulunamadı.');
    }

    // Mevcut MAIN intent'leri temizle
    mainActivity['intent-filter'] = (mainActivity['intent-filter'] ?? []).filter((filter) => {
      const hasMain = filter.action?.some(
        (a) => a.$['android:name'] === 'android.intent.action.MAIN'
      );
      return !hasMain;
    });

    // Birleşik launcher intent ekle (mobile + TV)
    mainActivity['intent-filter'].push({
      action: [{ $: { 'android:name': 'android.intent.action.MAIN' } }],
      category: [
        { $: { 'android:name': 'android.intent.category.LAUNCHER' } },
        { $: { 'android:name': 'android.intent.category.LEANBACK_LAUNCHER' } },
      ],
    });

    return config;
  });

  return config;
};

module.exports = withAndroidTVFeatures;