import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { BrowserRouter } from "react-router-dom";
import Sidebar from "./componentes/sidebar.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <Sidebar />
      <main className='md:pl-64'>
        <App />
      </main>
    </BrowserRouter>
  </StrictMode>
);
