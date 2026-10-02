import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Menu, Receipt, X } from "lucide-react";
import { ThemeProvider } from "../../components/ui/theme-provider";
import { ModeToggle } from "../../components/ui/mode-toggle.jsx";
import { cn } from "@/lib/utils";

const links = [
  { to: "/", label: "Inicio" },
  { to: "/medicamentos", label: "Medicamentos" },
  { to: "/facturas", label: "Facturas" },
  { to: "/precios", label: "Precios" },
  { to: "/precio-por-factura", label: "Precio por factura" },
];

// Each nav entry is a small torn-edge ticket stub, not a plain list item: the
// active route reads as a validated/stamped stub (solid action-blue fill).
const SidebarLinks = ({ onNavigate }) => (
  <nav className='flex flex-1 flex-col gap-2 px-3'>
    {links.map((link) => (
      <NavLink
        key={link.to}
        to={link.to}
        end={link.to === "/"}
        onClick={onNavigate}
        className={({ isActive }) =>
          cn(
            "ticket-torn px-3 py-2.5 font-mono text-[0.72rem] font-medium uppercase tracking-wide text-foreground/80 transition-colors hover:bg-accent hover:text-foreground",
            isActive ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground" : "bg-card"
          )
        }
      >
        {link.label}
      </NavLink>
    ))}
  </nav>
);

const Brand = ({ className }) => (
  <Link
    to='/'
    className={cn(
      "flex min-w-0 items-center gap-2 font-mono text-base font-semibold uppercase tracking-tight text-foreground hover:text-primary",
      className
    )}
  >
    <Receipt className='h-5 w-5 flex-none text-primary' strokeWidth={1.75} aria-hidden='true' />
    <span className='truncate'>Gestor de Farmacias</span>
  </Link>
);

const Sidebar = () => {
  const [open, setOpen] = useState(false);

  return (
    <ThemeProvider defaultTheme='light' storageKey='vite-ui-theme'>
      {/* Small screens: top bar with a toggle for the collapsible sidebar. */}
      <div className='sticky top-0 z-40 flex min-w-0 items-center justify-between gap-2 border-b border-dashed border-border bg-background px-4 py-3 md:hidden'>
        <Brand className='min-w-0' />
        <button
          type='button'
          onClick={() => setOpen(true)}
          className='flex-none rounded-sm border border-border p-2 text-foreground hover:border-primary hover:text-primary'
          aria-label='Abrir navegación'
        >
          <Menu className='h-5 w-5' aria-hidden='true' />
        </button>
      </div>

      {/* Small screens: slide-in overlay sidebar. */}
      {open && (
        <div className='fixed inset-0 z-50 md:hidden'>
          <div
            className='absolute inset-0 bg-ink/50'
            onClick={() => setOpen(false)}
            aria-hidden='true'
          />
          <div className='absolute inset-y-0 left-0 flex w-72 flex-col gap-4 border-r border-border bg-background py-4'>
            <div className='flex items-center justify-between px-4'>
              <Brand />
              <button
                type='button'
                onClick={() => setOpen(false)}
                className='rounded-sm border border-border p-1.5 text-foreground hover:border-primary hover:text-primary'
                aria-label='Cerrar navegación'
              >
                <X className='h-4 w-4' aria-hidden='true' />
              </button>
            </div>
            <SidebarLinks onNavigate={() => setOpen(false)} />
            <div className='px-4'>
              <ModeToggle />
            </div>
          </div>
        </div>
      )}

      {/* Medium+ screens: permanent nav column, content sits to its right
          (see main.jsx's md:pl-64). */}
      <aside className='fixed inset-y-0 left-0 z-40 hidden w-64 flex-col gap-4 border-r border-dashed border-border bg-background py-5 md:flex'>
        <Brand className='px-4' />
        <SidebarLinks />
        <div className='px-4'>
          <ModeToggle />
        </div>
      </aside>
    </ThemeProvider>
  );
};

export default Sidebar;
