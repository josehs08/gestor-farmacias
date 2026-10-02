import PyPDF2
import pdfplumber
import ipaddress
import os
import re
import socket
from io import BytesIO
from urllib.parse import urlparse


def _es_numero_latino(valor):
    """Convierte un número en formato latino ('10.222,92') a float."""
    if valor is None:
        return None
    limpio = valor.replace(".", "").replace(",", ".")
    try:
        return float(limpio)
    except ValueError:
        return None


def _es_entero(valor):
    if valor is None:
        return None
    try:
        return int(valor)
    except ValueError:
        return None


def _es_entero_redondeado(valor):
    """Convierte un decimal con punto ('6.00') a entero, redondeando."""
    if valor is None:
        return None
    try:
        return round(float(valor))
    except ValueError:
        return None


def _numero_flexible(valor):
    """Convierte un número de formato ambiguo ('.' o ',' como separador decimal)
    a float. El último separador encontrado se asume decimal; el resto de
    caracteres no numéricos de la parte entera se descartan (miles)."""
    if valor is None:
        return None
    coincidencia = re.match(r"^(.*)[.,](\d+)$", valor)
    if not coincidencia:
        return None
    entero, decimales = coincidencia.groups()
    entero_limpio = re.sub(r"\D", "", entero) or "0"
    try:
        return float(f"{entero_limpio}.{decimales}")
    except ValueError:
        return None


def _texto_o_none(lista_palabras):
    texto = " ".join(lista_palabras).strip()
    return texto if texto else None


def validar_url_publica(url):
    """Valida que una URL sea http(s) y resuelva únicamente a direcciones IP
    públicas, para evitar SSRF hacia redes internas/metadatos de nube."""
    try:
        partes = urlparse(url)
    except ValueError:
        return False, "URL inválida"

    if partes.scheme not in ("http", "https"):
        return False, "Solo se permiten URLs http o https"
    if not partes.hostname:
        return False, "La URL no tiene un host válido"

    try:
        resultados = socket.getaddrinfo(partes.hostname, None)
    except socket.gaierror:
        return False, "No se pudo resolver el host de la URL"

    if not resultados:
        return False, "No se pudo resolver el host de la URL"

    for resultado in resultados:
        direccion = resultado[4][0]
        try:
            ip = ipaddress.ip_address(direccion)
        except ValueError:
            return False, "El host resolvió a una dirección IP inválida"
        if (
            ip.is_private
            or ip.is_loopback
            or ip.is_link_local
            or ip.is_reserved
            or ip.is_multicast
            or ip.is_unspecified
        ):
            return False, "La URL resuelve a una dirección no pública"

    return True, None


def _tasa_a_texto(valor):
    """Normaliza una tasa impresa ('36.50', '146,50', '1.234,56', '146') al
    formato con punto decimal que se guarda en Recipe.tipo_de_cambio."""
    if valor is None:
        return None
    limpio = valor.rstrip(".,")
    numero = _numero_flexible(limpio) if re.search(r"[.,]", limpio) else _es_entero(limpio)
    return str(float(numero)) if numero is not None else None


