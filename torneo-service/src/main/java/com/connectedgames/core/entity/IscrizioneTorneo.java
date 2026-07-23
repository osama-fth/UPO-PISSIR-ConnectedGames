package com.connectedgames.core.entity;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MapsId;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

@Entity
@Table(name = "iscrizione_torneo", schema = "platform_db")
public class IscrizioneTorneo {

    @EmbeddedId
    private IscrizioneTorneoId id;

    @ManyToOne
    @MapsId("torneoId")
    @JoinColumn(name = "torneo_id")
    private Torneo torneo;

    @ManyToOne
    @MapsId("utenteId")
    @JoinColumn(name = "utente_id")
    private Utente utente;

    @Column(name = "data_iscrizione", nullable = false)
    private OffsetDateTime dataIscrizione;

    public IscrizioneTorneo() {}

    public IscrizioneTorneoId getId() { return id; }
    public void setId(IscrizioneTorneoId id) { this.id = id; }

    public Torneo getTorneo() { return torneo; }
    public void setTorneo(Torneo torneo) { this.torneo = torneo; }

    public Utente getUtente() { return utente; }
    public void setUtente(Utente utente) { this.utente = utente; }

    public OffsetDateTime getDataIscrizione() { return dataIscrizione; }
    public void setDataIscrizione(OffsetDateTime dataIscrizione) { this.dataIscrizione = dataIscrizione; }
}
