import React from 'react';
import { v } from '../theme/tokens';

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Catches unhandled render errors inside the editor tree and displays
 * a recoverable error banner instead of a blank screen.
 */
export class EditorErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  handleDismiss = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            background: v('--elucim-editor-bg'),
            color: v('--elucim-editor-fg'),
            fontFamily: 'system-ui, -apple-system, sans-serif',
            padding: 32,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 36, marginBottom: 16 }}>⚠️</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
            Something went wrong
          </div>
          <div style={{ fontSize: 13, color: v('--elucim-editor-text-muted'), marginBottom: 16, maxWidth: 400 }}>
            {this.state.error.message}
          </div>
          <button
            onClick={this.handleDismiss}
            style={{
              padding: '8px 20px',
              borderRadius: 6,
              border: 'none',
              background: v('--elucim-editor-accent'),
              color: '#fff',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
