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
      const response = await fetch("http://127.0.0.1:5000/factura", {
        method: "POST",
        headers: {
          "Content-Type": "application/pdf",
        },
        body: formData,
      });
      if (response.ok) {
        alert("File uploaded successfully");
      } else {
        alert("Error uploading file");
      }
    } catch (error) {
      alert("Error uploading file");
    }
  };

  return (
    <form onSubmit={handleSubmit} className='flex justify-center p-4 border'>
      <div>
        <label htmlFor='file'>Upload PDF:</label>
        <input
          type='file'
          id='file'
          accept='application/pdf'
          onChange={handleFileChange}
        />
      </div>
      <button type='submit'>Submit</button>
    </form>
  );
};

export default MedicineForm;
