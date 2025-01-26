import React, { useState, useEffect } from "react";

const MedicamentoLista = () => {
  const [medicamentos, setMedicamentos] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [visibleColumns, setVisibleColumns] = useState({
    cantidad: true,
    codigo: true,
    descripcion: true,
    bulto: true,
    lote: true,
    exp: true,
    ALIC: true,
    PRECIO_BS: true,
    DC: true,
    DD: true,
    DL: true,
    DV: true,
    Neto_Bs: true,
    Neto_USD: true,
    TOT_NETO_Bs: true,
    TOT_NETO_USD: true,
  });

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

  const handleColumnVisibilityChange = (event) => {
    const { name, checked } = event.target;
    setVisibleColumns((prev) => ({ ...prev, [name]: checked }));
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
      <div className='mb-4'>
        {Object.keys(visibleColumns).map((column) => (
          <label key={column} className='mr-4'>
            <input
              type='checkbox'
              name={column}
              checked={visibleColumns[column]}
              onChange={handleColumnVisibilityChange}
              className='mr-1'
            />
            {column}
          </label>
        ))}
      </div>
      <div className='overflow-x-auto'>
        <table className='min-w-full border border-gray-200'>
          <thead>
            <tr>
              {visibleColumns.cantidad && (
                <th className='py-2 px-4 border-b text-center'>Cantidad</th>
              )}
              {visibleColumns.codigo && (
                <th className='py-2 px-4 border-b text-center'>Código</th>
              )}
              {visibleColumns.descripcion && (
                <th className='py-2 px-4 border-b text-center'>Descripción</th>
              )}
              {visibleColumns.bulto && (
                <th className='py-2 px-4 border-b text-center'>Bulto</th>
              )}
              {visibleColumns.lote && (
                <th className='py-2 px-4 border-b text-center'>Lote</th>
              )}
              {visibleColumns.exp && (
                <th className='py-2 px-4 border-b text-center'>Exp</th>
              )}
              {visibleColumns.ALIC && (
                <th className='py-2 px-4 border-b text-center'>Alic</th>
              )}
              {visibleColumns.PRECIO_BS && (
                <th className='py-2 px-4 border-b text-center'>Precio Bs</th>
              )}
              {visibleColumns.DC && (
                <th className='py-2 px-4 border-b text-center'>DC</th>
              )}
              {visibleColumns.DD && (
                <th className='py-2 px-4 border-b text-center'>DD</th>
              )}
              {visibleColumns.DL && (
                <th className='py-2 px-4 border-b text-center'>DL</th>
              )}
              {visibleColumns.DV && (
                <th className='py-2 px-4 border-b text-center'>DV</th>
              )}
              {visibleColumns.Neto_Bs && (
                <th className='py-2 px-4 border-b text-center'>Neto Bs</th>
              )}
              {visibleColumns.Neto_USD && (
                <th className='py-2 px-4 border-b text-center'>Neto USD</th>
              )}
              {visibleColumns.TOT_NETO_Bs && (
                <th className='py-2 px-4 border-b text-center'>Tot Neto Bs</th>
              )}
              {visibleColumns.TOT_NETO_USD && (
                <th className='py-2 px-4 border-b text-center'>Tot Neto USD</th>
              )}
            </tr>
          </thead>
          <tbody>
            {filteredMedicamentos.map((medicamento) => (
              <tr key={medicamento.id}>
                {visibleColumns.cantidad && (
                  <td className='py-2 px-4 border-b text-center'>
                    {medicamento.cantidad}
                  </td>
                )}
                {visibleColumns.codigo && (
                  <td className='py-2 px-4 border-b text-center'>
                    {medicamento.codigo}
                  </td>
                )}
                {visibleColumns.descripcion && (
                  <td className='py-2 px-4 border-b text-center'>
                    {medicamento.descripcion}
                  </td>
                )}
                {visibleColumns.bulto && (
                  <td className='py-2 px-4 border-b text-center'>
                    {medicamento.bulto}
                  </td>
                )}
                {visibleColumns.lote && (
                  <td className='py-2 px-4 border-b text-center'>
                    {medicamento.lote}
                  </td>
                )}
                {visibleColumns.exp && (
                  <td className='py-2 px-4 border-b text-center'>
                    {medicamento.exp}
                  </td>
                )}
                {visibleColumns.ALIC && (
                  <td className='py-2 px-4 border-b text-center'>
                    {medicamento.ALIC}
                  </td>
                )}
                {visibleColumns.PRECIO_BS && (
                  <td className='py-2 px-4 border-b text-center'>
                    {medicamento.PRECIO_BS}
                  </td>
                )}
                {visibleColumns.DC && (
                  <td className='py-2 px-4 border-b text-center'>
                    {medicamento.DC}
                  </td>
                )}
                {visibleColumns.DD && (
                  <td className='py-2 px-4 border-b text-center'>
                    {medicamento.DD}
                  </td>
                )}
                {visibleColumns.DL && (
                  <td className='py-2 px-4 border-b text-center'>
                    {medicamento.DL}
                  </td>
                )}
                {visibleColumns.DV && (
                  <td className='py-2 px-4 border-b text-center'>
                    {medicamento.DV}
                  </td>
                )}
                {visibleColumns.Neto_Bs && (
                  <td className='py-2 px-4 border-b text-center'>
                    {medicamento.Neto_Bs}
                  </td>
                )}
                {visibleColumns.Neto_USD && (
                  <td className='py-2 px-4 border-b text-center'>
                    {medicamento.Neto_USD}
                  </td>
                )}
                {visibleColumns.TOT_NETO_Bs && (
                  <td className='py-2 px-4 border-b text-center'>
                    {medicamento.TOT_NETO_Bs}
                  </td>
                )}
                {visibleColumns.TOT_NETO_USD && (
                  <td className='py-2 px-4 border-b text-center'>
                    {medicamento.TOT_NETO_USD}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MedicamentoLista;
