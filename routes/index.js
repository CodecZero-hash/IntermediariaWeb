const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Middleware para verificar autenticación
function requireAuth(req, res, next) {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    next();
}

// Middleware para verificar roles específicos
function requireRole(roles) {
    return (req, res, next) => {
        if (!req.session.user) {
            return res.redirect('/login');
        }
        
        const userRole = req.session.user.role.toLowerCase();
        const allowedRoles = roles.map(role => role.toLowerCase());
        
        if (!allowedRoles.includes(userRole)) {
            return res.status(403).send('Acceso denegado: No tienes permisos para acceder a esta página');
        }
        
        next();
    };
}

// Ruta principal - redirecciona al login
router.get('/', (req, res) => {
    res.redirect('/login');
});

// Servir página de login
router.get('/login', (req, res) => {
    // Si ya está autenticado, redirigir al dashboard correspondiente
    if (req.session.user) {
        const role = req.session.user.role.toLowerCase();
        switch(role) {
            case 'admin':
            case 'administrador':
                return res.redirect('/dashboard-admin');
            case 'empleado':
                return res.redirect('/dashboard-empleados');
            case 'cajero':
                return res.redirect('/dashboard-cajero');
            default:
                return res.redirect('/dashboard-empleados');
        }
    }
    res.sendFile('login.html', { root: './views' });
});

// Ruta genérica de dashboard que redirige según el rol
router.get('/dashboard', requireAuth, (req, res) => {
    const role = req.session.user.role.toLowerCase();
    switch(role) {
        case 'admin':
        case 'administrador':
            return res.redirect('/dashboard-admin');
        case 'empleado':
            return res.redirect('/dashboard-empleados');
        case 'cajero':
            return res.redirect('/dashboard-cajero');
        default:
            return res.redirect('/dashboard-empleados');
    }
});

// Servir dashboards según el rol
router.get('/dashboard-admin', requireRole(['admin', 'administrador']), (req, res) => {
    res.sendFile('dashboard-admin.html', { root: './views' });
});

router.get('/dashboard-empleados', requireRole(['empleado', 'admin', 'administrador']), (req, res) => {
    res.sendFile('dashboard-empleados.html', { root: './views' });
});

router.get('/dashboard-cajero', requireRole(['cajero', 'admin', 'administrador']), (req, res) => {
    res.sendFile('dashboard-cajero.html', { root: './views' });
});

// API para obtener clientes
router.get('/api/clientes', requireAuth, async (req, res) => {
    try {
        const connection = await db.getConnection();
        const result = await connection.execute(
            `SELECT ID_CLIENTE, NOMBRE, APELLIDO, CEDULA, CORREO, CELULAR, 
                    TO_CHAR(FECHA_NACIMIENTO, 'DD/MM/YYYY') as FECHA_NACIMIENTO,
                    INGRESOS, ID_ESTADO_CLIENTE
             FROM ADMININTERMEDIARIA.CLIENTES 
             ORDER BY ID_CLIENTE`
        );
        await connection.close();
        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener clientes:', error);
        res.status(500).json({ error: 'Error al obtener clientes' });
    }
});

