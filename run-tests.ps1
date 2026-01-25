# Oktyv Infrastructure Test Runner
# Run this from PowerShell in D:\Dev\oktyv

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  Oktyv Infrastructure Test Suite" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Build TypeScript
Write-Host "[1/5] Building TypeScript..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "Build complete!" -ForegroundColor Green
Write-Host ""

# Run ConfigManager tests
Write-Host "[2/5] Testing ConfigManager..." -ForegroundColor Yellow
npx vitest run tests/infrastructure/config-manager.test.ts --reporter=verbose
Write-Host ""

# Run CacheManager tests  
Write-Host "[3/5] Testing CacheManager..." -ForegroundColor Yellow
npx vitest run tests/infrastructure/cache-manager.test.ts --reporter=verbose
Write-Host ""

# Run ProgressManager tests
Write-Host "[4/5] Testing ProgressManager..." -ForegroundColor Yellow
npx vitest run tests/infrastructure/progress-manager.test.ts --reporter=verbose
Write-Host ""

# Run RetryManager tests
Write-Host "[5/5] Testing RetryManager..." -ForegroundColor Yellow
npx vitest run tests/infrastructure/retry-manager.test.ts --reporter=verbose
Write-Host ""

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  Test Suite Complete!" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
