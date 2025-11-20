package com.anonymous.iptv

import android.media.audiofx.LoudnessEnhancer
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class AudioBoosterModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private var loudnessEnhancer: LoudnessEnhancer? = null
    private var currentSessionId: Int = -1

    override fun getName(): String {
        return "AudioBoosterModule"
    }

    @ReactMethod
    fun setBoost(sessionId: Int, gainmB: Int) {
        try {
            // Eğer enhancer yoksa veya farklı bir session içinse yeni oluştur
            if (loudnessEnhancer == null || currentSessionId != sessionId) {
                loudnessEnhancer?.release()
                loudnessEnhancer = LoudnessEnhancer(sessionId)
                currentSessionId = sessionId
            }

            loudnessEnhancer?.apply {
                setTargetGain(gainmB)
                enabled = true
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    @ReactMethod
    fun release() {
        try {
            loudnessEnhancer?.release()
            loudnessEnhancer = null
            currentSessionId = -1
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}

