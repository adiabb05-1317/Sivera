"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Bug, Home } from 'lucide-react';
import { config, isDev } from '@/lib/config';
import { AppErrorHandler } from '@/lib/error-handler';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorId: string | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    const errorId = `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      hasError: true,
      error,
      errorId,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const appError = AppErrorHandler.createError(error, 'ErrorBoundary');
    
    this.setState({
      errorInfo,
    });

    // Log error in development
    if (isDev) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // Report error in production/staging
    if (config.features.errorReporting) {
      this.reportError(appError, errorInfo);
    }
  }

  private reportError = async (error: any, errorInfo: React.ErrorInfo) => {
    try {
      // In a real app, you'd send this to your error reporting service
      // like Sentry, Bugsnag, or custom endpoint
      console.error('Reporting error:', {
        error,
        errorInfo,
        errorId: this.state.errorId,
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        userId: localStorage.getItem('user_id'),
      });
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  };

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    });
  };

  private handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error!} retry={this.handleRetry} />;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
          <Card className="max-w-lg w-full">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <CardTitle className="text-xl font-semibold text-gray-900">
                Something went wrong
              </CardTitle>
              <CardDescription>
                We encountered an unexpected error. Our team has been notified.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isDev && this.state.error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <div className="flex items-start">
                    <Bug className="w-4 h-4 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-red-800">Debug Info:</p>
                      <p className="text-red-700 font-mono text-xs mt-1">
                        {this.state.error.message}
                      </p>
                      {this.state.errorId && (
                        <p className="text-red-600 text-xs mt-1">
                          Error ID: {this.state.errorId}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <Button 
                  onClick={this.handleRetry}
                  className="flex-1"
                  variant="outline"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
                <Button 
                  onClick={this.handleGoHome}
                  className="flex-1"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Go Home
                </Button>
              </div>

              {!isDev && this.state.errorId && (
                <p className="text-xs text-gray-500 text-center">
                  Reference: {this.state.errorId}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for functional components to handle errors
export const useErrorHandler = () => {
  const handleError = React.useCallback((error: Error, context?: string) => {
    const appError = AppErrorHandler.createError(error, context);
    
    if (isDev) {
      console.error('Error handled:', appError);
    }

    if (config.features.errorReporting) {
      // Report to error tracking service
      console.error('Reporting error:', appError);
    }

    // You can also trigger error boundaries or show toast notifications here
    throw error; // Re-throw to trigger error boundary
  }, []);

  return { handleError };
};