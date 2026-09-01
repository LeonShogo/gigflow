package de.gigflow.backend.user;

public class AuthResponse {

    private String token;
    private UserDto user;

    public static AuthResponse of(String token, User user) {
        AuthResponse response = new AuthResponse();
        response.setToken(token);
        response.setUser(UserDto.from(user));
        return response;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public UserDto getUser() {
        return user;
    }

    public void setUser(UserDto user) {
        this.user = user;
    }
}
