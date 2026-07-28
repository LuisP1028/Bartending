"use client";

import React from 'react';
import CategoryAccordion from '@/components/CategoryAccordion';
import MagnificationCarousel from '@/components/MagnificationCarousel';

const colors = [
  '#D32F2F',
  '#1976D2',
  '#388E3C',
  '#FBC02D',
  '#8E24AA',
  '#F57C00',
  '#0288D1',
  '#5D4037',
];

function DummyCards({ count, prefix }: { count: number; prefix: string }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={`${prefix}-${i}`}
          style={{
            width: 80,
            height: 100,
            background: colors[i % colors.length],
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
            border: '1px solid #333',
          }}
        >
          {prefix} {i + 1}
        </div>
      ))}
    </>
  );
}

export default function CarouselTestPage() {
  return (
    <div
      style={{
        backgroundColor: '#121212',
        color: '#fff',
        padding: '40px',
        minHeight: '100vh',
        fontFamily: 'monospace',
      }}
    >
      <h1
        style={{
          borderBottom: '2px solid #FFB000',
          paddingBottom: '12px',
          marginBottom: '32px',
        }}
      >
        {">>"} PROXIMITY_MAGNIFICATION_TEST_ENV
      </h1>

      <CategoryAccordion title="00: LIQUORS & SPIRITS">
        <MagnificationCarousel>
          <DummyCards count={15} prefix="Liquor" />
        </MagnificationCarousel>
      </CategoryAccordion>

      <CategoryAccordion title="01: SYRUPS & MIXERS">
        <MagnificationCarousel>
          <DummyCards count={10} prefix="Syrup" />
        </MagnificationCarousel>
      </CategoryAccordion>

      <CategoryAccordion title="02: GARNISHES">
        <MagnificationCarousel>
          <DummyCards count={8} prefix="Garnish" />
        </MagnificationCarousel>
      </CategoryAccordion>
    </div>
  );
}
