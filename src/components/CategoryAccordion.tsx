"use client";

import React, { useState } from 'react';

interface CategoryAccordionProps {
  title: string;
  children: React.ReactNode;
  forceOpen?: boolean;
  id?: string;
}

export default function CategoryAccordion({ title, children, forceOpen, id }: CategoryAccordionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  React.useEffect(() => {
    if (forceOpen) setIsExpanded(true);
  }, [forceOpen]);

  return (
    <section id={id} style={{ marginBottom: '40px' }}>
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          background: '#1a1a1a',
          padding: 'clamp(12px, 2vw, 24px)',
          fontSize: 'clamp(12px, 2vw, 18px)',
          fontWeight: 'bold',
          borderLeft: '6px solid #FFB000',
          cursor: 'pointer',
          marginBottom: '16px',
          userSelect: 'none',
          display: 'flex',
          justifyContent: 'space-between'
        }}
      >
        <span>{title}</span>
        <span>{isExpanded ? '[-]' : '[+]'}</span>
      </div>
      
      {isExpanded && (
        <div style={{ transition: 'all 0.3s ease-in-out' }}>
          {children}
        </div>
      )}
    </section>
  );
}
