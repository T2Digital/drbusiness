
import React, { useState, useEffect } from 'react';
import { Prescription, VisualIdea } from '../types';
import { generateImage } from '../services/geminiService';
import { LoadingSpinner } from '../components/icons';

interface PrescriptionPageProps {
  prescription: Prescription | null;
  onProceed: () => void;
  error: string | null;
}

const PrescriptionPage: React.FC<PrescriptionPageProps> = ({ prescription, onProceed, error }) => {
    const [visuals, setVisuals] = useState<(VisualIdea & { isLoading: boolean })[]>([]);

    useEffect(() => {
        if (prescription?.visualIdeas) {
            const initialVisuals = prescription.visualIdeas.map(v => ({ ...v, isLoading: true, generatedImage: undefined }));
            setVisuals(initialVisuals);

            initialVisuals.forEach((idea, index) => {
                generateImage(idea.description)
                    .then(imageData => {
                        setVisuals(prev => {
                            const newVisuals = [...prev];
                            newVisuals[index] = { ...newVisuals[index], generatedImage: imageData, isLoading: false };
                            return newVisuals;
                        });
                    })
                    .catch(err => {
                        console.error(`Failed to generate image for: ${idea.description}`, err);
                        setVisuals(prev => {
                            const newVisuals = [...prev];
                            newVisuals[index] = { ...newVisuals[index], isLoading: false }; // Stop loading on error
                            return newVisuals;
                        });
                    });
            });
        }
    }, [prescription]);

    if (error) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center text-center p-4">
          <h2 className="text-3xl font-bold text-red-400 mb-4">حدث خطأ</h2>
          <p className="text-slate-400 max-w-lg">{error}</p>
          <button onClick={() => window.location.reload()} className="mt-8 bg-gradient-to-r from-teal-500 to-blue-600 text-white font-bold py-2 px-6 rounded-full hover:from-teal-600 hover:to-blue-700 transition">
            حاول مرة أخرى
          </button>
        </div>
      )
    }

    if (!prescription) {
        return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner className="w-12 h-12 text-teal-400" /></div>;
    }

    return (
        <div className="min-h-screen bg-slate-900 text-white p-4 sm:p-8 animate-fade-in">
            <div className="max-w-5xl mx-auto">
                <header className="text-center mb-12">
                    <h1 className="text-4xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-blue-500">
                        روشتة التسويق الخاصة بك
                    </h1>
                    <p className="mt-4 text-lg text-slate-400">
                        خطة مخصصة من دكتور بزنس لدفع علامتك التجارية نحو النجاح.
                    </p>
                </header>

                <section className="mb-12 bg-slate-800 p-8 rounded-2xl border border-slate-700 shadow-lg">
                    <h2 className="text-3xl font-bold text-teal-300 mb-4">{prescription.strategy.title}</h2>
                    <p className="text-slate-300 mb-6">{prescription.strategy.summary}</p>
                    <div className="space-y-4">
                        {prescription.strategy.steps.map((step, i) => (
                            <div key={i} className="flex items-start">
                                <div className="flex-shrink-0 w-8 h-8 bg-teal-500/20 text-teal-300 rounded-full flex items-center justify-center font-bold mr-4">{i + 1}</div>
                                <p className="text-slate-300">{step}</p>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="mb-12">
                    <h2 className="text-3xl font-bold text-center mb-8 text-white">أفكار محتوى إبداعية</h2>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {prescription.contentIdeas.map((idea, i) => (
                            <div key={i} className="bg-slate-800 p-6 rounded-xl border border-slate-700 transform hover:-translate-y-2 transition-transform duration-300">
                                <span className="inline-block bg-blue-500/20 text-blue-300 text-sm font-semibold px-3 py-1 rounded-full mb-3">{idea.platform} - {idea.format}</span>
                                <h3 className="text-xl font-bold text-slate-100 mb-2">{idea.title}</h3>
                                <p className="text-slate-400">{idea.description}</p>
                            </div>
                        ))}
                    </div>
                </section>
                
                <section className="mb-12">
                     <h2 className="text-3xl font-bold text-center mb-8 text-white">تصورات بصرية مقترحة</h2>
                     <div className="grid md:grid-cols-3 gap-6">
                        {visuals.map((idea, i) => (
                             <div key={i} className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                                <div className="aspect-square bg-slate-700 flex items-center justify-center">
                                    {idea.isLoading ? (
                                        <LoadingSpinner className="w-10 h-10 text-slate-500" />
                                    ) : idea.generatedImage ? (
                                        <img src={`data:image/jpeg;base64,${idea.generatedImage}`} alt={idea.description} className="w-full h-full object-cover"/>
                                    ) : (
                                       <div className="p-4 text-center text-slate-500">فشل في توليد الصورة</div>
                                    )}
                                </div>
                                <div className="p-4">
                                    <p className="text-slate-400 text-sm">{idea.description}</p>
                                </div>
                            </div>
                        ))}
                     </div>
                </section>

                <footer className="text-center">
                     <button
                        onClick={onProceed}
                        className="bg-gradient-to-r from-teal-500 to-blue-600 text-white font-bold py-4 px-10 rounded-full hover:from-teal-600 hover:to-blue-700 focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-teal-400 transition-all duration-300 transform hover:scale-110 text-lg shadow-2xl shadow-teal-500/20"
                    >
                        الخطوة التالية: اختر باقتك
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default PrescriptionPage;
