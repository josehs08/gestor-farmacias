import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

// Lives in the action column, stacked under "Subir factura" — no longer its
// own paper panel above the ticket.
export const UploadPDFByUrl = () => {
  const [pdfUrl, setPdfUrl] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pdfUrl.trim()) {
      alert("Por favor, ingresa una URL válida.");
      return;
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_APP_API_URL}/facturaurl`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: pdfUrl }), // Enviar la URL al backend
        }
      );

      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        alert("PDF procesado correctamente.");
      } else {
        alert(data.error || "Error procesando el PDF.");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Hubo un problema al procesar el PDF.");
    }
  };

  return (
    <div className='flex min-w-0 flex-col gap-2'>
      <p className='font-mono text-[0.65rem] uppercase tracking-wide text-muted-foreground'>
        o por URL
      </p>
      <form onSubmit={handleSubmit} className='flex min-w-0 flex-col gap-2'>
        <Label htmlFor='pdf-url'>URL del PDF</Label>
        <Input
          id='pdf-url'
          type='url'
          placeholder='https://…'
          value={pdfUrl}
          onChange={(e) => setPdfUrl(e.target.value)}
          required
        />
        <Button type='submit' variant='outline' className='w-full'>
          Procesar PDF
        </Button>
      </form>
    </div>
  );
};

export default UploadPDFByUrl;
