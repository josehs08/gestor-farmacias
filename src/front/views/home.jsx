import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ShoppingBag, FileText, Pill } from "lucide-react";

export default function HomePage() {
  return (
    <div className='min-h-screen bg-gray-900 text-white flex flex-col items-center p-6'>
      <header className='w-full max-w-4xl text-center py-10'>
        <h1 className='text-4xl font-bold text-white'>Gestor de Farmacias</h1>
        <p className='text-gray-400 mt-2'>
          Administra tus medicamentos y facturas de manera eficiente
        </p>
      </header>

      <main className='w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
        <Card className='bg-gray-800 border-gray-700'>
          <CardContent className='flex flex-col items-center p-6 text-center'>
            <Pill className='h-12 w-12 text-blue-400' />
            <h2 className='text-xl font-semibold mt-4'>
              Gestión de Medicamentos
            </h2>
            <p className='text-gray-400 mt-2'>
              Registra, actualiza y controla el stock de medicamentos.
            </p>
            <Button
              className='mt-4 bg-blue-600 hover:bg-blue-700 text-white'
              variant='default'
            >
              Ver más
            </Button>
          </CardContent>
        </Card>

        <Card className='bg-gray-800 border-gray-700'>
          <CardContent className='flex flex-col items-center p-6 text-center'>
            <FileText className='h-12 w-12 text-green-400' />
            <h2 className='text-xl font-semibold mt-4'>Facturación</h2>
            <p className='text-gray-400 mt-2'>
              Genera y administra facturas de ventas fácilmente.
            </p>
            <Button
              className='mt-4 bg-green-600 hover:bg-green-700 text-white'
              variant='default'
            >
              Ver más
            </Button>
          </CardContent>
        </Card>

        <Card className='bg-gray-800 border-gray-700'>
          <CardContent className='flex flex-col items-center p-6 text-center'>
            <ShoppingBag className='h-12 w-12 text-red-400' />
            <h2 className='text-xl font-semibold mt-4'>Pedidos</h2>
            <p className='text-gray-400 mt-2'>
              Gestiona pedidos y controla el abastecimiento de medicamentos.
            </p>
            <Button
              className='mt-4 bg-red-600 hover:bg-red-700 text-white'
              variant='default'
            >
              Ver más
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
