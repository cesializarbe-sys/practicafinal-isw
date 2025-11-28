from flask import Flask, request, jsonify
from flask_cors import CORS
import models  # asegúrate de tener models.py con las funciones get_connection(), ensure_users_table(), row_to_cliente()
import pymysql

app = Flask(__name__)
CORS(app)

# Asegura que la tabla de usuarios exista al inicio
models.ensure_users_table()


def query_all_clientes():
    conn = models.get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM clientes")
            rows = cur.fetchall()
            return [models.row_to_cliente(r) for r in rows]
    finally:
        conn.close()


@app.route('/api/login', methods=['POST'])
def login():
    data = request.json or {}
    usuario = data.get('usuario') or data.get('username')
    password = data.get('password')
    if not usuario or not password:
        return jsonify({'ok': False, 'error': 'Usuario y contraseña requeridos'}), 400

    conn = models.get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM usuarios WHERE usuario=%s", (usuario,))
            user = cur.fetchone()
            if not user or user.get('password') != password:
                return jsonify({'ok': False, 'error': 'Credenciales inválidas'}), 401
            return jsonify({'ok': True, 'user': {'id_usuarios': user.get('id_usuarios'), 'usuario': user.get('usuario')}})
    finally:
        conn.close()


@app.route('/api/clientes', methods=['GET'])
def get_clientes():
    try:
        clientes = query_all_clientes()
        return jsonify({'ok': True, 'clientes': clientes})
    except Exception as e:
        return jsonify({'ok': False, 'error': str(e)}), 500


@app.route('/api/clientes/check', methods=['GET'])
def check_dni():
    # check existence of dni_ruc. optional query param id to exclude that id (for updates)
    dni = request.args.get('dni_ruc') or request.args.get('dni')
    if not dni:
        return jsonify({'ok': False, 'error': 'dni_ruc query param required'}), 400
    exclude_id = request.args.get('id')
    conn = models.get_connection()
    try:
        with conn.cursor() as cur:
            if exclude_id:
                cur.execute('SELECT COUNT(*) as c FROM clientes WHERE dni_ruc=%s AND id_clientes<>%s', (dni, exclude_id))
            else:
                cur.execute('SELECT COUNT(*) as c FROM clientes WHERE dni_ruc=%s', (dni,))
            row = cur.fetchone()
            exists = bool(row and row.get('c', 0) > 0)
            return jsonify({'ok': True, 'exists': exists})
    finally:
        conn.close()


@app.route('/api/clientes', methods=['POST'])
def create_cliente():
    data = request.json or {}
    required = ['dni_ruc', 'nombre_completo']
    for f in required:
        if not data.get(f):
            return jsonify({'ok': False, 'error': f'{f} required'}), 400

    sql = """
    INSERT INTO clientes (dni_ruc, nombre_completo, telefono, correo, direccion, estado)
    VALUES (%s,%s,%s,%s,%s,%s)
    """
    conn = models.get_connection()
    try:
        with conn.cursor() as cur:
            # pre-check: si ya existe dni_ruc evite intentar insertar
            cur.execute("SELECT COUNT(*) as c FROM clientes WHERE dni_ruc=%s", (data.get('dni_ruc'),))
            rowc = cur.fetchone()
            if rowc and rowc.get('c', 0) > 0:
                return jsonify({'ok': False, 'error': 'duplicate', 'message': 'El DNI/RUC ya está registrado. Por favor utiliza uno diferente.'}), 409
            try:
                cur.execute(sql, (
                    data.get('dni_ruc'), data.get('nombre_completo'), data.get('telefono'),
                    data.get('correo'), data.get('direccion'), data.get('estado', 'Activo')
                ))
            except pymysql.IntegrityError:
                # Fallback: unique constraint raised despite pre-check
                return jsonify({'ok': False, 'error': 'duplicate', 'message': 'El DNI/RUC ya está registrado. Por favor utiliza uno diferente.'}), 409
            nid = cur.lastrowid
            cur.execute("SELECT * FROM clientes WHERE id_clientes=%s", (nid,))
            row = cur.fetchone()
            return jsonify({'ok': True, 'cliente': models.row_to_cliente(row)})
    finally:
        conn.close()


@app.route('/api/clientes/<int:cid>', methods=['PUT'])
def update_cliente(cid):
    data = request.json or {}
    fields = ['dni_ruc', 'nombre_completo', 'telefono', 'correo', 'direccion', 'estado']
    set_clause = ','.join([f"{f}=%s" for f in fields if f in data])
    if not set_clause:
        return jsonify({'ok': False, 'error': 'No fields to update'}), 400

    values = [data[f] for f in fields if f in data]
    values.append(cid)
    sql = f"UPDATE clientes SET {set_clause} WHERE id_clientes=%s"
    conn = models.get_connection()
    try:
        with conn.cursor() as cur:
            # if dni_ruc is being updated, ensure it doesn't collide with other records
            if 'dni_ruc' in data:
                cur.execute('SELECT COUNT(*) as c FROM clientes WHERE dni_ruc=%s AND id_clientes<>%s', (data.get('dni_ruc'), cid))
                rc = cur.fetchone()
                if rc and rc.get('c', 0) > 0:
                    return jsonify({'ok': False, 'error': 'duplicate', 'message': 'El DNI/RUC ya está registrado. Por favor utiliza uno diferente.'}), 409
            try:
                cur.execute(sql, values)
            except pymysql.IntegrityError:
                return jsonify({'ok': False, 'error': 'duplicate', 'message': 'El DNI/RUC ya está registrado. Por favor utiliza uno diferente.'}), 409
            cur.execute("SELECT * FROM clientes WHERE id_clientes=%s", (cid,))
            row = cur.fetchone()
            return jsonify({'ok': True, 'cliente': models.row_to_cliente(row) if row else None})
    finally:
        conn.close()


@app.route('/api/clientes/<int:cid>', methods=['DELETE'])
def delete_cliente(cid):
    conn = models.get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM clientes WHERE id_clientes=%s", (cid,))
            return jsonify({'ok': True})
    finally:
        conn.close()


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)