package de.gigflow.backend.band;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BandMembershipRepository extends JpaRepository<BandMembership, Long> {

    List<BandMembership> findByMusicianId(Long musicianId);
}
