# ==============================================================================
# Blue Archive 3D Model Viewer - Lightweight Native HTTP Server
# Runs natively on Windows PowerShell (.NET HttpListener) without Node or Python
# ==============================================================================

$port = 8080
$scriptDir = $PSScriptRoot
if (-not $scriptDir) { $scriptDir = (Get-Location).Path }
$rootDir = $scriptDir
if (-not (Test-Path (Join-Path $rootDir "BlueArchiveModel"))) {
    $parentDir = (Split-Path -Parent $scriptDir)
    if (Test-Path (Join-Path $parentDir "BlueArchiveModel")) {
        $rootDir = $parentDir
    }
}

$url = "http://localhost:$port/"
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($url)

try {
    $listener.Start()
} catch {
    Write-Host "[!] Port $port might be in use, trying 8081..." -ForegroundColor Yellow
    $port = 8081
    $url = "http://localhost:$port/"
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add($url)
    $listener.Start()
}

$viewerUrl = "${url}index.html"
Write-Host ""
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "  BLUE ARCHIVE 3D MODEL VIEWER - LOCAL SERVER RUNNING" -ForegroundColor White
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "  URL: $viewerUrl" -ForegroundColor Green
Write-Host "  Root: $rootDir" -ForegroundColor Gray
Write-Host "  Press Ctrl+C to stop server" -ForegroundColor Gray
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host ""

# Open Browser
try {
    Start-Process $viewerUrl -ErrorAction SilentlyContinue
} catch {}

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".glb"  = "model/gltf-binary"
    ".gltf" = "model/gltf+json"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".webp" = "image/webp"
    ".svg"  = "image/svg+xml"
    ".ico"  = "image/x-icon"
    ".mp3"  = "audio/mpeg"
    ".wav"  = "audio/wav"
    ".wasm" = "application/wasm"
}

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        # CORS Headers
        $response.AddHeader("Access-Control-Allow-Origin", "*")
        $response.AddHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS")
        $response.AddHeader("Access-Control-Allow-Headers", "*")

        if ($request.HttpMethod -eq "OPTIONS") {
            $response.StatusCode = 200
            $response.Close()
            continue
        }

        $rawPath = [System.Uri]::UnescapeDataString($request.Url.AbsolutePath)
        if ($rawPath -eq "/" -or $rawPath -eq "") {
            $rawPath = "/index.html"
        }
        if ($rawPath -eq "/favicon.ico") {
            $rawPath = "/favicon.webp"
        }

        $cleanPath = $rawPath.TrimStart("/").Replace("/", [System.IO.Path]::DirectorySeparatorChar)
        $localPath = [System.IO.Path]::Combine($rootDir, $cleanPath)

        if (-not (Test-Path -Path $localPath -PathType Leaf)) {
            # Try stripping 'ba-model-viewer\' prefix if present
            if ($cleanPath.StartsWith("ba-model-viewer\")) {
                $subPath = $cleanPath.Substring(16)
                $altPath = [System.IO.Path]::Combine($rootDir, $subPath)
                if (Test-Path -Path $altPath -PathType Leaf) {
                    $localPath = $altPath
                }
            }
        }

        if (Test-Path -Path $localPath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($localPath).ToLower()
            $mime = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { "application/octet-stream" }
            $response.ContentType = $mime

            if ($request.HttpMethod -eq "HEAD") {
                $fileInfo = Get-Item $localPath
                $response.ContentLength64 = $fileInfo.Length
                $response.StatusCode = 200
                $response.Close()
                continue
            }

            $bytes = [System.IO.File]::ReadAllBytes($localPath)
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
            $response.StatusCode = 200
        } else {
            $response.StatusCode = 404
            $msg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $rawPath")
            $response.OutputStream.Write($msg, 0, $msg.Length)
        }
        $response.Close()
    } catch {
        # Listener stopped or client aborted
    }
}
