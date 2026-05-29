import { useState, FormEvent } from 'react';
import { Mail, Lock, Eye, EyeOff, LogIn } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';

export default function LoginForm() {
  const { login, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!email.trim() || !password.trim()) {
      setFormError('Please fill in all fields');
      return;
    }
    setIsLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="login-email" className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1.5">
          Email Address
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="input-field pl-10"
            autoComplete="email"
          />
        </div>
      </div>
      <div>
        <label htmlFor="login-password" className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1.5">
          Password
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
          <input
            id="login-password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            className="input-field pl-10 pr-10"
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-400 hover:text-secondary-600"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
      {(formError || error) && (
        <p className="text-sm text-danger-500 bg-danger-50 dark:bg-danger-950/50 px-3 py-2 rounded-lg">{formError || error}</p>
      )}
      <Button type="submit" loading={isLoading} className="w-full" size="lg">
        <LogIn className="w-4 h-4" />
        Sign In
      </Button>
    </form>
  );
}
