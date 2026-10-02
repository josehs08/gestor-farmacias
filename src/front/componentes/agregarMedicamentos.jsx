import React, { useState } from "react";
import { Button } from "@/components/ui/button";

const AgregarMedicamentos = ({ uploadId }) => {
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleAddMedicamentos = async () => {
    setIsLoading(true);
    setMessage("");
    try {
      const response = await fetch(
        `${import.meta.env.VITE_APP_API_URL}/medicina/${uploadId}`,
        {
          method: "POST",
        }
      );
      const data = await response.json();
      if (response.ok) {
        setMessage(data.message || "Medicamentos extraídos.");
        setIsError(false);
      } else {
        setMessage(data.error || "No se pudieron extraer los medicamentos.");
        setIsError(true);
      }
    } catch {
      setMessage("Error al extraer los medicamentos.");
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className='flex flex-col items-start gap-1'>
      <Button onClick={handleAddMedicamentos} disabled={isLoading} size='sm' variant='outline'>
        {isLoading ? "Extrayendo…" : "Extraer medicamentos"}
      </Button>
      {message && (
        <p className={`text-xs ${isError ? "text-destructive" : "text-muted-foreground"}`}>
          {message}
        </p>
      )}
    </div>
  );
};

export default AgregarMedicamentos;
