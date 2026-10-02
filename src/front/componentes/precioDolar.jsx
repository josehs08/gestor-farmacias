import { useTasaBcv } from "../lib/useTasaBcv.js";

export const PrecioDolar = () => {
  const { status, tasa } = useTasaBcv();

  return (
    <div className='flex min-w-0 flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border border-dashed border-border bg-muted/60 px-4 py-4 sm:px-5'>
      <div className='font-mono text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
        Tasa oficial del día · dolarapi.com
      </div>

      {status === "loading" && (
        <div className='font-mono text-2xl tabular-nums text-muted-foreground'>· · ·</div>
      )}
      {status === "error" && (
        <div className='font-mono text-lg text-destructive'>No se pudo leer la tasa</div>
      )}
      {status === "success" && (
        <div className='font-mono text-4xl font-semibold tabular-nums text-foreground'>
          {Number(tasa).toLocaleString("es-VE", { minimumFractionDigits: 2 })}
          <span className='ml-2 text-base font-normal text-muted-foreground'>Bs/US$</span>
        </div>
      )}
    </div>
  );
};

export default PrecioDolar;
