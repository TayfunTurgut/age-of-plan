import { cloneElement, isValidElement, useEffect, useState, type ReactElement, type ReactNode, type MouseEvent as ReactMouseEvent } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * Hover tooltip on devices that can hover; tap-to-open popover on touch
 * devices. Radix Tooltip is intentionally hover-only and never opens on
 * tap, so on a phone any informational `<Tooltip>` is silently unreachable.
 * This wrapper swaps in a Radix Popover for the touch path while keeping
 * the desktop hover behavior identical.
 */

const HOVER_NONE = "(hover: none)";

const useIsTouchDevice = (): boolean => {
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia(HOVER_NONE);
    setIsTouch(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setIsTouch(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return isTouch;
};

type Side = "top" | "right" | "bottom" | "left";

type Props = {
  content: ReactNode;
  /** A single React element used as the trigger. Must accept a ref / spread
   *  props (Radix `asChild` requirement). */
  children: ReactElement;
  side?: Side;
  sideOffset?: number;
  collisionPadding?: number;
};

export const TouchableTooltip = ({
  content,
  children,
  side = "top",
  sideOffset = 6,
  collisionPadding = 8,
}: Props) => {
  const isTouch = useIsTouchDevice();

  if (isTouch) {
    // The trigger may sit inside an ancestor that treats clicks as
    // "advance step" (the runner card). Stop propagation so opening the
    // popover doesn't also fire the ancestor's click handler.
    const trigger = isValidElement(children)
      ? cloneElement(children as ReactElement<{ onClick?: (e: ReactMouseEvent) => void }>, {
          onClick: (e: ReactMouseEvent) => {
            e.stopPropagation();
            const original = (children.props as { onClick?: (e: ReactMouseEvent) => void }).onClick;
            original?.(e);
          },
        })
      : children;

    return (
      <Popover>
        <PopoverTrigger asChild>{trigger}</PopoverTrigger>
        <PopoverContent
          side={side}
          sideOffset={sideOffset}
          collisionPadding={collisionPadding}
          className={cn(
            "w-auto rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md",
          )}
        >
          {content}
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent
        side={side}
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
      >
        {content}
      </TooltipContent>
    </Tooltip>
  );
};