def parsear_encabezado_factura(texto):
    """Extrae número, fecha, tipo de cambio y droguería del texto de la
    primera página, según el formato de proveedor detectado."""
    if "Número de Documento" in texto:
        numero_factura = re.search(r"Número de Documento: (\d+)", texto)
        fecha = re.search(r"Fecha de Emisión: (\d{2}-\d{2}-\d{4})", texto)
        tipo_de_cambio = re.search(r"Tipo de Cambio \(USA \$\) Bs\. ([\d.,]+)", texto)
        tipo_de_cambio_valor = _tasa_a_texto(tipo_de_cambio.group(1)) if tipo_de_cambio else None
        # La droguería (el vendedor, no la farmacia cliente) aparece en la
        # dirección de la sede: "...Edif, Droguería Nena, Guarenas...".
        drogueria = re.search(r"Droguería\s+([^,\n]+)", texto)
    elif "Pedido de cliente" in texto:
        # Formato "Pedido de cliente" (proveedor INSUAMINCA, C.A.): factura en
        # una sola moneda (USD), sin "Tipo de Cambio" explícito — el número de
        # pedido va después de "Número:" y la fecha después de "Fecha:"
        # (dd/mm/aaaa), ambos en el mismo bloque de encabezado.
        numero_factura = re.search(r"Número:\s*(\d+)", texto)
        fecha = re.search(r"Fecha:\s*(\d{2}/\d{2}/\d{4})", texto)
        tipo_de_cambio_valor = None
        # El proveedor (droguería) es la razón social con la que abre el PDF,
        # justo antes de su "RIF:" (ej. "INSUAMINCA, C.A. RIF: J-...").
        drogueria = re.search(r"^(.+?)\s+RIF:", texto)
    else:
        # Formato "FACTURA <numero>" (ej. proveedor GUILLER MAR): sin "Número de
        # Documento", fecha con "/" y sin "Tipo de Cambio (USA $)" explícito —
        # el tipo de cambio viene como "Tasa BCV" y su valor cae en la línea
        # siguiente por cómo el PDF ubica esa columna.
        numero_factura = re.search(r"FACTURA\s+(\S+)", texto)
        fecha = re.search(r"Fecha de Emisión:\s*(\d{2}/\d{2}/\d{4})", texto)
        tasa_bcv = re.search(r"Tasa BCV.*?(\d{1,3}(?:\.\d{3})*,\d{2})", texto, re.DOTALL)
        tipo_de_cambio_valor = _tasa_a_texto(tasa_bcv.group(1)) if tasa_bcv else None
        # Este formato no imprime el nombre de la droguería como texto en
        # ningún encabezado (el logo es una imagen); el único identificador
        # de texto disponible es el código pegado antes de "Unidades:".
        drogueria = re.search(r"(\S+)\s+Unidades:", texto)

    return {
        "numero_factura": numero_factura.group(1) if numero_factura else None,
        "fecha": fecha.group(1) if fecha else None,
        "tipo_de_cambio": tipo_de_cambio_valor,
        "drogueria": drogueria.group(1).strip() if drogueria else None,
    }


def extraer_datos_factura_pdf(file):
    reader = PyPDF2.PdfReader(file)
    if len(reader.pages) == 0:
        return None

    textos = [page.extract_text() or "" for page in reader.pages]
    # El encabezado solo se lee de la primera página; el texto completo se
    # guarda para que la extracción de ítems cubra facturas de varias páginas.
    factura = parsear_encabezado_factura(textos[0])
    factura["texto"] = "\n".join(textos)
    return factura


def extraer_informacion_medicamentos(texto, pdf_bytes=None):
    if "Número de Documento" in texto:
        return _extraer_medicamentos_legacy(texto)
    if pdf_bytes is None:
        return []
    if "Pedido de cliente" in texto:
        return _extraer_medicamentos_insuaminca(pdf_bytes)
    return _extraer_medicamentos_guillermar(pdf_bytes)


def _extraer_medicamentos_legacy(texto):
    patron = r"^(\d+)\s(\w+)\s(.*?)\s(\d+)\s(\w+)\s.\s(\d+.\d+)\s(\d+.\d+)\s([\w,]+.\d+)\s(\d+)\s(\d+)\s(\d+)\s(\d+)\s([\w,]+.\d+)\s(\d+.\d+)\s([\w,]+.\d+)\s(\d+.\d+)"
    coincidencias = re.finditer(patron, texto, re.MULTILINE)
    medicamentos = []

    for coincidencia in coincidencias:
        medicamento = {
            "cantidad": _es_entero(coincidencia.group(1)),
            "codigo": coincidencia.group(2),
            "descripcion": coincidencia.group(3),
            "bulto": _es_entero(coincidencia.group(4)),
            "lote": coincidencia.group(5),
            "exp": coincidencia.group(6),
            "ALIC": coincidencia.group(7),
            "PRECIO_BS": _numero_flexible(coincidencia.group(8)),
            "DC": _es_entero(coincidencia.group(9)),
            "DD": _es_entero(coincidencia.group(10)),
            "DL": _es_entero(coincidencia.group(11)),
            "DV": _es_entero(coincidencia.group(12)),
            "Neto Bs": _numero_flexible(coincidencia.group(13)),
            "Neto USD": _numero_flexible(coincidencia.group(14)),
            "TOT. NETO Bs": _numero_flexible(coincidencia.group(15)),
            "TOT. NETO USD": _numero_flexible(coincidencia.group(16)),
        }
        medicamentos.append(medicamento)
    return medicamentos


