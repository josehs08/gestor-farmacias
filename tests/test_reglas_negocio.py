from io import BytesIO

import pytest

import app as app_module
from src.back import utils
from src.back.utils import extraer_datos_factura_pdf, parsear_encabezado_factura


# --- Fakes for pdfplumber / pypdf ------------------------------------------

def _palabra(texto, x0, top):
    return {"text": texto, "x0": x0, "top": top}


class _PaginaPlumber:
    def __init__(self, words):
        self._words = words

    def extract_words(self, **_kwargs):
        return self._words


class _PdfPlumber:
    def __init__(self, paginas):
        self.pages = [_PaginaPlumber(w) for w in paginas]

    def __enter__(self):
        return self

    def __exit__(self, *_exc):
        return False


def _fake_pdfplumber(monkeypatch, paginas):
    monkeypatch.setattr(utils.pdfplumber, "open", lambda _f: _PdfPlumber(paginas))


def _fila_guillermar(descripcion, lote, top):
    columnas = [lote, "12-2027", "2", "0", "0", "0", "0",
                "100,00", "1,00", "200,00", "2,00", "0"]
    palabras = [_palabra(descripcion, 10, top)]
    palabras += [_palabra(c, 100 + i * 20, top) for i, c in enumerate(columnas)]
    return palabras


def _fila_insuaminca(codigo, descripcion, top, esc_prd="0.00"):
    return [
        _palabra(codigo, 10, top),
        _palabra(descripcion, 80, top),
        _palabra("3", 220, top),
        _palabra("L1", 260, top),
        _palabra("2027-05", 300, top),
        _palabra("5.00", 345, top),
        _palabra(esc_prd, 380, top),
        _palabra("0.00", 410, top),
        _palabra("0.00", 440, top),
        _palabra("4,50", 480, top),
        _palabra("13,50", 530, top),
    ]


def _encabezado_insuaminca(top):
    return [_palabra("Código", 10, top), _palabra("Descripción", 80, top)]


# --- Multi-page extraction --------------------------------------------------

def test_guillermar_lee_todas_las_paginas(monkeypatch):
    _fake_pdfplumber(monkeypatch, [
        _fila_guillermar("ATAMEL", "L1", 100),
        _fila_guillermar("LORATADINA", "L2", 100),
    ])

    resultado = utils._extraer_medicamentos_guillermar(b"%PDF")

    assert [m["descripcion"] for m in resultado] == ["ATAMEL", "LORATADINA"]


def test_insuaminca_lee_todas_las_paginas(monkeypatch):
    _fake_pdfplumber(monkeypatch, [
        _encabezado_insuaminca(50) + _fila_insuaminca("C1", "ATAMEL", 100),
        # Continuation page repeats the table header at the top.
        _encabezado_insuaminca(50) + _fila_insuaminca("C2", "LORATADINA", 100),
    ])

    resultado = utils._extraer_medicamentos_insuaminca(b"%PDF")

    assert [m["codigo"] for m in resultado] == ["C1", "C2"]
    assert [m["descripcion"] for m in resultado] == ["ATAMEL", "LORATADINA"]


def test_insuaminca_pagina_sin_encabezado_no_descarta_items(monkeypatch):
    _fake_pdfplumber(monkeypatch, [
        _encabezado_insuaminca(50) + _fila_insuaminca("C1", "ATAMEL", 100),
        _fila_insuaminca("C2", "LORATADINA", 100),
    ])

    resultado = utils._extraer_medicamentos_insuaminca(b"%PDF")

    assert [m["codigo"] for m in resultado] == ["C1", "C2"]


class _PaginaPyPDF:
    def __init__(self, texto):
        self._texto = texto

    def extract_text(self):
        return self._texto


def test_texto_de_factura_incluye_todas_las_paginas(monkeypatch):
    class _Reader:
        def __init__(self, _file):
            self.pages = [
                _PaginaPyPDF("Número de Documento: 123\nlinea pagina 1"),
                _PaginaPyPDF("linea pagina 2"),
            ]

    monkeypatch.setattr(utils.pypdf, "PdfReader", _Reader)

    factura = extraer_datos_factura_pdf(BytesIO(b"%PDF"))

    assert "linea pagina 1" in factura["texto"]
    assert "linea pagina 2" in factura["texto"]
    assert factura["numero_factura"] == "123"


# --- Exchange rate parsing (legacy "Número de Documento" layout) ------------

