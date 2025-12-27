import React from 'react';

// --- Card ---
export const NeoCard: React.FC<{ children: React.ReactNode; className?: string; color?: string }> = ({ 
  children, 
  className = "", 
  color = "bg-white" 
}) => {
  return (
    <div className={`border-2 border-black shadow-neo ${color} p-4 transition-transform hover:-translate-y-1 hover:shadow-neo-lg ${className}`}>
      {children}
    </div>
  );
};

// --- Button ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
}

export const NeoButton: React.FC<ButtonProps> = ({ children, variant = 'primary', className = "", ...props }) => {
  let bg = "bg-neo-main";
  let text = "text-black";
  let hover = "hover:bg-pink-400";

  if (variant === 'secondary') { bg = "bg-white"; hover = "hover:bg-gray-100"; }
  if (variant === 'danger') { bg = "bg-neo-danger"; text = "text-white"; hover = "hover:bg-red-600"; }
  if (variant === 'success') { bg = "bg-neo-success"; text = "text-white"; hover = "hover:bg-teal-600"; }

  return (
    <button 
      className={`
        ${bg} ${text} ${hover} border-2 border-black px-4 py-2 font-mono font-bold text-sm shadow-neo
        active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all
        disabled:opacity-50 disabled:cursor-not-allowed
        flex items-center justify-center gap-2
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
};

// --- Input (High Contrast) ---
export const NeoInput: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label?: string }> = ({ label, className = "", ...props }) => {
  return (
    <div className="flex flex-col gap-1 mb-4 w-full">
      {label && <label className="font-mono font-bold text-xs uppercase tracking-wider text-black">{label}</label>}
      <input 
        className={`
          w-full border-2 border-black p-3 font-mono text-black font-bold placeholder-gray-400
          outline-none transition-all
          bg-white shadow-none
          focus:shadow-neo focus:-translate-y-[2px] focus:-translate-x-[2px]
          disabled:bg-gray-200 disabled:cursor-not-allowed
          ${className}
        `}
        style={{ color: 'black' }} 
        autoComplete="off"
        {...props}
      />
    </div>
  );
};

// --- Select ---
export const NeoSelect: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string }> = ({ label, children, className = "", ...props }) => {
  return (
    <div className="flex flex-col gap-1 mb-4 w-full">
      {label && <label className="font-mono font-bold text-xs uppercase tracking-wider text-black">{label}</label>}
      <div className="relative">
        <select 
          className={`
            w-full border-2 border-black p-3 font-mono text-black font-bold
            outline-none bg-white 
            focus:shadow-neo focus:-translate-y-[2px] focus:-translate-x-[2px]
            transition-all appearance-none rounded-none
            ${className}
          `}
          {...props}
        >
          {children}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-black font-bold border-l-2 border-black bg-gray-100">
          ▼
        </div>
      </div>
    </div>
  );
};

// --- Modal ---
export const NeoModal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg bg-white border-4 border-black shadow-neo-lg animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center border-b-4 border-black p-4 bg-neo-accent">
          <h2 className="font-mono font-bold text-xl truncate text-black">{title}</h2>
          <button onClick={onClose} className="bg-white border-2 border-black w-8 h-8 flex items-center justify-center font-bold hover:bg-black hover:text-white transition-colors shadow-neo-sm active:shadow-none">
            X
          </button>
        </div>
        <div className="p-6 overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
};

// --- Badge ---
export const NeoBadge: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color = "bg-gray-200" }) => {
    return (
        <span className={`${color} border-2 border-black px-2 py-0.5 text-xs font-mono font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] mr-2 whitespace-nowrap`}>
            {children}
        </span>
    )
}