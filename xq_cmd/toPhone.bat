set adb="F:\Android_sdk\platform-tools\adb.exe"
set exe="out\build\x64\xq_cmd"

%adb% push %exe% /data/local/tmp
%adb% shell "cd /data/local/tmp && chmod 777 xq_cmd && ./xq_cmd"

