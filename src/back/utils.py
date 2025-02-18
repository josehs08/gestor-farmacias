import PyPDF2
import os
import re
from datetime import datetime

def extraer_datos_factura_pdf(file):
    reader = PyPDF2.PdfReader(file)
    facturas = []
    for page_num in range(len(reader.pages)):
        page = reader.pages[page_num]
        texto = page.extract_text()
        numero_factura = re.search(r"Factura N°: (\d+)", texto)
        fecha = re.search(r"Fecha: (\d+-\d+-\d+)", texto)
        tipo_de_cambio = re.search(r"Tipo de Cambio \(USA \$\) Bs\. (\d+(\.\d+)?)", texto)
        factura = {
            "name": datetime.now().strftime('%Y%m%d') + ".pdf",
            "texto": texto,
            "numero_factura": numero_factura.group(1) if numero_factura else None,
            "fecha": fecha.group(1) if fecha else None,
            "tipo_de_cambio":tipo_de_cambio.group(1) if tipo_de_cambio else None
        }
        facturas.append(factura)
    return facturas

def extraer_informacion_medicamentos(texto):
    patron = r"^(\d)\s(\w+)\s(.*?)\s(\d)\s(\w+)\s.\s(\d+.\d+)\s(\d+.\d+)\s([\w,]+.\d+)\s(\d+)\s(\d+)\s(\d+)\s(\d+)\s([\w,]+.\d+)\s(\d+.\d+)\s([\w,]+.\d+)\s(\d+.\d+)"
    coincidencias = re.finditer(patron, texto, re.MULTILINE)
    medicamentos = []

    for coincidencia in coincidencias:
        medicamento = {
            "cantidad": coincidencia.group(1),
            "codigo": coincidencia.group(2),
            "descripcion": coincidencia.group(3),
            "bulto": coincidencia.group(4),
            "lote": coincidencia.group(5),
            "exp": coincidencia.group(6),
            "ALIC": coincidencia.group(7),
            "PRECIO_BS":coincidencia.group(8),
            "DC":coincidencia.group(9),
            "DD": coincidencia.group(10),
            "DL": coincidencia.group(11),
            "DV": coincidencia.group(12),
            "Neto Bs": coincidencia.group(13),
            "Neto USD": coincidencia.group(14),
            "TOT. NETO Bs": coincidencia.group(15),
            "TOT. NETO USD": coincidencia.group(16),
        }
        medicamentos.append(medicamento)
    return medicamentos