import React, { useState, useRef } from 'react';
import { CreditCard, Upload } from '../components/icons';
import { Package } from '../types';

interface PaymentPageProps {
  selectedPackage: Package | null;
  onPaymentConfirm: () => void;
}

const PaymentPage: React.FC<PaymentPageProps> = ({ selectedPackage, onPaymentConfirm }) => {
  const [proof, setProof] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setProof(e.target.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, you'd upload the proof and verify payment
    onPaymentConfirm();
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
                <span className="text-teal-300 font-bold text-2xl">{selectedPackage.price} جنيه</span>
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
            </div>

            <button 
                type="submit" 
                disabled={!proof}
                className="w-full bg-gradient-to-r from-teal-500 to-blue-600 text-white font-bold py-3 px-6 rounded-full hover:from-teal-600 hover:to-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed">
                تأكيد الدفع وتفعيل الحساب
            </button>
        </form>
      </div>
    </div>
  );
};

export default PaymentPage;
