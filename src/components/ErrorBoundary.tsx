import { translateInline } from '../utils/translateInline';
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { safeStorage } from '../utils/storage';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in React tree:', error, errorInfo);
  }

  private handleReset = () => {
    try {
      safeStorage.clear();
    } catch {
      // ignore
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0f172a] text-slate-100 flex items-center justify-center p-6 select-none" dir="rtl">
          <div className="max-w-md w-full bg-slate-900 border border-rose-500/40 rounded-3xl p-6 shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-100">{translateInline('en', 'An error occurred while loading the interface', 'حدث خطأ أثناء تحميل الواجهة')}</h2>
            <p className="text-xs text-slate-400 font-mono-code bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-rose-300 text-left overflow-auto max-h-36">
              {this.state.error?.message || 'Unknown render error'}
            </p>
            <button
              onClick={this.handleReset}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-emerald-500/20"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{translateInline('en', 'Restart and update app', 'إعادة تشغيل وتحديث التطبيق')}</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
