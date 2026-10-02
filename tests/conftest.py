import os

# Must be set before `app` is imported: the module creates the engine and
# tables at import time, and load_dotenv() does not override existing vars.
os.environ["DATABASE_URL"] = "sqlite://"
