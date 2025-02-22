import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const PrecioDolar = () => {
  const handlePrecio = async () => {
    try {
      const response = await fetch(
        "https://ve.dolarapi.com/v1/dolares/oficial",
        {
          method: "GET",
        }
      );
      const data = await response.json();
      if (response.ok) {
        setPrecio(data.promedio);
      } else {
        alert(data.error);
      }
    } catch (error) {
      alert("Error fetching dolar price");
    }
  };

  const [precio, setPrecio] = useState([]);

  useEffect(() => {
    handlePrecio();
  }, []);
  return (
    <Card className='w-[350px] p-4 m-4'>
      <CardTitle className='text-center'>
        <h2 className='scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0 mb-2'>
          Precio Dólar
        </h2>
      </CardTitle>
      <CardContent>
        <p className='scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl text-center'>
          {precio}
        </p>
      </CardContent>
    </Card>
  );
};
