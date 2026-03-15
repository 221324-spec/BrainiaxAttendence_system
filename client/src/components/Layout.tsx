import { useState, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import {
  HiOutlineClock,
  HiOutlineChartBar,
  HiOutlineUsers,
  HiOutlineLogout,
  HiOutlineUserAdd,
  HiOutlineCog,
  HiOutlineCurrencyDollar,
  HiOutlineClipboardList,
  HiOutlineChevronDown,
  HiOutlineClipboardCheck,
  HiOutlineDocumentReport,
  HiOutlineAdjustments,
  HiOutlineChevronLeft,
} from 'react-icons/hi';
import { useTheme } from '../context/ThemeContext';
import { HiOutlineSun, HiOutlineMoon } from 'react-icons/hi';
import UserProfileModal from './UserProfileModal';

/* ── Types ── */
type NavChild = {
  path: string;
  label: string;
  icon: React.ElementType;
};

type NavSection = {
  key: string;
  label: string;
  icon: React.ElementType;
  children: NavChild[];
};

type NavStandalone = {
  path: string;
  label: string;
  icon: React.ElementType;
};

type NavItem = NavSection | NavStandalone;

function isSection(item: NavItem): item is NavSection {
  return 'children' in item;
}

/* ── Theme Toggle ── */
function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      className="rounded-lg p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
    >
      {theme === 'light' ? <HiOutlineMoon className="h-4.5 w-4.5" /> : <HiOutlineSun className="h-4.5 w-4.5" />}
    </button>
  );
}

