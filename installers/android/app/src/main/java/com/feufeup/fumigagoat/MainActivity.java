package com.feufeup.fumigagoat;

import android.app.Activity;
import android.content.res.AssetManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.util.Log;
import android.view.Gravity;
import android.view.View;
import android.view.Window;
import android.widget.TextView;

import org.mozilla.geckoview.AllowOrDeny;
import org.mozilla.geckoview.GeckoResult;
import org.mozilla.geckoview.GeckoRuntime;
import org.mozilla.geckoview.GeckoSession;
import org.mozilla.geckoview.GeckoView;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.BufferedReader;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Offline Android shell. GeckoView (including Gecko itself) is bundled in the APK;
 * it does not use Android System WebView, Chrome, Play Services, or a remote site.
 * A tiny read-only server bound only to 127.0.0.1 gives the game a stable HTTP
 * origin so Gecko can persist localStorage between launches.
 */
public final class MainActivity extends Activity {
    private static final String TAG = "FumigaOffline";
    private static final String LOOPBACK_HOST = "localhost";
    private static final String ASSET_PREFIX = "/assets/www/";
    // Stable origin is important: localStorage is partitioned by host and port.
    private static final int LOCAL_PORT = 43177;
    private static final String START_URL =
            "http://localhost:" + LOCAL_PORT + ASSET_PREFIX + "game/mobile/index.html";
    private static final int BACKGROUND = Color.rgb(10, 8, 18);

    private static final String CONTENT_SECURITY_POLICY =
            "default-src 'self'; "
                    + "base-uri 'self'; "
                    + "connect-src 'self'; "
                    + "font-src 'self' data:; "
                    + "form-action 'none'; "
                    + "frame-src 'none'; "
                    + "img-src 'self' data: blob:; "
                    + "media-src 'self' data: blob:; "
                    + "object-src 'none'; "
                    + "script-src 'self' 'unsafe-inline'; "
                    + "style-src 'self' 'unsafe-inline'; "
                    + "worker-src 'self' blob:";

    private static GeckoRuntime runtime;

    private LocalAssetServer assetServer;
    private GeckoSession geckoSession;
    private GeckoView geckoView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Window window = getWindow();
        window.setStatusBarColor(BACKGROUND);
        window.setNavigationBarColor(BACKGROUND);

        try {
            assetServer = new LocalAssetServer(getAssets());
        } catch (IOException error) {
            Log.e(TAG, "Não foi possível iniciar o servidor local do jogo", error);
            showStartupError();
            return;
        }

        if (runtime == null) {
            runtime = GeckoRuntime.create(this);
        }

        geckoSession = new GeckoSession();
        geckoSession.setContentDelegate(new GeckoSession.ContentDelegate() {});
        geckoSession.setNavigationDelegate(new GeckoSession.NavigationDelegate() {
            @Override
            public GeckoResult<AllowOrDeny> onLoadRequest(
                    GeckoSession session,
                    GeckoSession.NavigationDelegate.LoadRequest request
            ) {
                return allowLocalOnly(request.uri);
            }

            @Override
            public GeckoResult<AllowOrDeny> onSubframeLoadRequest(
                    GeckoSession session,
                    GeckoSession.NavigationDelegate.LoadRequest request
            ) {
                return allowLocalOnly(request.uri);
            }

            @Override
            public GeckoResult<GeckoSession> onNewSession(GeckoSession session, String uri) {
                // Do not open external pages or pop-up windows from the offline game.
                return null;
            }
        });
        geckoSession.open(runtime);

