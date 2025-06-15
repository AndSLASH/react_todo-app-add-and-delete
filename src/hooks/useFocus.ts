import { useEffect, useRef, useState } from 'react';

export const useFocus = () => {
  const [shouldFocus, setShouldFocus] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (shouldFocus && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
        setShouldFocus(false);
      }, 50);
    }
  }, [shouldFocus]);

  return {
    inputRef,
    setShouldFocus,
  };
};
