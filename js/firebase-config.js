// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyASDJpwHTtOn71liMYaMTwyWVDY4s1FJRU",
  authDomain: "porto-mais-eventos.firebaseapp.com",
  databaseURL: "https://porto-mais-eventos-default-rtdb.firebaseio.com",
  projectId: "porto-mais-eventos",
  storageBucket: "porto-mais-eventos.firebasestorage.app",
  messagingSenderId: "1084717178712",
  appId: "1:1084717178712:web:05f7aa39e06d626d208f2d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

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
