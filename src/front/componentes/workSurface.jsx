import { cn } from "@/lib/utils";

// The shared first-viewport composition for a work surface: one long ticket
// centered on the desk (capped ~820px), with an optional action column
// (~280px) to its right. Below the lg breakpoint the action column moves
// above the ticket as a compact stack instead of squeezing beside it.
export const WorkSurface = ({ actions, children, className }) => (
  <div className={cn("mx-auto w-full max-w-[1180px] px-4 py-4", className)}>
    <div className='flex flex-col-reverse items-stretch gap-4 lg:flex-row lg:items-start lg:justify-center lg:gap-6'>
      <div className='min-w-0 lg:w-[820px] lg:max-w-[820px] lg:flex-1'>{children}</div>
      {actions && (
        <div className='flex min-w-0 flex-col gap-3 lg:w-[280px] lg:max-w-[280px] lg:flex-none'>
          {actions}
        </div>
      )}
    </div>
  </div>
);

export default WorkSurface;
