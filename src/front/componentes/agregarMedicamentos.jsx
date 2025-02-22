import React, { useState } from "react";
import { Button } from "../../components/ui/button";

const AgregarMedicamentos = ({ uploadId }) => {
  const [message, setMessage] = useState("");

  const handleAddMedicamentos = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_APP_API_URL}/medicina/${uploadId}`,
        {
          method: "POST",
        }
      );
      const data = await response.json();
      if (response.ok) {
        setMessage(data.message);
      } else {
        setMessage(data.error);
      }
    } catch (error) {
      setMessage("Error adding medications");
    }
  };

  return (
    <div>
      <Button onClick={handleAddMedicamentos}>Agregar</Button>
      {message && <p>{message}</p>}
    </div>
  );
};

export default AgregarMedicamentos;
