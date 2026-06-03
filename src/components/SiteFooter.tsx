/** Site footer. Build data lives only in the browser; no accounts, no server. */
export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="container space-y-2 px-4 py-6 text-center text-xs text-muted-foreground">
        <p>
          Age of Plan — a build-order editor &amp; overlay for Age of Empires IV.
          Builds are saved in your browser only.
        </p>
        <p className="opacity-80">
          Age of Empires IV © Microsoft Corporation. Age of Plan was created under
          Microsoft's{" "}
          <a
            href="https://www.xbox.com/en-US/developers/rules"
            target="_blank"
            rel="noopener noreferrer"
            className="underline-offset-2 hover:text-primary hover:underline focus-ring"
          >
            Game Content Usage Rules
          </a>{" "}
          and is not endorsed by or affiliated with Microsoft. Game data and icons
          are sourced from{" "}
          <a
            href="https://aoe4guides.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline-offset-2 hover:text-primary hover:underline focus-ring"
          >
            aoe4guides.com
          </a>
          .
        </p>
      </div>
    </footer>
  );
}

export default SiteFooter;
