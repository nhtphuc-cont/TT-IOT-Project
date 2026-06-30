package com.example.smartroom; // Đảm bảo giữ đúng tên package của bạn

import android.os.Bundle;
import android.widget.Switch;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;

import com.google.firebase.database.DataSnapshot;
import com.google.firebase.database.DatabaseError;
import com.google.firebase.database.DatabaseReference;
import com.google.firebase.database.FirebaseDatabase;
import com.google.firebase.database.ValueEventListener;

public class MainActivity extends AppCompatActivity {

    // Khai báo các TextView hiển thị cho 3 trạm
    private TextView txtTempA, txtHumA, txtGasA;
    private TextView txtTempB, txtHumB, txtGasB;
    private TextView txtTempC, txtHumC, txtGasC;

    // Khai báo Nút gạt (Switch) cho quạt ở Station A
    private Switch switchFanA;

    private FirebaseDatabase database;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        // 1. Ánh xạ các thành phần UI từ file XML
        initUI();

        // 2. Khởi tạo Firebase kết nối tới đúng URL Database
        database = FirebaseDatabase.getInstance("https://smart-d6b1d-default-rtdb.firebaseio.com");

        // 3. Lắng nghe dữ liệu thời gian thực (Nhiệt độ, độ ẩm, Gas) từ 3 Trạm
        listenToStation("stationA", txtTempA, txtHumA, txtGasA);
        listenToStation("stationB", txtTempB, txtHumB, txtGasB);
        listenToStation("stationC", txtTempC, txtHumC, txtGasC);

        // 4. Thiết lập điều khiển và lắng nghe trạng thái Quạt
        setupFanControl();
    }

    private void initUI() {
        txtTempA = findViewById(R.id.txtTempA);
        txtHumA = findViewById(R.id.txtHumA);
        txtGasA = findViewById(R.id.txtGasA);

        txtTempB = findViewById(R.id.txtTempB);
        txtHumB = findViewById(R.id.txtHumB);
        txtGasB = findViewById(R.id.txtGasB);

        txtTempC = findViewById(R.id.txtTempC);
        txtHumC = findViewById(R.id.txtHumC);
        txtGasC = findViewById(R.id.txtGasC);

        // Ánh xạ Switch quạt
        switchFanA = findViewById(R.id.switchFanA);
    }

    // Xử lý riêng biệt cho việc điều khiển Quạt
    private void setupFanControl() {
        DatabaseReference fanRef = database.getReference("stationA").child("fan_state");

        // A. Lắng nghe trạng thái hiện tại của quạt từ Firebase để cập nhật tự động nút Switch
        fanRef.addValueEventListener(new ValueEventListener() {
            @Override
            public void onDataChange(@NonNull DataSnapshot snapshot) {
                if (snapshot.exists()) {
                    Boolean fanState = snapshot.getValue(Boolean.class);
                    if (fanState != null) {
                        switchFanA.setChecked(fanState);
                    }
                }
            }

            @Override
            public void onCancelled(@NonNull DatabaseError error) {
            }
        });

        // B. Gửi lệnh điều khiển lên Firebase khi người dùng chạm tay nhấn Switch trên điện thoại
        switchFanA.setOnClickListener(v -> {
            boolean isChecked = switchFanA.isChecked();
            fanRef.setValue(isChecked).addOnSuccessListener(aVoid -> {
                String msg = isChecked ? "Đã BẬT quạt Station A!" : "Đã TẮT quạt Station A!";
                Toast.makeText(MainActivity.this, msg, Toast.LENGTH_SHORT).show();
            });
        });
    }

    // Hàm dùng chung để lắng nghe thay đổi thông số cảm biến của từng station
    private void listenToStation(String stationName, final TextView txtTemp, final TextView txtHum, final TextView txtGas) {
        DatabaseReference stationRef = database.getReference(stationName);

        stationRef.addValueEventListener(new ValueEventListener() {
            @Override
            public void onDataChange(@NonNull DataSnapshot snapshot) {
                if (snapshot.exists()) {
                    // Lấy Object ra trước để tránh cảnh báo NullPointerException
                    Object tempObj = snapshot.child("temperature").getValue();
                    Object humObj = snapshot.child("humidity").getValue();
                    Object gasObj = snapshot.child("gas").getValue();

                    String temp = tempObj != null ? tempObj.toString() : "--";
                    String hum = humObj != null ? humObj.toString() : "--";
                    String gas = gasObj != null ? gasObj.toString() : "--";

                    // Cập nhật lên UI giao diện điện thoại
                    txtTemp.setText(String.format("Nhiệt độ: %s °C", temp));
                    txtHum.setText(String.format("Độ ẩm: %s %%", hum));
                    txtGas.setText(String.format("Khí Gas (MQ135): %s", gas));
                }
            }

            @Override
            public void onCancelled(@NonNull DatabaseError error) {
                // Xử lý khi có lỗi kết nối
            }
        });
    }
}