def _agrupar_por_filas(words, tolerancia=2.0):
    """Agrupa palabras de pdfplumber en filas visuales según su posición vertical.

    PyPDF2.extract_text() pega estas columnas sin espacio (columnas angostas
    sin hueco real entre caracteres), así que el texto plano no alcanza para
    separarlas. pdfplumber sí conserva la posición (x0/top) de cada palabra,
    así que reconstruimos la tabla por coordenadas en vez de por regex sobre
    texto plano.
    """
    filas = []
    for palabra in sorted(words, key=lambda w: w["top"]):
        fila = next((f for f in filas if abs(f[0]["top"] - palabra["top"]) <= tolerancia), None)
        if fila is None:
            filas.append([palabra])
        else:
            fila.append(palabra)
    return filas


def _extraer_medicamentos_guillermar(pdf_bytes):
    """Factura tipo GUILLER MAR: columnas Descripción Lote Vence Cant. D/1 D/2
    D/3 D/4 Prec U Prec $ Imp Bs Imp $ IVA%, leídas por posición (ver
    _agrupar_por_filas)."""
    medicamentos = []
    with pdfplumber.open(BytesIO(pdf_bytes)) as pdf:
        filas = [
            fila
            for pagina in pdf.pages
            for fila in _agrupar_por_filas(pagina.extract_words(x_tolerance=1))
        ]

    for fila in filas:
        fila.sort(key=lambda w: w["x0"])
        if len(fila) < 13:
            continue

        columnas = [w["text"] for w in fila[-12:]]
        lote, vence, cant, d1, d2, d3, d4, precu, precusd, impbs, impusd, iva = columnas
        if not re.fullmatch(r"\d{2}-\d{4}", vence):
            continue

        descripcion = " ".join(w["text"] for w in fila[:-12])
        imp_bs = _es_numero_latino(impbs)
        imp_usd = _es_numero_latino(impusd)

        medicamentos.append({
            "cantidad": _es_entero(cant),
            "codigo": None,
            "descripcion": descripcion,
            "bulto": None,
            "lote": lote,
            "exp": vence,
            "ALIC": iva,
            "PRECIO_BS": _es_numero_latino(precu),
            "PRECIO_USD": _es_numero_latino(precusd),
            "DC": _es_entero(d1),
            "DD": _es_entero(d2),
            "DL": _es_entero(d3),
            "DV": _es_entero(d4),
            "Neto Bs": imp_bs,
            "Neto USD": imp_usd,
            "TOT. NETO Bs": imp_bs,
            "TOT. NETO USD": imp_usd,
        })

    return medicamentos


