import React from 'react';
import { useCountUp } from '../../hooks/useCountUp';

/**
 * AnimatedNumber component
 * Smoothly interpolates from 0 to value with tabular-nums formatting.
 */
export const AnimatedNumber = ({
  value = 0,
  duration = 1300,
  decimals = 0,
  prefix = '',
  suffix = '',
  className = '',
}) => {
  const animatedVal = useCountUp(value, duration, 0);

  const formatted = decimals > 0
    ? animatedVal.toFixed(decimals)
    : Math.round(animatedVal).toString();

  return (
    <span className={`tabular-nums ${className}`}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
};

export default AnimatedNumber;