// API para crear cliente
router.post('/api/clientes', requireAuth, async (req, res) => {
    try {
        const {
            nombre, apellido, cedula, genero, nacionalidad,
            fecha_nacimiento, estado_civil, provincia, celular,
            correo, ingresos, tipo_cliente
        } = req.body;

        const connection = await db.getConnection();
        
        // Obtener el próximo ID
        const idResult = await connection.execute(
            'SELECT NVL(MAX(ID_CLIENTE), 0) + 1 as NEXT_ID FROM ADMININTERMEDIARIA.CLIENTES'
        );
        const nextId = idResult.rows[0][0];

        const result = await connection.execute(
            `INSERT INTO ADMININTERMEDIARIA.CLIENTES 
             (ID_CLIENTE, ID_TIPO_CLIENTE, NOMBRE, APELLIDO, CEDULA, GENERO, 
              ID_NACIONALIDAD, FECHA_NACIMIENTO, ID_ESTADO_CIVIL, ID_PROVINCIA, 
              CELULAR, CORREO, INGRESOS, ID_ESTADO_CLIENTE) 
             VALUES (:id, :tipo, :nombre, :apellido, :cedula, :genero, 
                     :nacionalidad, TO_DATE(:fecha, 'YYYY-MM-DD'), :estado_civil, 
                     :provincia, :celular, :correo, :ingresos, 1)`,
            {
                id: nextId,
                tipo: tipo_cliente,
                nombre: nombre,
                apellido: apellido,
                cedula: cedula,
                genero: genero,
                nacionalidad: nacionalidad,
                fecha: fecha_nacimiento,
                estado_civil: estado_civil,
                provincia: provincia,
                celular: celular,
                correo: correo,
                ingresos: ingresos
            }
        );

        await connection.commit();
        await connection.close();
        
        res.json({ success: true, message: 'Cliente creado exitosamente', id: nextId });
    } catch (error) {
        console.error('Error al crear cliente:', error);
        res.status(500).json({ error: 'Error al crear cliente' });
    }
});

// API para obtener cuentas
router.get('/api/cuentas', requireAuth, async (req, res) => {
    try {
        const connection = await db.getConnection();
        const result = await connection.execute(
            `SELECT c.NUM_CUENTA, c.ID_CLIENTE, 
                    cl.NOMBRE || ' ' || cl.APELLIDO as NOMBRE_CLIENTE,
                    c.SALDO_ACTUAL, c.SALDO_DISPONIBLE,
                    TO_CHAR(c.FECHA_APERTURA, 'DD/MM/YYYY') as FECHA_APERTURA,
                    c.ID_TIPO_CUENTA, c.ID_ESTADO_CUENTA
             FROM ADMININTERMEDIARIA.CUENTAS c
             JOIN ADMININTERMEDIARIA.CLIENTES cl ON c.ID_CLIENTE = cl.ID_CLIENTE
             ORDER BY c.NUM_CUENTA`
        );
        await connection.close();
        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener cuentas:', error);
        res.status(500).json({ error: 'Error al obtener cuentas' });
    }
});

// API para crear cuenta
router.post('/api/cuentas', requireAuth, async (req, res) => {
    try {
        const { id_cliente, tipo_cuenta, saldo_inicial } = req.body;

        const connection = await db.getConnection();
        
        // Generar número de cuenta
        const num_cuenta = Date.now().toString().slice(-12);

        const result = await connection.execute(
            `INSERT INTO ADMININTERMEDIARIA.CUENTAS 
             (NUM_CUENTA, ID_CLIENTE, ID_TIPO_CUENTA, SALDO_ACTUAL, SALDO_DISPONIBLE, ID_ESTADO_CUENTA) 
             VALUES (:num_cuenta, :id_cliente, :tipo_cuenta, :saldo, :saldo, 1)`,
            {
                num_cuenta: num_cuenta,
                id_cliente: id_cliente,
                tipo_cuenta: tipo_cuenta,
                saldo: saldo_inicial || 0
            }
        );

        await connection.commit();
        await connection.close();
        
        res.json({ success: true, message: 'Cuenta creada exitosamente', num_cuenta: num_cuenta });
    } catch (error) {
        console.error('Error al crear cuenta:', error);
        res.status(500).json({ error: 'Error al crear cuenta' });
    }
});

// API para transacciones
router.get('/api/transacciones', requireAuth, async (req, res) => {
    try {
        const connection = await db.getConnection();
        const result = await connection.execute(
            `SELECT ID_TRANSACCION, ID_TIPO_TRANSACCION, MONTO, DESCRIPCION,
                    TO_CHAR(FECHA_HORA, 'DD/MM/YYYY HH24:MI:SS') as FECHA_HORA,
                    NUM_CUENTA_ORIGEN, NUM_CUENTA_DESTINO, ID_CANAL, ID_ESTADO_TRANSACCION
             FROM ADMININTERMEDIARIA.TRANSACCIONES 
             ORDER BY FECHA_HORA DESC`
        );
        await connection.close();
        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener transacciones:', error);
        res.status(500).json({ error: 'Error al obtener transacciones' });
    }
});

