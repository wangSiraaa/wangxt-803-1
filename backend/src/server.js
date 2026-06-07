const express = require('express');
const cors = require('cors');
const path = require('path');

const devicesRouter = require('./routes/devices');
const contractsRouter = require('./routes/contracts');
const rentalOrdersRouter = require('./routes/rentalOrders');
const inspectionsRouter = require('./routes/inspections');
const damageClaimsRouter = require('./routes/damageClaims');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/devices', devicesRouter);
app.use('/api/contracts', contractsRouter);
app.use('/api/rental-orders', rentalOrdersRouter);
app.use('/api/inspections', inspectionsRouter);
app.use('/api/damage-claims', damageClaimsRouter);

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: '服务器运行正常', timestamp: new Date().toISOString() });
});

app.use(express.static(path.join(__dirname, '../../frontend')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
