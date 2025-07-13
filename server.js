const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const https = require('https');
require('dotenv').config();

// Importar módulos personalizados
const { initializeDB, closeDB } = require('./config/db');
const authRoutes = require('./routes/auth');
const indexRoutes = require('./routes/index');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de middlewares de seguridad
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https:"],
            fontSrc: ["'self'", "https://cdnjs.cloudflare.com"]
        }
    }
}));

app.use(cors({
    origin: [`http://localhost:${PORT}`, `https://localhost:${PORT}`],
    credentials: true
}));

app.use(morgan('combined'));

// Configuración de middlewares de Express
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Configuración de sesiones
app.use(session({
    secret: process.env.SESSION_SECRET || 'fallback-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
		secure: false,
        httpOnly: true,
        maxAge: parseInt(process.env.SESSION_MAX_AGE) || 3600000 // 1 hora
    }
}));

// Configuración de archivos estáticos
app.use('/public', express.static(path.join(__dirname, 'public')));

// Middleware para prevenir acceso a rutas sin autenticación
app.use((req, res, next) => {
    const publicPaths = ['/login', '/auth/login', '/public/', '/favicon.ico'];
    const isPublicPath = publicPaths.some(path => req.path.startsWith(path));
    
    if (!isPublicPath && !req.session.user) {
        return res.redirect('/login');
    }
    
    next();
});

// Configuración de rutas
app.use('/auth', authRoutes);
app.use('/', indexRoutes);

// Ruta para servir login.html
app.get('/login', (req, res) => {
    if (req.session.user) {
        return res.redirect('/dashboard');
    }
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

// Ruta para dashboard según rol
app.get('/dashboard', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    
    const role = req.session.user.role;
    let dashboardFile;
    
    switch (role) {
        case 'ADMIN':
            dashboardFile = 'dashboard-admin.html';
            break;
        case 'EMPLEADO':
            dashboardFile = 'dashboard-empleados.html';
            break;
        case 'CAJERO':
            dashboardFile = 'dashboard-cajero.html';
            break;
        default:
            return res.redirect('/login');
    }
    
    res.sendFile(path.join(__dirname, 'views', dashboardFile));
});

// Ruta para logout
app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error al cerrar sesión:', err);
        }
        res.redirect('/login');
    });
});

// Manejo de errores 404
app.use((req, res) => {
    res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Página no encontrada</title>
            <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                h1 { color: #e74c3c; }
            </style>
        </head>
        <body>
            <h1>404 - Página no encontrada</h1>
            <p>La página que buscas no existe.</p>
            <a href="/login">Ir al login</a>
        </body>
        </html>
    `);
});

// Manejo de errores generales
app.use((err, req, res, next) => {
    console.error('Error del servidor:', err.stack);
    res.status(500).send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Error del servidor</title>
            <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                h1 { color: #e74c3c; }
            </style>
        </head>
        <body>
            <h1>500 - Error interno del servidor</h1>
            <p>Ha ocurrido un error interno. Por favor, intenta nuevamente.</p>
            <a href="/login">Ir al login</a>
        </body>
        </html>
    `);
});

// Función para inicializar el servidor
async function startServer() {
    try {
        // Inicializar la base de datos
        await initializeDB();
        
        // Intentar usar HTTPS si los certificados están disponibles
        if (process.env.SSL_CERT_PATH && process.env.SSL_KEY_PATH) {
            try {
                const options = {
                    key: fs.readFileSync(process.env.SSL_KEY_PATH),
                    cert: fs.readFileSync(process.env.SSL_CERT_PATH)
                };
                
                const httpsServer = https.createServer(options, app);
                httpsServer.listen(PORT, () => {
                    console.log(` Servidor HTTPS ejecutándose en https://localhost:${PORT}`);
                    console.log(` Certificados SSL cargados correctamente`);
                });
            } catch (sslError) {
                console.warn(' No se pudieron cargar los certificados SSL, usando HTTP');
                startHttpServer();
            }
        } else {
            startHttpServer();
        }
        
    } catch (error) {
        console.error(' Error iniciando el servidor:', error);
        process.exit(1);
    }
}

// Función para iniciar servidor HTTP
function startHttpServer() {
    app.listen(PORT, () => {
        console.log(` Servidor HTTP ejecutándose en http://localhost:${PORT}`);
        console.log(` Entorno: ${process.env.NODE_ENV || 'development'}`);
        console.log(` Base de datos: Oracle Database 19c`);
    });
}

// Manejo de cierre del servidor
process.on('SIGINT', async () => {
    console.log('\n⏹️ Cerrando servidor...');
    await closeDB();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n⏹ Cerrando servidor...');
    await closeDB();
    process.exit(0);
});

// Iniciar el servidor
startServer();
