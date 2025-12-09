import React, { Component, ReactNode } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/constants/config';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

/**
 * Error Boundary bileşeni
 * Uygulama çöktüğünde kullanıcıya güzel bir hata ekranı gösterir
 */
class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        // Hata loglama servisi buraya eklenebilir
        console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <View style={styles.container}>
                    <Ionicons name="alert-circle-outline" size={80} color={COLORS.ERROR} />
                    <Text style={styles.title}>Bir Hata Oluştu</Text>
                    <Text style={styles.message}>
                        Uygulama beklenmedik bir hatayla karşılaştı.
                    </Text>
                    {__DEV__ && this.state.error && (
                        <Text style={styles.errorDetail}>
                            {this.state.error.message}
                        </Text>
                    )}
                    <Pressable style={styles.retryButton} onPress={this.handleRetry}>
                        <Ionicons name="refresh" size={20} color="#fff" />
                        <Text style={styles.retryText}>Tekrar Dene</Text>
                    </Pressable>
                </View>
            );
        }

        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.BACKGROUND_DARK,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    title: {
        color: COLORS.TEXT_PRIMARY,
        fontSize: 24,
        fontWeight: 'bold',
        marginTop: 20,
        marginBottom: 12,
    },
    message: {
        color: COLORS.TEXT_SECONDARY,
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 16,
    },
    errorDetail: {
        color: COLORS.TEXT_MUTED,
        fontSize: 12,
        textAlign: 'center',
        marginBottom: 24,
        fontFamily: 'monospace',
        padding: 12,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 8,
        maxWidth: '80%',
    },
    retryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.PRIMARY,
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 12,
        gap: 8,
    },
    retryText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default ErrorBoundary;
