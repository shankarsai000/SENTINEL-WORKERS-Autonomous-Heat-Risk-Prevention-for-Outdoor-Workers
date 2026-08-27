import React from 'react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onOpenAudit: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  onOpenAudit,
}) => {
  const navItems = [
    {
      id: 'overview',
      label: 'Overview',
      subtitle: 'Ops Center',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      id: 'map',
      label: 'Spatial Map',
      subtitle: 'Live Heatmap Studio',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      ),
    },
    {
      id: 'workers',
      label: 'Workers',
      subtitle: 'Fleet & Vitals Hub',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      id: 'incidents',
      label: 'Incidents',
      subtitle: 'Predictive Triage',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
    },
    {
      id: 'actions',
      label: 'Audit Trail',
      subtitle: 'Cryptographic Actions',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
        </svg>
      ),
    },
  ];

  return (
    <aside className="w-56 shrink-0 bg-[#0d1322] border-r border-[#1e293b]/70 flex flex-col justify-between select-none min-h-screen">
      {/* Top Section */}
      <div>
        {/* Brand Header */}
        <div className="p-4 pb-5 flex items-center space-x-3 border-b border-[#1e293b]/50">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="text-[13px] font-bold tracking-tight text-white leading-none truncate">
              SENTINEL WORKERS
            </div>
            <div className="text-[10px] text-cyan-400 mt-1 font-semibold leading-none truncate">
              FortyGuard Partner
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-2 space-y-1">
          {navItems.map((item) => {
            const isActive =
              activeTab === item.id ||
              (item.id === 'actions' && (activeTab === 'actions' || activeTab === 'audit')) ||
              (item.id === 'incidents' && (activeTab === 'incidents' || activeTab === 'reports'));

            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'actions') {
                    onTabChange('actions');
                  } else {
                    onTabChange(item.id);
                  }
                }}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-medium transition cursor-pointer text-left ${
                  isActive
                    ? 'bg-sky-500/10 text-sky-400 border-l-2 border-sky-500 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#131b2e]'
                }`}
              >
                <span className={isActive ? 'text-sky-400' : 'text-slate-400'}>
                  {item.icon}
                </span>
                <div className="min-w-0">
                  <div className="leading-tight font-medium">{item.label}</div>
                  <div className="text-[9px] text-slate-500 leading-tight mt-0.5">{item.subtitle}</div>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section: Profile & Nominal Status */}
      <div className="p-3 space-y-2 border-t border-[#1e293b]/50">
        {/* User Card */}
        <div className="flex items-center space-x-2.5 p-2 rounded-lg bg-[#131b2e]/60 border border-[#1e293b]/60">
          <div className="w-7 h-7 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-slate-200 leading-tight truncate">Supervisor</div>
            <div className="text-[10px] text-slate-400 leading-tight truncate">Shift A (Morning)</div>
          </div>
        </div>

        {/* System Status Pill */}
        <div className="px-2.5 py-1.5 rounded-lg bg-[#0a101d] border border-[#1e293b]/60 flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
          <span className="text-[11px] font-medium text-slate-300 truncate">
            All Systems Nominal
          </span>
        </div>
      </div>
    </aside>
  );
};
