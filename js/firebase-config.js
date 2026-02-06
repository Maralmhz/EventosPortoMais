// ===== CONFIGURAÇÃO FIREBASE =====
// Substitua pelos seus dados do Firebase Console
const firebaseConfig = {
    apiKey: "SUA_API_KEY_AQUI",
    authDomain: "seu-projeto.firebaseapp.com",
    databaseURL: "https://seu-projeto.firebaseio.com",
    projectId: "seu-projeto-id",
    storageBucket: "seu-projeto.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef123456"
};

// Instruções para configurar:
// 1. Acesse: https://console.firebase.google.com
// 2. Clique em "Adicionar projeto"
// 3. Nomeie como "PortoMais" e siga os passos
// 4. No menu lateral, clique em "Realtime Database"
// 5. Clique em "Criar banco de dados"
// 6. Escolha "Iniciar no modo de teste"
// 7. Vá em Configurações do Projeto > Geral
// 8. Role até "Seus apps" e clique no ícone web (</>)
// 9. Copie as configurações e cole aqui

// Inicializar Firebase (não mexer)
let app, database;
try {
    app = firebase.initializeApp(firebaseConfig);
    database = firebase.database();
    console.log('✅ Firebase conectado com sucesso!');
} catch (error) {
    console.error('❌ Erro ao conectar Firebase:', error);
}

// Exportar no escopo global
window.app = app;
window.database = database;
