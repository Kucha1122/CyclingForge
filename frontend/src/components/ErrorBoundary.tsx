import { Component, type ErrorInfo, type ReactNode } from 'react';
import { clientLogger } from '../services/clientLogger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Top-level error boundary. Catches render-time exceptions so the app shows a
 * fallback instead of a blank screen, and reports the error (with component stack)
 * to the backend via clientLogger → Loki.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    clientLogger.error(error.message || 'React render error', {
      context: 'ErrorBoundary',
      stack: `${error.stack ?? ''}\nComponent stack:${info.componentStack ?? ''}`,
    });
  }

  handleReload = () => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div style={{ padding: 24, textAlign: 'center' }}>
          <h1>Coś poszło nie tak</h1>
          <p>Wystąpił nieoczekiwany błąd. Spróbuj odświeżyć stronę.</p>
          <button onClick={this.handleReload} style={{ marginTop: 12, padding: '8px 16px' }}>
            Odśwież
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
