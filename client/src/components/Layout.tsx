import { useAuth } from '../context/AuthContext';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import {
  HiOutlineClock,
  HiOutlineChartBar,
  HiOutlineUsers,
  HiOutlineLogout,
  HiOutlineUserAdd,
  HiOutlineCog,
} from 'react-icons/hi';
import { useTheme } from '../context/ThemeContext';
import { HiOutlineSun, HiOutlineMoon } from 'react-icons/hi';

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      className="rounded-lg p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
    >
      {theme === 'light' ? <HiOutlineMoon className="h-4.5 w-4.5" /> : <HiOutlineSun className="h-4.5 w-4.5" />}
    </button>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const mainNav = isAdmin
    ? [
        { path: '/admin', label: 'Dashboard', icon: HiOutlineChartBar },
        { path: '/admin/employees', label: 'Employees', icon: HiOutlineUsers },
      ]
    : [
        { path: '/dashboard', label: 'Dashboard', icon: HiOutlineClock },
      ];

  const otherNav = isAdmin
    ? [
        { path: '/admin/add-employee', label: 'Add Employee', icon: HiOutlineUserAdd },
        { path: '/admin/attendance-correction', label: 'Attendance', icon: HiOutlineCog },
      ]
    : [];

  const initials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const allNavItems = [...mainNav, ...otherNav];

  return (
    <div className="app-root flex h-screen overflow-hidden">
      {/* ── Sidebar (desktop) ── */}
      <aside
        className="hidden sm:flex flex-col w-64 relative overflow-hidden"
        style={{
          backgroundColor: 'var(--card-bg)',
          backgroundImage: isDark
            ? 'repeating-linear-gradient(135deg, transparent, transparent 10px, rgba(129,140,248,0.03) 10px, rgba(129,140,248,0.03) 11px)'
            : 'repeating-linear-gradient(135deg, transparent, transparent 10px, rgba(99,102,241,0.025) 10px, rgba(99,102,241,0.025) 11px)',
          borderRight: isDark ? '1px solid rgba(129,140,248,0.15)' : '1px solid rgba(99,102,241,0.12)',
          boxShadow: isDark
            ? '2px 0 12px -2px rgba(129,140,248,0.08)'
            : '2px 0 16px -2px rgba(99,102,241,0.06), 1px 0 3px -1px rgba(99,102,241,0.04)',
        }}
      >
        {/* Decorative gradient accent strip on right edge */}
        <div
          className="absolute top-0 right-0 w-[2px] h-full pointer-events-none z-10"
          style={{
            background: isDark
              ? 'linear-gradient(180deg, rgba(129,140,248,0.4), rgba(99,102,241,0.08), rgba(129,140,248,0.4))'
              : 'linear-gradient(180deg, rgba(99,102,241,0.25), rgba(99,102,241,0.04), rgba(99,102,241,0.25))',
          }}
        />
        {/* Brand */}
        <div className="h-16 flex items-center px-5 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-700 text-white font-bold text-sm shadow-md">
              Bx
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              Brainiax
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 pt-6 pb-4">
          {/* MENU section */}
          <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400">Menu</p>
          <div className="space-y-0.5">
            {mainNav.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200/50'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className={`h-[18px] w-[18px] ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* OTHERS section */}
          {otherNav.length > 0 && (
            <>
              <p className="px-3 mt-7 mb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400">Others</p>
              <div className="space-y-0.5">
                {otherNav.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200/50'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <Icon className={`h-[18px] w-[18px] ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'}`} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </>
          )}
        </nav>

        {/* User profile + actions */}
        <div className="p-3 border-t" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2.5 px-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 text-white text-xs font-bold shadow-sm flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{user?.name}</p>
              <p className="text-[11px] text-gray-400 capitalize">{user?.role}</p>
            </div>
            <div className="flex items-center gap-0.5">
              <ThemeToggle />
              <button
                onClick={handleLogout}
                className="rounded-lg p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                aria-label="Logout"
                title="Sign out"
              >
                <HiOutlineLogout className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 pb-24 sm:pb-8 animate-fade-in">
            {children}
          </div>
        </main>

        {/* Mobile bottom bar */}
        <div className="sm:hidden flex-shrink-0 border-t" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-around py-2">
            {allNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex flex-col items-center gap-0.5 px-3 py-1.5 text-[10px] font-medium transition-colors ${
                    isActive ? 'text-indigo-600' : 'text-gray-400'
                  }`}
                >
                  <Icon className={`h-5 w-5 ${isActive ? 'drop-shadow' : ''}`} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
