import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { reportClientError } from '../../utils/telemetry.ts';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    reportClientError(error, errorInfo.componentStack ?? undefined);
  }

  private handleReset = () => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6" dir="rtl">
          <div className="bg-red-50 border border-red-100 rounded-2xl p-8 max-w-md w-full text-center shadow-sm">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">هەڵەیەک ڕوویدا</h2>
            <p className="text-slate-600 mb-6 text-sm">
              کێشەیەک لە سیستەمەکەدا دروست بوو. تکایە لاپەڕەکە نوێ بکەرەوە بۆ بەردەوامبوون.
            </p>
            <button
              onClick={this.handleReset}
              className="inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-xl font-medium transition-colors w-full cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>نوێکردنەوە</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
