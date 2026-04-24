import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  document.body.innerHTML =
    '<div style="font-family:system-ui;padding:2rem;max-width:40rem;margin:0 auto;">' +
    '<h1 style="font-size:1.25rem;">Could not start Age of Plan</h1>' +
    '<p>The page is missing its root container. Try reloading; if the problem ' +
    "persists, the app's HTML shell is corrupted — clear your browser cache.</p>" +
    "</div>";
  throw new Error("Root element #root not found in document");
}

createRoot(rootElement).render(<App />);
