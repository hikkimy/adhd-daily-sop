package com.adhdsop.sop;

import com.getcapacitor.Plugin;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.PluginCall;
import com.getcapacitor.JSObject;
import android.content.Intent;
import android.content.Context;

@CapacitorPlugin(name = "ReminderAlarms")
public class ReminderPlugin extends Plugin {

    @PluginMethod
    public void schedule(PluginCall call) {
        int id = call.getInt("id", 1);
        String title = call.getString("title", "回主线提醒");
        String body = call.getString("body", "");
        double triggerDouble = call.getDouble("triggerAtMillis", 0.0);
        long triggerAt = (long) triggerDouble;
        Context ctx = getContext();
        Intent service = new Intent(ctx, ReminderService.class);
        service.putExtra("id", id);
        service.putExtra("title", title);
        service.putExtra("body", body);
        service.putExtra("triggerAtMillis", triggerAt);
        ctx.startForegroundService(service);
        JSObject ret = new JSObject();
        ret.put("ok", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void cancel(PluginCall call) {
        int id = call.getInt("id", 1);
        Context ctx = getContext();
        ctx.stopService(new Intent(ctx, ReminderService.class));
        ReminderService.cancelAlarm(ctx, id);
        call.resolve();
    }
}
