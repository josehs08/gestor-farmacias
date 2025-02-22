import React from "react";
import { Button } from "../../components/ui/button";

export const DescargarExcel = ({ tipo }) => {
  const handleDownload = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_APP_API_URL}/descargar/${tipo}`,
        {
          method: "GET",
        }
      );
      const blob = await response.blob(); // Convertir la respuesta en un archivo
      const link = document.createElement("a"); // Crear un enlace invisible
      link.href = URL.createObjectURL(blob);
      link.download = `${tipo}.xlsx`; // Nombre del archivo descargado
      document.body.appendChild(link);
      link.click(); // Simular el clic para descargar
      document.body.removeChild(link); // Eliminar el enlace temporal

      alert("Archivo descargado con éxito");
    } catch (error) {
      console.error("Error de descarga:", error);
      alert("Error descargando el archivo");
    }
  };

  return (
    <div>
      <Button onClick={handleDownload}>Descargar</Button>
    </div>
  );
};
