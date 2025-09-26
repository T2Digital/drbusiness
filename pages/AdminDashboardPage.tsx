import React, { useState, useEffect } from 'react';
import { Client } from '../types';
import { ShieldCheckIcon, LogoutIcon, UserIcon, PlusCircleIcon, LoadingSpinner } from '../components/icons';
import { backendService } from '../services/backendService';

interface AdminDashboardPageProps {
    onSelectClient: (clientId: number) => void;
    onAddNewClient: () => void;
    onLogout: () => void;
}

const ClientCard: React.FC<{client: Client, onSelect: () => void, onActivate: () => Promise<void>}> = ({ client, onSelect, onActivate }) => {
    const [isActivating, setIsActivating] = useState(false);

    const handleActivate = async (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent card click
        setIsActivating(true);
        await onActivate();
        // The parent component will re-fetch and re-render, so no need to set isActivating to false.
    };
    
    return (
        <div 
            onClick={client.status === 'active' ? onSelect : undefined}
            className={`bg-slate-800 p-5 rounded-xl border border-slate-700 flex flex-col gap-4 transition-all duration-300
                ${client.status === 'active' ? 'hover:border-teal-500 hover:shadow-lg hover:shadow-teal-500/10 cursor-pointer' : 'opacity-70'}
            `}
        >
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-700 rounded-lg flex items-center justify-center">
                    {client.consultationData.business.logo ? 
                        <img src={client.consultationData.business.logo} alt="logo" className="w-full h-full object-contain rounded-lg"/>
                        : <UserIcon className="w-7 h-7 text-teal-400"/>
                    }
                </div>
                <div>
                    <h3 className="font-bold text-white text-lg truncate">{client.consultationData.business.name}</h3>
                    <p className="text-sm text-slate-400">{client.consultationData.business.field}</p>
                </div>
            </div>
            <div className="text-xs flex justify-between items-center">
                <div>
                    <span className="font-semibold text-slate-300">الباقة: </span>
                    <span className="px-2 py-1 bg-teal-500/10 text-teal-300 rounded-full">{client.selectedPackage.name}</span>
                </div>
                <div>
                     <span className={`px-2 py-1 rounded-full text-xs font-semibold ${client.status === 'active' ? 'bg-green-500/10 text-green-300' : 'bg-yellow-500/10 text-yellow-300'}`}>
                        {client.status === 'active' ? 'نشط' : 'قيد التفعيل'}
                    </span>
                </div>
            </div>
            {client.status === 'active' ? (
                 <button onClick={onSelect} className="mt-auto w-full bg-slate-700 text-white font-bold py-2 px-4 rounded-lg hover:bg-slate-600 transition">
                    إدارة العميل
                </button>
            ) : (
                <button 
                    onClick={handleActivate} 
                    disabled={isActivating}
                    className="mt-auto w-full bg-yellow-500 text-slate-900 font-bold py-2 px-4 rounded-lg hover:bg-yellow-400 transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {isActivating && <LoadingSpinner className="w-4 h-4" />}
                    {isActivating ? 'جاري التفعيل...' : 'تفعيل'}
                </button>
            )}
        </div>
    );
};


const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({ onSelectClient, onAddNewClient, onLogout }) => {
    const [clients, setClients] = useState<Client[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchClients = async () => {
        setIsLoading(true);
        const data = await backendService.getClients();
        // Sort by pending first
        data.sort((a,b) => (a.status === 'pending' ? -1 : 1) - (b.status === 'pending' ? -1 : 1));
        setClients(data);
        setIsLoading(false);
    };

    useEffect(() => {
        fetchClients();
    }, []);

    const handleActivateClient = async (clientId: number) => {
        await backendService.activateClient(clientId);
        fetchClients(); // Re-fetch the list to update the UI
    };
    
  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 sm:p-8">
      <header className="flex flex-col sm:flex-row justify-between sm:items-center mb-10 gap-4">
        <div className="flex items-center gap-3">
          <ShieldCheckIcon className="w-10 h-10 text-teal-400" />
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold">لوحة تحكم الوكالة</h1>
            <p className="text-slate-400">إدارة جميع عملائك من مكان واحد.</p>
          </div>
        </div>
        <button onClick={onLogout} className="flex items-center self-start sm:self-center gap-2 bg-slate-700 text-white font-bold py-2 px-4 rounded-full hover:bg-slate-600 transition">
          <LogoutIcon className="w-5 h-5" />
          <span>تسجيل الخروج</span>
        </button>
      </header>

      <section>
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">قائمة العملاء ({clients.length})</h2>
        </div>
        
        {isLoading ? (
            <div className="flex justify-center py-16"><LoadingSpinner className="w-12 h-12 text-teal-400"/></div>
        ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                <button 
                    onClick={onAddNewClient} 
                    className="bg-slate-800/70 p-5 rounded-xl border-2 border-dashed border-slate-700 flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-teal-500 hover:text-teal-400 transition-colors duration-300 min-h-[220px]">
                    <PlusCircleIcon className="w-12 h-12" />
                    <span className="font-bold text-lg">إضافة عميل جديد</span>
                </button>

                {clients.map(client => (
                    <ClientCard key={client.id} client={client} onSelect={() => onSelectClient(client.id)} onActivate={() => handleActivateClient(client.id)} />
                ))}
            </div>
        )}
      </section>
    </div>
  );
};

export default AdminDashboardPage;