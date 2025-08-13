const { Service } = require('node-windows');
const svc = new Service({
  name: 'WhatsAppBackend',
  description: 'WhatsApp Backend Server',
  script: 'C:\\Users\\micro\\Desktop\\whatsapp-backend\\server.js'
});

svc.on('install', () => {
  svc.start();
  console.log('Service installed and started');
});

svc.install();