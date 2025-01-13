from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from io import BytesIO
import os

app = Flask(__name__)
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///project.db"
db = SQLAlchemy()
db.init_app(app)
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

@app.route("/")
def hello_world():
    return "<p>Hello, World!</p>"

@app.route("/factura", methods=['POST'])
def factura():
    file = request.files['file']
    name = datetime.now().strftime('%Y%m%d') + ".pdf"
    recipe = Recipe(name=name, file=file.read())
    try:
        db.add(recipe)
        db.commit()
        return jsonify({'id': recipe.id, 'name': recipe.name})
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)})
    finally:
        db.close()

@app.route('/facturas', methods=['GET'])
def facturas():
    facturas = Recipe.query.all()
    data = list(map(lambda x: x.serialize(), facturas))
    return jsonify(data)

@app.route('/download/<upload_id>')
def download(upload_id):
    upload = db.query(Recipe).filter_by(id=upload_id).first()
    return send_file(BytesIO(upload.file), 
                     download_name=upload.name, as_attachment=True)

if __name__ == '__main__':
    app.run(debug=True)