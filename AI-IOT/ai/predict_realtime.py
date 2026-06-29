import sys
import time
import joblib
import firebase_admin
from firebase_admin import credentials
from firebase_admin import db

sys.stdout.reconfigure(encoding="utf-8")

# Khởi tạo Firebase
cred = credentials.Certificate("serviceAccountKey.json")
firebase_admin.initialize_app(cred, {
    "databaseURL": "https://smart-d6b1d-default-rtdb.firebaseio.com"
})

print("Đang load mô hình AI dự báo...")
model = joblib.load("rf_regressor.pkl")
WINDOW_SIZE = 5

# Bộ đệm lưu trữ dữ liệu quá khứ cho từng trạm
station_buffers = {
    "stationA": [],
    "stationB": [],
    "stationC": []
}

def predict_station(station_name):
    sensor = db.reference(station_name).get()
    if not sensor:
        return

    temp = float(sensor.get("temperature", 0))
    hum = float(sensor.get("humidity", 0))
    gas = float(sensor.get("gas", 0))

    buffer = station_buffers[station_name]
    buffer.append([temp, hum, gas])

    # Giữ kích thước buffer luôn đúng bằng WINDOW_SIZE
    if len(buffer) > WINDOW_SIZE:
        buffer.pop(0)

    # Nếu chưa đủ dữ liệu (mới bật hệ thống), chưa dự báo
    if len(buffer) < WINDOW_SIZE:
        print(f"[{station_name}] Đang thu thập dữ liệu... ({len(buffer)}/{WINDOW_SIZE})")
        return

    # Trải phẳng buffer thành 1 mảng 1D (15 giá trị) để đưa vào model
    input_data = []
    for reading in buffer:
        input_data.extend(reading)
    
    # Dự đoán
    prediction = model.predict([input_data])[0]
    pred_temp, pred_hum, pred_gas = prediction[0], prediction[1], prediction[2]

    # Cảnh báo dựa trên mức ĐÃ DỰ BÁO
    status = "Bình thường"
    if pred_gas > 1500 or pred_temp > 40:
        status = "Nguy cơ cháy nổ trong tương lai gần"
    elif pred_gas > 700:
        status = "Dự báo bắt đầu ô nhiễm"

    current_time = time.ctime()

    # Ghi kết quả dự báo lên Firebase (nhánh riêng biệt)
    db.reference(f"forecast/{station_name}").set({
        "pred_temp": round(pred_temp, 1),
        "pred_hum": round(pred_hum, 1),
        "pred_gas": round(pred_gas, 0),
        "status": status,
        "time": current_time
    })

    print(f"[{station_name}] Hiện tại: T={temp}°C, G={gas} | DỰ BÁO: T={pred_temp:.1f}°C, G={pred_gas:.0f} -> {status}")

def process_all_stations():
    for station in ["stationA", "stationB", "stationC"]:
        try:
            predict_station(station)
        except Exception as e:
            print(f"Lỗi {station}: {e}")

print("\n====================================")
print(" AI DỰ BÁO TƯƠNG LAI HỆ THỐNG IOT ")
print("====================================\n")

while True:
    process_all_stations()
    time.sleep(3) # Cứ 3 giây lấy mẫu 1 lần