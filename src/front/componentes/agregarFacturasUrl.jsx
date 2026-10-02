import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

// Lives in the action column, stacked under "Subir factura" — no longer its
// own paper panel above the ticket.
export const UploadPDFByUrl = () => {
  const [pdfUrl, setPdfUrl] = useState("");
  const [pdfContent, setPdfContent] = useState(null);

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

      const data = await response.json();
      if (response.ok) {
        setPdfContent(data.content); // Mostrar el contenido del PDF si se extrajo
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

      {pdfContent && (
        <div className='min-w-0 border border-dashed border-border bg-muted/40 p-2'>
          <h3 className='font-mono text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
            Contenido extraído
          </h3>
          <pre className='mt-1 max-h-40 min-w-0 overflow-y-auto whitespace-pre-wrap break-words font-mono text-xs text-muted-foreground'>
            {pdfContent}
          </pre>
        </div>
      )}
    </div>
  );
};

export default UploadPDFByUrl;
