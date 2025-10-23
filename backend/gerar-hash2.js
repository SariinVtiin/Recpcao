// ============================================
// GERADOR DE HASH BCRYPT
// Gera hash da senha para usar no MySQL
// ============================================

const bcrypt = require('bcrypt');

async function gerarHash() {
  const senha = '123456';
  const saltRounds = 10;

  console.log('🔐 Gerando hash bcrypt...\n');
  console.log('Senha:', senha);
  console.log('Salt rounds:', saltRounds);
  console.log('='.repeat(70));

  try {
    // Gerar hash
    const hash = await bcrypt.hash(senha, saltRounds);
    
    console.log('\n✅ Hash gerado com sucesso!\n');
    console.log('HASH BCRYPT:');
    console.log(hash);
    console.log('\n' + '='.repeat(70));

    // Validar o hash
    const valido = await bcrypt.compare(senha, hash);
    console.log('\n🧪 Teste de validação:', valido ? '✅ CORRETO' : '❌ ERRO');

    // Query para atualizar no MySQL
    console.log('\n' + '='.repeat(70));
    console.log('📝 QUERY PARA ATUALIZAR NO MYSQL:');
    console.log('='.repeat(70));
    console.log(`
UPDATE usuarios 
SET senha = '${hash}' 
WHERE login = 'admin';
    `);
    console.log('='.repeat(70));

  } catch (error) {
    console.error('❌ Erro ao gerar hash:', error.message);
  }
}

// Executar
gerarHash();