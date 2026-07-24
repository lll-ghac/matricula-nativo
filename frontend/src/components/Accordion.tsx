import React, { useState } from 'react';

interface AccordionProps {
  title: string;
  icon?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

const Accordion: React.FC<AccordionProps> = ({ title, icon, defaultOpen = false, children }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="mb-6">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center mb-4 pb-3 px-4 -mx-4 transition-all"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderBottom: '1px solid var(--color-border)',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.08)',
          cursor: 'pointer'
        }}
      >
        <h3 className="text-lg font-bold" style={{ color: 'var(--color-primary)' }}>
          {icon && <span className="mr-2">{icon}</span>}
          {title}
        </h3>
        <span
          className="text-2xl transition-transform duration-200"
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            color: 'var(--color-primary)'
          }}
        >
          ▼
        </span>
      </button>

      <div
        style={{
          maxHeight: isOpen ? '10000px' : '0',
          overflow: 'hidden',
          transition: 'max-height 0.3s ease-in-out'
        }}
      >
        <div className="pt-2">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Accordion;