@pytest.mark.parametrize(
    "tasa_impresa,esperado",
    [
        ("36.50", "36.5"),
        ("146,50", "146.5"),
        ("1.234,56", "1234.56"),
        ("146", "146.0"),
    ],
)
def test_tipo_de_cambio_legacy_acepta_formatos(tasa_impresa, esperado):
    texto = f"Número de Documento: 1\nTipo de Cambio (USA $) Bs. {tasa_impresa}\n"

    encabezado = parsear_encabezado_factura(texto)

    assert encabezado["tipo_de_cambio"] == esperado


# --- Endpoints --------------------------------------------------------------

@pytest.fixture
def cliente():
    app_module.app.config["TESTING"] = True
    with app_module.app.app_context():
        app_module.db.drop_all()
        app_module.db.create_all()
    with app_module.app.test_client() as c:
        yield c


def _fake_extraccion(monkeypatch, numero="0001", drogueria="Nena"):
    monkeypatch.setattr(
        app_module,
        "extraer_datos_factura_pdf",
        lambda _f: {
            "numero_factura": numero,
            "fecha": "01-01-2026",
            "tipo_de_cambio": "36.5",
            "drogueria": drogueria,
            "texto": "texto",
        },
    )


def _subir(cliente, contenido=b"%PDF-uno"):
    return cliente.post(
        "/factura",
        data={"file": (BytesIO(contenido), "f.pdf")},
        content_type="multipart/form-data",
    )


def test_factura_duplicada_por_numero_y_drogueria_devuelve_409(cliente, monkeypatch):
    _fake_extraccion(monkeypatch)

    assert _subir(cliente, b"%PDF-uno").status_code == 201
    respuesta = _subir(cliente, b"%PDF-otro-archivo")

    assert respuesta.status_code == 409


def test_mismo_numero_en_otra_drogueria_no_es_duplicado(cliente, monkeypatch):
    _fake_extraccion(monkeypatch, drogueria="Nena")
    assert _subir(cliente, b"%PDF-uno").status_code == 201

    _fake_extraccion(monkeypatch, drogueria="INSUAMINCA, C.A.")
    assert _subir(cliente, b"%PDF-dos").status_code == 201


def test_mismo_archivo_sin_numero_es_duplicado(cliente, monkeypatch):
    _fake_extraccion(monkeypatch, numero=None)

    assert _subir(cliente, b"%PDF-igual").status_code == 201
    assert _subir(cliente, b"%PDF-igual").status_code == 409


def test_extraccion_sin_medicamentos_devuelve_422_y_permite_reintentar(cliente, monkeypatch):
    _fake_extraccion(monkeypatch)
    factura_id = _subir(cliente).get_json()["factura"]["id"]
    monkeypatch.setattr(app_module, "extraer_informacion_medicamentos", lambda *_a: [])

    respuesta = cliente.post(f"/medicina/{factura_id}")

    assert respuesta.status_code == 422
    monkeypatch.setattr(
        app_module,
        "extraer_informacion_medicamentos",
        lambda *_a: [{"descripcion": "ATAMEL", "cantidad": 1}],
    )
    assert cliente.post(f"/medicina/{factura_id}").status_code == 201


def test_insuaminca_descuentos_con_decimales_no_se_redondean(monkeypatch):
    _fake_pdfplumber(monkeypatch, [
        _encabezado_insuaminca(50) + _fila_insuaminca("C1", "ATAMEL", 100, esc_prd="2.50"),
    ])

    [item] = utils._extraer_medicamentos_insuaminca(b"%PDF")

    assert item["DC"] == 5.0
    assert item["DD"] == 2.5


def test_neto_es_unitario_en_todos_los_formatos(monkeypatch):
    # Importe de la línea 13,50 por 3 unidades → neto unitario 4,50, igual
    # que en el formato Nena, donde Neto ya viene por unidad.
    _fake_pdfplumber(monkeypatch, [_encabezado_insuaminca(50) + _fila_insuaminca("C1", "ATAMEL", 100)])
    [insuaminca] = utils._extraer_medicamentos_insuaminca(b"%PDF")
    assert insuaminca["Neto USD"] == pytest.approx(4.50)
    assert insuaminca["TOT. NETO USD"] == pytest.approx(13.50)

    # GUILLER MAR: 2 unidades, importe 200,00 Bs / 2,00 US$.
    _fake_pdfplumber(monkeypatch, [_fila_guillermar("ATAMEL", "L1", 100)])
    [guillermar] = utils._extraer_medicamentos_guillermar(b"%PDF")
    assert guillermar["Neto Bs"] == pytest.approx(100.0)
    assert guillermar["Neto USD"] == pytest.approx(1.0)
    assert guillermar["TOT. NETO Bs"] == pytest.approx(200.0)


