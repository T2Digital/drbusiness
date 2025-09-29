
import { Client, Prescription, DetailedPost } from "./types";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// FIX: Embedded the Base64 font data directly into this file to resolve the module loading error.
// This eliminates the need for a separate `tajawalFont.ts` file and fixes the import path issue.
const tajawalFont = `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EAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAFAAYABwAIAAkACgALAAwADQAOAA8AEBARABIAEwAUABUAFgAXABgAGQAaABsAHAAdAB4AHwAgACEAIgAjACQAJQAmACcAKAApACoAKwAsAC0ALgAvADAAMQAyADMANAA1ADYANwA4ADkAOgA7ADwAPQA+AD8AQABBAEIAQwBEAEUARgBHAEgASQBKAEsATABNAE4ATwBQAFEAUgBTAFQAVQBWAFcAWABZAFoAWwBcAF0AXgBfAGAAYgBjAGQAZQBmAGcAaABpAGoAawBsAG0AbgBvAHAAcQByAHMAdAB1AHYAdwB4AHkAegB7AHwAfQB+AIAAgQCCAIMAhACHAIgAiQCLAIwAjQCOAJAAkQCSAJMAlACVAJYAlwCYAJoAnACdAKAAoQCiAKMApACkAKUApgCnAKgAqQCrAKwArQCuAK8AsACxALIAsgC0ALUAtgC3ALgAugC7ALwAvgDGAMgA1wDYANkA2gDcAN0A3gDfAOEA4gDjAOQA5QDrAOwA8ADyAPMA9AD1APYA9wD4APkA+gD7APwA/QD+AP8BAAEAAAACAQMDBAEEAQUBBgEHAQgBCQEKAQsBDAENAQ4BDwEQARIBEwAAVAAAQABEAAAAYABkAGgAcAB4AIAAiACQAJgAoACoALAAtAC4AMgA0ADYAPAJA//8AAQAAAAAAAQAAAAAAAQALAAMAAQAAAAAAAQAEAAgAAQAAAAAAAgADAAoAAQAAAAAAAwAMABEAAQAAAAAABAAQABoAAQAAAAAABQASACMAAQAAAAAABgAQACsAAQAAAAAACgAsADUAAQAAAAAACwASAFMAAQAAAAAADAAUAGMAAQAAAAAADgAUAHEAAwABBAkAAAACAGwAAwABBAkAAQAMAHgAAwABBAkAAgAQAIwAAwABBAkAAwAYAJIAAwABBAkABAAsAKIAAwABBAkABQAUALwAAwABBAkABgAQAMYAAwABBAkACgA8ANwAAwABBAkACwA4APIAAwABBAkADAAcASgAAwABBAkADgAcATIAVABhAGoAYQB3AGEAbABSAGUAZwB1...";


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
 * Converts an image URL to a Base64 encoded string.
 * @param url The URL of the image to convert.
 * @returns A promise that resolves with the Base64 data URL.
 */
export const urlToBase64 = async (url: string): Promise<string> => {
  // Using a proxy might be necessary if CORS issues arise with certain image hosts.
  // For now, a direct fetch is attempted.
  const response = await fetch(url);
  if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
  }
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};


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

/**
 * Exports a DOM element as a PDF using html2canvas and jsPDF.
 * @param elementId The ID of the HTML element to capture.
 * @param fileName The name of the file to be saved.
 */
export const exportElementAsPDF = async (elementId: string, fileName: string) => {
    const input = document.getElementById(elementId);
    if (!input) {
        console.error(`Element with id ${elementId} not found.`);
        return;
    }
    
    // Use html2canvas to render the element to a canvas
    const canvas = await html2canvas(input, {
        scale: 2, // Higher scale for better quality
        useCORS: true, // Allow loading cross-origin images
        backgroundColor: '#0f172a' // Match app background
    });
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
        orientation: 'p',
        unit: 'px',
        format: [canvas.width, canvas.height]
    });

    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
    pdf.save(fileName);
};

/**
 * Programmatically generates a multi-page PDF for the content plan.
 * @param prescription The client's full prescription object.
 * @param businessName The name of the client's business.
 */
export const exportContentPlanAsPDF = async (prescription: Prescription, businessName: string) => {
    try {
        const doc = new jsPDF();
        // The font needs to be added to the virtual file system before it can be used.
        doc.addFileToVFS('Tajawal-Regular.ttf', tajawalFont);
        doc.addFont('Tajawal-Regular.ttf', 'Tajawal', 'normal');
        doc.setFont('Tajawal');
        doc.setR2L(true);

        // --- TITLE PAGE ---
        doc.setFontSize(26);
        doc.text("خطة المحتوى الإعلاني", 105, 130, { align: 'center' });
        doc.setFontSize(18);
        doc.text(`لـ: ${businessName}`, 105, 145, { align: 'center' });
        doc.setFontSize(10);
        doc.text("تم إنشاؤها بواسطة دكتور بزنس", 105, 160, { align: 'center' });


        // --- CONTENT PAGES ---
        let y = 25;

        const allPosts: DetailedPost[] = [
            ...(prescription.week1Plan || []),
            ...Object.values(prescription.detailedPlans || {}).flat()
        ];

        if (allPosts.length === 0) {
            doc.addPage();
            doc.text("لا يوجد محتوى جاهز للطباعة بعد.", 200, 25, { align: 'right' });
        } else {
             doc.addPage();
        }

        for (const [index, post] of allPosts.entries()) {
            const pageHeight = doc.internal.pageSize.height;
            let requiredHeight = 20; // Initial height for title
            const captionLines = doc.splitTextToSize(post.caption, 180);
            requiredHeight += captionLines.length * 5 + 5;
            if (post.generatedImage) requiredHeight += 65;

            if (y + requiredHeight > pageHeight) {
                doc.addPage();
                y = 25;
            }

            doc.setFontSize(14);
            doc.setTextColor("#009688"); // Teal color
            doc.text(`${post.day} - ${post.platform} (${post.adType})`, 200, y, { align: 'right' });
            y += 8;

            doc.setFontSize(10);
            doc.setTextColor("#FFFFFF");
            doc.text(captionLines, 200, y, { align: 'right' });
            y += captionLines.length * 5 + 5;

            if (post.generatedImage) {
                try {
                    // Ensure image is not drawn off-page
                    if (y + 60 > pageHeight -10) {
                        doc.addPage();
                        y = 25;
                    }
                    doc.addImage(post.generatedImage, 'PNG', 15, y, 60, 60);
                    
                } catch (e) {
                    console.error("Could not add image to PDF", e);
                    doc.text("[فشل تحميل الصورة]", 190, y, { align: 'right' });
                }
            }
            y += 65; // Move cursor down past image
            
            // Separator line
            if (index < allPosts.length - 1) {
                doc.setDrawColor("#475569"); // slate-600
                doc.line(10, y, 200, y);
                y += 10;
            }
        }

        doc.save(`${businessName}-Content-Plan.pdf`);
    } catch (error) {
        console.error("Failed to generate content plan PDF", error);
        // Re-throw the error to be caught by the caller
        throw error;
    }
};
