import { useEffect, useState } from "react";

// Shared read of the official Bs/US$ rate, backing the fiscal header printed
// at the top of every ticket. Same public endpoint PrecioDolar already
// reads; centralized here so every surface prints the same figure instead
// of duplicating the fetch.
export const useTasaBcv = () => {
  const [status, setStatus] = useState("loading"); // loading | success | error
  const [tasa, setTasa] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const fetchTasa = async () => {
      setStatus("loading");
      try {
        const response = await fetch("https://ve.dolarapi.com/v1/dolares/oficial", {
          method: "GET",
        });
        const data = await response.json();
        if (cancelled) return;
        if (response.ok) {
          setTasa(data.promedio);
          setStatus("success");
        } else {
          setStatus("error");
        }
      } catch {
        if (!cancelled) setStatus("error");
      }
    };

    fetchTasa();
    return () => {
      cancelled = true;
    };
  }, []);

  return { status, tasa };
};

export default useTasaBcv;
