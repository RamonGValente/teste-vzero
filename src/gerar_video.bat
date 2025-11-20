@echo off
setlocal enabledelayedexpansion

REM ============================
REM UNDOING — O Futuro Começa Aqui
REM Renderizador de vídeo (Windows + FFmpeg)
REM Saída: video_UNDOING_O_Futuro_Comeca_Aqui.mp4
REM ============================

REM ---------- Parâmetros ----------
set FPS=24
set WIDTH=1080
set HEIGHT=1920
REM Duração por cena (segundos); ajuste se precisar (5.2 dá ~55s com 10 cenas)
set DURATION=5.2
REM Momento do logo (segundos aproximados). Ajuste se mudar a duração total.
set LOGO_START=52
set LOGO_FADEIN=1.2
set LOGO_FADEOUT=0.8

REM ---------- Verificações ----------
if not exist scenes (
  echo [ERRO] Pasta "scenes" nao encontrada. Crie "scenes\" e coloque suas imagens (01.png ...).
  pause
  exit /b 1
)
if not exist musica.mp3 (
  echo [ERRO] Arquivo "musica.mp3" nao encontrado na pasta atual.
  pause
  exit /b 1
)
if not exist logo.png (
  echo [ERRO] Arquivo "logo.png" nao encontrado na pasta atual.
  pause
  exit /b 1
)

where ffmpeg >nul 2>nul
if errorlevel 1 (
  echo [ERRO] Nao encontrei o ffmpeg no PATH. Instale o ffmpeg (https://ffmpeg.org) ou coloque ffmpeg.exe ao lado deste .bat
  pause
  exit /b 1
)

REM ---------- Monta a lista de arquivos para concat ----------
del /q list.txt 2>nul
set COUNT=0
for %%F in (scenes\*.png scenes\*.jpg scenes\*.jpeg) do (
  echo file '%%F'>>list.txt
  echo duration %DURATION%>>list.txt
  set LAST=%%F
  set /a COUNT+=1
)

if %COUNT%==0 (
  echo [ERRO] Nao encontrei imagens em "scenes\". Use PNG/JPG com nomeacao simples (01.png, 02.png...).
  pause
  exit /b 1
)

REM Repetir o ultimo arquivo para fix do concat
echo file '%LAST%'>>list.txt

echo [INFO] Total de cenas: %COUNT%
echo [INFO] Gerando video sem audio (slideshow)...

REM ---------- Passo 1: slideshow sem áudio ----------
ffmpeg -y -f concat -safe 0 -i list.txt ^
  -vsync vfr -r %FPS% -vf "scale=%WIDTH%:%HEIGHT%:force_original_aspect_ratio=decrease, pad=%WIDTH%:%HEIGHT%:(%WIDTH%-iw)/2:(%HEIGHT%-ih)/2,format=yuv420p" ^
  video_sem_audio.mp4

if errorlevel 1 (
  echo [ERRO] Falha ao gerar o slideshow.
  pause
  exit /b 1
)

REM ---------- Passo 2: compor logo no final + trilha com fade in/out ----------
echo [INFO] Compondo LOGO no final e adicionando trilha...

REM O logo entra no centro entre LOGO_START e fim (~LOGO_START+3s)
REM Fades na musica: in 2s, out 3s (ajuste conforme seu gosto).
ffmpeg -y -i video_sem_audio.mp4 -i musica.mp3 -loop 1 -i logo.png -filter_complex ^
"[0:v]scale=%WIDTH%:%HEIGHT%,setsar=1,format=yuv420p[v0]; ^
 [2:v]scale=600:-1,format=rgba,fade=t=in:st=%LOGO_START%:d=%LOGO_FADEIN%,fade=t=out:st=%LOGO_START%+2.8:d=%LOGO_FADEOUT%[lg]; ^
 [v0][lg]overlay=(W-w)/2:(H-h)/2:enable='between(t,%LOGO_START%,%LOGO_START%+3.6)'[v]; ^
 [1:a]afade=t=in:st=0:d=2,afade=t=out:st=%LOGO_START%:d=3[a]" ^
-map "[v]" -map "[a]" -shortest -c:v libx264 -crf 18 -preset medium -c:a aac -b:a 192k ^
video_UNDOING_O_Futuro_Comeca_Aqui.mp4

if errorlevel 1 (
  echo [ERRO] Falha ao compor a faixa e o logo.
  pause
  exit /b 1
)

echo.
echo =========================================
echo  PRONTO! 
echo  Saida: video_UNDOING_O_Futuro_Comeca_Aqui.mp4
echo =========================================
pause
