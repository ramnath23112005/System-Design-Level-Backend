import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import LoginForm from '@/components/auth/LoginForm';
import RegisterForm from '@/components/auth/RegisterForm';

export default function AuthPage() {
  const { user } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');

  if (user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 dark:from-secondary-950 dark:via-secondary-900 dark:to-primary-950 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM2MzY2ZjEiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMi41Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-40" />

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary-600 rounded-2xl mb-4 shadow-lg shadow-primary-500/25">
            <ExternalLink className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">ShortURL</h1>
          <p className="text-secondary-500 mt-1">Professional URL Shortener & Analytics</p>
        </div>

        <div className="bg-white dark:bg-secondary-800 rounded-2xl shadow-xl border border-secondary-200 dark:border-secondary-700 overflow-hidden">
          <div className="flex border-b border-secondary-200 dark:border-secondary-700">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 py-3.5 text-sm font-medium text-center transition-colors ${
                mode === 'login'
                  ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-500 bg-primary-50/50 dark:bg-primary-950/30'
                  : 'text-secondary-500 hover:text-secondary-700 dark:hover:text-secondary-300'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setMode('register')}
              className={`flex-1 py-3.5 text-sm font-medium text-center transition-colors ${
                mode === 'register'
                  ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-500 bg-primary-50/50 dark:bg-primary-950/30'
                  : 'text-secondary-500 hover:text-secondary-700 dark:hover:text-secondary-300'
              }`}
            >
              Create Account
            </button>
          </div>

          <div className="p-6">
            {mode === 'login' ? <LoginForm /> : <RegisterForm />}
          </div>
        </div>

        <p className="text-center text-xs text-secondary-400 mt-6">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
