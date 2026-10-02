import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Loading/error/empty states print as a ticket line instead of a plain
// paragraph, keeping every state inside the receipt's own vocabulary.
export const TicketStatusRow = ({ colSpan, tone = "muted", children, onRetry, retryLabel = "Reintentar" }) => (
  <TableRow className='hover:bg-transparent'>
    <TableCell colSpan={colSpan} className='py-10 text-center'>
      <span
        className={cn(
          "block font-mono text-xs uppercase tracking-wide",
          tone === "error" ? "text-destructive" : "text-muted-foreground"
        )}
      >
        {children}
      </span>
      {onRetry && (
        <Button type='button' variant='outline' size='sm' className='mt-3' onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </TableCell>
  </TableRow>
);

// Same states outside a table (e.g. a filter list still loading).
export const TicketStatusLine = ({ tone = "muted", children, onRetry, retryLabel = "Reintentar" }) => (
  <div className='px-4 py-6 text-center'>
    <span
      className={cn(
        "block font-mono text-xs uppercase tracking-wide",
        tone === "error" ? "text-destructive" : "text-muted-foreground"
      )}
    >
      {children}
    </span>
    {onRetry && (
      <Button type='button' variant='outline' size='sm' className='mt-3' onClick={onRetry}>
        {retryLabel}
      </Button>
    )}
  </div>
);

export default TicketStatusRow;
