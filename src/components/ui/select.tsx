'use client';

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useId,
  type ReactNode,
  type KeyboardEvent,
  type SelectHTMLAttributes,
} from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SelectOption<T extends string = string> {
  value: T;
  label: ReactNode;
  icon?: ReactNode;
  badge?: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
}

export type SelectSize = 'sm' | 'default' | 'lg';
export type SelectVariant = 'default' | 'subtle' | 'ghost';

export interface SelectProps<T extends string = string> {
  value?: T;
  defaultValue?: T;
  onChange?: (value: T) => void;
  onValueChange?: (value: T) => void;
  options?: SelectOption<T>[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
  size?: SelectSize;
  variant?: SelectVariant;
  id?: string;
  name?: string;
  'aria-label'?: string;
  align?: 'left' | 'right';
  fullWidth?: boolean;
  children?: ReactNode;
}

interface MenuCoords {
  top: number;
  left: number;
  width: number;
  placement: 'bottom' | 'top';
}

/**
 * Standard unified Select component with dark/light theme support,
 * custom floating menu with smooth animations, checkmarks, and full keyboard navigation.
 */
export function Select<T extends string = string>({
  value,
  defaultValue,
  onChange,
  onValueChange,
  options,
  placeholder = 'Chọn một mục...',
  disabled = false,
  className,
  triggerClassName,
  contentClassName,
  size = 'default',
  variant = 'default',
  id,
  name,
  'aria-label': ariaLabel,
  align = 'left',
  fullWidth,
  children,
}: SelectProps<T>) {
  const generatedId = useId();
  const selectId = id || generatedId;

  // Controlled or uncontrolled internal value
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState<T>((defaultValue ?? ('' as unknown)) as T);
  const currentValue = isControlled ? value : internalValue;

  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<MenuCoords | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Resolve options from prop or children
  const resolvedOptions: SelectOption<T>[] = React.useMemo(() => {
    if (options && options.length > 0) {
      return options;
    }

    if (children) {
      const extracted: SelectOption<T>[] = [];
      const flat = React.Children.toArray(children);

      flat.forEach((child) => {
        if (React.isValidElement(child)) {
          const childProps = child.props as Record<string, unknown>;
          if (child.type === 'option' || childProps.value !== undefined) {
            extracted.push({
              value: String(childProps.value ?? childProps.children ?? '') as T,
              label: (childProps.children ?? childProps.label ?? childProps.value) as ReactNode,
              disabled: Boolean(childProps.disabled),
            });
          }
        }
      });

      return extracted;
    }

    return [];
  }, [options, children]);

  const selectedOption = resolvedOptions.find((opt) => String(opt.value) === String(currentValue));

  // Calculate coordinates for portal placement
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const estimatedHeight = Math.min(280, resolvedOptions.length * 38 + 16);
    const placeAbove = spaceBelow < estimatedHeight && spaceAbove > spaceBelow;

    let left = rect.left;
    const width = Math.max(rect.width, 160);

    if (align === 'right') {
      left = rect.right - width;
    }

    // Clamp horizontally to stay inside viewport
    if (left + width > window.innerWidth - 12) {
      left = window.innerWidth - width - 12;
    }
    if (left < 12) {
      left = 12;
    }

    setCoords({
      top: placeAbove ? rect.top - 6 : rect.bottom + 6,
      left,
      width,
      placement: placeAbove ? 'top' : 'bottom',
    });
  }, [align, resolvedOptions.length]);

  // Position update on open and scroll/resize
  useEffect(() => {
    if (!isOpen) return;
    updatePosition();

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setIsOpen(false);
    };

    const handleScrollOrResize = () => {
      updatePosition();
    };

    document.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isOpen, updatePosition]);

  // Set initial highlight index when menu opens
  useEffect(() => {
    if (isOpen) {
      const selectedIndex = resolvedOptions.findIndex(
        (opt) => String(opt.value) === String(currentValue),
      );
      setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
    }
  }, [isOpen, resolvedOptions, currentValue]);

  const handleSelect = (optionValue: T) => {
    if (!isControlled) {
      setInternalValue(optionValue);
    }
    onChange?.(optionValue);
    onValueChange?.(optionValue);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault();
        setHighlightedIndex((prev) => {
          let next = prev + 1;
          while (next < resolvedOptions.length && resolvedOptions[next]?.disabled) {
            next++;
          }
          return next < resolvedOptions.length ? next : prev;
        });
        break;
      }
      case 'ArrowUp': {
        e.preventDefault();
        setHighlightedIndex((prev) => {
          let next = prev - 1;
          while (next >= 0 && resolvedOptions[next]?.disabled) {
            next--;
          }
          return next >= 0 ? next : prev;
        });
        break;
      }
      case 'Enter':
      case ' ': {
        e.preventDefault();
        const option = resolvedOptions[highlightedIndex];
        if (option && !option.disabled) {
          handleSelect(option.value);
        }
        break;
      }
      case 'Escape':
      case 'Tab': {
        setIsOpen(false);
        break;
      }
    }
  };

  const isFull = fullWidth ?? (className?.includes('w-full') || false);

  const displayContent = selectedOption ? (
    <span className="flex items-center gap-2 truncate">
      {selectedOption.icon && <span className="shrink-0">{selectedOption.icon}</span>}
      <span className="truncate">{selectedOption.label}</span>
      {selectedOption.badge && <span className="shrink-0">{selectedOption.badge}</span>}
    </span>
  ) : (
    <span className="text-muted-foreground truncate">{placeholder}</span>
  );

  return (
    <div
      className={cn('relative', isFull ? 'block w-full' : 'inline-block align-middle', className)}
    >
      {name && <input type="hidden" name={name} value={currentValue ? String(currentValue) : ''} />}

      <button
        type="button"
        ref={triggerRef}
        id={selectId}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => {
          if (!disabled) setIsOpen((prev) => !prev);
        }}
        onKeyDown={handleKeyDown}
        className={cn(
          // Base styles
          'border-border bg-background text-foreground transition-all select-none',
          'inline-flex items-center justify-between gap-2 border font-medium shadow-2xs',
          'hover:border-border/90 hover:bg-muted/30 focus-visible:ring-primary/25 focus-visible:border-primary focus-visible:ring-2 focus-visible:outline-none',
          'disabled:hover:bg-background disabled:cursor-not-allowed disabled:opacity-50',
          // Variants
          variant === 'subtle' && 'bg-muted/40 border-border/60 hover:bg-muted/70',
          variant === 'ghost' && 'hover:bg-muted/50 border-transparent bg-transparent shadow-none',
          // Sizes
          size === 'sm' && 'h-8 gap-1.5 rounded-lg px-2.5 text-xs',
          size === 'default' && 'h-10 gap-2 rounded-xl px-3.5 text-xs sm:text-sm',
          size === 'lg' && 'h-11 gap-2.5 rounded-xl px-4 text-sm sm:text-base',
          // Full width
          isFull ? 'w-full' : '',
          // Active open state
          isOpen && 'ring-primary/25 border-primary bg-background shadow-sm ring-2',
          triggerClassName,
        )}
      >
        <div className="min-w-0 flex-1 truncate text-left">{displayContent}</div>
        <ChevronDown
          className={cn(
            'text-muted-foreground size-3.5 shrink-0 transition-transform duration-200 sm:size-4',
            isOpen && 'text-primary rotate-180',
          )}
          aria-hidden="true"
        />
      </button>

      {/* Floating menu rendered in portal to prevent clipping and layout overflow */}
      {isOpen &&
        mounted &&
        coords &&
        createPortal(
          <div
            ref={menuRef}
            role="listbox"
            aria-label={ariaLabel}
            style={{
              position: 'fixed',
              top: coords.placement === 'top' ? 'auto' : `${coords.top}px`,
              bottom: coords.placement === 'top' ? `${window.innerHeight - coords.top}px` : 'auto',
              left: `${coords.left}px`,
              minWidth: `${coords.width}px`,
              maxWidth: 'calc(100vw - 1.5rem)',
              zIndex: 9999,
            }}
            className={cn(
              'border-border/80 bg-card/98 text-card-foreground rounded-xl border p-1 shadow-2xl backdrop-blur-md',
              'max-h-64 overflow-x-hidden overflow-y-auto',
              'animate-in fade-in-0 zoom-in-95 duration-100',
              contentClassName,
            )}
          >
            {resolvedOptions.length === 0 ? (
              <div className="text-muted-foreground px-3 py-2 text-center text-xs">
                Không có lựa chọn nào
              </div>
            ) : (
              resolvedOptions.map((opt, idx) => {
                const isSelected = String(opt.value) === String(currentValue);
                const isHighlighted = idx === highlightedIndex;

                return (
                  <div
                    key={String(opt.value) + idx}
                    role="option"
                    aria-selected={isSelected}
                    aria-disabled={opt.disabled}
                    onClick={() => {
                      if (!opt.disabled) {
                        handleSelect(opt.value);
                      }
                    }}
                    onMouseEnter={() => {
                      if (!opt.disabled) setHighlightedIndex(idx);
                    }}
                    className={cn(
                      'flex cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left transition-colors select-none',
                      size === 'sm' ? 'text-xs' : 'text-xs sm:text-sm',
                      opt.disabled && 'pointer-events-none cursor-not-allowed opacity-40',
                      isSelected
                        ? 'bg-primary/10 text-primary font-semibold'
                        : isHighlighted
                          ? 'bg-muted text-foreground'
                          : 'text-foreground hover:bg-muted/70',
                    )}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                      <div className="min-w-0 flex-1">
                        <div className="truncate">{opt.label}</div>
                        {opt.description && (
                          <div className="text-muted-foreground truncate text-[11px]">
                            {opt.description}
                          </div>
                        )}
                      </div>
                      {opt.badge && <span className="shrink-0">{opt.badge}</span>}
                    </div>
                    {isSelected && (
                      <Check
                        className="text-primary ml-2 size-3.5 shrink-0 sm:size-4"
                        aria-hidden="true"
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}

/**
 * Standard styled wrapper for native HTML select if pure native behavior is required.
 */
export function NativeSelect({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative inline-block w-full">
      <select
        className={cn(
          'border-input bg-background text-foreground h-10 w-full rounded-xl border px-3 py-2 text-xs font-medium sm:text-sm',
          'focus-visible:ring-primary/25 focus-visible:border-primary focus-visible:ring-2 focus-visible:outline-none',
          'cursor-pointer appearance-none pr-9 disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2"
        aria-hidden="true"
      />
    </div>
  );
}
