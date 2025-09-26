import React, { useState, useEffect, useRef } from 'react';
import { Client } from '../types';
import { PostWithStatus } from '../pages/ClientDashboardPage';
import { imageService, ImageSearchResult } from '../services/imageService';
import { LoadingSpinner, Wand2Icon } from './icons';

interface ImageStudioModalProps {
    post: PostWithStatus;
    client: Client;
    onClose: () => void;
    onSave: (postId: string, imageBase64: string) => void;
}

type StudioTab = 'gemini' | 'openrouter' | 'unsplash' | 'pixabay';

export const ImageStudioModal: React.FC<ImageStudioModalProps> = ({ post, client, onClose, onSave }) => {
    const [activeTab, setActiveTab] = useState<StudioTab>('gemini');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchResults, setSearchResults] = useState<ImageSearchResult[]>([]);
    const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const handleGenerate = async (generator: 'gemini' | 'openrouter') => {
        setIsLoading(true);
        setError(null);
        setSearchResults([]);
        try {
            let imageBase64;
            if (generator === 'gemini') {
                // Gemini function already includes branding as a fallback
                imageBase64 = await imageService.generateWithGemini(post.visualPrompt);
            } else {
                const generatedImage = await imageService.generateWithOpenRouter(post.visualPrompt);
                // We need to brand it separately
                imageBase64 = client.consultationData.business.logo
                    ? await imageService.brandImage(generatedImage, client.consultationData.business.logo)
                    : generatedImage;
            }
             onSave(post.id, `data:image/jpeg;base64,${imageBase64}`);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearch = async (searcher: 'unsplash' | 'pixabay') => {
        setIsLoading(true);
        setError(null);
        setSearchResults([]);
        try {
            const results = searcher === 'unsplash'
                ? await imageService.searchUnsplash(post.visualPrompt)
                : await imageService.searchPixabay(post.visualPrompt);
            setSearchResults(results);
        } catch (e) {
             setError(e instanceof Error ? e.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    };
    
    useEffect(() => {
        if(selectedImageUrl && canvasRef.current && client.consultationData.business.logo) {
            const brandAndDisplay = async () => {
                 try {
                     const brandedImage = await imageService.brandImageWithCanvas(selectedImageUrl, client.consultationData.business.logo);
                     const ctx = canvasRef.current?.getContext('2d');
                     if(ctx) {
                         const img = new Image();
                         img.src = brandedImage;
                         img.onload = () => {
                             canvasRef.current!.width = img.width;
                             canvasRef.current!.height = img.height;
                             ctx.drawImage(img, 0, 0);
                         }
                     }
                 } catch (e) {
                     console.error("Failed to brand image with canvas", e);
                     // fallback to just showing the image
                     const ctx = canvasRef.current?.getContext('2d');
                     if(ctx) {
                         const img = new Image();
                         img.crossOrigin = "Anonymous";
                         img.src = selectedImageUrl;
                         img.onload = () => {
                             canvasRef.current!.width = img.width;
                             canvasRef.current!.height = img.height;
                             ctx.drawImage(img, 0, 0);
                         }
                     }
                 }
            }
            brandAndDisplay();
        } else if (selectedImageUrl && canvasRef.current) {
            // No logo, just draw the image
            const ctx = canvasRef.current?.getContext('2d');
            if(ctx) {
                const img = new Image();
                img.crossOrigin = "Anonymous";
                img.src = selectedImageUrl;
                img.onload = () => {
                    canvasRef.current!.width = img.width;
                    canvasRef.current!.height = img.height;
                    ctx.drawImage(img, 0, 0);
                }
            }
        }
    }, [selectedImageUrl, client.consultationData.business.logo]);

    const handleSaveSelection = () => {
        if (canvasRef.current) {
            const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.9);
            onSave(post.id, dataUrl);
        } else if (selectedImageUrl) {
            // Fallback for non-canvas branded images
            onSave(post.id, selectedImageUrl);
        }
    }

    const renderTabContent = () => {
        if (selectedImageUrl) {
            return (
                <div className="flex flex-col items-center">
                    <canvas ref={canvasRef} className="max-w-full h-auto max-h-[50vh] rounded-lg border border-slate-600"></canvas>
                    <div className="mt-4 flex gap-4">
                        <button onClick={() => setSelectedImageUrl(null)} className="bg-slate-600 text-white font-bold py-2 px-4 rounded-md hover:bg-slate-500 transition">العودة للبحث</button>
                        <button onClick={handleSaveSelection} className="bg-teal-600 text-white font-bold py-2 px-4 rounded-md hover:bg-teal-500 transition">حفظ التصميم</button>
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
                    <div className="text-center p-8">
                        <h3 className="text-xl font-bold mb-2">توليد صورة بالذكاء الاصطناعي</h3>
                        <p className="text-slate-400 mb-6 max-w-md mx-auto">سيتم إنشاء صورة فريدة بناءً على الوصف التالي:</p>
                        <p className="bg-slate-700/50 p-3 rounded-md text-slate-300 mb-6 font-mono text-sm">"{post.visualPrompt}"</p>
                        <button onClick={() => handleGenerate(activeTab)} className="bg-gradient-to-r from-teal-500 to-blue-600 text-white font-bold py-3 px-6 rounded-full hover:from-teal-600 hover:to-blue-700 transition flex items-center gap-2 mx-auto">
                           <Wand2Icon className="w-5 h-5"/> {`إنشاء باستخدام ${activeTab === 'gemini' ? 'Gemini' : 'Stable Diffusion'}`}
                        </button>
                    </div>
                )
            case 'unsplash':
            case 'pixabay':
                return (
                    <div>
                         <div className="text-center p-4">
                            <button onClick={() => handleSearch(activeTab)} className="bg-slate-600 text-white font-bold py-2 px-4 rounded-md hover:bg-slate-500 transition">
                                {`ابحث في ${activeTab === 'unsplash' ? 'Unsplash' : 'Pixabay'} عن صور`}
                            </button>
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

                <div className="flex border-b border-slate-700">
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
    <button onClick={onClick} className={`flex-1 py-3 px-2 text-center font-semibold transition-colors ${isActive ? 'bg-slate-700 text-teal-300' : 'text-slate-400 hover:bg-slate-700/50'}`}>
        {name}
    </button>
);
