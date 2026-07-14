package com.connectedgames.core.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "torneo", schema = "platform_db")
public class Torneo {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "nome", length = 150, nullable = false)
    private String nome;

    @ManyToOne
    @JoinColumn(name = "gioco_id", nullable = false)
    private Gioco gioco;

    @Column(name = "stato", length = 50, nullable = false)
    private String stato;

    @Column(name = "data_inizio", nullable = false)
    private OffsetDateTime dataInizio;

    @Column(name = "data_fine", nullable = false)
    private OffsetDateTime dataFine;

    @ManyToMany
    @JoinTable(
        name = "torneo_locale",
        schema = "platform_db",
        joinColumns = @JoinColumn(name = "torneo_id"),
        inverseJoinColumns = @JoinColumn(name = "locale_id")
    )
    private Set<Locale> locali;

    public Torneo() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getNome() { return nome; }
    public void setNome(String nome) { this.nome = nome; }

    public Gioco getGioco() { return gioco; }
    public void setGioco(Gioco gioco) { this.gioco = gioco; }

    public String getStato() { return stato; }
    public void setStato(String stato) { this.stato = stato; }

    public OffsetDateTime getDataInizio() { return dataInizio; }
    public void setDataInizio(OffsetDateTime dataInizio) { this.dataInizio = dataInizio; }

    public OffsetDateTime getDataFine() { return dataFine; }
    public void setDataFine(OffsetDateTime dataFine) { this.dataFine = dataFine; }

    public Set<Locale> getLocali() { return locali; }
    public void setLocali(Set<Locale> locali) { this.locali = locali; }
}
