import React, { useState, useEffect } from 'react';
import LandingPage from './pages/LandingPage';
import ConsultationPage from './pages/ConsultationPage';
import AnalysisPage from './pages/AnalysisPage';
import PrescriptionPage from './pages/PrescriptionPage';
import PricingPage from './pages/PricingPage';
import RegistrationPage from './pages/RegistrationPage';
import PaymentPage from './pages/PaymentPage';
import PendingActivationPage from './pages/PendingActivationPage';
import ClientDashboardPage from './pages/ClientDashboardPage';
import LoginPage from './pages/LoginPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import VideoGeneratorPage from './pages/VideoGeneratorPage';
import { ConsultationData, Prescription, Package, Client, RegistrationDetails } from './types';
import { generatePrescription } from './services/geminiService';
import { backendService, LoginResult } from './services/backendService';
import { generateWhatsAppLink } from './utils/helpers';
import { LoadingSpinner } from './components/icons';

type AppState = 'landing' | 'consultation' | 'analysis' | 'prescription' | 'pricing' | 'registration' | 'payment' | 'pending_activation' | 'client_dashboard' | 'login' | 'admin_dashboard' | 'video_generator';

type Session = {
    role: 'admin' | 'client';
    clientId?: number;
} | null;

function App() {
  const [page, setPage] = useState<AppState>('landing');
  const [session, setSession] = useState<Session>(null);
  const [isLoading, setIsLoading] = useState(true);

  // New Client Onboarding Flow State
  const [consultationData, setConsultationData] = useState<ConsultationData | null>(null);
  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [registrationDetails, setRegistrationDetails] = useState<RegistrationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Active Data for Dashboards
  const [activeClient, setActiveClient] = useState<Client | null>(null);

  // Initial check for a session (e.g., from a cookie or localStorage in a real app)
  useEffect(() => {
    // This is where you might check for a saved token
    setIsLoading(false);
  }, []);

  const handleStart = () => {
      setConsultationData(null);
      setPrescription(null);
      setSelectedPackage(null);
      setRegistrationDetails(null);
      setPage('consultation');
  };
  const handleGoToLogin = () => setPage('login');
  
  const handleLoginSuccess = async (result: LoginResult) => {
    if (result.role === 'admin') {
        setSession({ role: 'admin' });
        setPage('admin_dashboard');
    } else if (result.role === 'client' && result.clientId) {
        const clientData = await backendService.getClientById(result.clientId);
        if (clientData) {
            setActiveClient(clientData);
            setSession({ role: 'client', clientId: result.clientId });
            setPage('client_dashboard');
        }
    }
  };
  
  const handleLogout = () => {
    setSession(null);
    setActiveClient(null);
    setPage('landing');
  };

  const handleConsultationSubmit = async (data: ConsultationData) => {
    setConsultationData(data);
    setPage('analysis');
    setError(null);
    try {
      const result = await generatePrescription(data);
      setPrescription(result);
      setPage('prescription');
    } catch (err) {
        if (err instanceof Error) {
            setError(`حدث خطأ أثناء إنشاء الروشتة: ${err.message}. يرجى المحاولة مرة أخرى.`);
        } else {
            setError('حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.');
        }
        setPage('prescription');
    }
  };
  
  const handleProceedToPricing = () => setPage('pricing');
  
  const handlePackageSelect = (pkg: Package) => {
    setSelectedPackage(pkg);
    setPage('registration');
  };

  const handleRegister = (details: RegistrationDetails) => {
      setRegistrationDetails(details);
      setPage('payment');
  }
  
  const handlePaymentConfirm = async (proofImageUrl: string) => {
      if(consultationData && prescription && selectedPackage && registrationDetails) {
          const clientDataForRegistration = {
              consultationData,
              prescription,
              selectedPackage,
              email: registrationDetails.email,
              // FIX: Added missing 'connections' property to match the 'Omit<Client, "id" | "status">' type required by generateWhatsAppLink.
              connections: { facebook: false, instagram: false, tiktok: false, x: false, linkedin: false },
          };
          
          await backendService.registerClient(registrationDetails, consultationData, prescription, selectedPackage);
          
          const whatsappLink = generateWhatsAppLink('01030956097', clientDataForRegistration, proofImageUrl);
          window.open(whatsappLink, '_blank');

          setPage('pending_activation');
      } else {
          // Handle error case where data is missing
          alert("حدث خطأ ما. الرجاء البدء من جديد.");
          handleStart();
      }
  };

  const handleSelectClientForAdmin = async (clientId: number) => {
      const clientData = await backendService.getClientById(clientId);
      if (clientData) {
          setActiveClient(clientData);
          setPage('client_dashboard');
      }
  }
  
  const handleGoToVideoStudio = () => setPage('video_generator');
  
  const handleUpdateClient = async (updatedClient: Client) => {
    const result = await backendService.updateClient(updatedClient);
    setActiveClient(result);
  };
  
  const handleBackToAdminDashboard = () => {
      setActiveClient(null);
      setPage('admin_dashboard');
  }

  const renderPage = () => {
    if (isLoading) {
        return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner className="w-12 h-12 text-teal-400" /></div>;
    }

    // Logged-in Admin Routes
    if (session?.role === 'admin') {
        switch(page) {
            case 'admin_dashboard':
                return <AdminDashboardPage onSelectClient={handleSelectClientForAdmin} onAddNewClient={handleStart} onLogout={handleLogout} />;
            case 'client_dashboard':
                if (!activeClient) return <AdminDashboardPage onSelectClient={handleSelectClientForAdmin} onAddNewClient={handleStart} onLogout={handleLogout} />;
                return <ClientDashboardPage 
                    client={activeClient}
                    onUpdateClient={handleUpdateClient}
                    onBackToDashboard={handleBackToAdminDashboard}
                    onNavigateToVideoStudio={handleGoToVideoStudio} 
                    userRole="admin"
                />;
            case 'video_generator':
                if (!activeClient) return <AdminDashboardPage onSelectClient={handleSelectClientForAdmin} onAddNewClient={handleStart} onLogout={handleLogout} />;
                return <VideoGeneratorPage selectedPackage={activeClient.selectedPackage} onBackToDashboard={() => setPage('client_dashboard')} />;
            default:
                // If admin is logged in but page state is weird, default to their dashboard
                 return <AdminDashboardPage onSelectClient={handleSelectClientForAdmin} onAddNewClient={handleStart} onLogout={handleLogout} />;
        }
    }

    // Logged-in Client Routes
    if (session?.role === 'client' && activeClient) {
        switch(page) {
             case 'client_dashboard':
                 return <ClientDashboardPage 
                    client={activeClient}
                    onUpdateClient={handleUpdateClient}
                    onBackToDashboard={handleLogout} // For clients, this becomes logout
                    onNavigateToVideoStudio={handleGoToVideoStudio} 
                    userRole="client"
                />;
             case 'video_generator':
                return <VideoGeneratorPage selectedPackage={activeClient.selectedPackage} onBackToDashboard={() => setPage('client_dashboard')} />;
             default:
                // If client is logged in but page state is weird, default to their dashboard
                 return <ClientDashboardPage client={activeClient} onUpdateClient={handleUpdateClient} onBackToDashboard={handleLogout} onNavigateToVideoStudio={handleGoToVideoStudio} userRole="client" />;
        }
    }

    // Public Routes (No Session)
    switch (page) {
      case 'landing':
        return <LandingPage onStart={handleStart} onLogin={handleGoToLogin} onAdmin={handleGoToLogin} />;
      case 'login':
        return <LoginPage onLoginSuccess={handleLoginSuccess} onBackToHome={() => setPage('landing')} />;
      case 'consultation':
        return <ConsultationPage onSubmit={handleConsultationSubmit} />;
      case 'analysis':
        return <AnalysisPage />;
      case 'prescription':
        return <PrescriptionPage prescription={prescription} consultationData={consultationData} onProceed={handleProceedToPricing} error={error} />;
      case 'pricing':
        return <PricingPage onPackageSelect={handlePackageSelect} />;
      case 'registration':
        return <RegistrationPage onRegister={handleRegister} />;
      case 'payment':
        return <PaymentPage selectedPackage={selectedPackage} onPaymentConfirm={handlePaymentConfirm} />;
      case 'pending_activation':
        return <PendingActivationPage />;
      default:
        return <LandingPage onStart={handleStart} onLogin={handleGoToLogin} onAdmin={handleGoToLogin} />;
    }
  };

  return (
    <div className="bg-slate-900 text-white min-h-screen">
      {renderPage()}
    </div>
  );
}

export default App;