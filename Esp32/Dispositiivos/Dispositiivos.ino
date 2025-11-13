// =======================================================
// ESP32 ↔ Node.js via Socket.IO
// Biblioteca: SocketIoClient 0.3
// Autor: Bugre (ajustado por GPT-5)
// Revisão: 14/10/2025
// =======================================================

#define BUTTON_PIN 0 // GPIO0

#include <WiFi.h>
#include <SocketIOclient.h>
#include <ArduinoJson.h>
#include <Preferences.h>

// ========================
// CONFIGURAÇÕES DE REDE
// ========================
const char* ssid = "ELLASFACCAO2.4G";
const char* password = "Ellasfaccao25";

// ========================
// CONFIGURAÇÕES DO SERVIDOR
// ========================
const char* socketIoHost = "192.168.0.49"; // IP do servidor Node.js
const int socketIoPort = 3001;              // Porta do servidor Socket.IO

// Identificadores do dispositivo e funcionário
const char* deviceToken = "461545616614166";
String funcionarioSenha = "";

// Variáveis para operação selecionada
String operacaoId = "";
String operacaoNome = "";
int metaDiaria = 0;
int quantidade = 0;

Preferences prefs;

// ...existing code...
// Removido bloco duplicado de definições globais

// ========================
// OBJETO DO SOCKET.IO
// ========================
SocketIOclient socketIO;

// ========================
// DECLARAÇÕES DE FUNÇÕES
// ========================
void socketIOEvent(socketIOmessageType_t type, uint8_t * payload, size_t length);
void handleSocketEvent(uint8_t * payload);
void loginFuncionario();
void sendProductionData();

// ========================
// SETUP
void solicitarSenhaFuncionario() {
  Serial.println("Digite a senha do funcionário:");
  while (Serial.available() == 0) { delay(100); }
  funcionarioSenha = Serial.readStringUntil('\n');
  funcionarioSenha.trim();
}
// ========================
void setup() {
  Serial.begin(115200);
  Serial.println();
  Serial.println("===== Sistema de Produção - ESP32 =====");

  pinMode(BUTTON_PIN, INPUT_PULLUP); // Configura GPIO0 como entrada com pull-up

  // Conexão Wi-Fi
  Serial.printf("Conectando a rede Wi-Fi '%s'...\n", ssid);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.printf("Wi-Fi conectado! IP: %s\n", WiFi.localIP().toString().c_str());

  // Conectar ao servidor Socket.IO
  Serial.println("Conectando ao servidor Socket.IO...");
  socketIO.begin(socketIoHost, socketIoPort);
  socketIO.onEvent(socketIOEvent);
  // Não solicita senha aqui, aguarda conexão Socket.IO
}

// ========================
// LOOP PRINCIPAL
// ========================
void loop() {
  socketIO.loop();

  static bool lastButtonState = HIGH;
  bool buttonState = digitalRead(BUTTON_PIN);

  // Detecta borda de descida (pressionado)
  if (lastButtonState == HIGH && buttonState == LOW) {
    if (operacaoId != "") {
      sendProductionData();
    } else {
      Serial.println("⚠️ Faça login e selecione a operação antes de iniciar produção.");
    }
    delay(100); // debounce simples
  }
  lastButtonState = buttonState;
}

// ========================
// EVENTOS DO SOCKET.IO
// ========================
void socketIOEvent(socketIOmessageType_t type, uint8_t * payload, size_t length) {
  switch (type) {
    case sIOtype_CONNECT:
      Serial.println("[Socket.IO] ✅ Conectado ao servidor!");
      Serial.printf("[LOG] Enviando evento registerDevice para backend (deviceToken: %s)\n", deviceToken);
      socketIO.sendEVENT(String("[\"registerDevice\",{\"deviceToken\":\"") + deviceToken + "\"}]");
      solicitarSenhaFuncionario(); // Solicita senha após conectar ao Socket.IO
      break;

    case sIOtype_DISCONNECT:
      Serial.println("[Socket.IO] ❌ Desconectado do servidor!");
      Serial.println("[LOG] Verifique Wi-Fi e IP/porta do servidor.");
      break;

    case sIOtype_EVENT:
      Serial.printf("[Socket.IO] 📩 Evento recebido: %s\n", payload);
      handleSocketEvent(payload);
      break;

    case sIOtype_ERROR:
      Serial.printf("[Socket.IO] ⚠️ Erro: %s\n", payload);
      break;

    // Casos opcionais da versão 0.3
    case sIOtype_ACK:
    case sIOtype_BINARY_EVENT:
    case sIOtype_BINARY_ACK:
      break;

    default:
      break;
  }
}

