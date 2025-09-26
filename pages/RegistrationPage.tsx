import React, { useState } from 'react';
import { UserCircle } from '../components/icons';
import { RegistrationDetails } from '../types';

interface RegistrationPageProps {
  onRegister: (details: RegistrationDetails) => void;
}

const RegistrationPage: React.FC<RegistrationPageProps> = ({ onRegister }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, you'd perform registration logic here
    onRegister({ name, email, password });
  };
  
  const isFormValid = name && email && password.length >= 8;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-900 animate-fade-in">
      <div className="w-full max-w-md bg-slate-800 rounded-2xl shadow-2xl p-8 border border-slate-700">
        <div className="text-center mb-8">
            <UserCircle className="w-16 h-16 text-teal-400 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-white">إنشاء حساب العميل</h2>
            <p className="text-slate-400 mt-2">سيتم استخدام هذه البيانات لتسجيل الدخول إلى لوحة التحكم الخاصة بك.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">الاسم الكامل</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="w-full p-3 bg-slate-700 rounded-md border border-slate-600 focus:ring-2 focus:ring-teal-400 focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">البريد الإلكتروني (لتسجيل الدخول)</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full p-3 bg-slate-700 rounded-md border border-slate-600 focus:ring-2 focus:ring-teal-400 focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">كلمة المرور</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} className="w-full p-3 bg-slate-700 rounded-md border border-slate-600 focus:ring-2 focus:ring-teal-400 focus:outline-none" />
          </div>
          
          <button 
            type="submit" 
            disabled={!isFormValid}
            className="w-full bg-gradient-to-r from-teal-500 to-blue-600 text-white font-bold py-3 px-6 rounded-full hover:from-teal-600 hover:to-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed">
            إنشاء الحساب والمتابعة للدفع
          </button>
        </form>
      </div>
    </div>
  );
};

export default RegistrationPage;