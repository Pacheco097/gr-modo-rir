# ═══════════════════════════════════════════════════════════════════
# Restauração do banco MODO·RIR a partir de um backup .sql
# Uso:  .\scripts\restore.ps1 -Arquivo .\backups\modorir_2026-07-27_2300.sql
# ATENÇÃO: sobrescreve os dados atuais pelo conteúdo do backup.
# ═══════════════════════════════════════════════════════════════════
param([Parameter(Mandatory=$true)][string]$Arquivo)
$ErrorActionPreference = 'Stop'
if (-not (Test-Path $Arquivo)) { throw "Arquivo não encontrado: $Arquivo" }
Write-Host "Restaurando $Arquivo no banco modorir ..."
Get-Content $Arquivo -Raw | docker exec -i modorir-postgres psql -U modorir -d modorir
Write-Host "Restauração concluída."
