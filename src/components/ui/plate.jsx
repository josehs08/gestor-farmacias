import * as React from "react";

import { cn } from "@/lib/utils";
import { useTasaBcv } from "@/front/lib/useTasaBcv.js";

// The thermal-paper ticket: the only data surface in the app. A flat sheet
// with a torn, zigzag cut top and bottom (see .ticket-torn), one subtle
// real offset+blur shadow to sit on the desk.
const Plate = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "ticket-torn min-w-0 overflow-hidden bg-card text-card-foreground shadow-[0_14px_30px_-18px_rgba(26,26,26,0.35)]",
      className
    )}
    {...props}
  />
));
Plate.displayName = "Plate";

const hoy = () =>
  new Date().toLocaleDateString("es-VE", { day: "2-digit", month: "2-digit", year: "numeric" });

// The centered fiscal header every ticket prints first: the section this
// ticket is, an optional instruction line, then the date and (usually) the
// official Bs/US$ rate — stacked on narrow viewports, side by side once
// there is room, so no figure ever runs off the sheet. The sidebar already
// carries the "Gestor de Farmacias" wordmark, so the heading stands alone.
const PlateFiscalHeader = React.forwardRef(
  ({ className, section, instruction, showTasa = true, children, ...props }, ref) => {
    const { status, tasa } = useTasaBcv();

    return (
      <div
        ref={ref}
        className={cn(
          "ticket-rule-b flex min-w-0 flex-col items-center gap-1 px-4 pb-4 pt-6 text-center",
          className
        )}
        {...props}
      >
        {section && (
          <h2 className='font-mono text-lg font-semibold uppercase tracking-tight'>{section}</h2>
        )}
        {instruction && (
          <p className='max-w-sm font-sans text-sm text-muted-foreground'>{instruction}</p>
        )}
        <div className='mt-2 flex flex-col items-center gap-0.5 font-mono text-[0.7rem] uppercase tracking-wide text-muted-foreground sm:flex-row sm:gap-3'>
          <span>{hoy()}</span>
          {showTasa && (
            <>
              <span className='hidden sm:inline' aria-hidden='true'>
                ·
              </span>
              <span className='flex items-center gap-1.5'>
                <span>Tasa BCV</span>
                {status === "loading" && <span>· · ·</span>}
                {status === "error" && <span className='text-destructive'>s/d</span>}
                {status === "success" && (
                  <span className='text-sm font-semibold normal-case tracking-normal text-foreground'>
                    {Number(tasa).toLocaleString("es-VE", { minimumFractionDigits: 2 })}
                    <span className='ml-1 text-[0.7rem] font-normal text-muted-foreground'>
                      Bs/US$
                    </span>
                  </span>
                )}
              </span>
            </>
          )}
        </div>
        {children}
      </div>
    );
  }
);
PlateFiscalHeader.displayName = "PlateFiscalHeader";

// A ticket-body control row (search, filters) between the header and the
// table, closed with its own dashed rule.
const PlateControls = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("ticket-rule-b flex min-w-0 flex-wrap items-center gap-3 px-4 py-3", className)}
    {...props}
  />
));
PlateControls.displayName = "PlateControls";

// The closing line of the ticket: a row count on the left, Bs/USD totals
// (when the ticket has them) right-aligned on the same line — the same
// receipt grammar as a printed total.
const PlateFooter = React.forwardRef(({ className, left, right, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "ticket-rule flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 font-mono text-[0.72rem] uppercase tracking-wide text-muted-foreground",
      className
    )}
    {...props}
  >
    <span>{left}</span>
    {right && <span className='font-semibold text-foreground'>{right}</span>}
  </div>
));
PlateFooter.displayName = "PlateFooter";

export { Plate, PlateFiscalHeader, PlateControls, PlateFooter };
