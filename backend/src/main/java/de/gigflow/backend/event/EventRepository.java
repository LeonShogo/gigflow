package de.gigflow.backend.event;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface EventRepository extends JpaRepository<Event, Long> {

    List<Event> findByConcertId(Long concertId);

    List<Event> findByCreatedByUserId(Long createdByUserId);

    @Query("""
            select distinct e from Event e
            where e.createdByUserId = :userId
               or exists (select p.id from EventParticipation p
                           where p.event = e and p.musician.id = :musicianId)
               or e.concert.id in (
                    select parent.id from Event parent
                    where parent.createdByUserId = :userId
                       or exists (select pp.id from EventParticipation pp
                                   where pp.event = parent and pp.musician.id = :musicianId)
               )
            """)
    List<Event> findVisibleToUser(@Param("userId") Long userId, @Param("musicianId") Long musicianId);

    @Query("""
            select distinct e from Event e
            where e.id = :eventId
               or e.concert.id = :eventId
               or e.id in (select child.id from Event child where child.concert.id = :eventId)
            """)
    List<Event> findEventFamily(@Param("eventId") Long eventId);

    boolean existsByBandId(Long bandId);
}
