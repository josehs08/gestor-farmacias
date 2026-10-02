import React, { useState, useEffect, useCallback } from "react";
import AgregarMedicamentos from "./agregarMedicamentos.jsx";
import AgregarFacturas from "./agregarFacturas.jsx";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plate, PlateFiscalHeader, PlateFooter } from "@/components/ui/plate";
import { TicketStatusRow } from "./ticketStatus.jsx";
import { ParPrecio } from "./parPrecio.jsx";
import { WorkSurface } from "./workSurface.jsx";
import { DescargarExcel } from "./descargarExcel.jsx";
import AgregarFacturasUrl from "./agregarFacturasUrl.jsx";
import { obtenerEtiquetasDescuento } from "../lib/etiquetasDescuento.js";

const sumar = (lista, campo) =>
  lista.reduce((total, item) => total + (Number(item[campo]) || 0), 0);

const formatNumero = (valor) =>
  valor.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const ListaFacturas = () => {
  const [facturas, setFacturas] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | success | error
  const [facturaSeleccionada, setFacturaSeleccionada] = useState(null);
  const [medicamentos, setMedicamentos] = useState([]);
  const [medicamentosStatus, setMedicamentosStatus] = useState("idle"); // idle | loading | success | error
  const [verDetalle, setVerDetalle] = useState(false);

  const fetchFacturas = useCallback(async () => {
    setStatus("loading");
    try {
      const response = await fetch(`${import.meta.env.VITE_APP_API_URL}/facturas`);
      const data = await response.json();
      setFacturas(data);
      setStatus("success");
    } catch (error) {
      console.error("Error fetching facturas:", error);
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    fetchFacturas();
  }, [fetchFacturas]);

  const etiquetasDescuento = obtenerEtiquetasDescuento(facturaSeleccionada?.drogueria);

  const verMedicamentos = async (factura) => {
    setFacturaSeleccionada(factura);
    setMedicamentosStatus("loading");
    try {
      const response = await fetch(
        `${import.meta.env.VITE_APP_API_URL}/medicina/${factura.id}`
      );
      const data = await response.json();
      setMedicamentos(data);
      setMedicamentosStatus("success");
    } catch (error) {
      console.error("Error fetching medicamentos de la factura:", error);
      setMedicamentosStatus("error");
    }
  };

  const totalNetoBs = formatNumero(sumar(medicamentos, "TOT_NETO_Bs"));
  const totalNetoUsd = formatNumero(sumar(medicamentos, "TOT_NETO_USD"));

  return (
    <>
      <WorkSurface
        actions={
          <>
            <AgregarFacturas />
            <AgregarFacturasUrl />
            <DescargarExcel tipo='facturas' />
          </>
        }
      >
        <Plate>
          <PlateFiscalHeader
            section='Facturas'
            instruction='Verifica la tasa antes de extraer medicamentos.'
          />

          <div className='ticket-print min-w-0 overflow-x-auto'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Id</TableHead>
                  <TableHead>Droguería</TableHead>
                  <TableHead>N.º factura</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead numeric>Tasa Bs/US$</TableHead>
                  <TableHead>Extraer</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {status === "loading" && (
                  <TicketStatusRow colSpan={6}>Imprimiendo facturas…</TicketStatusRow>
                )}
                {status === "error" && (
                  <TicketStatusRow colSpan={6} tone='error' onRetry={fetchFacturas}>
                    *** No se pudieron leer las facturas ***
                  </TicketStatusRow>
                )}
                {status === "success" && facturas.length === 0 && (
                  <TicketStatusRow colSpan={6}>
                    *** Sin facturas — sube la primera ***
                  </TicketStatusRow>
                )}
                {status === "success" &&
                  facturas.map((factura) => (
                    <TableRow
                      key={factura.id}
                      className='cursor-pointer'
                      onClick={() => verMedicamentos(factura)}
                    >
                      <TableCell className='font-mono tabular-nums'>{factura.id}</TableCell>
                      <TableCell>{factura.drogueria || "—"}</TableCell>
                      <TableCell className='font-mono tabular-nums'>
                        {factura.numero_factura}
                      </TableCell>
                      <TableCell className='font-mono tabular-nums'>{factura.fecha}</TableCell>
                      <TableCell numeric>{factura.tipo_de_cambio}</TableCell>
                      <TableCell onClick={(event) => event.stopPropagation()}>
                        <AgregarMedicamentos uploadId={factura.id} />
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>

          <PlateFooter
            left={`${facturas.length} FACTURA${facturas.length === 1 ? "" : "S"}`}
          />
        </Plate>
      </WorkSurface>

      <Dialog
        open={facturaSeleccionada !== null}
        onOpenChange={(open) => !open && setFacturaSeleccionada(null)}
      >
        <DialogContent className='w-[calc(100%-2rem)] sm:max-w-[95vw] lg:max-w-6xl'>
          <DialogHeader>
            <DialogTitle>
              Medicamentos — Factura {facturaSeleccionada?.numero_factura}
            </DialogTitle>
            <DialogDescription>
              {facturaSeleccionada?.drogueria || "Droguería sin identificar"}
            </DialogDescription>
          </DialogHeader>

          <div className='flex min-w-0 justify-end'>
            <Button type='button' variant='outline' size='sm' onClick={() => setVerDetalle((v) => !v)}>
              {verDetalle ? "Ocultar detalle" : "Ver detalle"}
            </Button>
          </div>

          <div className='ticket-print min-w-0 max-h-[60vh] overflow-y-auto overflow-x-auto'>
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
                      <TableHead numeric>Tot. Neto Bs</TableHead>
                      <TableHead numeric>Tot. Neto USD</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {medicamentosStatus === "loading" && (
                      <TicketStatusRow colSpan={17}>Imprimiendo renglones…</TicketStatusRow>
                    )}
                    {medicamentosStatus === "error" && (
                      <TicketStatusRow
                        colSpan={17}
                        tone='error'
                        onRetry={() => verMedicamentos(facturaSeleccionada)}
                      >
                        *** No se pudieron leer los medicamentos ***
                      </TicketStatusRow>
                    )}
                    {medicamentosStatus === "success" && medicamentos.length === 0 && (
                      <TicketStatusRow colSpan={17}>
                        *** Todavía sin medicamentos extraídos ***
                      </TicketStatusRow>
                    )}
                    {medicamentosStatus === "success" &&
                      medicamentos.map((medicamento) => (
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
                          <TableCell numeric>{medicamento.TOT_NETO_Bs}</TableCell>
                          <TableCell numeric>{medicamento.TOT_NETO_USD}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                  {medicamentosStatus === "success" && medicamentos.length > 0 && (
                    <TableFooter>
                      <TableRow>
                        <TableCell colSpan={15} className='font-mono uppercase'>
                          {medicamentos.length} renglón{medicamentos.length === 1 ? "" : "es"}
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
                    {medicamentosStatus === "loading" && (
                      <TicketStatusRow colSpan={4}>Imprimiendo renglones…</TicketStatusRow>
                    )}
                    {medicamentosStatus === "error" && (
                      <TicketStatusRow
                        colSpan={4}
                        tone='error'
                        onRetry={() => verMedicamentos(facturaSeleccionada)}
                      >
                        *** No se pudieron leer los medicamentos ***
                      </TicketStatusRow>
                    )}
                    {medicamentosStatus === "success" && medicamentos.length === 0 && (
                      <TicketStatusRow colSpan={4}>
                        *** Todavía sin medicamentos extraídos ***
                      </TicketStatusRow>
                    )}
                    {medicamentosStatus === "success" &&
                      medicamentos.map((medicamento) => (
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
                  {medicamentosStatus === "success" && medicamentos.length > 0 && (
                    <TableFooter>
                      <TableRow>
                        <TableCell colSpan={2} className='font-mono uppercase'>
                          {medicamentos.length} renglón{medicamentos.length === 1 ? "" : "es"}
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
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ListaFacturas;
