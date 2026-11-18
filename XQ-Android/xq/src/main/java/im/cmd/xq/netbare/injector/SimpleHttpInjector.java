package im.cmd.xq.netbare.injector;

import androidx.annotation.NonNull;

import im.cmd.xq.netbare.http.HttpBody;
import im.cmd.xq.netbare.http.HttpRequest;
import im.cmd.xq.netbare.http.HttpRequestHeaderPart;
import im.cmd.xq.netbare.http.HttpResponse;
import im.cmd.xq.netbare.http.HttpResponseHeaderPart;

import java.io.IOException;

/**
 * Convenience class for simple injectors and allows extending only methods that are necessary.
 *
 * @author Megatron King
 * @since 2019/1/2 20:55
 */
public abstract class SimpleHttpInjector implements HttpInjector {

    @Override
    public boolean sniffRequest(@NonNull HttpRequest request) {
        return false;
    }

    @Override
    public boolean sniffResponse(@NonNull HttpResponse response) {
        return false;
    }

    @Override
    public void onRequestInject(@NonNull HttpRequestHeaderPart header,
                                @NonNull InjectorCallback callback) throws IOException {
        callback.onFinished(header);
    }

    @Override
    public void onResponseInject(@NonNull HttpResponseHeaderPart header,
                                 @NonNull InjectorCallback callback) throws IOException {
        callback.onFinished(header);
    }

    @Override
    public void onRequestInject(@NonNull HttpRequest request, @NonNull HttpBody body,
                                @NonNull InjectorCallback callback) throws IOException {
        callback.onFinished(body);
    }

    @Override
    public void onResponseInject(@NonNull HttpResponse response, @NonNull HttpBody body,
                                 @NonNull InjectorCallback callback) throws IOException {
        callback.onFinished(body);
    }

    @Override
    public void onRequestFinished(@NonNull HttpRequest request) {
    }

    @Override
    public void onResponseFinished(@NonNull HttpResponse response) {
    }

}
