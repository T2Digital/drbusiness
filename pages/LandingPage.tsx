import React, { useState } from 'react';
import { AboutModal } from '../components/AboutModal';

interface LandingPageProps {
  onStart: () => void;
  onLogin: () => void;
  onAdmin: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onStart, onLogin, onAdmin }) => {
  const [isAboutModalOpen, setAboutModalOpen] = useState(false);
  const logoUrl = "https://i.ibb.co/C3jQ6GWD/a33b552d00ae.png";

  return (
    <>
    <div className="min-h-screen flex flex-col items-center justify-center text-center p-4 bg-slate-900 relative overflow-hidden">
      
      <div className="absolute top-0 left-0 -translate-x-1/3 -translate-y-1/3 w-[40vw] h-[40vw] max-w-[600px] max-h-[600px] bg-teal-500/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-0 translate-x-1/3 translate-y-1/3 w-[40vw] h-[40vw] max-w-[600px] max-h-[600px] bg-blue-500/10 rounded-full blur-3xl"></div>

      <nav className="absolute top-0 right-0 p-4 sm:p-6">
        <button onClick={onLogin} className="bg-slate-800/50 text-white font-bold py-2 px-5 sm:px-6 rounded-full hover:bg-slate-700/70 transition backdrop-blur-sm text-sm sm:text-base">
          تسجيل الدخول
        </button>
      </nav>

      <div className="relative z-10">
        <header className="mb-8">
          <div className="inline-flex items-center justify-center gap-3 sm:gap-4 mb-4">
            <img src={logoUrl} alt="Dr. Business Logo" className="w-12 h-12 sm:w-16 sm:h-16" />
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-blue-500">
              دكتور بزنس
            </h1>
          </div>
          <p className="max-w-2xl mx-auto text-base sm:text-lg md:text-xl text-slate-400">
            خطتك التسويقية في ثواني. حوّل فكرتك لبيزنس فيروسي بالذكاء الاصطناعي.
          </p>
        </header>
        
        <main className="mb-12">
          <button
            onClick={onStart}
            className="bg-gradient-to-r from-teal-500 to-blue-600 text-white font-bold py-3 px-8 sm:py-4 sm:px-10 rounded-full hover:from-teal-600 hover:to-blue-700 focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-teal-400 transition-all duration-300 transform hover:scale-105 text-base sm:text-lg shadow-2xl shadow-teal-500/20"
          >
            🚀 يلا نبني إمبراطوريتك
          </button>
        </main>
      </div>

      <section id="about" className="relative z-10 w-full max-w-4xl p-6 sm:p-8 bg-slate-800/50 rounded-2xl border border-slate-700 backdrop-blur-sm">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4 text-white">إيه حكاية دكتور بزنس؟</h2>
          <p className="text-center text-slate-300 leading-relaxed text-sm sm:text-base">
            مش مجرد برنامج، أنا شريكك الذكي في النجاح. بخبرة السوق المصري وقوة الذكاء الاصطناعي، بقدملك "روشتة" تسويق متكاملة... من الفكرة للتنفيذ الفيروسي. جاهز تكسر الدنيا؟
          </p>
      </section>

      <footer className="relative z-10 text-slate-500 text-xs sm:text-sm mt-12">
        <div className="flex gap-4">
          <button onClick={() => setAboutModalOpen(true)} className="hover:text-teal-400 transition">مين إحنا</button>
          <span>|</span>
          <button onClick={onAdmin} className="hover:text-teal-400 transition">لوحة تحكم الأدمن</button>
        </div>
        <p className="mt-2">تم التطوير بواسطة الذكاء الاصطناعي | دكتور بزنس &copy; 2024</p>
      </footer>
    </div>
    <AboutModal isOpen={isAboutModalOpen} onClose={() => setAboutModalOpen(false)} />
    </>
  );
};

export default LandingPage;