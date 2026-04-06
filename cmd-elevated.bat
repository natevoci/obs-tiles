@echo off
powershell -NoProfile -Command "Start-Process cmd.exe -ArgumentList '/k cd /d %CD%' -Verb RunAs"
