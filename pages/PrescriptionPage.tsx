import React, { useState, useEffect } from 'react';
import { Prescription, ConsultationData, DetailedPost } from '../types';
import { LoadingSpinner, DownloadIcon, CopyIcon, BrainCircuitIcon, Wand2Icon } from '../components/icons';
import { ImageStudioModal } from '../components/ImageStudioModal';
import { Client } from '../types';

interface PrescriptionPageProps {
  prescription: Prescription | null;
  consultationData: ConsultationData | null;
  onProceed: () => void;
  error: string | null;
}

type PostWithStatus = DetailedPost & {
  id: number;
  isLoading: boolean;
  generatedImage?: string;
};

const PrescriptionPage: React.FC<PrescriptionPageProps> = ({ prescription, consultationData, onProceed, error }) => {
    const [posts, setPosts] = useState<PostWithStatus[]>([]);
    const [copiedPostId, setCopiedPostId] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState('week1');
    const [imageStudioPost, setImageStudioPost] = useState<PostWithStatus | null>(null);

    // Create a mock client object for the ImageStudioModal
    const mockClient: Client | null = consultationData ? {
        id: 0,
        consultationData: consultationData,
        prescription: prescription!,
        selectedPackage: { name: 'Sample', price: 0, features: [], postsPerMonth: 7, videosPerMonth: 0, isFeatured: false },
        connections: { facebook: false, instagram: false, tiktok: false, x: false, linkedin: false },
        email: 'preview@example.com',
        status: 'active',
    } : null;

    useEffect(() => {
        if (prescription?.week1Plan) {
            const initialPosts = prescription.week1Plan.map((p, i) => ({ 
                ...p, 
                id: i, 
                isLoading: false,
                generatedImage: undefined 
            }));
            setPosts(initialPosts);
        }
    }, [prescription]);

    const handleImageSave = (postId: number, imageBase64: string) => {
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, generatedImage: imageBase64, isLoading: false } : p));
        setImageStudioPost(null);
    };

    const handleCopy = (post: PostWithStatus) => {
        const textToCopy = `${post.caption}\n\n${post.hashtags}`;
        navigator.clipboard.writeText(textToCopy);
        setCopiedPostId(post.id);
        setTimeout(() => setCopiedPostId(null), 2000);
    };

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
        <>
        <div className="min-h-screen bg-slate-900 text-white p-4 sm:p-8 animate-fade-in">
            <div className="max-w-7xl mx-auto">
                <header className="text-center mb-12">
                    <h1 className="text-4xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-blue-500">
                        روشتة التسويق بتاعتك
                    </h1>
                    <p className="mt-4 text-lg text-slate-400">
                        خطة شهرية متكاملة وجاهزة للنشر من دكتور بزنس.
                    </p>
                </header>

                <section className="mb-12 bg-slate-800 p-6 sm:p-8 rounded-2xl border border-slate-700 shadow-lg">
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
                    <h2 className="text-3xl font-bold text-center mb-8 text-white">خطة المحتوى الشهرية</h2>
                    <div className="border-b border-slate-700 mb-6 overflow-x-auto">
                        <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                            <button onClick={() => setActiveTab('week1')} className={`${activeTab === 'week1' ? 'border-teal-400 text-teal-300' : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-500'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-lg`}>الأسبوع الأول (عينة)</button>
                            {prescription.futureWeeksPlan.map(week => (
                                <button key={week.week} onClick={() => setActiveTab(`week${week.week}`)} className={`${activeTab === `week${week.week}` ? 'border-teal-400 text-teal-300' : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-500'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-lg`}>الأسبوع {week.week}</button>
                            ))}
                        </nav>
                    </div>

                    <div>
                        {activeTab === 'week1' && (
                             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {posts.map((post) => (
                                    <div key={post.id} className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden flex flex-col">
                                        <div className="aspect-square bg-slate-700 flex items-center justify-center">
                                            {post.isLoading ? <LoadingSpinner className="w-10 h-10 text-slate-500" />
                                            : post.generatedImage ? <img src={post.generatedImage} alt={post.visualPrompt} className="w-full h-full object-cover"/>
                                            : (
                                                <div className="text-center p-4">
                                                    <button onClick={() => setImageStudioPost(post)} className="bg-teal-600 text-white font-bold py-2 px-4 rounded-md hover:bg-teal-500 transition flex items-center gap-2">
                                                        <Wand2Icon className="w-5 h-5"/>
                                                        إنشاء تصميم
                                                    </button>
                                                </div>
                                            )
                                            }
                                        </div>
                                        <div className="p-4 flex flex-col flex-grow">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-sm font-bold text-slate-300">{post.day}</span>
                                                <span className="inline-block bg-blue-500/20 text-blue-300 text-xs font-semibold px-2 py-1 rounded-full">{post.platform}</span>
                                            </div>
                                            <p className="text-slate-400 text-sm mb-3 h-24 overflow-y-auto p-2 bg-slate-900/50 rounded-md whitespace-pre-wrap">{post.caption}</p>
                                            <p className="text-slate-500 text-xs mb-4 h-12 overflow-y-auto">{post.hashtags}</p>
                                            <div className="mt-auto grid grid-cols-2 gap-2">
                                                <button onClick={() => handleCopy(post)} className="flex items-center justify-center gap-2 w-full text-sm bg-slate-700 text-white font-bold py-2 px-3 rounded-md hover:bg-slate-600 transition">
                                                    <CopyIcon className="w-4 h-4" /> {copiedPostId === post.id ? 'تم النسخ!' : 'نسخ النص'}
                                                </button>
                                                <a href={post.generatedImage} download={`${consultationData?.business.name || 'post'}-${post.day}.jpg`} className={`flex items-center justify-center gap-2 w-full text-sm bg-teal-600 text-white font-bold py-2 px-3 rounded-md hover:bg-teal-500 transition ${!post.generatedImage ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                                    <DownloadIcon className="w-4 h-4" /> تحميل الصورة
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {prescription.futureWeeksPlan.map(week => (
                           activeTab === `week${week.week}` && (
                               <div key={week.week} className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                                   <h3 className="text-2xl font-bold text-teal-300 mb-2">أفكار الأسبوع {week.week}</h3>
                                   <p className="text-slate-400 mb-6">{week.summary}</p>
                                   <div className="space-y-3">
                                        {week.posts.map((post, i) => (
                                            <div key={i} className="p-3 bg-slate-700/50 rounded-md flex justify-between items-center">
                                                <div>
                                                    <p className="font-bold text-slate-200">{post.day}: <span className="font-normal text-slate-300">{post.idea}</span></p>
                                                </div>
                                                <span className="text-xs bg-blue-500/20 text-blue-300 font-semibold px-2 py-1 rounded-full">{post.platform}</span>
                                            </div>
                                        ))}
                                   </div>
                               </div>
                           )
                        ))}
                    </div>
                </section>
                

                <footer className="text-center">
                     <button
                        onClick={onProceed}
                        className="bg-gradient-to-r from-teal-500 to-blue-600 text-white font-bold py-4 px-10 rounded-full hover:from-teal-600 hover:to-blue-700 focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-teal-400 transition-all duration-300 transform hover:scale-110 text-lg shadow-2xl shadow-teal-500/20"
                    >
                        الخطوة الجاية: اختار باقتك
                    </button>
                </footer>
            </div>
        </div>
        {imageStudioPost && mockClient && (
            <ImageStudioModal
                // We pass a post with a string ID as the component expects
                // FIX: Added missing 'weekKey' property to satisfy the PostWithStatus type required by ImageStudioModal.
                post={{...imageStudioPost, id: `week1-${imageStudioPost.id}`, weekKey: 'week1'}}
                client={mockClient}
                onClose={() => setImageStudioPost(null)}
                // We adapt the save handler to use the original number ID
                onSave={(_, imageBase64) => handleImageSave(imageStudioPost.id, imageBase64)}
            />
        )}
        </>
    );
};

export default PrescriptionPage;
