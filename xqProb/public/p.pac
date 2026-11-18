function FindProxyForURL(url, host) {
    if (/.*-server-11.example.invalid.*/.test(url)) return "PROXY server-12.example.invalid:8000";
    return "DIRECT";
}
