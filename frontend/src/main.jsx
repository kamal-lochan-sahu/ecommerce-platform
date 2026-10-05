import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { reloadOnceForStaleChunk } from "./utils/chunkReload";

// Vite fires this when a lazy-loaded chunk 404s (i.e. a new version was deployed)
window.addEventListener("vite:preloadError", () => {
  reloadOnceForStaleChunk();
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
