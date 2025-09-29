import React from 'react';

interface ConfirmationPageProps {
    onGoToDashboard: () => void;
}

const ConfirmationPage: React.FC<ConfirmationPageProps> = ({ onGoToDashboard }) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center p-4 bg-slate-900 animate-fade-in">
      <div className="w-full max-w-2xl bg-slate-800 rounded-2xl shadow-2xl p-12 border border-slate-700">
        <div className="text-green-400 mb-6">
            <svg className="w-20 h-20 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        </div>
        <h1 className="text-4xl font-extrabold text-white mb-4">
          تهانينا! تم تفعيل حسابك بنجاح.
        </h1>
        <p className="text-lg text-slate-400 mb-8">
          مرحبًا بك في لوحة تحكم دكتور بزنس. فريقنا سيتواصل معك قريبًا لبدء تنفيذ الاستراتيجية.
        </p>
        <button
          onClick={onGoToDashboard}
          className="bg-gradient-to-r from-teal-500 to-blue-600 text-white font-bold py-3 px-8 rounded-full hover:from-teal-600 hover:to-blue-700 transition"
        >
          الانتقال إلى لوحة التحكم
        </button>
      </div>
    </div>
  );
};

export default ConfirmationPage;