// API para crear transacción
router.post('/api/transacciones', requireAuth, async (req, res) => {
    try {
        const { tipo_transaccion, monto, descripcion, cuenta_origen, cuenta_destino, canal } = req.body;

        const connection = await db.getConnection();
        
        // Generar ID de transacción
        const id_transaccion = 'T' + Date.now().toString().slice(-9);

        const result = await connection.execute(
            `INSERT INTO ADMININTERMEDIARIA.TRANSACCIONES 
             (ID_TRANSACCION, ID_TIPO_TRANSACCION, MONTO, DESCRIPCION, 
              NUM_CUENTA_ORIGEN, NUM_CUENTA_DESTINO, ID_CANAL, ID_ESTADO_TRANSACCION) 
             VALUES (:id, :tipo, :monto, :descripcion, :origen, :destino, :canal, 1)`,
            {
                id: id_transaccion,
                tipo: tipo_transaccion,
                monto: monto,
                descripcion: descripcion,
                origen: cuenta_origen,
                destino: cuenta_destino,
                canal: canal
            }
        );

        // Actualizar saldos si es transferencia
        if (tipo_transaccion == 2 && cuenta_origen && cuenta_destino) {
            // Debitar cuenta origen
            await connection.execute(
                `UPDATE ADMININTERMEDIARIA.CUENTAS 
                 SET SALDO_ACTUAL = SALDO_ACTUAL - :monto,
                     SALDO_DISPONIBLE = SALDO_DISPONIBLE - :monto
                 WHERE NUM_CUENTA = :cuenta`,
                { monto: monto, cuenta: cuenta_origen }
            );

            // Acreditar cuenta destino
            await connection.execute(
                `UPDATE ADMININTERMEDIARIA.CUENTAS 
                 SET SALDO_ACTUAL = SALDO_ACTUAL + :monto,
                     SALDO_DISPONIBLE = SALDO_DISPONIBLE + :monto
                 WHERE NUM_CUENTA = :cuenta`,
                { monto: monto, cuenta: cuenta_destino }
            );
        }

        await connection.commit();
        await connection.close();
        
        res.json({ success: true, message: 'Transacción creada exitosamente', id: id_transaccion });
    } catch (error) {
        console.error('Error al crear transacción:', error);
        res.status(500).json({ error: 'Error al crear transacción' });
    }
});

// API para obtener solicitudes
router.get('/api/solicitudes', requireAuth, async (req, res) => {
    try {
        const connection = await db.getConnection();
        const result = await connection.execute(
            `SELECT s.ID_SOLICITUD, s.ID_CLIENTE, 
                    cl.NOMBRE || ' ' || cl.APELLIDO as NOMBRE_CLIENTE,
                    s.ID_PRODUCTO, p.NOMBRE_PRODUCTO,
                    TO_CHAR(s.FECHA_SOLICITUD, 'DD/MM/YYYY') as FECHA_SOLICITUD,
                    s.ID_ESTADO_SOLICITUD, s.OBSERVACIONES
             FROM ADMININTERMEDIARIA.SOLICITUDES s
             JOIN ADMININTERMEDIARIA.CLIENTES cl ON s.ID_CLIENTE = cl.ID_CLIENTE
             JOIN ADMININTERMEDIARIA.PRODUCTOS p ON s.ID_PRODUCTO = p.ID_PRODUCTO
             ORDER BY s.FECHA_SOLICITUD DESC`
        );
        await connection.close();
        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener solicitudes:', error);
        res.status(500).json({ error: 'Error al obtener solicitudes' });
    }
});

