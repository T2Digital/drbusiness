import React from 'react';

const PendingActivationPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center p-4 bg-slate-900 animate-fade-in">
      <div className="w-full max-w-2xl bg-slate-800 rounded-2xl shadow-2xl p-12 border border-slate-700">
        <div className="text-teal-400 mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-20 h-20 mx-auto">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
        </div>
        <h1 className="text-4xl font-extrabold text-white mb-4">
          تم استلام طلبك بنجاح!
        </h1>
        <p className="text-lg text-slate-400 mb-8">
          حسابك الآن قيد المراجعة والتفعيل من قبل الإدارة. سيتم إعلامك فور تفعيل الباقة ويمكنك بعدها تسجيل الدخول إلى لوحة التحكم الخاصة بك.
        </p>
        <p className="text-sm text-slate-500">
          يمكنك إغلاق هذه الصفحة بأمان الآن.
        </p>
      </div>
    </div>
  );
};

export default PendingActivationPage;