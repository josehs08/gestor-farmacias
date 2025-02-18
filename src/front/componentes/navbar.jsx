import React from "react";
import { Link } from "react-router-dom";
import { ModeToggle } from "../../components/ui/mode-toggle";

const Navbar = () => {
  return (
    <nav className='p-4'>
      <div className='container mx-auto'>
        <ModeToggle />
        <Link to='/'>Inicio</Link>
        <Link to='/medicamento' className='ml-4'>
          Medicamentos
        </Link>
        <Link to='/receta' className='ml-4'>
          Recetas
        </Link>
      </div>
    </nav>
  );
};

export default Navbar;
