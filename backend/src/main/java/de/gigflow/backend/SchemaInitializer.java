package de.gigflow.backend;

import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Idempotent, lightweight schema adjustments.
 *
 * <p>Hibernate's {@code ddl-auto=update} creates new tables but does NOT add columns
 * to already existing tables. Whenever a column is added to an existing entity, the
 * matching DDL must be applied here so the running database stays in sync.</p>
 */
@Component
public class SchemaInitializer implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;

    public SchemaInitializer(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(String... args) {
        // Column added to an existing entity -> Hibernate ddl-auto=update does not add
        // columns to existing tables, so it must be applied here (idempotent).
        apply(List.of(
                "alter table musicians add column if not exists email_public boolean not null default false",
                "alter table events add column if not exists panel_layout varchar(2000)",
                // Convert equipment_requirement booleans to tri-state enum values.
                // On a fresh DB ddl-auto creates these as varchar; the boolean forms
                // only match the pre-existing boolean columns and are otherwise ignored.
                "alter table equipment_requirement alter column available_on_site type varchar(20) using (case available_on_site when true then 'YES' else 'NO' end)",
                "alter table equipment_requirement alter column available_on_site set not null",
                "alter table equipment_requirement alter column available_on_site set default 'UNKNOWN'",
                "alter table equipment_requirement alter column needs_to_be_brought type varchar(20) using (case needs_to_be_brought when true then 'YES' else 'NO' end)",
                "alter table equipment_requirement alter column needs_to_be_brought set not null",
                "alter table equipment_requirement alter column needs_to_be_brought set default 'UNKNOWN'"
        ));
    }

    private void apply(List<String> statements) {
        for (String statement : statements) {
            try {
                jdbcTemplate.execute(statement);
            } catch (org.springframework.dao.DataAccessException ignored) {
                // Migration is best-effort; ignore pre-existing/failed states.
            }
        }
    }
}
