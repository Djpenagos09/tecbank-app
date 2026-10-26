const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./database');

const app = express();
const PORT = 3000;
const JWT_SECRET = 'tecbank_secreto_super_seguro_2026';

app.use(cors());
app.use(express.json());

// Forzar la creación de las cuentas de prueba al iniciar
const seedUsersForce = async () => {
  const pass = await bcrypt.hash('123456', 10);
  
  db.run(`INSERT OR REPLACE INTO users (id, fullName, username, email, phone, password, accountNumber, balance, status) VALUES 
    (10, 'Carlos Mendoza', 'carlosm', 'carlos@tecbank.com', '3001234567', '${pass}', '12345', 5000000, 'active'),
    (11, 'Mariana Gómez', 'marianag', 'mariana@tecbank.com', '3009876543', '${pass}', '58201', 3500000, 'active'),
    (12, 'Andrés Rocha', 'andresr', 'andres@tecbank.com', '3005554433', '${pass}', '90734', 8200000, 'active')`, 
    (err) => {
      if (err) console.log('Error insertando usuarios de prueba:', err.message);
      else console.log('✅ USUARIOS DE PRUEBA CARGADOS: Carlos (12345), Mariana (58201), Andrés (90734)');
    }
  );
};

// Helper para generar número de cuenta único de 5 dígitos
const generateUniqueAccountNumber = () => {
  return new Promise((resolve, reject) => {
    const attemptGen = () => {
      const num = Math.floor(10000 + Math.random() * 90000).toString();
      db.get(`SELECT id FROM users WHERE accountNumber = ?`, [num], (err, row) => {
        if (err) return reject(err);
        if (row) {
          attemptGen();
        } else {
          resolve(num);
        }
      });
    };
    attemptGen();
  });
};

// Middleware para verificar JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Acceso no autorizado.' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Sesión inválida o expirada.' });
    req.user = user;
    next();
  });
};

// 1. Registro de Usuario
app.post('/api/register', async (req, res) => {
  const fullName = req.body.fullName || req.body.fullname;
  const username = req.body.username;
  const email = req.body.email;
  const password = req.body.password;
  const phone = req.body.phone || '0000000000';

  if (!fullName || !username || !email || !password) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios.' });
  }

  const cleanUsername = username.trim().toLowerCase();

  try {
    const accountNumber = await generateUniqueAccountNumber();
    const hashedPassword = await bcrypt.hash(password, 10);
    const query = `INSERT INTO users (fullName, username, email, phone, password, accountNumber, balance, status) VALUES (?, ?, ?, ?, ?, ?, 4250000, 'active')`;

    db.run(query, [fullName.trim(), cleanUsername, email.trim(), phone, hashedPassword, accountNumber], function (err) {
      if (err) {
        if (err.message && (err.message.includes('users.username') || err.message.includes('UNIQUE constraint failed: users.username'))) {
          return res.status(400).json({ error: 'El nombre de usuario ya está en uso.' });
        }
        if (err.message && err.message.includes('users.email')) {
          return res.status(400).json({ error: 'El correo electrónico ya está registrado.' });
        }
        return res.status(500).json({ error: 'Error al registrar el usuario.' });
      }
      res.status(201).json({ 
        message: 'Usuario registrado exitosamente.', 
        userId: this.lastID,
        accountNumber: accountNumber 
      });
    });
  } catch (error) {
    res.status(500).json({ error: 'Error interno al generar la cuenta.' });
  }
});

// 2. Login
app.post('/api/login', (req, res) => {
  const username = req.body.username || req.body.email || req.body.identifier;
  const password = req.body.password;

  if (!username || !password) {
    return res.status(400).json({ error: 'Nombre de usuario y contraseña requeridos.' });
  }

  const cleanUsername = username.trim().toLowerCase();
  const query = `SELECT * FROM users WHERE LOWER(username) = ? OR LOWER(email) = ?`;

  db.get(query, [cleanUsername, cleanUsername], async (err, user) => {
    if (err) return res.status(500).json({ error: 'Error en el servidor.' });
    if (!user) return res.status(401).json({ error: 'Nombre de usuario o contraseña incorrectos.' });

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(401).json({ error: 'Nombre de usuario o contraseña incorrectos.' });

    const token = jwt.sign(
      { id: user.id, fullName: user.fullName, username: user.username, email: user.email, accountNumber: user.accountNumber },
      JWT_SECRET,
      { expiresIn: '4h' }
    );

    res.json({
      message: 'Inicio de sesión exitoso',
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        accountNumber: user.accountNumber,
        balance: user.balance
      }
    });
  });
});

// 3. Perfil del usuario
app.get('/api/user/profile', authenticateToken, (req, res) => {
  db.get(`SELECT id, fullName, username, email, accountNumber, balance, status FROM users WHERE id = ?`, [req.user.id], (err, user) => {
    if (err || !user) return res.status(404).json({ error: 'Usuario no encontrado.' });
    res.json(user);
  });
});

