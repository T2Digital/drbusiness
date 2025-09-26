import React, { useState, useEffect } from 'react';
import { LoadingSpinner } from '../components/icons';

const analysisSteps = [
  "بنفك شفرة البيزنس بتاعك...",
  "بندخل جوه عقل العميل المستهدف...",
  "بنطبخلك خلطة النمو السحرية...",
  "بنجهز محتوى هيولع السوشيال ميديا...",
  "الذكاء الاصطناعي بيرسم الأفكار...",
  "بنحول الكلام لصور تجيب تفاعل...",
  "اللمسات الأخيرة على خطة السيطرة...",
];

const AnalysisPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep(prev => (prev >= analysisSteps.length -1) ? prev : prev + 1);
    }, 3500); // Slower interval to account for image generation
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center p-4 animate-fade-in">
      <div className="flex flex-col items-center">
        <LoadingSpinner className="w-16 h-16 text-teal-400 mb-8" />
        <h1 className="text-3xl font-bold text-slate-100 mb-4">دكتور بزنس بيجهزلك الروشتة الفيروسية</h1>
        <div className="h-8">
            <p className="text-slate-400 text-lg transition-opacity duration-500 ease-in-out">
              {analysisSteps[currentStep]}
            </p>
        </div>
         <p className="text-sm text-slate-500 mt-12 max-w-md">
          العملية دي دقيقة وبتاخد وقتها عشان نضمنلك خطة تكسر الدنيا. الموضوع ممكن ياخد دقيقتين تلاتة عشان بنولدلك الصور كمان. خليك معانا.
        </p>
      </div>
    </div>
  );
};

export default AnalysisPage;