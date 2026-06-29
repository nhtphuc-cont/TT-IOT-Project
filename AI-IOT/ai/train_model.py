import pandas as pd
import numpy as np
import joblib
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error

print("Đang đọc dữ liệu và chuẩn bị Sliding Window...")
df = pd.read_csv("dataset_timeseries.csv")

# Số lượng bước thời gian trong quá khứ dùng để dự đoán tương lai
WINDOW_SIZE = 5 

# Tạo các cột trễ (lagged features)
def create_lagged_features(data, window_size):
    df_lagged = pd.DataFrame()
    for i in range(window_size, -1, -1):
        if i == 0:
            df_lagged['target_temp'] = data['temperature'].shift(-1)
            df_lagged['target_hum'] = data['humidity'].shift(-1)
            df_lagged['target_gas'] = data['gas'].shift(-1)
        else:
            df_lagged[f'temp_t-{i}'] = data['temperature'].shift(window_size - i)
            df_lagged[f'hum_t-{i}'] = data['humidity'].shift(window_size - i)
            df_lagged[f'gas_t-{i}'] = data['gas'].shift(window_size - i)
    return df_lagged.dropna()

data_processed = create_lagged_features(df, WINDOW_SIZE)

# X (Input): Dữ liệu của 5 bước thời gian trước đó
X = data_processed.drop(columns=['target_temp', 'target_hum', 'target_gas'])
# y (Output): Dữ liệu của bước thời gian tiếp theo (Multi-output)
y = data_processed[['target_temp', 'target_hum', 'target_gas']]

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, shuffle=False) # Không shuffle để giữ nguyên tính chuỗi thời gian

print("Đang huấn luyện mô hình RandomForest Regressor...")
model = RandomForestRegressor(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

# Đánh giá sai số
predictions = model.predict(X_test)
mae_temp = mean_absolute_error(y_test['target_temp'], predictions[:, 0])
mae_gas = mean_absolute_error(y_test['target_gas'], predictions[:, 2])

print(f"Sai số trung bình (MAE) Nhiệt độ: {mae_temp:.2f} °C")
print(f"Sai số trung bình (MAE) Khí Gas: {mae_gas:.2f}")

joblib.dump(model, "rf_regressor.pkl")
print("Đã lưu mô hình: rf_regressor.pkl")