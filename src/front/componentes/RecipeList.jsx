import React, { useState, useEffect } from "react";
import AddMedicamentos from "./addMedicamentos.jsx";

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
    <div className='container mx-auto p-4'>
      <h1 className='text-2xl font-bold mb-4'>Lista de facturas</h1>
      <table className='min-w-full border border-gray-200'>
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
              <td className='py-2 px-4 border-b text-center'>{factura.id}</td>
              <td className='py-2 px-4 border-b text-center'>{factura.name}</td>
              <td className='py-2 px-4 border-b text-center'>
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
