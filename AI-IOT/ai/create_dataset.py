import numpy as np
import pandas as pd
import math

# Khởi tạo thông số
num_samples = 3000
rows = []

# Mô phỏng thời gian trôi qua
for t in range(num_samples):
    # Tạo chu kỳ mượt mà bằng hàm sin/cos (chu kỳ dài)
    base_temp = 28 + 10 * math.sin(t / 200) # Nhiệt độ dao động 18 - 38 độ
    base_hum = 65 + 20 * math.cos(t / 250)  # Độ ẩm dao động 45 - 85%
    
    # Khí gas thường ổn định ở mức thấp, thỉnh thoảng có những đợt tăng đột biến (spikes)
    base_gas = 400
    if t % 500 > 450: # Mỗi 500 bước, có 50 bước khí gas tăng mạnh
        base_gas += 1000 * math.sin((t % 500 - 450) / 10)

    # Thêm nhiễu ngẫu nhiên của cảm biến
    temp = base_temp + np.random.normal(0, 0.5)
    hum = base_hum + np.random.normal(0, 1.0)
    gas = base_gas + np.random.normal(0, 15.0)

    # Đảm bảo dữ liệu không bị phi thực tế
    temp = max(0, min(60, temp))
    hum = max(0, min(100, hum))
    gas = max(0, min(4000, gas))

    rows.append([temp, hum, gas])

df = pd.DataFrame(rows, columns=["temperature", "humidity", "gas"])
df.to_csv("dataset_timeseries.csv", index=False)

print("Đã tạo dataset chuỗi thời gian: dataset_timeseries.csv")