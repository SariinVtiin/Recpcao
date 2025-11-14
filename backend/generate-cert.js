// ============================================
// GERADOR DE CERTIFICADOS SSL (Node.js + selfsigned)
// Não requer OpenSSL instalado
// ============================================

const fs = require('fs');
const path = require('path');
const selfsigned = require('selfsigned');

console.log('🔒 Gerando certificados SSL auto-assinados...');

const sslDir = path.join(__dirname, 'ssl');

// Cria o diretório se não existir
if (!fs.existsSync(sslDir)) {
  fs.mkdirSync(sslDir);
  console.log('✅ Diretório ssl/ criado');
}

// Atributos do certificado
const attrs = [{ name: 'commonName', value: '192.167.2.41' }];

// Opções do certificado
const options = {
  days: 365,
  keySize: 2048,
  algorithm: 'sha256',
};

// Gera certificado e chave privada
const pems = selfsigned.generate(attrs, options);

// Salva os arquivos no diretório ssl
fs.writeFileSync(path.join(sslDir, 'server.key'), pems.private, 'utf8');
fs.writeFileSync(path.join(sslDir, 'server.cert'), pems.cert, 'utf8');

console.log('✅ Certificados gerados com sucesso!');
console.log('📁 Localização: ./ssl/');
console.log('   - server.key (chave privada)');
console.log('   - server.cert (certificado)');
console.log('\n🚀 Agora você pode iniciar o servidor com: npm start');
