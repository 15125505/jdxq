package im.cmd.xq.netbare.injector;

import androidx.annotation.NonNull;

import im.cmd.xq.netbare.http.HttpBody;
import im.cmd.xq.netbare.http.HttpRequest;
import im.cmd.xq.netbare.http.HttpRequestHeaderPart;
import im.cmd.xq.netbare.http.HttpResponse;
import im.cmd.xq.netbare.http.HttpResponseHeaderPart;
import im.cmd.xq.netbare.stream.Stream;

import java.io.IOException;

/**
 * An injector for HTTP protocol packets, you can block and modify HTTP headers and bodies in this
 * injector.
 * <p>
 * Remember do not hold those methods for a long time.
 * </p>
 *
 * @author Megatron King
 * @since 2018-12-15 21:50
 */
public interface HttpInjector {

    /**
     * Determine should the injector apply to this request.
     *
     * @param request Http request session.
     * @return True if do injection to this request.
     */
    boolean sniffRequest(@NonNull HttpRequest request);

    /**
     * Determine should the injector apply to this response.
     *
     * @param response Http response session.
     * @return True if do injection to this response.
     */
    boolean sniffResponse(@NonNull HttpResponse response);

    /**
     * Inject the http request header part, call {@link InjectorCallback#onFinished(Stream)} after
     * the injection.
     *
     * @param header Http header part.
     * @param callback A injection finish callback.
     * @throws IOException If an I/O error has occurred.
     */
    void onRequestInject(@NonNull HttpRequestHeaderPart header, @NonNull InjectorCallback callback)
            throws IOException;

    /**
     * Inject the http response header part, call {@link InjectorCallback#onFinished(Stream)} after
     * the injection.
     *
     * @param header Http header part.
     * @param callback A injection finish callback.
     * @throws IOException If an I/O error has occurred.
     */
    void onResponseInject(@NonNull HttpResponseHeaderPart header, @NonNull InjectorCallback callback)
            throws IOException;

    /**
     * Inject the http request body part, call {@link InjectorCallback#onFinished(Stream)} after
     * the injection.
     *
     * @param body Http body part.
     * @param callback A injection finish callback.
     * @throws IOException If an I/O error has occurred.
     */
    void onRequestInject(@NonNull HttpRequest request, @NonNull HttpBody body,
                         @NonNull InjectorCallback callback) throws IOException;

    /**
     * Inject the http response body part, call {@link InjectorCallback#onFinished(Stream)} after
     * the injection.
     *
     * @param body Http body part.
     * @param callback A injection finish callback.
     * @throws IOException If an I/O error has occurred.
     */
    void onResponseInject(@NonNull HttpResponse response, @NonNull HttpBody body,
                          @NonNull InjectorCallback callback) throws IOException;

    /**
     * Notify the injector that the request is finished.
     *
     * @param request Http request session.
     */
    void onRequestFinished(@NonNull HttpRequest request);

    /**
     * Notify the injector that the response is finished.
     *
     * @param response Http response session.
     */
    void onResponseFinished(@NonNull HttpResponse response);

}
