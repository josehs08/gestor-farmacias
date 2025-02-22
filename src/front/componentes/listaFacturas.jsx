import React, { useState, useEffect } from "react";
import AgregarMedicamentos from "./agregarMedicamentos.jsx";
import AgregarFacturas from "./agregarFacturas.jsx";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DescargarExcel } from "./descargarExcel.jsx";
import AgregarFacturasUrl from "./agregarFacturasUrl.jsx";

const ListaFacturas = () => {
  const [facturas, setFacturas] = useState([]);

  useEffect(() => {
    const fetchFacturas = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_APP_API_URL}/facturas`
        );
        const data = await response.json();
        setFacturas(data);
      } catch (error) {
        console.error("Error fetching facturas:", error);
      }
    };

    fetchFacturas();
  }, []);

  return (
    <div className='container mx-auto p-4'>
      <AgregarFacturasUrl />
      <div className='flex justify-between mb-4 gap-4'>
        <h1 className='text-2xl font-bold mb-4'>Lista de facturas</h1>
        <div className='flex gap-4'>
          <AgregarFacturas />
          <DescargarExcel tipo='facturas' />
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Id</TableHead>
            <TableHead>Numero de factura</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead>Tipo De Cambio</TableHead>
            <TableHead>Agregar</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {facturas.map((factura) => (
            <TableRow key={factura.id}>
              <TableCell>{factura.id}</TableCell>
              <TableCell>{factura.numero_factura}</TableCell>
              <TableCell>{factura.fecha}</TableCell>
              <TableCell>{factura.tipo_de_cambio}</TableCell>
              <TableCell>
                <AgregarMedicamentos uploadId={factura.id} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default ListaFacturas;
