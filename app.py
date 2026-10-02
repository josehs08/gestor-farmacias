from flask import Flask, request, jsonify, send_file, Response
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from io import BytesIO
import hmac
import os
import secrets
from src.back.utils import (
    detectar_formato,
    extraer_datos_factura_pdf,
    extraer_informacion_medicamentos,
    validar_url_publica,
)
from flask_admin import Admin, AdminIndexView
from flask_admin.contrib.sqla import ModelView
from flask_admin.form import SecureForm
from dotenv import load_dotenv
import pandas as pd
import requests

load_dotenv()

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///database.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
# Sin FLASK_KEY se usa una clave aleatoria por proceso: las sesiones del
# panel admin se invalidan al reiniciar, pero nunca se firma con una clave vacía.
app.config['SECRET_KEY'] = os.getenv('FLASK_KEY') or secrets.token_hex(32)
TAMANO_MAXIMO_PDF = 20 * 1024 * 1024
app.config['MAX_CONTENT_LENGTH'] = TAMANO_MAXIMO_PDF
db = SQLAlchemy(app)

CORS(app, origins=[o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",") if o.strip()])


def _credenciales_admin_validas(auth):
    """Compara las credenciales HTTP Basic contra ADMIN_USER/ADMIN_PASSWORD.
    Si ADMIN_PASSWORD no está configurado, el panel se deniega siempre."""
    admin_password = os.getenv("ADMIN_PASSWORD")
    if not admin_password or auth is None:
        return False
    usuario_ok = hmac.compare_digest(auth.username or "", os.getenv("ADMIN_USER", ""))
    password_ok = hmac.compare_digest(auth.password or "", admin_password)
    return usuario_ok and password_ok


def _admin_acceso_denegado():
    return Response(
        "Acceso no autorizado",
        401,
        {"WWW-Authenticate": 'Basic realm="admin"'},
    )


class SecureModelView(ModelView):
    # Basic Auth hace que el navegador reenvíe las credenciales solo, así que
    # los formularios (incluido el de borrar) necesitan token CSRF.
    form_base_class = SecureForm

    def is_accessible(self):
        return _credenciales_admin_validas(request.authorization)

    def inaccessible_callback(self, name, **kwargs):
        return _admin_acceso_denegado()


class SecureAdminIndexView(AdminIndexView):
    def is_accessible(self):
        return _credenciales_admin_validas(request.authorization)

    def inaccessible_callback(self, name, **kwargs):
        return _admin_acceso_denegado()

