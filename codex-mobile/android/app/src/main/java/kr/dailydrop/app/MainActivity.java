package kr.dailydrop.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.os.Build;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel("edition", "저녁판 발행", NotificationManager.IMPORTANCE_DEFAULT);
            channel.setDescription("데일리드롭의 새 호 발행 알림");
            getSystemService(NotificationManager.class).createNotificationChannel(channel);
        }
    }
}