// 4. Buscar destinatario por NÚMERO DE CUENTA
app.get('/api/users/search-account/:accountNumber', authenticateToken, (req, res) => {
  const targetAcc = req.params.accountNumber.trim();

  if (!/^\d{5}$/.test(targetAcc)) {
    return res.status(400).json({ error: 'El número de cuenta debe ser de 5 dígitos.' });
  }

  db.get(`SELECT accountNumber FROM users WHERE id = ?`, [req.user.id], (err, sender) => {
    if (sender && sender.accountNumber === targetAcc) {
      return res.status(400).json({ error: 'No puedes transferir a tu propia cuenta.' });
    }

    db.get(`SELECT id, fullName, username, accountNumber, status FROM users WHERE accountNumber = ?`, [targetAcc], (err, target) => {
      if (err) return res.status(500).json({ error: 'Error al buscar destinatario.' });
      if (!target) return res.status(404).json({ error: 'No encontramos una cuenta asociada a ese número.' });

      res.json({
        id: target.id,
        fullName: target.fullName,
        username: target.username,
        accountNumber: target.accountNumber
      });
    });
  });
});

// 5. Transferencia (Redondeando el monto a entero exacto)
app.post('/api/transfer', authenticateToken, (req, res) => {
  const senderId = req.user.id;
  const { targetAccountNumber, amount, concept } = req.body;
  
  // Math.round asegura que el monto sea siempre un número entero exacto
  const numAmount = Math.round(Number(amount));

  if (!targetAccountNumber || !/^\d{5}$/.test(targetAccountNumber.toString())) {
    return res.status(400).json({ error: 'Ingresa un número de cuenta válido de 5 dígitos.' });
  }

  if (isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ error: 'El monto debe ser mayor a cero COP.' });
  }

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    db.get(`SELECT id, fullName, username, accountNumber, balance FROM users WHERE id = ?`, [senderId], (err, sender) => {
      if (err || !sender) {
        db.run('ROLLBACK');
        return res.status(500).json({ error: 'Error en la cuenta de origen.' });
      }

      if (sender.balance < numAmount) {
        db.run('ROLLBACK');
        return res.status(400).json({ error: 'Saldo insuficiente.' });
      }

      db.get(`SELECT id, fullName, username, accountNumber FROM users WHERE accountNumber = ?`, [targetAccountNumber], (err, receiver) => {
        if (err || !receiver) {
          db.run('ROLLBACK');
          return res.status(404).json({ error: 'No encontramos la cuenta destino.' });
        }

        const newSenderBalance = sender.balance - numAmount;
        const refCode = 'TB-' + Date.now() + '-' + Math.floor(1000 + Math.random() * 9000);
        const finalConcept = concept && concept.trim() !== '' ? concept.trim() : 'Transferencia TecBank';

        db.run(`UPDATE users SET balance = balance - ? WHERE id = ?`, [numAmount, sender.id], (err) => {
          if (err) {
            db.run('ROLLBACK');
            return res.status(500).json({ error: 'Error al debitar el monto.' });
          }

          db.run(`UPDATE users SET balance = balance + ? WHERE id = ?`, [numAmount, receiver.id], (err) => {
            if (err) {
              db.run('ROLLBACK');
              return res.status(500).json({ error: 'Error al acreditar el monto.' });
            }

            const insertTx = `
              INSERT INTO transfers (
                reference, senderId, senderUsername, senderName, senderAccountNumber,
                receiverId, receiverUsername, receiverName, receiverAccountNumber, amount, concept
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const params = [
              refCode,
              sender.id,
              sender.username || 'usuario',
              sender.fullName || 'Usuario TecBank',
              sender.accountNumber || '00000',
              receiver.id,
              receiver.username || 'destinatario',
              receiver.fullName || 'Destinatario TecBank',
              receiver.accountNumber || '00000',
              numAmount,
              finalConcept
            ];

            db.run(insertTx, params, function (err) {
              if (err) {
                console.error('Error insertando transferencia en BD:', err.message);
                db.run('ROLLBACK');
                return res.status(500).json({ error: 'Error al guardar el comprobante.' });
              }

              db.run('COMMIT');

              const now = new Date();
              return res.json({
                message: '¡Transferencia realizada exitosamente!',
                reference: refCode,
                newBalance: newSenderBalance,
                receipt: {
                  reference: refCode,
                  date: now.toLocaleDateString('es-CO'),
                  time: now.toLocaleTimeString('es-CO'),
                  senderName: sender.fullName,
                  senderAccount: sender.accountNumber,
                  receiverName: receiver.fullName,
                  receiverAccount: receiver.accountNumber,
                  amount: numAmount,
                  concept: finalConcept
                }
              });
            });
          });
        });
      });
    });
  });
});

app.listen(PORT, () => {
  console.log(`Servidor TecBank S.A. corriendo en http://localhost:${PORT}`);
  seedUsersForce();
});