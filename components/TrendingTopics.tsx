import React, { useState, useEffect } from 'react';
import { getTrendingTopics } from '../services/geminiService';
import { LoadingSpinner, TrendingUpIcon } from './icons';

interface Trend {
    title: string;
    items: string[];
}

const parseTrends = (markdown: string): Trend[] => {
    if (!markdown) return [];
    const sections = markdown.split('### ').filter(s => s.trim() !== '');
    return sections.map(section => {
        const lines = section.split('\n').filter(l => l.trim() !== '');
        const title = lines[0] || 'Trend';
        const items = lines.slice(1).map(item => item.replace(/^- /, '').trim());
        return { title, items };
    });
};

export const TrendingTopics: React.FC = () => {
    const [trends, setTrends] = useState<Trend[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchTrends = async () => {
            try {
                setIsLoading(true);
                setError(null);
                const result = await getTrendingTopics();
                setTrends(parseTrends(result));
            } catch (err) {
                console.error("Failed to fetch trends:", err);
                setError("مش قادرين نجيب الترندات دلوقتي، حاول كمان شوية.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchTrends();
    }, []);

    return (
        <section id="trends" className="relative z-10 w-full max-w-6xl p-6 sm:p-8">
            <h2 className="text-3xl sm:text-4xl font-bold text-center mb-8 text-white flex items-center justify-center gap-3">
                <TrendingUpIcon className="w-8 h-8 text-teal-400" />
                رادار الترندات النهاردة
            </h2>

            {isLoading && (
                <div className="flex justify-center items-center p-8">
                    <LoadingSpinner className="w-10 h-10 text-teal-400" />
                </div>
            )}
            
            {error && <p className="text-center text-red-400">{error}</p>}

            {!isLoading && !error && trends.length > 0 && (
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
                    {trends.map((trend, index) => (
                        <div key={index} className="bg-slate-800/50 rounded-2xl border border-slate-700 backdrop-blur-sm p-6 transform hover:scale-105 transition-transform duration-300">
                            <h3 className="font-bold text-xl mb-4 text-teal-300">{trend.title}</h3>
                            <ul className="space-y-3">
                                {trend.items.map((item, i) => (
                                    <li key={i} className="text-slate-300 before:content-['-'] before:mr-2 before:text-teal-400">
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                 </div>
            )}
        </section>
    );
};
