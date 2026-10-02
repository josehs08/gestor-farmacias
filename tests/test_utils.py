import socket

import pytest

from src.back.utils import (
    _extraer_medicamentos_legacy,
    _numero_flexible,
    validar_url_publica,
)


def test_legacy_parser_cantidad_mayor_o_igual_a_diez():
    """cantidad=12 (dos dígitos) no debe perderse por el regex de un solo dígito."""
    linea = (
        "12 ABC123 ACETAMINOFEN 500MG 3 L01 X 12-2026 16.00 1,234.56 "
        "5 0 0 0 1,100.00 25.50 13,200.00 306.00"
    )
    resultado = _extraer_medicamentos_legacy(linea)

    assert len(resultado) == 1
    medicamento = resultado[0]

    assert medicamento["cantidad"] == 12
    assert isinstance(medicamento["cantidad"], int)
    assert medicamento["codigo"] == "ABC123"
    assert medicamento["descripcion"] == "ACETAMINOFEN 500MG"
    assert medicamento["bulto"] == 3
    assert isinstance(medicamento["bulto"], int)
    assert medicamento["lote"] == "L01"
    assert medicamento["exp"] == "12-2026"
    assert medicamento["ALIC"] == "16.00"
    assert isinstance(medicamento["ALIC"], str)

    assert medicamento["PRECIO_BS"] == pytest.approx(1234.56)
    assert isinstance(medicamento["PRECIO_BS"], float)
    assert medicamento["DC"] == 5
    assert medicamento["DD"] == 0
    assert medicamento["DL"] == 0
    assert medicamento["DV"] == 0
    assert medicamento["Neto Bs"] == pytest.approx(1100.00)
    assert medicamento["Neto USD"] == pytest.approx(25.50)
    assert medicamento["TOT. NETO Bs"] == pytest.approx(13200.00)
    assert medicamento["TOT. NETO USD"] == pytest.approx(306.00)


@pytest.mark.parametrize(
    "valor,esperado",
    [
        ("1,234.56", 1234.56),
        ("1.234,56", 1234.56),
        ("1234,56", 1234.56),
    ],
)
def test_numero_flexible_formatos_validos(valor, esperado):
    assert _numero_flexible(valor) == pytest.approx(esperado)


def test_numero_flexible_valores_invalidos():
    assert _numero_flexible("abc") is None
    assert _numero_flexible(None) is None
    assert _numero_flexible("12345") is None


def test_validar_url_publica_rechaza_esquema_no_http():
    ok, motivo = validar_url_publica("ftp://example.com/archivo.pdf")
    assert ok is False
    assert motivo


@pytest.mark.parametrize(
    "url",
    [
        "http://localhost/factura.pdf",
        "http://127.0.0.1/factura.pdf",
        "http://10.0.0.1/factura.pdf",
        "http://169.254.169.254/latest/meta-data/",
    ],
)
def test_validar_url_publica_rechaza_direcciones_no_publicas(url):
    ok, motivo = validar_url_publica(url)
    assert ok is False
    assert motivo


def test_validar_url_publica_acepta_host_publico(monkeypatch):
    def fake_getaddrinfo(host, port, *args, **kwargs):
        return [(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("93.184.216.34", 0))]

    monkeypatch.setattr(socket, "getaddrinfo", fake_getaddrinfo)

    ok, motivo = validar_url_publica("http://example.com/factura.pdf")
    assert ok is True
    assert motivo is None
