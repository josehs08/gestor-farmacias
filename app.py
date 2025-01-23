from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from io import BytesIO
import os
from src.back.utils import extract_text_from_pdf, extraer_datos

app = Flask(__name__)
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///project.db"
db = SQLAlchemy(app)
CORS(app)

class Recipe(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String, nullable=False)
    file = db.Column(db.LargeBinary, nullable=False)

    def serialize(self):
        return {
            'id': self.id,
            'name': self.name
        }
    
class Medicina(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    cantidad = db.Column(db.Integer, nullable=False)
    codigo = db.Column(db.String, nullable=False)
    descripcion = db.Column(db.String, nullable=False)
    bulto = db.Column(db.Integer, nullable=False)
    lote = db.Column(db.String, nullable=False)
    exp = db.Column(db.String, nullable=False)
    ALIC = db.Column(db.String, nullable=False)
    PRECIO_BS = db.Column(db.String, nullable=False)
    DC = db.Column(db.Integer, nullable=False)
    DD = db.Column(db.Integer, nullable=False)
    DL = db.Column(db.Integer, nullable=False)
    DV = db.Column(db.Integer, nullable=False)
    Neto_Bs = db.Column(db.String, nullable=False)
    Neto_USD = db.Column(db.String, nullable=False)
    TOT_NETO_Bs = db.Column(db.String, nullable=False)
    TOT_NETO_USD = db.Column(db.String, nullable=False)

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
        
with app.app_context():
    db.create_all()
    db.session.commit()

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
    name = datetime.now().strftime('%Y%m%d%H%M%S') + ".pdf"
    recipe = Recipe(name=name, file=file.read())
    try:
        db.session.add(recipe)
        db.session.commit()
        return jsonify({'id': recipe.id, 'name': recipe.name})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)})
    finally:
        db.session.close()

@app.route('/factura/<upload_id>')
def download(upload_id):
    upload = Recipe.query.filter_by(id=upload_id).first()
    return send_file(BytesIO(upload.file), download_name=upload.name, as_attachment=True)

@app.route('/factura_txt/<upload_id>')
def download_txt(upload_id):
    upload = Recipe.query.filter_by(id=upload_id).first()
    if not upload:
        return jsonify({'error': 'File not found'}), 404
    pdf_content = BytesIO(upload.file)
    txt_content = extract_text_from_pdf(pdf_content)
    return send_file(BytesIO(txt_content.encode('utf-8')), download_name=upload.name.replace('.pdf', '.txt'), as_attachment=True)

@app.route("/medicina")
def medicina():
    medicinas = Medicina.query.all()
    response = list(map(lambda x: x.serialize(), medicinas))
    return jsonify(response)

@app.route("/medicina/<upload_id>")
def medicina_upload(upload_id):
    upload = Recipe.query.filter_by(id=upload_id).first()
    if not upload:
        return jsonify({'error': 'File not found'}), 404
    pdf_content = BytesIO(upload.file)
    txt_content = extract_text_from_pdf(pdf_content)
    medicines = extraer_datos(txt_content)
    print(medicines)
    for medicine in medicines:
        med = Medicina(
            cantidad=medicine['cantidad'],
            codigo=medicine['codigo'],
            descripcion=medicine['descripcion'],
            bulto=medicine['bulto'],
            lote=medicine['lote'],
            exp=medicine['exp'],
            ALIC=medicine['ALIC'],
            PRECIO_BS=medicine['PRECIO_BS'],
            DC=medicine['DC'],
            DD=medicine['DD'],
            DL=medicine['DL'],
            DV=medicine['DV'],
            Neto_Bs=medicine['Neto Bs'],
            Neto_USD=medicine['Neto USD'],
            TOT_NETO_Bs=medicine['TOT. NETO Bs'],
            TOT_NETO_USD=medicine['TOT. NETO USD']
        )
        db.session.add(med)
    try:
        db.session.commit()
        return jsonify({'message': medicines})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)})



if __name__ == '__main__':
    app.run(debug=True)