import { useState, useCallback } from "react";
import React from "react";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Plate, PlateFiscalHeader, PlateControls, PlateFooter } from "@/components/ui/plate";
import { TicketStatusRow } from "./ticketStatus.jsx";
import { WorkSurface } from "./workSurface.jsx";

const PrecioMedicamento = () => {
  const [medicamento, setMedicamento] = useState("");
  const [precio, setPrecio] = useState([]);
  const [status, setStatus] = useState("idle"); // idle | loading | success | error

  const buscarPrecio = useCallback(async (nombre) => {
    if (!nombre) {
      setPrecio([]);
      setStatus("idle");
      return;
    }
    setStatus("loading");
    try {
      const response = await fetch(`${import.meta.env.VITE_APP_API_URL}/precio/${nombre}`);
      const data = await response.json();
      if (response.ok) {
        setPrecio(data.precios);
        setStatus("success");
      } else {
        setPrecio([]);
        setStatus("success");
      }
    } catch (error) {
      console.error("Error:", error);
      setStatus("error");
    }
  }, []);

  const handleChange = (e) => {
    const nuevoMedicamento = e.target.value;
    setMedicamento(nuevoMedicamento);
    buscarPrecio(nuevoMedicamento);
  };

  return (
    <WorkSurface>
      <Plate>
        <PlateFiscalHeader
          section='Precios'
          instruction='Escribe el nombre del medicamento para ver su precio.'
        />

        <PlateControls>
          <div className='flex min-w-0 flex-col gap-1.5'>
            <Label htmlFor='medic'>Buscar medicamento</Label>
            <Input
              id='medic'
              type='text'
              placeholder='Ej. Acetaminofén 500mg'
              value={medicamento}
              onChange={handleChange}
              className='w-full sm:w-72'
            />
          </div>
        </PlateControls>

        <div className='ticket-print min-w-0 overflow-x-auto'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descripción</TableHead>
                <TableHead numeric>Precio Bs</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {status === "idle" && <TicketStatusRow colSpan={2}>Escribe para buscar</TicketStatusRow>}
              {status === "loading" && <TicketStatusRow colSpan={2}>Buscando…</TicketStatusRow>}
              {status === "error" && (
                <TicketStatusRow
                  colSpan={2}
                  tone='error'
                  onRetry={() => buscarPrecio(medicamento)}
                >
                  *** No se pudo leer el precio ***
                </TicketStatusRow>
              )}
              {status === "success" && precio.length === 0 && (
                <TicketStatusRow colSpan={2}>
                  *** Sin resultados para &ldquo;{medicamento}&rdquo; ***
                </TicketStatusRow>
              )}
              {status === "success" &&
                precio.map((p) => (
                  <TableRow key={p.descripcion}>
                    <TableCell>{p.descripcion}</TableCell>
                    <TableCell numeric>{p.precio}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>

        {status === "success" && (
          <PlateFooter left={`${precio.length} RESULTADO${precio.length === 1 ? "" : "S"}`} />
        )}
      </Plate>
    </WorkSurface>
  );
};

export default PrecioMedicamento;
