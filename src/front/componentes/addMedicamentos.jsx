import React, { useState } from "react";

const AddMedicamentos = ({ uploadId }) => {
  const [message, setMessage] = useState("");

  const handleAddMedicamentos = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_APP_API_URL}/medicina/${uploadId}`
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
      <button onClick={handleAddMedicamentos}>Add Medications</button>
      {message && <p>{message}</p>}
    </div>
  );
};

export default AddMedicamentos;
