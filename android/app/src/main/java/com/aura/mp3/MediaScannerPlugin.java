package com.aura.mp3;

import android.content.ContentUris;
import android.database.Cursor;
import android.net.Uri;
import android.provider.MediaStore;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "MediaScanner")
public class MediaScannerPlugin extends Plugin {

    @PluginMethod
    public void getLocalSongs(PluginCall call) {
        JSArray songsList = new JSArray();
        Uri uri = MediaStore.Audio.Media.EXTERNAL_CONTENT_URI;
        String selection = MediaStore.Audio.Media.IS_MUSIC + "!= 0";
        String sortOrder = MediaStore.Audio.Media.TITLE + " ASC";

        String[] projection = {
            MediaStore.Audio.Media._ID,
            MediaStore.Audio.Media.TITLE,
            MediaStore.Audio.Media.ARTIST,
            MediaStore.Audio.Media.DURATION,
            MediaStore.Audio.Media.ALBUM
        };

        try (Cursor cursor = getContext().getContentResolver().query(uri, projection, selection, null, sortOrder)) {
            if (cursor != null) {
                int idColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media._ID);
                int titleColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.TITLE);
                int artistColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ARTIST);
                int durationColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DURATION);
                int albumColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ALBUM);

                while (cursor.moveToNext()) {
                    long id = cursor.getLong(idColumn);
                    String title = cursor.getString(titleColumn);
                    String artist = cursor.getString(artistColumn);
                    long duration = cursor.getLong(durationColumn);
                    String album = cursor.getString(albumColumn);

                    Uri contentUri = ContentUris.withAppendedId(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, id);

                    JSObject song = new JSObject();
                    song.put("id", String.valueOf(id));
                    song.put("title", title != null ? title : "Unknown Title");
                    song.put("artist", (artist == null || artist.equals("<unknown>")) ? "Unknown Artist" : artist);
                    song.put("album", album != null ? album : "Unknown Album");
                    song.put("duration", duration / 1000);
                    song.put("url", contentUri.toString());

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
