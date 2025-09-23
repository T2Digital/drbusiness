import React, { useState, useRef } from 'react';
import { BusinessData, MarketingGoals, TargetAudience, ConsultationData } from '../types';
import { toBase64 } from '../utils/helpers';
import { Upload } from '../components/icons';

interface ConsultationPageProps {
  onSubmit: (data: ConsultationData) => void;
}

const ConsultationPage: React.FC<ConsultationPageProps> = ({ onSubmit }) => {
  const [step, setStep] = useState(1);
  const [businessData, setBusinessData] = useState<BusinessData>({ name: '', field: '', description: '', logo: '', website: '', location: '' });
  const [marketingGoals, setMarketingGoals] = useState<MarketingGoals>({ awareness: false, sales: false, leads: false, engagement: true, other: '' });
  const [targetAudience, setTargetAudience] = useState<TargetAudience>({ description: '' });
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleNext = () => setStep(prev => prev + 1);
  const handleBack = () => setStep(prev => prev - 1);

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoPreview(URL.createObjectURL(file));
      const base64 = await toBase64(file);
      setBusinessData({ ...businessData, logo: base64 as string });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 4) {
      onSubmit({ business: businessData, goals: marketingGoals, audience: targetAudience });
    } else {
      handleNext();
    }
  };
  
  const isStep1Valid = businessData.name && businessData.field && businessData.description;
  const isStep2Valid = businessData.location; // website and logo are optional
  const isStep4Valid = targetAudience.description;
  
  const progressPercentage = (step / 4) * 100;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-900 animate-fade-in">
      <div className="w-full max-w-2xl bg-slate-800 rounded-2xl shadow-2xl p-8 border border-slate-700">
        <h2 className="text-3xl font-bold text-center mb-2 text-teal-300">الاستشارة التسويقية</h2>
        <p className="text-center text-slate-400 mb-6">أخبر دكتور بزنس عن مشروعك ليتمكن من مساعدتك</p>

        <div className="w-full bg-slate-700 rounded-full h-2.5 mb-8">
          <div className="bg-gradient-to-r from-teal-400 to-blue-500 h-2.5 rounded-full" style={{ width: `${progressPercentage}%`, transition: 'width 0.5s ease-in-out' }}></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-slate-200">الخطوة 1: عن البزنس</h3>
              <input type="text" placeholder="اسم البزنس" value={businessData.name} onChange={(e) => setBusinessData({ ...businessData, name: e.target.value })} required className="w-full p-3 bg-slate-700 rounded-md border border-slate-600 focus:ring-2 focus:ring-teal-400 focus:outline-none" />
              <input type="text" placeholder="مجال البزنس" value={businessData.field} onChange={(e) => setBusinessData({ ...businessData, field: e.target.value })} required className="w-full p-3 bg-slate-700 rounded-md border border-slate-600 focus:ring-2 focus:ring-teal-400 focus:outline-none" />
              <textarea placeholder="صف مشروعك باختصار" value={businessData.description} onChange={(e) => setBusinessData({ ...businessData, description: e.target.value })} required rows={4} className="w-full p-3 bg-slate-700 rounded-md border border-slate-600 focus:ring-2 focus:ring-teal-400 focus:outline-none"></textarea>
            </div>
          )}

          {step === 2 && (
             <div className="space-y-4">
               <h3 className="text-xl font-semibold text-slate-200">الخطوة 2: تفاصيل إضافية</h3>
               <input type="url" placeholder="الموقع الإلكتروني (اختياري)" value={businessData.website} onChange={(e) => setBusinessData({ ...businessData, website: e.target.value })} className="w-full p-3 bg-slate-700 rounded-md border border-slate-600 focus:ring-2 focus:ring-teal-400 focus:outline-none" />
               <input type="text" placeholder="المنطقة الجغرافية المستهدفة" value={businessData.location} onChange={(e) => setBusinessData({ ...businessData, location: e.target.value })} required className="w-full p-3 bg-slate-700 rounded-md border border-slate-600 focus:ring-2 focus:ring-teal-400 focus:outline-none" />
               
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">شعار البزنس (اختياري)</label>
                    <div onClick={() => fileInputRef.current?.click()} className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-600 border-dashed rounded-md cursor-pointer hover:border-teal-400">
                        <div className="space-y-1 text-center">
                            {logoPreview ? <img src={logoPreview} alt="Logo Preview" className="mx-auto h-24 w-24 object-contain" /> : <Upload className="mx-auto h-12 w-12 text-slate-500" />}
                            <div className="flex text-sm text-slate-400">
                                <p className="pl-1">{logoPreview ? 'لتغيير الشعار، انقر هنا' : 'انقر للرفع'}</p>
                            </div>
                             <p className="text-xs text-slate-500">PNG, JPG, SVG up to 2MB</p>
                        </div>
                    </div>
                    <input ref={fileInputRef} id="file-upload" name="file-upload" type="file" className="sr-only" accept="image/*" onChange={handleLogoChange}/>
                </div>
             </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-slate-200">الخطوة 3: الأهداف التسويقية</h3>
              <div className="grid grid-cols-2 gap-4">
                {Object.keys(marketingGoals).filter(k => k !== 'other').map(goal => (
                  <label key={goal} className={`flex items-center space-x-3 p-3 rounded-md cursor-pointer transition ${marketingGoals[goal as keyof Omit<MarketingGoals, 'other'>] ? 'bg-teal-800' : 'bg-slate-700 hover:bg-slate-600'}`}>
                    <input type="checkbox" checked={marketingGoals[goal as keyof Omit<MarketingGoals, 'other'>]} onChange={(e) => setMarketingGoals({ ...marketingGoals, [goal]: e.target.checked })} className="form-checkbox h-5 w-5 text-teal-400 bg-slate-800 border-slate-600 rounded focus:ring-teal-500" />
                    <span className="capitalize">{goal === 'awareness' ? 'نشر الوعي' : goal === 'sales' ? 'زيادة المبيعات' : goal === 'leads' ? 'جذب العملاء' : 'زيادة التفاعل'}</span>
                  </label>
                ))}
              </div>
              <input type="text" placeholder="أهداف أخرى؟" value={marketingGoals.other} onChange={(e) => setMarketingGoals({ ...marketingGoals, other: e.target.value })} className="w-full p-3 bg-slate-700 rounded-md border border-slate-600 focus:ring-2 focus:ring-teal-400 focus:outline-none" />
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
               <h3 className="text-xl font-semibold text-slate-200">الخطوة 4: الجمهور المستهدف</h3>
               <textarea placeholder="صف عميلك المثالي بالتفصيل" value={targetAudience.description} onChange={(e) => setTargetAudience({ ...targetAudience, description: e.target.value })} required rows={5} className="w-full p-3 bg-slate-700 rounded-md border border-slate-600 focus:ring-2 focus:ring-teal-400 focus:outline-none"></textarea>
            </div>
          )}

          <div className="flex justify-between pt-4">
            {step > 1 ? (
              <button type="button" onClick={handleBack} className="bg-slate-600 text-white font-bold py-2 px-6 rounded-full hover:bg-slate-500 transition">السابق</button>
            ) : <div></div>}
            
            <button 
              type="submit" 
              disabled={(step === 1 && !isStep1Valid) || (step === 2 && !isStep2Valid) || (step === 4 && !isStep4Valid)}
              className="bg-gradient-to-r from-teal-500 to-blue-600 text-white font-bold py-2 px-6 rounded-full hover:from-teal-600 hover:to-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed">
              {step === 4 ? 'احصل على الروشتة' : 'التالي'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ConsultationPage;
