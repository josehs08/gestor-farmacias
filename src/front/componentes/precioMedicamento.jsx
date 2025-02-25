import { useState } from "react";
import React from "react";
import { Input } from "/src/components/ui/input.jsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableCaption,
  TableRow,
} from "@/components/ui/Table";
import { Label } from "@/components/ui/Label";

const PrecioMedicamento = () => {
  const [medicamento, setMedicamento] = useState("");
  const [precio, setPrecio] = useState([]);

  const handleChange = async (e) => {
    const nuevoMedicamento = e.target.value;
    setMedicamento(nuevoMedicamento);
    if (nuevoMedicamento) {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_APP_API_URL}/precio/${nuevoMedicamento}`
        );
        const data = await response.json();
        if (response.ok) {
          setPrecio(data.precios);
        }
      } catch (error) {
        console.error("Error:", error);
        alert("Hubo un problema al procesar el PDF.");
      }
    } else {
      setPrecio([]);
    }
  };
  return (
    <div className='m-4 p-4'>
      <Label for='medic'>Busca medicamentos:</Label>
      <Input
        id='medic'
        type='text'
        placeholder='Ingrese el medicamento'
        value={medicamento}
        onChange={handleChange}
        required
        className='flex gap-4'
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className='px-4 py-2'>Descripción</TableHead>
            <TableHead className='px-4 py-2'>Precio</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {precio.map((p) => (
            <TableRow key={p.descripcion}>
              <TableCell className='border px-4 py-2'>
                {p.descripcion}
              </TableCell>
              <TableCell className='border px-4 py-2'>{p.precio}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default PrecioMedicamento;