// API para crear solicitud
router.post('/api/solicitudes', requireAuth, async (req, res) => {
    try {
        const { id_cliente, id_producto, observaciones } = req.body;

        const connection = await db.getConnection();
        
        // Generar ID de solicitud
        const id_solicitud = 'S' + Date.now().toString().slice(-7);

        const result = await connection.execute(
            `INSERT INTO ADMININTERMEDIARIA.SOLICITUDES 
             (ID_SOLICITUD, ID_CLIENTE, ID_PRODUCTO, ID_ESTADO_SOLICITUD, OBSERVACIONES) 
             VALUES (:id, :cliente, :producto, 1, :observaciones)`,
            {
                id: id_solicitud,
                cliente: id_cliente,
                producto: id_producto,
                observaciones: observaciones
            }
        );

        await connection.commit();
        await connection.close();
        
        res.json({ success: true, message: 'Solicitud creada exitosamente', id: id_solicitud });
    } catch (error) {
        console.error('Error al crear solicitud:', error);
        res.status(500).json({ error: 'Error al crear solicitud' });
    }
});

// API para obtener productos
router.get('/api/productos', requireAuth, async (req, res) => {
    try {
        const connection = await db.getConnection();
        const result = await connection.execute(
            `SELECT ID_PRODUCTO, NOMBRE_PRODUCTO, PRECIO_PRODUCTO, 
                    TASA_INTERES, PLAZO_MES, REQUISITOS, ID_TIPO_PRODUCTO
             FROM ADMININTERMEDIARIA.PRODUCTOS 
             ORDER BY ID_PRODUCTO`
        );
        await connection.close();
        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener productos:', error);
        res.status(500).json({ error: 'Error al obtener productos' });
    }
});

// API para movimientos de cajero
router.get('/api/movimientos-cajero', requireAuth, async (req, res) => {
    try {
        const connection = await db.getConnection();
        const result = await connection.execute(
            `SELECT m.ID_MOVIMIENTO, m.ID_CLIENTE, 
                    cl.NOMBRE || ' ' || cl.APELLIDO as NOMBRE_CLIENTE,
                    m.NUM_CUENTA, m.ID_CAJERO, m.ID_TRANSACCION,
                    TO_CHAR(m.FECHA_HORA_MOVIMIENTO, 'DD/MM/YYYY HH24:MI:SS') as FECHA_HORA,
                    m.ID_TIPO_MOVIMIENTO, m.FACTURA_CAJERO
             FROM ADMININTERMEDIARIA.MOVIMIENTOS_CAJERO m
             JOIN ADMININTERMEDIARIA.CLIENTES cl ON m.ID_CLIENTE = cl.ID_CLIENTE
             ORDER BY m.FECHA_HORA_MOVIMIENTO DESC`
        );
        await connection.close();
        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener movimientos:', error);
        res.status(500).json({ error: 'Error al obtener movimientos' });
    }
});

// API para crear movimiento de cajero
router.post('/api/movimientos-cajero', requireAuth, async (req, res) => {
    try {
        const { id_cliente, num_cuenta, id_cajero, id_transaccion, tipo_movimiento, factura } = req.body;

        const connection = await db.getConnection();
        
        // Generar ID de movimiento
        const id_movimiento = 'M' + Date.now().toString().slice(-9);

        const result = await connection.execute(
            `INSERT INTO ADMININTERMEDIARIA.MOVIMIENTOS_CAJERO 
             (ID_MOVIMIENTO, ID_CLIENTE, NUM_CUENTA, ID_CAJERO, ID_TRANSACCION, 
              ID_TIPO_MOVIMIENTO, FACTURA_CAJERO) 
             VALUES (:id, :cliente, :cuenta, :cajero, :transaccion, :tipo, :factura)`,
            {
                id: id_movimiento,
                cliente: id_cliente,
                cuenta: num_cuenta,
                cajero: id_cajero,
                transaccion: id_transaccion,
                tipo: tipo_movimiento,
                factura: factura
            }
        );

        await connection.commit();
        await connection.close();
        
        res.json({ success: true, message: 'Movimiento registrado exitosamente', id: id_movimiento });
    } catch (error) {
        console.error('Error al registrar movimiento:', error);
        res.status(500).json({ error: 'Error al registrar movimiento' });
    }
});

module.exports = router;