
import React, { useState, useEffect, useMemo } from 'react';
import { Prescription, Client, DetailedPost, FutureWeek, Package, SimplePost, SocialConnections, AnalyticsData } from '../types';
import { editImageWithPrompt, generateCaptionVariations, generateDetailedWeekPlan, elaborateOnStrategyStep, generateAnalyticsData } from '../services/geminiService';
import { LoadingSpinner, DownloadIcon, CopyIcon, EditIcon, BrainCircuitIcon, Wand2Icon, SparklesIcon, CalendarIcon, ChartBarIcon, LinkIcon, VideoIcon, FacebookIcon, InstagramIcon, TikTokIcon, XIcon, LinkedinIcon, RefreshIcon } from '../components/icons';
import { DashboardLayout } from '../components/DashboardLayout';
import { ImageStudioModal } from '../components/ImageStudioModal';
import { forceDownload, exportElementAsPDF, exportContentPlanAsPDF, urlToBase64 } from '../utils/helpers';
import { ImagePreviewModal } from '../components/ImagePreviewModal';
import { imageService } from '../services/imageService';

interface ClientDashboardPageProps {
  client: Client;
  onUpdateClient: (updatedClient: Client) => void;
  onBackToDashboard: () => void;
  onNavigateToVideoStudio: () => void;
  userRole: 'admin' | 'client';
}

export type PostWithStatus = DetailedPost & {
  id: string; // use a unique ID like week-index
  weekKey: string;
  isLoading: boolean;
  generatedImage?: string; // This will now be a URL
};

type EditingPostState = { id: string; caption: string; hashtags: string; } | null;
type AiEditingState = { post: PostWithStatus; prompt: string; isEditing: boolean; } | null;
type CaptionIdeasState = { post: PostWithStatus; ideas: string[]; isLoading: boolean; } | null;
type SchedulingState = { post: PostWithStatus; selectedPlatforms: Partial<Record<keyof SocialConnections, boolean>> } | null;

type View = 'content' | 'strategy' | 'analytics' | 'connections';

