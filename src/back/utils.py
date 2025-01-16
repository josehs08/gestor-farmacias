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

class Medicina:
    def __init__(self, cantidad, codigo, descripcion, lote, precio_bs, precio_usd, total_bs, total_usd):
        self.cantidad = cantidad
        self.codigo = codigo
        self.descripcion = descripcion
        self.lote = lote
        self.precio_bs = precio_bs
        self.precio_usd = precio_usd
        self.total_bs = total_bs
        self.total_usd = total_usd
        
def extract_invoice_data(text):
    factura_pattern = re.compile(r'Factura N°: (\d+)')
    fecha_pattern = re.compile(r'Fecha: (\d{2}-\d{2}-\d{4})')
    medicina_pattern = re.compile(r'(\d+)\s+(\w+)\s+([\w\s\.,-]+)\s+\(E\)\s+\d+\s+[\d/]+\s+[\d.]+\s+([\d.]+)\s+[\d.]+\s+[\d.]+\s+[\d.]+\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)')
    factura_num = factura_pattern.search(text).group(1)
    fecha = fecha_pattern.search(text).group(1)
    medicinas = []
    for match in medicina_pattern.findall(text):
        cantidad, codigo, descripcion, precio_bs, precio_usd, total_bs, total_usd = match
        medicinas.append(Medicina(cantidad, codigo, descripcion, '', precio_bs, precio_usd, total_bs, total_usd))
    return factura_num, fecha, medicinas