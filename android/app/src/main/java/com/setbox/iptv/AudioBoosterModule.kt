package com.setbox.iptv

import android.media.audiofx.LoudnessEnhancer
import android.util.Log
import android.os.Build
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.WritableNativeMap

class AudioBoosterModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    
    private var loudnessEnhancer: LoudnessEnhancer? = null
    private val TAG = "AudioBoosterModule"
    
    // 🔒 GÜVENLİK: Maksimum izin verilen boost (+15dB = 1500mB)
    // +20dB hoparlörlere zarar verebilir veya distorsiyon oluşturabilir
    private val MAX_SAFE_GAIN_MB = 1500
    
    // Modül destekleniyor mu?
    private var isSupported = true

    override fun getName(): String {
        return "AudioBoosterModule"
    }

    /**
     * Cihaz uyumluluğunu kontrol et
     */
    @ReactMethod
    fun checkSupport(promise: Promise) {
        try {
            val result = WritableNativeMap()
            result.putBoolean("supported", Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT)
            result.putInt("apiLevel", Build.VERSION.SDK_INT)
            result.putInt("maxSafeGain", MAX_SAFE_GAIN_MB)
            result.putString("device", Build.MODEL)
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("CHECK_SUPPORT_ERROR", e.message, e)
        }
    }

    /**
     * Ses güçlendirme uygula
     * @param audioSessionId - Video player'ın audio session ID'si (0 = global)
     * @param gainMB - Kazanç milidesibel cinsinden (1000 = +10dB)
     */
    @ReactMethod
    fun setBoost(audioSessionId: Int, gainMB: Int, promise: Promise) {
        try {
            // 🔒 GÜVENLİK: Gain değerini sınırla
            val safeGain = gainMB.coerceIn(0, MAX_SAFE_GAIN_MB)
            
            if (gainMB > MAX_SAFE_GAIN_MB) {
                Log.w(TAG, "⚠️ Gain limiti aşıldı! İstenen: ${gainMB}mB, Uygulanan: ${safeGain}mB")
            }
            
            Log.d(TAG, "🔊 setBoost: sessionId=$audioSessionId, gain=${safeGain}mB")
            
            // Eski enhancer varsa kapat
            try {
                loudnessEnhancer?.release()
            } catch (e: Exception) {
                Log.w(TAG, "Eski enhancer release hatası (görmezden geliniyor): ${e.message}")
            }
            loudnessEnhancer = null
            
            // Sıfır gain = boost kapalı
            if (safeGain <= 0) {
                Log.d(TAG, "✅ Boost kapatıldı")
                promise.resolve(true)
                return
            }
            
            // 🔒 GÜVENLİK: Session ID kontrolü
            val sessionToUse = if (audioSessionId > 0) audioSessionId else 0
            
            try {
                loudnessEnhancer = LoudnessEnhancer(sessionToUse).apply {
                    setTargetGain(safeGain)
                    enabled = true
                }
                isSupported = true
                Log.d(TAG, "✅ Boost aktif: +${safeGain/100}dB")
                promise.resolve(true)
            } catch (e: IllegalArgumentException) {
                // Session ID geçersiz - global session ile dene
                Log.w(TAG, "Session geçersiz, global session deneniyor...")
                try {
                    loudnessEnhancer = LoudnessEnhancer(0).apply {
                        setTargetGain(safeGain)
                        enabled = true
                    }
                    Log.d(TAG, "✅ Global boost aktif: +${safeGain/100}dB")
                    promise.resolve(true)
                } catch (e2: Exception) {
                    isSupported = false
                    Log.e(TAG, "❌ LoudnessEnhancer bu cihazda desteklenmiyor")
                    promise.resolve(false) // Hata fırlatma, sessizce false dön
                }
            }
            
        } catch (e: Exception) {
            Log.e(TAG, "❌ Boost hatası: ${e.message}")
            isSupported = false
            promise.resolve(false) // Uygulama çökmesin
        }
    }

    /**
     * LoudnessEnhancer'ı serbest bırak
     */
    @ReactMethod
    fun release(promise: Promise) {
        try {
            loudnessEnhancer?.release()
            loudnessEnhancer = null
            Log.d(TAG, "✅ LoudnessEnhancer serbest bırakıldı")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.w(TAG, "Release hatası (görmezden geliniyor): ${e.message}")
            loudnessEnhancer = null
            promise.resolve(true) // Yine de başarılı say
        }
    }

    /**
     * Mevcut boost durumunu kontrol et
     */
    @ReactMethod
    fun isEnabled(promise: Promise) {
        val enabled = loudnessEnhancer?.enabled ?: false
        promise.resolve(enabled)
    }
    
    /**
     * Modülün desteklenip desteklenmediğini döndür
     */
    @ReactMethod
    fun isSupported(promise: Promise) {
        promise.resolve(isSupported)
    }
}
