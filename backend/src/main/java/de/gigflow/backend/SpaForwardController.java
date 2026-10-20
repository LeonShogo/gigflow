package de.gigflow.backend;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class SpaForwardController {

    @GetMapping({
            "/",
            "/login",
            "/calendar",
            "/events/new",
            "/events/{id}",
            "/events/{id}/print",
            "/print-demo",
            "/musicians",
            "/musicians/new",
            "/musicians/{id}/edit"
    })
    public String forwardToIndex() {
        return "forward:/index.html";
    }
}
