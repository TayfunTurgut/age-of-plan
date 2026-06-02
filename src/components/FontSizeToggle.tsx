import { Type } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFontSize } from "@/hooks/useFontSize";
import { FONT_SIZES, type FontSize } from "@/lib/fontSize";

const SIZE_LABEL: Record<FontSize, string> = {
  14: "Small",
  15: "Compact",
  16: "Default",
  17: "Comfortable",
  18: "Large",
  20: "Extra large",
};

/** Global text-size picker. Scales the whole UI for readability. */
export function FontSizeToggle() {
  const { fontSize, setFontSize } = useFontSize();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Text size"
          className="focus-ring"
        >
          <Type className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[10rem]">
        <DropdownMenuLabel>Text size</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={String(fontSize)}
          onValueChange={(v) => setFontSize(parseInt(v, 10) as FontSize)}
        >
          {FONT_SIZES.map((size) => (
            <DropdownMenuRadioItem key={size} value={String(size)}>
              <span className="flex w-full items-center justify-between gap-4">
                <span>{SIZE_LABEL[size]}</span>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {size}
                </span>
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default FontSizeToggle;
