import React from 'react';
import { BrainCircuitIcon } from './icons';

interface AboutModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in"
            onClick={onClose}
        >
            <div 
                className="bg-slate-800 rounded-2xl shadow-xl w-full max-w-2xl p-8 border border-slate-700 relative text-center"
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
            >
                <div className="inline-flex items-center justify-center gap-4 mb-4">
                    <BrainCircuitIcon className="w-12 h-12 text-teal-400" />
                    <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-blue-500">
                        دكتور بزنس
                    </h2>
                </div>
                <h3 className="text-xl font-bold text-white mt-4 mb-2">رؤيتنا</h3>
                <p className="text-slate-300 mb-6">
                    تمكين كل رائد أعمال وصاحب بزنس في العالم العربي من خلال توفير استراتيجيات تسويق ذكية ومؤتمتة، تحول الأفكار إلى واقع ملموس ونجاح مستدام.
                </p>
                <h3 className="text-xl font-bold text-white mb-2">مهمتنا</h3>
                <p className="text-slate-300 mb-8">
                    نحن نستخدم أحدث تقنيات الذكاء الاصطناعي لتحليل الأسواق، فهم الجماهير، وبناء خطط تسويقية كاملة من الألف إلى الياء. مهمتنا هي جعل التسويق الاحترافي في متناول الجميع، بضغطة زر.
                </p>
                <button onClick={onClose} className="bg-teal-600 text-white font-bold py-2 px-6 rounded-full hover:bg-teal-500 transition">
                    إغلاق
                </button>
            </div>
        </div>
    );
};
