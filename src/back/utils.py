import PyPDF2
import os
import re
from datetime import datetime
from io import BytesIO

def extraer_datos_factura_pdf(file):
    reader = PyPDF2.PdfReader(file)
    if len(reader.pages) == 0:
        return None
    
    page = reader.pages[0]
    texto = page.extract_text()
    numero_factura = re.search(r"Número de Documento: (\d+)", texto)
    fecha = re.search(r"Fecha de Emisión: (\d{2}-\d{2}-\d{4})", texto)
    tipo_de_cambio = re.search(r"Tipo de Cambio \(USA \$\) Bs\. (\d+(\.\d+)?)", texto)

    factura = {
        "name": datetime.now().strftime('%Y%m%d') + ".pdf",
        "texto": texto,
        "numero_factura": numero_factura.group(1) if numero_factura else None,
        "fecha": fecha.group(1) if fecha else None,
        "tipo_de_cambio": tipo_de_cambio.group(1) if tipo_de_cambio else None,
        "file": file
    }

    print(factura)
    return factura

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

def extraer_texto_pdf(file_data):
    """Convierte los bytes del PDF en texto."""
    pdf_reader = PyPDF2.PdfReader(BytesIO(file_data))
    extracted_text = "\n".join([page.extract_text() for page in pdf_reader.pages if page.extract_text()])
    return extracted_text
