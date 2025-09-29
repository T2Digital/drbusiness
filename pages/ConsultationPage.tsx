
import React, { useState, useRef, useEffect } from 'react';
import { BusinessData, MarketingGoals, TargetAudience, ConsultationData } from '../types';
import { toBase64 } from '../utils/helpers';
import { Upload, UserCircle } from '../components/icons';
import { AboutModal } from '../components/AboutModal';


interface ConsultationPageProps {
  onSubmit: (data: ConsultationData) => void;
  onBackToHome: () => void;
  onLogin: () => void;
}

type Message = {
    sender: 'bot' | 'user';
    text?: string;
    options?: string[];
    isLogoUpload?: boolean;
    isFinished?: boolean;
};

const ConsultationPage: React.FC<ConsultationPageProps> = ({ onSubmit, onBackToHome, onLogin }) => {
  const [data, setData] = useState<ConsultationData>({
    business: { name: '', field: '', description: '', logo: '', website: '', location: '' },
    goals: { awareness: false, sales: false, leads: false, engagement: true, other: '' },
    audience: { description: '' },
  });
  const [messages, setMessages] = useState<Message[]>([{ sender: 'bot', text: 'أهلاً يا وحش! أنا دكتور بزنس، وجاهز أعملك روشتة تسويق تكسر الدنيا. عشان نبدأ، إيه اسم البراند بتاعك؟' }]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isAboutModalOpen, setAboutModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const questions = [
    { key: 'business.name', question: 'عاش! طب وإيه مجال البيزنس؟ (قوللي مثلاً: مطعم، براند لبس، تطبيق موبايل)' },
    { key: 'business.description', question: 'تمام أوي. في سطرين كده، احكيلي قصة البيزنس بتاعك بشكل يشدني.' },
    { key: 'business.location', question: 'البيزنس بتاعك بيخدم مين وفين؟ (مثلاً: القاهرة كلها، شباب الجامعات في مصر، إلخ)' },
    { key: 'business.website', question: 'عندك ويبسايت أو صفحة أونلاين؟ ارميلي اللينك. (لو مفيش، اكتب "لسه")' },
    { key: 'business.logo', question: 'ارفعلي لوجو البراند عشان أظبطلك عليه أحلى شغل. لو مش جاهز، عادي.' , isLogoUpload: true },
    { key: 'goals', question: 'حلو الكلام. إيه أكتر حاجة نفسك تحققها؟ اختار كل اللي في بالك.', options: ['الناس كلها تعرفني', 'أبيع أكتر وأكسب فلوس', 'أجمع بيانات عملاء مهتمين', 'أعمل قلبان على السوشيال ميديا'] },
    { key: 'audience.description', question: 'آخر وأهم سؤال: مين هو العميل اللي بتبيعله؟ أوصفهولي كأنك بتكلمني عن صاحبك الانتيم.' },
  ];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);
  
  const addMessage = (message: Message) => {
    setMessages(prev => [...prev, message]);
  };

  const handleNextQuestion = (delay = 1000) => {
    const nextQIndex = currentQuestion + 1;
    if (nextQIndex < questions.length) {
        setTimeout(() => {
            setIsTyping(true);
            setTimeout(() => {
                const nextQ = questions[nextQIndex];
                addMessage({ sender: 'bot', text: nextQ.question, options: nextQ.options, isLogoUpload: nextQ.isLogoUpload });
                setCurrentQuestion(nextQIndex);
                setIsTyping(false);
            }, 800);
        }, delay);
    } else {
        setTimeout(() => {
             setIsTyping(true);
             setTimeout(() => {
                addMessage({ sender: 'bot', text: 'وحش! كده معايا كل اللي محتاجه. ثواني وهتكون روشتة التسويق الفيروسية بتاعتك جاهزة. استعد للقلقان!', isFinished: true });
                setIsTyping(false);
             }, 800)
        }, delay);
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => setInputValue(e.target.value);

  const handleSend = () => {
    if (!inputValue.trim()) return;
    addMessage({ sender: 'user', text: inputValue });
    const { key } = questions[currentQuestion];
    const keys = key.split('.');
    if (keys.length > 1) {
        setData(prev => ({
            ...prev,
            [keys[0]]: { ...prev[keys[0] as keyof ConsultationData], [keys[1]]: inputValue }
        }));
    }
    setInputValue('');
    handleNextQuestion();
  };
  
  const handleOptionClick = (option: string) => {
    addMessage({ sender: 'user', text: option });
    const goalMap: { [key: string]: keyof MarketingGoals } = {
        'الناس كلها تعرفني': 'awareness', 'أبيع أكتر وأكسب فلوس': 'sales', 'أجمع بيانات عملاء مهتمين': 'leads', 'أعمل قلبان على السوشيال ميديا': 'engagement'
    };
    const goalKey = goalMap[option];
    if (goalKey) {
        setData(prev => ({
            ...prev,
            goals: { ...prev.goals, [goalKey]: !prev.goals[goalKey] }
        }));
    }
    // We don't move to the next question immediately to allow multiple selections
  };
  
  const handleGoalsDone = () => {
    const selectedGoals = Object.entries(data.goals).filter(([, val]) => val === true).map(([key]) => key).join(', ');
    addMessage({sender: 'user', text: `تمام، دي أهدافي.`});
    handleNextQuestion();
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const base64 = await toBase64(file) as string;
      setData(prev => ({ ...prev, business: { ...prev.business, logo: base64 } }));
      addMessage({ sender: 'user', text: `اللوجو وصل: ${file.name}` });
      handleNextQuestion();
    }
  };

  const handleSkipLogo = () => {
     addMessage({ sender: 'user', text: 'فكك من اللوجو دلوقتي' });
     handleNextQuestion();
  }
  
  return (
    <>
    <div className="h-screen flex flex-col items-center p-2 sm:p-4 bg-slate-900 animate-fade-in relative">
      <header className="w-full p-4 z-20 shrink-0">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
             <div className="flex items-center gap-4">
                <button onClick={onBackToHome} className="text-slate-400 hover:text-white transition text-sm font-semibold">الرئيسية</button>
                <button onClick={() => setAboutModalOpen(true)} className="text-slate-400 hover:text-white transition text-sm font-semibold">مين إحنا</button>
             </div>
             <button onClick={onLogin} className="bg-slate-800/50 text-white font-bold py-2 px-5 rounded-full hover:bg-slate-700/70 transition backdrop-blur-sm text-sm">
                تسجيل الدخول
            </button>
        </div>
      </header>
      <div className="w-full max-w-2xl flex-1 flex flex-col bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 mb-4 overflow-hidden">
        <div className="p-4 border-b border-slate-700 flex items-center gap-3">
          <img src="https://i.ibb.co/C3jQ6GWD/a33b552d00ae.png" alt="Logo" className="w-8 h-8"/>
          <div>
            <h2 className="text-xl font-bold text-white">دكتور بزنس</h2>
            <p className="text-sm text-slate-400">الاستشارة اللي هتغير البيزنس بتاعك</p>
          </div>
        </div>
        
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {messages.map((msg, index) => (
                <div key={index} className={`flex items-end gap-2 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex-shrink-0 bg-slate-700 flex items-center justify-center`}>
                        {msg.sender === 'bot' ? <img src="https://i.ibb.co/C3jQ6GWD/a33b552d00ae.png" alt="Logo" className="w-5 h-5"/> : <UserCircle className="w-5 h-5 text-slate-300" />}
                    </div>
                    <div className={`max-w-md p-3 rounded-lg ${msg.sender === 'bot' ? 'bg-slate-700 text-slate-200 rounded-bl-none' : 'bg-teal-600 text-white rounded-br-none'}`}>
                       <p className="whitespace-pre-wrap">{msg.text}</p>
                       {msg.options && (
                           <div className="mt-3 space-y-2">
                               {msg.options.map(opt => <button key={opt} onClick={() => handleOptionClick(opt)} className={`w-full text-left p-2 rounded-md transition ${data.goals[goalMap[opt] as keyof MarketingGoals] ? 'bg-teal-700' : 'bg-slate-600 hover:bg-slate-500'}`}>{opt}</button>)}
                               <button onClick={handleGoalsDone} className="w-full p-2 rounded-md bg-blue-600 hover:bg-blue-500 transition font-bold mt-2">تمام كده</button>
                           </div>
                       )}
                       {msg.isLogoUpload && (
                           <div className="mt-3 flex gap-2">
                                <button onClick={() => fileInputRef.current?.click()} className="flex-1 p-2 rounded-md bg-slate-600 hover:bg-slate-500 transition">ارفع اللوجو</button>
                                <button onClick={handleSkipLogo} className="flex-1 p-2 rounded-md bg-slate-800 hover:bg-slate-700 transition">عديها</button>
                                <input ref={fileInputRef} type="file" className="sr-only" accept="image/*" onChange={handleLogoChange}/>
                           </div>
                       )}
                       {msg.isFinished && (
                           <div className="mt-3">
                               <button onClick={() => onSubmit(data)} className="w-full p-3 rounded-md bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-600 hover:to-blue-700 transition font-bold">🔥 وريني الروشتة حالا</button>
                           </div>
                       )}
                    </div>
                </div>
            ))}
             {isTyping && (
                <div className="flex items-end gap-2">
                    <div className="w-8 h-8 rounded-full flex-shrink-0 bg-slate-700 flex items-center justify-center">
                        <img src="https://i.ibb.co/C3jQ6GWD/a33b552d00ae.png" alt="Logo" className="w-5 h-5"/>
                    </div>
                    <div className="max-w-md p-3 rounded-lg bg-slate-700 rounded-bl-none">
                       <div className="flex items-center gap-1">
                           <span className="w-2 h-2 bg-slate-400 rounded-full animate-pulse"></span>
                           <span className="w-2 h-2 bg-slate-400 rounded-full animate-pulse delay-150"></span>
                           <span className="w-2 h-2 bg-slate-400 rounded-full animate-pulse delay-300"></span>
                       </div>
                    </div>
                </div>
            )}
            <div ref={chatEndRef} />
        </div>

        <div className="p-4 border-t border-slate-700">
             {currentQuestion < questions.length && questions[currentQuestion] && !questions[currentQuestion].options && !questions[currentQuestion].isLogoUpload && (
                <div className="flex gap-2">
                    <input type="text" value={inputValue} onChange={handleInputChange} onKeyPress={(e) => e.key === 'Enter' && handleSend()} placeholder="اكتب ردك هنا..." className="flex-1 p-3 bg-slate-700 rounded-full border border-slate-600 focus:ring-2 focus:ring-teal-400 focus:outline-none" />
                    <button onClick={handleSend} className="bg-teal-500 text-white font-bold p-3 rounded-full hover:bg-teal-600 transition disabled:opacity-50" disabled={!inputValue.trim()}>ابعت</button>
                </div>
             )}
        </div>
      </div>
    </div>
    <AboutModal isOpen={isAboutModalOpen} onClose={() => setAboutModalOpen(false)} />
    </>
  );
};
const goalMap: { [key: string]: string } = { 'الناس كلها تعرفني': 'awareness', 'أبيع أكتر وأكسب فلوس': 'sales', 'أجمع بيانات عملاء مهتمين': 'leads', 'أعمل قلبان على السوشيال ميديا': 'engagement' };


export default ConsultationPage;