        geckoView = new GeckoView(this);
        geckoView.setBackgroundColor(BACKGROUND);
        geckoView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        geckoView.setSession(geckoSession);
        setContentView(geckoView);
        enterImmersiveMode();
        geckoSession.loadUri(START_URL);
    }

    private static GeckoResult<AllowOrDeny> allowLocalOnly(String value) {
        if (value == null) return GeckoResult.fromValue(AllowOrDeny.DENY);
        Uri uri = Uri.parse(value);
        boolean local = "http".equals(uri.getScheme())
                && LOOPBACK_HOST.equals(uri.getHost())
                && LOCAL_PORT == uri.getPort()
                && uri.getUserInfo() == null
                && uri.getPath() != null
                && uri.getPath().startsWith(ASSET_PREFIX);
        return GeckoResult.fromValue(local ? AllowOrDeny.ALLOW : AllowOrDeny.DENY);
    }

    private void showStartupError() {
        TextView message = new TextView(this);
        message.setBackgroundColor(BACKGROUND);
        message.setTextColor(Color.WHITE);
        message.setGravity(Gravity.CENTER);
        message.setPadding(32, 32, 32, 32);
        message.setText("Não foi possível abrir os arquivos locais do FUMIGA.\n\nFeche e abra o jogo novamente.");
        setContentView(message);
    }

    private void enterImmersiveMode() {
        getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                        | View.SYSTEM_UI_FLAG_FULLSCREEN
                        | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                        | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
        );
    }

    @Override
    protected void onResume() {
        super.onResume();
        enterImmersiveMode();
    }

    @Override
    public void onBackPressed() {
        // The bundled game has no browser history; Back exits the app as expected.
        super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        if (geckoSession != null) {
            geckoSession.close();
            geckoSession = null;
        }
        if (assetServer != null) {
            assetServer.close();
            assetServer = null;
        }
        geckoView = null;
        super.onDestroy();
    }

    /** Read-only HTTP server for APK assets. It never binds to a LAN/public interface. */
    private static final class LocalAssetServer implements AutoCloseable {
        private static final int MAX_REQUEST_LINE = 8192;
        private static final int MAX_HEADER_LINE = 8192;
        private final AssetManager assets;
        private final ServerSocket serverSocket;
        private final ExecutorService requests = Executors.newFixedThreadPool(6);
        private volatile boolean closed;

        LocalAssetServer(AssetManager assets) throws IOException {
            this.assets = assets;
            serverSocket = new ServerSocket();
            serverSocket.setReuseAddress(true);
            serverSocket.bind(new InetSocketAddress(InetAddress.getByName("127.0.0.1"), LOCAL_PORT), 16);
            Thread acceptThread = new Thread(this::acceptLoop, "fumiga-loopback-assets");
            acceptThread.setDaemon(true);
            acceptThread.start();
        }

        private void acceptLoop() {
            while (!closed) {
                try {
                    Socket client = serverSocket.accept();
                    client.setSoTimeout(10000);
                    requests.execute(() -> serve(client));
                } catch (IOException error) {
                    if (!closed) Log.w(TAG, "Falha no socket local", error);
                }
            }
        }

        private void serve(Socket client) {
            try (Socket socket = client;
                 BufferedReader input = new BufferedReader(new InputStreamReader(
                         new BufferedInputStream(socket.getInputStream()), StandardCharsets.US_ASCII));
                 BufferedOutputStream output = new BufferedOutputStream(socket.getOutputStream())) {
                String requestLine = readBoundedLine(input, MAX_REQUEST_LINE);
                if (requestLine == null || requestLine.isEmpty()) return;

                String[] request = requestLine.split(" ", 3);
                if (request.length != 3) {
                    writeText(output, 400, "Bad Request", "Requisição inválida.", false);
                    return;
                }
                String method = request[0];
                boolean head = "HEAD".equals(method);
                if (!"GET".equals(method) && !head) {
                    drainHeaders(input);
                    writeText(output, 405, "Method Not Allowed", "Somente GET e HEAD são aceitos.", head);
                    return;
                }
                drainHeaders(input);

                String assetPath = resolveAssetPath(request[1]);
                if (assetPath == null) {
                    writeText(output, 404, "Not Found", "Arquivo local não encontrado.", head);
                    return;
                }

                try (InputStream body = assets.open(assetPath)) {
                    writeAssetHeaders(output, mimeType(assetPath));
                    if (!head) copyChunked(body, output);
                    output.flush();
                } catch (FileNotFoundException | IllegalArgumentException error) {
                    writeText(output, 404, "Not Found", "Arquivo local não encontrado.", head);
                }
            } catch (IOException error) {
                if (!closed) Log.d(TAG, "Conexão local encerrada: " + error.getMessage());
            }
        }

        private static String readBoundedLine(BufferedReader input, int limit) throws IOException {
            StringBuilder line = new StringBuilder();
            int ch;
            while ((ch = input.read()) != -1) {
                if (ch == '\n') break;
                if (ch != '\r') line.append((char) ch);
                if (line.length() > limit) throw new IOException("Linha HTTP grande demais");
            }
            if (ch == -1 && line.length() == 0) return null;
            return line.toString();
        }

        private static void drainHeaders(BufferedReader input) throws IOException {
            for (int count = 0; count < 100; count++) {
                String header = readBoundedLine(input, MAX_HEADER_LINE);
                if (header == null || header.isEmpty()) return;
            }
            throw new IOException("Cabeçalhos HTTP demais");
        }

        private static String resolveAssetPath(String target) {
            if (target == null || !target.startsWith(ASSET_PREFIX)) return null;
            String encoded = target;
            int query = encoded.indexOf('?');
            if (query >= 0) encoded = encoded.substring(0, query);
            int fragment = encoded.indexOf('#');
            if (fragment >= 0) encoded = encoded.substring(0, fragment);
            if (!encoded.startsWith(ASSET_PREFIX)) return null;

            try {
                String relative = URLDecoder.decode(encoded.substring(ASSET_PREFIX.length()), "UTF-8");
                if (relative.isEmpty() || relative.startsWith("/") || relative.indexOf('\\') >= 0) return null;
                for (String part : relative.split("/", -1)) {
                    if (part.isEmpty() || ".".equals(part) || "..".equals(part)) return null;
                }
                return "www/" + relative;
            } catch (IllegalArgumentException | java.io.UnsupportedEncodingException error) {
                return null;
            }
        }

        private static String mimeType(String path) {
            String lower = path.toLowerCase(java.util.Locale.ROOT);
            if (lower.endsWith(".html")) return "text/html; charset=utf-8";
            if (lower.endsWith(".js")) return "text/javascript; charset=utf-8";
            if (lower.endsWith(".css")) return "text/css; charset=utf-8";
            if (lower.endsWith(".json")) return "application/json; charset=utf-8";
            if (lower.endsWith(".webmanifest")) return "application/manifest+json; charset=utf-8";
            if (lower.endsWith(".svg")) return "image/svg+xml";
            if (lower.endsWith(".png")) return "image/png";
            if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
            if (lower.endsWith(".webp")) return "image/webp";
            if (lower.endsWith(".gif")) return "image/gif";
            if (lower.endsWith(".ico")) return "image/x-icon";
            if (lower.endsWith(".woff2")) return "font/woff2";
            if (lower.endsWith(".woff")) return "font/woff";
            if (lower.endsWith(".ttf")) return "font/ttf";
            if (lower.endsWith(".mp3")) return "audio/mpeg";
            if (lower.endsWith(".ogg")) return "audio/ogg";
            if (lower.endsWith(".wav")) return "audio/wav";
            if (lower.endsWith(".m4a")) return "audio/mp4";
            if (lower.endsWith(".wasm")) return "application/wasm";
            return "application/octet-stream";
        }

        private static void writeAssetHeaders(BufferedOutputStream output, String contentType) throws IOException {
            String headers = "HTTP/1.1 200 OK\r\n"
                    + "Content-Type: " + contentType + "\r\n"
                    + "Transfer-Encoding: chunked\r\n"
                    + "Connection: close\r\n"
                    + "Cache-Control: no-store\r\n"
                    + "X-Content-Type-Options: nosniff\r\n"
                    + "Referrer-Policy: no-referrer\r\n"
                    + "Permissions-Policy: camera=(), microphone=(), geolocation=()\r\n"
                    + "Content-Security-Policy: " + CONTENT_SECURITY_POLICY + "\r\n\r\n";
            output.write(headers.getBytes(StandardCharsets.US_ASCII));
        }

        private static void copyChunked(InputStream input, BufferedOutputStream output) throws IOException {
            byte[] buffer = new byte[32 * 1024];
            int read;
            while ((read = input.read(buffer)) != -1) {
                output.write(Integer.toHexString(read).getBytes(StandardCharsets.US_ASCII));
                output.write("\r\n".getBytes(StandardCharsets.US_ASCII));
                output.write(buffer, 0, read);
                output.write("\r\n".getBytes(StandardCharsets.US_ASCII));
            }
            output.write("0\r\n\r\n".getBytes(StandardCharsets.US_ASCII));
        }

        private static void writeText(
                BufferedOutputStream output,
                int status,
                String reason,
                String text,
                boolean head
        ) throws IOException {
            byte[] body = text.getBytes(StandardCharsets.UTF_8);
            String headers = "HTTP/1.1 " + status + " " + reason + "\r\n"
                    + "Content-Type: text/plain; charset=utf-8\r\n"
                    + "Content-Length: " + body.length + "\r\n"
                    + "Connection: close\r\n"
                    + "Cache-Control: no-store\r\n"
                    + "X-Content-Type-Options: nosniff\r\n"
                    + "Content-Security-Policy: default-src 'none'; frame-ancestors 'none'\r\n\r\n";
            output.write(headers.getBytes(StandardCharsets.US_ASCII));
            if (!head) output.write(body);
            output.flush();
        }

        @Override
        public void close() {
            closed = true;
            try {
                serverSocket.close();
            } catch (IOException ignored) {
                // Closing the listening socket wakes the accept thread.
            }
            requests.shutdownNow();
        }
    }
}
