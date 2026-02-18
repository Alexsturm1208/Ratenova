'use client';

import { useEffect, useState } from 'react';

interface Props {
  percent: number;
  size?: number;
  strokeWidth?: number;
}

export default function ProgressRing({ percent, size = 140, strokeWidth = 8 }: Props) {
  const [animPercent, setAnimPercent] = useState(0);
  const r = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * r;

  useEffect(() => {
    const timer = setTimeout(() => setAnimPercent(Math.min(percent, 100)), 150);
    return () => clearTimeout(timer);
  }, [percent]);

  return (
    <svg width={size} height={size}>
      <defs>
        <linearGradient id={`rg-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34D399" />
          <stop offset="100%" stopColor="#38BDF8" />
        </linearGradient>
        <filter id={`gl-${size}`}>
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={`url(#rg-${size})`} strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference - (animPercent / 100) * circumference}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        filter={`url(#gl-${size})`}
        style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.16,1,0.3,1)' }}
      />
    </svg>
  );
}
