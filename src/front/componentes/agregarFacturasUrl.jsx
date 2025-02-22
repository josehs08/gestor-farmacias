import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/Button";

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
        `${import.meta.env.VITE_APP_API_URL}/factura`,
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
        alert("Error procesando el PDF.");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Hubo un problema al procesar el PDF.");
    }
  };

  return (
    <div>
      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", gap: "10px", alignItems: "center" }}
      >
        <Input
          type='url'
          placeholder='Ingrese la URL del PDF'
          value={pdfUrl}
          onChange={(e) => setPdfUrl(e.target.value)}
          required
          style={{ width: "300px" }}
        />
        <Button type='submit'>Procesar PDF</Button>
      </form>

      {pdfContent && (
        <div>
          <h3>Contenido Extraído:</h3>
          <pre style={{ whiteSpace: "pre-wrap", maxWidth: "600px" }}>
            {pdfContent}
          </pre>
        </div>
      )}
    </div>
  );
};

export default UploadPDFByUrl;
