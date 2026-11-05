package com.adhdsop.sop;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;

import androidx.core.app.NotificationCompat;

public class ReminderService extends Service {
    static final String CHANNEL_ID = "sop-reminder";
    static final int FOREGROUND_ID = 9001;

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) return START_NOT_STICKY;
        int id = intent.getIntExtra("id", 1);
        String title = intent.getStringExtra("title");
        String body = intent.getStringExtra("body");
        long triggerAt = intent.getLongExtra("triggerAtMillis", 0);

        // 前台保活：常驻通知让系统/兼容层不敢冻结进程
        startForeground(FOREGROUND_ID, buildForeground(body));

        // 系统级精准闹钟（setAlarmClock 不受 Doze / 后台限制影响）
        scheduleAlarm(this, id, title, body, triggerAt);
        return START_STICKY;
    }

    private Notification buildForeground(String body) {
        ensureChannel();
        String text = (body != null ? body : "") + "（计时中，到点会提醒你）";
        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("\u23F1 计时中")
                .setContentText(text)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setOngoing(true)
                .setSound(null)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .build();
    }

    static void scheduleAlarm(Context ctx, int id, String title, String body, long triggerAt) {
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        Intent i = new Intent(ctx, AlarmReceiver.class);
        i.putExtra("id", id);
        i.putExtra("title", title);
        i.putExtra("body", body);
        PendingIntent pi = PendingIntent.getBroadcast(ctx, id, i,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            // 系统级闹钟：最高优先级，设备会被唤醒并准时送达
            am.setAlarmClock(new AlarmManager.AlarmClockInfo(triggerAt, null), pi);
        } else {
            am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi);
        }
    }

    static void cancelAlarm(Context ctx, int id) {
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        Intent i = new Intent(ctx, AlarmReceiver.class);
        PendingIntent pi = PendingIntent.getBroadcast(ctx, id, i,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        am.cancel(pi);
    }

    static void ensureChannel(Context ctx) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
            NotificationChannel ch = new NotificationChannel(CHANNEL_ID, "回主线提醒",
                    NotificationManager.IMPORTANCE_HIGH);
            ch.setSound(android.provider.Settings.System.DEFAULT_NOTIFICATION_URI, null);
            ch.enableVibration(true);
            ch.setVibrationPattern(new long[]{0, 300, 200, 300});
            nm.createNotificationChannel(ch);
        }
    }

    private void ensureChannel() {
        ensureChannel(this);
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onDestroy() {
        stopForeground(true);
        super.onDestroy();
    }
}
