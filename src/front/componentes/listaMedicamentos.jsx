import React, { useState, useEffect, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plate, PlateFiscalHeader, PlateControls, PlateFooter } from "@/components/ui/plate";
import { TicketStatusRow, TicketStatusLine } from "./ticketStatus.jsx";
import { ParPrecio } from "./parPrecio.jsx";
import { WorkSurface } from "./workSurface.jsx";
import { DescargarExcel } from "./descargarExcel";
import { obtenerEtiquetasDescuento } from "../lib/etiquetasDescuento.js";

const sumar = (lista, campo) =>
  lista.reduce((total, item) => total + (Number(item[campo]) || 0), 0);

const formatNumero = (valor) =>
  valor.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const ListaMedicamentos = () => {
  const [droguerias, setDroguerias] = useState([]);
  const [drogueriasStatus, setDrogueriasStatus] = useState("loading"); // loading | success | error
  const [drogueriaActiva, setDrogueriaActiva] = useState(null);
  const [medicamentos, setMedicamentos] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [verDetalle, setVerDetalle] = useState(false);

  const fetchDroguerias = useCallback(async () => {
    setDrogueriasStatus("loading");
    try {
      const response = await fetch(`${import.meta.env.VITE_APP_API_URL}/droguerias`);
      const data = await response.json();
      setDroguerias(data);
      setDrogueriasStatus("success");
      if (data.length > 0) {
        setDrogueriaActiva(data[0]);
      }
    } catch (error) {
      console.error("Error fetching droguerías:", error);
      setDrogueriasStatus("error");
    }
  }, []);

  useEffect(() => {
    fetchDroguerias();
  }, [fetchDroguerias]);

  const fetchMedicamentos = useCallback(async () => {
    if (!drogueriaActiva) return;
    setStatus("loading");
    try {
      const response = await fetch(
        `${import.meta.env.VITE_APP_API_URL}/medicina?drogueria=${encodeURIComponent(drogueriaActiva)}`
      );
      const data = await response.json();
      setMedicamentos(data);
      setStatus("success");
    } catch (error) {
      console.error("Error fetching medicamentos:", error);
      setStatus("error");
    }
  }, [drogueriaActiva]);

  useEffect(() => {
    fetchMedicamentos();
  }, [fetchMedicamentos]);

  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
  };

  const medicamentosFiltrados = medicamentos.filter((medicamento) =>
    (medicamento.descripcion || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const etiquetasDescuento = obtenerEtiquetasDescuento(drogueriaActiva);
  const totalNetoBs = formatNumero(sumar(medicamentosFiltrados, "Neto_Bs"));
  const totalNetoUsd = formatNumero(sumar(medicamentosFiltrados, "Neto_USD"));

  return (
    <WorkSurface actions={<DescargarExcel tipo='medicinas' />}>
      <Plate>
        <PlateFiscalHeader
          section='Medicamentos'
          instruction='Elegí una droguería y buscá por descripción.'
        />

        <PlateControls>
          <Input
            type='text'
            placeholder='Buscar por descripción'
            value={searchTerm}
            onChange={handleSearch}
            className='w-full sm:w-64'
          />
          <Button
            type='button'
            variant='outline'
            size='sm'
            className='sm:ml-auto'
            onClick={() => setVerDetalle((v) => !v)}
          >
            {verDetalle ? "Ocultar detalle" : "Ver detalle"}
          </Button>
        </PlateControls>

        {drogueriasStatus === "loading" && <TicketStatusLine>Leyendo droguerías…</TicketStatusLine>}
        {drogueriasStatus === "error" && (
          <TicketStatusLine tone='error' onRetry={fetchDroguerias}>
            *** No se pudieron leer las droguerías ***
          </TicketStatusLine>
        )}
        {drogueriasStatus === "success" && droguerias.length === 0 && (
          <TicketStatusLine>*** Sin facturas registradas todavía ***</TicketStatusLine>
        )}

        {droguerias.length > 0 && (
          <div className='ticket-rule-b flex min-w-0 flex-wrap gap-2 px-4 py-3'>
            {droguerias.map((drogueria) => (
              <Button
                key={drogueria}
                type='button'
                size='sm'
                variant={drogueria === drogueriaActiva ? "default" : "outline"}
                onClick={() => setDrogueriaActiva(drogueria)}
              >
                {drogueria}
              </Button>
            ))}
          </div>
        )}

        {drogueriaActiva && (
          <div className='ticket-print min-w-0 overflow-x-auto'>
            <Table>
              {verDetalle ? (
                <>
                  <TableHeader>
                    <TableRow>
                      <TableHead numeric>Cantidad</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Bulto</TableHead>
                      <TableHead>Lote</TableHead>
                      <TableHead>Exp</TableHead>
                      <TableHead numeric>Alic</TableHead>
                      <TableHead numeric>Precio Bs</TableHead>
                      <TableHead numeric>Precio $</TableHead>
                      <TableHead numeric>{etiquetasDescuento.DC}</TableHead>
                      <TableHead numeric>{etiquetasDescuento.DD}</TableHead>
                      <TableHead numeric>{etiquetasDescuento.DL}</TableHead>
                      <TableHead numeric>{etiquetasDescuento.DV}</TableHead>
                      <TableHead numeric>Neto Bs</TableHead>
                      <TableHead numeric>Neto USD</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {status === "loading" && (
                      <TicketStatusRow colSpan={15}>Imprimiendo medicamentos…</TicketStatusRow>
                    )}
                    {status === "error" && (
                      <TicketStatusRow colSpan={15} tone='error' onRetry={fetchMedicamentos}>
                        *** No se pudieron leer los medicamentos ***
                      </TicketStatusRow>
                    )}
                    {status === "success" && medicamentosFiltrados.length === 0 && (
                      <TicketStatusRow colSpan={15}>
                        {searchTerm
                          ? `*** Sin resultados para "${searchTerm}" ***`
                          : `*** ${drogueriaActiva} sin medicamentos extraídos ***`}
                      </TicketStatusRow>
                    )}
                    {status === "success" &&
                      medicamentosFiltrados.map((medicamento) => (
                        <TableRow key={medicamento.id}>
                          <TableCell numeric>{medicamento.cantidad}</TableCell>
                          <TableCell className='font-mono tabular-nums'>{medicamento.codigo}</TableCell>
                          <TableCell>{medicamento.descripcion}</TableCell>
                          <TableCell className='font-mono tabular-nums'>{medicamento.bulto}</TableCell>
                          <TableCell className='font-mono tabular-nums'>{medicamento.lote}</TableCell>
                          <TableCell className='font-mono tabular-nums'>{medicamento.exp}</TableCell>
                          <TableCell numeric>{medicamento.ALIC}</TableCell>
                          <TableCell numeric>{medicamento.PRECIO_BS}</TableCell>
                          <TableCell numeric>{medicamento.PRECIO_USD}</TableCell>
                          <TableCell numeric>{medicamento.DC}</TableCell>
                          <TableCell numeric>{medicamento.DD}</TableCell>
                          <TableCell numeric>{medicamento.DL}</TableCell>
                          <TableCell numeric>{medicamento.DV}</TableCell>
                          <TableCell numeric>{medicamento.Neto_Bs}</TableCell>
                          <TableCell numeric>{medicamento.Neto_USD}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                  {status === "success" && medicamentosFiltrados.length > 0 && (
                    <TableFooter>
                      <TableRow>
                        <TableCell colSpan={13} className='font-mono uppercase'>
                          {medicamentosFiltrados.length} renglón
                          {medicamentosFiltrados.length === 1 ? "" : "es"}
                        </TableCell>
                        <TableCell colSpan={2} numeric>
                          <span className='text-muted-foreground'>TOTAL Bs</span> {totalNetoBs}
                          <span className='ml-3 text-muted-foreground'>TOTAL USD</span> {totalNetoUsd}
                        </TableCell>
                      </TableRow>
                    </TableFooter>
                  )}
                </>
              ) : (
                <>
                  <TableHeader>
                    <TableRow>
                      <TableHead numeric>Cantidad</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead numeric>Precio Bs/USD</TableHead>
                      <TableHead numeric>Neto Bs/USD</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {status === "loading" && (
                      <TicketStatusRow colSpan={4}>Imprimiendo medicamentos…</TicketStatusRow>
                    )}
                    {status === "error" && (
                      <TicketStatusRow colSpan={4} tone='error' onRetry={fetchMedicamentos}>
                        *** No se pudieron leer los medicamentos ***
                      </TicketStatusRow>
                    )}
                    {status === "success" && medicamentosFiltrados.length === 0 && (
                      <TicketStatusRow colSpan={4}>
                        {searchTerm
                          ? `*** Sin resultados para "${searchTerm}" ***`
                          : `*** ${drogueriaActiva} sin medicamentos extraídos ***`}
                      </TicketStatusRow>
                    )}
                    {status === "success" &&
                      medicamentosFiltrados.map((medicamento) => (
                        <TableRow key={medicamento.id}>
                          <TableCell numeric>{medicamento.cantidad}</TableCell>
                          <TableCell>
                            <span className='block max-w-[16rem] whitespace-normal line-clamp-2'>
                              {medicamento.descripcion}
                            </span>
                          </TableCell>
                          <TableCell numeric>
                            <ParPrecio bs={medicamento.PRECIO_BS} usd={medicamento.PRECIO_USD} />
                          </TableCell>
                          <TableCell numeric>
                            <ParPrecio bs={medicamento.Neto_Bs} usd={medicamento.Neto_USD} />
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                  {status === "success" && medicamentosFiltrados.length > 0 && (
                    <TableFooter>
                      <TableRow>
                        <TableCell colSpan={2} className='font-mono uppercase'>
                          {medicamentosFiltrados.length} renglón
                          {medicamentosFiltrados.length === 1 ? "" : "es"}
                        </TableCell>
                        <TableCell colSpan={2} numeric>
                          <span className='text-muted-foreground'>TOTAL Bs</span> {totalNetoBs}
                          <span className='ml-3 text-muted-foreground'>TOTAL USD</span> {totalNetoUsd}
                        </TableCell>
                      </TableRow>
                    </TableFooter>
                  )}
                </>
              )}
            </Table>
          </div>
        )}

        <PlateFooter
          left={`${droguerias.length} DROGUERÍA${droguerias.length === 1 ? "" : "S"}`}
        />
      </Plate>
    </WorkSurface>
  );
};

export default ListaMedicamentos;
