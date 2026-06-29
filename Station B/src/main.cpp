#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include "DHT.h" // Thêm thư viện để đọc DHT22

// Cấu hình chân kết nối dựa trên file diagram.json
#define DHTPIN 4       // Chân SDA của DHT22 nối với GPIO 4
#define DHTTYPE DHT22  // Loại cảm biến là DHT22
#define GAS_PIN 34     // Chân AOUT của cảm biến Gas nối với GPIO 34

// Cấu hình mạng WiFi Wokwi
const char* ssid = "Wokwi-GUEST";
const char* password = "";

// Đường dẫn Firebase (Đã sửa lỗi .comcom thành .com)
String DATABASE_URL = "https://smart-d6b1d-default-rtdb.firebaseio.com";

WiFiClientSecure client;
DHT dht(DHTPIN, DHTTYPE); // Khởi tạo đối tượng cảm biến DHT

void setup() {
  Serial.begin(115200);
  Serial.println();
  Serial.println("ESP32 FIREBASE & SENSOR TEST - STATION B"); // Đã cập nhật nhãn in ra

  // Khởi động cảm biến DHT
  dht.begin();

  // Bắt đầu kết nối WiFi
  Serial.print("Dang ket noi WiFi: ");
  Serial.print(ssid);
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.println("WiFi Connected!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());

  // Bỏ qua xác thực chứng chỉ SSL (phù hợp cho mục đích test)
  client.setInsecure();
}

void loop() {
  // 1. Đọc dữ liệu từ cảm biến thực tế
  float humidity = dht.readHumidity();
  float temperature = dht.readTemperature();
  int gas = analogRead(GAS_PIN); // Đọc giá trị Analog từ cảm biến khí gas

  // Kiểm tra nếu lỗi đọc cảm biến DHT thì báo ra Serial và bỏ qua lần gửi này
  if (isnan(humidity) || isnan(temperature)) {
    Serial.println("Loi: Khong the doc du lieu tu DHT22!");
    delay(2000);
    return; 
  }

  // 2. Chuẩn bị dữ liệu gửi lên Firebase
  HTTPClient http;
  
  // Giữ nguyên định tuyến vào trạm B
  String url = DATABASE_URL + "/stationB.json";

  // Tạo chuỗi JSON chứa dữ liệu thật
  String json = "{";
  json += "\"temperature\":" + String(temperature, 1) + ","; // Lấy 1 chữ số thập phân
  json += "\"humidity\":" + String(humidity, 1) + ",";
  json += "\"gas\":" + String(gas);
  json += "}";

  Serial.println("--------------------------------");
  Serial.println("Dang gui len Firebase...");
  Serial.println("Data: " + json);

  // 3. Thực hiện gửi HTTP PUT
  http.begin(client, url);
  http.addHeader("Content-Type", "application/json");

  int httpCode = http.PUT(json);

  // 4. Kiểm tra phản hồi từ server
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

  // Chờ 3 giây trước khi đọc và gửi lần tiếp theo
  delay(3000); 
}