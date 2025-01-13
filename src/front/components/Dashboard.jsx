import { useState } from "react";

const Dashboard = () => {
  const [facturas, setFacturas] = useState([]);

  const handleGetFactures = () => {
    try {
      const data = fetch("http://localhost:3001/factures", {
        method: "GET",
        headers: {
          "Content-Type": "applicatioon/json",
        },
      });
      setFacturas(data);
    } catch (error) {
      console.log(error);
    }
  };
  return (
    <div className='flex justify-center p-4'>
      <h1>{facturas}</h1>
    </div>
  );
};

export default Dashboard;
