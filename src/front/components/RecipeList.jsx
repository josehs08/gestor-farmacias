import React, { useState, useEffect } from "react";
import AddMedicamentos from "./AddMedicamentos";

const RecipeList = () => {
  const [facturas, setFacturas] = useState([]);

  useEffect(() => {
    const fetchFacturas = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_APP_API_URL}/facturas`
        );
        const data = await response.json();
        setFacturas(data);
      } catch (error) {
        console.error("Error fetching facturas:", error);
      }
    };

    fetchFacturas();
  }, []);

  return (
    <div>
      <h1>Recipe List</h1>
      <table className='border'>
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Medicamentos</th>
          </tr>
        </thead>
        <tbody>
          {facturas.map((factura) => (
            <tr key={factura.id}>
              <td>{factura.id}</td>
              <td>{factura.name}</td>
              <td>
                <AddMedicamentos uploadId={factura.id} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default RecipeList;
