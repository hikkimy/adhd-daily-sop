package com.adhdsop.sop;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        // 必须在 super.onCreate 之前注册，bridge 构建时即纳入，JS 端才能调用到
        registerPlugin(ReminderPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