def _extraer_medicamentos_insuaminca(pdf_bytes):
    """Factura tipo "Pedido de cliente" (proveedor INSUAMINCA): columnas Código
    Descripción Cantidad Lote Vence Seg ESC PRD ESC PRV DESC PRV Precio
    Importe, en una sola moneda (USD). Las cuatro columnas Seg/ESC PRD/ESC
    PRV/DESC PRV son descuentos (no hay alícuota de impuesto separada en este
    formato) y se mapean 1 a 1 a DC/DD/DL/DV. La descripción de cada ítem suele
    envolverse en líneas propias por encima y/o por debajo de su fila de datos
    numéricos (identificada por el "Vence" con formato AAAA-MM); cada línea sin
    datos numéricos se asigna al ítem cuya fila esté verticalmente más cerca."""
    with pdfplumber.open(BytesIO(pdf_bytes)) as pdf:
        paginas = [_agrupar_por_filas(p.extract_words(x_tolerance=1)) for p in pdf.pages]

    medicamentos = []
    for indice, filas_pagina in enumerate(paginas):
        top_encabezado = next(
            (fila[0]["top"] for fila in filas_pagina
             if any(palabra["text"] in ("Código", "Descripción") for palabra in fila)),
            None,
        )
        if top_encabezado is None:
            # La primera página siempre trae el encabezado de la tabla; sin él
            # el formato no es el esperado. Las páginas de continuación pueden
            # no repetirlo, y entonces todas sus filas son candidatas.
            if indice == 0:
                return []
            filas = filas_pagina
        else:
            # Todo lo que esté por encima de la fila de encabezado de la tabla
            # (razón social, RIF, dirección del cliente, etc.) también cae
            # dentro de la banda de "descripción" por posición X; se descarta
            # aquí para que no se le pegue al primer ítem de la tabla.
            filas = [fila for fila in filas_pagina if fila[0]["top"] > top_encabezado]
        # Las coordenadas "top" se reinician en cada página, así que la
        # asignación de descripciones a ítems se hace página por página.
        medicamentos.extend(_items_insuaminca(filas))

    return medicamentos


def _items_insuaminca(filas):
    """Convierte las filas de una página (ya sin encabezado) en ítems,
    clasificando cada palabra por su columna según la posición X."""
    bandas = [
        ("codigo", 0, 75),
        ("descripcion", 75, 215),
        ("cantidad", 215, 250),
        ("lote", 250, 295),
        ("vence", 295, 340),
        ("seg", 340, 377),
        ("escprd", 377, 404),
        ("escprv", 404, 430),
        ("descprv", 430, 470),
        ("precio", 470, 520),
        ("importe", 520, float("inf")),
    ]

    def clasificar(fila):
        datos = {nombre: [] for nombre, _, _ in bandas}
        for palabra in fila:
            for nombre, inicio, fin in bandas:
                if inicio <= palabra["x0"] < fin:
                    datos[nombre].append(palabra["text"])
                    break
        return datos

    filas_clasificadas = [(fila[0]["top"], clasificar(fila)) for fila in filas]

    items = [
        (top, datos) for top, datos in filas_clasificadas
        if re.fullmatch(r"\d{4}-\d{2}", _texto_o_none(datos["vence"]) or "")
    ]
    if not items:
        return []

    item_tops = {top for top, _ in items}
    descripciones = {top: [_texto_o_none(datos["descripcion"]) or ""] for top, datos in items}
    for top, datos in filas_clasificadas:
        if top in item_tops or not datos["descripcion"]:
            continue
        top_cercano = min(item_tops, key=lambda t: abs(t - top))
        descripciones[top_cercano].append(_texto_o_none(datos["descripcion"]) or "")

    medicamentos = []
    for top, datos in items:
        importe = _es_numero_latino(_texto_o_none(datos["importe"]))
        medicamentos.append({
            "cantidad": _es_entero(_texto_o_none(datos["cantidad"])),
            "codigo": _texto_o_none(datos["codigo"]),
            "descripcion": " ".join(filter(None, descripciones[top])),
            "bulto": None,
            "lote": _texto_o_none(datos["lote"]),
            "exp": _texto_o_none(datos["vence"]),
            "ALIC": None,
            "PRECIO_BS": None,
            "PRECIO_USD": _es_numero_latino(_texto_o_none(datos["precio"])),
            "DC": _es_entero_redondeado(_texto_o_none(datos["seg"])),
            "DD": _es_entero_redondeado(_texto_o_none(datos["escprd"])),
            "DL": _es_entero_redondeado(_texto_o_none(datos["escprv"])),
            "DV": _es_entero_redondeado(_texto_o_none(datos["descprv"])),
            "Neto Bs": None,
            "Neto USD": importe,
            "TOT. NETO Bs": None,
            "TOT. NETO USD": importe,
        })

    return medicamentos
