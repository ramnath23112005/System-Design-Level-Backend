import { useState, FormEvent } from 'react';
import { Mail, Lock, User, Eye, EyeOff, UserPlus } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';

export default function RegisterForm() {
  const { register, error } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!name.trim() || !email.trim() || !password.trim()) {
      setFormError('Please fill in all fields');
      return;
    }
    if (password.length < 8) {
      setFormError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setFormError('Passwords do not match');
      return;
    }
    setIsLoading(true);
    try {
      await register(name, email, password);
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="reg-name" className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1.5">
          Full Name
        </label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
          <input
            id="reg-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Doe"
            className="input-field pl-10"
            autoComplete="name"
          />
        </div>
      </div>
      <div>
        <label htmlFor="reg-email" className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1.5">
          Email Address
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
          <input
            id="reg-email"
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
        <label htmlFor="reg-password" className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1.5">
          Password
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
          <input
            id="reg-password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min. 8 characters"
            className="input-field pl-10 pr-10"
            autoComplete="new-password"
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
      <div>
        <label htmlFor="reg-confirm" className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1.5">
          Confirm Password
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
          <input
            id="reg-confirm"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repeat your password"
            className="input-field pl-10"
            autoComplete="new-password"
          />
        </div>
      </div>
      {(formError || error) && (
        <p className="text-sm text-danger-500 bg-danger-50 dark:bg-danger-950/50 px-3 py-2 rounded-lg">{formError || error}</p>
      )}
      <Button type="submit" loading={isLoading} className="w-full" size="lg">
        <UserPlus className="w-4 h-4" />
        Create Account
      </Button>
    </form>
  );
}
