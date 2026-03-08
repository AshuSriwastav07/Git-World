// SceneErrorBoundary — Catches R3F child errors so one bad component doesn't kill the whole city
'use client';

import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
}

export class SceneErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.warn(`[SceneErrorBoundary:${this.props.name ?? 'unknown'}]`, error.message);
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}