/* ── Collapsible Section ── */
function SidebarSection({
  section,
  isOpen,
  onToggle,
  onHoverOpen,
  onHoverClose,
  pathname,
  isCollapsed,
}: {
  section: NavSection;
  isOpen: boolean;
  onToggle: () => void;
  onHoverOpen: () => void;
  onHoverClose: () => void;
  pathname: string;
  isCollapsed: boolean;
}) {
  const Icon = section.icon;
  const hasActiveChild = section.children.some((c) => pathname === c.path);

  return (
    <div
      className="mb-0.5"
      onMouseEnter={onHoverOpen}
      onMouseLeave={onHoverClose}
    >
      {/* Section header / toggle */}
      <button
        onClick={onToggle}
        title={isCollapsed ? section.label : undefined}
        className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all ${
          isCollapsed ? 'justify-center' : ''
        } ${
          hasActiveChild
            ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.04] dark:hover:text-gray-200'
        }`}
      >
        <Icon
          className={`h-[18px] w-[18px] flex-shrink-0 ${
            hasActiveChild
              ? 'text-indigo-600 dark:text-indigo-400'
              : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'
          }`}
        />
        {!isCollapsed && (
          <>
            <span className="flex-1 text-left">{section.label}</span>
            <HiOutlineChevronDown
              className={`h-4 w-4 flex-shrink-0 text-gray-300 transition-transform duration-200 ${
                isOpen ? 'rotate-0' : '-rotate-90'
              }`}
            />
          </>
        )}
      </button>

      {/* Children — animated collapse */}
      {!isCollapsed && (
        <div
          className="overflow-hidden transition-all duration-200 ease-in-out"
          style={{
            maxHeight: isOpen ? `${section.children.length * 44}px` : '0px',
            opacity: isOpen ? 1 : 0,
          }}
        >
          <div className="ml-3 mt-0.5 space-y-0.5 border-l-2 border-gray-100 dark:border-white/[0.06] pl-3">
            {section.children.map((child) => {
              const ChildIcon = child.icon;
              const isActive = pathname === child.path;
              return (
                <Link
                  key={child.path}
                  to={child.path}
                  className={`group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12.5px] font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200/50 dark:shadow-indigo-900/40'
                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.04] dark:hover:text-gray-200'
                  }`}
                >
                  <ChildIcon
                    className={`h-[16px] w-[16px] flex-shrink-0 ${
                      isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-500 dark:group-hover:text-gray-300'
                    }`}
                  />
                  <span>{child.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   LAYOUT
   ═══════════════════════════════════════════════════ */
export default function Layout({ children }: { children: React.ReactNode }) {
  const { logout, isAdmin, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  /* ──────────────────────────────────────────────
     Navigation Structure
     ────────────────────────────────────────────── */
  const adminNav: NavItem[] = [
    { path: '/admin', label: 'Dashboard', icon: HiOutlineChartBar },
    {
      key: 'employees',
      label: 'Employees',
      icon: HiOutlineUsers,
      children: [
        { path: '/admin/employees', label: 'All Employees', icon: HiOutlineUsers },
        { path: '/admin/add-employee', label: 'Add Employee', icon: HiOutlineUserAdd },
      ],
    },
    {
      key: 'attendance',
      label: 'Attendance',
      icon: HiOutlineClipboardList,
      children: [
        { path: '/admin/today-attendance', label: 'Remote Attendance', icon: HiOutlineClipboardCheck },
        { path: '/admin/onsite-attendance', label: 'Onsite Attendance', icon: HiOutlineClipboardList },
        { path: '/admin/attendance-correction', label: 'Correction', icon: HiOutlineAdjustments },
      ],
    },
    {
      key: 'payroll',
      label: 'Payroll',
      icon: HiOutlineCurrencyDollar,
      children: [
        { path: '/admin/payroll', label: 'Payroll Runs', icon: HiOutlineDocumentReport },
        { path: '/admin/payroll-settings', label: 'Settings', icon: HiOutlineCog },
      ],
    },
  ];

  const employeeNav: NavItem[] = [
    { path: user?.employeeType === 'onsite' ? '/onsite-employee' : '/dashboard', label: 'Dashboard', icon: HiOutlineClock },
  ];

  const navItems = isAdmin ? adminNav : employeeNav;

  /* ── Section expand state ── */
  // Tracks which sections the user has explicitly clicked open
  const [clickedOpen, setClickedOpen] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    for (const item of isAdmin ? adminNav : []) {
      if (isSection(item)) {
        // auto-open the section containing the active page on first mount
        map[item.key] = item.children.some((c) => location.pathname === c.path);
      }
    }
    return map;
  });

  // Tracks which section is being hovered (only one at a time, or empty string)
  const [hoveredSection, setHoveredSection] = useState<string>('');
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // A section is visually open if it was clicked open OR is currently hovered
  const isSectionOpen = (key: string) => clickedOpen[key] || hoveredSection === key;

  const toggleSection = (key: string) => {
    setClickedOpen((prev) => {
      const willClose = prev[key];
      if (willClose) {
        // Clear hover so the section actually collapses even while mouse is over it
        if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
        setHoveredSection('');
      }
      return { ...prev, [key]: !prev[key] };
    });
  };

  const handleHoverOpen = useCallback((key: string) => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => setHoveredSection(key), 150);
  }, []);

  const handleHoverClose = useCallback(() => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => setHoveredSection(''), 200);
  }, []);

  /* ── Sidebar collapse state ── */
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isHoverExpanded, setIsHoverExpanded] = useState(false);
  const sidebarHoverRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Effective collapsed state: collapsed by button but not hover-expanded
  const effectiveCollapsed = isCollapsed && !isHoverExpanded;

  const handleSidebarMouseEnter = useCallback(() => {
    if (!isCollapsed) return;
    if (sidebarHoverRef.current) clearTimeout(sidebarHoverRef.current);
    sidebarHoverRef.current = setTimeout(() => setIsHoverExpanded(true), 200);
  }, [isCollapsed]);

  const handleSidebarMouseLeave = useCallback(() => {
    if (sidebarHoverRef.current) clearTimeout(sidebarHoverRef.current);
    sidebarHoverRef.current = setTimeout(() => setIsHoverExpanded(false), 300);
  }, []);

  /* ── Profile modal state ── */
  const [showProfileModal, setShowProfileModal] = useState(false);

  /* ── Mobile nav — flatten to key links ── */
  const mobileNav: NavStandalone[] = isAdmin
    ? [
        { path: '/admin', label: 'Dashboard', icon: HiOutlineChartBar },
        { path: '/admin/employees', label: 'Employees', icon: HiOutlineUsers },
        { path: '/admin/today-attendance', label: 'Attendance', icon: HiOutlineClipboardList },
        { path: '/admin/payroll', label: 'Payroll', icon: HiOutlineCurrencyDollar },
      ]
    : [
        { path: user?.employeeType === 'onsite' ? '/onsite-employee' : '/dashboard', label: 'Dashboard', icon: HiOutlineClock },
      ];

  return (
    <div className="app-root flex h-screen overflow-hidden">
      {/* ── Sidebar (desktop) ── */}
      <aside
        className="hidden sm:flex flex-col relative overflow-hidden transition-all duration-300 ease-in-out"
        style={{
          width: effectiveCollapsed ? '56px' : '240px',
          minWidth: effectiveCollapsed ? '56px' : '240px',
          background: isDark
            ? 'rgba(17, 17, 28, 0.75)'
            : 'rgba(255, 255, 255, 0.45)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRight: isDark
            ? '1px solid rgba(255,255,255,0.08)'
            : '1px solid rgba(255, 255, 255, 0.6)',
          boxShadow: isDark
            ? '2px 0 12px -2px rgba(0,0,0,0.3)'
            : '2px 0 24px -4px rgba(99, 102, 241, 0.08), inset -1px 0 0 0 rgba(255,255,255,0.5)',
        }}
        onMouseEnter={handleSidebarMouseEnter}
        onMouseLeave={handleSidebarMouseLeave}
      >
        {/* Decorative gradient accent strip on right edge */}
        <div
          className="absolute top-0 right-0 w-[2px] h-full pointer-events-none z-10"
          style={{
            background: isDark
              ? 'linear-gradient(180deg, rgba(129,140,248,0.3), transparent 50%, rgba(129,140,248,0.3))'
              : 'linear-gradient(180deg, rgba(99,102,241,0.2), transparent 50%, rgba(99,102,241,0.2))',
          }}
        />

        {/* Brand */}
        <div className="h-14 flex items-center justify-between px-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className={`flex items-center gap-2 ${effectiveCollapsed ? 'justify-center w-full' : ''}`}>
            {/* Logo - clickable to expand when collapsed */}
            <button
              onClick={effectiveCollapsed ? () => { setIsCollapsed(false); setIsHoverExpanded(false); } : undefined}
              className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-indigo-700 text-white font-bold text-xs shadow-md flex-shrink-0 ${effectiveCollapsed ? 'cursor-pointer hover:scale-105 transition-transform' : 'cursor-default'}`}
              title={effectiveCollapsed ? 'Expand sidebar' : undefined}
            >
              Bx
            </button>
            {!effectiveCollapsed && (
              <span className="text-base font-bold page-heading whitespace-nowrap">
                Brainiax
              </span>
            )}
          </div>
          {/* Collapse toggle button */}
          {!effectiveCollapsed && (
            <button
              onClick={() => { setIsCollapsed(!isCollapsed); setIsHoverExpanded(false); }}
              className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
              title="Collapse sidebar"
            >
              <HiOutlineChevronLeft className="h-4 w-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 pt-6 pb-4">
          {!effectiveCollapsed && (
            <p className="px-3 mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400" style={{ color: 'var(--muted)' }}>Menu</p>
          )}
          <div className="space-y-0.5">
            {navItems.map((item) => {
              if (isSection(item)) {
                return (
                  <SidebarSection
                    key={item.key}
                    section={item}
                    isOpen={isSectionOpen(item.key)}
                    onToggle={() => toggleSection(item.key)}
                    onHoverOpen={() => handleHoverOpen(item.key)}
                    onHoverClose={handleHoverClose}
                    pathname={location.pathname}
                    isCollapsed={effectiveCollapsed}
                  />
                );
              }
              // Standalone link
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  title={effectiveCollapsed ? item.label : undefined}
                  className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all ${
                    effectiveCollapsed ? 'justify-center' : ''
                  } ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200/50'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.04] dark:hover:text-gray-200'
                  }`}
                >
                  <Icon className={`h-[18px] w-[18px] flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'}`} />
                  {!effectiveCollapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Sidebar footer */}
        <div className="p-3 border-t" style={{ borderColor: 'var(--border)' }}>
          {effectiveCollapsed ? (
            <div className="flex flex-col items-center gap-1">
              <ThemeToggle />
              <button
                onClick={handleLogout}
                className="rounded-lg p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                aria-label="Logout"
                title="Sign out"
              >
                <HiOutlineLogout className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] text-gray-400">© 2026 Brainiax</span>
              <div className="flex items-center gap-0.5">
                <ThemeToggle />
                <button
                  onClick={handleLogout}
                  className="rounded-lg p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                  aria-label="Logout"
                  title="Sign out"
                >
                  <HiOutlineLogout className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-w-0 relative">

        <main className="flex-1 overflow-y-auto overflow-x-hidden relative z-[1]">
          <div className="w-full px-4 py-8 sm:px-6 lg:px-8 pb-24 sm:pb-8 animate-fade-in">
            {children}
          </div>
        </main>

        {/* Mobile bottom bar — shows only key section shortcuts */}
        <div className="sm:hidden flex-shrink-0 border-t" style={{ background: 'rgba(255,255,255,0.35)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-around py-2">
            {mobileNav.map((item) => {
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
            {/* Mobile logout */}
            <button
              onClick={handleLogout}
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-[10px] font-medium text-gray-400 hover:text-red-500 transition-colors"
            >
              <HiOutlineLogout className="h-5 w-5" />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Profile Modal */}
      {showProfileModal && (
        <UserProfileModal onClose={() => setShowProfileModal(false)} />
      )}
    </div>
  );
}
