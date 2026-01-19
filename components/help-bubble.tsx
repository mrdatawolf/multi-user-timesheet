'use client';

import { HelpContent } from '@/lib/help-content';
import { cn } from '@/lib/utils';
import { Info, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HelpBubbleProps {
  content: HelpContent;
  isVisible: boolean;
  onClose?: () => void;
  className?: string;
}

/**
 * HelpBubble Component
 *
 * Displays contextual help information in a styled bubble/tooltip.
 * Shows "What it is", "How to use", and "How to update" sections.
 */
export function HelpBubble({ content, isVisible, onClose, className }: HelpBubbleProps) {
  if (!isVisible) return null;

  return (
    <div
      className={cn(
        'absolute z-[100] w-72 bg-popover border border-blue-200 rounded-lg shadow-lg p-3',
        'animate-in fade-in-0 zoom-in-95 duration-200',
        'dark:border-blue-800',
        className
      )}
      role="tooltip"
      aria-live="polite"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-sm flex items-center gap-2 text-blue-700 dark:text-blue-300">
          <Info className="h-4 w-4 flex-shrink-0" />
          <span>{content.title}</span>
        </h3>
        {onClose && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 w-6 p-0 hover:bg-blue-100 dark:hover:bg-blue-900"
            aria-label="Close help"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Content sections */}
      <div className="space-y-2 text-xs">
        <div>
          <p className="font-medium text-muted-foreground mb-0.5">What it is:</p>
          <p className="text-foreground">{content.whatItIs}</p>
        </div>

        <div>
          <p className="font-medium text-muted-foreground mb-0.5">How to use:</p>
          <p className="text-foreground">{content.howToUse}</p>
        </div>

        <div>
          <p className="font-medium text-muted-foreground mb-0.5">How to update:</p>
          <p className="text-foreground">{content.howToUpdate}</p>
        </div>
      </div>

      {/* Arrow indicator (pointing up) */}
      <div className="absolute -top-2 left-4 w-3 h-3 bg-popover border-l border-t border-blue-200 dark:border-blue-800 rotate-45" />
    </div>
  );
}

/**
 * Compact help bubble for inline tooltips
 */
interface CompactHelpBubbleProps {
  content: HelpContent;
  isVisible: boolean;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function CompactHelpBubble({ content, isVisible, position = 'bottom' }: CompactHelpBubbleProps) {
  if (!isVisible) return null;

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-popover border-x-transparent border-b-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-popover border-x-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-popover border-y-transparent border-r-transparent',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-popover border-y-transparent border-l-transparent',
  };

  return (
    <div
      className={cn(
        'absolute z-[100] w-64 bg-popover border border-blue-200 rounded-md shadow-md p-2',
        'animate-in fade-in-0 zoom-in-95 duration-150',
        'dark:border-blue-800',
        positionClasses[position]
      )}
      role="tooltip"
    >
      <p className="text-xs font-medium text-blue-700 dark:text-blue-300 flex items-center gap-1 mb-1">
        <Info className="h-3 w-3" />
        {content.title}
      </p>
      <p className="text-xs text-muted-foreground">{content.whatItIs}</p>

      {/* Arrow */}
      <div className={cn('absolute w-0 h-0 border-4', arrowClasses[position])} />
    </div>
  );
}
