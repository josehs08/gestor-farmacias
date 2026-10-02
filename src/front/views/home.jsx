import { Link } from "react-router-dom";
import { Plate, PlateFiscalHeader } from "@/components/ui/plate";
import { WorkSurface } from "../componentes/workSurface.jsx";
import { PrecioDolar } from "../componentes/precioDolar";

const entradas = [
  { to: "/facturas", label: "Facturas", detail: "Subir y extraer" },
  { to: "/medicamentos", label: "Medicamentos", detail: "Ver inventario" },
  { to: "/precios", label: "Precios", detail: "Buscar por nombre" },
  { to: "/precio-por-factura", label: "Precio por factura", detail: "Calcular con margen" },
];

const leader = ".".repeat(80);

export default function HomePage() {
  return (
    <WorkSurface>
      <Plate>
        <PlateFiscalHeader section='Inicio' instruction='Punto de partida del turno.' showTasa={false} />

        <div className='min-w-0 px-4 py-4 sm:px-5'>
          <PrecioDolar />
        </div>

        <div className='ticket-rule'>
          {entradas.map(({ to, label, detail }) => (
            <Link
              key={to}
              to={to}
              className='group ticket-rule-b flex min-w-0 items-baseline gap-2 px-4 py-3 font-mono text-sm transition-colors hover:bg-accent/40 sm:px-5'
            >
              <span className='flex-none font-semibold uppercase tracking-wide text-foreground group-hover:text-primary'>
                {label}
              </span>
              <span
                className='min-w-0 flex-1 overflow-hidden whitespace-nowrap text-border'
                aria-hidden='true'
              >
                {leader}
              </span>
              <span className='flex-none text-muted-foreground'>{detail}</span>
            </Link>
          ))}
        </div>
      </Plate>
    </WorkSurface>
  );
}
