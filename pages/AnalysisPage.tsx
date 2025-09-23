import React, { useState, useEffect } from 'react';
import { LoadingSpinner } from '../components/icons';

const analysisSteps = [
  "جاري تحليل بيانات البزنس...",
  "دراسة الجمهور المستهدف وسلوكياته...",
  "صياغة استراتيجية نمو فريدة...",
  "بناء خطة محتوى إبداعية...",
  "الآن، نقوم بتوليد التصاميم المرئية...",
  "تحويل الأفكار إلى صور مبتكرة...",
  "إضافة اللمسات الإبداعية للتصاميم...",
  "وضع اللمسات الأخيرة على الروشتة...",
];

const AnalysisPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep(prev => (prev + 1) % analysisSteps.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center p-4 animate-fade-in">
      <div className="flex flex-col items-center">
        <LoadingSpinner className="w-16 h-16 text-teal-400 mb-8" />
        <h1 className="text-3xl font-bold text-slate-100 mb-4">يقوم دكتور بزنس بإعداد روشتتك الكاملة</h1>
        <div className="h-8">
            <p className="text-slate-400 text-lg transition-opacity duration-500 ease-in-out">
              {analysisSteps[currentStep]}
            </p>
        </div>
         <p className="text-sm text-slate-500 mt-12 max-w-md">
          هذه العملية المعقدة تضمن لك الحصول على استراتيجية دقيقة ومخصصة. قد تستغرق العملية دقيقة أو دقيقتين.
        </p>
      </div>
    </div>
  );
};

export default AnalysisPage;
