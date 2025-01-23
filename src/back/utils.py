import PyPDF2
import os
import re

def extract_text_from_pdf(file):
    reader = PyPDF2.PdfReader(file)
    text = ''
    for page_num in range(len(reader.pages)):
        page = reader.pages[page_num]
        text += page.extract_text()
    return text

def extraer_datos(texto):
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