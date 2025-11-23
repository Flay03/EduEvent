import { useState, useEffect } from 'react';

/**
 * Custom hook that debounces a value to avoid rapid re-renders or API calls.
 * @param value The value to debounce.
 * @param delay The debounce delay in milliseconds (default: 300ms).
 * @returns The debounced value, which updates only after the delay has passed.
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set up a timer that will update the debounced value after the delay.
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // This cleanup function runs before the effect is re-executed or when the component unmounts.
    // It clears the previous timer, effectively resetting the debounce period.
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]); // Re-run the effect only if the value or delay changes.

  return debouncedValue;
}
