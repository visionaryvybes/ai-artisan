import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class TensorflowErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('TensorFlow.js error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  private getErrorMessage(error: Error): string {
    if (error.message.includes('WEBGL_lose_context')) {
      return 'WebGL context was lost. This can happen if your GPU is busy or if you have too many browser tabs open.';
    }
    if (error.message.includes('out of memory')) {
      return 'Your device ran out of memory. Try closing other tabs or restarting your browser.';
    }
    if (error.message.includes('model.json')) {
      return 'Failed to load the AI model. Please check your internet connection and try again.';
    }
    return 'An unexpected error occurred while processing your image. Please try again.';
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-md bg-red-50 dark:bg-red-900/10 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                Processing Error
              </h3>
              <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                {this.state.error && this.getErrorMessage(this.state.error)}
              </div>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={this.handleRetry}
                  className="inline-flex items-center rounded-md bg-red-50 dark:bg-red-900/10 px-3 py-2 text-sm font-semibold text-red-800 dark:text-red-200 shadow-sm hover:bg-red-100 dark:hover:bg-red-900/20"
                >
                  <ArrowPathIcon className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
} 