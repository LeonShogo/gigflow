package de.gigflow.backend.event;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EventMailService {

    private final ObjectProvider<JavaMailSender> mailSenderProvider;

    @Value("${app.mail.from:no-reply@gigflow.local}")
    private String from;

    public EventMailService(ObjectProvider<JavaMailSender> mailSenderProvider) {
        this.mailSenderProvider = mailSenderProvider;
    }

    public boolean sendInvitation(String email, String eventTitle, String invitationUrl) {
        return send(email, "Einladung zu „" + eventTitle + "“",
                "Du wurdest zu „" + eventTitle + "“ bei GigFlow eingeladen.\n\n"
                        + "Öffne diesen persönlichen Einladungslink, um beizutreten:\n" + invitationUrl
                        + "\n\nDer Link ist 7 Tage gültig und kann nur einmal verwendet werden.");
    }

    public boolean sendAddedNotification(String email, String eventTitle, String appUrl) {
        return send(email, "Du wurdest zu „" + eventTitle + "“ hinzugefügt",
                "Du wurdest zu „" + eventTitle + "“ bei GigFlow hinzugefügt.\n\n"
                        + "Das Event findest du nach der Anmeldung hier:\n" + appUrl);
    }

    private boolean send(String email, String subject, String text) {
        JavaMailSender sender = mailSenderProvider.getIfAvailable();
        if (sender == null) {
            return false;
        }
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(from);
            message.setTo(email);
            message.setSubject(subject);
            message.setText(text);
            sender.send(message);
            return true;
        } catch (RuntimeException exception) {
            return false;
        }
    }
}
