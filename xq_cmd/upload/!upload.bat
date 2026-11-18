@set scp="C:\Program Files\Git\usr\bin\scp.exe"
@set ssh="C:\Program Files\Git\usr\bin\ssh.exe"
@set key=forUpload
@set server="maintainer@example.invalid"
@set src="..\out\build\x64\xq_cmd"
@set dst=~/cc_res/dist/
@set dstTmp="~/cc_res/dist/tmpAndroid"
@set updateCmd=update.sh

%scp% -r -P 60022  -i %key%  -o StrictHostKeyChecking=no %src% %server%:%dstTmp%
%scp% -r -P 60022  -i %key%  -o StrictHostKeyChecking=no update.sh %server%:%dst%
%ssh% -p 60022  -i %key%  -o StrictHostKeyChecking=no %server% "cd %dst% && source %updateCmd%"


