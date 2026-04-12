'use client';

import * as Switch from '@radix-ui/react-switch';
import { cn } from '@/lib/utils';

interface ToggleProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
}

export function Toggle({ checked, onCheckedChange, label, description, disabled }: ToggleProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      {(label || description) && (
        <div className="flex-1">
          {label && <p className="text-sm font-medium text-foreground">{label}</p>}
          {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        </div>
      )}
      <Switch.Root
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className={cn(
          'w-10 h-6 rounded-full transition-colors duration-200 cursor-pointer',
          checked ? 'bg-accent' : 'bg-border'
        )}
      >
        <Switch.Thumb
          className={cn(
            'block w-4 h-4 rounded-full bg-white transition-transform duration-200 translate-x-1',
            checked && 'translate-x-5'
          )}
        />
      </Switch.Root>
    </div>
  );
}
