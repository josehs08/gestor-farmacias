from flask import Flask, request, jsonify
from flask_cors import CORS
from src.back.utils import extract_text_from_pdf
import os

app = Flask(__name__)
CORS(app)

@app.route("/")
def hello_world():
    return "<p>Hello, World!</p>"

@app.route("/factura", methods=['POST'])
def factura():
    try:
        file = request.files['file']
        text = extract_text_from_pdf(file)
        return jsonify({'text': text})
    except Exception as e:
        return jsonify({'error': str(e)})

if __name__ == '__main__':
    app.run(debug=True)