class Recipe(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    numero_factura = db.Column(db.String, nullable=True)
    fecha = db.Column(db.String, nullable=True)
    tipo_de_cambio = db.Column(db.String, nullable=True)
    drogueria = db.Column(db.String, nullable=True)
    file = db.Column(db.LargeBinary, nullable=False)
    texto = db.Column(db.String, nullable=True)

    def serialize(self, include_texto=True):
        data = {
            'id': self.id,
            'numero_factura': self.numero_factura,
            'fecha': self.fecha,
            'tipo_de_cambio': self.tipo_de_cambio,
            'drogueria': self.drogueria,
            # Define la regla de precios que aplica el frontend (ver
            # src/front/lib/precioFactura.js).
            'formato': detectar_formato(self.texto),
        }
        if include_texto:
            data['texto'] = self.texto
        return data

class Medicina(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    id_factura = db.Column(db.Integer, db.ForeignKey('recipe.id'), nullable=True)
    cantidad = db.Column(db.Integer, nullable=True)
    codigo = db.Column(db.String, nullable=True)
    descripcion = db.Column(db.String, nullable=True)
    bulto = db.Column(db.Integer, nullable=True)
    lote = db.Column(db.String, nullable=True)
    exp = db.Column(db.String, nullable=True)
    ALIC = db.Column(db.String, nullable=True)
    PRECIO_BS = db.Column(db.Float, nullable=True)
    PRECIO_USD = db.Column(db.Float, nullable=True)
    # Porcentajes de descuento: pueden traer decimales (ej. 4,96 %).
    DC = db.Column(db.Float, nullable=True)
    DD = db.Column(db.Float, nullable=True)
    DL = db.Column(db.Float, nullable=True)
    DV = db.Column(db.Float, nullable=True)
    Neto_Bs = db.Column(db.Float, nullable=True)
    Neto_USD = db.Column(db.Float, nullable=True)
    TOT_NETO_Bs = db.Column(db.Float, nullable=True)
    TOT_NETO_USD = db.Column(db.Float, nullable=True)

    def serialize(self):
        return {
            'id': self.id,
            'id_factura': self.id_factura,
            'cantidad': self.cantidad,
            'codigo': self.codigo,
            'descripcion': self.descripcion,
            'bulto': self.bulto,
            'lote': self.lote,
            'exp': self.exp,
            'ALIC': self.ALIC,
            'PRECIO_BS': self.PRECIO_BS,
            'PRECIO_USD': self.PRECIO_USD,
            'DC': self.DC,
            'DD': self.DD,
            'DL': self.DL,
            'DV': self.DV,
            'Neto_Bs': self.Neto_Bs,
            'Neto_USD': self.Neto_USD,
            'TOT_NETO_Bs': self.TOT_NETO_Bs,
            'TOT_NETO_USD': self.TOT_NETO_USD
        }
        
with app.app_context():
    db.create_all()
    db.session.commit()

admin = Admin(
    app,
    name="Panel de Administración",
    template_mode="bootstrap4",
    index_view=SecureAdminIndexView(),
)
admin.add_view(SecureModelView(Recipe, db.session))
admin.add_view(SecureModelView(Medicina, db.session))


@app.errorhandler(413)
def _archivo_demasiado_grande(_error):
    return jsonify({'error': 'El archivo supera el tamaño máximo permitido (20 MB)'}), 413


def _error_interno(mensaje):
    """Registra la excepción en curso y responde con un mensaje genérico, sin
    exponer detalles internos al cliente."""
    app.logger.exception(mensaje)
    return jsonify({'error': mensaje}), 500


@app.route('/facturas', methods=['GET'])
def facturas():
    facturas = Recipe.query.all()
    data = list(map(lambda x: x.serialize(include_texto=False), facturas))
    return jsonify(data)

@app.route('/droguerias', methods=['GET'])
def droguerias():
    """Lista las droguerías con al menos una factura, para armar la vista de
    medicamentos por proveedor sin traer todos los medicamentos de una vez."""
    valores = db.session.query(Recipe.drogueria).filter(Recipe.drogueria.isnot(None)).distinct().all()
    return jsonify(sorted(v[0] for v in valores if v[0]))

def _buscar_factura_duplicada(numero_factura, drogueria, file_bytes):
    """Una factura es la misma si coincide el número dentro de la misma
    droguería (distintas droguerías pueden repetir numeración) o, cuando no
    se pudo leer el número, si es exactamente el mismo archivo."""
    if numero_factura:
        return Recipe.query.filter_by(numero_factura=numero_factura, drogueria=drogueria).first()
    return Recipe.query.filter_by(file=file_bytes).first()


def _guardar_factura(file_bytes):
    """Extrae los datos de una factura en PDF y la persiste. Compartido por
    /factura (subida directa) y /facturaurl (descarga remota)."""
    try:
        extracted_data = extraer_datos_factura_pdf(BytesIO(file_bytes))
    except Exception:
        app.logger.exception("PDF ilegible")
        return jsonify({'error': 'No se pudo leer el PDF'}), 400

    if not extracted_data:
        return jsonify({'error': 'No se pudo extraer información del PDF'}), 400

    duplicada = _buscar_factura_duplicada(
        extracted_data.get('numero_factura'), extracted_data.get('drogueria'), file_bytes
    )
    if duplicada:
        return jsonify({
            'error': 'Esta factura ya fue cargada',
            'factura_id': duplicada.id,
        }), 409

    numero_factura = extracted_data.get('numero_factura')
    fecha = extracted_data.get('fecha')
    tipo_de_cambio = extracted_data.get('tipo_de_cambio')
    drogueria = extracted_data.get('drogueria')
    texto = extracted_data.get('texto')

    # Crear instancia de la factura
    recipe = Recipe(
        numero_factura=numero_factura,
        fecha=fecha,
        tipo_de_cambio=tipo_de_cambio,
        drogueria=drogueria,
        texto=texto,
        file=file_bytes  # Guardar el archivo en binario
    )

    try:
        db.session.add(recipe)
        db.session.commit()
        return jsonify({"factura": recipe.serialize()}), 201
    except Exception:
        db.session.rollback()
        return _error_interno('No se pudo guardar la factura')
    finally:
        db.session.close()


@app.route("/factura", methods=['POST'])
def factura():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    file_bytes = file.read()
    if not file_bytes.startswith(b"%PDF"):
        return jsonify({'error': 'El archivo no es un PDF válido'}), 400
    return _guardar_factura(file_bytes)


@app.route('/factura/<upload_id>', methods=['GET'])
def download(upload_id):
    upload = Recipe.query.filter_by(id=upload_id).first()
    if not upload:
        return jsonify({'error': 'Factura not found'}), 404
    filename = f"factura_{upload.numero_factura or upload.id}.pdf"
    return send_file(BytesIO(upload.file), download_name=filename, as_attachment=True)

@app.route("/medicina", methods=['GET'])
def medicina():
    drogueria = request.args.get('drogueria')
    query = Medicina.query
    if drogueria:
        query = query.join(Recipe, Medicina.id_factura == Recipe.id).filter(Recipe.drogueria == drogueria)
    medicinas = query.all()
    response = list(map(lambda x: x.serialize(), medicinas))
    return jsonify(response)

@app.route("/medicina/<idFactura>", methods=['GET'])
def medicinaPorFactura(idFactura):
    medicinas = Medicina.query.filter_by(id_factura=idFactura).all()
    response = list(map(lambda x: x.serialize(), medicinas))
    return jsonify(response)

@app.route("/medicina/<idFactura>", methods=['POST'])
def addMedicina(idFactura):
    data = Recipe.query.filter_by(id=idFactura).first()
    if not data:
        return jsonify({'error': 'Factura not found'}), 404
    if Medicina.query.filter_by(id_factura=idFactura).first():
        return jsonify({'error': 'Esta factura ya fue procesada'}), 409
    medicinas = extraer_informacion_medicamentos(data.texto, data.file)
    if not medicinas:
        # Sin ítems no se guarda nada, así la factura queda disponible para
        # reintentar cuando se ajuste el extractor de ese formato.
        return jsonify({'error': 'No se encontraron medicamentos en la factura; revisá el formato del PDF'}), 422
    for medicina in medicinas:
        medicina = Medicina(
            id_factura=idFactura,
            cantidad=medicina.get('cantidad'),
            codigo=medicina.get('codigo'),
            descripcion=medicina.get('descripcion'),
            bulto=medicina.get('bulto'),
            lote=medicina.get('lote'),
            exp=medicina.get('exp'),
            ALIC=medicina.get('ALIC'),
            PRECIO_BS=medicina.get('PRECIO_BS'),
            PRECIO_USD=medicina.get('PRECIO_USD'),
            DC=medicina.get('DC'),
            DD=medicina.get('DD'),
            DL=medicina.get('DL'),
            DV=medicina.get('DV'),
            Neto_Bs=medicina.get('Neto Bs'),
            Neto_USD=medicina.get('Neto USD'),
            TOT_NETO_Bs=medicina.get('TOT. NETO Bs'),
            TOT_NETO_USD=medicina.get('TOT. NETO USD')
        )
        db.session.add(medicina)
    try:
        db.session.commit()
        return jsonify({"medicamentos": medicinas}), 201
    except Exception:
        db.session.rollback()
        return _error_interno('No se pudieron guardar los medicamentos')


def export_to_excel(model, filename, sheet_name):
    """Genera en memoria un Excel con los datos de la tabla y lo envía. Sin
    archivo temporal, así dos descargas simultáneas no se pisan."""
    data = [record.serialize() for record in model.query.all()]
    buffer = BytesIO()
    pd.DataFrame(data).to_excel(buffer, sheet_name=sheet_name, index=False, engine="openpyxl")
    buffer.seek(0)
    return send_file(
        buffer,
        as_attachment=True,
        download_name=filename,
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )

@app.route('/descargar/facturas')
def download_recipes():
    """Endpoint para descargar la tabla Recipe en formato Excel."""
    return export_to_excel(Recipe, "recipes.xlsx", "Recipes")


@app.route('/descargar/medicinas')
def download_medicinas():
    return export_to_excel(Medicina, "medicinas.xlsx", "Medicinas")

@app.route('/facturaurl', methods=['POST'])
def procesar_pdf():
    data = request.get_json(silent=True) or {}
    pdf_url = data.get("url")

    if not pdf_url:
        return jsonify({"error": "No se proporcionó una URL"}), 400

    es_valida, motivo = validar_url_publica(pdf_url)
    if not es_valida:
        return jsonify({"error": motivo}), 400

    try:
        response = requests.get(pdf_url, timeout=10, stream=True, allow_redirects=False)
    except requests.RequestException:
        app.logger.exception("Error descargando %s", pdf_url)
        return jsonify({"error": "No se pudo descargar el PDF"}), 502

    with response:
        if response.status_code != 200:
            return jsonify({"error": "No se pudo descargar el PDF"}), 400

        contenido = bytearray()
        for chunk in response.iter_content(chunk_size=8192):
            contenido += chunk
            if len(contenido) > TAMANO_MAXIMO_PDF:
                return jsonify({"error": "El PDF supera el tamaño máximo permitido (20 MB)"}), 400

    if not contenido.startswith(b"%PDF"):
        return jsonify({"error": "El contenido descargado no es un PDF válido"}), 400

    return _guardar_factura(bytes(contenido))
    
@app.route('/precio/<nombre>', methods=['GET'])
def precio(nombre):
    """Busca medicamentos por descripción y devuelve cada coincidencia con su
    factura (droguería, fecha, formato, tasa), de la más reciente a la más
    vieja, para que el frontend calcule el precio de venta con la misma regla
    que la vista "Precio por factura"."""
    # % y _ del texto buscado se tratan como literales, no como comodines.
    patron = nombre.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    resultados = (
        db.session.query(Medicina, Recipe)
        .outerjoin(Recipe, Medicina.id_factura == Recipe.id)
        .filter(Medicina.descripcion.ilike(f"%{patron}%", escape="\\"))
        .order_by(Recipe.id.desc(), Medicina.id)
        .limit(100)
        .all()
    )
    if not resultados:
        return jsonify({'error': 'Medicina not found'}), 404
    return jsonify({"precios": [
        {**med.serialize(), "factura": factura.serialize(include_texto=False) if factura else None}
        for med, factura in resultados
    ]})

if __name__ == '__main__':
    app.run(debug=os.getenv("FLASK_DEBUG") == "1")