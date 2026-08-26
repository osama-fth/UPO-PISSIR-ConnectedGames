package com.connectedgames.core;

import com.connectedgames.core.dto.ClassificaTorneoResponse;
import com.connectedgames.core.dto.ClassificaTorneoResponse.VoceClassificaGiocatore;
import com.connectedgames.core.dto.ClassificaTorneoResponse.VoceClassificaLocale;
import com.connectedgames.core.dto.TorneoResponse;
import com.connectedgames.core.entity.Gioco;
import com.connectedgames.core.entity.IscrizioneTorneo;
import com.connectedgames.core.entity.IscrizioneTorneoId;
import com.connectedgames.core.entity.Locale;
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
import java.util.Set;
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
    private String localeId;
    private Torneo mockTorneo;
    private Locale mockLocale;

    @BeforeEach
    void setUp() {
        torneoId = UUID.randomUUID();
        utenteId = UUID.randomUUID();
        localeId = "BAR_BELVEDERE";

        Gioco gioco = new Gioco();
        gioco.setId("calciobalilla");
        gioco.setNome("Calciobalilla");

        mockLocale = new Locale();
        mockLocale.setId(localeId);
        mockLocale.setNome("Bar Belvedere");

        mockTorneo = new Torneo();
        mockTorneo.setId(torneoId);
        mockTorneo.setNome("Torneo Estivo Calciobalilla");
        mockTorneo.setGioco(gioco);
        mockTorneo.setLocali(Set.of(mockLocale));
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
    @DisplayName("Calcolo classifica: ordinamento multi-criterio per Locali e Giocatori")
    void testGetClassificaOrdinamento() {
        when(torneoRepo.findById(torneoId)).thenReturn(Optional.of(mockTorneo));

        Locale loc2 = new Locale();
        loc2.setId("SALA_GIOCHI_ROMA");
        loc2.setNome("Sala Giochi Roma");

        Utente u1 = new Utente();
        u1.setId(UUID.randomUUID());
        u1.setUsername("Mario");

        Utente u2 = new Utente();
        u2.setId(UUID.randomUUID());
        u2.setUsername("Luigi");

        IscrizioneTorneo isc1 = new IscrizioneTorneo();
        isc1.setId(new IscrizioneTorneoId(torneoId, u1.getId()));
        isc1.setTorneo(mockTorneo);
        isc1.setUtente(u1);
        isc1.setLocale(mockLocale);

        IscrizioneTorneo isc2 = new IscrizioneTorneo();
        isc2.setId(new IscrizioneTorneoId(torneoId, u2.getId()));
        isc2.setTorneo(mockTorneo);
        isc2.setUtente(u2);
        isc2.setLocale(loc2);

        when(iscrizioneRepo.findByTorneoId(torneoId)).thenReturn(List.of(isc1, isc2));

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

        // Locali
        assertThat(classifica.classificaLocali()).hasSize(2);
        VoceClassificaLocale primoLocale = classifica.classificaLocali().get(0);
        assertThat(primoLocale.posizione()).isEqualTo(1);
        assertThat(primoLocale.localeId()).isEqualTo("BAR_BELVEDERE");
        assertThat(primoLocale.percentualeVittorie()).isEqualTo(100.0);

        VoceClassificaLocale secondoLocale = classifica.classificaLocali().get(1);
        assertThat(secondoLocale.posizione()).isEqualTo(2);
        assertThat(secondoLocale.localeId()).isEqualTo("SALA_GIOCHI_ROMA");
        assertThat(secondoLocale.percentualeVittorie()).isEqualTo(0.0);

        // Giocatori
        assertThat(classifica.classificaGiocatori()).hasSize(2);
        VoceClassificaGiocatore primoGiocatore = classifica.classificaGiocatori().get(0);
        assertThat(primoGiocatore.posizione()).isEqualTo(1);
        assertThat(primoGiocatore.username()).isEqualTo("Mario");
        assertThat(primoGiocatore.localeId()).isEqualTo("BAR_BELVEDERE");
        assertThat(primoGiocatore.percentualeVittorie()).isEqualTo(100.0);
    }

    @Test
    @DisplayName("Iscrizione fallisce se torneo concluso")
    void testIscrizioneTorneoConclusoLanciaEccezione() {
        mockTorneo.setDataInizio(OffsetDateTime.now().minusDays(10));
        mockTorneo.setDataFine(OffsetDateTime.now().minusDays(1));

        when(torneoRepo.findById(torneoId)).thenReturn(Optional.of(mockTorneo));
        when(utenteRepo.findById(utenteId)).thenReturn(Optional.of(new Utente()));
        when(localeRepo.findById(localeId)).thenReturn(Optional.of(mockLocale));

        assertThatThrownBy(() -> torneoService.iscriviGiocatore(torneoId, utenteId, localeId))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("il torneo è già concluso");
    }

    @Test
    @DisplayName("Iscrizione fallisce se giocatore già iscritto")
    void testIscrizioneGiaPresenteLanciaEccezione() {
        when(torneoRepo.findById(torneoId)).thenReturn(Optional.of(mockTorneo));
        when(utenteRepo.findById(utenteId)).thenReturn(Optional.of(new Utente()));
        when(localeRepo.findById(localeId)).thenReturn(Optional.of(mockLocale));
        when(iscrizioneRepo.existsByIdTorneoIdAndIdUtenteId(torneoId, utenteId)).thenReturn(true);

        assertThatThrownBy(() -> torneoService.iscriviGiocatore(torneoId, utenteId, localeId))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Utente già iscritto");
    }

    @Test
    @DisplayName("Iscrizione fallisce se locale non partecipa al torneo")
    void testIscrizioneLocaleNonPartecipanteLanciaEccezione() {
        Locale altroLocale = new Locale();
        altroLocale.setId("LOCALE_ESTORNO");
        altroLocale.setNome("Locale Esterno");

        when(torneoRepo.findById(torneoId)).thenReturn(Optional.of(mockTorneo));
        when(utenteRepo.findById(utenteId)).thenReturn(Optional.of(new Utente()));
        when(localeRepo.findById("LOCALE_ESTORNO")).thenReturn(Optional.of(altroLocale));

        assertThatThrownBy(() -> torneoService.iscriviGiocatore(torneoId, utenteId, "LOCALE_ESTORNO"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("non partecipa a questo torneo");
    }

    @Test
    @DisplayName("Cancellazione torneo elimina iscrizioni e torneo dal repository")
    void testCancellaTorneo() {
        when(torneoRepo.findById(torneoId)).thenReturn(Optional.of(mockTorneo));

        torneoService.cancellaTorneo(torneoId);

        verify(iscrizioneRepo).deleteByTorneoId(torneoId);
        verify(torneoRepo).delete(mockTorneo);
    }
}
