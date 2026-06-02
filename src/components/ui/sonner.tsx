import { Toaster as Sonner, type ToasterProps } from "sonner";

/** Read the pre-hydration theme from the document root.
 *  M4 replaces this with the reactive `useTheme` hook for live updates. */
function currentTheme(): "light" | "dark" {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

/** App toaster. Matches the current theme so toasts read correctly. */
export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme={currentTheme()}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-popover group-[.toaster]:text-popover-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
}
