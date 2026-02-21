import { useAuth } from '../context/AuthContext';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import {
  HiOutlineClock,
  HiOutlineChartBar,
  HiOutlineUsers,
  HiOutlineLogout,
  HiOutlineUserAdd,
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
      className="rounded-md p-2 text-gray-500 hover:text-primary-600 hover:bg-gray-50 transition-colors"
    >
      {theme === 'light' ? <HiOutlineMoon className="h-5 w-5" /> : <HiOutlineSun className="h-5 w-5" />}
    </button>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = isAdmin
    ? [
        { path: '/admin', label: 'Dashboard', icon: HiOutlineChartBar },
        { path: '/admin/employees', label: 'Employees', icon: HiOutlineUsers },
        { path: '/admin/add-employee', label: 'Add Employee', icon: HiOutlineUserAdd },
        { path: '/admin/attendance-correction', label: 'Attendance Correction', icon: HiOutlineClock },
      ]
    : [
        { path: '/dashboard', label: 'Dashboard', icon: HiOutlineClock },
      ];

  const initials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="app-root flex h-screen overflow-hidden">
      {/* Sidebar (desktop) */}
      <aside className="hidden sm:flex flex-col w-72 border-r border-gray-200/60 glass shadow-sm">
        <div className="h-16 flex items-center px-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-600 to-primary-700 text-white font-bold text-sm shadow-md">
              Bx
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Brainiax</span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-4">
          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary-600 text-white shadow-md'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full primary-bg text-white text-sm font-bold shadow-sm">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{user?.name}</p>
              <p className="text-xs capitalize">{user?.role}</p>
            </div>
              <div className="flex items-center gap-2">
              <ThemeToggle />
              <button
                onClick={handleLogout}
                className="ml-2 rounded-md p-2 text-gray-500 hover:text-red-600 hover:bg-red-50"
                aria-label="Logout"
              >
                <HiOutlineLogout className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 pb-24 sm:pb-8 animate-fade-in">
            {children}
          </div>
        </main>

        {/* Mobile bottom bar */}
        <div className="sm:hidden flex-shrink-0 border-t border-gray-200/60 glass">
          <div className="flex items-center justify-around py-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex flex-col items-center gap-0.5 px-4 py-1.5 text-xs font-medium transition-colors ${
                    isActive ? 'text-primary-600' : 'text-gray-400'
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
