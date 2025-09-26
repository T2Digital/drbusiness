import React, { useState } from 'react';
import { BrainCircuitIcon, ChartBarIcon, CalendarIcon, UserIcon, CogIcon, LogoutIcon, VideoIcon, LinkIcon } from './icons';

type View = 'content' | 'strategy' | 'analytics' | 'connections';
type UserRole = 'admin' | 'client';

interface DashboardLayoutProps {
    children: React.ReactNode;
    activeView: View;
    setActiveView: (view: View) => void;
    onBack: () => void; // This will be used for logout (client) or back to admin (admin)
    businessName: string;
    onNavigateToVideoStudio: () => void;
    userRole: UserRole;
}

const NavItem: React.FC<{
    icon: React.ElementType;
    label: string;
    isActive: boolean;
    onClick: () => void;
}> = ({ icon: Icon, label, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center space-x-4 px-4 py-3 rounded-lg transition-colors duration-200 ${
            isActive
                ? 'bg-teal-500/10 text-teal-300 font-bold'
                : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
        }`}
    >
        <Icon className="h-6 w-6 flex-shrink-0" />
        <span className="font-semibold">{label}</span>
    </button>
);

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ 
    children, 
    activeView, 
    setActiveView, 
    onBack, 
    businessName, 
    onNavigateToVideoStudio,
    userRole
}) => {
    const [isSidebarOpen, setSidebarOpen] = useState(false);

    const handleNavItemClick = (view: View) => {
        setActiveView(view);
        setSidebarOpen(false); // Close sidebar on mobile after navigation
    };

    const sidebarContent = (
        <>
            <div className="flex items-center gap-3 mb-10">
                <div className="w-10 h-10 bg-slate-700 flex items-center justify-center rounded-lg">
                    {/* Placeholder for client logo */}
                    <UserIcon className="w-6 h-6 text-teal-400" />
                </div>
                <div>
                    <h1 className="font-extrabold text-lg text-white truncate">{businessName}</h1>
                    <p className="text-xs text-slate-400">{userRole === 'admin' ? 'Admin Workspace' : 'Client Dashboard'}</p>
                </div>
            </div>

            <nav className="flex-grow space-y-2">
                 <h3 className="px-4 text-sm font-semibold text-slate-500 uppercase tracking-wider">Workspace</h3>
                 <NavItem
                    icon={CalendarIcon}
                    label="تقويم المحتوى"
                    isActive={activeView === 'content'}
                    onClick={() => handleNavItemClick('content')}
                />
                 <NavItem
                    icon={BrainCircuitIcon}
                    label="الاستراتيجية"
                    isActive={activeView === 'strategy'}
                    onClick={() => handleNavItemClick('strategy')}
                />
                <NavItem
                    icon={ChartBarIcon}
                    label="التحليلات"
                    isActive={activeView === 'analytics'}
                    onClick={() => handleNavItemClick('analytics')}
                />
                 <NavItem
                    icon={LinkIcon}
                    label="الحسابات المتصلة"
                    isActive={activeView === 'connections'}
                    onClick={() => handleNavItemClick('connections')}
                />
                <div className="pt-2 mt-2 border-t border-slate-700">
                    <h3 className="px-4 text-sm font-semibold text-slate-500 uppercase tracking-wider mt-2">أدوات</h3>
                     <NavItem
                        icon={VideoIcon}
                        label="استوديو الفيديو"
                        isActive={false} // This is not a view, but a navigation action
                        onClick={onNavigateToVideoStudio}
                    />
                </div>
            </nav>

            <div className="mt-auto">
                 <button onClick={onBack} className="w-full flex items-center space-x-4 px-4 py-3 text-slate-400 hover:bg-slate-700/50 hover:text-white rounded-lg transition-colors duration-200 mt-2">
                     {userRole === 'admin' ? (
                        <>
                            <LogoutIcon className="h-6 w-6 transform rotate-180" />
                            <span className="font-semibold">العودة للوحة العملاء</span>
                        </>
                     ) : (
                        <>
                            <LogoutIcon className="h-6 w-6" />
                            <span className="font-semibold">تسجيل الخروج</span>
                        </>
                     )}
                </button>
            </div>
        </>
    );

    return (
        <div className="flex h-screen bg-slate-900 text-white">
            {/* Mobile Sidebar */}
            <div className={`fixed inset-y-0 right-0 z-40 w-64 bg-slate-800 border-l border-slate-700 p-6 flex-shrink-0 flex flex-col transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'} md:hidden`}>
                {sidebarContent}
            </div>
             {isSidebarOpen && <div className="fixed inset-0 bg-black/60 z-30 md:hidden" onClick={() => setSidebarOpen(false)}></div>}


            {/* Desktop Sidebar */}
            <aside className="w-64 bg-slate-800/50 border-l border-slate-700 p-6 flex-shrink-0 flex-col hidden md:flex">
                {sidebarContent}
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-4 sm:p-8 flex flex-col">
                 {/* Mobile Header */}
                <header className="md:hidden flex justify-between items-center mb-4 pb-4 border-b border-slate-700">
                     <div className="flex items-center gap-2">
                        <UserIcon className="h-8 w-8 text-teal-400" />
                        <h1 className="font-extrabold text-lg text-white truncate">{businessName}</h1>
                     </div>
                     <button onClick={() => setSidebarOpen(true)} className="p-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
                    </button>
                </header>
                <div className="flex-grow">
                    {children}
                </div>
            </main>
        </div>
    );
};