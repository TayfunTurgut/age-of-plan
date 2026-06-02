/** Site footer. Build data lives only in the browser; no accounts, no server. */
export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="container px-4 py-6 text-center text-xs text-muted-foreground">
        <p>
          Age of Plan — a build-order editor &amp; overlay for Age of Empires IV.
          Builds are saved in your browser only.
        </p>
      </div>
    </footer>
  );
}

export default SiteFooter;