@pytest.mark.parametrize(
    "texto,formato",
    [
        ("Número de Documento: 1", "nena"),
        ("INSUAMINCA, C.A. RIF: J-1\nPedido de cliente", "insuaminca"),
        ("FACTURA 0001", "guillermar"),
        (None, None),
    ],
)
def test_detectar_formato(texto, formato):
    assert utils.detectar_formato(texto) == formato


def test_subir_archivo_que_no_es_pdf_devuelve_400(cliente):
    respuesta = cliente.post(
        "/factura",
        data={"file": (BytesIO(b"no soy un pdf"), "f.pdf")},
        content_type="multipart/form-data",
    )

    assert respuesta.status_code == 400


def test_subir_archivo_demasiado_grande_devuelve_413(cliente):
    contenido = b"%PDF" + b"0" * app_module.TAMANO_MAXIMO_PDF

    respuesta = _subir(cliente, contenido)

    assert respuesta.status_code == 413
    assert "error" in respuesta.get_json()


def test_factura_serializada_incluye_formato(cliente, monkeypatch):
    _fake_extraccion(monkeypatch)
    factura_id = _subir(cliente).get_json()["factura"]["id"]
    with app_module.app.app_context():
        recipe = app_module.db.session.get(app_module.Recipe, factura_id)
        recipe.texto = "Número de Documento: 0001"
        app_module.db.session.commit()

    [factura] = cliente.get("/facturas").get_json()

    assert factura["formato"] == "nena"


def _guardar_medicamentos(cliente, monkeypatch, descripciones):
    _fake_extraccion(monkeypatch)
    factura_id = _subir(cliente).get_json()["factura"]["id"]
    monkeypatch.setattr(
        app_module,
        "extraer_informacion_medicamentos",
        lambda *_a: [{"descripcion": d, "cantidad": 1, "PRECIO_USD": 2.0, "DD": 2.5} for d in descripciones],
    )
    assert cliente.post(f"/medicina/{factura_id}").status_code == 201
    return factura_id


def test_precio_devuelve_medicamento_con_su_factura(cliente, monkeypatch):
    factura_id = _guardar_medicamentos(cliente, monkeypatch, ["ATAMEL 500MG"])

    [resultado] = cliente.get("/precio/atamel").get_json()["precios"]

    assert resultado["descripcion"] == "ATAMEL 500MG"
    assert resultado["DD"] == 2.5
    assert resultado["factura"]["id"] == factura_id
    assert resultado["factura"]["drogueria"] == "Nena"


def test_precio_trata_comodines_como_texto_literal(cliente, monkeypatch):
    _guardar_medicamentos(cliente, monkeypatch, ["ATAMEL 500MG", "CREMA 10% UREA"])

    assert cliente.get("/precio/%25").get_json()["precios"][0]["descripcion"] == "CREMA 10% UREA"
    assert len(cliente.get("/precio/%25").get_json()["precios"]) == 1
    assert cliente.get("/precio/_").status_code == 404


def test_descargar_excel_no_deja_archivos_temporales(cliente, monkeypatch):
    _guardar_medicamentos(cliente, monkeypatch, ["ATAMEL"])

    respuesta = cliente.get("/descargar/medicinas")

    assert respuesta.status_code == 200
    assert respuesta.data.startswith(b"PK")  # .xlsx es un zip


def test_pdf_corrupto_devuelve_400(cliente):
    respuesta = _subir(cliente, b"%PDF-1.4 esto no es un pdf de verdad")

    assert respuesta.status_code == 400


def test_formularios_del_admin_llevan_token_csrf(cliente, monkeypatch):
    monkeypatch.setenv("ADMIN_USER", "admin")
    monkeypatch.setenv("ADMIN_PASSWORD", "secreto")

    sin_credenciales = cliente.get("/admin/medicina/new/")
    con_credenciales = cliente.get("/admin/medicina/new/", auth=("admin", "secreto"))

    assert sin_credenciales.status_code == 401
    assert con_credenciales.status_code == 200
    assert b"csrf_token" in con_credenciales.data
