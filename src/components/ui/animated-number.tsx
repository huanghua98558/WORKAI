'use client';

import React, { useState, useEffect } from 'react';

interface AnimatedNumberProps {
  value: number | null;
  formatFn?: (num: number) => string;
  duration?: number;
}

export function AnimatedNumber({ value, formatFn, duration = 300 }: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState<number>(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (value === null) {
      setDisplayValue(0);
      return;
    }

    const diff = value - displayValue;
    if (Math.abs(diff) < 1) {
      setDisplayValue(value);
      setIsAnimating(false);
      return;
    }

    setIsAnimating(true);
    const steps = 10;
    const stepDuration = duration / steps;
    const stepValue = diff / steps;

    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      setDisplayValue((prev) => Math.round(prev + stepValue));

      if (currentStep >= steps) {
        clearInterval(interval);
        setDisplayValue(value);
        setIsAnimating(false);
      }
    }, stepDuration);

    return () => clearInterval(interval);
  }, [value]);

  const formatted = value === null ? '-' : (formatFn ? formatFn(displayValue) : Math.round(displayValue).toString());

  return (
    <span className={`transition-opacity duration-150 ${isAnimating ? 'opacity-70' : 'opacity-100'}`}>
      {formatted}
    </span>
  );
}
