const express = require('express');
const { validateUser } = require('../config/db');
const router = express.Router();

// Contador de intentos de login por IP
const loginAttempts = new Map();

// Middleware para limitar intentos de login
function limitLoginAttempts(req, res, next) {
    const ip = req.ip;
    const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5;
    const lockoutTime = parseInt(process.env.LOCKOUT_TIME) || 900000; // 15 minutos
    
    const attempts = loginAttempts.get(ip) || { count: 0, lastAttempt: 0 };
    
    // Verificar si está en periodo de bloqueo
    if (attempts.count >= maxAttempts) {
        const timeSinceLastAttempt = Date.now() - attempts.lastAttempt;
        if (timeSinceLastAttempt < lockoutTime) {
            const remainingTime = Math.ceil((lockoutTime - timeSinceLastAttempt) / 60000);
            return res.status(429).json({
                success: false,
                message: `Demasiados intentos fallidos. Intenta nuevamente en ${remainingTime} minutos.`
            });
        } else {
            // Resetear contador si ha pasado el tiempo de bloqueo
            loginAttempts.delete(ip);
        }
    }
    
    next();
}

// Función para determinar la URL de redirección según el rol
function getRedirectUrl(role) {
    return '/dashboard';
}


// Ruta para procesar login
router.post('/login', limitLoginAttempts, async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // Validar datos de entrada
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Usuario y contraseña son requeridos'
            });
        }
        
        // Validar credenciales en la base de datos
        const user = await validateUser(username, password);
        
        if (user) {
            // Login exitoso
            req.session.user = {
                username: user.username,
                role: user.role,
                loginTime: new Date(),
                tablespace: user.tablespace
            };
            
            // Limpiar intentos fallidos
            loginAttempts.delete(req.ip);
            
            console.log(`✅ Login exitoso - Usuario: ${user.username}, Rol: ${user.role}`);
            
            // Obtener URL de redirección según el rol
            const redirectUrl = getRedirectUrl(user.role);
            
            res.json({
                success: true,
                message: 'Login exitoso',
                user: {
                    username: user.username,
                    role: user.role
                },
                redirectUrl: redirectUrl
            });
        } else {
            // Login fallido
            const ip = req.ip;
            const attempts = loginAttempts.get(ip) || { count: 0, lastAttempt: 0 };
            attempts.count++;
            attempts.lastAttempt = Date.now();
            loginAttempts.set(ip, attempts);
            
            console.log(`❌ Login fallido - Usuario: ${username}, IP: ${ip}, Intentos: ${attempts.count}`);
            
            res.status(401).json({
                success: false,
                message: 'Credenciales incorrectas'
            });
        }
    } catch (error) {
        console.error('❌ Error en login:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// Ruta para verificar sesión
router.get('/verify', (req, res) => {
    if (req.session.user) {
        res.json({
            success: true,
            user: {
                username: req.session.user.username,
                role: req.session.user.role,
                loginTime: req.session.user.loginTime
            }
        });
    } else {
        res.status(401).json({
            success: false,
            message: 'No hay sesión activa'
        });
    }
});

// Ruta para logout
router.post('/logout', (req, res) => {
    const username = req.session.user ? req.session.user.username : 'Unknown';
    
    req.session.destroy((err) => {
        if (err) {
            console.error('❌ Error al cerrar sesión:', err);
            res.status(500).json({
                success: false,
                message: 'Error al cerrar sesión'
            });
        } else {
            console.log(`✅ Logout exitoso - Usuario: ${username}`);
            res.json({
                success: true,
                message: 'Sesión cerrada exitosamente'
            });
        }
    });
});

module.exports = router;