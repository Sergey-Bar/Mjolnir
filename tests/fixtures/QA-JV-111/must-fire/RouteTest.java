import org.junit.jupiter.api.Test;

class RouteTest {

    @Test
    void shouldMockApi() {
        page.route("**/*", route -> route.fulfill());
    }
}
