import { Moon, Sun } from "lucide-react";

import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { useTheme } from "../ui/theme-provider.tsx";

export function ModeToggle() {
  const { setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant='outline'
          size='icon'
          className='border-border text-foreground hover:border-primary hover:bg-transparent hover:text-primary'
        >
          <Sun className='h-[1.1rem] w-[1.1rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0' />
          <Moon className='absolute h-[1.1rem] w-[1.1rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100' />
          <span className='sr-only'>Cambiar tema</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='rounded-sm border-border font-sans text-sm'>
        <DropdownMenuItem onClick={() => setTheme("light")}>
          Turno día
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          Turno noche
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          Automático
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
