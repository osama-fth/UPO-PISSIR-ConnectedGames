package com.connectedgames.core;

import com.connectedgames.core.dto.PartitaSyncInput;
import com.connectedgames.core.dto.SyncResultResponse;
import com.connectedgames.core.entity.InstallazioneGioco;
import com.connectedgames.core.entity.Locale;
import com.connectedgames.core.entity.Partita;
import com.connectedgames.core.entity.Torneo;
import com.connectedgames.core.entity.Utente;
import com.connectedgames.core.repository.InstallazioneGiocoRepository;
import com.connectedgames.core.repository.LocaleRepository;
import com.connectedgames.core.repository.PartitaRepository;
import com.connectedgames.core.repository.TorneoRepository;
import com.connectedgames.core.repository.UtenteRepository;
import com.connectedgames.core.service.PartitaService;

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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PartitaServiceTest {

    @Mock
    private PartitaRepository partitaRepo;
    @Mock
    private InstallazioneGiocoRepository installazioneRepo;
    @Mock
    private LocaleRepository localeRepo;
    @Mock
    private UtenteRepository utenteRepo;
    @Mock
    private TorneoRepository torneoRepo;

    @InjectMocks
    private PartitaService partitaService;

    private String localeId;
    private String installazioneId;
    private UUID partitaId;
    private UUID g1Id;
    private UUID g2Id;
    private Locale mockLocale;
    private InstallazioneGioco mockInstallazione;
    private Utente g1;
    private Utente g2;

    @BeforeEach
    void setUp() {
        localeId = "BAR_BELVEDERE";
        installazioneId = "calciobalilla-1";
        partitaId = UUID.randomUUID();
        g1Id = UUID.randomUUID();
        g2Id = UUID.randomUUID();

        mockLocale = new Locale();
        mockLocale.setId(localeId);
        mockLocale.setNome("Bar Belvedere");

        mockInstallazione = new InstallazioneGioco();
        mockInstallazione.setId(installazioneId);

        g1 = new Utente();
        g1.setId(g1Id);
        g1.setUsername("p1");

        g2 = new Utente();
        g2.setId(g2Id);
        g2.setUsername("p2");
    }

    @Test
    @DisplayName("Sincronizzazione partita amichevole valida")
    void testSincronizzaPartitaValidaAmichevole() {
        PartitaSyncInput input = new PartitaSyncInput(
                partitaId, installazioneId, localeId,
                g1Id, "p1", g2Id, "p2", 10, 8,
                OffsetDateTime.now().minusMinutes(10), OffsetDateTime.now(), null
        );

        when(partitaRepo.existsById(partitaId)).thenReturn(false);
        when(installazioneRepo.findById(installazioneId)).thenReturn(Optional.of(mockInstallazione));
        when(localeRepo.findById(localeId)).thenReturn(Optional.of(mockLocale));
        when(utenteRepo.findById(g1Id)).thenReturn(Optional.of(g1));
        when(utenteRepo.findById(g2Id)).thenReturn(Optional.of(g2));

        SyncResultResponse result = partitaService.sincronizzaPartite(localeId, List.of(input));

        assertThat(result.salvate()).containsExactly(partitaId);
        assertThat(result.fallite()).isEmpty();
        verify(partitaRepo, times(1)).save(any(Partita.class));
    }

    @Test
    @DisplayName("Idempotenza sincronizzazione: partita duplicata non genera errore")
    void testIdempotenzaPartitaDuplicata() {
        PartitaSyncInput input = new PartitaSyncInput(
                partitaId, installazioneId, localeId,
                g1Id, "p1", g2Id, "p2", 10, 5,
                OffsetDateTime.now().minusMinutes(5), OffsetDateTime.now(), null
        );

        when(partitaRepo.existsById(partitaId)).thenReturn(true);

        SyncResultResponse result = partitaService.sincronizzaPartite(localeId, List.of(input));

        assertThat(result.salvate()).containsExactly(partitaId);
        assertThat(result.fallite()).isEmpty();
        verify(partitaRepo, never()).save(any(Partita.class));
    }

    @Test
    @DisplayName("Mismatch localeId tra path e payload")
    void testMismatchLocaleId() {
        PartitaSyncInput input = new PartitaSyncInput(
                partitaId, installazioneId, "ALTRO_LOCALE",
                g1Id, "p1", g2Id, "p2", 10, 5,
                OffsetDateTime.now().minusMinutes(5), OffsetDateTime.now(), null
        );

        SyncResultResponse result = partitaService.sincronizzaPartite(localeId, List.of(input));

        assertThat(result.salvate()).isEmpty();
        assertThat(result.fallite()).hasSize(1);
        assertThat(result.fallite().get(0).errore()).contains("non corrisponde a quello del path");
    }

    @Test
    @DisplayName("Partita torneo valida associata al torneo")
    void testPartitaTorneoValido() {
        UUID torneoId = UUID.randomUUID();
        PartitaSyncInput input = new PartitaSyncInput(
                partitaId, installazioneId, localeId,
                g1Id, "p1", g2Id, "p2", 10, 9,
                OffsetDateTime.now().minusMinutes(15), OffsetDateTime.now(), torneoId
        );

        Torneo torneo = new Torneo();
        torneo.setId(torneoId);
        torneo.setDataInizio(OffsetDateTime.now().minusDays(1));
        torneo.setDataFine(OffsetDateTime.now().plusDays(1));

        when(partitaRepo.existsById(partitaId)).thenReturn(false);
        when(installazioneRepo.findById(installazioneId)).thenReturn(Optional.of(mockInstallazione));
        when(localeRepo.findById(localeId)).thenReturn(Optional.of(mockLocale));
        when(utenteRepo.findById(g1Id)).thenReturn(Optional.of(g1));
        when(utenteRepo.findById(g2Id)).thenReturn(Optional.of(g2));
        when(torneoRepo.findById(torneoId)).thenReturn(Optional.of(torneo));
        when(partitaRepo.countIscrizioniByTorneoIdAndGiocatoriId(torneoId, g1Id, g2Id)).thenReturn(2L);

        SyncResultResponse result = partitaService.sincronizzaPartite(localeId, List.of(input));

        assertThat(result.salvate()).containsExactly(partitaId);
        verify(partitaRepo).save(argThat(p -> p.getTorneo() != null && p.getTorneo().getId().equals(torneoId)));
    }

    @Test
    @DisplayName("Partita torneo fuori finestra temporale declassata ad amichevole")
    void testPartitaTorneoScadutoDeclassataAdAmichevole() {
        UUID torneoId = UUID.randomUUID();
        PartitaSyncInput input = new PartitaSyncInput(
                partitaId, installazioneId, localeId,
                g1Id, "p1", g2Id, "p2", 10, 9,
                OffsetDateTime.now().minusMinutes(15), OffsetDateTime.now(), torneoId
        );

        Torneo torneoScaduto = new Torneo();
        torneoScaduto.setId(torneoId);
        torneoScaduto.setDataInizio(OffsetDateTime.now().minusDays(10));
        torneoScaduto.setDataFine(OffsetDateTime.now().minusDays(1));

        when(partitaRepo.existsById(partitaId)).thenReturn(false);
        when(installazioneRepo.findById(installazioneId)).thenReturn(Optional.of(mockInstallazione));
        when(localeRepo.findById(localeId)).thenReturn(Optional.of(mockLocale));
        when(utenteRepo.findById(g1Id)).thenReturn(Optional.of(g1));
        when(utenteRepo.findById(g2Id)).thenReturn(Optional.of(g2));
        when(torneoRepo.findById(torneoId)).thenReturn(Optional.of(torneoScaduto));
        when(partitaRepo.countIscrizioniByTorneoIdAndGiocatoriId(torneoId, g1Id, g2Id)).thenReturn(2L);

        SyncResultResponse result = partitaService.sincronizzaPartite(localeId, List.of(input));

        assertThat(result.salvate()).containsExactly(partitaId);
        verify(partitaRepo).save(argThat(p -> p.getTorneo() == null));
    }

    @Test
    @DisplayName("Auto-registrazione utente in platform_db")
    void testAutoRegistrazioneUtente() {
        PartitaSyncInput input = new PartitaSyncInput(
                partitaId, installazioneId, localeId,
                g1Id, "nuovo_utente", null, null, 10, 0,
                OffsetDateTime.now().minusMinutes(5), OffsetDateTime.now(), null
        );

        when(partitaRepo.existsById(partitaId)).thenReturn(false);
        when(installazioneRepo.findById(installazioneId)).thenReturn(Optional.of(mockInstallazione));
        when(localeRepo.findById(localeId)).thenReturn(Optional.of(mockLocale));
        when(utenteRepo.findById(g1Id)).thenReturn(Optional.empty());
        when(utenteRepo.saveAndFlush(any(Utente.class))).thenAnswer(invocation -> invocation.getArgument(0));

        SyncResultResponse result = partitaService.sincronizzaPartite(localeId, List.of(input));

        assertThat(result.salvate()).containsExactly(partitaId);
        verify(utenteRepo, times(1)).saveAndFlush(argThat(u -> u.getId().equals(g1Id) && u.getUsername().equals("nuovo_utente")));
    }
}
