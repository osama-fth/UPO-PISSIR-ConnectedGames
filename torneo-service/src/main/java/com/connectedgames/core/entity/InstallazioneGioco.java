package com.connectedgames.core.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "installazione_gioco", schema = "platform_db")
public class InstallazioneGioco {

    @Id
    @Column(name = "id", length = 100, nullable = false)
    private String id;

    @ManyToOne
    @JoinColumn(name = "gioco_id", nullable = false)
    private Gioco gioco;

    @ManyToOne
    @JoinColumn(name = "locale_id", nullable = false)
    private Locale locale;

    @Column(name = "stato_attivita", length = 50, nullable = false)
    private String statoAttivita;

    public InstallazioneGioco() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public Gioco getGioco() { return gioco; }
    public void setGioco(Gioco gioco) { this.gioco = gioco; }

    public Locale getLocale() { return locale; }
    public void setLocale(Locale locale) { this.locale = locale; }

    public String getStatoAttivita() { return statoAttivita; }
    public void setStatoAttivita(String statoAttivita) { this.statoAttivita = statoAttivita; }
}
