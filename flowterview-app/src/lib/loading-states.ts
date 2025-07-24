import { useState } from 'react';

export interface LoadingState {
  isLoading: boolean;
  loadingMessage?: string;
  progress?: number; // 0-100 for progress bars
  operation?: string; // describes what operation is being performed
}

export interface AsyncOperationState extends LoadingState {
  error: string | null;
  lastSuccessfulOperation?: Date;
  operationCount: number; // Track number of operations for analytics
}

export class LoadingStateManager {
  static createInitialState(): AsyncOperationState {
    return {
      isLoading: false,
      error: null,
      operationCount: 0,
    };
  }

  static startOperation(
    state: AsyncOperationState,
    operation?: string,
    loadingMessage?: string
  ): AsyncOperationState {
    return {
      ...state,
      isLoading: true,
      error: null,
      operation,
      loadingMessage,
      progress: undefined,
    };
  }

  static updateProgress(
    state: AsyncOperationState,
    progress: number,
    loadingMessage?: string
  ): AsyncOperationState {
    return {
      ...state,
      progress: Math.min(100, Math.max(0, progress)),
      loadingMessage: loadingMessage || state.loadingMessage,
    };
  }

  static completeOperation(
    state: AsyncOperationState
  ): AsyncOperationState {
    return {
      ...state,
      isLoading: false,
      error: null,
      operation: undefined,
      loadingMessage: undefined,
      progress: undefined,
      lastSuccessfulOperation: new Date(),
      operationCount: state.operationCount + 1,
    };
  }

  static failOperation(
    state: AsyncOperationState,
    error: string
  ): AsyncOperationState {
    return {
      ...state,
      isLoading: false,
      error,
      operation: undefined,
      loadingMessage: undefined,
      progress: undefined,
    };
  }

  static clearError(state: AsyncOperationState): AsyncOperationState {
    return {
      ...state,
      error: null,
    };
  }
}

// Hook for component-level loading states
export const useAsyncOperation = (initialState?: Partial<AsyncOperationState>) => {
  const [state, setState] = useState<AsyncOperationState>({
    ...LoadingStateManager.createInitialState(),
    ...initialState,
  });

  const startOperation = (operation?: string, loadingMessage?: string) => {
    setState(prev => LoadingStateManager.startOperation(prev, operation, loadingMessage));
  };

  const updateProgress = (progress: number, loadingMessage?: string) => {
    setState(prev => LoadingStateManager.updateProgress(prev, progress, loadingMessage));
  };

  const completeOperation = () => {
    setState(prev => LoadingStateManager.completeOperation(prev));
  };

  const failOperation = (error: string) => {
    setState(prev => LoadingStateManager.failOperation(prev, error));
  };

  const clearError = () => {
    setState(prev => LoadingStateManager.clearError(prev));
  };

  return {
    ...state,
    startOperation,
    updateProgress,
    completeOperation,
    failOperation,
    clearError,
  };
};