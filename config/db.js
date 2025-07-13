const oracledb = require('oracledb');
require('dotenv').config();

// Configuración de conexión a Oracle Database
const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectString: `${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_SERVICE}`,
    poolMin: 2,
    poolMax: 10,
    poolIncrement: 1,
    poolTimeout: 60
};

// Inicializar el pool de conexiones
async function initializeDB() {
    try {
        await oracledb.createPool(dbConfig);
        console.log(' Pool de conexiones Oracle creado exitosamente');
    } catch (error) {
        console.error(' Error al crear el pool de conexiones:', error);
        throw error;
    }
}

// Función para obtener conexión
async function getConnection() {
    try {
        return await oracledb.getConnection();
    } catch (error) {
        console.error(' Error al obtener conexión:', error);
        throw error;
    }
}

// Función para cerrar conexión
async function closeConnection(connection) {
    try {
        if (connection) {
            await connection.close();
        }
    } catch (error) {
        console.error(' Error al cerrar conexión:', error);
    }
}

// Función para ejecutar consultas SELECT
async function executeQuery(sql, params = []) {
    let connection;
    try {
        connection = await getConnection();
        const result = await connection.execute(sql, params, {
            outFormat: oracledb.OUT_FORMAT_OBJECT
        });
        return result.rows;
    } catch (error) {
        console.error(' Error ejecutando consulta:', error);
        throw error;
    } finally {
        await closeConnection(connection);
    }
}

// Función para ejecutar INSERT, UPDATE, DELETE
async function executeNonQuery(sql, params = []) {
    let connection;
    try {
        connection = await getConnection();
        const result = await connection.execute(sql, params, {
            autoCommit: true
        });
        return result;
    } catch (error) {
        console.error(' Error ejecutando operación:', error);
        throw error;
    } finally {
        await closeConnection(connection);
    }
}

// Función para validar credenciales de usuario
async function validateUser(username, password) {
    const sql = `
        SELECT USERNAME, ACCOUNT_STATUS, CREATED, DEFAULT_TABLESPACE
        FROM DBA_USERS 
        WHERE USERNAME = :username 
        AND ACCOUNT_STATUS = 'OPEN'
    `;
    
    try {
        const result = await executeQuery(sql, [username.toUpperCase()]);
        if (result.length > 0) {
            // Intentar conectar con las credenciales proporcionadas
            const testConfig = {
                user: username,
                password: password,
                connectString: `${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_SERVICE}`
            };
            
            const testConnection = await oracledb.getConnection(testConfig);
            await testConnection.close();
            
            return {
                username: result[0].USERNAME,
                role: getUserRole(result[0].USERNAME),
                status: result[0].ACCOUNT_STATUS,
                tablespace: result[0].DEFAULT_TABLESPACE
            };
        }
        return null;
    } catch (error) {
        console.error(' Error validando usuario:', error);
        return null;
    }
}

// Función para determinar el rol del usuario
function getUserRole(username) {
    if (username === 'ADMININTERMEDIARIA') {
        return 'ADMIN';
    } else if (username.startsWith('CAJERO_')) {
        return 'CAJERO';
    } else if (['EMANUEL', 'MARIA', 'KEVIN'].includes(username)) {
        return 'EMPLEADO';
    }
    return 'UNKNOWN';
}

// Función para cerrar el pool de conexiones
async function closeDB() {
    try {
        await oracledb.getPool().close(10);
        console.log(' Pool de conexiones cerrado');
    } catch (error) {
        console.error(' Error cerrando pool:', error);
    }
}

module.exports = {
    initializeDB,
    getConnection,
    closeConnection,
    executeQuery,
    executeNonQuery,
    validateUser,
    getUserRole,
    closeDB
};