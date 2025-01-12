from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from datetime import datetime
from src.back.models import Recipe, SessionLocal, Base, engine
from io import BytesIO
import os

app = Flask(__name__)
CORS(app)

# Crear todas las tablas
Base.metadata.create_all(bind=engine)

@app.route("/")
def hello_world():
    return "<p>Hello, World!</p>"

@app.route("/factura", methods=['POST'])
def factura():
    session = SessionLocal()
    file = request.files['file']
    name = datetime.now().strftime('%Y%m%d') + ".pdf"
    recipe = Recipe(name=name, file=file.read())
    try:
        session.add(recipe)
        session.commit()
        return jsonify({'id': recipe.id, 'name': recipe.name})
    except Exception as e:
        session.rollback()
        return jsonify({'error': str(e)})
    finally:
        session.close()

@app.route('/download/<upload_id>')
def download(upload_id):
    session = SessionLocal()
    upload = session.query(Recipe).filter_by(id=upload_id).first()
    return send_file(BytesIO(upload.file), 
                     download_name=upload.name, as_attachment=True)

if __name__ == '__main__':
    app.run(debug=True)