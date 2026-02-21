import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api';
import toast from 'react-hot-toast';
import { HiOutlineMail, HiOutlineLockClosed, HiOutlineShieldCheck, HiOutlineClock, HiOutlineDocumentReport } from 'react-icons/hi';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await authApi.login({ email, password });
      const user = res?.user;
      const token = res?.token;
      if (!user || !token) {
        const msg = (res as any)?.message || 'Invalid credentials';
        throw new Error(msg);
      }
      login(token, user);
      toast.success(`Welcome back, ${user.name}!`);
      navigate(user.role === 'admin' ? '/admin' : '/dashboard');
    } catch (err: any) {
      console.error('Login error:', err);
      const status = err.response?.status;
      const serverMsg = err.response?.data?.message;
      const message = serverMsg || (status ? `Request failed (${status})` : err.message || 'Login failed');
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const features = [
    { icon: HiOutlineClock, title: 'Real-time Tracking', desc: 'Instant punch-in & out with break management' },
    { icon: HiOutlineDocumentReport, title: 'Smart Reports', desc: 'Export detailed CSV attendance reports' },
    { icon: HiOutlineShieldCheck, title: 'Secure & Reliable', desc: 'Enterprise-grade security for your data' },
  ];

  return (
    <div className="flex min-h-screen">
      {/* Left side - premium branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-950 via-primary-900 to-primary-800" />

        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary-600/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-primary-500/15 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-primary-400/10 rounded-full blur-2xl -translate-x-1/2 -translate-y-1/2" />

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white font-bold text-lg backdrop-blur-md border border-white/10 shadow-lg">
                Bx
              </div>
              <span className="text-2xl font-bold text-white tracking-tight">Brainiax</span>
            </div>
          </div>

          <div className="space-y-8">
            <div>
              <h1 className="text-5xl font-extrabold text-white leading-[1.1] tracking-tight">
                Smart
                <br />
                <span className="bg-gradient-to-r from-primary-300 to-blue-300 bg-clip-text text-transparent">Attendance</span>
                <br />Management
              </h1>
              <p className="mt-6 text-lg text-primary-200/80 max-w-md leading-relaxed">
                Streamline workforce management with real-time tracking, automated reports, and intelligent insights.
              </p>
            </div>

            {/* Feature pills */}
            <div className="space-y-3">
              {features.map((f, i) => (
                <div key={i} className="flex items-center gap-4 rounded-2xl bg-white/[0.06] border border-white/[0.08] px-5 py-3.5 backdrop-blur-sm">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary-500/20 text-primary-300">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{f.title}</p>
                    <p className="text-xs text-primary-300/70">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-sm text-primary-400/60">
            &copy; {new Date().getFullYear()} Brainiax. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right side - login form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-8 bg-gradient-to-br from-gray-50 to-white">
        <div className="w-full max-w-md animate-fade-in">
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-600 to-primary-700 text-white font-bold shadow-lg shadow-primary-300/30">
              Bx
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Brainiax</span>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Welcome back</h2>
            <p className="mt-2 text-sm text-gray-500">
              Sign in to your account to continue
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">Email Address</label>
              <div className="relative group">
                <HiOutlineMail className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-primary-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input pl-11"
                  placeholder="you@company.com"
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative group">
                <HiOutlineLockClosed className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-primary-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pl-11"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full py-3.5 text-base mt-2"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
            {errorMessage && (
              <div className="mt-3 text-sm text-red-400 bg-red-900/5 p-2 rounded-md border border-red-800/10">
                {errorMessage}
              </div>
            )}
          </form>

          <div className="mt-8 flex items-center gap-3 text-xs text-gray-400">
            <HiOutlineShieldCheck className="h-4 w-4 flex-shrink-0" />
            <p>Protected by enterprise-grade encryption</p>
          </div>
        </div>
      </div>
    </div>
  );
}
