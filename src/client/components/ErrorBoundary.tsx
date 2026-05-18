import { Component, type ReactNode, type ErrorInfo } from 'react';

/**
 * X60: top-level React error boundary. Catches unhandled render errors so a
 * single buggy component doesn't blank-screen the entire dashboard. Mods get
 * a recovery affordance + error context instead of staring at a white page.
 *
 * React error boundaries do NOT catch errors in:
 *   - event handlers (use try/catch inside the handler)
 *   - async code / promises
 *   - server-side render
 *   - errors in the boundary component itself
 * Those paths surface via console — see src/client/lib/api.ts for fetch-side
 * error handling.
 */
interface State {
  err: Error | null;
}

interface Props {
  children: ReactNode;
  /** Optional render-prop fallback. Defaults to the built-in friendly UI. */
  fallback?: (err: Error, reset: () => void) => ReactNode;
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { err: null };

  static getDerivedStateFromError(err: Error): State {
    return { err };
  }

  override componentDidCatch(err: Error, info: ErrorInfo) {
    console.error('[cm/error-boundary] uncaught render error:', err, info.componentStack);
  }

  reset = () => this.setState({ err: null });

  override render() {
    if (this.state.err) {
      if (this.props.fallback) return this.props.fallback(this.state.err, this.reset);
      return (
        <div
          role="alert"
          className="min-h-screen flex items-center justify-center bg-canvas text-bone px-6"
        >
          <div className="max-w-md text-center space-y-4">
            <div className="text-2xl font-mono">⚠ Dashboard hit an error</div>
            <p className="text-bone-300 text-sm">
              The dashboard component crashed while rendering. Your moderation engine is unaffected
              — only the view layer broke.
            </p>
            <pre className="text-left text-xs bg-bone-900/30 border border-line/40 rounded p-3 overflow-x-auto">
              {this.state.err.message}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-signal-ok text-canvas rounded font-medium hover:bg-signal-ok/90"
            >
              Reload dashboard
            </button>
            <p className="text-bone-300/60 text-xs">
              If this keeps happening, file an issue at{' '}
              <a
                href="https://github.com/StephenSook/context-mod-devvit/issues"
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                github.com/StephenSook/context-mod-devvit/issues
              </a>
              .
            </p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
