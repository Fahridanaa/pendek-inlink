import "./style.css";
import Alpine from "alpinejs";
import htmx from "htmx.org";

// Expose globally
(window as any).htmx = htmx;
(window as any).Alpine = Alpine;

// Initialize Alpine on HTMX swapped content (including OOB swaps)
document.addEventListener("htmx:afterSwap", (evt) => {
  Alpine.initTree((evt as CustomEvent).detail.target);
});

Alpine.start();
