from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from io import BytesIO
import os
from src.back.utils import extract_text_from_pdf, extract_invoice_data

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

@app.route('/factura/<upload_id>')
def download(upload_id):
    upload = Recipe.query.filter_by(id=upload_id).first()
    return send_file(BytesIO(upload.file), 
                     download_name=upload.name, as_attachment=True)

@app.route('/factura_txt/<upload_id>')
def download_txt(upload_id):
    upload = Recipe.query.filter_by(id=upload_id).first()
    if not upload:
        return jsonify({'error': 'File not found'}), 404
    pdf_content = BytesIO(upload.file)
    txt_content = extract_text_from_pdf(pdf_content)
    return send_file(BytesIO(txt_content.encode('utf-8')), 
                     download_name=upload.name.replace('.pdf', '.txt'), as_attachment=True)

class Medication(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    invoice_id = db.Column(db.Integer, db.ForeignKey('recipe.id'), nullable=False)
    name = db.Column(db.String, nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    price = db.Column(db.Float, nullable=False)
    date = db.Column(db.DateTime, nullable=False)

    def serialize(self):
        return {
            'id': self.id,
            'invoice_id': self.invoice_id,
            'name': self.name,
            'quantity': self.quantity,
            'price': self.price,
            'date': self.date.strftime('%Y-%m-%d %H:%M:%S')
        }

@app.route('/factura/medicamentos/<upload_id>', methods=['POST'])
def add_medicamentos(upload_id):
    upload = Recipe.query.filter_by(id=upload_id).first()
    if not upload:
        return jsonify({'error': 'File not found'}), 404
    pdf_content = BytesIO(upload.file)
    invoice_data = extract_invoice_data(pdf_content)
    medications = []
    for med in invoice_data['medications']:
        medication = Medication(
            invoice_id=upload.id,
            name=med['name'],
            quantity=med['quantity'],
            price=med['price'],
            date=datetime.strptime(invoice_data['date'], '%Y-%m-%d')
        )
        medications.append(medication)
    try:
        db.session.bulk_save_objects(medications)
        db.session.commit()
        return jsonify({'message': 'Medications added successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)})
    finally:
        db.session.close()

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

if __name__ == '__main__':
    app.run(debug=True)