import { Route, Routes } from "react-router-dom";
import Home from "./views/home.jsx";
import ListaFacturas from "./componentes/listaFacturas.jsx";
import ListaMedicamentos from "./componentes/listaMedicamentos.jsx";
import PrecioMedicamento from "./componentes/precioMedicamento.jsx";
import PrecioPorFactura from "./componentes/precioPorFactura.jsx";

const App = () => {
  return (
    <Routes>
      <Route path='/' element={<Home />} />
      <Route path='/medicamentos' element={<ListaMedicamentos />} />
      <Route path='/facturas' element={<ListaFacturas />} />
      <Route path='/precios' element={<PrecioMedicamento />} />
      <Route path='/precio-por-factura' element={<PrecioPorFactura />} />
    </Routes>
  );
};

export default App;
