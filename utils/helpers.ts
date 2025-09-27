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

/**
 * Forces a browser download of a file from a URL.
 * Fetches the resource as a blob and creates a temporary link to trigger the download.
 * @param imageUrl The URL of the file to download.
 * @param fileName The desired name for the downloaded file.
 */
export const forceDownload = async (imageUrl: string, fileName: string) => {
    try {
        const response = await fetch(imageUrl);
        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    } catch (error) {
        console.error('Download failed:', error);
        // Fallback: Open in a new tab if the download fails due to CORS or other issues
        window.open(imageUrl, '_blank');
    }
};