const ClientDashboardPage: React.FC<ClientDashboardPageProps> = ({ client, onUpdateClient, onBackToDashboard, onNavigateToVideoStudio, userRole }) => {
    const [posts, setPosts] = useState<PostWithStatus[]>([]);
    const [isEditModalOpen, setEditModalOpen] = useState(false);
    const [editingPost, setEditingPost] = useState<EditingPostState>(null);
    const [aiEditingState, setAiEditingState] = useState<AiEditingState>(null);
    const [captionIdeasState, setCaptionIdeasState] = useState<CaptionIdeasState>(null);
    const [schedulingState, setSchedulingState] = useState<SchedulingState>(null);
    const [activeView, setActiveView] = useState<View>('content');
    const [generatingWeeks, setGeneratingWeeks] = useState<Set<number>>(new Set());
    const [imageStudioPost, setImageStudioPost] = useState<PostWithStatus | null>(null);
    
    // FIX: Refactored useEffect to correctly synchronize state with props, preventing an infinite loop and fixing spread operator error.
    useEffect(() => {
        // This effect synchronizes the `posts` state with the `client.prescription` prop.
        // It rebuilds the posts list from the prop, which is the source of truth,
        // while preserving local UI state (like `isLoading`) from the previous render.
        if (!client.prescription) {
            setPosts([]);
            return;
        }

        type PrescriptionPost = DetailedPost & { id: string; weekKey: string; };
        const allPrescriptionPosts: PrescriptionPost[] = [];

        // Flatten all posts from the prescription prop
        if (client.prescription.week1Plan) {
            client.prescription.week1Plan.forEach((p, i) => {
                if (p && typeof p === 'object') {
                    allPrescriptionPosts.push({ ...p, id: `week1-${i}`, weekKey: 'week1' });
                }
            });
        }
        if (client.prescription.detailedPlans) {
            Object.entries(client.prescription.detailedPlans).forEach(([weekKey, weekPosts]) => {
                if (Array.isArray(weekPosts)) {
                    weekPosts.forEach((p, i) => {
                        if (p && typeof p === 'object') {
                             allPrescriptionPosts.push({ ...p, id: `${weekKey}-${i}`, weekKey });
                        }
                    });
                }
            });
        }

        setPosts(currentPosts => {
            // FIX: Explicitly type the Map to resolve a TypeScript inference issue where `existing` was being typed as `unknown`.
            const currentPostsMap = new Map<string, PostWithStatus>(currentPosts.map(p => [p.id, p]));
            
            const newPosts = allPrescriptionPosts.map(p => {
                const existing = currentPostsMap.get(p.id);
                // Combine fresh data from props with existing UI state
                return {
                    ...p, // Base data from prescription
                    isLoading: existing ? existing.isLoading : false, // Preserve loading state
                };
            });
            
            return newPosts.sort((a, b) => a.id.localeCompare(b.id));
        });
    }, [client.prescription]);

    const handleImageSave = (postId: string, imageUrl: string) => {
        const updatedPosts = posts.map(p => p.id === postId ? { ...p, generatedImage: imageUrl, isLoading: false } : p);
        setPosts(updatedPosts);
        
        // Find the post to update in the original prescription
        const postToUpdate = updatedPosts.find(p => p.id === postId);
        if (postToUpdate) {
            const updatedPrescription = { ...client.prescription };
            const weekKey = postToUpdate.weekKey;
            const postIndex = parseInt(postToUpdate.id.split('-')[1]);

            if (weekKey === 'week1' && updatedPrescription.week1Plan?.[postIndex]) {
                updatedPrescription.week1Plan[postIndex].generatedImage = imageUrl;
            } else if (updatedPrescription.detailedPlans?.[weekKey]?.[postIndex]) {
                updatedPrescription.detailedPlans[weekKey][postIndex].generatedImage = imageUrl;
            }
            onUpdateClient({ ...client, prescription: updatedPrescription });
        }

        setImageStudioPost(null);
    };
    
    const handleGenerateWeekContent = async (week: FutureWeek) => {
        setGeneratingWeeks(prev => new Set(prev).add(week.week));
        try {
            const detailedPosts = await generateDetailedWeekPlan(client.consultationData, week.posts);
            const weekKey = `week${week.week}`;
            
            if (!client.prescription) {
                console.error("Cannot generate week plan: client prescription is missing.");
                return;
            }

            const updatedPrescription: Prescription = {
                ...client.prescription,
                detailedPlans: {
                    ...(client.prescription.detailedPlans || {}),
                    [weekKey]: detailedPosts,
                },
                futureWeeksPlan: (client.prescription.futureWeeksPlan || []).filter(fw => fw.week !== week.week),
            };

            onUpdateClient({ ...client, prescription: updatedPrescription });
        } catch (error) {
            console.error(`Failed to generate content for week ${week.week}`, error);
        } finally {
            setGeneratingWeeks(prev => { const newSet = new Set(prev); newSet.delete(week.week); return newSet; });
        }
    };

    const handleSaveChanges = () => {
        if (!editingPost) return;
        setPosts(prev => prev.map(p => p.id === editingPost.id ? { ...p, caption: editingPost.caption, hashtags: editingPost.hashtags } : p));
        setEditModalOpen(false);
        setEditingPost(null);
    };

    const handleAiEditImage = async () => {
        if (!aiEditingState || !aiEditingState.post.generatedImage) return;
        setAiEditingState(prev => prev ? {...prev, isEditing: true} : null);
        try {
            const originalImageUrl = aiEditingState.post.generatedImage;
            const base64Image = await urlToBase64(originalImageUrl);
            const mimeType = base64Image.substring(base64Image.indexOf(":") + 1, base64Image.indexOf(";"));
            
            const editedImageBase64 = await editImageWithPrompt(base64Image, mimeType, aiEditingState.prompt);
            const newImageUrl = await imageService.uploadImage(editedImageBase64);
            
            handleImageSave(aiEditingState.post.id, newImageUrl);

        } catch (error) { 
            console.error("AI editing failed", error); 
            alert(`فشل تعديل الصورة: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`);
        } finally { 
            setAiEditingState(null); 
        }
    }
    
    const handleFetchCaptionIdeas = async (post: PostWithStatus) => {
        setCaptionIdeasState({ post, ideas: [], isLoading: true });
        try {
            const businessContext = `Business: ${client.consultationData?.business.name} in ${client.consultationData?.business.field}. Goals: engagement, sales.`;
            const variations = await generateCaptionVariations(post.caption, businessContext);
            setCaptionIdeasState({ post, ideas: variations, isLoading: false });
        } catch(error) { console.error("Failed to get caption ideas", error); setCaptionIdeasState(null); }
    }

    const handleSelectCaptionIdea = (idea: string) => {
        if (!captionIdeasState) return;
        setPosts(prev => prev.map(p => p.id === captionIdeasState.post.id ? {...p, caption: idea} : p));
        setCaptionIdeasState(null);
    }
    
    const handleSchedulePost = () => {
        if(!schedulingState) return;
        alert(`Post scheduling simulated for: ${Object.keys(schedulingState.selectedPlatforms).join(', ')}\n\nNOTE: Real posting requires backend integration.`);
        setSchedulingState(null);
    }

    const postsToShow = useMemo(() => {
        const sortedPosts = [...posts].sort((a,b) => a.id.localeCompare(b.id));
        return sortedPosts.slice(0, client.selectedPackage.postsPerMonth);
    }, [posts, client.selectedPackage.postsPerMonth]);
    
    const handleUpdateConnections = (connections: SocialConnections) => {
        const updatedClient = { ...client, connections };
        onUpdateClient(updatedClient);
    }

    const renderContent = () => {
        switch (activeView) {
            case 'content': return <ContentCalendarView 
                posts={postsToShow}
                futureWeeks={client.prescription?.futureWeeksPlan || []}
                isGenerating={generatingWeeks}
                onGenerateWeek={handleGenerateWeekContent}
                client={client}
                onOpenDesignStudio={(post) => setImageStudioPost(post)}
                onOpenEditModal={(post) => { setEditingPost({id: post.id, caption: post.caption, hashtags: post.hashtags}); setEditModalOpen(true); }}
                onOpenAiEdit={(post) => setAiEditingState({ post, prompt: '', isEditing: false })}
                onFetchCaptionIdeas={handleFetchCaptionIdeas}
                onSchedule={(post) => setSchedulingState({ post, selectedPlatforms: {} })}
            />;
            case 'strategy': return <AnnualStrategyView client={client} />;
            case 'analytics': return <AnalyticsView client={client} />;
            case 'connections': return <ConnectionsView connections={client.connections} onUpdateConnections={handleUpdateConnections} />;
            default: return <div>Select a view</div>;
        }
    };

    return (
        <>
            <DashboardLayout 
                activeView={activeView} 
                setActiveView={setActiveView} 
                onBack={onBackToDashboard} 
                businessName={client.consultationData.business.name} 
                onNavigateToVideoStudio={onNavigateToVideoStudio}
                userRole={userRole}
            >
                {renderContent()}
            </DashboardLayout>
            
            {imageStudioPost && (
                <ImageStudioModal
                    post={imageStudioPost}
                    client={client}
                    onClose={() => setImageStudioPost(null)}
                    onSave={handleImageSave}
                />
            )}
            
            {isEditModalOpen && editingPost && (<Modal onClose={() => setEditModalOpen(false)} title="تعديل المنشور">
                <div className="space-y-4">
                     <textarea value={editingPost.caption} onChange={(e) => setEditingPost({...editingPost, caption: e.target.value})} rows={6} className="w-full p-3 bg-slate-700 rounded-md border border-slate-600 focus:ring-2 focus:ring-teal-400 focus:outline-none" />
                     <textarea value={editingPost.hashtags} onChange={(e) => setEditingPost({...editingPost, hashtags: e.target.value})} rows={3} className="w-full p-3 bg-slate-700 rounded-md border border-slate-600 focus:ring-2 focus:ring-teal-400 focus:outline-none" />
                </div>
                <div className="mt-6 flex justify-end gap-4">
                    <button onClick={() => setEditModalOpen(false)} className="bg-slate-600 text-white font-bold py-2 px-4 rounded-md hover:bg-slate-500 transition">إلغاء</button>
                    <button onClick={handleSaveChanges} className="bg-teal-600 text-white font-bold py-2 px-4 rounded-md hover:bg-teal-500 transition">حفظ التعديلات</button>
                </div>
            </Modal>)}

            {aiEditingState && (<Modal onClose={() => setAiEditingState(null)} title="تعديل الصورة بالذكاء الاصطناعي">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="w-full md:w-1/2"><img src={aiEditingState.post.generatedImage} alt="preview" className="rounded-lg w-full aspect-square object-cover" /></div>
                    <div className="w-full md:w-1/2 flex flex-col">
                        <p className="text-slate-300 mb-2">اكتب طلب التعديل باللغة الإنجليزية:</p>
                        <textarea value={aiEditingState.prompt} onChange={(e) => setAiEditingState({...aiEditingState, prompt: e.target.value})} placeholder="e.g., 'change background to a sunny beach'" rows={4} className="w-full p-3 bg-slate-700 rounded-md border border-slate-600 focus:ring-2 focus:ring-teal-400 focus:outline-none text-left" dir="ltr" />
                        <div className="mt-auto flex justify-end gap-4 pt-4">
                           <button onClick={() => setAiEditingState(null)} className="bg-slate-600 text-white font-bold py-2 px-4 rounded-md hover:bg-slate-500 transition">إلغاء</button>
                           <button onClick={handleAiEditImage} disabled={!aiEditingState.prompt || aiEditingState.isEditing} className="bg-teal-600 text-white font-bold py-2 px-4 rounded-md hover:bg-teal-500 transition flex items-center gap-2 disabled:opacity-50">
                               {aiEditingState.isEditing ? <><LoadingSpinner className="w-5 h-5"/> جاري...</> : 'تطبيق'}
                           </button>
                       </div>
                    </div>
                </div>
            </Modal>)}
            
             {captionIdeasState && (<Modal onClose={() => setCaptionIdeasState(null)} title="أفكار بديلة للكابشن">
                {captionIdeasState.isLoading ? <div className="flex justify-center items-center h-48"><LoadingSpinner className="w-10 h-10 text-teal-400" /></div> :
                <div className="space-y-4">
                     <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-600"><h4 className="font-bold text-slate-400 mb-1">الكابشن الأصلي</h4><p className="text-slate-300">{captionIdeasState.post.caption}</p></div>
                    {captionIdeasState.ideas.map((idea, i) => (
                        <div key={i} className="group p-4 bg-slate-700 rounded-lg hover:bg-slate-600 transition cursor-pointer" onClick={() => handleSelectCaptionIdea(idea)}>
                            <h4 className="font-bold text-teal-300 mb-1">اقتراح {i+1}</h4><p className="text-slate-200 group-hover:text-white">{idea}</p>
                        </div>
                    ))}
                </div>}
            </Modal>)}

            {schedulingState && (<Modal onClose={() => setSchedulingState(null)} title="جدولة المنشور">
                <div className="flex flex-col md:flex-row gap-6">
                    <div className="w-full md:w-1/3"><img src={schedulingState.post.generatedImage} alt="preview" className="rounded-lg w-full aspect-square object-cover" /></div>
                    <div className="w-full md:w-2/3">
                        <h4 className="font-bold text-white mb-2">اختر المنصات للنشر عليها:</h4>
                        <div className="space-y-3">
                            {Object.entries(client.connections).map(([platform, isConnected]) => isConnected && (
                                <label key={platform} className="flex items-center p-3 bg-slate-700 rounded-lg cursor-pointer">
                                    <input type="checkbox" className="h-5 w-5 rounded bg-slate-800 border-slate-600 text-teal-500 focus:ring-teal-500"
                                        checked={!!schedulingState.selectedPlatforms[platform as keyof SocialConnections]}
                                        onChange={e => setSchedulingState(prev => prev ? {...prev, selectedPlatforms: {...prev.selectedPlatforms, [platform]: e.target.checked}} : null)} />
                                    <span className="mr-3 capitalize">{platform}</span>
                                </label>
                            ))}
                        </div>
                        <div className="mt-6 flex justify-end gap-4">
                           <button onClick={() => setSchedulingState(null)} className="bg-slate-600 text-white font-bold py-2 px-4 rounded-md hover:bg-slate-500 transition">إلغاء</button>
                           <button onClick={handleSchedulePost} disabled={Object.values(schedulingState.selectedPlatforms).every(v => !v)} className="bg-teal-600 text-white font-bold py-2 px-4 rounded-md hover:bg-teal-500 transition disabled:opacity-50">جدولة الآن</button>
                        </div>
                    </div>
                </div>
            </Modal>)}
        </>
    );
};

