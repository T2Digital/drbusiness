
import React from 'react';

export const BrainCircuitIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M12 5a3 3 0 1 0-5.993.134" />
    <path d="M12 5a3 3 0 1 0 5.993.134" />
    <path d="M12 5a3 3 0 1 1-5.993-.134" />
    <path d="M12 5a3 3 0 1 1 5.993-.134" />
    <path d="M12 19a3 3 0 1 0-5.993-.134" />
    <path d="M12 19a3 3 0 1 0 5.993.134" />
    <path d="M12 19a3 3 0 1 1-5.993.134" />
    <path d="M12 19a3 3 0 1 1 5.993.134" />
    <path d="M12 12a3 3 0 1 0-5.993.134" />
    <path d="M12 12a3 3 0 1 0 5.993.134" />
    <path d="M12 12a3 3 0 1 1-5.993-.134" />
    <path d="M12 12a3 3 0 1 1 5.993.134" />
    <path d="M20 12a1 1 0 0 0 1 1h.01" />
    <path d="M4 12a1 1 0 0 1-1 1H2.99" />
    <path d="M12 20a1 1 0 0 0 1 1v.01" />
    <path d="M12 4a1 1 0 0 1-1 1V4.99" />
    <path d="m15.5 15.5.01.01" />
    <path d="m8.5 15.5.01.01" />
    <path d="m8.5 8.5.01.01" />
    <path d="m15.5 8.5.01.01" />
  </svg>
);

export const Upload: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" x2="12" y1="3" y2="15" />
  </svg>
);

export const LoadingSpinner: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props} className={`animate-spin ${props.className}`}>
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

export const UserCircle: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M18 20a6 6 0 0 0-12 0" />
    <circle cx="12" cy="10" r="4" />
    <circle cx="12" cy="12" r="10" />
  </svg>
);

export const CreditCard: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect width="20" height="14" x="2" y="5" rx="2" />
    <line x1="2" x2="22" y1="10" y2="10" />
  </svg>
);
