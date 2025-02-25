import pandas as pd
from app import db, Medicina, app
# Cargar el archivo Excel
archivo_excel = "Precio.xlsx"  # Cambia esto por la ruta real
df = pd.read_excel(archivo_excel)

# Renombrar columnas para que coincidan con el modelo
df.rename(columns={"Descripcion": "descripcion"}, inplace=True)


# Verifica que las columnas necesarias existan
columnas_necesarias = {"descripcion"}
if not columnas_necesarias.issubset(df.columns):
    raise ValueError("El archivo Excel no tiene las columnas necesarias.")

# Insertar los datos en la base de datos
with app.app_context():
    for _, row in df.iterrows():
        medicina = Medicina(
            descripcion=row["descripcion"],
        )
        db.session.add(medicina)

# Confirmar los cambios en la base de datos
    db.session.commit()

print("Datos insertados correctamente.")
