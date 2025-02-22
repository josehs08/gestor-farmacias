import React, { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { DescargarExcel } from "./descargarExcel";

const ListaMedicamentos = () => {
  const [medicamentos, setMedicamentos] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchMedicamentos = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_APP_API_URL}/medicina`
      );
      const data = await response.json();
      setMedicamentos(data);
    } catch (error) {
      console.error("Error fetching medicamentos:", error);
    }
  };

  useEffect(() => {
    fetchMedicamentos();
  }, []);

  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
  };

  const filteredMedicamentos = medicamentos.filter((medicamento) =>
    medicamento.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className='container mx-auto p-4'>
      <h1 className='text-2xl font-bold mb-4'>Lista medicamentos</h1>
      <div className='flex justify-between items-center gap-4'>
        <Input
          type='text'
          placeholder='Buscar por descripción'
          value={searchTerm}
          onChange={handleSearch}
        />
        <DescargarExcel tipo='medicinas' />
      </div>
      <div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cantidad</TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Bulto</TableHead>
              <TableHead>Lote</TableHead>
              <TableHead>Exp</TableHead>
              <TableHead>Alic</TableHead>
              <TableHead>Precio Bs</TableHead>
              <TableHead>DC</TableHead>
              <TableHead>DD</TableHead>
              <TableHead>DL</TableHead>
              <TableHead>DV</TableHead>
              <TableHead>Neto Bs</TableHead>
              <TableHead>Neto USD</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMedicamentos.map((medicamento) => (
              <TableRow key={medicamento.id}>
                <TableCell>{medicamento.cantidad}</TableCell>
                <TableCell>{medicamento.codigo}</TableCell>
                <TableCell>{medicamento.descripcion}</TableCell>
                <TableCell>{medicamento.bulto}</TableCell>
                <TableCell>{medicamento.lote}</TableCell>
                <TableCell>{medicamento.exp}</TableCell>
                <TableCell>{medicamento.ALIC}</TableCell>
                <TableCell>{medicamento.PRECIO_BS}</TableCell>
                <TableCell>{medicamento.DC}</TableCell>
                <TableCell>{medicamento.DD}</TableCell>
                <TableCell>{medicamento.DL}</TableCell>
                <TableCell>{medicamento.DV}</TableCell>
                <TableCell>{medicamento.Neto_Bs}</TableCell>
                <TableCell>{medicamento.Neto_USD}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default ListaMedicamentos;
