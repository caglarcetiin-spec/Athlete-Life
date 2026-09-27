import { brand } from "./brand";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles/app.css";
document.title = brand.name;
const style = document.createElement("style");
style.textContent = `:root:not([data-theme="dark"]) {--ink:${brand.theme.text};--bg:${brand.theme.background};--panel:${brand.theme.card};--accent:${brand.theme.primary};--error:${brand.theme.error};--warning:${brand.theme.warning};color:var(--ink);background:var(--bg)}`;
document.head.append(style);
createRoot(document.getElementById("root")!).render(<App />);
