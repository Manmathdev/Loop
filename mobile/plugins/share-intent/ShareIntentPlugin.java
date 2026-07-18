package com.loopback.app.plugins;

import android.content.Intent;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "ShareIntent")
public class ShareIntentPlugin extends Plugin {

  @PluginMethod
  public void getSharedUrl(PluginCall call) {
    Intent intent = getActivity().getIntent();
    String url = null;

    if (intent != null
        && Intent.ACTION_SEND.equals(intent.getAction())
        && "text/plain".equals(intent.getType())) {
      String shared = intent.getStringExtra(Intent.EXTRA_TEXT);
      if (shared != null) {
        for (String word : shared.split("\\s+")) {
          if (word.startsWith("http://") || word.startsWith("https://")) {
            url = word;
            break;
          }
        }
      }
    }

    JSObject ret = new JSObject();
    ret.put("url", url);
    ret.put("received", url != null);
    call.resolve(ret);
  }

  @PluginMethod
  public void clear(PluginCall call) {
    getActivity().setIntent(new Intent());
    call.resolve();
  }
}
