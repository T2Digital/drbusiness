
import React from 'react';
import { BrainCircuitIcon } from '../components/icons';

interface LandingPageProps {
  onStart: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onStart }) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center p-4 bg-slate-900">
      <header className="mb-8">
        <div className="inline-flex items-center justify-center gap-4 mb-4">
          <BrainCircuitIcon className="w-16 h-16 text-teal-400" />
          <h1 className="text-5xl md:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-blue-500">
            دكتور بزنس
          </h1>
        </div>
        <p className="max-w-2xl mx-auto text-lg md:text-xl text-slate-400">
          منصتك المتكاملة لتحويل أفكارك إلى استراتيجيات تسويق فيروسية ومحتوى إبداعي، كل ذلك بقوة الذكاء الاصطناعي.
        </p>
      </header>
      
      <main className="mb-12">
        <button
          onClick={onStart}
          className="bg-gradient-to-r from-teal-500 to-blue-600 text-white font-bold py-4 px-10 rounded-full hover:from-teal-600 hover:to-blue-700 focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-teal-400 transition-all duration-300 transform hover:scale-110 text-lg shadow-2xl shadow-teal-500/20"
        >
          🚀 ابدأ استشارتك التسويقية المجانية
        </button>
      </main>

      <footer className="text-slate-500 text-sm">
        <p>تم التطوير بواسطة الذكاء الاصطناعي | دكتور بزنس &copy; 2024</p>
      </footer>
    </div>
  );
};

export default LandingPage;
