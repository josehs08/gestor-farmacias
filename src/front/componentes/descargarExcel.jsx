import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const DescargarExcel = ({ tipo, className }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleDownload = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_APP_API_URL}/descargar/${tipo}`,
        {
          method: "GET",
        }
      );
      // Sin esta verificación, una respuesta de error se guardaría como .xlsx.
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob(); // Convertir la respuesta en un archivo
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a"); // Crear un enlace invisible
      link.href = url;
      link.download = `${tipo}.xlsx`; // Nombre del archivo descargado
      document.body.appendChild(link);
      link.click(); // Simular el clic para descargar
      document.body.removeChild(link); // Eliminar el enlace temporal
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error de descarga:", error);
      alert("Error descargando el archivo");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button onClick={handleDownload} variant='outline' disabled={isLoading} className={cn("w-full", className)}>
      {isLoading ? "Descargando…" : "Descargar Excel"}
    </Button>
  );
};

export default DescargarExcel;
