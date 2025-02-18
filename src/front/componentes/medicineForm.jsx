import React, { useState } from "react";

const MedicineForm = () => {
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
    <form onSubmit={handleSubmit} className='flex justify-center p-4 border'>
      <div className='flex flex-col border p-4'>
        <label htmlFor='file'>Introduce tu factura:</label>
        <input name='file' type='file' id='file' onChange={handleFileChange} />
        <button type='submit'>Submit</button>
      </div>
    </form>
  );
};

export default MedicineForm;
