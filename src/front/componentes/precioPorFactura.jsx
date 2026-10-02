import { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plate, PlateFiscalHeader, PlateFooter } from "@/components/ui/plate";
import { TicketStatusRow } from "./ticketStatus.jsx";
import { WorkSurface } from "./workSurface.jsx";
import { calcularPreciosLinea, calcularTotalesFactura } from "../lib/precioFactura.js";
import { obtenerEtiquetasDescuento } from "../lib/etiquetasDescuento.js";
import { useMargenVenta } from "../lib/useMargenVenta.js";

const COLUMNAS_DESCUENTO = ["DC", "DD", "DL", "DV"];
const TOTAL_COLUMNAS = 12;

const formatPorcentaje = (valor) =>
  `${(Number(valor) || 0).toLocaleString("es-VE", { maximumFractionDigits: 2 })}%`;

const formatNumero = (valor) =>
  valor == null
    ? "—"
    : valor.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const PrecioPorFactura = () => {
  const [facturas, setFacturas] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | success | error
  const [facturaSeleccionada, setFacturaSeleccionada] = useState(null);
  const [medicamentos, setMedicamentos] = useState([]);
  const [medicamentosStatus, setMedicamentosStatus] = useState("idle"); // idle | loading | success | error
  const [margen, setMargen] = useMargenVenta();

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

  const verPrecios = async (factura) => {
    setFacturaSeleccionada(factura);
    setMedicamentosStatus("loading");
    try {
      const response = await fetch(`${import.meta.env.VITE_APP_API_URL}/medicina/${factura.id}`);
      const data = await response.json();
      setMedicamentos(data);
      setMedicamentosStatus("success");
    } catch (error) {
      console.error("Error fetching medicamentos de la factura:", error);
      setMedicamentosStatus("error");
    }
  };

  const etiquetasDescuento = obtenerEtiquetasDescuento(facturaSeleccionada?.drogueria);
  const totales =
    medicamentosStatus === "success"
      ? calcularTotalesFactura(medicamentos, facturaSeleccionada, margen)
      : null;

  return (
    <>
      <WorkSurface>
        <Plate>
          <PlateFiscalHeader
            section='Precio por factura'
            instruction='Elegí una factura para ver el precio de venta de cada ítem, con y sin el descuento del proveedor.'
          />

          <div className='ticket-print min-w-0 overflow-x-auto'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Id</TableHead>
                  <TableHead>Droguería</TableHead>
                  <TableHead>N.º factura</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Ver precios</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {status === "loading" && (
                  <TicketStatusRow colSpan={5}>Imprimiendo facturas…</TicketStatusRow>
                )}
                {status === "error" && (
                  <TicketStatusRow colSpan={5} tone='error' onRetry={fetchFacturas}>
                    *** No se pudieron leer las facturas ***
                  </TicketStatusRow>
                )}
                {status === "success" && facturas.length === 0 && (
                  <TicketStatusRow colSpan={5}>*** Sin facturas registradas ***</TicketStatusRow>
                )}
                {status === "success" &&
                  facturas.map((factura) => (
                    <TableRow
                      key={factura.id}
                      className='cursor-pointer'
                      onClick={() => verPrecios(factura)}
                    >
                      <TableCell className='font-mono tabular-nums'>{factura.id}</TableCell>
                      <TableCell>{factura.drogueria || "—"}</TableCell>
                      <TableCell className='font-mono tabular-nums'>
                        {factura.numero_factura}
                      </TableCell>
                      <TableCell className='font-mono tabular-nums'>{factura.fecha}</TableCell>
                      <TableCell className='font-sans font-semibold text-primary'>Ver precios</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>

          <PlateFooter left={`${facturas.length} FACTURA${facturas.length === 1 ? "" : "S"}`} />
        </Plate>
      </WorkSurface>

      <Dialog
        open={facturaSeleccionada !== null}
        onOpenChange={(open) => !open && setFacturaSeleccionada(null)}
      >
        <DialogContent className='w-[calc(100%-2rem)] sm:max-w-[95vw] lg:max-w-6xl xl:max-w-7xl'>
          <DialogHeader>
            <DialogTitle>Precio por factura — {facturaSeleccionada?.numero_factura}</DialogTitle>
            <DialogDescription>
              {facturaSeleccionada?.drogueria || "Droguería sin identificar"} — Venta = precio de
              lista + % de ganancia + IVA; &ldquo;con descuento&rdquo; le traslada al cliente los
              descuentos del distribuidor
              {facturaSeleccionada?.formato === "insuaminca" && " (el Seg queda para la farmacia)"}
              {!["nena", "insuaminca"].includes(facturaSeleccionada?.formato) &&
                ". Este formato todavía no tiene regla confirmada: el precio se toma tal cual"}
              .
            </DialogDescription>
          </DialogHeader>

          <div className='flex min-w-0 flex-wrap gap-4'>
            <div className='grid w-full max-w-[10rem] items-center gap-1.5'>
              <Label htmlFor='margen'>% de ganancia</Label>
              <Input
                id='margen'
                type='number'
                min='0'
                step='0.01'
                value={margen}
                onChange={(event) => setMargen(event.target.value)}
              />
            </div>
          </div>

          <div className='ticket-print min-w-0 max-h-[60vh] overflow-y-auto overflow-x-auto'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descripción</TableHead>
                  <TableHead numeric>Cantidad</TableHead>
                  <TableHead numeric>Costo (US$)</TableHead>
                  {COLUMNAS_DESCUENTO.map((columna) => (
                    <TableHead key={columna} numeric>
                      {etiquetasDescuento[columna]}
                    </TableHead>
                  ))}
                  <TableHead numeric>IVA</TableHead>
                  <TableHead numeric>Precio de lista</TableHead>
                  <TableHead numeric className='bg-accent text-accent-foreground'>
                    Venta con descuento (+{margen || 0}%)
                  </TableHead>
                  <TableHead numeric className='bg-accent text-accent-foreground'>
                    Venta sin descuento (+{margen || 0}%)
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {medicamentosStatus === "loading" && (
                  <TicketStatusRow colSpan={TOTAL_COLUMNAS}>Imprimiendo renglones…</TicketStatusRow>
                )}
                {medicamentosStatus === "error" && (
                  <TicketStatusRow
                    colSpan={TOTAL_COLUMNAS}
                    tone='error'
                    onRetry={() => verPrecios(facturaSeleccionada)}
                  >
                    *** No se pudieron leer los medicamentos ***
                  </TicketStatusRow>
                )}
                {medicamentosStatus === "success" && medicamentos.length === 0 && (
                  <TicketStatusRow colSpan={TOTAL_COLUMNAS}>
                    *** Todavía sin medicamentos extraídos ***
                  </TicketStatusRow>
                )}
                {medicamentosStatus === "success" &&
                  medicamentos.map((medicamento) => {
                    const precios = calcularPreciosLinea(
                      medicamento,
                      facturaSeleccionada,
                      margen
                    );
                    return (
                      <TableRow key={medicamento.id}>
                        <TableCell>{medicamento.descripcion}</TableCell>
                        <TableCell numeric>{medicamento.cantidad}</TableCell>
                        <TableCell numeric>{formatNumero(precios.costoUnitario)}</TableCell>
                        {COLUMNAS_DESCUENTO.map((columna) => (
                          <TableCell key={columna} numeric>
                            {formatPorcentaje(precios.descuentos[columna])}
                          </TableCell>
                        ))}
                        <TableCell numeric>{formatPorcentaje(precios.iva * 100)}</TableCell>
                        <TableCell numeric>{formatNumero(precios.costoListaUnitario)}</TableCell>
                        <TableCell numeric className='bg-accent/60 font-semibold'>
                          {formatNumero(precios.ventaConDescuentoUnitario)}
                        </TableCell>
                        <TableCell numeric className='bg-accent/60 font-semibold'>
                          {formatNumero(precios.ventaSinDescuentoUnitario)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
              {medicamentosStatus === "success" && medicamentos.length > 0 && totales && (
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={2} className='font-mono font-semibold uppercase'>
                      Total factura (US$)
                      {totales.lineasSinPrecio > 0 &&
                        ` — ${totales.lineasSinPrecio} sin precio en US$`}
                    </TableCell>
                    <TableCell numeric className='font-semibold'>
                      {formatNumero(totales.costo)}
                    </TableCell>
                    <TableCell colSpan={COLUMNAS_DESCUENTO.length + 1} />
                    <TableCell numeric className='font-semibold'>
                      {formatNumero(totales.costoLista)}
                    </TableCell>
                    <TableCell numeric className='bg-accent font-semibold text-accent-foreground'>
                      {formatNumero(totales.ventaConDescuento)}
                    </TableCell>
                    <TableCell numeric className='bg-accent font-semibold text-accent-foreground'>
                      {formatNumero(totales.ventaSinDescuento)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PrecioPorFactura;
