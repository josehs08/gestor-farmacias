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
import { MARGEN_VENTA_DEFAULT, calcularPreciosLinea, calcularTotalesFactura } from "../lib/precioFactura.js";
import { obtenerEtiquetasDescuento } from "../lib/etiquetasDescuento.js";

const MARGEN_STORAGE_KEY = "gestor-farmacias:margen-ganancia";

const formatNumero = (valor) =>
  valor == null
    ? "—"
    : valor.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const leerMargenGuardado = () => {
  try {
    return localStorage.getItem(MARGEN_STORAGE_KEY) ?? String(MARGEN_VENTA_DEFAULT);
  } catch {
    return String(MARGEN_VENTA_DEFAULT);
  }
};

const PrecioPorFactura = () => {
  const [facturas, setFacturas] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | success | error
  const [facturaSeleccionada, setFacturaSeleccionada] = useState(null);
  const [medicamentos, setMedicamentos] = useState([]);
  const [medicamentosStatus, setMedicamentosStatus] = useState("idle"); // idle | loading | success | error
  const [margen, setMargen] = useState(leerMargenGuardado);

  const handleMargenChange = (event) => {
    const valor = event.target.value;
    setMargen(valor);
    try {
      localStorage.setItem(MARGEN_STORAGE_KEY, valor);
    } catch {
      // localStorage puede no estar disponible (modo privado, etc.); no es crítico.
    }
  };

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
        <DialogContent className='w-[calc(100%-2rem)] sm:max-w-[95vw] lg:max-w-6xl'>
          <DialogHeader>
            <DialogTitle>Precio por factura — {facturaSeleccionada?.numero_factura}</DialogTitle>
            <DialogDescription>
              {facturaSeleccionada?.drogueria || "Droguería sin identificar"}. El precio ya viene
              con descuento incluido; &ldquo;sin descuento&rdquo; reconstruye el precio de lista
              revirtiendo solo los descuentos del distribuidor (no el margen propio).
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
                onChange={handleMargenChange}
              />
            </div>
          </div>

          <div className='ticket-print min-w-0 max-h-[60vh] overflow-y-auto overflow-x-auto'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descripción</TableHead>
                  <TableHead numeric>Cantidad</TableHead>
                  <TableHead numeric>Precio (US$)</TableHead>
                  <TableHead numeric>{etiquetasDescuento.DC}</TableHead>
                  <TableHead numeric>{etiquetasDescuento.DD}</TableHead>
                  <TableHead numeric>{etiquetasDescuento.DL}</TableHead>
                  <TableHead numeric>Precio sin descuento</TableHead>
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
                  <TicketStatusRow colSpan={9}>Imprimiendo renglones…</TicketStatusRow>
                )}
                {medicamentosStatus === "error" && (
                  <TicketStatusRow
                    colSpan={9}
                    tone='error'
                    onRetry={() => verPrecios(facturaSeleccionada)}
                  >
                    *** No se pudieron leer los medicamentos ***
                  </TicketStatusRow>
                )}
                {medicamentosStatus === "success" && medicamentos.length === 0 && (
                  <TicketStatusRow colSpan={9}>
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
                        <TableCell numeric>{formatNumero(precios.precioUnitario)}</TableCell>
                        <TableCell numeric>{precios.descuentos[0] || 0}%</TableCell>
                        <TableCell numeric>{precios.descuentos[1] || 0}%</TableCell>
                        <TableCell numeric>{precios.descuentos[2] || 0}%</TableCell>
                        <TableCell numeric>
                          {formatNumero(precios.precioSinDescuentoUnitario)}
                        </TableCell>
                        <TableCell numeric className='bg-accent/60 font-semibold'>
                          {formatNumero(precios.precioVentaConDescuentoUnitario)}
                        </TableCell>
                        <TableCell numeric className='bg-accent/60 font-semibold'>
                          {formatNumero(precios.precioVentaSinDescuentoUnitario)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
              {medicamentosStatus === "success" && medicamentos.length > 0 && totales && (
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={3} className='font-mono font-semibold uppercase'>
                      Total factura (US$)
                      {totales.lineasSinPrecio > 0 &&
                        ` — ${totales.lineasSinPrecio} sin precio en US$`}
                    </TableCell>
                    <TableCell colSpan={3} />
                    <TableCell numeric className='font-semibold'>
                      {formatNumero(totales.precioSinDescuento)}
                    </TableCell>
                    <TableCell numeric className='bg-accent font-semibold text-accent-foreground'>
                      {formatNumero(totales.precioVentaConDescuento)}
                    </TableCell>
                    <TableCell numeric className='bg-accent font-semibold text-accent-foreground'>
                      {formatNumero(totales.precioVentaSinDescuento)}
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
