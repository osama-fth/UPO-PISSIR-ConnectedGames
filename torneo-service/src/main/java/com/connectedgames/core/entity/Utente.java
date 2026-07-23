package com.connectedgames.core.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "utente", schema = "platform_db")
public class Utente {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "username", length = 100, nullable = false, unique = true)
    private String username;

    @Column(name = "email", length = 150, unique = true)
    private String email;

    @Column(name = "data_registrazione", nullable = false)
    private OffsetDateTime dataRegistrazione;

    public Utente() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public OffsetDateTime getDataRegistrazione() { return dataRegistrazione; }
    public void setDataRegistrazione(OffsetDateTime dataRegistrazione) { this.dataRegistrazione = dataRegistrazione; }
}
