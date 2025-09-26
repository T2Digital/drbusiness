import React, { useState, useRef } from 'react';
import { CreditCard, Upload, LoadingSpinner } from '../components/icons';
import { Package } from '../types';
import { toBase64 } from '../utils/helpers';

interface PaymentPageProps {
  selectedPackage: Package | null;
  onPaymentConfirm: (proofImageUrl: string) => void;
}

// FIX: Hardcoded the API key to resolve runtime errors on Vercel where import.meta.env is unavailable.
const IMG_BB_API_KEY = 'bde613bd4475de5e00274a795091ba04';

const PaymentPage: React.FC<PaymentPageProps> = ({ selectedPackage, onPaymentConfirm }) => {
  const [proof, setProof] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setProof(e.target.files[0]);
      setUploadError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proof) return;

    setIsUploading(true);
    setUploadError(null);
    
    try {
        if (!IMG_BB_API_KEY) {
            throw new Error("ImgBB API key is not configured.");
        }
        const base64Image = await toBase64(proof) as string;
        const formData = new FormData();
        // The API requires the base64 string without the data URL prefix (e.g., "data:image/png;base64,")
        formData.append('image', base64Image.split(',')[1]);

        const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMG_BB_API_KEY}`, {
            method: 'POST',
            body: formData,
        });

        const result = await response.json();

        if (result.success && result.data.url) {
            onPaymentConfirm(result.data.url);
        } else {
            throw new Error(result.error?.message || 'Failed to upload image due to an unknown error.');
        }

    } catch (error) {
        console.error('Upload failed:', error);
        setUploadError('فشل رفع صورة الإثبات. يرجى المحاولة مرة أخرى.');
        setIsUploading(false);
    }
  };

  if (!selectedPackage) {
    return <div className="min-h-screen flex items-center justify-center">الرجاء اختيار باقة أولاً.</div>;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-900 animate-fade-in">
      <div className="w-full max-w-lg bg-slate-800 rounded-2xl shadow-2xl p-8 border border-slate-700">
        <div className="text-center mb-8">
          <CreditCard className="w-16 h-16 text-teal-400 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-white">إتمام عملية الدفع</h2>
          <p className="text-slate-400 mt-2">أنت على وشك تفعيل باقة: <strong className="text-teal-300">{selectedPackage.name}</strong></p>
        </div>

        <div className="bg-slate-900 p-6 rounded-lg mb-6 border border-slate-700">
            <div className="flex justify-between items-center text-lg">
                <span className="text-slate-300">المبلغ الإجمالي:</span>
                <span className="text-teal-300 font-bold text-2xl">{selectedPackage.price.toLocaleString()} جنيه</span>
            </div>
        </div>

        <div className="space-y-4 text-center">
            <h3 className="text-xl font-semibold text-slate-200">طرق الدفع المتاحة</h3>
            <div className="bg-slate-700 p-4 rounded-lg">
                <p className="font-bold">InstaPay (انستاباي)</p>
                <p className="text-teal-400 font-mono text-lg tracking-widest">01030956097</p>
            </div>
            <div className="bg-slate-700 p-4 rounded-lg">
                <p className="font-bold">Vodafone Cash (فودافون كاش)</p>
                <p className="text-teal-400 font-mono text-lg tracking-widest">01030956097</p>
            </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2 text-center">إرفاق إثبات الدفع</label>
              <div onClick={() => fileInputRef.current?.click()} className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-600 border-dashed rounded-md cursor-pointer hover:border-teal-400">
                <div className="space-y-1 text-center">
                  <Upload className="mx-auto h-12 w-12 text-slate-500" />
                  <div className="flex text-sm text-slate-400">
                    <p className="pl-1">{proof ? `تم اختيار: ${proof.name}` : 'انقر لرفع صورة التحويل'}</p>
                  </div>
                  {proof && <p className="text-xs text-green-400">تم الإرفاق بنجاح!</p>}
                </div>
              </div>
              <input ref={fileInputRef} id="proof-upload" type="file" className="sr-only" accept="image/*" onChange={handleFileChange} required />
              {uploadError && <p className="text-sm text-red-400 text-center mt-2">{uploadError}</p>}
            </div>

            <button 
                type="submit" 
                disabled={!proof || isUploading}
                className="w-full bg-gradient-to-r from-teal-500 to-blue-600 text-white font-bold py-3 px-6 rounded-full hover:from-teal-600 hover:to-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {isUploading && <LoadingSpinner className="w-5 h-5" />}
                {isUploading ? 'جاري الرفع والتسجيل...' : 'تأكيد وإرسال للمراجعة'}
            </button>
        </form>
      </div>
    </div>
  );
};

export default PaymentPage;