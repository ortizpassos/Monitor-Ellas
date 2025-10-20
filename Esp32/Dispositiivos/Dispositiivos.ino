#define BUTTON_PIN 0 // GPIO0
// =======================================================
// ESP32 ↔ Node.js via Socket.IO
// Biblioteca: SocketIoClient 0.3
// Autor: Bugre (ajustado por GPT-5)
// Revisão: 14/10/2025
// =======================================================

#include <WiFi.h>
#include <SocketIOclient.h>
#include <ArduinoJson.h>

// ========================
// CONFIGURAÇÕES DE REDE
// ========================
const char* ssid = "Use o seu 4G";
const char* password = "d1985A2025.";

// ========================
// CONFIGURAÇÕES DO SERVIDOR
// ========================
const char* socketIoHost = "192.168.100.4"; // IP do servidor Node.js
const int socketIoPort = 3001;              // Porta do servidor Socket.IO

// Identificadores do dispositivo e funcionário
const char* deviceToken = "461545616614167";
const char* funcionarioCodigo = "1823";

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
    sendProductionData();
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
      socketIO.sendEVENT(String("[\"registerDevice\",{\"deviceToken\":\"") + deviceToken + "\"}]");
      break;

    case sIOtype_DISCONNECT:
      Serial.println("[Socket.IO] ❌ Desconectado do servidor!");
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
  DynamicJsonDocument doc(1024);
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
    if (success) {
      loginFuncionario();
    }
  } 
  else if (eventName == "loginSuccess") {
    String funcionarioNome = doc[1]["funcionario"]["nome"];
    Serial.printf("[loginSuccess] 👤 Funcionário %s logado com sucesso!\n", funcionarioNome.c_str());
  } 
  else if (eventName == "loginFailed") {
    String message = doc[1]["message"];
    Serial.printf("[loginFailed] ❌ Falha no login: %s\n", message.c_str());
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
  doc["codigo"] = funcionarioCodigo;

  String output;
  serializeJson(doc, output);
  socketIO.sendEVENT(String("[\"loginFuncionario\",") + output + "]");
  Serial.printf("➡️ Enviando login do funcionário %s (dispositivo %s)\n", funcionarioCodigo, deviceToken);
}

// ========================
// FUNÇÃO: ENVIO DE PRODUÇÃO
// ========================
int quantidade = 0; 
void sendProductionData() {
           // Simula entre 1 e 5 peças
  int tempoProducao = random(100, 100); // Tempo em ms
  quantidade ++;


  DynamicJsonDocument doc(256);
  doc["deviceToken"] = deviceToken;
  doc["quantidade"] = quantidade;
  doc["tempoProducao"] = tempoProducao;

  String output;
  serializeJson(doc, output);
  socketIO.sendEVENT(String("[\"producao\",") + output + "]");

  Serial.printf("📤 Enviando produção: %d peças em %d ms\n", quantidade, tempoProducao);
}
