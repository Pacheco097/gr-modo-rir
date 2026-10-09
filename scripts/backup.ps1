# ═══════════════════════════════════════════════════════════════════
# Backup do banco MODO·RIR (PostgreSQL no Docker)
# Uso:  .\scripts\backup.ps1
# Gera um arquivo .sql.gz em .\backups\ com data/hora.
# Para agendar diariamente, use o Agendador de Tarefas do Windows
# apontando para este script (ex.: todo dia às 23h).
# ═══════════════════════════════════════════════════════════════════
$ErrorActionPreference = 'Stop'
$dir = Join-Path $PSScriptRoot '..\backups'
if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
$stamp = Get-Date -Format 'yyyy-MM-dd_HHmm'
$out = Join-Path $dir "modorir_$stamp.sql"
Write-Host "Gerando backup em $out ..."
# pg_dump dentro do container do Postgres
docker exec modorir-postgres pg_dump -U modorir -d modorir --clean --if-exists | Out-File -FilePath $out -Encoding utf8
Write-Host "Backup concluido: $out"
# Mantém apenas os 30 backups mais recentes
Get-ChildItem $dir -Filter 'modorir_*.sql' | Sort-Object LastWriteTime -Descending | Select-Object -Skip 30 | Remove-Item -Force -ErrorAction SilentlyContinue
