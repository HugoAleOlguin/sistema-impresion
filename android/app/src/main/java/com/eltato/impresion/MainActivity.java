package com.eltato.impresion;

import android.Manifest;
import android.content.ContentResolver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.net.Uri;
import android.net.wifi.WifiManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.provider.OpenableColumns;
import android.text.format.Formatter;
import android.util.Base64;
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
import android.os.Handler;
import android.os.Looper;
import android.webkit.WebResourceResponse;
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
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.io.PrintWriter;
import java.net.HttpURLConnection;
import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.net.URL;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.Enumeration;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;

public class MainActivity extends AppCompatActivity {

    private static final String PREFS_NAME = "ElTatoPrefs";
    private static final String KEY_CACHED_IP = "cached_server_ip";
    private static final String KEY_CACHED_URL = "cached_kiosco_url";
    private static final String KEY_CACHED_TIME = "cached_kiosco_time";
    private static final long MAX_SESSION_VALIDITY_MS = 12 * 60 * 60 * 1000L; // 12 horas

    private boolean isConnectionActive = false;
    private boolean isResolvingConnection = false;
    private final AtomicInteger resolutionCounter = new AtomicInteger(0);

    // Constantes para identificar qué lanzó el file picker
    private static final int MODE_NONE = 0;
    private static final int MODE_DOCUMENT = 1;
    private static final int MODE_GALLERY = 2;
    private static final int MODE_CAMERA = 3;

    private WebView webView;
    private SwipeRefreshLayout swipeRefresh;
    private volatile String pendingSharedResultJson = null;

    private String gistId = "b54b662325e0b7066773fc7debc574b6";
    private String kioscoSecret = "eltato_1cfb4fdb4212d591808c821f88c6d2a4";
    private int localPort = 3000;
    private String defaultLanIp = "192.168.100.193";
    private String githubUsername = "HugoAleOlguin";
    private String githubToken = "";
    private boolean isDarkMode = false;

    // ── Archivos compartidos pendientes de subida directa (WhatsApp / Galería) ──
    private final List<File> pendingSharedFiles = Collections.synchronizedList(new ArrayList<>());
    private final AtomicBoolean isUploadingShared = new AtomicBoolean(false);

    public class WebAppInterface {
        @android.webkit.JavascriptInterface
        public void notifyTheme(String theme) {
            runOnUiThread(() -> isDarkMode = "dark".equalsIgnoreCase(theme));
        }

        @android.webkit.JavascriptInterface
        public String getPendingSharedResult() {
            String result = pendingSharedResultJson;
            pendingSharedResultJson = null;
            return result;
        }
    }

    private String currentActiveUrl = "";
    private ValueCallback<Uri[]> uploadMessageCallback;
    private Uri cameraImageUri;
    private int currentPickerMode = MODE_NONE;

    private final ExecutorService executor = Executors.newCachedThreadPool();
    private final Handler retryHandler = new Handler(Looper.getMainLooper());
    private Runnable retryRunnable;
    private long connectionSessionStartTime = 0L;
    private static final long MAX_SILENT_DISCOVERY_MS = 12000L;

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

        // ── Deshabilitar SwipeRefresh: la app debe sentirse nativa, no recargarse ──
        swipeRefresh.setEnabled(false);

        loadAppConfig();
        setupWebView();

        handleShareIntent(getIntent());

        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        String rawCachedUrl = prefs.getString(KEY_CACHED_URL, null);
        String cachedUrl = extractOrigin(rawCachedUrl);

        if (cachedUrl != null && !cachedUrl.isEmpty()) {
            currentActiveUrl = cachedUrl;
            loadUrlInApp(cachedUrl);
        } else {
            String fallbackUrl = "http://" + defaultLanIp + ":" + localPort;
            currentActiveUrl = fallbackUrl;
            loadUrlInApp(fallbackUrl);
        }

