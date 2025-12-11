import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TextInput,
    FlatList,
    Image,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Dimensions,
    Animated,
    Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { aiService, authService } from '@/services';
import { fonts } from '@/theme/fonts';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const AiAssistantModal = () => {
    const router = useRouter();
    const [visible, setVisible] = useState(false);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(false);
    const [messages, setMessages] = useState<any[]>([
        {
            id: 'welcome',
            type: 'ai',
            text: 'Merhaba! Ben senin film ve dizi asistanınım. Bugün ne izlemek istersin? (Örn: "90lar aksiyon", "Gülmek istiyorum")',
        },
    ]);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [fabFocused, setFabFocused] = useState(false);
    const [inputFocused, setInputFocused] = useState(false);
    const [sendFocused, setSendFocused] = useState(false);
    const isTV = Platform.isTV;
    const inputRef = useRef<any>(null);

    const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

    useEffect(() => {
        const unsubscribe = authService.subscribe((authenticated) => {
            setIsLoggedIn(authenticated);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (visible) {
            Animated.spring(slideAnim, {
                toValue: 0,
                useNativeDriver: true,
                damping: 20,
            }).start();
        } else {
            Animated.timing(slideAnim, {
                toValue: SCREEN_HEIGHT,
                duration: 300,
                useNativeDriver: true,
            }).start();
        }
    }, [visible]);

    const handleSend = async () => {
        if (!inputText.trim()) return;

        const userMessage = {
            id: Date.now().toString(),
            type: 'user',
            text: inputText,
        };

        setMessages((prev) => [...prev, userMessage]);
        setInputText('');
        setLoading(true);

        try {
            const response = await aiService.getRecommendations(userMessage.text);

            const aiMessage = {
                id: (Date.now() + 1).toString(),
                type: 'ai',
                text: response.message,
                movies: response.movies,
            };

            setMessages((prev) => [...prev, aiMessage]);

        } catch (error) {
            const errorMessage = {
                id: (Date.now() + 1).toString(),
                type: 'ai',
                text: 'Üzgünüm, bir hata oluştu. Lütfen tekrar dene.',
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setLoading(false);
        }
    };

    const renderMessage = ({ item }: { item: any }) => (
        <View style={{ marginBottom: 16 }}>
            <View
                style={[
                    styles.messageBubble,
                    item.type === 'user' ? styles.userBubble : styles.aiBubble,
                ]}
            >
                <Text style={[styles.messageText, item.type === 'user' ? styles.userText : styles.aiText]}>
                    {item.text}
                </Text>
            </View>

            {item.movies && item.movies.length > 0 && (
                <View style={styles.suggestionsContainer}>
                    <Text style={styles.suggestionsTitle}>Önerilen Filmler</Text>
                    <FlatList
                        data={item.movies}
                        renderItem={renderMovieCard}
                        keyExtractor={(item) => item.id.toString()}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.suggestionsList}
                    />
                </View>
            )}
        </View>
    );

    const renderMovieCard = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={styles.movieCard}
            onPress={() => {
                setVisible(false);
                if (item.itemType === 'series') {
                    router.push({
                        pathname: '/series/[id]',
                        params: { id: item.id.toString() }
                    });
                } else {
                    router.push({
                        pathname: '/movies/[id]',
                        params: { id: item.id.toString() }
                    });
                }
            }}
        >
            <Image
                source={{ uri: item.poster || 'https://via.placeholder.com/150' }}
                style={styles.moviePoster}
                resizeMode="cover"
            />

            <View style={{
                position: 'absolute',
                top: 8,
                right: 8,
                backgroundColor: item.itemType === 'series' ? '#f97316' : '#3b82f6',
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: 4,
            }}>
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>
                    {item.itemType === 'series' ? 'DİZİ' : 'FİLM'}
                </Text>
            </View>

            <View style={styles.movieInfo}>
                <Text style={styles.movieTitle} numberOfLines={2}>{item.title}</Text>
                {item.rating && (
                    <View style={styles.ratingContainer}>
                        <Ionicons name="star" size={12} color="#facc15" />
                        <Text style={styles.ratingText}>{item.rating}</Text>
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );

    return (
        <>
            {isLoggedIn && (
                <Pressable
                    style={[
                        styles.fab,
                        isTV && fabFocused && styles.fabFocused
                    ]}
                    onPress={() => setVisible(true)}
                    focusable={isTV}
                    isTVSelectable={isTV}
                    onFocus={isTV ? () => setFabFocused(true) : undefined}
                    onBlur={isTV ? () => setFabFocused(false) : undefined}
                >
                    <Ionicons name="sparkles" size={24} color="#fff" />
                    <Text style={styles.fabText}>Film & Dizi Bul</Text>
                </Pressable>
            )}

            <Modal
                visible={visible}
                transparent
                animationType="none"
                onRequestClose={() => setVisible(false)}
            >
                <View style={styles.overlay}>
                    <TouchableOpacity
                        style={styles.backdrop}
                        onPress={() => setVisible(false)}
                    />

                    <Animated.View
                        style={[
                            styles.modalContainer,
                            { transform: [{ translateY: slideAnim }] },
                        ]}
                    >
                        <View style={styles.header}>
                            <View style={styles.headerTitleContainer}>
                                <Ionicons name="sparkles" size={20} color="#3b82f6" />
                                <Text style={styles.headerTitle}>Film & Dizi Asistanı</Text>
                            </View>
                            <TouchableOpacity onPress={() => setVisible(false)}>
                                <Ionicons name="close" size={24} color="#64748b" />
                            </TouchableOpacity>
                        </View>

                        <FlatList
                            style={{ flex: 1 }}
                            data={messages}
                            renderItem={renderMessage}
                            keyExtractor={(item) => item.id}
                            contentContainerStyle={styles.messagesList}
                            showsVerticalScrollIndicator={false}
                        />

                        {loading && (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="small" color="#3b82f6" />
                                <Text style={styles.loadingText}>Düşünüyor...</Text>
                            </View>
                        )}

                        <KeyboardAvoidingView
                            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
                            style={{ width: '100%' }}
                        >
                            <View style={[styles.inputContainer, { paddingBottom: Platform.OS === 'ios' ? 40 : 20 }]}>
                                <Pressable
                                    style={[styles.inputWrapper, isTV && inputFocused && styles.inputWrapperFocused]}
                                    onPress={() => inputRef.current?.focus()}
                                    focusable={isTV}
                                    isTVSelectable={isTV}
                                    hasTVPreferredFocus={isTV && visible}
                                    onFocus={isTV ? () => {
                                        setInputFocused(true);
                                        inputRef.current?.focus();
                                    } : undefined}
                                    onBlur={isTV ? () => setInputFocused(false) : undefined}
                                >
                                    <TextInput
                                        ref={inputRef}
                                        style={styles.input}
                                        placeholder="Ne izlemek istersin?"
                                        placeholderTextColor="#94a3b8"
                                        value={inputText}
                                        onChangeText={setInputText}
                                        onSubmitEditing={handleSend}
                                        showSoftInputOnFocus={true}
                                        autoCapitalize="none"
                                        blurOnSubmit={false}
                                    />
                                </Pressable>
                                <Pressable
                                    style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled, isTV && sendFocused && styles.sendButtonFocused]}
                                    onPress={handleSend}
                                    disabled={!inputText.trim() || loading}
                                    focusable={isTV}
                                    isTVSelectable={isTV}
                                    onFocus={isTV ? () => setSendFocused(true) : undefined}
                                    onBlur={isTV ? () => setSendFocused(false) : undefined}
                                >
                                    <Ionicons name="send" size={20} color="#fff" />
                                </Pressable>
                            </View>
                        </KeyboardAvoidingView>
                    </Animated.View>
                </View>
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#3b82f6',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 30,
        shadowColor: '#3b82f6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
        zIndex: 999,
    },
    fabText: {
        color: '#fff',
        fontWeight: '600',
        marginLeft: 8,
        fontSize: 14,
    },
    fabFocused: {
        borderWidth: 3,
        borderColor: '#14b8a6',
        transform: [{ scale: 1.05 }],
    },
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContainer: {
        backgroundColor: '#0f172a',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        height: '80%',
        width: '100%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 10,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(148, 163, 184, 0.1)',
    },
    headerTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#f8fafc',
        fontFamily: fonts.bold,
    },
    messagesList: {
        padding: 20,
        gap: 16,
    },
    messageBubble: {
        maxWidth: '80%',
        padding: 12,
        borderRadius: 16,
    },
    userBubble: {
        alignSelf: 'flex-end',
        backgroundColor: '#3b82f6',
        borderBottomRightRadius: 4,
    },
    aiBubble: {
        alignSelf: 'flex-start',
        backgroundColor: '#1e293b',
        borderBottomLeftRadius: 4,
    },
    messageText: {
        fontSize: 14,
        lineHeight: 20,
        fontFamily: fonts.regular,
    },
    userText: {
        color: '#fff',
    },
    aiText: {
        color: '#e2e8f0',
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        gap: 8,
    },
    loadingText: {
        color: '#94a3b8',
        fontSize: 13,
    },
    suggestionsContainer: {
        paddingVertical: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(148, 163, 184, 0.1)',
    },
    suggestionsTitle: {
        color: '#94a3b8',
        fontSize: 13,
        fontWeight: '600',
        marginLeft: 20,
        marginBottom: 12,
        fontFamily: fonts.medium,
    },
    suggestionsList: {
        paddingHorizontal: 20,
        gap: 12,
    },
    movieCard: {
        width: 120,
        backgroundColor: '#1e293b',
        borderRadius: 12,
        overflow: 'hidden',
    },
    moviePoster: {
        width: '100%',
        height: 160,
        backgroundColor: '#0f172a',
    },
    movieInfo: {
        padding: 8,
    },
    movieTitle: {
        color: '#f8fafc',
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 4,
        fontFamily: fonts.medium,
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    ratingText: {
        color: '#94a3b8',
        fontSize: 11,
    },
    inputContainer: {
        flexDirection: 'row',
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(148, 163, 184, 0.1)',
        backgroundColor: '#0f172a',
        gap: 12,
    },
    input: {
        flex: 1,
        backgroundColor: '#1e293b',
        borderRadius: 24,
        paddingHorizontal: 20,
        paddingVertical: 12,
        color: '#fff',
        fontSize: 14,
        fontFamily: fonts.regular,
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#3b82f6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButtonDisabled: {
        backgroundColor: '#1e293b',
        opacity: 0.5,
    },
    inputWrapper: {
        flex: 1,
        borderRadius: 24,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    inputWrapperFocused: {
        borderColor: '#14b8a6',
        transform: [{ scale: 1.02 }],
    },
    sendButtonFocused: {
        borderColor: '#14b8a6',
        borderWidth: 2,
        transform: [{ scale: 1.1 }],
    },
});

export default AiAssistantModal;
