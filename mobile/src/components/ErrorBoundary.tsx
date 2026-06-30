import React, { Component, type ReactNode } from 'react';
import { View, Text, Pressable } from 'react-native';
import { clientLogger } from '../services/clientLogger';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Root error boundary. Catches render-time exceptions so the app shows a fallback
 * instead of crashing to a blank screen, and reports the error (with component
 * stack) to the backend via clientLogger → Loki.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: { componentStack?: string }) {
    clientLogger.error(error.message || 'React render error', {
      context: 'ErrorBoundary',
      stack: `${error.stack ?? ''}\nComponent stack:${info.componentStack ?? ''}`,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 8 }}>Coś poszło nie tak</Text>
          <Text style={{ textAlign: 'center', marginBottom: 16 }}>
            Wystąpił nieoczekiwany błąd. Spróbuj ponownie.
          </Text>
          <Pressable
            onPress={() => this.setState({ hasError: false })}
            style={{ backgroundColor: '#3b82f6', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 }}
          >
            <Text style={{ color: '#ffffff', fontWeight: '600' }}>Spróbuj ponownie</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}
