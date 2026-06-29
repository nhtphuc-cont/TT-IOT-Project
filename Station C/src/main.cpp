#include <Arduino.h>         // Bắt buộc phải có trong PlatformIO
#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <DHT.h>// Sử dụng ngoặc nhọn cho thư viện ngoài

// --- KHAI BÁO CHÂN CẢM BIẾN ---
#define DHTPIN 4       
#define DHTTYPE DHT22  
#define GAS_PIN 34     

const char* ssid = "Wokwi-GUEST";
const char* password = "";

String DATABASE_URL = "https://smart-d6b1d-default-rtdb.firebaseio.com";

WiFiClientSecure client;
DHT dht(DHTPIN, DHTTYPE);

void setup() {
  Serial.begin(115200);
  
  // Khởi động cảm biến
  dht.begin();

  Serial.println();
  Serial.println("--- KHOI DONG STATION C ---");
  Serial.print("Dang ket noi WiFi: ");
  Serial.println(ssid);

  WiFi.begin(ssid, password);

  // Chờ kết nối WiFi
  while(WiFi.status() != WL_CONNECTED){
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.println("WiFi Connected!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());

  // Bỏ qua xác thực chứng chỉ SSL 
  client.setInsecure();
}

void loop() {
  // 1. Đọc dữ liệu môi trường thực tế
  float humidity = dht.readHumidity();
  float temperature = dht.readTemperature();
  int gas = analogRead(GAS_PIN); 

  // Kiểm tra lỗi kết nối với DHT22
  if (isnan(humidity) || isnan(temperature)) {
    Serial.println("Loi: Khong the doc du lieu tu DHT22!");
    delay(2000);
    return; 
  }

  // 2. Chuẩn bị gửi lên Firebase
  HTTPClient http;
  String url = DATABASE_URL + "/stationC.json";

  String json = "{";
  json += "\"temperature\":" + String(temperature, 1) + ",";
  json += "\"humidity\":" + String(humidity, 1) + ",";
  json += "\"gas\":" + String(gas);
  json += "}";

  Serial.println("--------------------------------");
  Serial.println("Dang gui STATION C len Firebase...");
  Serial.println("URL: " + url);
  Serial.println("Data: " + json);

  http.begin(client, url);
  http.addHeader("Content-Type", "application/json");

  // 3. Đẩy dữ liệu đi và nhận mã phản hồi
  int httpCode = http.PUT(json);

  if (httpCode > 0) {
    Serial.print("HTTP Code: ");
    Serial.println(httpCode);
    String response = http.getString();
    Serial.println("Response: " + response);
  } else {
    Serial.print("Loi HTTP: ");
    Serial.println(http.errorToString(httpCode));
  }

  http.end();

  // Chờ 3 giây cho vòng lặp tiếp theo
  delay(3000);
}