// ========================
// TRATAMENTO DE EVENTOS RECEBIDOS
// ========================
void handleSocketEvent(uint8_t * payload) {
  DynamicJsonDocument doc(4096);
  DeserializationError error = deserializeJson(doc, payload);
  if (error) {
    Serial.print(F("❌ Erro ao processar JSON: "));
    Serial.println(error.f_str());
    return;
  }

  String eventName = doc[0].as<String>();

  if (eventName == "deviceRegistered") {
    bool success = doc[1]["success"];
    String message = doc[1]["message"];
    Serial.printf("[deviceRegistered] %s\n", message.c_str());
    Serial.printf("[LOG] Backend confirmou registro do dispositivo: %s\n", success ? "OK" : "FALHA");
    if (success) {
      loginFuncionario();
    }
  }
  else if (eventName == "deviceStatusUpdate") {
    if (!doc[1]["status"].isNull()) {
      Serial.printf("[deviceStatusUpdate] Status recebido do backend: %s\n", doc[1]["status"].as<const char*>());
    }
  }
  else if (eventName == "loginSuccess") {
    String funcionarioNome = doc[1]["funcionario"]["nome"];
    Serial.printf("[loginSuccess] 👤 Funcionário %s logado com sucesso!\n", funcionarioNome.c_str());

    // Solicita operação somente após login bem-sucedido
    if (doc[1]["operacoes"].is<JsonArray>()) {
      JsonArray ops = doc[1]["operacoes"].as<JsonArray>();
      Serial.println("Operações disponíveis:");
      for (size_t i = 0; i < ops.size(); i++) {
        Serial.printf("[%d] %s (meta: %d)\n", i+1, ops[i]["nome"].as<const char*>(), ops[i]["metaDiaria"].as<int>());
      }
      Serial.println("Digite o número da operação desejada:");
      // Aguarda seleção via Serial
      while (Serial.available() == 0) {
        delay(100);
      }
      int idx = Serial.parseInt();
      if (idx > 0 && idx <= ops.size()) {
        operacaoId = ops[idx-1]["_id"].as<String>();
        operacaoNome = ops[idx-1]["nome"].as<String>();
        metaDiaria = ops[idx-1]["metaDiaria"].as<int>();
        Serial.printf("Operação selecionada: %s (meta: %d)\n", operacaoNome.c_str(), metaDiaria);
      } else {
        Serial.println("Seleção inválida. Usando primeira operação.");
        operacaoId = ops[0]["_id"].as<String>();
        operacaoNome = ops[0]["nome"].as<String>();
        metaDiaria = ops[0]["metaDiaria"].as<int>();
      }
      // Envia operação selecionada para o backend
      DynamicJsonDocument opdoc(128);
      opdoc["deviceToken"] = deviceToken;
      opdoc["operacaoId"] = operacaoId;
      String opjson;
      serializeJson(opdoc, opjson);
      socketIO.sendEVENT(String("[\"selecionarOperacao\",") + opjson + "]");
      Serial.println("Aguardando confirmação da operação...");
    }
  }

  else if (eventName == "operacaoSelecionada") {
    if (!doc[1]["operacao"].isNull()) {
      operacaoId = doc[1]["operacao"]["_id"].as<String>();
      operacaoNome = doc[1]["operacao"]["nome"].as<String>();
      metaDiaria = doc[1]["operacao"]["metaDiaria"].as<int>();
      // Atualiza a contagem inicial de produção recebida do backend
      if (!doc[1]["producaoAtual"].isNull()) {
        quantidade = doc[1]["producaoAtual"].as<int>();
      } else {
        quantidade = 0;
      }
      Serial.printf("Operação carregada no dispositivo: %s (meta: %d, produção inicial: %d)\n", operacaoNome.c_str(), metaDiaria, quantidade);
      Serial.println("Pronto para iniciar produção!");
    } else {
      Serial.println("Erro ao carregar operação no dispositivo!");
    }
  }
  else if (eventName == "loginFailed") {
    String message = doc[1]["message"];
    Serial.printf("[loginFailed] ❌ %s\n", message.c_str());
    Serial.println("Código não cadastrado. Digite novamente:");
    solicitarSenhaFuncionario();
    loginFuncionario();
  }
  else if (eventName == "producaoFailed") {
    String message = doc[1]["message"];
    Serial.printf("[producaoFailed] ❌ Erro no envio: %s\n", message.c_str());
  }
}

// ========================
// FUNÇÃO: LOGIN DO FUNCIONÁRIO
// ========================
void loginFuncionario() {
  DynamicJsonDocument doc(256);
  doc["deviceToken"] = deviceToken;
  doc["codigo"] = funcionarioSenha;

  String output;
  serializeJson(doc, output);
  socketIO.sendEVENT(String("[\"loginFuncionario\",") + output + "]");
  Serial.printf("➡️ Enviando login do funcionário (dispositivo %s, código: %s)\n", deviceToken, funcionarioSenha.c_str());
}

// ========================
// FUNÇÃO: ENVIO DE PRODUÇÃO
// ========================
void sendProductionData() {
  if (operacaoId == "") {
    Serial.println("⚠️ Nenhuma operação selecionada. Produção não enviada.");
    return;
  }
  // Simula entre 1 e 5 peças
  int tempoProducao = random(100, 100); // Tempo em ms
  quantidade ++;

  DynamicJsonDocument doc(256);
  doc["deviceToken"] = deviceToken;
  doc["quantidade"] = quantidade;
  doc["tempoProducao"] = tempoProducao;
  doc["operacao"] = operacaoId;

  String output;
  serializeJson(doc, output);
  socketIO.sendEVENT(String("[\"producao\",") + output + "]");

  Serial.printf("📤 Enviando produção: %d peças em %d ms (operação: %s)\n", quantidade, tempoProducao, operacaoNome.c_str());
}
