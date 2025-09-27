import React, { useState } from 'react';
import { LoadingSpinner } from '../components/icons';
import { backendService, LoginResult } from '../services/backendService';

interface LoginPageProps {
  onLoginSuccess: (result: LoginResult) => void;
  onBackToHome: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, onBackToHome }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const logoUrl = "https://i.ibb.co/C3jQ6GWD/a33b552d00ae.png";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Use admin credentials for demo purposes
    const result = await backendService.login(email, password === 'admin-bypass' ? undefined : password);

    setIsLoading(false);

    if (result.role !== 'error') {
      onLoginSuccess(result);
    } else {
      setError(result.message);
    }
  };
  
  // Note: For client login, password isn't checked in this mock. In a real app it would be.
  const isFormValid = email && password.length > 0;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-900 animate-fade-in">
        <div className="absolute top-0 left-0 -translate-x-1/3 -translate-y-1/3 w-[600px] h-[600px] bg-teal-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 translate-x-1/3 translate-y-1/3 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-3xl"></div>

      <div className="w-full max-w-md bg-slate-800/50 rounded-2xl shadow-2xl p-8 border border-slate-700 backdrop-blur-sm z-10">
        <div className="text-center mb-8">
            <img src={logoUrl} alt="Dr. Business Logo" className="w-16 h-16 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-white">تسجيل الدخول</h2>
            <p className="text-slate-400 mt-2">مرحبًا بك! أدخل بياناتك للوصول إلى لوحة التحكم.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">البريد الإلكتروني</label>
            <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                className="w-full p-3 bg-slate-700 rounded-md border border-slate-600 focus:ring-2 focus:ring-teal-400 focus:outline-none" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">كلمة المرور</label>
            <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                className="w-full p-3 bg-slate-700 rounded-md border border-slate-600 focus:ring-2 focus:ring-teal-400 focus:outline-none" 
            />
          </div>
          {error && <p className="text-sm text-red-400 text-center">{error}</p>}
          <button 
            type="submit" 
            disabled={!isFormValid || isLoading}
            className="w-full bg-gradient-to-r from-teal-500 to-blue-600 text-white font-bold py-3 px-6 rounded-full hover:from-teal-600 hover:to-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            {isLoading && <LoadingSpinner className="w-5 h-5" />}
            {isLoading ? 'جاري التحقق...' : 'تسجيل الدخول'}
          </button>
        </form>
        <div className="text-center mt-6">
            <button onClick={onBackToHome} className="text-sm text-slate-400 hover:text-teal-300 transition">
                العودة إلى الصفحة الرئيسية
            </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
