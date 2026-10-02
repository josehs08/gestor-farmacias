import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const AgregarFacturas = () => {
  const [file, setFile] = useState(null);

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const formData = new FormData();
    formData.append("file", file);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_APP_API_URL}/factura`,
        {
          method: "POST",
          body: formData,
        }
      );
      if (response.ok) {
        alert("Factura subida correctamente");
      } else {
        const data = await response.json().catch(() => ({}));
        alert(data.error || "Error al subir la factura");
      }
    } catch (error) {
      console.log(error);
      alert("Error al subir la factura");
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className='w-full' size='lg'>
          Subir factura
        </Button>
      </DialogTrigger>
      <DialogContent className='w-[calc(100%-2rem)] sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle>Subir factura</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className='grid w-full max-w-sm items-center gap-1.5'>
            <Label htmlFor='file'>Selecciona el PDF de la factura</Label>
            <Input
              name='file'
              type='file'
              id='file'
              accept='application/pdf'
              onChange={handleFileChange}
            />
          </div>
          <DialogFooter className='mt-4'>
            <Button type='submit'>Subir</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AgregarFacturas;
