const { withMainApplication, withDangerousMod, AndroidConfig } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// 1. KOTLIN KODLARINI BURAYA GÖMÜYORUZ (String Olarak)
// Böylece yerel dosyalara ihtiyaç duymadan sunucuda oluşturulabilirler.

const AUDIO_BOOSTER_MODULE_KT = (packageName) => `package ${packageName}

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import android.media.AudioManager
import android.content.Context

class AudioBoosterModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    private val audioManager: AudioManager = reactContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager

    override fun getName(): String {
        return "AudioBooster"
    }

    @ReactMethod
    fun setVolume(volume: Float, promise: Promise) {
        try {
            val maxVolume = audioManager.getStreamMaxVolume(AudioManager.STREAM_MUSIC)
            val targetVolume = (maxVolume * volume).toInt()
            audioManager.setStreamVolume(AudioManager.STREAM_MUSIC, targetVolume, 0)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("AUDIO_ERROR", e.message)
        }
    }

    @ReactMethod
    fun getVolume(promise: Promise) {
        try {
            val currentVolume = audioManager.getStreamVolume(AudioManager.STREAM_MUSIC)
            val maxVolume = audioManager.getStreamMaxVolume(AudioManager.STREAM_MUSIC)
            val volume = currentVolume.toFloat() / maxVolume.toFloat()
            promise.resolve(volume)
        } catch (e: Exception) {
            promise.reject("AUDIO_ERROR", e.message)
        }
    }
}
`;

const AUDIO_BOOSTER_PACKAGE_KT = (packageName) => `package ${packageName}

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager
import java.util.Collections

class AudioBoosterPackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        val modules = ArrayList<NativeModule>()
        modules.add(AudioBoosterModule(reactContext))
        return modules
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return Collections.emptyList()
    }
}
`;

const withAudioBooster = (config) => {
    // 2. DOSYALARI OLUŞTURMA AŞAMASI
    config = withDangerousMod(config, [
        'android',
        async (config) => {
            const projectRoot = config.modRequest.projectRoot;

            // Paket adını app.json'dan otomatik al (com.lumo.iptv)
            const packageName = AndroidConfig.Package.getPackage(config);
            if (!packageName) {
                throw new Error('Android package name is missing in app.json');
            }

            // Hedef klasör yolunu oluştur: android/app/src/main/java/com/lumo/iptv/
            const packagePath = packageName.replace(/\./g, path.sep);
            const androidSrcDir = path.join(projectRoot, 'android', 'app', 'src', 'main', 'java', packagePath);

            // Klasör yoksa oluştur
            if (!fs.existsSync(androidSrcDir)) {
                fs.mkdirSync(androidSrcDir, { recursive: true });
            }

            // Dosyaları yukarıdaki String'lerden yazdır
            fs.writeFileSync(
                path.join(androidSrcDir, 'AudioBoosterModule.kt'),
                AUDIO_BOOSTER_MODULE_KT(packageName)
            );
            fs.writeFileSync(
                path.join(androidSrcDir, 'AudioBoosterPackage.kt'),
                AUDIO_BOOSTER_PACKAGE_KT(packageName)
            );

            return config;
        },
    ]);

    // 3. MAIN APPLICATION'A KAYIT ETME AŞAMASI
    config = withMainApplication(config, (config) => {
        const packageName = AndroidConfig.Package.getPackage(config);
        const packageImport = `import ${packageName}.AudioBoosterPackage`;
        const packageInstantiation = 'add(AudioBoosterPackage())';

        let src = config.modResults.contents;

        // Import Ekle
        if (!src.includes(packageImport)) {
            const anchor = 'package ';
            const packageDeclarationIndex = src.indexOf(anchor);
            if (packageDeclarationIndex !== -1) {
                const endOfLineIndex = src.indexOf('\n', packageDeclarationIndex);
                src = src.slice(0, endOfLineIndex + 1) + `\n${packageImport}` + src.slice(endOfLineIndex + 1);
            }
        }

        // Package Listesine Ekle
        if (!src.includes('AudioBoosterPackage()')) {
            // Expo'nun standart "PackageList" yapısını bul
            const packageListAnchor = 'PackageList(this).packages.apply {';
            if (src.includes(packageListAnchor)) {
                src = src.replace(
                    packageListAnchor,
                    `${packageListAnchor}\n            ${packageInstantiation}`
                );
            } else {
                console.warn('Could not find PackageList anchor in MainApplication.kt');
            }
        }

        config.modResults.contents = src;
        return config;
    });

    return config;
};

module.exports = withAudioBooster;