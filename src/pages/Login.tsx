import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Eye, EyeOff } from 'lucide-react';
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
  const [showPassword, setShowPassword] = useState(false);

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
      const errorMessage = error?.message || 'An error occurred during login';
      if (errorMessage.includes('Invalid login credentials')) {
        toast.error('Invalid email or password');
      } else if (errorMessage.includes('Email not confirmed')) {
        toast.error('Please confirm your email before logging in');
      } else {
        toast.error(errorMessage);
      }
    } else {
      toast.success('Logged in successfully');
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
    <div className="min-h-screen flex">
      {/* Left Side - Wavy Purple Background */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[#a94d7f]">
        {/* Wavy Pattern SVG */}
        <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 500 500">
          <defs>
            <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#a94d7f', stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: '#8b3d6a', stopOpacity: 1 }} />
            </linearGradient>
          </defs>
          {/* Wave layers */}
          <path d="M0,100 Q125,50 250,100 T500,100 L500,0 L0,0 Z" fill="rgba(139, 61, 106, 0.3)" />
          <path d="M0,200 Q125,150 250,200 T500,200 L500,0 L0,0 Z" fill="rgba(139, 61, 106, 0.2)" />
          <path d="M0,300 Q125,250 250,300 T500,300 L500,0 L0,0 Z" fill="rgba(139, 61, 106, 0.15)" />
          <path d="M0,400 Q125,350 250,400 T500,400 L500,500 L0,500 Z" fill="rgba(139, 61, 106, 0.2)" />
          <path d="M0,450 Q125,400 250,450 T500,450 L500,500 L0,500 Z" fill="rgba(139, 61, 106, 0.15)" />
        </svg>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <img 
              src="/logo_resized.png" 
              alt="CMDANI Logo" 
              className="h-16 object-contain"
            />
          </div>

          {/* Welcome Text */}
          <h2 className="text-3xl font-bold text-center mb-8 text-gray-900">Welcome Back</h2>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="login-email" className="text-sm font-medium text-gray-700">
                Email
              </Label>
              <Input
                id="login-email"
                type="email"
                placeholder="Enter email address"
                value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-12 border-gray-300 focus:border-[#a94d7f] focus:ring-[#a94d7f]"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="login-password" className="text-sm font-medium text-gray-700">
                  Password
                </Label>
                <button
                  type="button"
                  className="text-sm text-[#a94d7f] hover:text-[#8b3d6a] font-medium"
                  onClick={() => toast.info('Contact your administrator to reset password')}
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter password"
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="h-12 pr-10 border-gray-300 focus:border-[#a94d7f] focus:ring-[#a94d7f]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 text-base font-medium bg-[#a94d7f] hover:bg-[#8b3d6a] text-white"
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
              Login
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-8 flex justify-center">
            <img 
              src="/logo_resized.png" 
              alt="Report Logo" 
              className="h-12 object-contain opacity-60"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
