import { Component, ErrorInfo, ReactNode } from 'react';
import { Button, Result, Typography } from 'antd';
import { resolveElectronAPI } from '@renderer/api/electron';

const { Paragraph, Text } = Typography;

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage?: string;
  errorStack?: string;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message,
      errorStack: error.stack,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    try {
      const api = resolveElectronAPI();
      api.reportError({
        type: 'react-render-error',
        message: error.message,
        stack: error.stack,
        details: errorInfo,
      });
    } catch (reportError) {
      console.warn('Failed to report React error to main process:', reportError);
    }
  }

  private handleReload = (): void => {
    this.setState({ hasError: false, errorMessage: undefined, errorStack: undefined });
    window.location.reload();
  };

  override render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Result
          status="error"
          title="页面出现了一点问题"
          extra={[
            <Button type="primary" key="reload" onClick={this.handleReload}>
              重新加载页面
            </Button>,
          ]}
        >
          <Paragraph>
            <Text>我们已经记录了这个错误，请稍后重试。</Text>
          </Paragraph>
          {this.state.errorMessage && (
            <Paragraph type="secondary" ellipsis={{ rows: 3, expandable: true, symbol: '展开详情' }}>
              {this.state.errorMessage}
            </Paragraph>
          )}
          {this.state.errorStack && (
            <Paragraph type="secondary" ellipsis={{ rows: 2, expandable: true, symbol: '展开堆栈' }}>
              <Text code>{this.state.errorStack}</Text>
            </Paragraph>
          )}
        </Result>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
