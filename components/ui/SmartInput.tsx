
import React, { useState, useEffect, useRef } from 'react';

interface SmartInputProps {
  value: number;
  onCommit: (newValue: number) => void;
  placeholder?: string;
  className?: string;
  readOnly?: boolean;
  textAlign?: 'left' | 'right' | 'center';
  formatOptions?: Intl.NumberFormatOptions;
}

export const SmartInput: React.FC<SmartInputProps> = ({ 
  value, 
  onCommit, 
  placeholder = "0", 
  className = "", 
  readOnly = false,
  textAlign = 'right',
  formatOptions = {} 
}) => {
  // Initialize internal state
  const [displayValue, setDisplayValue] = useState(() => {
    return value === 0 ? "0" : new Intl.NumberFormat("vi-VN", formatOptions).format(value);
  });
  
  const [isFocused, setIsFocused] = useState(false);

  // Track previous value to prevent unnecessary updates from parent re-renders
  const prevValueRef = useRef(value);

  // Serialize formatOptions to avoid dependency on unstable object reference (new object on every render)
  const formatOptionsStr = JSON.stringify(formatOptions);

  useEffect(() => {
    // Only update internal state if the prop value has actually changed numerically.
    // This prevents re-renders from unstable props (like formatOptions) from resetting
    // the user's input while they are typing (e.g. preventing empty string "" -> "0" snap back).
    if (value !== prevValueRef.current) {
      prevValueRef.current = value;
      
      // If value changes externally, update display (unless focused)
      if (!isFocused) {
         if (value === 0) {
           setDisplayValue("0");
         } else {
           setDisplayValue(new Intl.NumberFormat("vi-VN", formatOptions).format(value));
         }
      }
    }
  }, [value, formatOptionsStr, isFocused, formatOptions]);

  const evaluateExpression = (expr: string): number => {
    // 1. Remove thousands separators (.) and spaces. Keep +, -
    const clean = expr.replace(/\./g, '').replace(/\s/g, '');
    if (!clean) return 0;

    // 2. Allow only digits and operators
    if (/[^0-9+\-]/.test(clean)) return 0; 

    // 3. Simple parser for A + B - C
    const parts = clean.split(/([+\-])/);
    let total = 0;
    let op = '+';

    for (const part of parts) {
      if (part === '+' || part === '-') {
        op = part;
      } else if (part) {
        const val = parseInt(part, 10);
        if (!isNaN(val)) {
          if (op === '+') total += val;
          if (op === '-') total -= val;
        }
      }
    }
    return total;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Regex: Allow digits, +, -, and dots. Also empty string.
    if (/^[0-9+\-.]*$/.test(val)) {
      setDisplayValue(val);
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    // Experience improvement: If value is 0, clear it so user can type immediately
    if (value === 0 && displayValue === "0") {
       setDisplayValue("");
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (readOnly) return;

    // If empty, treat as 0
    if (displayValue === "") {
        onCommit(0);
        setDisplayValue("0");
        return;
    }

    const result = evaluateExpression(displayValue);
    
    // Update parent if value changed
    if (result !== value) {
        onCommit(result);
    }
    
    // Re-format display to standard format
    setDisplayValue(new Intl.NumberFormat("vi-VN", formatOptions).format(result));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur(); // Trigger blur to save
    }
  };

  return (
    <input
      type="text"
      className={`${className} text-${textAlign}`}
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      readOnly={readOnly}
      inputMode="decimal"
    />
  );
};
