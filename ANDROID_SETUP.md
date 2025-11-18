# Android Emülatör Kurulumu (Windows)

## 1. Android Studio Kurulumu

1. **Android Studio İndir:**
   - https://developer.android.com/studio
   - İndir ve kur

2. **Android Studio'yu Aç:**
   - İlk açılışta SDK kurulumunu tamamla
   - Android SDK, Android SDK Platform, Android Virtual Device (AVD) kur

## 2. Android Emülatör Oluşturma

1. **Android Studio'da:**
   - Tools → Device Manager
   - "Create Device" butonuna tıkla
   - Bir cihaz seç (örn: Pixel 5)
   - "Next" → Sistem görüntüsü seç (örn: Android 13 - API 33)
   - "Download" (eğer yoksa)
   - "Next" → "Finish"

2. **Emülatörü Başlat:**
   - Device Manager'da oluşturduğun emülatörün yanındaki ▶️ butonuna tıkla
   - Emülatör açılana kadar bekle (ilk açılış biraz uzun sürebilir)

## 3. Uygulamayı Çalıştırma

### Yöntem 1: Expo CLI ile (Önerilen)
```bash
cd iptv
npm start
# Terminal'de 'a' tuşuna bas (Android için)
```

### Yöntem 2: Expo Go ile
1. Emülatör açıkken Expo başlat
2. QR kodu emülatör içinde tarayın
3. Veya Expo Go'yu emülatör içinde açıp manuel olarak bağlan

### Yöntem 3: Development Build
```bash
cd iptv
npm run android
# Bu komut APK oluşturup emülatöre yükler (daha uzun sürer)
```

## 4. Performans İpuçları

- **RAM:** En az 8GB RAM önerilir (16GB ideal)
- **CPU:** Intel VT-x veya AMD-V etkin olmalı
- **Emülatör Ayarları:**
  - Graphics: Hardware - GLES 2.0
  - RAM: 2048 MB (veya daha fazla)
  - VM heap: 512 MB

## 5. Sorun Giderme

### Emülatör açılmıyor:
- BIOS'ta Virtualization Technology (VT-x/AMD-V) etkin olmalı
- Hyper-V'yi kapat (Windows Features'tan)

### Uygulama yüklenmiyor:
- ADB'nin çalıştığından emin ol: `adb devices`
- Emülatörün tamamen açıldığından emin ol

### Yavaş çalışıyor:
- Emülatör RAM'ini artır
- Graphics'i Hardware'a çevir
- Daha hafif bir sistem görüntüsü kullan

