import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  error: Error | null;
}

/** Catches render-time errors so a single broken view never blanks the whole app.
 *  Saved builds live in localStorage and are untouched by a render crash. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    if (this.props.fallback) return this.props.fallback(error, this.reset);

    return (
      <div
        role="alert"
        className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center"
      >
        <h1 className="text-2xl font-semibold">Something went wrong</h1>
        <p className="max-w-lg text-sm text-muted-foreground">
          The app hit an unexpected error. Your saved builds in local storage are
          untouched. Try reloading, or reset to dismiss and continue.
        </p>
        <pre className="max-w-2xl overflow-auto rounded border border-border bg-muted p-3 text-left text-xs">
          {error.message}
        </pre>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={this.reset}
            className="rounded border border-border px-4 py-2 text-sm hover:bg-muted"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
