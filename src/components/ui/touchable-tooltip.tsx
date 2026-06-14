import {
  cloneElement,
  isValidElement,
  useEffect,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactElement,
  type ReactNode,
} from "react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Hover tooltip on devices that can hover; tap-to-open popover on touch
 * devices. Radix Tooltip is hover-only and never opens on tap, so on a phone an
 * informational tooltip would be unreachable. This wrapper swaps in a Popover
 * for the touch path while keeping the desktop hover behavior identical.
 */

const HOVER_NONE = "(hover: none)";

function useIsTouchDevice(): boolean {
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
}

type Side = "top" | "right" | "bottom" | "left";

type ClickableProps = { onClick?: (e: ReactMouseEvent) => void };

type Props = {
  content: ReactNode;
  /** A single React element trigger that accepts a ref / spread props. */
  children: ReactElement;
  side?: Side;
  sideOffset?: number;
  collisionPadding?: number;
};

export function TouchableTooltip({
  content,
  children,
  side = "top",
  sideOffset = 6,
  collisionPadding = 8,
}: Props) {
  const isTouch = useIsTouchDevice();

  if (isTouch) {
    // The trigger may sit inside an ancestor that treats clicks as
    // "advance step" (the runner card). Stop propagation so opening the
    // popover doesn't also fire the ancestor's handler.
    const trigger = isValidElement<ClickableProps>(children)
      ? cloneElement(children, {
          onClick: (e: ReactMouseEvent) => {
            e.stopPropagation();
            children.props.onClick?.(e);
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
      <TooltipContent side={side} sideOffset={sideOffset} collisionPadding={collisionPadding}>
        {content}
      </TooltipContent>
    </Tooltip>
  );
}
