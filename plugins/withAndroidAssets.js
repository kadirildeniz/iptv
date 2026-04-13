const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withAndroidAssets = (config, assets) => {
    return withDangerousMod(config, [
        'android',
        (config) => {
            const projectRoot = config.modRequest.projectRoot;
            const resDir = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res');

            assets.forEach(({ src, destDir, destFileName }) => {
                const sourcePath = path.resolve(projectRoot, src);
                const targetDirPath = path.join(resDir, destDir);
                const targetPath = path.join(targetDirPath, destFileName);

                // Hedef klasör yoksa oluştur (örn: drawable)
                if (!fs.existsSync(targetDirPath)) {
                    fs.mkdirSync(targetDirPath, { recursive: true });
                }

                // Dosya varsa kopyala, yoksa uyar
                if (fs.existsSync(sourcePath)) {
                    fs.copyFileSync(sourcePath, targetPath);
                } else {
                    console.error(`\n🚨 [HATA] Banner dosyasi bulunamadi: ${sourcePath}\n`);
                }
            });

            return config;
        },
    ]);
};

module.exports = { withAndroidAssets };