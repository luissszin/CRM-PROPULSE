console.log("CRITICAL: main.tsx starting top of file");
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

console.log("main.tsx loading... importing finished");
try {
    const rootElement = document.getElementById("root");
    console.log("main.tsx: rootElement found:", !!rootElement);
    if (!rootElement) {
        console.error("CRITICAL: root element not found!");
    } else {
        const root = createRoot(rootElement);
        console.log("main.tsx: about to render App");
        root.render(<App />);
        console.log("main.tsx: render called");
    }
} catch (e) {
    console.error("CRITICAL: main.tsx render error:", e);
}
