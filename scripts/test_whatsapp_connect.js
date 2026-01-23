import http from "http";

const unitId = "56ce0981-6a4d-4b0f-80ea-3382b19c3cae";

// Primeiro, fazer login para obter um token real
const loginData = JSON.stringify({
  email: "admin@propulse.com",
  password: "admin123",
});

const loginOptions = {
  hostname: "localhost",
  port: 3000,
  path: "/admin/login",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Content-Length": loginData.length,
  },
};

console.log("1. Fazendo login...");
const loginReq = http.request(loginOptions, (res) => {
  let data = "";
  res.on("data", (chunk) => (data += chunk));
  res.on("end", () => {
    if (res.statusCode !== 200) {
      console.error(`Login falhou: ${res.statusCode}`);
      console.error(data);
      return;
    }

    const { accessToken } = JSON.parse(data);
    console.log("✅ Login bem-sucedido");

    // Agora testar o endpoint de conexão
    const connectData = JSON.stringify({
      provider: "evolution",
      credentials: {
        apiKey: "MINHA_API_KEY",
        instanceId: "test_unit",
      },
    });

    const connectOptions = {
      hostname: "localhost",
      port: 3000,
      path: `/units/${unitId}/whatsapp/connect`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        "Content-Length": connectData.length,
      },
    };

    console.log("\n2. Testando conexão WhatsApp...");
    console.log(`POST /units/${unitId}/whatsapp/connect`);
    console.log("Body:", connectData);

    const connectReq = http.request(connectOptions, (res) => {
      let responseData = "";
      res.on("data", (chunk) => (responseData += chunk));
      res.on("end", () => {
        console.log(`\n--- RESPOSTA ---`);
        console.log(`Status: ${res.statusCode}`);
        console.log(`Body:`, responseData);

        if (res.statusCode === 500) {
          console.error("\n❌ ERRO 500 - Verificar logs do backend");
        } else if (res.statusCode === 201 || res.statusCode === 200) {
          console.log("\n✅ Conexão iniciada com sucesso!");
        }
      });
    });

    connectReq.on("error", (e) => {
      console.error(`Erro na requisição: ${e.message}`);
    });

    connectReq.write(connectData);
    connectReq.end();
  });
});

loginReq.on("error", (e) => {
  console.error(`Erro no login: ${e.message}`);
});

loginReq.write(loginData);
loginReq.end();
