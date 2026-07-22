package com.connectedgames.statistiche.controller;

import com.connectedgames.statistiche.service.StatisticheBackendService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class DashboardController {

    private final StatisticheBackendService statisticheService;

    public DashboardController(StatisticheBackendService statisticheService) {
        this.statisticheService = statisticheService;
    }

    @GetMapping("/")
    public String root() {
        return "redirect:/dashboard";
    }

    @GetMapping("/dashboard")
    public String index(Model model, java.security.Principal principal) {
        if (principal != null) {
            model.addAttribute("nomeUtente", principal.getName());
        }
        model.addAttribute("stats", statisticheService.getStatisticheGlobali());
        return "dashboard";
    }
}
