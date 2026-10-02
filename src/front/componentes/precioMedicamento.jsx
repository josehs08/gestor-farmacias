import { useEffect, useState } from "react";
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
import { calcularPreciosLinea } from "../lib/precioFactura.js";
import { useMargenVenta } from "../lib/useMargenVenta.js";

// Espera entre teclas antes de consultar, para no disparar una búsqueda por
// cada letra.
const ESPERA_BUSQUEDA_MS = 300;
const TOTAL_COLUMNAS = 5;

const formatNumero = (valor) =>
  valor == null
    ? "—"
    : valor.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const PrecioMedicamento = () => {
  const [medicamento, setMedicamento] = useState("");
  const [resultados, setResultados] = useState([]);
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [intento, setIntento] = useState(0);
  const [margen, setMargen] = useMargenVenta();

  useEffect(() => {
    const nombre = medicamento.trim();
    if (!nombre) {
      setResultados([]);
      setStatus("idle");
      return undefined;
    }

    // Cada búsqueda cancela la anterior, así una respuesta lenta de un texto
    // viejo nunca pisa los resultados del texto actual.
    const controller = new AbortController();
    const temporizador = setTimeout(async () => {
      setStatus("loading");
      try {
        const response = await fetch(
          `${import.meta.env.VITE_APP_API_URL}/precio/${encodeURIComponent(nombre)}`,
          { signal: controller.signal }
        );
        if (response.status === 404) {
          setResultados([]);
          setStatus("success");
          return;
        }
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        setResultados(data.precios);
        setStatus("success");
      } catch (error) {
        if (error.name === "AbortError") return;
        console.error("Error:", error);
        setStatus("error");
      }
    }, ESPERA_BUSQUEDA_MS);

    return () => {
      clearTimeout(temporizador);
      controller.abort();
    };
  }, [medicamento, intento]);

  return (
    <WorkSurface>
      <Plate>
        <PlateFiscalHeader
          section='Precios'
          instruction='Escribe el nombre del medicamento para ver su precio de venta.'
        />

        <PlateControls>
          <div className='flex min-w-0 flex-wrap gap-4'>
            <div className='flex min-w-0 flex-col gap-1.5'>
              <Label htmlFor='medic'>Buscar medicamento</Label>
              <Input
                id='medic'
                type='text'
                placeholder='Ej. Acetaminofén 500mg'
                value={medicamento}
                onChange={(e) => setMedicamento(e.target.value)}
                className='w-full sm:w-72'
              />
            </div>
            <div className='flex w-full max-w-[10rem] flex-col gap-1.5'>
              <Label htmlFor='margen-precios'>% de ganancia</Label>
              <Input
                id='margen-precios'
                type='number'
                min='0'
                step='0.01'
                value={margen}
                onChange={(e) => setMargen(e.target.value)}
              />
            </div>
          </div>
        </PlateControls>

        <div className='ticket-print min-w-0 overflow-x-auto'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descripción</TableHead>
                <TableHead>Droguería · factura</TableHead>
                <TableHead numeric>Costo (US$)</TableHead>
                <TableHead numeric className='bg-accent text-accent-foreground'>
                  Venta con descuento (+{margen || 0}%)
                </TableHead>
                <TableHead numeric className='bg-accent text-accent-foreground'>
                  Venta sin descuento (+{margen || 0}%)
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {status === "idle" && (
                <TicketStatusRow colSpan={TOTAL_COLUMNAS}>Escribe para buscar</TicketStatusRow>
              )}
              {status === "loading" && (
                <TicketStatusRow colSpan={TOTAL_COLUMNAS}>Buscando…</TicketStatusRow>
              )}
              {status === "error" && (
                <TicketStatusRow
                  colSpan={TOTAL_COLUMNAS}
                  tone='error'
                  onRetry={() => setIntento((n) => n + 1)}
                >
                  *** No se pudo leer el precio ***
                </TicketStatusRow>
              )}
              {status === "success" && resultados.length === 0 && (
                <TicketStatusRow colSpan={TOTAL_COLUMNAS}>
                  *** Sin resultados para &ldquo;{medicamento}&rdquo; ***
                </TicketStatusRow>
              )}
              {status === "success" &&
                resultados.map((resultado) => {
                  const precios = calcularPreciosLinea(resultado, resultado.factura, margen);
                  return (
                    <TableRow key={resultado.id}>
                      <TableCell>{resultado.descripcion}</TableCell>
                      <TableCell className='text-muted-foreground'>
                        {resultado.factura
                          ? `${resultado.factura.drogueria || "—"} · ${resultado.factura.fecha || "sin fecha"}`
                          : "Sin factura"}
                      </TableCell>
                      <TableCell numeric>{formatNumero(precios.costoUnitario)}</TableCell>
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
          </Table>
        </div>

        {status === "success" && (
          <PlateFooter
            left={`${resultados.length} RESULTADO${resultados.length === 1 ? "" : "S"}`}
            right='MÁS RECIENTES PRIMERO'
          />
        )}
      </Plate>
    </WorkSurface>
  );
};

export default PrecioMedicamento;
