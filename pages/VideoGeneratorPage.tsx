import React, { useState, useRef } from 'react';
import { Package, VideoOperation } from '../types';
import { toBase64 } from '../utils/helpers';
import { LoadingSpinner, VideoIcon, Wand2Icon, Upload } from '../components/icons';
import { startVideoGeneration, checkVideoGenerationStatus } from '../services/geminiService';


const loadingMessages = [
    "يتم الآن استدعاء خلايا الإبداع السينمائي...",
    "تحويل أفكارك إلى مشاهد بصرية مذهلة...",
    "الذكاء الاصطناعي يقوم بعملية المونتاج...",
    "تصيير المشاهد النهائية، قد يستغرق هذا بعض الوقت...",
    "اللمسات الأخيرة على تحفتك الفنية...",
];

// FIX: Defined the 'VideoGeneratorPageProps' interface to resolve the "Cannot find name" error.
interface VideoGeneratorPageProps {
    selectedPackage: Package;
    onBackToDashboard: () => void;
}

const VideoGeneratorPage: React.FC<VideoGeneratorPageProps> = ({ selectedPackage, onBackToDashboard }) => {
    const [prompt, setPrompt] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imageBase64, setImageBase64] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loadingMessage, setLoadingMessage] = useState(loadingMessages[0]);
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const intervalRef = useRef<number | null>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            const b64 = await toBase64(file) as string;
            // remove data:image/...;base64, prefix
            const b64Data = b64.split(',')[1];
            setImageBase64(b64Data);
        }
    };

    const handleGenerate = async () => {
        if (!prompt) {
            setError('الرجاء إدخال وصف للفيديو.');
            return;
        }

        setIsGenerating(true);
        setError(null);
        setVideoUrl(null);
        setLoadingMessage(loadingMessages[0]);

        intervalRef.current = window.setInterval(() => {
            setLoadingMessage(prev => {
                const currentIndex = loadingMessages.indexOf(prev);
                const nextIndex = (currentIndex + 1) % loadingMessages.length;
                return loadingMessages[nextIndex];
            });
        }, 5000);

        try {
            let operation: VideoOperation;

            if (imageBase64 && imageFile) {
                operation = await startVideoGeneration(prompt, {
                    imageBytes: imageBase64,
                    mimeType: imageFile.type,
                });
            } else {
                operation = await startVideoGeneration(prompt);
            }

            while (!operation.done) {
                await new Promise(resolve => setTimeout(resolve, 10000));
                operation = await checkVideoGenerationStatus(operation);
            }

            if (operation.response?.generatedVideos?.[0]?.video?.uri) {
                const downloadLink = operation.response.generatedVideos[0].video.uri;
                
                // Append API key and fetch the video directly
                const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
                if (!response.ok) {
                    throw new Error(`Failed to download video: ${response.statusText}`);
                }
                const videoBlob = await response.blob();
                const objectUrl = URL.createObjectURL(videoBlob);
                setVideoUrl(objectUrl);
            } else {
                throw new Error('فشل إنشاء الفيديو. لم يتم إرجاع رابط صالح.');
            }

        } catch (err) {
            setError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع.');
        } finally {
            setIsGenerating(false);
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        }
    };

    const videosAllowed = selectedPackage.videosPerMonth;

    return (
        <div className="min-h-screen bg-slate-900 text-white p-4 sm:p-8">
            <header className="flex justify-between items-center mb-10">
                <div className="flex items-center gap-3">
                    <VideoIcon className="w-10 h-10 text-teal-400" />
                    <div>
                        <h1 className="text-3xl font-extrabold">استوديو الفيديو بالذكاء الاصطناعي</h1>
                        <p className="text-slate-400">حوّل أفكارك إلى فيديوهات احترافية.</p>
                    </div>
                </div>
                <button onClick={onBackToDashboard} className="bg-slate-700 text-white font-bold py-2 px-4 rounded-full hover:bg-slate-600 transition">
                    العودة للوحة التحكم
                </button>
            </header>

            <div className="max-w-4xl mx-auto">
                <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700">
                    <div className="text-center mb-6">
                        <p className="text-lg">رصيد الفيديوهات المتاح لهذا الشهر: <span className="font-bold text-2xl text-teal-300">{videosAllowed}</span></p>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">وصف الفيديو (Prompt)</label>
                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                rows={4}
                                placeholder="مثال: A neon hologram of a cat driving at top speed"
                                className="w-full p-3 bg-slate-700 rounded-md border border-slate-600 focus:ring-2 focus:ring-teal-400 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">إرفاق صورة (اختياري)</label>
                            <div onClick={() => fileInputRef.current?.click()} className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-600 border-dashed rounded-md cursor-pointer hover:border-teal-400">
                                <div className="space-y-1 text-center">
                                    <Upload className="mx-auto h-12 w-12 text-slate-500" />
                                    <p className="text-sm text-slate-400">{imageFile ? `تم اختيار: ${imageFile.name}` : 'انقر لرفع صورة'}</p>
                                    {imageFile && <p className="text-xs text-green-400">تم الإرفاق بنجاح!</p>}
                                </div>
                            </div>
                            <input ref={fileInputRef} type="file" className="sr-only" accept="image/*" onChange={handleFileChange} />
                        </div>
                    </div>
                    <div className="mt-8 text-center">
                        <button onClick={handleGenerate} disabled={isGenerating || videosAllowed <= 0} className="bg-gradient-to-r from-teal-500 to-blue-600 text-white font-bold py-3 px-8 rounded-full hover:from-teal-600 hover:to-blue-700 transition disabled:opacity-50 flex items-center gap-2 mx-auto">
                            <Wand2Icon className="w-5 h-5" />
                            {isGenerating ? 'جاري الإنشاء...' : 'إنشاء الفيديو'}
                        </button>
                         {videosAllowed <= 0 && <p className="text-sm text-yellow-400 mt-2">لقد استهلكت رصيدك من الفيديوهات لهذا الشهر.</p>}
                    </div>
                </div>

                <div className="mt-10">
                    {isGenerating && (
                         <div className="text-center p-8 bg-slate-800/50 rounded-lg">
                            <LoadingSpinner className="w-12 h-12 text-teal-400 mx-auto mb-4" />
                            <p className="text-lg text-slate-300">{loadingMessage}</p>
                            <p className="text-sm text-slate-500 mt-2">قد تستغرق هذه العملية عدة دقائق. لا تغلق الصفحة.</p>
                         </div>
                    )}
                    {error && (
                        <div className="text-center p-8 bg-red-900/50 rounded-lg text-red-300">
                            <h3 className="font-bold">حدث خطأ</h3>
                            <p>{error}</p>
                        </div>
                    )}
                    {videoUrl && (
                        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                            <h3 className="text-2xl font-bold mb-4 text-center text-white">الفيديو جاهز!</h3>
                            <video src={videoUrl} controls autoPlay loop className="w-full max-w-2xl mx-auto rounded-md" />
                            <div className="text-center mt-4">
                                <a href={videoUrl} download="dr-business-video.mp4" className="bg-teal-600 text-white font-bold py-2 px-6 rounded-full hover:bg-teal-500 transition">
                                    تحميل الفيديو
                                </a>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VideoGeneratorPage;