const Modal: React.FC<{onClose: () => void, title: string, children: React.ReactNode}> = ({onClose, title, children}) => (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 animate-fade-in" onClick={onClose}>
        <div className="bg-slate-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 border border-slate-700" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-4">{title}</h3>
            {children}
        </div>
    </div>
);

const ContentCalendarView: React.FC<{
    posts: PostWithStatus[], futureWeeks: FutureWeek[], isGenerating: Set<number>, onGenerateWeek: (w: FutureWeek) => void, client: Client,
    onOpenDesignStudio: (p: PostWithStatus) => void, onOpenEditModal: (p: PostWithStatus) => void, onOpenAiEdit: (p: PostWithStatus) => void,
    onFetchCaptionIdeas: (p: PostWithStatus) => void, onSchedule: (p: PostWithStatus) => void
}> = ({ posts, futureWeeks, isGenerating, onGenerateWeek, client, onOpenDesignStudio, onOpenEditModal, onOpenAiEdit, onFetchCaptionIdeas, onSchedule }) => {
    const [copiedPostId, setCopiedPostId] = useState<string | null>(null);
    const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
    const [isDownloading, setIsDownloading] = useState<string | null>(null);
    const [isPdfLoading, setIsPdfLoading] = useState(false);

    const handleCopy = (post: PostWithStatus) => {
        const textToCopy = `${post.caption}\n\n${post.hashtags}`;
        navigator.clipboard.writeText(textToCopy);
        setCopiedPostId(post.id);
        setTimeout(() => setCopiedPostId(null), 2000);
    };

    const handleDownload = async (url: string | undefined, post: PostWithStatus) => {
        if (!url) return;
        setIsDownloading(post.id);
        try {
            const fileName = `${client.consultationData.business.name || 'post'}-${post.day}.jpg`;
            await forceDownload(url, fileName);
        } catch (e) {
            console.error(e);
        } finally {
            setIsDownloading(null);
        }
    };
    
    const handleDownloadPdf = async () => {
        setIsPdfLoading(true);
        try {
            if(client.prescription){
                await exportContentPlanAsPDF(client.prescription, client.consultationData.business.name);
            }
        } catch (error) {
            console.error("Failed to generate content plan PDF", error);
            alert("حدث خطأ أثناء إنشاء ملف الـ PDF.");
        } finally {
            setIsPdfLoading(false);
        }
    }

    return <>
        <div>
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2">تقويم المحتوى الإعلاني</h1>
                    <p className="text-slate-400">هنا تجد كل إعلاناتك الجاهزة للنشر مع أدوات التعديل والجدولة.</p>
                </div>
                <button
                    onClick={handleDownloadPdf}
                    disabled={isPdfLoading}
                    className="flex-shrink-0 bg-slate-700 text-white font-bold py-2 px-5 rounded-full hover:bg-slate-600 transition disabled:opacity-50 flex items-center gap-2"
                >
                    {isPdfLoading ? <LoadingSpinner className="w-5 h-5"/> : <DownloadIcon className="w-5 h-5" />}
                    {isPdfLoading ? 'جاري التجهيز...' : 'تحميل الخطة PDF'}
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {posts.map((post) => (
                    <div key={post.id} className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden flex flex-col shadow-lg transition-all duration-300 hover:shadow-teal-500/10">
                        <div className="aspect-square bg-slate-700 flex items-center justify-center relative group">
                            {post.isLoading ? <LoadingSpinner className="w-10 h-10 text-slate-500" />
                            : post.generatedImage ? 
                            <>
                                <img 
                                    src={post.generatedImage} 
                                    alt={post.visualPrompt} 
                                    className="w-full h-full object-cover cursor-pointer"
                                    onClick={() => setPreviewImageUrl(post.generatedImage)}
                                />
                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => onOpenDesignStudio(post)} title="إعادة تصميم الصورة" className="bg-slate-900/80 text-white p-3 rounded-full hover:bg-slate-900"><BrainCircuitIcon className="w-5 h-5"/></button>
                                    <button onClick={() => onOpenAiEdit(post)} title="تعديل بالذكاء الاصطناعي" className="bg-slate-900/80 text-white p-3 rounded-full hover:bg-slate-900"><Wand2Icon className="w-5 h-5"/></button>
                                </div>
                            </>
                            : 
                            <div className="p-4 text-center">
                                <button onClick={() => onOpenDesignStudio(post)} className="bg-teal-600 text-white font-bold py-2 px-4 rounded-md hover:bg-teal-500 transition flex items-center gap-2">
                                    <Wand2Icon className="w-5 h-5"/>
                                    إنشاء تصميم
                                </button>
                                <p className="text-xs text-slate-500 mt-2">استخدم الاستوديو الإبداعي</p>
                            </div>
                            }
                        </div>
                        <div className="p-4 flex flex-col flex-grow">
                            <div className="flex justify-between items-center mb-2"><span className="text-sm font-bold text-slate-300">{post.day}</span><span className="inline-block bg-blue-500/20 text-blue-300 text-xs font-semibold px-2 py-1 rounded-full">{post.platform}</span></div>
                            <p className="text-slate-400 text-sm mb-3 h-24 overflow-y-auto p-2 bg-slate-900/50 rounded-md whitespace-pre-wrap">{post.caption}</p>
                            <p className="text-slate-500 text-xs mb-4 h-12 overflow-y-auto">{post.hashtags}</p>
                            <div className="mt-auto flex flex-col gap-2">
                                <button onClick={() => onSchedule(post)} className="w-full flex items-center justify-center gap-2 text-sm bg-teal-600 text-white font-bold py-2 px-3 rounded-md hover:bg-teal-500 transition"><CalendarIcon className="w-4 h-4"/> جدولة المنشور</button>
                                <div className="grid grid-cols-2 gap-2">
                                    <button onClick={() => onOpenEditModal(post)} className="flex items-center justify-center gap-2 w-full text-sm bg-slate-700 text-white py-2 px-3 rounded-md hover:bg-slate-600 transition"><EditIcon className="w-4 h-4"/> تعديل</button>
                                    <button onClick={() => onFetchCaptionIdeas(post)} className="flex items-center justify-center gap-2 w-full text-sm bg-slate-700 text-white py-2 px-3 rounded-md hover:bg-slate-600 transition"><SparklesIcon className="w-4 h-4"/> أفكار</button>
                                    <button onClick={() => handleCopy(post)} className="col-span-2 flex items-center justify-center gap-2 w-full text-sm bg-slate-700 text-white py-2 px-3 rounded-md hover:bg-slate-600 transition"><CopyIcon className="w-4 h-4"/> {copiedPostId === post.id ? 'اتنسخ!' : 'نسخ النص'}</button>
                                    <button
                                        onClick={() => handleDownload(post.generatedImage, post)}
                                        disabled={!post.generatedImage || isDownloading === post.id}
                                        className={`col-span-2 flex items-center justify-center gap-2 w-full text-sm bg-slate-700 text-white py-2 px-3 rounded-md hover:bg-slate-600 transition disabled:opacity-50`}
                                    >
                                        {isDownloading === post.id ? <LoadingSpinner className="w-4 h-4" /> : <DownloadIcon className="w-4 h-4" />}
                                        {isDownloading === post.id ? 'جاري التحميل...' : 'تحميل الصورة'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
                {futureWeeks.map(week => (
                    <div key={week.week} className="bg-slate-800 rounded-xl border-2 border-dashed border-slate-700 flex flex-col justify-center items-center p-6 text-center hover:border-teal-500 transition">
                        <h3 className="text-xl font-bold text-white mb-2">أفكار الأسبوع {week.week}</h3>
                        <p className="text-slate-400 mb-4">{week.summary}</p>
                        <button onClick={() => onGenerateWeek(week)} disabled={isGenerating.has(week.week)} className="w-full flex items-center justify-center gap-3 bg-slate-700 text-white font-bold py-3 px-6 rounded-full hover:bg-slate-600 transition disabled:opacity-50">
                            {isGenerating.has(week.week) ? <><LoadingSpinner className="w-5 h-5"/>جاري التجهيز...</> : `🚀 جهّز محتوى هذا الأسبوع`}
                        </button>
                    </div>
                ))}
            </div>
        </div>
        {previewImageUrl && (
            <ImagePreviewModal 
                imageUrl={previewImageUrl} 
                altText="معاينة تصميم المنشور" 
                onClose={() => setPreviewImageUrl(null)} 
            />
        )}
    </>;
};

const AnnualStrategyView: React.FC<{ client: Client }> = ({ client }) => {
    const strategy = client.prescription?.strategy;
    const [elaboration, setElaboration] = useState<{ index: number; text: string; isLoading: boolean } | null>(null);
    const [isPdfLoading, setIsPdfLoading] = useState(false);

    const handleElaborate = async (step: string, index: number) => {
        setElaboration({ index, text: '', isLoading: true });
        try {
            const businessContext = `Business: ${client.consultationData.business.name} (${client.consultationData.business.field}). Description: ${client.consultationData.business.description}`;
            const result = await elaborateOnStrategyStep(businessContext, step);
            setElaboration({ index, text: result, isLoading: false });
        } catch (error) {
            console.error(error);
            setElaboration({ index, text: 'حدث خطأ أثناء جلب التفاصيل.', isLoading: false });
        }
    };
    
    const handleDownloadPdf = async () => {
        setIsPdfLoading(true);
        try {
            await exportElementAsPDF('strategy-container', `${client.consultationData.business.name}-Strategy.pdf`);
        } catch (error) {
            console.error("Failed to generate strategy PDF", error);
            alert("حدث خطأ أثناء إنشاء ملف الـ PDF.");
        } finally {
            setIsPdfLoading(false);
        }
    }

    return (
    <div>
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-8">
            <div>
                <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2">الاستراتيجية السنوية</h1>
                <p className="text-slate-400">خارطة طريقك طويلة الأمد لتحقيق نمو مستدام.</p>
            </div>
            <button 
                onClick={handleDownloadPdf}
                disabled={isPdfLoading}
                className="flex-shrink-0 bg-slate-700 text-white font-bold py-2 px-5 rounded-full hover:bg-slate-600 transition disabled:opacity-50 flex items-center gap-2"
            >
                {isPdfLoading ? <LoadingSpinner className="w-5 h-5"/> : <DownloadIcon className="w-5 h-5" />}
                {isPdfLoading ? 'جاري التجهيز...' : 'تحميل PDF'}
            </button>
        </div>
        <div id="strategy-container" className="bg-slate-800 p-6 sm:p-8 rounded-2xl border border-slate-700 shadow-lg">
            <div className="flex items-center gap-4 mb-4"><BrainCircuitIcon className="w-10 h-10 text-teal-400" /><h2 className="text-2xl sm:text-3xl font-bold text-teal-300">{strategy?.title}</h2></div>
            <p className="text-slate-300 mb-6 text-base sm:text-lg leading-relaxed">{strategy?.summary}</p>
            <div className="space-y-4 border-t border-slate-700 pt-6">
                {(strategy?.steps || []).map((step, i) => (
                    <div key={i} className="p-4 rounded-lg bg-slate-900/50 transition-all">
                        <div className="flex justify-between items-start">
                             <div className="flex items-start">
                                <div className="flex-shrink-0 w-8 h-8 bg-teal-500/20 text-teal-300 rounded-full flex items-center justify-center font-bold mr-4">{i + 1}</div>
                                <p className="text-slate-300 text-md pt-1">{step}</p>
                             </div>
                            <button onClick={() => handleElaborate(step, i)} className="text-sm text-teal-400 hover:text-teal-300 font-semibold flex-shrink-0">
                                {elaboration?.index === i && elaboration.isLoading ? 'جاري...' : 'تفاصيل أكثر'}
                            </button>
                        </div>
                        {elaboration?.index === i && (
                            <div className="mt-4 mr-12 border-l-2 border-teal-500/30 pl-4">
                                {elaboration.isLoading ? <LoadingSpinner className="w-6 h-6 text-teal-400"/> : 
                                <div className="prose prose-invert prose-sm text-slate-300 whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: elaboration.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                                }
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    </div>
    )
};

const AnalyticsView: React.FC<{ client: Client }> = ({ client }) => {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAnalytics = async () => {
        setIsLoading(true);
        setError(null);
        try {
             const businessContext = `Business: ${client.consultationData.business.name} (${client.consultationData.business.field}). Description: ${client.consultationData.business.description}`;
             const result = await generateAnalyticsData(businessContext);
             setData(result);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load analytics.');
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        fetchAnalytics();
    }, [client]);

     if (isLoading) {
        return <div className="flex flex-col items-center justify-center h-full"><LoadingSpinner className="w-12 h-12 text-teal-400" /><p className="mt-4 text-slate-400">جاري توليد تقرير تحليلات مخصص...</p></div>;
    }

    if (error || !data) {
        return <div className="text-center text-red-400">
            <p>حدث خطأ أثناء تحميل التحليلات.</p>
            <button onClick={fetchAnalytics} className="mt-4 bg-slate-600 p-2 rounded-md">حاول مرة أخرى</button>
        </div>;
    }

    const Trend: React.FC<{value: number}> = ({ value }) => (
        <p className={`text-sm mt-1 font-bold ${value >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {value >= 0 ? '+' : ''}{value.toFixed(1)}% الشهر ده
        </p>
    );

    return (
        <div>
            <div className="flex justify-between items-center mb-2">
                <div>
                    <h1 className="text-3xl md:text-4xl font-extrabold text-white">تحليلات الأداء</h1>
                    <p className="text-slate-400">نظرة شاملة على أداء حسابك (بيانات مولدة بالذكاء الاصطناعي).</p>
                </div>
                 <button onClick={fetchAnalytics} disabled={isLoading} className="p-2 rounded-full bg-slate-700 hover:bg-slate-600 disabled:opacity-50">
                    <RefreshIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-8">
                <div className="bg-slate-800 p-6 rounded-xl border border-slate-700"><h3 className="text-slate-400 text-sm font-medium">نمو المتابعين</h3><p className="text-3xl font-bold text-white mt-1">{data.followerGrowth.value.toLocaleString()}</p><Trend value={data.followerGrowth.trend} /></div>
                <div className="bg-slate-800 p-6 rounded-xl border border-slate-700"><h3 className="text-slate-400 text-sm font-medium">معدل التفاعل</h3><p className="text-3xl font-bold text-white mt-1">{data.engagementRate.value.toFixed(1)}%</p><Trend value={data.engagementRate.trend} /></div>
                <div className="bg-slate-800 p-6 rounded-xl border border-slate-700"><h3 className="text-slate-400 text-sm font-medium">مرات الظهور</h3><p className="text-3xl font-bold text-white mt-1">{data.reach.value.toLocaleString()}</p><Trend value={data.reach.trend} /></div>
            </div>
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700"><h3 className="text-xl font-bold text-white mb-4">التفاعل على مدار الأسبوع</h3><div className="h-64 flex items-end justify-between text-center overflow-x-auto p-2">{['حد', 'اتنين', 'تلات', 'أربع', 'خميس', 'جمعة', 'سبت'].map((day, i) => (<div key={day} className="w-1/7 flex-shrink-0 px-2 flex flex-col items-center h-full justify-end"><div className="w-8 bg-gradient-to-t from-teal-500 to-blue-500 rounded-t-md" style={{height: `${data.weeklyPerformance[i]}%`}}></div><span className="text-xs text-slate-400 mt-2">{day}</span></div>))}</div></div>
        </div>
    );
}

const ConnectionsView: React.FC<{connections: SocialConnections, onUpdateConnections: (c: SocialConnections) => void}> = ({ connections, onUpdateConnections }) => {
    
    const getOAuthUrl = (platform: keyof SocialConnections): string => {
        const REDIRECT_URI = encodeURIComponent('https://drbusiness.vercel.app/callback'); // Placeholder
        const CLIENT_ID_PLACEHOLDER = 'YOUR_CLIENT_ID'; // Placeholder

        switch (platform) {
            case 'facebook':
            case 'instagram': // Instagram uses Facebook's auth
                const fbScopes = 'pages_show_list,pages_manage_posts,pages_read_engagement,ads_management,business_management,instagram_basic,instagram_content_publish';
                return `https://www.facebook.com/v19.0/dialog/oauth?client_id=${CLIENT_ID_PLACEHOLDER}&redirect_uri=${REDIRECT_URI}&scope=${fbScopes}&response_type=code`;
            case 'tiktok':
                const tkScopes = 'user.info.basic,video.list,video.upload';
                return `https://www.tiktok.com/auth/authorize?client_key=${CLIENT_ID_PLACEHOLDER}&scope=${tkScopes}&response_type=code&redirect_uri=${REDIRECT_URI}`;
            case 'x':
                const xScopes = 'tweet.read tweet.write users.read offline.access';
                return `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${CLIENT_ID_PLACEHOLDER}&redirect_uri=${REDIRECT_URI}&scope=${encodeURIComponent(xScopes)}&state=state&code_challenge=challenge&code_challenge_method=S256`;
            case 'linkedin':
                const liScopes = 'r_liteprofile r_emailaddress w_member_social';
                return `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${CLIENT_ID_PLACEHOLDER}&redirect_uri=${REDIRECT_URI}&scope=${encodeURIComponent(liScopes)}`;
            default:
                return '#';
        }
    };

    const socialPlatforms: {key: keyof SocialConnections, name: string, icon: React.FC<any>}[] = [
        { key: 'facebook', name: 'Facebook', icon: FacebookIcon },
        { key: 'instagram', name: 'Instagram', icon: InstagramIcon },
        { key: 'tiktok', name: 'TikTok', icon: TikTokIcon },
        { key: 'x', name: 'X (Twitter)', icon: XIcon },
        { key: 'linkedin', name: 'LinkedIn', icon: LinkedinIcon },
    ];
    
    return <div>
        <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2">إدارة الحسابات المتصلة</h1>
        <p className="text-slate-400 mb-8">قم بربط حسابات العميل لنشر المحتوى مباشرة وإدارة الحملات.</p>
        <div className="bg-slate-800 p-6 sm:p-8 rounded-2xl border border-slate-700 shadow-lg">
            <div className="space-y-4">
                {socialPlatforms.map(({ key, name, icon: Icon }) => {
                    const isConnected = connections[key];
                    return (
                        <div key={key} className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
                            <div className="flex items-center gap-4">
                                <Icon className="w-8 h-8 text-white" />
                                <span className="text-lg font-semibold text-white">{name}</span>
                            </div>
                            <div className="flex items-center gap-4">
                                {isConnected ? 
                                    <span className="px-3 py-1 text-sm font-semibold rounded-full bg-green-500/20 text-green-300">متصل</span>
                                    : <span className="px-3 py-1 text-sm font-semibold rounded-full bg-slate-600 text-slate-300">غير متصل</span>
                                }
                                {isConnected ? (
                                     <button onClick={() => onUpdateConnections({ ...connections, [key]: false })} className='font-bold py-2 px-4 rounded-md transition bg-red-500/80 hover:bg-red-500'>
                                        قطع الاتصال
                                    </button>
                                ) : (
                                     <a href={getOAuthUrl(key)} target="_blank" rel="noopener noreferrer" className='font-bold py-2 px-4 rounded-md transition bg-teal-600 hover:bg-teal-500 flex items-center gap-2'>
                                        <LinkIcon className="w-4 h-4"/>
                                        اتصال
                                    </a>
                                )}
                            </div>
                        </div>
                    )
                })}
                 <div className="text-sm text-slate-500 pt-4 bg-slate-900/40 p-4 rounded-lg mt-6 border border-slate-700">
                    <h4 className="font-bold text-slate-300 text-base mb-2">ملاحظة فنية هامة (للانتقال للإنتاج)</h4>
                    <p>
                        هذه الواجهة هي محاكاة لعملية الربط. لتفعيل النشر التلقائي وإدارة الإعلانات بشكل حقيقي، يجب تنفيذ الخطوات التالية في نظام خلفي (Backend) آمن:
                    </p>
                    <ul className="list-disc list-inside mt-2 space-y-1 text-slate-400">
                        <li>تسجيل "دكتور بزنس" كتطبيق للمطورين على كل منصة (مثل Meta for Developers).</li>
                        <li>استبدال `YOUR_CLIENT_ID` بمعرف العميل الحقيقي من كل منصة.</li>
                        <li>بناء نظام خلفي للتعامل مع بروتوكول الربط الآمن (OAuth 2.0) لتخزين مفاتيح الوصول (Access Tokens) بشكل مشفر.</li>
                        <li>استخدام الواجهات البرمجية الرسمية (APIs) للمنصات لتنفيذ عمليات النشر والجدولة وقراءة التحليلات.</li>
                    </ul>
                </div>
            </div>
        </div>
    </div>
};


export default ClientDashboardPage;
