package im.cmd.xq.netbare.injector;

import im.cmd.xq.netbare.stream.Stream;

import java.io.IOException;

/**
 * A callback invoked when the injector finished the injection.
 *
 * @author Megatron King
 * @since 2018-12-15 21:55
 */
public interface InjectorCallback {

    /**
     * Invoked when the injector finished the injection.
     *
     * @param stream The injected stream.
     * @throws IOException If an I/O error has occurred.
     */
    void onFinished(Stream stream) throws IOException;

}
