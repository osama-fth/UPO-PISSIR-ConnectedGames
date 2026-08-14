package com.connectedgames.core;

import com.connectedgames.core.dto.ClassificaTorneoResponse;
import com.connectedgames.core.dto.ClassificaTorneoResponse.VoceClassifica;
import com.connectedgames.core.dto.TorneoResponse;
import com.connectedgames.core.entity.Gioco;
import com.connectedgames.core.entity.Partita;
import com.connectedgames.core.entity.Torneo;
import com.connectedgames.core.entity.Utente;
import com.connectedgames.core.repository.GiocoRepository;
import com.connectedgames.core.repository.IscrizioneTorneoRepository;
import com.connectedgames.core.repository.LocaleRepository;
import com.connectedgames.core.repository.PartitaRepository;
import com.connectedgames.core.repository.TorneoRepository;
import com.connectedgames.core.repository.UtenteRepository;
import com.connectedgames.core.service.TorneoService;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TorneoServiceTest {

    @Mock
    private TorneoRepository torneoRepo;
    @Mock
    private PartitaRepository partitaRepo;
    @Mock
    private GiocoRepository giocoRepo;
    @Mock
    private LocaleRepository localeRepo;
    @Mock
    private UtenteRepository utenteRepo;
    @Mock
    private IscrizioneTorneoRepository iscrizioneRepo;

    @InjectMocks
    private TorneoService torneoService;

    private UUID torneoId;
    private UUID utenteId;
    private Torneo mockTorneo;

    @BeforeEach
    void setUp() {
        torneoId = UUID.randomUUID();
        utenteId = UUID.randomUUID();

        Gioco gioco = new Gioco();
        gioco.setId("calciobalilla");
        gioco.setNome("Calciobalilla");

        mockTorneo = new Torneo();
        mockTorneo.setId(torneoId);
        mockTorneo.setNome("Torneo Estivo Calciobalilla");
        mockTorneo.setGioco(gioco);
        mockTorneo.setDataInizio(OffsetDateTime.now().minusDays(1));
        mockTorneo.setDataFine(OffsetDateTime.now().plusDays(1));
        mockTorneo.setStato("ATTIVO");
    }

    @Test
    @DisplayName("Stato dinamico torneo: NON_ATTIVO prima dell'inizio")
    void testCalcolaStatoLazyNonAttivo() {
        mockTorneo.setDataInizio(OffsetDateTime.now().plusDays(2));
        mockTorneo.setDataFine(OffsetDateTime.now().plusDays(5));

        when(torneoRepo.findById(torneoId)).thenReturn(Optional.of(mockTorneo));

        TorneoResponse response = torneoService.getTorneoById(torneoId);
        assertThat(response.stato()).isEqualTo("NON_ATTIVO");
    }

    @Test
    @DisplayName("Stato dinamico torneo: CONCLUSO dopo data fine")
    void testCalcolaStatoLazyConcluso() {
        mockTorneo.setDataInizio(OffsetDateTime.now().minusDays(10));
        mockTorneo.setDataFine(OffsetDateTime.now().minusDays(2));

        when(torneoRepo.findById(torneoId)).thenReturn(Optional.of(mockTorneo));

        TorneoResponse response = torneoService.getTorneoById(torneoId);
        assertThat(response.stato()).isEqualTo("CONCLUSO");
    }

    @Test
    @DisplayName("Calcolo classifica: ordinamento multi-criterio per % vittorie")
    void testGetClassificaOrdinamento() {
        when(torneoRepo.findById(torneoId)).thenReturn(Optional.of(mockTorneo));

        Utente u1 = new Utente();
        u1.setId(UUID.randomUUID());
        u1.setUsername("Mario");

        Utente u2 = new Utente();
        u2.setId(UUID.randomUUID());
        u2.setUsername("Luigi");

        Partita p1 = new Partita();
        p1.setGiocatore1(u1);
        p1.setPunteggio1(10);
        p1.setGiocatore2(u2);
        p1.setPunteggio2(5);

        Partita p2 = new Partita();
        p2.setGiocatore1(u1);
        p2.setPunteggio1(10);
        p2.setGiocatore2(u2);
        p2.setPunteggio2(8);

        when(partitaRepo.findByTorneoId(torneoId)).thenReturn(List.of(p1, p2));

        ClassificaTorneoResponse classifica = torneoService.getClassifica(torneoId);

        assertThat(classifica.classifica()).hasSize(2);

        VoceClassifica primo = classifica.classifica().get(0);
        assertThat(primo.posizione()).isEqualTo(1);
        assertThat(primo.username()).isEqualTo("Mario");
        assertThat(primo.percentualeVittorie()).isEqualTo(100.0);

        VoceClassifica secondo = classifica.classifica().get(1);
        assertThat(secondo.posizione()).isEqualTo(2);
        assertThat(secondo.username()).isEqualTo("Luigi");
        assertThat(secondo.percentualeVittorie()).isEqualTo(0.0);
    }

    @Test
    @DisplayName("Iscrizione fallisce se torneo concluso")
    void testIscrizioneTorneoConclusoLanciaEccezione() {
        mockTorneo.setDataInizio(OffsetDateTime.now().minusDays(10));
        mockTorneo.setDataFine(OffsetDateTime.now().minusDays(1));

        when(torneoRepo.findById(torneoId)).thenReturn(Optional.of(mockTorneo));
        when(utenteRepo.findById(utenteId)).thenReturn(Optional.of(new Utente()));

        assertThatThrownBy(() -> torneoService.iscriviGiocatore(torneoId, utenteId))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("il torneo è già concluso");
    }

    @Test
    @DisplayName("Iscrizione fallisce se giocatore già iscritto")
    void testIscrizioneGiaPresenteLanciaEccezione() {
        when(torneoRepo.findById(torneoId)).thenReturn(Optional.of(mockTorneo));
        when(utenteRepo.findById(utenteId)).thenReturn(Optional.of(new Utente()));
        when(iscrizioneRepo.existsByIdTorneoIdAndIdUtenteId(torneoId, utenteId)).thenReturn(true);

        assertThatThrownBy(() -> torneoService.iscriviGiocatore(torneoId, utenteId))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Utente già iscritto");
    }

    @Test
    @DisplayName("Cancellazione torneo attivo lancia eccezione")
    void testCancellaTorneoAttivoLanciaEccezione() {
        when(torneoRepo.findById(torneoId)).thenReturn(Optional.of(mockTorneo));

        assertThatThrownBy(() -> torneoService.cancellaTorneo(torneoId))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("solo se non è ancora iniziato");
    }
}
