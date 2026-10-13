import { useState, useEffect, useRef } from 'react';

/**
 * useCountUp hook: animates a number from start to end with smooth cubic easing.
 * @param {number} targetValue - The target number to count up to.
 * @param {number} duration - Animation duration in ms (default: 1300ms).
 * @param {number} startValue - Starting number (default: 0).
 * @returns {number} The current animated number.
 */
export function useCountUp(targetValue, duration = 1300, startValue = 0) {
  const [current, setCurrent] = useState(startValue);
  const startRef = useRef(null);
  const frameRef = useRef(null);
  const target = typeof targetValue === 'number' ? targetValue : parseFloat(targetValue) || 0;

  useEffect(() => {
    // If user prefers reduced motion, jump straight to target
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setCurrent(target);
      return;
    }

    const startVal = startValue;
    const change = target - startVal;
    startRef.current = null;

    const easeOutExpo = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

    const step = (timestamp) => {
      if (!startRef.current) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutExpo(progress);
      
      const nextVal = startVal + change * eased;
      setCurrent(nextVal);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(step);
      } else {
        setCurrent(target);
      }
    };

    frameRef.current = requestAnimationFrame(step);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [target, duration, startValue]);

  return current;
}
