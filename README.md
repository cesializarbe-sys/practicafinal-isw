# CRUD Clientes - Práctica Final ISW

## 📋 Descripción del Proyecto

Este es un sistema completo de **gestión de clientes** (CRUD - Create, Read, Update, Delete) desarrollado como práctica final de **Ingeniería de Software**. El proyecto implementa una arquitectura de **tres capas**:

1. **Frontend**: Aplicación Node.js con Express que sirve la interfaz web
2. **Backend**: API REST en Python con Flask
3. **Base de Datos**: MySQL para almacenamiento de datos

---

## 🏗️ Arquitectura del Proyecto

```
practicafinal-isw/
├── api/                    # Backend (Python + Flask)
│   ├── app.py             # Servidor principal Flask
│   ├── models.py          # Conexión a BD y utilidades
│   └── __pycache__/       # Archivos compilados Python
│
├── frontend/              # Frontend (Node.js + Express)
│   ├── app.js            # Servidor frontend y proxy
│   ├── package.json      # Dependencias Node.js
│   └── public/           # Archivos estáticos (HTML, CSS, JS)
│       ├── login.html    # Página de inicio de sesión
│       ├── clientes.html # Página de gestión de clientes
│       ├── crud.js       # Lógica del cliente para CRUD
│       └── estilos.css   # Estilos de la aplicación
│
├── CRUD-clientes/        # Documentación adicional
│   └── README.md
│
└── package.json          # Dependencias del proyecto raíz
```

---

## 🔧 Cómo Funciona

### Flujo de Autenticación

```
Usuario escribe credenciales en login.html
        ↓
crud.js envía POST a /login (frontend)
        ↓
app.js (frontend) proxy a http://127.0.0.1:5000/api/login (backend)
        ↓
app.py (backend) valida contra BD MySQL
        ↓
Si es correcto: Crea sesión en el frontend
Si es incorrecto: Retorna error 401
```

### Flujo de Operaciones CRUD

```
Usuario interactúa con clientes.html
        ↓
crud.js envía request (GET/POST/PUT/DELETE) a /api/clientes/* (frontend)
        ↓
app.js (frontend) verifica autenticación
        ↓
app.js (frontend) proxy a backend (http://127.0.0.1:5000/api/...)
        ↓
app.py (backend) procesa la solicitud contra BD MySQL
        ↓
Retorna JSON con resultado al frontend
        ↓
crud.js actualiza la interfaz
```

---

## 📊 Base de Datos

### Tabla: `usuarios`
Almacena los usuarios del sistema:

```sql
CREATE TABLE usuarios (
    id_usuarios INT AUTO_INCREMENT PRIMARY KEY,
    usuario VARCHAR(50) NOT NULL,
    password VARCHAR(100) NOT NULL
);
```

**Usuario de demo:**
- Usuario: `cesia`
- Contraseña: `54321`

### Tabla: `clientes`
Almacena la información de los clientes:

```sql
CREATE TABLE clientes (
    id_clientes INT AUTO_INCREMENT PRIMARY KEY,
    dni_ruc VARCHAR(20) NOT NULL,
    nombre_completo VARCHAR(100) NOT NULL,
    telefono VARCHAR(20),
    correo VARCHAR(100),
    direccion VARCHAR(200),
    estado VARCHAR(20)
);
```

---

## 🚀 Requisitos Previos

Asegúrate de tener instalado:

- **Python 3.8+** con pip
- **Node.js 16+** con npm
- **MySQL Server** (puerto 3307)

---

## ⚙️ Instalación y Configuración

### 1. Configurar Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto (o configura en tu sistema):

```bash
# Variables para la BD MySQL
MYSQL_HOST=localhost
MYSQL_PORT=3307
MYSQL_USER=root
MYSQL_PASSWORD=12345678
MYSQL_DB=bdClientes

# Variable para el backend (opcional)
SESSION_SECRET=tu_clave_secreta_aqui
```

**En Windows (PowerShell):**
```powershell
$env:MYSQL_HOST = "localhost"
$env:MYSQL_PORT = "3307"
$env:MYSQL_USER = "root"
$env:MYSQL_PASSWORD = "12345678"
$env:MYSQL_DB = "bdClientes"
```

### 2. Instalar Dependencias del Backend (Python)

```bash
cd api
pip install flask flask-cors pymysql python-dotenv
```

### 3. Instalar Dependencias del Frontend (Node.js)

```bash
cd frontend
npm install express express-session node-fetch
```

---

## 🖥️ Ejecutar la Aplicación

### En Terminal 1: Iniciar Backend (Python)

```bash
cd api
python app.py
```

Deberías ver:
```
WARNING in app.run(): Serving Flask app "app" in development mode...
Running on http://127.0.0.1:5000/
```

### En Terminal 2: Iniciar Frontend (Node.js)

```bash
cd frontend
node app.js
```

Deberías ver:
```
Frontend server running http://localhost:3000
```

### Acceder a la Aplicación

Abre tu navegador y ve a:
```
http://localhost:3000
```

Te llevará automáticamente a:
```
http://localhost:3000/login.html
```

---

## 🐛 Solución del Error: "SyntaxError: Unexpected token < in JSON"

### ¿Qué Causaba el Error?

Este error ocurría cuando el frontend intentaba parsear una respuesta JSON pero recibía HTML en su lugar. Las causas comunes eran:

1. **Backend no estaba ejecutándose** → Flask devolvía una página de error 502
2. **Conexión a MySQL fallaba** → Flask devolvía error HTML en lugar de JSON
3. **El endpoint no existía** → Flask devolvía error 404 HTML

### ✅ Solución Implementada

Se modificó `frontend/app.js` para:

