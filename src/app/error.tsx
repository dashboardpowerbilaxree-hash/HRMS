'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCw, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Laxree HRMS Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      {/* Background accents */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-40 -right-40 w-[400px] h-[400px] rounded-full opacity-[0.05]"
          style={{ background: 'radial-gradient(circle, oklch(0.78 0.19 80), transparent)' }}
        />
        <div
          className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full opacity-[0.03]"
          style={{ background: 'radial-gradient(circle, oklch(0.68 0.22 55), transparent)' }}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-md">
        <div className="w-16 h-16 rounded-2xl gradient-laxree flex items-center justify-center mb-6 shadow-lg">
          <AlertCircle className="w-8 h-8 text-white" />
        </div>

        <div className="flex items-center gap-2 mb-3">
          <Crown className="w-4 h-4 text-gold" />
          <span className="text-xs font-semibold text-gold uppercase tracking-wider">Laxree HRMS</span>
        </div>

        <h2 className="text-2xl font-bold mb-2">Something went wrong</h2>
        <p className="text-sm text-muted-foreground mb-2">
          An unexpected error occurred in the application.
        </p>

        {error?.message && (
          <div className="w-full mt-2 mb-4 p-3 rounded-lg bg-destructive/5 border border-destructive/15 text-xs text-destructive/80 font-mono break-words">
            {error.message}
          </div>
        )}

        {error?.digest && (
          <p className="text-[10px] text-muted-foreground mb-4">
            Error ID: {error.digest}
          </p>
        )}

        <div className="flex items-center gap-3 mt-2">
          <Button
            onClick={() => reset()}
            className="gradient-laxree text-white gap-2 btn-gold-glow"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </Button>
          <Button
            variant="outline"
            onClick={() => window.location.href = '/'}
            className="border-gold/20 hover:border-gold/40 hover:bg-gold/5"
          >
            Go to Login
          </Button>
        </div>

        <p className="text-[10px] text-muted-foreground mt-6">
          If the problem persists, please contact Laxree Group IT support.
        </p>
      </div>
    </div>
  );
}
