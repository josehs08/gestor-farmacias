import { useState } from "react";
import { MARGEN_VENTA_DEFAULT } from "./precioFactura.js";

const MARGEN_STORAGE_KEY = "gestor-farmacias:margen-ganancia";

const leerMargenGuardado = () => {
  try {
    return localStorage.getItem(MARGEN_STORAGE_KEY) ?? String(MARGEN_VENTA_DEFAULT);
  } catch {
    return String(MARGEN_VENTA_DEFAULT);
  }
};

// % de ganancia compartido por las vistas de precios y recordado entre
// visitas, para que "Precios" y "Precio por factura" muestren la misma venta.
export const useMargenVenta = () => {
  const [margen, setMargen] = useState(leerMargenGuardado);

  const cambiarMargen = (valor) => {
    setMargen(valor);
    try {
      localStorage.setItem(MARGEN_STORAGE_KEY, valor);
    } catch {
      // localStorage puede no estar disponible (modo privado, etc.); no es crítico.
    }
  };

  return [margen, cambiarMargen];
};

export default useMargenVenta;
