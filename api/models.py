import os
import pymysql
from pymysql.cursors import DictCursor

# Read MySQL configuration from environment variables (set in your system or .env)
MYSQL_HOST = os.environ.get('MYSQL_HOST', '127.0.0.1')   # <-- aquí SIEMPRE va 'localhost'
MYSQL_PORT = int(os.environ.get('MYSQL_PORT', 3307))  # <-- aquí SIEMPRE va 3307
MYSQL_USER = os.environ.get('MYSQL_USER', 'root')
MYSQL_PASSWORD = os.environ.get('MYSQL_PASSWORD', '12345678')
MYSQL_DB = os.environ.get('MYSQL_DB', 'bdclientes')


def get_connection():
    """Return a new pymysql connection using configured env vars."""
    conn = pymysql.connect(
        host=MYSQL_HOST,
        port=MYSQL_PORT,
        user=MYSQL_USER,
        password=MYSQL_PASSWORD,
        db=MYSQL_DB,
        cursorclass=DictCursor,
        autocommit=True,
        charset='utf8mb4'
    )
    return conn


def ensure_users_table():
    """Create a `usuarios` table if it doesn't exist and insert a demo user."""
    create_sql = (
        "CREATE TABLE IF NOT EXISTS usuarios ("
        "id_usuarios INT AUTO_INCREMENT PRIMARY KEY, "
        "usuario VARCHAR(50) NOT NULL, "
        "password VARCHAR(100) NOT NULL"
        ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;"
    )
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(create_sql)
            cur.execute("SELECT COUNT(*) as c FROM usuarios WHERE usuario=%s", ('cesia',))
            row = cur.fetchone()
            if row and row['c'] == 0:
                cur.execute("INSERT INTO usuarios (usuario, password) VALUES (%s, %s)", ('cesia', '54321'))
    finally:
        conn.close()


def row_to_cliente(row):
    """Map DB row to a JSON-ready dict using your column names."""
    if not row:
        return None
    return {
        'id_clientes': row.get('id_clientes'),
        'dni_ruc': row.get('dni_ruc'),
        'nombre_completo': row.get('nombre_completo'),
        'telefono': row.get('telefono'),
        'correo': row.get('correo'),
        'direccion': row.get('direccion'),
        'estado': row.get('estado')
    }