export const SiteFooter = () => {
  return (
    <footer className="mx-auto mt-16 max-w-4xl px-6 pb-8 text-center text-xs text-muted-foreground/70">
      <p>
        Age of Empires IV © Microsoft Corporation. Created under Microsoft's{" "}
        <a
          href="https://www.xbox.com/en-us/developers/rules"
          target="_blank"
          rel="noopener noreferrer"
          className="underline transition-colors hover:text-primary"
        >
          Game Content Usage Rules
        </a>{" "}
        using assets from Age of Empires IV. Not endorsed by or affiliated with Microsoft.
      </p>
    </footer>
  );
};
