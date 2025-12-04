# Fix Database Setup Script
Write-Host "Setting up database..." -ForegroundColor Green

# Step 1: Generate Prisma Client
Write-Host "`nStep 1: Generating Prisma Client..." -ForegroundColor Yellow
npx prisma generate

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Prisma client generated successfully!" -ForegroundColor Green
} else {
    Write-Host "✗ Error generating Prisma client. Make sure the dev server is stopped." -ForegroundColor Red
    exit 1
}

# Step 2: Push schema to database
Write-Host "`nStep 2: Pushing schema to database..." -ForegroundColor Yellow
npx prisma db push

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Database schema pushed successfully!" -ForegroundColor Green
    Write-Host "`n✓ Setup complete! You can now start the dev server with: npm run dev" -ForegroundColor Green
} else {
    Write-Host "✗ Error pushing schema to database." -ForegroundColor Red
    exit 1
}

