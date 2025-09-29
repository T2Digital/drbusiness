import React, { useState, useEffect } from 'react';
import { Prescription, ConsultationData, DetailedPost } from '../types';
import { LoadingSpinner, DownloadIcon, CopyIcon } from '../components/icons';
import { forceDownload } from '../utils/helpers';
import { ImagePreviewModal } from '../components/ImagePreviewModal';
import { imageService } from '../services/imageService';

interface PrescriptionPageProps {
  prescription: Prescription | null;
  consultationData: ConsultationData | null;
  onProceed: () => void;
  error: string | null;
}

const PrescriptionPage: React.FC<PrescriptionPageProps> = ({ prescription, consultationData, onProceed, error }) => {
    const [copiedPostId, setCopiedPostId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('week1');
    const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
    const [isDownloading, setIsDownloading] = useState<number | null>(null);
    const [brandedImages, setBrandedImages] = useState<Record<number, string>>({});

    useEffect(() => {
        if (prescription && consultationData?.business.logo) {
            const logoUrl = consultationData.business.logo;
            (prescription.week1Plan || []).forEach((post, index) => {
                if (post.generatedImage) {
                    imageService.brandImageWithCanvas(post.generatedImage, logoUrl)
                        .then(brandedUrl => {
                            setBrandedImages(prev => ({ ...prev, [index]: brandedUrl }));
                        })
                        .catch(err => {
                            console.error(`Failed to brand image for post ${index}:`, err);
                            // Fallback to original image if branding fails
                            setBrandedImages(prev => ({ ...prev, [index]: post.generatedImage! }));
                        });
                }
            });
        }
    }, [prescription, consultationData?.business.logo]);


    const handleCopy = (post: DetailedPost, index: number) => {
        const textToCopy = `${post.caption}\n\n${post.hashtags}`;
        navigator.clipboard.writeText(textToCopy);
        setCopiedPostId(`week1-${index}`);
        setTimeout(() => setCopiedPostId(null), 2000);
    };

    const handleDownload = async (url: string | undefined, index: number) => {
        if (!url) return;
        setIsDownloading(index);
        try {
            await forceDownload(url, `drbusiness-post-${index}.png`);
        } catch (e) {
            console.error(e);
        } finally {
            setIsDownloading(null);
        }
    };

    if (error) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center text-center p-4">
          <h2 className="text-3xl font-bold text-red-400 mb-4">أوبس! حصلت مشكلة</h2>
          <p className="text-slate-400 max-w-lg">{error}</p>
          <button onClick={() => window.location.reload()} className="mt-8 bg-gradient-to-r from-teal-500 to-blue-600 text-white font-bold py-2 px-6 rounded-full hover:from-teal-600 hover:to-blue-700 transition">
            جرب تاني
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
                        روشتة التسويق الفيروسية بتاعتك
                    </h1>
                    <p className="mt-4 text-lg text-slate-400">
                        خطة شهرية متكاملة، جاهزة للتنفيذ عشان تكسر الدنيا.
                    </p>
                </header>

                <section className="mb-12 bg-slate-800 p-6 sm:p-8 rounded-2xl border border-slate-700 shadow-lg">
                    <h2 className="text-3xl font-bold text-teal-300 mb-4">{prescription.strategy?.title}</h2>
                    <p className="text-slate-300 mb-6">{prescription.strategy?.summary}</p>
                    <div className="space-y-4">
                        {(prescription.strategy?.steps || []).map((step, i) => (
                            <div key={i} className="flex items-start">
                                <div className="flex-shrink-0 w-8 h-8 bg-teal-500/20 text-teal-300 rounded-full flex items-center justify-center font-bold mr-4">{i + 1}</div>
                                <p className="text-slate-300">{step}</p>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="mb-12">
                    <h2 className="text-3xl font-bold text-center mb-8 text-white">خطة المحتوى الشهرية</h2>
                    <div className="border-b border-slate-700 mb-6">
                        <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
                            <button onClick={() => setActiveTab('week1')} className={`${activeTab === 'week1' ? 'border-teal-400 text-teal-300' : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-500'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-lg`}>الأسبوع الأول (جاهز بالنشر)</button>
                            {(prescription.futureWeeksPlan || []).map(week => (
                                <button key={week.week} onClick={() => setActiveTab(`week${week.week}`)} className={`${activeTab === `week${week.week}` ? 'border-teal-400 text-teal-300' : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-500'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-lg`}>الأسبوع {week.week}</button>
                            ))}
                        </nav>
                    </div>

                    <div>
                        {activeTab === 'week1' && (
                             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {(prescription.week1Plan || []).map((post, index) => {
                                    const displayImage = brandedImages[index] || post.generatedImage;
                                    return (
                                        <div key={index} className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden flex flex-col">
                                            <div className="aspect-square bg-slate-700 flex items-center justify-center">
                                                {post.generatedImage ? 
                                                    (displayImage ?
                                                        <img 
                                                            src={displayImage} 
                                                            alt={post.visualPrompt} 
                                                            className="w-full h-full object-cover cursor-pointer"
                                                            onClick={() => setPreviewImageUrl(displayImage || null)}
                                                        />
                                                        : <LoadingSpinner className="w-8 h-8 text-slate-500" />
                                                    )
                                                    : 
                                                    <div className="text-center p-4 text-yellow-400">
                                                        <p>لم نتمكن من توليد صورة. يمكنك إنشائها من لوحة التحكم لاحقًا.</p>
                                                    </div>
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
                                                    <button onClick={() => handleCopy(post, index)} className="flex items-center justify-center gap-2 w-full text-sm bg-slate-700 text-white font-bold py-2 px-3 rounded-md hover:bg-slate-600 transition">
                                                        <CopyIcon className="w-4 h-4" /> {copiedPostId === `week1-${index}` ? 'اتنسخ!' : 'انسخ المحتوى'}
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDownload(displayImage, index)}
                                                        disabled={!displayImage || isDownloading === index}
                                                        className={`flex items-center justify-center gap-2 w-full text-sm bg-teal-600 text-white font-bold py-2 px-3 rounded-md hover:bg-teal-500 transition disabled:opacity-50`}
                                                    >
                                                        {isDownloading === index ? <LoadingSpinner className="w-4 h-4" /> : <DownloadIcon className="w-4 h-4" />}
                                                        {isDownloading === index ? 'جاري التحميل...' : 'تحميل الصورة'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        {(prescription.futureWeeksPlan || []).map(week => (
                           activeTab === `week${week.week}` && (
                               <div key={week.week} className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                                   <h3 className="text-2xl font-bold text-teal-300 mb-2">أفكار الأسبوع {week.week}</h3>
                                   <p className="text-slate-400 mb-6">{week.summary}</p>
                                   <div className="space-y-3">
                                        {(week.posts || []).map((post, i) => (
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
                        الخطوة الجاية: اختار باقتك وولعها
                    </button>
                </footer>
            </div>
        </div>
        {previewImageUrl && (
            <ImagePreviewModal 
                imageUrl={previewImageUrl} 
                altText="معاينة تصميم المنشور" 
                onClose={() => setPreviewImageUrl(null)} 
            />
        )}
        </>
    );
};

export default PrescriptionPage;