package com.connectedgames.core.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "partita", schema = "platform_db")
public class Partita {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "installazione_id", nullable = false)
    private InstallazioneGioco installazione;

    @ManyToOne
    @JoinColumn(name = "locale_id", nullable = false)
    private Locale locale;

    @ManyToOne
    @JoinColumn(name = "giocatore_1_id")
    private Utente giocatore1;

    @ManyToOne
    @JoinColumn(name = "giocatore_2_id")
    private Utente giocatore2;

    @Column(name = "punteggio_1", nullable = false)
    private int punteggio1;

    @Column(name = "punteggio_2", nullable = false)
    private int punteggio2;

    @Column(name = "data_inizio", nullable = false)
    private OffsetDateTime dataInizio;

    @Column(name = "data_fine", nullable = false)
    private OffsetDateTime dataFine;

    @ManyToOne
    @JoinColumn(name = "torneo_id")
    private Torneo torneo;

    @Column(name = "data_sincronizzazione", nullable = false)
    private OffsetDateTime dataSincronizzazione;

    public Partita() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public InstallazioneGioco getInstallazione() { return installazione; }
    public void setInstallazione(InstallazioneGioco installazione) { this.installazione = installazione; }

    public Locale getLocale() { return locale; }
    public void setLocale(Locale locale) { this.locale = locale; }

    public Utente getGiocatore1() { return giocatore1; }
    public void setGiocatore1(Utente giocatore1) { this.giocatore1 = giocatore1; }

    public Utente getGiocatore2() { return giocatore2; }
    public void setGiocatore2(Utente giocatore2) { this.giocatore2 = giocatore2; }

    public int getPunteggio1() { return punteggio1; }
    public void setPunteggio1(int punteggio1) { this.punteggio1 = punteggio1; }

    public int getPunteggio2() { return punteggio2; }
    public void setPunteggio2(int punteggio2) { this.punteggio2 = punteggio2; }

    public OffsetDateTime getDataInizio() { return dataInizio; }
    public void setDataInizio(OffsetDateTime dataInizio) { this.dataInizio = dataInizio; }

    public OffsetDateTime getDataFine() { return dataFine; }
    public void setDataFine(OffsetDateTime dataFine) { this.dataFine = dataFine; }

    public Torneo getTorneo() { return torneo; }
    public void setTorneo(Torneo torneo) { this.torneo = torneo; }

    public OffsetDateTime getDataSincronizzazione() { return dataSincronizzazione; }
    public void setDataSincronizzazione(OffsetDateTime dataSincronizzazione) { this.dataSincronizzazione = dataSincronizzazione; }
}
