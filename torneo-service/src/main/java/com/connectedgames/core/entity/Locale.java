package com.connectedgames.core.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

@Entity
@Table(name = "locale", schema = "platform_db")
public class Locale {

    @Id
    @Column(name = "id", length = 100, nullable = false)
    private String id;

    @Column(name = "nome", length = 150, nullable = false)
    private String nome;

    @Column(name = "tipo", length = 50, nullable = false)
    private String tipo;

    @Column(name = "indirizzo", nullable = false)
    private String indirizzo;

    @Column(name = "data_creazione", nullable = false)
    private OffsetDateTime dataCreazione;

    public Locale() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getNome() { return nome; }
    public void setNome(String nome) { this.nome = nome; }

    public String getTipo() { return tipo; }
    public void setTipo(String tipo) { this.tipo = tipo; }

    public String getIndirizzo() { return indirizzo; }
    public void setIndirizzo(String indirizzo) { this.indirizzo = indirizzo; }

    public OffsetDateTime getDataCreazione() { return dataCreazione; }
    public void setDataCreazione(OffsetDateTime dataCreazione) { this.dataCreazione = dataCreazione; }
}
