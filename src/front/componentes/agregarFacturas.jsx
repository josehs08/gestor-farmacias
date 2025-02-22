import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
        alert("File uploaded successfully");
      } else {
        alert("Error uploading file");
      }
    } catch (error) {
      console.log(error);
      alert("Error uploading file");
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Agregar Factura</Button>
      </DialogTrigger>
      <DialogContent className='sm:max-w-[425px]'>
        <form onSubmit={handleSubmit}>
          <div className='grid w-full max-w-sm items-center gap-1.5'>
            <Label htmlFor='file'>Introduce tu factura:</Label>
            <Input
              name='file'
              type='file'
              id='file'
              onChange={handleFileChange}
            />
            <Button type='submit'>Submit</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AgregarFacturas;
