
import React, { useState } from 'react';
import LandingPage from './pages/LandingPage';
import ConsultationPage from './pages/ConsultationPage';
import AnalysisPage from './pages/AnalysisPage';
import PrescriptionPage from './pages/PrescriptionPage';
import PricingPage from './pages/PricingPage';
import RegistrationPage from './pages/RegistrationPage';
import PaymentPage from './pages/PaymentPage';
import DashboardPage from './pages/DashboardPage';
import { ConsultationData, Prescription, Package } from './types';
import { generatePrescription } from './services/geminiService';

type AppState = 'landing' | 'consultation' | 'analysis' | 'prescription' | 'pricing' | 'registration' | 'payment' | 'dashboard';

function App() {
  const [page, setPage] = useState<AppState>('landing');
  const [consultationData, setConsultationData] = useState<ConsultationData | null>(null);
  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [error, setError] = useState<string | null>(null);


  const handleStart = () => {
    setPage('consultation');
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
            setError('An error occurred while generating your prescription. Please go back and try again.');
        } else {
            setError('An unknown error occurred. Please go back and try again.');
        }
        // Go to prescription page to show the error.
        setPage('prescription');
    }
  };
  
  const handleProceedToPricing = () => {
    setPage('pricing');
  };

  const handlePackageSelect = (pkg: Package) => {
    setSelectedPackage(pkg);
    setPage('registration');
  };

  const handleRegister = () => {
    setPage('payment');
  };

  const handlePaymentConfirm = () => {
    setPage('dashboard');
  };

  const renderPage = () => {
    switch (page) {
      case 'landing':
        return <LandingPage onStart={handleStart} />;
      case 'consultation':
        return <ConsultationPage onSubmit={handleConsultationSubmit} />;
      case 'analysis':
        return <AnalysisPage />;
      case 'prescription':
        return <PrescriptionPage prescription={prescription} onProceed={handleProceedToPricing} error={error} />;
      case 'pricing':
        return <PricingPage onPackageSelect={handlePackageSelect} />;
      case 'registration':
        return <RegistrationPage onRegister={handleRegister} />;
      case 'payment':
        return <PaymentPage selectedPackage={selectedPackage} onPaymentConfirm={handlePaymentConfirm} />;
      case 'dashboard':
        return <DashboardPage />;
      default:
        return <LandingPage onStart={handleStart} />;
    }
  };

  return (
    <div className="bg-slate-900 text-white min-h-screen">
      {renderPage()}
    </div>
  );
}

export default App;
