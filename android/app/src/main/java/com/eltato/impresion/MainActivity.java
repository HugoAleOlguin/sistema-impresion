package com.eltato.impresion;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.net.Uri;
import android.net.wifi.WifiManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.text.format.Formatter;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.File;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class MainActivity extends AppCompatActivity {

    private static final String PREFS_NAME = "ElTatoPrefs";
    private static final String KEY_CACHED_IP = "cached_server_ip";

    private WebView webView;
    private SwipeRefreshLayout swipeRefresh;
    private LinearLayout loadingLayout;
    private ProgressBar progressBar;
    private TextView statusText;
    private TextView subStatusText;
    private Button retryButton;

    private String gistId = "b54b662325e0b7066773fc7debc574b6";
    private String kioscoSecret = "eltato_1cfb4fdb4212d591808c821f88c6d2a4";
    private int localPort = 3000;

    private String currentActiveUrl = "";
    private ValueCallback<Uri[]> uploadMessageCallback;
    private Uri cameraImageUri;

    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    // Launcher para selector de archivos / cámara
    private final ActivityResultLauncher<Intent> fileChooserLauncher = registerForActivityResult(
            new ActivityResultContracts.StartActivityForResult(),
            result -> {
                if (uploadMessageCallback == null) return;
                Uri[] results = null;
                if (result.getResultCode() == RESULT_OK) {
                    Intent data = result.getData();
                    if (data != null) {
                        String dataString = data.getDataString();
                        if (data.getClipData() != null) {
                            final int count = data.getClipData().getItemCount();
                            results = new Uri[count];
                            for (int i = 0; i < count; i++) {
                                results[i] = data.getClipData().getItemAt(i).getUri();
                            }
                        } else if (dataString != null) {
                            results = new Uri[]{Uri.parse(dataString)};
                        }
                    }
                    if (results == null && cameraImageUri != null) {
                        File cameraFile = new File(cameraImageUri.getPath());
                        if (cameraFile.exists() || cameraImageUri.toString().startsWith("content://")) {
                            results = new Uri[]{cameraImageUri};
                        }
                    }
                }
                uploadMessageCallback.onReceiveValue(results);
                uploadMessageCallback = null;
            }
    );

    // Launcher para permisos de cámara
    private final ActivityResultLauncher<String> cameraPermissionLauncher = registerForActivityResult(
            new ActivityResultContracts.RequestPermission(),
            isGranted -> {
                if (!isGranted) {
                    Toast.makeText(this, "Se requiere permiso de cámara para tomar fotos", Toast.LENGTH_SHORT).show();
                }
            }
    );

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        webView = findViewById(R.id.webView);
        swipeRefresh = findViewById(R.id.swipeRefresh);
        loadingLayout = findViewById(R.id.loadingLayout);
        progressBar = findViewById(R.id.progressBar);
        statusText = findViewById(R.id.statusText);
        subStatusText = findViewById(R.id.subStatusText);
        retryButton = findViewById(R.id.retryButton);

        loadAppConfig();
        setupWebView();

        swipeRefresh.setOnRefreshListener(() -> {
            if (webView.getVisibility() == View.VISIBLE && !currentActiveUrl.isEmpty()) {
                webView.reload();
            } else {
                resolveAndConnect();
            }
            swipeRefresh.setRefreshing(false);
        });

        retryButton.setOnClickListener(v -> resolveAndConnect());

        // Iniciar resolución inteligente de conexión
        resolveAndConnect();
    }

    private void loadAppConfig() {
        try {
            InputStream is = getAssets().open("app_config.json");
            BufferedReader reader = new BufferedReader(new InputStreamReader(is));
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) sb.append(line);
            reader.close();

            JSONObject json = new JSONObject(sb.toString());
            gistId = json.optString("gistId", gistId);
            kioscoSecret = json.optString("kioscoSecret", kioscoSecret);
            localPort = json.optInt("localPort", 3000);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void setupWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        settings.setUserAgentString(settings.getUserAgentString() + " ElTatoKioscoApp/1.0");

        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        cookieManager.setAcceptThirdPartyCookies(webView, true);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                loadingLayout.setVisibility(View.GONE);
                webView.setVisibility(View.VISIBLE);
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) {
                    showErrorState("Error al cargar la página (" + error.getDescription() + ")");
                }
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                if (url.startsWith("whatsapp://") || url.startsWith("https://wa.me/") || url.startsWith("https://api.whatsapp.com/")) {
                    try {
                        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                        startActivity(intent);
                        return true;
                    } catch (Exception ignored) {}
                }
                return false;
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(() -> {
                    for (String resource : request.getResources()) {
                        if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource)) {
                            if (ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.CAMERA)
                                    == PackageManager.PERMISSION_GRANTED) {
                                request.grant(request.getResources());
                            } else {
                                cameraPermissionLauncher.launch(Manifest.permission.CAMERA);
                            }
                            return;
                        }
                    }
                    request.grant(request.getResources());
                });
            }

            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback,
                                              FileChooserParams fileChooserParams) {
                if (uploadMessageCallback != null) {
                    uploadMessageCallback.onReceiveValue(null);
                }
                uploadMessageCallback = filePathCallback;

                Intent takePictureIntent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
                File photoFile = null;
                try {
                    String timeStamp = new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(new Date());
                    File storageDir = getExternalFilesDir(Environment.DIRECTORY_PICTURES);
                    photoFile = File.createTempFile("JPEG_" + timeStamp + "_", ".jpg", storageDir);
                    cameraImageUri = FileProvider.getUriForFile(
                            MainActivity.this,
                            getApplicationContext().getPackageName() + ".fileprovider",
                            photoFile
                    );
                    takePictureIntent.putExtra(MediaStore.EXTRA_OUTPUT, cameraImageUri);
                } catch (Exception ex) {
                    takePictureIntent = null;
                }

                Intent contentSelectionIntent = new Intent(Intent.ACTION_GET_CONTENT);
                contentSelectionIntent.addCategory(Intent.CATEGORY_OPENABLE);
                contentSelectionIntent.setType("*/*");
                contentSelectionIntent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
                contentSelectionIntent.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{
                        "application/pdf",
                        "image/*",
                        "application/msword",
                        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                });

                Intent[] intentArray;
                if (takePictureIntent != null) {
                    intentArray = new Intent[]{takePictureIntent};
                } else {
                    intentArray = new Intent[0];
                }

                Intent chooserIntent = new Intent(Intent.ACTION_CHOOSER);
                chooserIntent.putExtra(Intent.EXTRA_INTENT, contentSelectionIntent);
                chooserIntent.putExtra(Intent.EXTRA_TITLE, "Seleccionar documento o foto");
                chooserIntent.putExtra(Intent.EXTRA_INITIAL_INTENTS, intentArray);

                fileChooserLauncher.launch(chooserIntent);
                return true;
            }
        });
    }

    private void resolveAndConnect() {
        runOnUiThread(() -> {
            webView.setVisibility(View.GONE);
            loadingLayout.setVisibility(View.VISIBLE);
            progressBar.setVisibility(View.VISIBLE);
            retryButton.setVisibility(View.GONE);
            statusText.setText(R.string.connecting);
            subStatusText.setText("Buscando servidor en red local (Wi-Fi)...");
        });

        executor.execute(() -> {
            // 1. Probar red local Wi-Fi primero
            String localSuccessUrl = probeLocalLan();
            if (localSuccessUrl != null) {
                runOnUiThread(() -> loadUrlInApp(localSuccessUrl, "Conectado por Wi-Fi Local (Alta Velocidad)"));
                return;
            }

            // 2. Si no responde en Wi-Fi local, buscar en GitHub Gist (Modo Datos Móviles 4G / Túnel)
            runOnUiThread(() -> subStatusText.setText("Conectando mediante túnel remoto (Datos Móviles)..."));
            String remoteUrl = fetchRemoteUrlFromGitHub();
            if (remoteUrl != null && !remoteUrl.isEmpty()) {
                runOnUiThread(() -> loadUrlInApp(remoteUrl, "Conectado mediante Túnel Remoto"));
                return;
            }

            // 3. Si ambos fallan
            runOnUiThread(() -> showErrorState(getString(R.string.offline_msg)));
        });
    }

    private String probeLocalLan() {
        List<String> candidates = new ArrayList<>();

        // Revisar IP cacheada previamente
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        String cachedIp = prefs.getString(KEY_CACHED_IP, null);
        if (cachedIp != null) candidates.add(cachedIp);

        // Si está en Wi-Fi, calcular subred local
        ConnectivityManager cm = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
        NetworkInfo activeNetwork = cm.getActiveNetworkInfo();
        boolean isWiFi = activeNetwork != null && activeNetwork.getType() == ConnectivityManager.TYPE_WIFI;

        if (isWiFi) {
            WifiManager wm = (WifiManager) getApplicationContext().getSystemService(WIFI_SERVICE);
            if (wm != null) {
                int ipAddress = wm.getConnectionInfo().getIpAddress();
                String ipString = Formatter.formatIpAddress(ipAddress);
                if (ipString != null && ipString.contains(".")) {
                    String prefix = ipString.substring(0, ipString.lastIndexOf('.') + 1);
                    // Probar gateway habitual .1 y la IP de la máquina detectada .193
                    candidates.add(prefix + "193");
                    candidates.add(prefix + "100");
                    candidates.add(prefix + "1");
                }
            }
        }

        for (String ip : candidates) {
            String target = "http://" + ip + ":" + localPort;
            if (pingServer(target)) {
                prefs.edit().putString(KEY_CACHED_IP, ip).apply();
                return target;
            }
        }
        return null;
    }

    private boolean pingServer(String baseUrl) {
        try {
            URL url = new URL(baseUrl + "/api/config");
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setConnectTimeout(1200);
            conn.setReadTimeout(1200);
            conn.setRequestMethod("GET");
            int code = conn.getResponseCode();
            conn.disconnect();
            return (code == 200);
        } catch (Exception e) {
            return false;
        }
    }

    private String fetchRemoteUrlFromGitHub() {
        try {
            String endpoint = "https://api.github.com/gists/" + gistId + "?t=" + System.currentTimeMillis();
            URL url = new URL(endpoint);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setConnectTimeout(4000);
            conn.setReadTimeout(4000);
            conn.setRequestMethod("GET");
            conn.setRequestProperty("User-Agent", "ElTato-Android-App");
            conn.setRequestProperty("Accept", "application/vnd.github+json");

            if (conn.getResponseCode() == 200) {
                BufferedReader reader = new BufferedReader(new InputStreamReader(conn.getInputStream()));
                StringBuilder sb = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) sb.append(line);
                reader.close();
                conn.disconnect();

                JSONObject gistJson = new JSONObject(sb.toString());
                JSONObject files = gistJson.getJSONObject("files");
                if (files.has("kiosco_tunnel.json")) {
                    JSONObject fileObj = files.getJSONObject("kiosco_tunnel.json");
                    String contentStr = fileObj.getString("content");
                    JSONObject tunnelData = new JSONObject(contentStr);
                    String tunnelUrl = tunnelData.optString("url", "");
                    if (tunnelUrl.startsWith("https://")) {
                        return tunnelUrl;
                    }
                }
            }
            conn.disconnect();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return null;
    }

    private void loadUrlInApp(String targetUrl, String connectionType) {
        currentActiveUrl = targetUrl;
        subStatusText.setText(connectionType);

        // Inyectar cookie de autenticación
        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setCookie(targetUrl, "kiosco_auth=" + kioscoSecret + "; Path=/; SameSite=Lax");
        cookieManager.flush();

        // Si es URL remota de Cloudflare, concatenar ?token=
        String finalUrl = targetUrl;
        if (targetUrl.contains(".trycloudflare.com")) {
            finalUrl = targetUrl + "/?token=" + kioscoSecret;
        }

        webView.loadUrl(finalUrl);
    }

    private void showErrorState(String message) {
        progressBar.setVisibility(View.GONE);
        statusText.setText("Sin conexión");
        subStatusText.setText(message);
        retryButton.setVisibility(View.VISIBLE);
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
