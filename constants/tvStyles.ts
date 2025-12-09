// Android TV Focus Stilleri
// Tüm Pressable bileşenlerinde kullanılacak ortak focus stilleri

export const TV_FOCUS_STYLE = {
    borderColor: '#00E5FF',
    borderWidth: 3,
    transform: [{ scale: 1.05 }],
    shadowColor: '#00E5FF',
    shadowOpacity: 0.5,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
    zIndex: 10,
};

export const TV_BUTTON_FOCUS_STYLE = {
    borderColor: '#00E5FF',
    borderWidth: 2,
    transform: [{ scale: 1.05 }],
};

// Base style için transparent border (layout koruması)
export const TV_BASE_BORDER = {
    borderWidth: 3,
    borderColor: 'transparent',
};

export const TV_BUTTON_BASE_BORDER = {
    borderWidth: 2,
    borderColor: 'transparent',
};
