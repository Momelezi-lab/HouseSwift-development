# Setup Environment Variables for Next.js App
# Run this script: .\setup-env.ps1

$envFile = ".env.local"
$content = @"
# Database Configuration (SQLite for local development)
DATABASE_URL="file:./prisma/dev.db"

# JWT Configuration
JWT_SECRET=your-secret-key-change-in-production-min-32-chars-please-use-a-strong-random-string
JWT_ACCESS_TOKEN_EXPIRE=15m
JWT_REFRESH_TOKEN_EXPIRE=7d

# Next.js API URL (leave empty for same-origin)
NEXT_PUBLIC_API_URL=
"@

if (Test-Path $envFile) {
    Write-Host "Warning: .env.local already exists. Backing up to .env.local.backup" -ForegroundColor Yellow
    Copy-Item $envFile "$envFile.backup"
}

Set-Content -Path $envFile -Value $content
Write-Host "Created .env.local file" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Restart your dev server (stop with Ctrl+C, then run npm run dev)" -ForegroundColor White
Write-Host "2. The database is already created at: prisma/dev.db" -ForegroundColor White
Write-Host "3. Try logging in again" -ForegroundColor White