1. **Leer la respuesta como texto primero** (usando `.text()` en lugar de `.json()`)
2. **Intentar parsear como JSON** con manejo de excepciones
3. **Si falla el parseo**, mostrar los primeros 200 caracteres de la respuesta para debugging
4. **Devolver error 502 descriptivo** en lugar de un crash

**Cambios en `/login` endpoint:**

```javascript
// ANTES: Fallaba silenciosamente
const data = await r.json();

// DESPUÉS: Maneja errores de parseo
const text = await r.text();
let data;
try {
  data = JSON.parse(text);
} catch (parseErr) {
  console.error('Backend returned non-JSON response:', text.substring(0, 200));
  return res.status(502).json({ ok: false, error: 'Backend returned invalid response. Check backend server.' });
}
```

### 📝 Checklist para Evitar Este Error

- ✅ Verifica que MySQL esté corriendo en puerto 3307
- ✅ Verifica las credenciales en `models.py` coincidan con tu MySQL
- ✅ Ejecuta backend primero: `python api/app.py`
- ✅ Ejecuta frontend después: `node frontend/app.js`
- ✅ Abre `http://localhost:3000` (no `http://127.0.0.1:3000`)
- ✅ Revisa la consola del backend para errores MySQL
- ✅ Revisa la consola del frontend para logs detallados

---

## 📋 Endpoints de la API

### Autenticación

| Método | URL | Descripción |
|--------|-----|-------------|
| POST | `/login` | Autentica un usuario |
| GET | `/logout` | Cierra la sesión |
| GET | `/api/session` | Obtiene info de sesión actual |

### Clientes (Require Autenticación)

| Método | URL | Descripción |
|--------|-----|-------------|
| GET | `/api/clientes` | Lista todos los clientes |
| POST | `/api/clientes` | Crea un nuevo cliente |
| PUT | `/api/clientes/:id` | Actualiza un cliente |
| DELETE | `/api/clientes/:id` | Elimina un cliente |

---

## 📝 Estructura de Datos JSON

### Request de Login

```json
{
  "usuario": "cesia",
  "password": "54321"
}
```

### Response de Login (Exitoso)

```json
{
  "ok": true,
  "user": {
    "id_usuarios": 1,
    "usuario": "cesia"
  }
}
```

### Request de Cliente (POST/PUT)

```json
{
  "dni_ruc": "12345678",
  "nombre_completo": "Juan Pérez",
  "telefono": "555-1234",
  "correo": "juan@example.com",
  "direccion": "Calle Principal 123",
  "estado": "activo"
}
```

### Response de Clientes (GET)

```json
{
  "ok": true,
  "clientes": [
    {
      "id_clientes": 1,
      "dni_ruc": "12345678",
      "nombre_completo": "Juan Pérez",
      "telefono": "555-1234",
      "correo": "juan@example.com",
      "direccion": "Calle Principal 123",
      "estado": "activo"
    }
  ]
}
```

---

## 🔐 Seguridad

### Puntos Implementados

- ✅ **Autenticación de sesión**: Express-session almacena usuario autenticado
- ✅ **Protección de rutas**: `/api/clientes/*` require autenticación (`requireAuth`)
- ✅ **CORS configurado**: Flask-CORS permite comunicación frontend-backend
- ✅ **Content-Security-Policy**: Headers de seguridad en desarrollo
- ✅ **Validación básica**: Backend valida usuario y contraseña

### ⚠️ Mejoras Recomendadas para Producción

- Implementar **hashing de contraseñas** (bcrypt)
- Usar **JWT** en lugar de sesiones
- Configurar **HTTPS**
- Implementar **rate limiting**
- Validar y sanitizar inputs más rigurosos
- Usar **variables de entorno** para credenciales sensibles

---

## 🛠️ Troubleshooting

### Error: "Backend unavailable or misconfigured API_BASE"

**Solución:**
```bash
# Terminal 1: Inicia backend
cd api
python app.py

# Verifica que ejecute en http://127.0.0.1:5000
```

### Error: "No database selected"

**Solución:**
```bash
# Verifica que la BD exista en MySQL
mysql -u root -p
> CREATE DATABASE bdClientes;
```

### Error: "Access denied for user 'root'@'localhost'"

**Solución:**
Actualiza las credenciales en `api/models.py`:
```python
MYSQL_USER = os.environ.get('MYSQL_USER', 'tu_usuario')
MYSQL_PASSWORD = os.environ.get('MYSQL_PASSWORD', 'tu_contraseña')
```

### Error: "Connection refused port 3307"

**Solución:**
```bash
# Verifica que MySQL esté corriendo en puerto 3307
# En Windows, busca "MySQL" en servicios de Windows
# O reinicia: net stop MySQL80 && net start MySQL80
```

---

## 📚 Tecnologías Utilizadas

- **Frontend**: Express.js, Node.js, HTML5, CSS3, Vanilla JavaScript
- **Backend**: Flask, Python 3
- **Base de Datos**: MySQL
- **Autenticación**: Express-session
- **CORS**: Flask-CORS
- **HTTP Client**: node-fetch

---

## 👤 Autor

Cesia Lizarbe - Práctica Final ISW

---

## 📄 Licencia

Este proyecto es parte de una práctica educativa de Ingeniería de Software.

---

## 🎯 Conclusión

Este proyecto demuestra:

1. **Integración de capas**: Frontend ↔ Backend ↔ BD
2. **Patrones de diseño**: MVC, Proxy pattern
3. **Manejo de errores**: Try-catch, validación de datos
4. **Seguridad básica**: Autenticación, sesiones
5. **Mejores prácticas**: Separación de responsabilidades, código limpio

El error de JSON se resolvió implementando mejor manejo de respuestas y validación antes de parsear, lo que es una práctica esencial en desarrollo web real.
