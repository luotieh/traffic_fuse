# ★ 请根据实际项目调整以下变量
$FrontendDir = "template-frontend"
$BackendDir  = "template-backend"
$Binary      = "traffic-api"
$BackendEntry = "./cmd/traffic-api"
$GoCache = if ($env:GOCACHE) { $env:GOCACHE } else { Join-Path $env:TEMP "traffic-fuse-gocache" }

function Build-Frontend {
    Write-Host "=== 构建前端 ===" -ForegroundColor Cyan
    Push-Location $FrontendDir
    try {
        pnpm install --frozen-lockfile
        pnpm run build:prod
        Write-Host "前端构建完成" -ForegroundColor Green
    } finally {
        Pop-Location
    }
}

function Build-Backend {
    param([string]$OS = "", [string]$Arch = "")
    Write-Host "=== 构建后端 ===" -ForegroundColor Cyan
    Push-Location $BackendDir
    try {
        $env:CGO_ENABLED = "0"
        $env:GOCACHE = $GoCache
        if ($OS) { $env:GOOS = $OS }
        if ($Arch) { $env:GOARCH = $Arch }

        $suffix = ""
        if ($OS -eq "windows" -or (-not $OS -and $IsWindows)) { $suffix = ".exe" }
        $outName = if ($OS) { "../${Binary}-${OS}-${Arch}${suffix}" } else { "../${Binary}${suffix}" }

        $env:GOFLAGS = "-mod=vendor"
        go build -trimpath -o $outName $BackendEntry
        Write-Host "后端构建完成: $outName" -ForegroundColor Green
    } finally {
        Remove-Item Env:\CGO_ENABLED -ErrorAction SilentlyContinue
        Remove-Item Env:\GOCACHE -ErrorAction SilentlyContinue
        Remove-Item Env:\GOOS -ErrorAction SilentlyContinue
        Remove-Item Env:\GOARCH -ErrorAction SilentlyContinue
        Remove-Item Env:\GOFLAGS -ErrorAction SilentlyContinue
        Pop-Location
    }
}

function Clean-All {
    Write-Host "=== 清理 ===" -ForegroundColor Yellow
    Remove-Item -Force -ErrorAction SilentlyContinue "${Binary}", "${Binary}.exe", "${Binary}-*"
    Remove-Item -Force -ErrorAction SilentlyContinue "$env:TEMP\traffic-api", "$env:TEMP\traffic-admin", "$env:TEMP\traffic-api.log", "$env:TEMP\traffic-api.pid"
    Write-Host "清理完成" -ForegroundColor Green
}

$target = if ($args.Count -gt 0) { $args[0] } else { "all" }

switch ($target) {
    "all"      { Build-Frontend; Build-Backend }
    "frontend" { Build-Frontend }
    "backend"  { Build-Backend }
    "linux"    { Build-Frontend; Build-Backend -OS "linux" -Arch "amd64" }
    "windows"  { Build-Frontend; Build-Backend -OS "windows" -Arch "amd64" }
    "clean"    { Clean-All }
    "dev"      { Push-Location $BackendDir; bash scripts/restart-local-api.sh; Pop-Location }
    default    { Write-Host "用法: .\build.ps1 [all|frontend|backend|linux|windows|clean|dev]" -ForegroundColor Yellow }
}
