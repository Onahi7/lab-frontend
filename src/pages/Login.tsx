import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FlaskConical, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

export default function Login() {
  const { signIn, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      emailSchema.parse(loginEmail);
      passwordSchema.parse(loginPassword);
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
        return;
      }
    }

    setIsLoading(true);
    const { error } = await signIn(loginEmail, loginPassword);
    setIsLoading(false);

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        toast.error('Invalid email or password');
      } else if (error.message.includes('Email not confirmed')) {
        toast.error('Please confirm your email before logging in');
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success('Logged in successfully');
      // Navigation will be handled by the auth state change
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4">
            <FlaskConical className="w-9 h-9 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Habour</h1>
          <p className="text-muted-foreground mt-2">Laboratory Information System</p>
        </div>

        {/* Login Form */}
        <div className="bg-card border rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-6">Sign In</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-email">Email</Label>
              <Input
                id="login-email"
                type="email"
                placeholder="you@example.com"
                value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password">Password</Label>
              <Input
                id="login-password"
                type="password"
                placeholder="••••••••"
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Sign In
            </Button>
          </form>

          {/* Info Message */}
          <div className="mt-6 p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground text-center">
              Don't have an account? Contact your administrator to create one.
            </p>
          </div>
        </div>

        {/* Analyzer Compatibility */}
        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground">
            Compatible with ZYBIO EXC 200, Z52 • WONDFO Finecare PLUS
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            HL7 v2.5.1 • ASTM E1394 • FHIR • LIS2-A2
          </p>
        </div>
      </div>
    </div>
  );
}
