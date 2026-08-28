package de.gigflow.backend.band;

public class BandMembershipResponse {

    private Long id;
    private Long bandId;
    private Long musicianId;

    public static BandMembershipResponse from(BandMembership membership) {
        BandMembershipResponse response = new BandMembershipResponse();
        response.setId(membership.getId());
        if (membership.getBand() != null) {
            response.setBandId(membership.getBand().getId());
        }
        if (membership.getMusician() != null) {
            response.setMusicianId(membership.getMusician().getId());
        }
        return response;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getBandId() {
        return bandId;
    }

    public void setBandId(Long bandId) {
        this.bandId = bandId;
    }

    public Long getMusicianId() {
        return musicianId;
    }

    public void setMusicianId(Long musicianId) {
        this.musicianId = musicianId;
    }
}
