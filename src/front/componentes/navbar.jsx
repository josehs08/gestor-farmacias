import React from "react";
import { Link } from "react-router-dom";
import { ThemeProvider } from "../../components/ui/theme-provider";
import { ModeToggle } from "../../components/ui/mode-toggle.jsx";

const Navbar = () => {
  return (
    <nav className='p-4'>
      <div className='flex container mx-auto gap-4'>
        <Link to='/'>Inicio</Link>
        <Link to='/medicamentos'>Medicamentos</Link>
        <Link to='/facturas'>Facturas</Link>
        <ThemeProvider defaultTheme='light' storageKey='vite-ui-theme'>
          <ModeToggle />
        </ThemeProvider>
      </div>
    </nav>
  );
};

export default Navbar;
