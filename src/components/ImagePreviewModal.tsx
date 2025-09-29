import React from 'react';

interface ImagePreviewModalProps {
    imageUrl: string;
    altText: string;
    onClose: () => void;
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({ imageUrl, altText, onClose }) => {
    return (
        <div 
            className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-label="Image preview"
        >
            <div 
                className="relative w-full h-full flex items-center justify-center"
                onClick={(e) => e.stopPropagation()}
            >
                <img 
                    src={imageUrl} 
                    alt={altText} 
                    className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" 
                />
                <button 
                    onClick={onClose} 
                    className="absolute top-2 right-2 bg-slate-800/70 text-white rounded-full p-2 hover:bg-slate-700 transition focus:outline-none focus:ring-2 focus:ring-white"
                    aria-label="Close image preview"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
        </div>
    );
};