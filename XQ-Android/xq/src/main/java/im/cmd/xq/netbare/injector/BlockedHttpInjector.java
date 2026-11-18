package im.cmd.xq.netbare.injector;

import androidx.annotation.NonNull;

import im.cmd.xq.netbare.http.HttpBody;
import im.cmd.xq.netbare.http.HttpRequest;
import im.cmd.xq.netbare.http.HttpRequestHeaderPart;
import im.cmd.xq.netbare.http.HttpResponse;
import im.cmd.xq.netbare.http.HttpResponseHeaderPart;

/**
 * An injector can block http request and response. Add your custom rules in
 * {@link #sniffRequest(HttpRequest)} or {@link #sniffResponse(HttpResponse)} to filter the request.
 *
 * @author Megatron King
 * @since 2019/1/2 20:50
 */
public abstract class BlockedHttpInjector implements HttpInjector {

    @Override
    public final void onRequestInject(@NonNull HttpRequestHeaderPart header,
                                @NonNull InjectorCallback callback) {
    }

    @Override
    public final void onResponseInject(@NonNull HttpResponseHeaderPart header,
                                 @NonNull InjectorCallback callback) {
    }

    @Override
    public final void onRequestInject(@NonNull HttpRequest request, @NonNull HttpBody body,
                                @NonNull InjectorCallback callback) {
    }

    @Override
    public final void onResponseInject(@NonNull HttpResponse response, @NonNull HttpBody body,
                                 @NonNull InjectorCallback callback) {
    }

    @Override
    public void onRequestFinished(@NonNull HttpRequest request) {
    }

    @Override
    public void onResponseFinished(@NonNull HttpResponse response) {
    }

}
