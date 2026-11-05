package com.adhdsop.sop;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.provider.Settings;

import androidx.core.app.NotificationCompat;

public class AlarmReceiver extends BroadcastReceiver {
    static final String CHANNEL_ID = "sop-reminder";

    @Override
    public void onReceive(Context ctx, Intent intent) {
        int id = intent.getIntExtra("id", 1);
        String title = intent.getStringExtra("title");
        String body = intent.getStringExtra("body");
        if (title == null) title = "⏰ 回主线提醒";

        NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel ch = new NotificationChannel(CHANNEL_ID, "回主线提醒",
                    NotificationManager.IMPORTANCE_HIGH);
            ch.setSound(Settings.System.DEFAULT_NOTIFICATION_URI, null);
            ch.enableVibration(true);
            ch.setVibrationPattern(new long[]{0, 300, 200, 300});
            nm.createNotificationChannel(ch);
        }

        // 点击通知回到 App
        Intent launch = ctx.getPackageManager().getLaunchIntentForPackage(ctx.getPackageName());
        PendingIntent contentIntent = PendingIntent.getActivity(ctx, id + 5000, launch,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        Notification n = new NotificationCompat.Builder(ctx, CHANNEL_ID)
                .setContentTitle(title)
                .setContentText(body)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setSound(Settings.System.DEFAULT_NOTIFICATION_URI)
                .setVibrate(new long[]{0, 300, 200, 300})
                .setAutoCancel(true)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setContentIntent(contentIntent)
                .build();
        nm.notify(id, n);

        // 提醒已响，停掉保活前台服务
        ctx.stopService(new Intent(ctx, ReminderService.class));
    }
}