        // Conexión y chequeo en segundo plano
        startConnectionFlow(false);
    }

    // ── BottomSheet nativo con opciones dinámicas y Modo Oscuro ──────────────
    private void showFilePickerBottomSheet(boolean isImageOnly, boolean isDark) {
        int sheetStyle = isDark ? R.style.BottomSheetStyleDark : R.style.BottomSheetStyleLight;
        BottomSheetDialog sheet = new BottomSheetDialog(this, sheetStyle);

        // Construir el layout programáticamente
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(dp(20), dp(20), dp(20), dp(32));

        // Fondo con borde superior redondeado adaptativo
        android.graphics.drawable.GradientDrawable sheetBg = new android.graphics.drawable.GradientDrawable();
        sheetBg.setShape(android.graphics.drawable.GradientDrawable.RECTANGLE);
        sheetBg.setCornerRadii(new float[]{dp(20), dp(20), dp(20), dp(20), 0, 0, 0, 0});
        sheetBg.setColor(isDark ? 0xFF151E2E : 0xFFFFFFFF);
        root.setBackground(sheetBg);

        // Título
        TextView title = new TextView(this);
        title.setText(isImageOnly ? "Sumar otra foto" : "¿Qué querés imprimir?");
        title.setTextSize(17f);
        title.setTextColor(isDark ? 0xFFF8FAFC : 0xFF0F172A);
        title.setTypeface(null, android.graphics.Typeface.BOLD);
        title.setPadding(dp(4), 0, 0, dp(16));
        root.addView(title);

        // Botón DOCUMENTOS (PDF / Word) — sólo visible si no es exclusivo de imágenes
        if (!isImageOnly) {
            int docBg = isDark ? 0xFF1E293B : 0xFFEFF6FF;
            int docBorder = 0xFF3B82F6;
            int docText = isDark ? 0xFF93C5FD : 0xFF1D4ED8;
            Button btnDoc = makeSheetButton(
                    "📄  DOCUMENTOS  —  PDF o Word",
                    docBg, docBorder, docText);
            btnDoc.setOnClickListener(v -> {
                sheet.dismiss();
                launchDocumentPicker();
            });
            root.addView(btnDoc);
            root.addView(spacer(10));
        }

        // Botón GALERÍA
        int galBg = isDark ? 0xFF142B20 : 0xFFF0FDF4;
        int galBorder = 0xFF22C55E;
        int galText = isDark ? 0xFF86EFAC : 0xFF15803D;
        Button btnGallery = makeSheetButton(
                "🖼  GALERÍA  —  Fotos del teléfono",
                galBg, galBorder, galText);
        btnGallery.setOnClickListener(v -> {
            sheet.dismiss();
            launchGalleryPicker();
        });
        root.addView(btnGallery);
        root.addView(spacer(10));

        // Botón CÁMARA
        int camBg = isDark ? 0xFF2D1B11 : 0xFFFFF7ED;
        int camBorder = 0xFFF97316;
        int camText = isDark ? 0xFFFDBA74 : 0xFFC2410C;
        Button btnCamera = makeSheetButton(
                "📷  CÁMARA  —  Sacar foto ahora",
                camBg, camBorder, camText);
        btnCamera.setOnClickListener(v -> {
            sheet.dismiss();
            requestCameraAndLaunch();
        });
        root.addView(btnCamera);
        root.addView(spacer(8));

        // Botón Cancelar (Botón nativo estilizado adaptativo)
        Button btnCancel = new Button(this);
        btnCancel.setText("Cancelar");
        btnCancel.setTextColor(isDark ? 0xFFCBD5E1 : 0xFF475569);
        btnCancel.setTextSize(15f);
        btnCancel.setAllCaps(false);
        btnCancel.setTypeface(null, android.graphics.Typeface.BOLD);

        android.graphics.drawable.GradientDrawable cancelBg = new android.graphics.drawable.GradientDrawable();
        cancelBg.setShape(android.graphics.drawable.GradientDrawable.RECTANGLE);
        cancelBg.setCornerRadius(dp(12));
        cancelBg.setColor(isDark ? 0xFF243042 : 0xFFF1F5F9);
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

        sheet.setOnShowListener(dialog -> {
            View bottomSheet = sheet.findViewById(com.google.android.material.R.id.design_bottom_sheet);
            if (bottomSheet != null) {
                bottomSheet.setBackground(sheetBg);
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
            defaultLanIp = json.optString("defaultLanIp", defaultLanIp);
            githubUsername = json.optString("githubUsername", githubUsername);
            githubToken = json.optString("githubToken", githubToken);
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

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            try {
                android.webkit.ServiceWorkerController swController = android.webkit.ServiceWorkerController.getInstance();
                swController.setServiceWorkerClient(new android.webkit.ServiceWorkerClient() {
                    @Override
                    public WebResourceResponse shouldInterceptRequest(WebResourceRequest request) {
                        return super.shouldInterceptRequest(request);
                    }
                });
            } catch (Exception ignored) {}
        }

        webView.addJavascriptInterface(new WebAppInterface(), "KioscoNativeApp");

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                isConnectionActive = true;
                isResolvingConnection = false;
                connectionSessionStartTime = 0L;

                if (url != null && !url.equals("about:blank") && !url.startsWith("data:")) {
                    String origin = extractOrigin(url);
                    currentActiveUrl = origin;
                    getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
                            .edit()
                            .putString(KEY_CACHED_URL, origin)
                            .putLong(KEY_CACHED_TIME, System.currentTimeMillis())
                            .apply();
                }

                deliverPendingSharedResultIfReady();
                triggerPendingSharedUpload();
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request != null && request.isForMainFrame()) {
                    String desc = (error != null && error.getDescription() != null) ? error.getDescription().toString() : "";

                    // Ignorar cancelaciones normales de navegación del WebView (evita loop infinito de reintentos)
                    if (desc.contains("ERR_ABORTED") || desc.contains("net::ERR_ABORTED")) {
                        return;
                    }
                    if (error != null && error.getErrorCode() == WebViewClient.ERROR_CONNECT && desc.isEmpty()) {
                        return;
                    }

                    isConnectionActive = false;

                    // Solo invalidar si el host es inexistente o rechazó la conexión
                    if (desc.contains("ERR_NAME_NOT_RESOLVED") || desc.contains("ERR_CONNECTION_REFUSED") || desc.contains("ERR_ADDRESS_UNREACHABLE")) {
                        getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
                                .edit()
                                .remove(KEY_CACHED_URL)
                                .apply();
                    }

                    // Conexión silenciosa y rápida al túnel nuevo o IP local
                    connectionSessionStartTime = System.currentTimeMillis();
                    startConnectionFlow(true);
                }
            }

            @Override
            public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse errorResponse) {
                if (request != null && request.isForMainFrame()) {
                    int statusCode = errorResponse != null ? errorResponse.getStatusCode() : 0;
                    // Solo reconectar si el túnel Cloudflare devolvió 502, 503 o 504 (túnel caído)
                    if (statusCode == 502 || statusCode == 503 || statusCode == 504) {
                        isConnectionActive = false;
                        getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
                                .edit()
                                .remove(KEY_CACHED_URL)
                                .apply();

                        connectionSessionStartTime = System.currentTimeMillis();
                        startConnectionFlow(true);
                    }
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

                boolean isImageOnly = false;
                if (params != null && params.getAcceptTypes() != null) {
                    String[] types = params.getAcceptTypes();
                    if (types.length > 0) {
                        boolean hasDocs = false;
                        boolean hasImages = false;
                        for (String t : types) {
                            if (t == null) continue;
                            String lower = t.toLowerCase();
                            if (lower.contains("pdf") || lower.contains("word") || lower.contains("doc") || lower.contains("*/*")) {
                                hasDocs = true;
                            }
                            if (lower.contains("image")) {
                                hasImages = true;
                            }
                        }
                        if (hasImages && !hasDocs) {
                            isImageOnly = true;
                        }
                    }
                }

                final boolean onlyPhotos = isImageOnly;
                webView.evaluateJavascript("document.documentElement.getAttribute('data-theme')", themeVal -> {
                    boolean isDark = isDarkMode;
                    if (themeVal != null) {
                        if (themeVal.contains("dark")) isDark = true;
                        else if (themeVal.contains("light")) isDark = false;
                    } else {
                        isDark = (getResources().getConfiguration().uiMode & android.content.res.Configuration.UI_MODE_NIGHT_MASK)
                                == android.content.res.Configuration.UI_MODE_NIGHT_YES;
                    }
                    final boolean finalDark = isDark;
                    runOnUiThread(() -> showFilePickerBottomSheet(onlyPhotos, finalDark));
                });
                return true;
            }
        });
    }

    // ── Normalización de URL al origen (scheme://host:port) ─────────────────────
    private String extractOrigin(String urlStr) {
        if (urlStr == null || urlStr.trim().isEmpty()) return "";
        try {
            Uri uri = Uri.parse(urlStr.trim());
            String scheme = uri.getScheme();
            String host = uri.getHost();
            int port = uri.getPort();
            if (scheme != null && host != null) {
                if ((scheme.equalsIgnoreCase("http") && (port == -1 || port == 80)) ||
                    (scheme.equalsIgnoreCase("https") && (port == -1 || port == 443))) {
                    return scheme + "://" + host;
                }
                return scheme + "://" + host + (port > 0 ? ":" + port : "");
            }
        } catch (Exception ignored) {}

        String clean = urlStr.trim();
        int qIndex = clean.indexOf('?');
        if (qIndex != -1) clean = clean.substring(0, qIndex);
        int hIndex = clean.indexOf('#');
        if (hIndex != -1) clean = clean.substring(0, hIndex);
        while (clean.endsWith("/")) clean = clean.substring(0, clean.length() - 1);
        return clean;
    }

    // ── Resolución de conexión ultra-rápida y persistencia de sesión ─────────────
    private static class RemoteTunnelInfo {
        String url;
        String lanIp;
        String status;
    }

    private final AtomicBoolean connectionResolved = new AtomicBoolean(false);
    private RemoteTunnelInfo cachedTunnelInfo = null;
    private long lastTunnelFetchTime = 0L;

    private void startConnectionFlow(boolean forceFresh) {
        cancelPendingRetry();
        final int resId = resolutionCounter.incrementAndGet();
        isResolvingConnection = true;
        connectionResolved.set(false);

        if (connectionSessionStartTime == 0L) {
            connectionSessionStartTime = System.currentTimeMillis();
        }

        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        String rawCachedUrl = prefs.getString(KEY_CACHED_URL, null);
        String cachedUrl = extractOrigin(rawCachedUrl);
        long cachedTime = prefs.getLong(KEY_CACHED_TIME, 0L);
        boolean isSessionFresh = (System.currentTimeMillis() - cachedTime) < MAX_SESSION_VALIDITY_MS;

        List<Runnable> tasks = new ArrayList<>();

        // 1. TAREA PRIORITARIA: Sesión previa guardada
        if (!forceFresh && cachedUrl != null && !cachedUrl.isEmpty() && isSessionFresh) {
            final String fastUrl = cachedUrl;
            tasks.add(() -> {
                if (resolutionCounter.get() != resId || connectionResolved.get()) return;
                int timeout = fastUrl.startsWith("http://192.168.") ? 1000 : 2500;
                if (pingCandidate(fastUrl, timeout)) {
                    onCandidateWon(fastUrl, resId);
                }
            });
        }

        // 2. CANDIDATOS LAN (Red Local Wi-Fi de alta velocidad)
        Set<String> lanCandidates = new LinkedHashSet<>();
        if (defaultLanIp != null && !defaultLanIp.trim().isEmpty()) {
            lanCandidates.add(defaultLanIp.trim());
        }
        String cachedIp = prefs.getString(KEY_CACHED_IP, null);
        if (cachedIp != null && !cachedIp.trim().isEmpty() && !cachedIp.startsWith("0.")) {
            lanCandidates.add(cachedIp.trim());
        }
        List<String> devIps = getDeviceIPv4Addresses();
        for (String devIp : devIps) {
            int lastDot = devIp.lastIndexOf('.');
            if (lastDot > 0) {
                String prefix = devIp.substring(0, lastDot + 1);
                lanCandidates.add(prefix + "193");
                lanCandidates.add(prefix + "100");
                lanCandidates.add(prefix + "1");
            }
        }
        lanCandidates.add("192.168.100.193");
        lanCandidates.add("192.168.1.193");

        for (String ip : lanCandidates) {
            final String lanUrl = "http://" + ip + ":" + localPort;
            if (!forceFresh && cachedUrl != null && cachedUrl.equals(lanUrl)) continue;

            tasks.add(() -> {
                if (resolutionCounter.get() != resId || connectionResolved.get()) return;
                if (pingCandidate(lanUrl, 1200)) {
                    onCandidateWon(lanUrl, resId);
                }
            });
        }

        // 3. CANDIDATO NUBE (Túnel Cloudflare + Gist)
        tasks.add(() -> {
            if (resolutionCounter.get() != resId || connectionResolved.get()) return;
            RemoteTunnelInfo info = fetchRemoteTunnelInfo(forceFresh);
            if (info != null && resolutionCounter.get() == resId && !connectionResolved.get()) {
                // Probar IP LAN de la PC reportada por el túnel
                if (info.lanIp != null && !info.lanIp.isEmpty() && !lanCandidates.contains(info.lanIp)) {
                    String gistLan = "http://" + info.lanIp + ":" + localPort;
                    if (!connectionResolved.get() && pingCandidate(gistLan, 1200)) {
                        onCandidateWon(gistLan, resId);
                        return;
                    }
                }

                // Probar el túnel Cloudflare
                if (info.url != null && info.url.startsWith("https://") && !connectionResolved.get()) {
                    String cleanTunnel = extractOrigin(info.url);
                    if (pingCandidate(cleanTunnel, 3500)) {
                        onCandidateWon(cleanTunnel, resId);
                    }
                }
            }
        });

        // Lanzar todas las tareas en paralelo
        AtomicInteger pendingCounter = new AtomicInteger(tasks.size());
        for (Runnable task : tasks) {
            executor.execute(() -> {
                try {
                    if (resolutionCounter.get() == resId && !connectionResolved.get()) {
                        task.run();
                    }
                } finally {
                    checkAllTasksFinished(pendingCounter, resId);
                }
            });
        }
    }

    private void onCandidateWon(String targetUrl, int resId) {
        if (resolutionCounter.get() != resId) return;
        if (connectionResolved.compareAndSet(false, true)) {
            String origin = extractOrigin(targetUrl);
            SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
            prefs.edit()
                    .putString(KEY_CACHED_URL, origin)
                    .putLong(KEY_CACHED_TIME, System.currentTimeMillis())
                    .apply();

            try {
                Uri uri = Uri.parse(origin);
                if (uri.getHost() != null && (uri.getHost().startsWith("192.168.") || uri.getHost().startsWith("10."))) {
                    prefs.edit().putString(KEY_CACHED_IP, uri.getHost()).apply();
                }
            } catch (Exception ignored) {}

            runOnUiThread(() -> {
                if (resolutionCounter.get() == resId) {
                    loadUrlInApp(origin);
                    deliverPendingSharedResultIfReady();
                    triggerPendingSharedUpload();
                }
            });
        }
    }

    private void checkAllTasksFinished(AtomicInteger pendingTasks, int resId) {
        if (resolutionCounter.get() != resId) return;
        if (pendingTasks.decrementAndGet() <= 0) {
            if (resolutionCounter.get() == resId && !connectionResolved.get()) {
                runOnUiThread(() -> {
                    if (resolutionCounter.get() == resId && !connectionResolved.get()) {
                        long elapsed = System.currentTimeMillis() - connectionSessionStartTime;
                        long delay = (elapsed < MAX_SILENT_DISCOVERY_MS) ? 1000L : 6000L;
                        retryRunnable = () -> {
                            if (resolutionCounter.get() == resId && !connectionResolved.get()) {
                                startConnectionFlow(true);
                            }
                        };
                        retryHandler.postDelayed(retryRunnable, delay);
                    }
                });
            }
        }
    }

    private boolean pingCandidate(String baseUrl, int timeoutMs) {
        if (baseUrl == null || baseUrl.trim().isEmpty()) return false;
        HttpURLConnection conn = null;
        try {
            String origin = extractOrigin(baseUrl);
            if (origin == null || origin.isEmpty()) return false;
            String target = origin + "/api/config?token=" + kioscoSecret;

            URL url = new URL(target);
            conn = (HttpURLConnection) url.openConnection();
            conn.setConnectTimeout(timeoutMs);
            conn.setReadTimeout(timeoutMs);
            conn.setRequestMethod("GET");
            conn.setRequestProperty("User-Agent", "ElTato-Android-App");
            conn.setRequestProperty("X-Kiosco-Token", kioscoSecret);
            conn.setRequestProperty("Connection", "close");
            conn.setInstanceFollowRedirects(true);
            int code = conn.getResponseCode();

            // Consumir stream para evitar contaminación del socket pool en Android
            InputStream is = null;
            try {
                if (code >= 200 && code < 400) {
                    is = conn.getInputStream();
                } else {
                    is = conn.getErrorStream();
                }
                if (is != null) {
                    byte[] buf = new byte[256];
                    while (is.read(buf) > 0) {}
                    is.close();
                }
            } catch (Exception ignored) {}

            return (code >= 200 && code < 500);
        } catch (Exception ignored) {
            return false;
        } finally {
            if (conn != null) {
                try { conn.disconnect(); } catch (Exception ignored) {}
            }
        }
    }

    private List<String> getDeviceIPv4Addresses() {
        List<String> list = new ArrayList<>();
        try {
            Enumeration<NetworkInterface> interfaces = NetworkInterface.getNetworkInterfaces();
            while (interfaces.hasMoreElements()) {
                NetworkInterface iface = interfaces.nextElement();
                if (!iface.isUp() || iface.isLoopback()) continue;
                Enumeration<InetAddress> addresses = iface.getInetAddresses();
                while (addresses.hasMoreElements()) {
                    InetAddress addr = addresses.nextElement();
                    if (!addr.isLoopbackAddress() && addr instanceof Inet4Address) {
                        String host = addr.getHostAddress();
                        if (host != null && !host.isEmpty() && !host.startsWith("127.")) {
                            list.add(host);
                        }
                    }
                }
            }
        } catch (Exception ignored) {}
        return list;
    }

    private synchronized RemoteTunnelInfo fetchRemoteTunnelInfo(boolean forceFresh) {
        if (!forceFresh && cachedTunnelInfo != null && (System.currentTimeMillis() - lastTunnelFetchTime) < 120000L) {
            return cachedTunnelInfo;
        }

        // 1. Prioridad: API REST de GitHub en tiempo real (evita los 5 min de caché de Fastly CDN en Gist raw)
        RemoteTunnelInfo info = fetchGistViaApi();
        if (info == null || info.url == null || info.url.isEmpty()) {
            // 2. Fallback: Raw Gist URL
            info = fetchGistViaRaw();
        }

        if (info != null && info.url != null && !info.url.isEmpty()) {
            cachedTunnelInfo = info;
            lastTunnelFetchTime = System.currentTimeMillis();
            getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
                    .edit()
                    .putString("cached_raw_tunnel_url", extractOrigin(info.url))
                    .putString("cached_raw_tunnel_lan", info.lanIp)
                    .apply();
        } else {
            // 3. Fallback: último túnel guardado en preferencias
            String savedUrl = getSharedPreferences(PREFS_NAME, MODE_PRIVATE).getString("cached_raw_tunnel_url", null);
            if (savedUrl != null && !savedUrl.isEmpty()) {
                info = new RemoteTunnelInfo();
                info.url = savedUrl;
                info.lanIp = getSharedPreferences(PREFS_NAME, MODE_PRIVATE).getString("cached_raw_tunnel_lan", "");
                info.status = "online";
            }
        }
        return info;
    }

    private RemoteTunnelInfo fetchGistViaApi() {
        try {
            String endpoint = "https://api.github.com/gists/" + gistId + "?t=" + System.currentTimeMillis();
            URL url = new URL(endpoint);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setConnectTimeout(3000);
            conn.setReadTimeout(3000);
            conn.setRequestMethod("GET");
            conn.setRequestProperty("User-Agent", "ElTato-Android-App");
            conn.setRequestProperty("Accept", "application/vnd.github+json");
            conn.setRequestProperty("Connection", "close");
            if (githubToken != null && !githubToken.isEmpty()) {
                conn.setRequestProperty("Authorization", "Bearer " + githubToken);
            }

            int code = conn.getResponseCode();
            if (code == 200) {
                BufferedReader reader = new BufferedReader(new InputStreamReader(conn.getInputStream()));
                StringBuilder sb = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) sb.append(line);
                reader.close();
                conn.disconnect();

                JSONObject gistJson = new JSONObject(sb.toString());
                JSONObject files = gistJson.optJSONObject("files");
                if (files != null && files.has("kiosco_tunnel.json")) {
                    JSONObject fileObj = files.getJSONObject("kiosco_tunnel.json");
                    String contentStr = fileObj.getString("content");
                    return parseTunnelJson(contentStr);
                }
            }
            conn.disconnect();
        } catch (Exception ignored) {}
        return null;
    }

    private RemoteTunnelInfo fetchGistViaRaw() {
        try {
            String rawUrl = "https://gist.githubusercontent.com/" + githubUsername + "/" + gistId + "/raw/kiosco_tunnel.json?t=" + System.currentTimeMillis();
            URL url = new URL(rawUrl);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setConnectTimeout(3000);
            conn.setReadTimeout(3000);
            conn.setRequestMethod("GET");
            conn.setRequestProperty("User-Agent", "ElTato-Android-App");
            conn.setRequestProperty("Connection", "close");

            int code = conn.getResponseCode();
            if (code == 200) {
                BufferedReader reader = new BufferedReader(new InputStreamReader(conn.getInputStream()));
                StringBuilder sb = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) sb.append(line);
                reader.close();
                conn.disconnect();

                return parseTunnelJson(sb.toString());
            }
            conn.disconnect();
        } catch (Exception ignored) {}
        return null;
    }

    private RemoteTunnelInfo parseTunnelJson(String jsonStr) {
        try {
            JSONObject data = new JSONObject(jsonStr);
            RemoteTunnelInfo info = new RemoteTunnelInfo();
            info.url = data.optString("url", "").trim();
            info.lanIp = data.optString("lanIp", "").trim();
            info.status = data.optString("status", "").trim();
            return info;
        } catch (Exception e) {
            return null;
        }
    }

    private void loadUrlInApp(String targetUrl) {
        cancelPendingRetry();
        String origin = extractOrigin(targetUrl);
        if (origin.isEmpty()) return;
        currentActiveUrl = origin;

        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setCookie(origin, "kiosco_auth=" + kioscoSecret + "; Path=/; SameSite=Lax");
        cookieManager.flush();

        String finalUrl = origin;
        if (!finalUrl.contains("token=")) {
            finalUrl = finalUrl + "/?token=" + kioscoSecret;
        }

        String currentWebUrl = (webView != null && webView.getUrl() != null) ? extractOrigin(webView.getUrl()) : "";
        if (isConnectionActive && currentWebUrl.equals(origin)) {
            return;
        }

        webView.loadUrl(finalUrl);
    }

    private void cancelPendingRetry() {
        if (retryRunnable != null) {
            retryHandler.removeCallbacks(retryRunnable);
            retryRunnable = null;
        }
    }

    @Override
    protected void onStop() {
        super.onStop();
        cancelPendingRetry();
    }

    @Override
    protected void onStart() {
        super.onStart();
        // Si la conexión ya está activa y el WebView visible, NO recargar nada (mantiene la sesión sin parpadeos)
        if (isConnectionActive && webView != null && webView.getVisibility() == View.VISIBLE) {
            return;
        }
        // Sólo iniciar resolución si no hay sesión activa ni resolución en marcha
        if (!isConnectionActive && !isResolvingConnection) {
            startConnectionFlow(false);
        }
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        cancelPendingRetry();
        executor.shutdown();
    }

    // ── Manejo de Archivos Compartidos desde WhatsApp / Galería (Share Intent) ──
    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleShareIntent(intent);
    }

    private void handleShareIntent(Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();
        if (!Intent.ACTION_SEND.equals(action) && !Intent.ACTION_SEND_MULTIPLE.equals(action) && !Intent.ACTION_VIEW.equals(action)) {
            return;
        }

        executor.execute(() -> {
            try {
                pendingSharedFiles.clear();
                String type = intent.getType();

                if (Intent.ACTION_SEND.equals(action) || Intent.ACTION_VIEW.equals(action)) {
                    Uri uri = intent.getParcelableExtra(Intent.EXTRA_STREAM);
                    if (uri == null) {
                        uri = intent.getData();
                    }
                    if (uri == null && intent.getClipData() != null && intent.getClipData().getItemCount() > 0) {
                        uri = intent.getClipData().getItemAt(0).getUri();
                    }
                    if (uri != null) {
                        File saved = copyShareUriToCache(uri, type);
                        if (saved != null) {
                            pendingSharedFiles.add(saved);
                        }
                    }
                } else if (Intent.ACTION_SEND_MULTIPLE.equals(action)) {
                    ArrayList<Uri> uris = intent.getParcelableArrayListExtra(Intent.EXTRA_STREAM);
                    if (uris != null) {
                        for (Uri uri : uris) {
                            if (uri != null) {
                                File saved = copyShareUriToCache(uri, type);
                                if (saved != null) pendingSharedFiles.add(saved);
                            }
                        }
                    } else if (intent.getClipData() != null) {
                        for (int i = 0; i < intent.getClipData().getItemCount(); i++) {
                            Uri uri = intent.getClipData().getItemAt(i).getUri();
                            if (uri != null) {
                                File saved = copyShareUriToCache(uri, type);
                                if (saved != null) pendingSharedFiles.add(saved);
                            }
                        }
                    }
                }
            } finally {
                triggerPendingSharedUpload();
            }
        });
    }

    private File copyShareUriToCache(Uri uri, String explicitMime) {
        if (uri == null) return null;
        try {
            ContentResolver resolver = getContentResolver();
            String fileName = null;
            String mimeType = null;
            try {
                mimeType = resolver.getType(uri);
            } catch (Exception ignored) {}

            if (mimeType == null || mimeType.isEmpty() || "*/*".equals(mimeType)) {
                mimeType = explicitMime;
            }

            Cursor cursor = null;
            try {
                cursor = resolver.query(uri, null, null, null, null);
                if (cursor != null && cursor.moveToFirst()) {
                    int nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                    if (nameIndex >= 0) {
                        fileName = cursor.getString(nameIndex);
                    }
                }
            } catch (Exception ignored) {
            } finally {
                if (cursor != null) cursor.close();
            }

            if (fileName == null || fileName.trim().isEmpty()) {
                fileName = uri.getLastPathSegment();
            }
            if (fileName != null) {
                fileName = Uri.decode(fileName);
            }

            String lowerName = (fileName != null) ? fileName.toLowerCase(Locale.ROOT) : "";
            if (mimeType != null && mimeType.contains("pdf")) {
                if (!lowerName.endsWith(".pdf")) fileName = (fileName != null ? fileName : "documento") + ".pdf";
            } else if (mimeType != null && (mimeType.contains("jpeg") || mimeType.contains("jpg"))) {
                if (!lowerName.endsWith(".jpg") && !lowerName.endsWith(".jpeg")) fileName = (fileName != null ? fileName : "foto") + ".jpg";
            } else if (mimeType != null && mimeType.contains("png")) {
                if (!lowerName.endsWith(".png")) fileName = (fileName != null ? fileName : "foto") + ".png";
            } else if (lowerName.endsWith(".pdf")) {
                mimeType = "application/pdf";
            } else if (lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg")) {
                mimeType = "image/jpeg";
            } else if (lowerName.endsWith(".png")) {
                mimeType = "image/png";
            } else if (lowerName.endsWith(".docx")) {
                mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
            } else if (lowerName.endsWith(".doc")) {
                mimeType = "application/msword";
            }

            if (fileName == null || fileName.trim().isEmpty()) {
                fileName = "archivo_" + System.currentTimeMillis() + ".pdf";
            }

            fileName = fileName.replaceAll("[^a-zA-Z0-9._-]", "_");

            File cacheDir = new File(getCacheDir(), "shared_uploads");
            if (!cacheDir.exists()) cacheDir.mkdirs();

            File destFile = new File(cacheDir, System.currentTimeMillis() + "_" + fileName);

            InputStream is = resolver.openInputStream(uri);
            if (is == null) return null;

            FileOutputStream fos = new FileOutputStream(destFile);
            byte[] buffer = new byte[32768];
            int bytesRead;
            while ((bytesRead = is.read(buffer)) != -1) {
                fos.write(buffer, 0, bytesRead);
            }
            fos.flush();
            fos.close();
            is.close();

            if (destFile.exists() && destFile.length() > 0) {
                return destFile;
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return null;
    }

    private void triggerPendingSharedUpload() {
        if (!pendingSharedFiles.isEmpty() && currentActiveUrl != null && !currentActiveUrl.isEmpty()) {
            uploadSharedFiles(new ArrayList<>(pendingSharedFiles));
        }
    }

    private void uploadSharedFiles(final List<File> filesToUpload) {
        if (filesToUpload == null || filesToUpload.isEmpty()) return;
        if (currentActiveUrl == null || currentActiveUrl.trim().isEmpty()) return;

        final String baseUrl = extractOrigin(currentActiveUrl);
        if (baseUrl.isEmpty()) return;

        if (isUploadingShared.getAndSet(true)) {
            return;
        }

        final String uploadUrl = baseUrl + "/api/upload";

        runOnUiThread(() -> {
            String label = filesToUpload.size() == 1 ? filesToUpload.get(0).getName() : (filesToUpload.size() + " fotos");
            int uIdx = label.indexOf('_');
            if (uIdx > 0 && uIdx < label.length() - 1) label = label.substring(uIdx + 1);
            String safeLabel = label.replace("'", "\\'");
            webView.evaluateJavascript(
                "if (typeof window.showUploadProgress === 'function') { window.showUploadProgress('" + safeLabel + "', " + filesToUpload.size() + "); }",
                null
            );
        });

        executor.execute(() -> {
            HttpURLConnection conn = null;
            try {
                String boundary = "===" + System.currentTimeMillis() + "===";
                String LINE_FEED = "\r\n";
                URL url = new URL(uploadUrl);
                conn = (HttpURLConnection) url.openConnection();
                conn.setConnectTimeout(15000);
                conn.setReadTimeout(45000);
                conn.setUseCaches(false);
                conn.setDoOutput(true);
                conn.setDoInput(true);
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "multipart/form-data; boundary=" + boundary);
                conn.setRequestProperty("User-Agent", "ElTato-Android-App");
                conn.setRequestProperty("X-Kiosco-Token", kioscoSecret);
                conn.setRequestProperty("Cookie", "kiosco_auth=" + kioscoSecret + "; Path=/; SameSite=Lax");

                OutputStream outputStream = conn.getOutputStream();
                PrintWriter writer = new PrintWriter(new OutputStreamWriter(outputStream, "UTF-8"), true);

                for (File file : filesToUpload) {
                    if (!file.exists() || file.length() == 0) continue;
                    String originalName = file.getName();
                    int uIdx = originalName.indexOf('_');
                    if (uIdx > 0 && uIdx < originalName.length() - 1) {
                        originalName = originalName.substring(uIdx + 1);
                    }
                    String mime = getMimeTypeForFile(originalName);

                    writer.append("--" + boundary).append(LINE_FEED);
                    writer.append("Content-Disposition: form-data; name=\"documento\"; filename=\"" + originalName + "\"").append(LINE_FEED);
                    writer.append("Content-Type: " + mime).append(LINE_FEED);
                    writer.append(LINE_FEED).flush();

                    FileInputStream fis = new FileInputStream(file);
                    byte[] buffer = new byte[32768];
                    int len;
                    while ((len = fis.read(buffer)) != -1) {
                        outputStream.write(buffer, 0, len);
                    }
                    outputStream.flush();
                    fis.close();
                    writer.append(LINE_FEED).flush();
                }

                writer.append("--" + boundary + "--").append(LINE_FEED).flush();
                writer.close();

                int responseCode = conn.getResponseCode();
                if (responseCode >= 200 && responseCode < 300) {
                    BufferedReader reader = new BufferedReader(new InputStreamReader(conn.getInputStream()));
                    StringBuilder sb = new StringBuilder();
                    String line;
                    while ((line = reader.readLine()) != null) sb.append(line);
                    reader.close();

                    final String responseJson = sb.toString();
                    pendingSharedResultJson = responseJson;

                    for (File f : filesToUpload) {
                        try { f.delete(); } catch (Exception ignored) {}
                    }
                    pendingSharedFiles.removeAll(filesToUpload);

                    deliverPendingSharedResultIfReady();
                } else {
                    runOnUiThread(() -> {
                        webView.evaluateJavascript(
                            "if (typeof window.hideUploadProgress === 'function') window.hideUploadProgress(); if (typeof window.showInlineNotice === 'function') window.showInlineNotice('Error en servidor al procesar archivo', 'error');",
                            null
                        );
                    });
                }
            } catch (Exception e) {
                e.printStackTrace();
                runOnUiThread(() -> {
                    webView.evaluateJavascript(
                        "if (typeof window.hideUploadProgress === 'function') window.hideUploadProgress(); if (typeof window.showInlineNotice === 'function') window.showInlineNotice('No se pudo subir el archivo: verifique conexión', 'error');",
                        null
                    );
                });
                startConnectionFlow(true);
            } finally {
                isUploadingShared.set(false);
                if (conn != null) {
                    try { conn.disconnect(); } catch (Exception ignored) {}
                }
            }
        });
    }

    private void deliverPendingSharedResultIfReady() {
        if (pendingSharedResultJson == null || webView == null) return;
        runOnUiThread(() -> {
            if (pendingSharedResultJson == null) return;
            webView.evaluateJavascript(
                "(typeof window.onSharedFileUploaded === 'function')",
                value -> {
                    if ("true".equals(value) && pendingSharedResultJson != null) {
                        String json = pendingSharedResultJson;
                        pendingSharedResultJson = null;
                        webView.evaluateJavascript("window.onSharedFileUploaded(" + json + ");", null);
                    }
                }
            );
        });
    }

    private String getMimeTypeForFile(String fileName) {
        if (fileName == null) return "application/octet-stream";
        String lower = fileName.toLowerCase(Locale.ROOT);
        if (lower.endsWith(".pdf")) return "application/pdf";
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".webp")) return "image/webp";
        if (lower.endsWith(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        if (lower.endsWith(".doc")) return "application/msword";
        return "application/octet-stream";
    }

    @Override
    public void onBackPressed() {
        if (webView != null) {
            webView.evaluateJavascript(
                "(typeof window.handleAndroidBack === 'function') ? window.handleAndroidBack() : false",
                value -> {
                    if ("true".equals(value)) {
                        // Modal o visor cerrado por la SPA
                        return;
                    }
                    if (webView.canGoBack()) {
                        webView.goBack();
                    } else {
                        MainActivity.super.onBackPressed();
                    }
                }
            );
            return;
        }
        super.onBackPressed();
    }
}
