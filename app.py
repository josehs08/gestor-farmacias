from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from sqlalchemy.orm import sessionmaker
from io import BytesIO
import os
from src.back.utils import extraer_datos_factura_pdf, extraer_informacion_medicamentos, extraer_texto_pdf
from flask_admin import Admin
from flask_admin.contrib.sqla import ModelView
from dotenv import load_dotenv
import pandas as pd
import requests

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.getenv('FLASK_KEY') 
db = SQLAlchemy(app)

CORS(app)

class Recipe(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    numero_factura = db.Column(db.String, nullable=True)
    fecha = db.Column(db.String, nullable=True)
    tipo_de_cambio = db.Column(db.String, nullable=True)
    file = db.Column(db.LargeBinary, nullable=False)
    texto = db.Column(db.String, nullable=True)

    def serialize(self):
        return {
            'id': self.id,
            'numero_factura': self.numero_factura,
            'fecha': self.fecha,
            'tipo_de_cambio': self.tipo_de_cambio,
            'texto': self.texto
        }
    
class Medicina(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    cantidad = db.Column(db.Integer, nullable=True)
    codigo = db.Column(db.String, nullable=True)
    descripcion = db.Column(db.String, nullable=True)
    bulto = db.Column(db.Integer, nullable=True)
    lote = db.Column(db.String, nullable=True)
    exp = db.Column(db.String, nullable=True)
    ALIC = db.Column(db.String, nullable=True)
    PRECIO_BS = db.Column(db.Float, nullable=True)
    DC = db.Column(db.Integer, nullable=True)
    DD = db.Column(db.Integer, nullable=True)
    DL = db.Column(db.Integer, nullable=True)
    DV = db.Column(db.Integer, nullable=True)
    Neto_Bs = db.Column(db.Float, nullable=True)
    Neto_USD = db.Column(db.Float, nullable=True)
    TOT_NETO_Bs = db.Column(db.Float, nullable=True)
    TOT_NETO_USD = db.Column(db.Float, nullable=True)

    def serialize(self):
        return {
            'id': self.id,
            'cantidad': self.cantidad,
            'codigo': self.codigo,
            'descripcion': self.descripcion,
            'bulto': self.bulto,
            'lote': self.lote,
            'exp': self.exp,
            'ALIC': self.ALIC,
            'PRECIO_BS': self.PRECIO_BS,
            'DC': self.DC,
            'DD': self.DD,
            'DL': self.DL,
            'DV': self.DV,
            'Neto_Bs': self.Neto_Bs,
            'Neto_USD': self.Neto_USD,
            'TOT_NETO_Bs': self.TOT_NETO_Bs,
            'TOT_NETO_USD': self.TOT_NETO_USD
        }
        
class Factura(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    numero = db.Column(db.String, nullable=False)
    fecha = db.Column(db.String, nullable=False)
    precio_dolar = db.Column(db.String, nullable=False)
    
with app.app_context():
    db.create_all()
    db.session.commit()

admin = Admin(app, name="Panel de Administración", template_mode="bootstrap4")
admin.add_view(ModelView(Recipe, db.session))
admin.add_view(ModelView(Medicina, db.session))

@app.route("/")
def hello_world():
    return "<p>Hello, World!</p>"

@app.route('/facturas', methods=['GET'])
def facturas():
    facturas = Recipe.query.all()
    data = list(map(lambda x: x.serialize(), facturas))
    return jsonify(data)

@app.route("/factura", methods=['POST'])
def factura():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    file_stream = BytesIO(file.read())
    extracted_data = extraer_datos_factura_pdf(file_stream)

    if not extracted_data:
        return jsonify({'error': 'No se pudo extraer información del PDF'}), 400

    numero_factura = extracted_data.get('numero_factura')
    fecha = extracted_data.get('fecha')
    tipo_de_cambio = extracted_data.get('tipo_de_cambio')
    texto = extracted_data.get('texto')

    # Crear instancia de la factura
    recipe = Recipe(
        numero_factura=numero_factura,
        fecha=fecha,
        tipo_de_cambio=tipo_de_cambio,
        texto=texto,
        file=file.read()  # Guardar el archivo en binario
    )

    try:
        db.session.add(recipe)
        db.session.commit()
        return jsonify({"factura": recipe.serialize()}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        db.session.close()


@app.route('/factura/<upload_id>', methods=['GET'])
def download(upload_id):
    upload = Recipe.query.filter_by(id=upload_id).first()
    return send_file(BytesIO(upload.file), download_name=upload.name, as_attachment=True)

@app.route("/medicina", methods=['GET'])
def medicina():
    medicinas = Medicina.query.all()
    response = list(map(lambda x: x.serialize(), medicinas))
    return jsonify(response)

@app.route("/medicina/<idFactura>", methods=['POST'])
def addMedicina(idFactura):
    data = Recipe.query.filter_by(id=idFactura).first()
    if not data:
        return jsonify({'error': 'Factura not found'}), 404
    medicinas = extraer_informacion_medicamentos(data.texto)
    for medicina in medicinas:
        print(medicina)
        medicina = Medicina(
            cantidad=medicina.get('cantidad'),
            codigo=medicina.get('codigo'),
            descripcion=medicina.get('descripcion'),
            bulto=medicina.get('bulto'),
            lote=medicina.get('lote'),
            exp=medicina.get('exp'),
            ALIC=medicina.get('ALIC'),
            PRECIO_BS=medicina.get('PRECIO_BS'),
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
        return jsonify({"medicamentos": list(map(lambda x: x, medicinas))}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 50
    
def export_to_excel(model, filename, sheet_name):
    """Genera un archivo Excel con los datos de la tabla especificada."""
    # Obtener los datos de la tabla
    records = model.query.all()
    data = [record.serialize() for record in records]

    # Convertir a DataFrame de Pandas
    df = pd.DataFrame(data)

    # Guardar en un archivo Excel temporal
    file_path = f"C:\\Users\\Public\\{filename}"
    df.to_excel(file_path, sheet_name=sheet_name, index=False, engine="openpyxl")

    return file_path

@app.route('/descargar/facturas')
def download_recipes():
    """Endpoint para descargar la tabla Recipe en formato Excel."""
    filename = "recipes.xlsx"
    file_path = export_to_excel(Recipe, filename, "Recipes")
    
    return send_file(
        file_path,
        as_attachment=True,  # Fuerza la descarga
        download_name=filename,  # Nombre visible en la descarga
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )


@app.route('/descargar/medicinas')
def download_medicinas():
    filename = "medicinas.xlsx"
    file_path = export_to_excel(Medicina, filename, "Medicinas")

    return send_file(
        file_path,
        as_attachment=True,  # Fuerza la descarga
        download_name=filename,  # Nombre visible en la descarga
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )

@app.route('/facturaurl', methods=['POST'])
def procesar_pdf():
    data = request.json
    pdf_url = data.get("url")

    if not pdf_url:
        return jsonify({"error": "No se proporcionó una URL"}), 400

    try:
        response = requests.get(pdf_url)
        if response.status_code != 200:
            return jsonify({"error": "No se pudo descargar el PDF"}), 400

        file_path = f"/tmp/pdf_procesado.pdf"
        with open(file_path, "wb") as f:
            f.write(response.content)

        return jsonify({"message": "PDF recibido correctamente", "file_path": file_path})

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@app.route('/precio/<nombre>', methods=['GET'])
def precio(nombre):
    data = Medicina.query.filter(Medicina.descripcion.like(f"%{nombre}%")).all()
    if not data:
        return jsonify({'error': 'Medicina not found'}), 404
    return jsonify({"precios": [{"descripcion": med.descripcion, "precio": med.PRECIO_BS} for med in data]})

if __name__ == '__main__':
    app.run(debug=True)