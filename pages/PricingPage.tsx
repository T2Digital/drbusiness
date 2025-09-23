import React from 'react';
import { Package } from '../types';

interface PricingPageProps {
  onPackageSelect: (pkg: Package) => void;
}

const packages: Package[] = [
  {
    name: 'باقة التواجد الافتراضي',
    price: 3000,
    features: [
      '8 منشورات شهريًا',
      '4 تصاميم جرافيك',
      'إدارة صفحة واحدة',
      '50% من قيمة الباقة إعلانات ممولة',
      'تقرير شهري أساسي'
    ],
    isFeatured: false,
  },
  {
    name: 'باقة الحضور اللامع',
    price: 6000,
    features: [
      '15 منشور شهريًا',
      '10 تصاميم جرافيك احترافية',
      '2 فيديو ريلز',
      'إدارة صفحتين',
      '50% من قيمة الباقة إعلانات ممولة',
      'تحليل أداء متقدم'
    ],
    isFeatured: true,
  },
  {
    name: 'باقة الانتشار الفيروسي',
    price: 10000,
    features: [
      '25 منشور شهريًا',
      '20 تصميم إبداعي',
      '5 فيديوهات ريلز',
      'إدارة 3 صفحات',
      '50% من قيمة الباقة إعلانات ممولة',
      'استراتيجية نمو مخصصة ومتابعة'
    ],
    isFeatured: false,
  },
];

const PricingCard: React.FC<{ pkg: Package, onSelect: () => void }> = ({ pkg, onSelect }) => (
  <div className={`bg-slate-800 rounded-2xl p-8 border ${pkg.isFeatured ? 'border-teal-500' : 'border-slate-700'} relative transform hover:scale-105 transition-transform duration-300`}>
    {pkg.isFeatured && (
      <div className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2 bg-teal-500 text-white text-sm font-bold px-4 py-1 rounded-full">
        الأكثر طلبًا
      </div>
    )}
    <h3 className="text-2xl font-bold text-center text-white">{pkg.name}</h3>
    <p className="text-center text-4xl font-extrabold my-6 text-teal-300">
      {pkg.price} <span className="text-lg font-medium text-slate-400">/ شهريًا</span>
    </p>
    <ul className="space-y-4 text-slate-300 mb-8">
      {pkg.features.map((feature, i) => (
        <li key={i} className="flex items-center">
          <svg className="w-5 h-5 text-green-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
          {feature}
        </li>
      ))}
    </ul>
    <button
      onClick={onSelect}
      className={`w-full font-bold py-3 px-6 rounded-full transition ${pkg.isFeatured ? 'bg-gradient-to-r from-teal-500 to-blue-600 text-white hover:from-teal-600 hover:to-blue-700' : 'bg-slate-700 hover:bg-slate-600 text-white'}`}
    >
      ابدأ الآن
    </button>
  </div>
);

const PricingPage: React.FC<PricingPageProps> = ({ onPackageSelect }) => {
  return (
    <div className="min-h-screen bg-slate-900 py-12 px-4 sm:px-6 lg:px-8 animate-fade-in">
      <div className="max-w-7xl mx-auto">
        <div className="text-center">
          <h2 className="text-4xl font-extrabold text-white sm:text-5xl">
            اختر الباقة التي تناسب نموك
          </h2>
          <p className="mt-4 text-xl text-slate-400">
            باقات مصممة خصيصًا لتلبية احتياجاتك وتحقيق أهدافك التسويقية.
          </p>
        </div>
        <div className="mt-12 grid gap-8 lg:grid-cols-3 lg:gap-8">
          {packages.map(pkg => (
            <PricingCard key={pkg.name} pkg={pkg} onSelect={() => onPackageSelect(pkg)} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default PricingPage;
