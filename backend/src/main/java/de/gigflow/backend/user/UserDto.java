package de.gigflow.backend.user;

/**
 * Public representation of an account. Never exposes the password hash.
 * The email is only returned to the account owner, never in public musician listings.
 */
public class UserDto {

    private Long id;
    private String email;
    private boolean organizer;
    private Long musicianId;

    public static UserDto from(User user) {
        UserDto dto = new UserDto();
        dto.setId(user.getId());
        dto.setEmail(user.getEmail());
        dto.setOrganizer(user.isOrganizer());
        dto.setMusicianId(user.getMusician() == null ? null : user.getMusician().getId());
        return dto;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public boolean isOrganizer() {
        return organizer;
    }

    public void setOrganizer(boolean organizer) {
        this.organizer = organizer;
    }

    public Long getMusicianId() {
        return musicianId;
    }

    public void setMusicianId(Long musicianId) {
        this.musicianId = musicianId;
    }
}
