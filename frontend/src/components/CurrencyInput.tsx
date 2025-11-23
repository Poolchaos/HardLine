import { forwardRef, InputHTMLAttributes, useEffect, useState } from 'react';

interface CurrencyInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange' | 'value'> {
  value: string | number;
  onChange: (value: string) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
}

const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onChange, onBlur, className = '', ...props }, ref) => {
    const [displayValue, setDisplayValue] = useState(String(value || ''));

    // Sync with external value changes
    useEffect(() => {
      const stringValue = String(value || '');
      if (stringValue !== displayValue && value !== '') {
        setDisplayValue(stringValue);
      }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let newValue = e.target.value;

      // Only allow digits, one period, or one comma
      // Remove any character that isn't a digit, period, or comma
      newValue = newValue.replace(/[^\d.,]/g, '');

      // Count periods and commas
      const periods = newValue.split('.').length - 1;
      const commas = newValue.split(',').length - 1;

      // If both period and comma exist, keep only the one that was there first
      if (periods > 0 && commas > 0) {
        const lastChar = newValue[newValue.length - 1];
        if (lastChar === '.' || lastChar === ',') {
          // Remove the last character (the one just typed)
          newValue = newValue.slice(0, -1);
        }
      }

      // Allow only one period
      if (periods > 1) {
        // Keep first period, remove others
        const parts = newValue.split('.');
        newValue = parts[0] + '.' + parts.slice(1).join('');
      }

      // Allow only one comma
      if (commas > 1) {
        // Keep first comma, remove others
        const parts = newValue.split(',');
        newValue = parts[0] + ',' + parts.slice(1).join('');
      }

      setDisplayValue(newValue);
      onChange(newValue);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      // Normalize comma to period and format
      const normalized = displayValue.replace(',', '.');
      const num = parseFloat(normalized);

      if (!isNaN(num) && num > 0) {
        const formatted = num.toFixed(2);
        setDisplayValue(formatted);
        onChange(formatted);
      } else if (displayValue === '' || num === 0) {
        setDisplayValue('');
        onChange('');
      }

      onBlur?.(e);
    };

    return (
      <input
        ref={ref}
        type="text"
        inputMode="decimal"
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        className={className}
        {...props}
      />
    );
  }
);

CurrencyInput.displayName = 'CurrencyInput';

export default CurrencyInput;
