package com.aura.mp3;

import android.Manifest;
import android.content.ContentUris;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.provider.MediaStore;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "MediaScanner",
    permissions = {
        @Permission(
            strings = { Manifest.permission.READ_MEDIA_AUDIO },
            alias = "audio"
        ),
        @Permission(
            strings = { Manifest.permission.READ_EXTERNAL_STORAGE },
            alias = "storage"
        )
    }
)
public class MediaScannerPlugin extends Plugin {

    @PluginMethod
    public void getLocalSongs(PluginCall call) {
        String permAlias = Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU ? "audio" : "storage";
        
        if (getPermissionState(permAlias) != com.getcapacitor.PermissionState.GRANTED) {
            requestPermissionForAlias(permAlias, call, "permissionCallback");
        } else {
            scanSongs(call);
        }
    }

    @PermissionCallback
    private void permissionCallback(PluginCall call) {
        scanSongs(call);
    }

    private void scanSongs(PluginCall call) {
        JSArray songsList = new JSArray();
        Uri uri = MediaStore.Audio.Media.EXTERNAL_CONTENT_URI;
        
        String selection = MediaStore.Audio.Media.IS_MUSIC + " != 0 AND " 
                         + MediaStore.Audio.Media.DURATION + " >= 30000";
        String sortOrder = MediaStore.Audio.Media.TITLE + " ASC";

        String[] projection = {
            MediaStore.Audio.Media._ID,
            MediaStore.Audio.Media.TITLE,
            MediaStore.Audio.Media.ARTIST,
            MediaStore.Audio.Media.DURATION,
            MediaStore.Audio.Media.ALBUM,
            MediaStore.Audio.Media.DATA
        };

        try (Cursor cursor = getContext().getContentResolver().query(uri, projection, selection, null, sortOrder)) {
            if (cursor != null) {
                int idColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media._ID);
                int titleColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.TITLE);
                int artistColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ARTIST);
                int durationColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DURATION);
                int albumColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ALBUM);
                int dataColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DATA);

                while (cursor.moveToNext()) {
                    String path = cursor.getString(dataColumn);
                    
                    if (path != null) {
                        String lowerPath = path.toLowerCase();
                        if (lowerPath.contains("/whatsapp/") ||
                            lowerPath.contains("/telegram/") ||
                            lowerPath.contains("/notifications/") ||
                            lowerPath.contains("/ringtones/") ||
                            lowerPath.contains("/alarms/") ||
                            lowerPath.contains("/recordings/") ||
                            lowerPath.contains("/cache/")) {
                            continue;
                        }
                    }

                    long id = cursor.getLong(idColumn);
                    String title = cursor.getString(titleColumn);
                    String artist = cursor.getString(artistColumn);
                    long duration = cursor.getLong(durationColumn);
                    String album = cursor.getString(albumColumn);

                    // Create Capacitor-friendly WebView URL (_capacitor_file_)
                    String playableUrl = "";
                    if (path != null && !path.isEmpty()) {
                        playableUrl = "http://localhost/_capacitor_file_" + path;
                    } else {
                        playableUrl = ContentUris.withAppendedId(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, id).toString();
                    }

                    JSObject song = new JSObject();
                    song.put("id", String.valueOf(id));
                    song.put("title", (title != null && !title.trim().isEmpty()) ? title : "Unknown Title");
                    song.put("artist", (artist == null || artist.equals("<unknown>")) ? "Unknown Artist" : artist);
                    song.put("album", album != null ? album : "Unknown Album");
                    song.put("duration", duration / 1000);
                    song.put("url", playableUrl);

                    songsList.put(song);
                }
            }
            JSObject result = new JSObject();
            result.put("songs", songsList);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Error scanning audio files: " + e.getMessage());
        }
    }
}
