package de.gigflow.backend.band;

import jakarta.validation.constraints.NotNull;

public class BandMembershipRequest {

    @NotNull
    private Long bandId;

    @NotNull
    private Long musicianId;

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
