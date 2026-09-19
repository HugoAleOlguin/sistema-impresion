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
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
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

import com.google.android.material.bottomsheet.BottomSheetDialog;

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

    // Constantes para identificar qué lanzó el file picker
    private static final int MODE_NONE = 0;
    private static final int MODE_DOCUMENT = 1;
    private static final int MODE_GALLERY = 2;
    private static final int MODE_CAMERA = 3;

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
    private int currentPickerMode = MODE_NONE;

    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    // ── Launcher 1: Documentos (ACTION_OPEN_DOCUMENT) ──────────────────────────
    private final ActivityResultLauncher<Intent> documentLauncher = registerForActivityResult(
            new ActivityResultContracts.StartActivityForResult(),
            result -> {
                if (uploadMessageCallback == null) return;
                Uri[] uris = null;
                if (result.getResultCode() == RESULT_OK && result.getData() != null) {
                    Intent data = result.getData();
                    if (data.getClipData() != null) {
                        int count = data.getClipData().getItemCount();
                        uris = new Uri[count];
                        for (int i = 0; i < count; i++) {
                            uris[i] = data.getClipData().getItemAt(i).getUri();
                        }
                    } else if (data.getData() != null) {
                        uris = new Uri[]{data.getData()};
                    }
                }
                deliverResult(uris);
            }
    );

    // ── Launcher 2: Galería (ACTION_PICK / Photo Picker) ───────────────────────
    private final ActivityResultLauncher<Intent> galleryLauncher = registerForActivityResult(
            new ActivityResultContracts.StartActivityForResult(),
            result -> {
                if (uploadMessageCallback == null) return;
                Uri[] uris = null;
                if (result.getResultCode() == RESULT_OK && result.getData() != null) {
                    Intent data = result.getData();
                    if (data.getClipData() != null) {
                        int count = data.getClipData().getItemCount();
                        uris = new Uri[count];
                        for (int i = 0; i < count; i++) {
                            uris[i] = data.getClipData().getItemAt(i).getUri();
                        }
                    } else if (data.getData() != null) {
                        uris = new Uri[]{data.getData()};
                    }
                }
                deliverResult(uris);
            }
    );

    // ── Launcher 3: Cámara (ACTION_IMAGE_CAPTURE) ──────────────────────────────
    private final ActivityResultLauncher<Intent> cameraLauncher = registerForActivityResult(
            new ActivityResultContracts.StartActivityForResult(),
            result -> {
                if (uploadMessageCallback == null) return;
                Uri[] uris = null;
                if (result.getResultCode() == RESULT_OK) {
                    if (cameraImageUri != null) {
                        uris = new Uri[]{cameraImageUri};
                    } else if (result.getData() != null && result.getData().getData() != null) {
                        uris = new Uri[]{result.getData().getData()};
                    }
                }
                deliverResult(uris);
            }
    );

    // ── Launcher: Permiso cámara ────────────────────────────────────────────────
    private final ActivityResultLauncher<String> cameraPermissionLauncher = registerForActivityResult(
            new ActivityResultContracts.RequestPermission(),
            granted -> {
                if (granted) {
                    launchCamera();
                } else {
                    Toast.makeText(this, "Se requiere permiso de cámara", Toast.LENGTH_SHORT).show();
                    deliverResult(null);
                }
            }
    );

    // ── Entrega el resultado al WebView ────────────────────────────────────────
    private void deliverResult(Uri[] uris) {
        if (uploadMessageCallback != null) {
            uploadMessageCallback.onReceiveValue(uris);
            uploadMessageCallback = null;
        }
        currentPickerMode = MODE_NONE;
    }

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

        // ── Deshabilitar SwipeRefresh: la app debe sentirse nativa, no recargarse ──
        swipeRefresh.setEnabled(false);

        loadAppConfig();
        setupWebView();

        retryButton.setOnClickListener(v -> resolveAndConnect());

        resolveAndConnect();
    }

    // ── BottomSheet nativo con 3 opciones claras ────────────────────────────────
    private void showFilePickerBottomSheet() {
        BottomSheetDialog sheet = new BottomSheetDialog(this, R.style.BottomSheetStyle);

        // Construir el layout programáticamente (sin XML extra)
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(dp(20), dp(20), dp(20), dp(32));
        root.setBackgroundResource(android.R.color.transparent);

        // Título
        TextView title = new TextView(this);
        title.setText("¿Qué querés imprimir?");
        title.setTextSize(17f);
        title.setTextColor(0xFF0F172A);
        title.setTypeface(null, android.graphics.Typeface.BOLD);
        title.setPadding(dp(4), 0, 0, dp(16));
        root.addView(title);

        // Botón DOCUMENTOS (PDF / Word)
        Button btnDoc = makeSheetButton(
                "📄  DOCUMENTOS  —  PDF o Word",
                0xFFEFF6FF, 0xFF3B82F6, 0xFF1D4ED8);
        btnDoc.setOnClickListener(v -> {
            sheet.dismiss();
            launchDocumentPicker();
        });
        root.addView(btnDoc);
        root.addView(spacer(10));

        // Botón GALERÍA
        Button btnGallery = makeSheetButton(
                "🖼  GALERÍA  —  Fotos del teléfono",
                0xFFF0FDF4, 0xFF22C55E, 0xFF15803D);
        btnGallery.setOnClickListener(v -> {
            sheet.dismiss();
            launchGalleryPicker();
        });
        root.addView(btnGallery);
        root.addView(spacer(10));

        // Botón CÁMARA
        Button btnCamera = makeSheetButton(
                "📷  CÁMARA  —  Sacar foto ahora",
                0xFFFFF7ED, 0xFFF97316, 0xFFC2410C);
        btnCamera.setOnClickListener(v -> {
            sheet.dismiss();
            requestCameraAndLaunch();
        });
        root.addView(btnCamera);
        root.addView(spacer(8));

        // Botón Cancelar (Botón nativo estilizado)
        Button btnCancel = new Button(this);
        btnCancel.setText("Cancelar");
        btnCancel.setTextColor(0xFF475569);
        btnCancel.setTextSize(15f);
        btnCancel.setAllCaps(false);
        btnCancel.setTypeface(null, android.graphics.Typeface.BOLD);

        android.graphics.drawable.GradientDrawable cancelBg = new android.graphics.drawable.GradientDrawable();
        cancelBg.setShape(android.graphics.drawable.GradientDrawable.RECTANGLE);
        cancelBg.setCornerRadius(dp(12));
        cancelBg.setColor(0xFFF1F5F9);
        btnCancel.setBackground(cancelBg);

        LinearLayout.LayoutParams cancelLp = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, dp(48));
        cancelLp.topMargin = dp(6);
        btnCancel.setLayoutParams(cancelLp);

        btnCancel.setOnClickListener(v -> {
            sheet.dismiss();
            deliverResult(null);
        });
        root.addView(btnCancel);

        sheet.setOnDismissListener(dialog -> {
            if (currentPickerMode == MODE_NONE && uploadMessageCallback != null) {
                deliverResult(null);
            }
        });

        sheet.setContentView(root);
        sheet.show();
    }

    // ── Helper: crea botón de opción para el BottomSheet ──────────────────────
    private Button makeSheetButton(String text, int bgColor, int borderColor, int textColor) {
        Button btn = new Button(this);
        btn.setText(text);
        btn.setAllCaps(false);
        btn.setTextSize(15f);
        btn.setTextColor(textColor);
        btn.setGravity(Gravity.START | Gravity.CENTER_VERTICAL);
        btn.setPadding(dp(16), dp(14), dp(16), dp(14));

        // Fondo con borde redondeado (programático)
        android.graphics.drawable.GradientDrawable bg = new android.graphics.drawable.GradientDrawable();
        bg.setShape(android.graphics.drawable.GradientDrawable.RECTANGLE);
        bg.setCornerRadius(dp(12));
        bg.setColor(bgColor);
        bg.setStroke(dp(2), borderColor);
        btn.setBackground(bg);

        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        btn.setLayoutParams(lp);
        return btn;
    }

    private View spacer(int heightDp) {
        View v = new View(this);
        v.setLayoutParams(new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, dp(heightDp)));
        return v;
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    // ── Lanzadores de cada modo ────────────────────────────────────────────────
    private void launchDocumentPicker() {
        currentPickerMode = MODE_DOCUMENT;
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("*/*");
        intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
        intent.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{
                "application/pdf",
                "application/msword",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "application/rtf",
                "text/plain"
        });
        documentLauncher.launch(intent);
    }

    private void launchGalleryPicker() {
        currentPickerMode = MODE_GALLERY;
        // Android 13+ tiene Photo Picker nativo (MediaStore.ACTION_PICK_IMAGES)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            Intent intent = new Intent(MediaStore.ACTION_PICK_IMAGES);
            intent.putExtra(MediaStore.EXTRA_PICK_IMAGES_MAX, 10);
            galleryLauncher.launch(intent);
        } else {
            // Para Android <13: galería clásica con selección múltiple
            Intent intent = new Intent(Intent.ACTION_PICK,
                    MediaStore.Images.Media.EXTERNAL_CONTENT_URI);
            intent.setType("image/*");
            intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
            galleryLauncher.launch(intent);
        }
    }

    private void requestCameraAndLaunch() {
        currentPickerMode = MODE_CAMERA;
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
                == PackageManager.PERMISSION_GRANTED) {
            launchCamera();
        } else {
            cameraPermissionLauncher.launch(Manifest.permission.CAMERA);
        }
    }

    private void launchCamera() {
        Intent intent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
        try {
            String stamp = new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(new Date());
            File dir = getExternalFilesDir(Environment.DIRECTORY_PICTURES);
            File photo = File.createTempFile("IMG_" + stamp + "_", ".jpg", dir);
            cameraImageUri = FileProvider.getUriForFile(
                    this,
                    getApplicationContext().getPackageName() + ".fileprovider",
                    photo);
            intent.putExtra(MediaStore.EXTRA_OUTPUT, cameraImageUri);
            cameraLauncher.launch(intent);
        } catch (Exception e) {
            Toast.makeText(this, "No se pudo abrir la cámara", Toast.LENGTH_SHORT).show();
            deliverResult(null);
        }
    }

    // ── Config ─────────────────────────────────────────────────────────────────
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

    // ── WebView ─────────────────────────────────────────────────────────────────
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
                if (url.startsWith("whatsapp://") || url.startsWith("https://wa.me/")
                        || url.startsWith("https://api.whatsapp.com/")) {
                    try {
                        startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
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
                            if (ContextCompat.checkSelfPermission(MainActivity.this,
                                    Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
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
            public boolean onShowFileChooser(WebView wv, ValueCallback<Uri[]> filePathCallback,
                                              FileChooserParams params) {
                // Cancelar cualquier callback anterior sin entregar resultado
                if (uploadMessageCallback != null) {
                    uploadMessageCallback.onReceiveValue(null);
                    uploadMessageCallback = null;
                }
                uploadMessageCallback = filePathCallback;

                // Mostrar el BottomSheet nativo en lugar del chooser genérico del sistema
                runOnUiThread(() -> showFilePickerBottomSheet());
                return true;
            }
        });
    }

    // ── Resolución de conexión ─────────────────────────────────────────────────
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
            String localUrl = probeLocalLan();
            if (localUrl != null) {
                runOnUiThread(() -> loadUrlInApp(localUrl, "Conectado por Wi-Fi Local (Alta Velocidad)"));
                return;
            }

            runOnUiThread(() -> subStatusText.setText("Conectando mediante túnel remoto (Datos Móviles)..."));
            String remoteUrl = fetchRemoteUrlFromGitHub();
            if (remoteUrl != null && !remoteUrl.isEmpty()) {
                runOnUiThread(() -> loadUrlInApp(remoteUrl, "Conectado mediante Túnel Remoto"));
                return;
            }

            runOnUiThread(() -> showErrorState(getString(R.string.offline_msg)));
        });
    }

    private String probeLocalLan() {
        List<String> candidates = new ArrayList<>();
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        String cachedIp = prefs.getString(KEY_CACHED_IP, null);
        if (cachedIp != null) candidates.add(cachedIp);

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
                    if (tunnelUrl.startsWith("https://")) return tunnelUrl;
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

        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setCookie(targetUrl, "kiosco_auth=" + kioscoSecret + "; Path=/; SameSite=Lax");
        cookieManager.flush();

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
