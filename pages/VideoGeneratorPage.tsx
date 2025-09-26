import React, { useState, useEffect, useMemo } from 'react';
import { ai } from '../services/geminiService';
import { generateVideo } from '../services/geminiService';
import { VideoOperation, Package } from '../types';
import { LoadingSpinner, VideoIcon } from '../components/icons';

interface VideoGeneratorPageProps {
  selectedPackage: Package | null;
  onBackToDashboard: () => void;
}

const loadingMessages = [
    "جاري إعداد المشهد السينمائي...",
    "تجميع الإطارات معًا بأسلوب فني...",
    "الريندر الآن بجودة عالية...",
    "تطبيق التأثيرات السحرية...",
    "اللمسات الأخيرة على الفيديو...",
    "تحضير تحفتك الفنية...",
];

type GeneratedVideo = {
    id: string;
    prompt: string;
    status: 'processing' | 'completed' | 'failed';
    url?: string;
    operation: VideoOperation;
};

// FIX: Hardcoded the API key to resolve runtime errors on Vercel where process.env is unavailable on the client-side.
const GEMINI_API_KEY = "AIzaSyD79cpQB0ZNILYRLVkHqod64cihlN-6fs4";


const VideoGeneratorPage: React.FC<VideoGeneratorPageProps> = ({ selectedPackage, onBackToDashboard }) => {
    const [prompt, setPrompt] = useState('');
    const [videos, setVideos] = useState<GeneratedVideo[]>([]);
    const [loadingMessage, setLoadingMessage] = useState(loadingMessages[0]);

    // Fallback to a default package if none is selected
    const currentPackage = useMemo(() => selectedPackage || {
        name: 'Default', price: 0, postsPerMonth: 8, videosPerMonth: 0, features: [], isFeatured: false
    }, [selectedPackage]);

    useEffect(() => {
        const interval = setInterval(() => {
             setLoadingMessage(prev => {
                const currentIndex = loadingMessages.indexOf(prev);
                return loadingMessages[(currentIndex + 1) % loadingMessages.length];
            });
        }, 3000);
        return () => clearInterval(interval);
    }, []);

     useEffect(() => {
        const processingVideos = videos.filter(v => v.status === 'processing');
        if (processingVideos.length === 0) return;

        const pollInterval = setInterval(async () => {
            for (const video of processingVideos) {
                try {
                    let updatedOp = await ai.operations.getVideosOperation({ operation: video.operation });
                    
                    if (updatedOp.done) {
                        const downloadLink = updatedOp.response?.generatedVideos?.[0]?.video?.uri;
                        if(downloadLink) {
                            const response = await fetch(`${downloadLink}&key=${GEMINI_API_KEY}`);
                            const blob = await response.blob();
                            const url = URL.createObjectURL(blob);
                            setVideos(prev => prev.map(v => v.id === video.id ? { ...v, status: 'completed', url: url } : v));
                        } else {
                             setVideos(prev => prev.map(v => v.id === video.id ? { ...v, status: 'failed' } : v));
                        }
                    }
                } catch (error) {
                    console.error('Polling failed for video:', video.id, error);
                    setVideos(prev => prev.map(v => v.id === video.id ? { ...v, status: 'failed' } : v));
                }
            }
        }, 10000); // Poll every 10 seconds

        return () => clearInterval(pollInterval);
    }, [videos]);


    const handleGenerate = async () => {
        if (!prompt.trim() || videos.length >= currentPackage.videosPerMonth) return;

        const tempId = Date.now().toString();
        
        try {
            const operation = await generateVideo(prompt);
             const newVideo: GeneratedVideo = {
                id: tempId,
                prompt: prompt,
                status: 'processing',
                operation: operation,
            };
            setVideos(prev => [newVideo, ...prev]);
            setPrompt('');

        } catch (error) {
            console.error("Failed to initiate video generation", error);
        }
    };
    
    const isProcessing = videos.some(v => v.status === 'processing');
    const hasReachedLimit = videos.length >= currentPackage.videosPerMonth;

    return (
        <div className="min-h-screen bg-slate-900 text-white p-4 sm:p-8 animate-fade-in">
            <header className="flex flex-col sm:flex-row justify-between sm:items-center mb-10 gap-4">
                <div className="flex items-center gap-3">
                    <VideoIcon className="w-10 h-10 text-teal-400" />
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold">استوديو الفيديو بالذكاء الاصطناعي</h1>
                        <p className="text-slate-400 text-sm sm:text-base">حوّل أفكارك لفيديوهات قصيرة جذابة بضغطة زر.</p>
                    </div>
                </div>
                <button onClick={onBackToDashboard} className="bg-slate-700 text-white font-bold py-2 px-4 rounded-full hover:bg-slate-600 transition w-full sm:w-auto">
                    الرجوع للوحة التحكم
                </button>
            </header>
            
            <section className="bg-slate-800 p-6 rounded-2xl border border-slate-700 mb-8">
                <div className="flex flex-col md:flex-row gap-4">
                    <textarea 
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="اكتب وصف تفصيلي للفيديو اللي عايزه... مثال: 'لقطة درون سريعة لسيارة رياضية حمراء تجري في طريق ساحلي وقت الغروب، مع تركيز على لمعان السيارة وانعكاس الشمس'"
                        rows={3}
                        className="flex-1 p-4 bg-slate-700 rounded-md border border-slate-600 focus:ring-2 focus:ring-teal-400 focus:outline-none"
                    />
                    <button 
                        onClick={handleGenerate} 
                        disabled={!prompt.trim() || isProcessing || hasReachedLimit}
                        className="bg-gradient-to-r from-teal-500 to-blue-600 text-white font-bold py-3 px-8 rounded-md hover:from-teal-600 hover:to-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isProcessing ? 'جاري المعالجة...' : hasReachedLimit ? 'وصلت للحد الأقصى' : '🚀 إنشاء الفيديو'}
                    </button>
                </div>
                <div className="text-center mt-4">
                     <p className="text-sm text-slate-400">
                        الفيديوهات المستخدمة: <span className="font-bold text-white">{videos.length} / {currentPackage.videosPerMonth}</span>
                    </p>
                    <p className="text-xs text-slate-500 mt-2">نصيحة: بعد التحميل، أضف موسيقى تريندينج من انستجرام أو تيك توك لزيادة الانتشار!</p>
                </div>
            </section>
            
            <section>
                <h2 className="text-2xl font-bold mb-4">الفيديوهات اللي عملتها</h2>
                {videos.length === 0 ? (
                    <div className="text-center py-16 text-slate-500">
                        <VideoIcon className="w-16 h-16 mx-auto mb-4"/>
                        <p>لسه معملتش أي فيديوهات.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {videos.map(video => (
                            <div key={video.id} className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                                <div className="aspect-video bg-slate-900 flex items-center justify-center">
                                    {video.status === 'processing' && (
                                        <div className="text-center p-4">
                                            <LoadingSpinner className="w-10 h-10 text-teal-400 mx-auto mb-4" />
                                            <p>{loadingMessage}</p>
                                        </div>
                                    )}
                                    {video.status === 'completed' && video.url && (
                                        <video src={video.url} controls className="w-full h-full object-cover"></video>
                                    )}
                                     {video.status === 'failed' && (
                                        <div className="text-center p-4 text-red-400">
                                            <p>فشل إنشاء الفيديو</p>
                                        </div>
                                    )}
                                </div>
                                <div className="p-4">
                                    <p className="text-slate-300 text-sm truncate">{video.prompt}</p>
                                    {video.status === 'completed' && video.url && (
                                        <a href={video.url} download={`${video.prompt.slice(0, 20)}.mp4`} className="block w-full text-center mt-4 bg-teal-600 text-white font-bold py-2 px-3 rounded-md hover:bg-teal-500 transition">
                                            تحميل
                                        </a>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
};

export default VideoGeneratorPage;