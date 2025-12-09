package com.lumo.iptv

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
