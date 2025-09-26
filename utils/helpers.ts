import { Client } from "../types";

// This file can be used for helper functions in the future.

/**
 * Converts a file to a Base64 encoded string.
 * @param file The file to convert.
 * @returns A promise that resolves with the Base64 string.
 */
export const toBase64 = (file: File): Promise<string | ArrayBuffer | null> => 
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
});

/**
 * Generates a WhatsApp "click to chat" link with a pre-filled message.
 * @param phone The phone number to send the message to (e.g., '01030956097').
 * @param client The new client data to include in the message.
 * @param proofImageUrl The URL of the uploaded payment proof image.
 * @returns A URL string.
 */
export const generateWhatsAppLink = (phone: string, client: Omit<Client, 'id' | 'status'>, proofImageUrl: string): string => {
    const message = `
        *تسجيل عميل جديد - دكتور بزنس*
        ------------------------------------
        *اسم البزنس:* ${client.consultationData.business.name}
        *المجال:* ${client.consultationData.business.field}
        *الموقع:* ${client.consultationData.business.location}
        *البريد الإلكتروني:* ${client.email}
        ------------------------------------
        *الباقة المختارة:* ${client.selectedPackage.name}
        *السعر:* ${client.selectedPackage.price} جنيه
        ------------------------------------
        *رابط إثبات الدفع:*
        ${proofImageUrl}
        ------------------------------------
        *الرجاء مراجعة الدفع وتفعيل الحساب من لوحة التحكم.*
    `;
    const encodedMessage = encodeURIComponent(message.replace(/        /g, ''));
    // Note: The phone number should be in international format without '+' or '00'. Assuming Egypt country code '2'.
    const internationalPhone = `2${phone}`; 
    return `https://wa.me/${internationalPhone}?text=${encodedMessage}`;
};