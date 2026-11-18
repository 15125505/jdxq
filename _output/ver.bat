@set r="C:\Program Files\7-Zip\7z.exe"
@set zipFileName="xq"
@set tp=7z

@echo.
@echo ---- 即将开始删除文件...
@echo.


@rd ver /q /s
@del %zipFileName%.%tp% /f /a /q

@echo.
@echo ---- 文件删除完成，即将开始复制文件...
@echo.


@xcopy "locales" "ver\locales" /Y /E /I /C
@xcopy "dll" "ver\dll" /Y /E /I /C
@copy CefSg.exe                 "ver\江东小乔.exe"
@copy d3dcompiler_43.dll        "ver\d3dcompiler_43.dll"
@copy libGLESv2.dll             "ver\libGLESv2.dll"
@copy d3dcompiler_47.dll        "ver\d3dcompiler_47.dll"
@copy cef.pak                   "ver\cef.pak"
@copy devtools_resources.pak    "ver\devtools_resources.pak"
@copy cef_100_percent.pak       "ver\cef_100_percent.pak"
@copy natives_blob.bin          "ver\natives_blob.bin"
@copy cef_200_percent.pak       "ver\cef_200_percent.pak"
@copy icudtl.dat                "ver\icudtl.dat"
@copy snapshot_blob.bin         "ver\snapshot_blob.bin"
@copy cef_extensions.pak        "ver\cef_extensions.pak"
@copy libcef.dll                "ver\libcef.dll"
@copy libEGL.dll                "ver\libEGL.dll"
@copy wow_helper.exe            "ver\wow_helper.exe"

@echo.
@echo ---- 复制完成，即将打包...
@echo.

@cd ver
@%r% -t%tp% a %zipFileName%.%tp% .\* -mx=9
@move %zipFileName%.%tp% ..\
@cd ..

@echo.
@echo ---- 复制完成，即将删除临时文件...
@echo.


@rd ver /q /s

@echo.
@echo ---- 操作完成，回车退出...
@echo.

@PAUSE
