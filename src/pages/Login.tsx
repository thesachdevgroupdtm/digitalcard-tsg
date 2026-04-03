import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { LogIn, ShieldCheck, Mail, Lock, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../AuthContext';

const Login = () => {
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const isMounted = React.useRef(true);

  useEffect(() => {
    isMounted.current = true;
    // Check for email verification success in URL
    const hash = window.location.hash;
    if (hash && hash.includes('type=signup')) {
      toast.success('Email verified successfully. Please login.');
    }
    
    if (user && !authLoading) {
      navigate('/dashboard');
    }

    return () => {
      isMounted.current = false;
    };
  }, [user, authLoading, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isRegistering) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        
        if (!isMounted.current) return;

        if (data.user && data.session) {
          toast.success('Registration successful! Redirecting...');
          navigate('/dashboard');
        } else {
          toast.success('Registration successful! Please check your email for verification.');
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        
        if (!isMounted.current) return;

        if (data.user && !data.user.email_confirmed_at && data.user.app_metadata?.provider === 'email') {
          toast.error('Please verify your email before logging in.');
          setLoading(false);
          return;
        }

        toast.success('Login successful!');
        navigate('/dashboard');
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      if (isMounted.current) {
        setError(err.message || 'An error occurred during authentication');
        toast.error(err.message || 'Authentication failed');
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-neutral-100"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-200">
            <ShieldCheck className="text-white w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900">Galaxy Toyota</h1>
          <p className="text-neutral-500 mt-2">Digital Card Platform</p>
          <h2 className="text-lg font-semibold text-neutral-700 mt-6">
            {isRegistering ? 'Create an Account' : 'Welcome Back'}
          </h2>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm flex items-center gap-2">
            <span className="w-1 h-1 bg-red-600 rounded-full" />
            {error}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2 px-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl py-4 pl-12 pr-4 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                placeholder="name@company.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2 px-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl py-4 pl-12 pr-4 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-neutral-900 text-white rounded-xl py-4 font-semibold flex items-center justify-center gap-3 hover:bg-neutral-800 transition-all disabled:opacity-50 shadow-lg shadow-neutral-200"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                {isRegistering ? <UserPlus className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
                {isRegistering ? 'Register' : 'Sign In'}
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button
            onClick={() => setIsRegistering(!isRegistering)}
            className="text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors"
          >
            {isRegistering ? 'Already have an account? Sign In' : "Don't have an account? Register"}
          </button>
        </div>

        <p className="text-center text-neutral-400 text-[10px] mt-8 uppercase tracking-widest font-bold">
          Authorized personnel only. Access is monitored.
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
