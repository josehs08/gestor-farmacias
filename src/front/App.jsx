import { Route, Routes } from "react-router-dom";
import Home from "./views/home.jsx";
import ListaFacturas from "./componentes/listaFacturas.jsx";
import ListaMedicamentos from "./componentes/listaMedicamentos.jsx";

const App = () => {
  return (
    <Routes>
      <Route path='/' element={<Home />} />
      <Route path='/medicamentos' element={<ListaMedicamentos />} />
      <Route path='/facturas' element={<ListaFacturas />} />
    </Routes>
  );
};

export default App;
