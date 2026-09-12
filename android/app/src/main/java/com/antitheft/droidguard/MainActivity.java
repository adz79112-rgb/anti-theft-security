package com.antitheft.droidguard;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(SimCardPlugin.class);
        registerPlugin(EmergencySmsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
