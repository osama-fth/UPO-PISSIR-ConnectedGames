package com.connectedgames.core.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;

@Embeddable
public class IscrizioneTorneoId implements Serializable {

    @Column(name = "torneo_id", nullable = false)
    private UUID torneoId;

    @Column(name = "utente_id", nullable = false)
    private UUID utenteId;

    public IscrizioneTorneoId() {}

    public IscrizioneTorneoId(UUID torneoId, UUID utenteId) {
        this.torneoId = torneoId;
        this.utenteId = utenteId;
    }

    public UUID getTorneoId() { return torneoId; }
    public void setTorneoId(UUID torneoId) { this.torneoId = torneoId; }

    public UUID getUtenteId() { return utenteId; }
    public void setUtenteId(UUID utenteId) { this.utenteId = utenteId; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        IscrizioneTorneoId that = (IscrizioneTorneoId) o;
        return Objects.equals(torneoId, that.torneoId) &&
               Objects.equals(utenteId, that.utenteId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(torneoId, utenteId);
    }
}
