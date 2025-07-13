 // Verificar sesión al cargar la página
        window.onload = function() {
            fetch('/auth/verify')
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        document.getElementById('userName').textContent = data.user.username;
						console.log(`user: ${JSON.stringify(data.user)}`)
                        if (data.user.role !== 'EMPLEADO') {
                            alert('Acceso denegado');
                            window.location.href = '/login';
                        }
                        loadStats();
                    } else {
                        window.location.href = '/login';
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    window.location.href = '/login';
                });
        };

        function showModal(modalId) {
			if(modalId == "clienteModal"){
			console.log("Exito prro")}
            document.getElementById(modalId).style.display = 'block';
        }

        function closeModal(modalId) {
            document.getElementById(modalId).style.display = 'none';
        }

        function logout() {
            fetch('/auth/logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include'
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    window.location.href = '/login';
                } else {
                    alert('Error al cerrar sesión');
                }
            })
            .catch(error => {
                console.error('Error:', error);
            });
        }

        function loadStats() {
            // Cargar estadísticas
            fetch('/api/clientes', { credentials: 'include' })
                .then(response => response.json())
                .then(data => {
                    document.getElementById('totalClientes').textContent = data.length;
                })
                .catch(error => console.error('Error:', error));

            fetch('/api/cuentas', { credentials: 'include' })
                .then(response => response.json())
                .then(data => {
                    document.getElementById('totalCuentas').textContent = data.length;
                })
                .catch(error => console.error('Error:', error));

            fetch('/api/solicitudes', { credentials: 'include' })
                .then(response => response.json())
                .then(data => {
                    document.getElementById('totalSolicitudes').textContent = data.length;
                })
                .catch(error => console.error('Error:', error));

            fetch('/api/transacciones', { credentials: 'include' })
                .then(response => response.json())
                .then(data => {
                    document.getElementById('totalTransacciones').textContent = data.length;
                })
                .catch(error => console.error('Error:', error));
        }

        function loadClientes() {
            fetch('/api/clientes', { credentials: 'include' })
                .then(response => response.json())
                .then(data => {
                    displayTable('Clientes', data, [
                        'ID_CLIENTE', 'NOMBRE', 'APELLIDO', 'CEDULA', 'CORREO', 
                        'CELULAR', 'FECHA_NACIMIENTO', 'INGRESOS', 'ID_ESTADO_CLIENTE'
                    ]);
                })
                .catch(error => {
                    console.error('Error:', error);
                    showMessage('Error al cargar clientes', 'error');
                });
        }

        function loadCuentas() {
            fetch('/api/cuentas', { credentials: 'include' })
                .then(response => response.json())
                .then(data => {
                    displayTable('Cuentas', data, [
                        'NUM_CUENTA', 'ID_CLIENTE', 'NOMBRE_CLIENTE', 'SALDO_ACTUAL', 
                        'SALDO_DISPONIBLE', 'FECHA_APERTURA', 'ID_TIPO_CUENTA', 'ID_ESTADO_CUENTA'
                    ]);
                })
                .catch(error => {
                    console.error('Error:', error);
                    showMessage('Error al cargar cuentas', 'error');
                });
        }

        function loadProductos() {
            fetch('/api/productos', { credentials: 'include' })
                .then(response => response.json())
                .then(data => {
                    displayTable('Productos', data, [
                        'ID_PRODUCTO', 'NOMBRE_PRODUCTO', 'PRECIO_PRODUCTO', 
                        'TASA_INTERES', 'PLAZO_MES', 'REQUISITOS', 'ID_TIPO_PRODUCTO'
                    ]);
                })
                .catch(error => {
                    console.error('Error:', error);
                    showMessage('Error al cargar productos', 'error');
                });
        }

        function loadSolicitudes() {
            fetch('/api/solicitudes', { credentials: 'include' })
                .then(response => response.json())
                .then(data => {
                    displayTable('Solicitudes', data, [
                        'ID_SOLICITUD', 'ID_CLIENTE', 'NOMBRE_CLIENTE', 'ID_PRODUCTO',
                        'NOMBRE_PRODUCTO', 'FECHA_SOLICITUD', 'ID_ESTADO_SOLICITUD', 'OBSERVACIONES'
                    ]);
                })
                .catch(error => {
                    console.error('Error:', error);
                    showMessage('Error al cargar solicitudes', 'error');
                });
        }

        function loadPrestamos() {
            fetch('/api/prestamos', { credentials: 'include' })
                .then(response => response.json())
                .then(data => {
                    displayTable('Préstamos', data, [
                        'ID_PRESTAMO', 'ID_CLIENTE', 'NOMBRE_CLIENTE', 'MONTO_PRESTAMO',
                        'TASA_INTERES', 'PLAZO_MESES', 'FECHA_DESEMBOLSO', 'ID_ESTADO_PRESTAMO'
                    ]);
                })
                .catch(error => {
                    console.error('Error:', error);
                    showMessage('Error al cargar préstamos', 'error');
                });
        }

        function loadTransacciones() {
            fetch('/api/transacciones', { credentials: 'include' })
                .then(response => response.json())
                .then(data => {
                    displayTable('Transacciones', data, [
                        'ID_TRANSACCION', 'ID_TIPO_TRANSACCION', 'MONTO', 'DESCRIPCION',
                        'FECHA_HORA', 'NUM_CUENTA_ORIGEN', 'NUM_CUENTA_DESTINO', 'ID_CANAL', 'ID_ESTADO_TRANSACCION'
                    ]);
                })
                .catch(error => {
                    console.error('Error:', error);
                    showMessage('Error al cargar transacciones', 'error');
                });
        }

        function displayTable(title, data, columns) {
            document.getElementById('tableTitle').textContent = title;
            
            if (data.length === 0) {
                document.getElementById('tableContent').innerHTML = '<p>No hay datos disponibles.</p>';
                return;
            }

            let tableHTML = '<table><thead><tr>';
            columns.forEach(column => {
                tableHTML += `<th>${column}</th>`;
            });
            tableHTML += '</tr></thead><tbody>';

            data.forEach(row => {
                tableHTML += '<tr>';
                columns.forEach((column, index) => {
                    tableHTML += `<td>${row[index] || ''}</td>`;
                });
                tableHTML += '</tr>';
            });

            tableHTML += '</tbody></table>';
            document.getElementById('tableContent').innerHTML = tableHTML;
        }

        function showMessage(message, type) {
            const messageDiv = document.createElement('div');
            messageDiv.className = type;
            messageDiv.textContent = message;
            document.querySelector('.container').insertBefore(messageDiv, document.querySelector('.dashboard-grid'));
            
            setTimeout(() => {
                messageDiv.remove();
            }, 3000);
        }

        // Manejo de formularios
        document.getElementById('clienteForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const data = Object.fromEntries(formData);
            data.tipo_cliente = 1; // Cliente persona natural
            data.nacionalidad = 1; // Panamá por defecto
            data.estado_civil = 1; // Soltero por defecto
            data.provincia = 1; // Panamá por defecto

            fetch('/api/clientes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
                credentials: 'include'
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showMessage('Cliente creado exitosamente', 'success');
                    closeModal('clienteModal');
                    this.reset();
                    loadClientes();
                    loadStats();
                } else {
                    showMessage('Error al crear cliente', 'error');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showMessage('Error al crear cliente', 'error');
            });
        });

        document.getElementById('cuentaForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const data = Object.fromEntries(formData);

            fetch('/api/cuentas', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
                credentials: 'include'
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showMessage('Cuenta creada exitosamente', 'success');
                    closeModal('cuentaModal');
                    this.reset();
                    loadCuentas();
                    loadStats();
                } else {
                    showMessage('Error al crear cuenta', 'error');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showMessage('Error al crear cuenta', 'error');
            });
        });

        document.getElementById('solicitudForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const data = Object.fromEntries(formData);

            fetch('/api/solicitudes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
                credentials: 'include'
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showMessage('Solicitud creada exitosamente', 'success');
                    closeModal('solicitudModal');
                    this.reset();
                    loadSolicitudes();
                    loadStats();
                } else {
                    showMessage('Error al crear solicitud', 'error');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showMessage('Error al crear solicitud', 'error');
            });
        });

        document.getElementById('transaccionForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const data = Object.fromEntries(formData);

            fetch('/api/transacciones', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
                credentials: 'include'
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showMessage('Transacción creada exitosamente', 'success');
                    closeModal('transaccionModal');
                    this.reset();
                    loadTransacciones();
                    loadStats();
                } else {
                    showMessage('Error al crear transacción', 'error');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showMessage('Error al crear transacción', 'error');
            });
        });

        // Cerrar modal al hacer clic fuera de él
        window.onclick = function(event) {
            const modals = document.querySelectorAll('.modal');
            modals.forEach(modal => {
                if (event.target == modal) {
                    modal.style.display = 'none';
                }
            });
        }