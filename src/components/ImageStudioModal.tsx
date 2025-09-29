import React, { useState, useEffect, useRef } from 'react';
import { Client, PostWithStatus } from '../types';
import { imageService, ImageSearchResult } from '../services/imageService';
import { enhanceVisualPrompt } from '../services/geminiService';
import { LoadingSpinner, Wand2Icon, SparklesIcon } from './icons';

interface ImageStudioModalProps {
    post: PostWithStatus;
    client: Client;
    onClose: () => void;
    onSave: (postId: string, imageUrl: string) => void;
}

type StudioTab = 'gemini' | 'openrouter' | 'unsplash' | 'pixabay';

export const ImageStudioModal: React.FC<ImageStudioModalProps> = ({ post, client, onClose, onSave }) => {
    const [activeTab, setActiveTab] = useState<StudioTab>('gemini');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchResults, setSearchResults] = useState<ImageSearchResult[]>([]);
    const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
    const [prompt, setPrompt] = useState(post.visualPrompt);
    const [isEnhancing, setIsEnhancing] = useState(false);
    const [finalBrandedImage, setFinalBrandedImage] = useState<string | null>(null);
    const [addLogo, setAddLogo] = useState(true); // Default to true for automatic logo integration
    const isProcessingSave = useRef(false);

    const handleEnhancePrompt = async () => {
        setIsEnhancing(true);
        try {
            const enhanced = await enhanceVisualPrompt(prompt);
            setPrompt(enhanced);
        } catch (e) {
            console.error("Failed to enhance prompt", e);
        } finally {
            setIsEnhancing(false);
        }
    };
    
    const handleGenerate = async (generator: 'gemini' | 'openrouter') => {
        setIsLoading(true);
        setError(null);
        setSearchResults([]);
        isProcessingSave.current = true;
        try {
            let imageBase64;
            const logoUrl = addLogo ? client.consultationData.business.logo : undefined;

            if (generator === 'gemini') {
                const generatedImage = await imageService.generateWithGemini(prompt);
                imageBase64 = await imageService.brandImageWithCanvas(generatedImage, logoUrl);
            } else {
                const generatedImage = await imageService.generateWithOpenRouter(prompt);
                imageBase64 = await imageService.brandImageWithCanvas(generatedImage, logoUrl);
            }
             const finalUrl = await imageService.uploadImage(imageBase64);
             onSave(post.id, finalUrl);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
            isProcessingSave.current = false;
        }
    };

    const handleSearch = async (searcher: 'unsplash' | 'pixabay') => {
        setIsLoading(true);
        setError(null);
        setSearchResults([]);
        try {
            const results = searcher === 'unsplash'
                ? await imageService.searchUnsplash(prompt)
                : await imageService.searchPixabay(prompt);
            setSearchResults(results);
        } catch (e) {
             setError(e instanceof Error ? e.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    };
    
    useEffect(() => {
        if(selectedImageUrl) {
            const brandAndDisplay = async () => {
                try {
                     const logoUrl = addLogo ? client.consultationData.business.logo : undefined;
                     const brandedImageB64 = await imageService.brandImageWithCanvas(selectedImageUrl, logoUrl);
                     setFinalBrandedImage(brandedImageB64);
                } catch (e) {
                     console.error("Failed to brand image with canvas", e);
                     // fallback to just showing the image if branding fails
                     setFinalBrandedImage(selectedImageUrl);
                }
            }
            brandAndDisplay();
        }
    }, [selectedImageUrl, client.consultationData.business.logo, addLogo]);

    const handleSaveSelection = async () => {
        if (finalBrandedImage && !isProcessingSave.current) {
            isProcessingSave.current = true;
            setIsLoading(true);
            try {
                const finalUrl = await imageService.uploadImage(finalBrandedImage);
                onSave(post.id, finalUrl);
            } catch (e) {
                setError(e instanceof Error ? e.message : 'Failed to save image.');
            } finally {
                setIsLoading(false);
                isProcessingSave.current = false;
            }
        }
    }

    const renderTabContent = () => {
        if (selectedImageUrl) {
            return (
                <div className="flex flex-col items-center p-4">
                    {finalBrandedImage ? 
                        <img src={finalBrandedImage} className="max-w-full h-auto max-h-[50vh] rounded-lg border border-slate-600"/>
                        : <div className="aspect-square w-full max-w-md flex items-center justify-center"><LoadingSpinner className="w-8 h-8"/></div>
                    }
                    <div className="mt-4 flex gap-4 items-center">
                        <button onClick={() => setSelectedImageUrl(null)} className="bg-slate-600 text-white font-bold py-2 px-4 rounded-md hover:bg-slate-500 transition">العودة للبحث</button>
                        <button onClick={handleSaveSelection} disabled={isLoading} className="bg-teal-600 text-white font-bold py-2 px-4 rounded-md hover:bg-teal-500 transition disabled:opacity-50">
                            {isLoading ? 'جاري الحفظ...' : 'حفظ التصميم'}
                        </button>
                    </div>
                </div>
            )
        }

        if (isLoading) {
            return <div className="flex justify-center items-center h-64"><LoadingSpinner className="w-12 h-12 text-teal-400" /></div>
        }
        if (error) {
            return <div className="text-center text-red-400 p-8">{error}</div>
        }
        
        switch (activeTab) {
            case 'gemini':
            case 'openrouter':
                return (
                    <div className="text-center p-6">
                        <h3 className="text-xl font-bold mb-2">توليد صورة بالذكاء الاصطناعي</h3>
                        <p className="text-slate-400 mb-4 max-w-lg mx-auto">عدّل الوصف للحصول على أفضل النتائج، أو استخدم مساعد الذكاء الاصطناعي لتحسينه.</p>
                        <div className="relative">
                            <textarea 
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                rows={4}
                                className="w-full p-3 pr-28 bg-slate-700/50 rounded-md border border-slate-600 focus:ring-2 focus:ring-teal-400 focus:outline-none font-mono text-sm"
                            />
                            <button onClick={handleEnhancePrompt} disabled={isEnhancing} className="absolute top-2 right-2 flex items-center gap-1.5 bg-slate-600 text-white font-bold py-1 px-3 rounded-md hover:bg-slate-500 transition text-xs disabled:opacity-50">
                                {isEnhancing ? <LoadingSpinner className="w-4 h-4" /> : <SparklesIcon className="w-4 h-4 text-teal-300" />}
                                تحسين
                            </button>
                        </div>
                        <div className="flex justify-center mt-4">
                            <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                                <input type="checkbox" checked={addLogo} onChange={(e) => setAddLogo(e.target.checked)} className="h-4 w-4 rounded bg-slate-600 border-slate-500 text-teal-500 focus:ring-teal-500" />
                                إضافة لوجو البيزنس
                            </label>
                        </div>
                        <button onClick={() => handleGenerate(activeTab)} className="bg-gradient-to-r from-teal-500 to-blue-600 text-white font-bold py-3 px-6 rounded-full hover:from-teal-600 hover:to-blue-700 transition flex items-center gap-2 mx-auto mt-4">
                           <Wand2Icon className="w-5 h-5"/> {`إنشاء باستخدام ${activeTab === 'gemini' ? 'Gemini' : 'Stable Diffusion'}`}
                        </button>
                    </div>
                )
            case 'unsplash':
            case 'pixabay':
                return (
                    <div>
                         <div className="text-center p-4">
                            <p className="text-sm text-slate-400 mb-2">البحث عن صور بناءً على الوصف:</p>
                             <p className="bg-slate-700/50 p-2 rounded-md text-slate-300 mb-4 font-mono text-xs max-w-md mx-auto truncate">"{prompt}"</p>
                            <div className="flex justify-center items-center gap-4">
                                <button onClick={() => handleSearch(activeTab)} className="bg-slate-600 text-white font-bold py-2 px-4 rounded-md hover:bg-slate-500 transition">
                                    {`ابحث في ${activeTab === 'unsplash' ? 'Unsplash' : 'Pixabay'}`}
                                </button>
                                <label className="flex items-center gap-2 text-slate-300 cursor-pointer text-sm">
                                <input type="checkbox" checked={addLogo} onChange={(e) => setAddLogo(e.target.checked)} className="h-4 w-4 rounded bg-slate-600 border-slate-500 text-teal-500 focus:ring-teal-500" />
                                إضافة اللوجو
                            </label>
                            </div>
                         </div>
                         {searchResults.length > 0 && (
                             <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-h-[60vh] overflow-y-auto p-4">
                                 {searchResults.map(img => (
                                     <div key={img.id} className="aspect-square bg-slate-700 rounded-lg overflow-hidden cursor-pointer group" onClick={() => setSelectedImageUrl(img.fullUrl)}>
                                         <img src={img.url} alt={img.alt} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"/>
                                     </div>
                                 ))}
                             </div>
                         )}
                    </div>
                )
        }
    };


    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 animate-fade-in" onClick={onClose}>
            <div className="bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-slate-700" onClick={(e) => e.stopPropagation()}>
                <header className="p-4 border-b border-slate-700">
                    <h2 className="text-xl font-bold text-white">استوديو التصميم الإبداعي</h2>
                    <p className="text-sm text-slate-400">اختر المصدر لإنشاء أو العثور على الصورة المثالية لمنشورك.</p>
                </header>

                <div className="flex border-b border-slate-700 overflow-x-auto">
                    <TabButton name="AI (Gemini)" isActive={activeTab === 'gemini'} onClick={() => setActiveTab('gemini')} />
                    <TabButton name="AI (Advanced)" isActive={activeTab === 'openrouter'} onClick={() => setActiveTab('openrouter')} />
                    <TabButton name="Unsplash" isActive={activeTab === 'unsplash'} onClick={() => setActiveTab('unsplash')} />
                    <TabButton name="Pixabay" isActive={activeTab === 'pixabay'} onClick={() => setActiveTab('pixabay')} />
                </div>
                
                <div className="flex-1 overflow-y-auto">
                    {renderTabContent()}
                </div>
            </div>
        </div>
    );
};

const TabButton: React.FC<{name: string, isActive: boolean, onClick: () => void}> = ({ name, isActive, onClick }) => (
    <button onClick={onClick} className={`flex-1 py-3 px-2 text-center font-semibold transition-colors whitespace-nowrap min-w-[120px] ${isActive ? 'bg-slate-700 text-teal-300' : 'text-slate-400 hover:bg-slate-700/50'}`}>
        {name}
    </button>
);