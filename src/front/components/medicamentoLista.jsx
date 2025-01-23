import React, { useState, useEffect } from "react";

const MedicamentoLista = () => {
  const [medicamentos, setMedicamentos] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchMedicamentos = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_APP_API_URL}/medicina`
      );
      const data = await response.json();
      setMedicamentos(data);
    } catch (error) {
      console.error("Error fetching medicamentos:", error);
    }
  };

  useEffect(() => {
    fetchMedicamentos();
  }, []);

  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
  };

  const filteredMedicamentos = medicamentos.filter((medicamento) =>
    medicamento.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className='container mx-auto p-4'>
      <h1 className='text-2xl font-bold mb-4'>Medicamento Lista</h1>
      <input
        type='text'
        placeholder='Buscar por descripción'
        value={searchTerm}
        onChange={handleSearch}
        className='mb-4 p-2 border border-gray-300 rounded'
      />
      <div className='overflow-x-auto'>
        <table className='min-w-full border border-gray-200'>
          <thead>
            <tr>
              <th className='py-2 px-4 border-b text-center'>Cantidad</th>
              <th className='py-2 px-4 border-b text-center'>Código</th>
              <th className='py-2 px-4 border-b text-center'>Descripción</th>
              <th className='py-2 px-4 border-b text-center'>Bulto</th>
              <th className='py-2 px-4 border-b text-center'>Lote</th>
              <th className='py-2 px-4 border-b text-center'>Exp</th>
              <th className='py-2 px-4 border-b text-center'>Alic</th>
              <th className='py-2 px-4 border-b text-center'>Precio Bs</th>
              <th className='py-2 px-4 border-b text-center'>DC</th>
              <th className='py-2 px-4 border-b text-center'>DD</th>
              <th className='py-2 px-4 border-b text-center'>DL</th>
              <th className='py-2 px-4 border-b text-center'>DV</th>
              <th className='py-2 px-4 border-b text-center'>Neto Bs</th>
              <th className='py-2 px-4 border-b text-center'>Neto USD</th>
            </tr>
          </thead>
          <tbody>
            {filteredMedicamentos.map((medicamento) => (
              <tr key={medicamento.id}>
                <td className='py-2 px-4 border-b text-center'>
                  {medicamento.cantidad}
                </td>
                <td className='py-2 px-4 border-b text-center'>
                  {medicamento.codigo}
                </td>
                <td className='py-2 px-4 border-b text-center'>
                  {medicamento.descripcion}
                </td>
                <td className='py-2 px-4 border-b text-center'>
                  {medicamento.bulto}
                </td>
                <td className='py-2 px-4 border-b text-center'>
                  {medicamento.lote}
                </td>
                <td className='py-2 px-4 border-b text-center'>
                  {medicamento.exp}
                </td>
                <td className='py-2 px-4 border-b text-center'>
                  {medicamento.ALIC}
                </td>
                <td className='py-2 px-4 border-b text-center'>
                  {medicamento.PRECIO_BS}
                </td>
                <td className='py-2 px-4 border-b text-center'>
                  {medicamento.DC}
                </td>
                <td className='py-2 px-4 border-b text-center'>
                  {medicamento.DD}
                </td>
                <td className='py-2 px-4 border-b text-center'>
                  {medicamento.DL}
                </td>
                <td className='py-2 px-4 border-b text-center'>
                  {medicamento.DV}
                </td>
                <td className='py-2 px-4 border-b text-center'>
                  {medicamento.Neto_Bs}
                </td>
                <td className='py-2 px-4 border-b text-center'>
                  {medicamento.Neto_USD}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MedicamentoLista;
