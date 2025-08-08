import { Component, signal, computed, WritableSignal, effect, ViewChild, ElementRef, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { A11yModule } from '@angular/cdk/a11y';
import { Subject, takeUntil, finalize } from 'rxjs';
import { CalendarEvent, CampaignAccess } from '../../../models/event.model';
import { ActionsService } from '../../../services/dashboard/actions/actions.service';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, A11yModule],
  templateUrl: './actions.component.html',
  styleUrls: ['./actions.component.scss']
})
export class ActionsComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  // ViewChild pour le focus automatique
  @ViewChild('firstInputAdd') firstInputAdd!: ElementRef<HTMLInputElement>;
  @ViewChild('firstInputEdit') firstInputEdit!: ElementRef<HTMLInputElement>;

  // Signals pour la gestion d'état réactive
  events: WritableSignal<CalendarEvent[]> = signal([]);
  selectedDate: WritableSignal<Date> = signal(new Date());
  newEventTitle: WritableSignal<string> = signal('');
  newEventTime: WritableSignal<string> = signal('');
  showAddEventModal: WritableSignal<boolean> = signal(false);
  loading: WritableSignal<boolean> = signal(false);
  error: WritableSignal<string | null> = signal(null);
  
  // Signal pour gérer les permissions
  campaignAccess: WritableSignal<CampaignAccess> = signal({
    hasAccess: true,
    isReadOnly: false,
    isOwner: true
  });

  // Signals pour le calendrier
  currentMonth: WritableSignal<Date> = signal(new Date());
  
  // Signals pour l'édition d'événements
  editEvent: WritableSignal<CalendarEvent | null> = signal(null);
  editEventTitle: WritableSignal<string> = signal('');
  editEventTime: WritableSignal<string> = signal('');
  editEventDate: WritableSignal<Date | null> = signal(null);
  showEditEventModal: WritableSignal<boolean> = signal(false);

  // Computed signals
  daysInMonth = computed(() => {
    const date = this.currentMonth();
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    return {
      totalDays: days,
      emptyStartDays: (firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1)
    };
  });

  displayedEvents = computed(() => 
    this.events().sort((a, b) => a.date.getTime() - b.date.getTime())
  );

  canModify = computed(() => 
    this.campaignAccess().hasAccess && !this.campaignAccess().isReadOnly
  );

  // Constantes
  weekDays: string[] = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  constructor(private actionsService: ActionsService) {
    effect(() => {
      console.log('Events changed:', this.events());
      console.log('Selected date:', this.selectedDate());
      console.log('Campaign access:', this.campaignAccess());
    });
  }

  ngOnInit(): void {
    this.loadEvents();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ===================
  // GESTION DES ÉVÉNEMENTS
  // ===================

  /**
   * Charge les événements depuis le service avec gestion des permissions
   */
  loadEvents(): void {
    const currentCampaignId = localStorage.getItem('currentCampaignId');

    if (!currentCampaignId) {
      this.events.set([]);
      this.campaignAccess.set({
        hasAccess: true,
        isReadOnly: false,
        isOwner: true
      });
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.actionsService.getEventsWithAccess(currentCampaignId)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: (response) => {
          const eventsWithDates = response.events.map(e => ({
            ...e,
            date: new Date(e.date)
          }));
          this.events.set(eventsWithDates);
          this.campaignAccess.set(response.access);
          
          // Cache local pour améliorer les performances
          localStorage.setItem('events', JSON.stringify(response.events));
          localStorage.setItem('campaignAccess', JSON.stringify(response.access));
        },
        error: (err) => {
          this.error.set('Erreur lors du chargement des événements');
          console.error('Erreur lors du chargement des événements:', err);
          
          // Fallback sur localStorage si disponible
          this.loadFromCache();
        }
      });
  }

  /**
   * Charge les données depuis le cache local
   */
  private loadFromCache(): void {
    try {
      const localEventsStr = localStorage.getItem('events');
      const localAccessStr = localStorage.getItem('campaignAccess');
      
      if (localEventsStr) {
        const localEvents = JSON.parse(localEventsStr).map((e: any) => ({
          ...e,
          date: new Date(e.date)
        }));
        this.events.set(localEvents);
      }

      if (localAccessStr) {
        this.campaignAccess.set(JSON.parse(localAccessStr));
      }
    } catch (error) {
      console.error('Erreur lors du chargement du cache:', error);
      this.events.set([]);
      this.campaignAccess.set({
        hasAccess: true,
        isReadOnly: false,
        isOwner: true
      });
    }
  }

  /**
   * Ouvre le modal d'ajout avec focus automatique
   */
  openAddEventModal(): void {
    if (!this.canModify()) {
      this.error.set('Vous n\'avez pas les permissions pour ajouter des événements');
      return;
    }

    this.showAddEventModal.set(true);
    this.error.set(null);

    // Focus automatique sur le premier champ
    setTimeout(() => {
      if (this.firstInputAdd?.nativeElement) {
        this.firstInputAdd.nativeElement.focus();
      }
    }, 100);
  }

  /**
   * Ferme le modal d'ajout et nettoie l'état
   */
  closeAddEventModal(): void {
    this.showAddEventModal.set(false);
    this.newEventTitle.set('');
    this.newEventTime.set('');
    this.error.set(null);
  }

  /**
   * Ajoute un nouvel événement avec validation
   */
  addEvent(): void {
    if (!this.canModify()) {
      this.error.set('Vous n\'avez pas les permissions pour ajouter des événements');
      return;
    }

    const title = this.newEventTitle().trim();
    if (!title) {
      this.error.set('Le titre de l\'événement est requis');
      return;
    }

    if (!this.selectedDate()) {
      this.error.set('Veuillez sélectionner une date');
      return;
    }

    const eventDate = new Date(this.selectedDate());
    
    // Définir l'heure si spécifiée
    if (this.newEventTime()) {
      const [hours, minutes] = this.newEventTime().split(':').map(Number);
      eventDate.setHours(hours, minutes, 0, 0);
    } else {
      eventDate.setHours(0, 0, 0, 0);
    }

    const currentCampaignId = localStorage.getItem('currentCampaignId');
    const newEvent: CalendarEvent = {
      id: crypto.randomUUID(),
      title,
      date: eventDate,
      startTime: this.newEventTime() || undefined,
      campaignId: currentCampaignId || undefined
    };

    this.loading.set(true);
    this.error.set(null);
      
    this.actionsService.addEvent(newEvent)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: () => {
          this.closeAddEventModal();
          this.loadEvents();
        },
        error: (err) => {
          if (err.status === 403) {
            this.error.set('Permissions insuffisantes pour ajouter cet événement');
          } else {
            this.error.set('Erreur lors de l\'ajout de l\'événement');
            console.error('Erreur lors de l\'ajout:', err);
            
            // Fallback local si ce n'est pas un problème de permissions
            if (err.status !== 403) {
              const updatedEvents = [...this.events(), newEvent];
              this.events.set(updatedEvents);
              localStorage.setItem('events', JSON.stringify(updatedEvents));
              this.closeAddEventModal();
            }
          }
        }
      });
  }

  /**
   * Ouvre le modal d'édition avec pré-remplissage et focus automatique
   */
  openEditEventModal(event: CalendarEvent): void {
    if (!this.canModify()) {
      this.error.set('Vous n\'avez pas les permissions pour modifier des événements');
      return;
    }

    this.editEvent.set(event);
    this.editEventTitle.set(event.title);
    this.editEventTime.set(event.startTime || '');
    this.editEventDate.set(event.date);
    this.showEditEventModal.set(true);
    this.error.set(null);

    // Focus automatique sur le premier champ
    setTimeout(() => {
      if (this.firstInputEdit?.nativeElement) {
        this.firstInputEdit.nativeElement.focus();
      }
    }, 100);
  }

  /**
   * Ferme le modal d'édition et nettoie l'état
   */
  closeEditEventModal(): void {
    this.showEditEventModal.set(false);
    this.editEvent.set(null);
    this.editEventTitle.set('');
    this.editEventTime.set('');
    this.editEventDate.set(null);
    this.error.set(null);
  }

  /**
   * Met à jour un événement existant
   */
  updateEvent(): void {
    const event = this.editEvent();
    if (!event) {
      this.error.set('Événement non trouvé');
      return;
    }

    if (!this.canModify()) {
      this.error.set('Vous n\'avez pas les permissions pour modifier des événements');
      return;
    }

    const title = this.editEventTitle().trim();
    if (!title) {
      this.error.set('Le titre de l\'événement est requis');
      return;
    }

    if (!this.editEventDate()) {
      this.error.set('La date est requise');
      return;
    }

    const currentCampaignId = localStorage.getItem('currentCampaignId');
    const updatedEvent: CalendarEvent = {
      ...event,
      title,
      date: this.editEventDate()!,
      startTime: this.editEventTime() || undefined,
      campaignId: currentCampaignId || undefined
    };

    this.loading.set(true);
    this.error.set(null);

    this.actionsService.updateEvent(updatedEvent)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: () => {
          this.closeEditEventModal();
          this.loadEvents();
        },
        error: (err) => {
          if (err.status === 403) {
            this.error.set('Permissions insuffisantes pour modifier cet événement');
          } else {
            this.error.set('Erreur lors de la modification de l\'événement');
            console.error('Erreur lors de la modification:', err);
          }
        }
      });
  }

  /**
   * Supprime un événement avec confirmation
   */
  deleteEvent(): void {
    const event = this.editEvent();
    if (!event || !event.id) {
      this.error.set('Événement non trouvé');
      return;
    }

    if (!this.canModify()) {
      this.error.set('Vous n\'avez pas les permissions pour supprimer des événements');
      return;
    }

    // Confirmation de suppression
    if (!confirm(`Êtes-vous sûr de vouloir supprimer l'événement "${event.title}" ?`)) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.actionsService.deleteEvent(event.id)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: () => {
          this.closeEditEventModal();
          this.loadEvents();
        },
        error: (err) => {
          if (err.status === 403) {
            this.error.set('Permissions insuffisantes pour supprimer cet événement');
          } else {
            this.error.set('Erreur lors de la suppression de l\'événement');
            console.error('Erreur lors de la suppression:', err);
          }
        }
      });
  }

  /**
   * Gère le changement de date dans le modal d'édition
   */
  onEditEventDateChange(value: string): void {
    this.editEventDate.set(value ? new Date(value) : null);
  }

  /**
   * Efface le message d'erreur
   */
  clearError(): void {
    this.error.set(null);
  }

  // ===================
  // GESTION DU CALENDRIER
  // ===================

  /**
   * Sélectionne une date dans le calendrier
   */
  selectDate(day: number | null, event?: MouseEvent): void {
    if (day) {
      const newSelectedDate = new Date(
        this.currentMonth().getFullYear(),
        this.currentMonth().getMonth(),
        day
      );
      this.selectedDate.set(newSelectedDate);
    }
    
    if (event) {
      console.log('Date sélectionnée:', this.selectedDate());
    }
  }

  /**
   * Navigue vers le mois précédent
   */
  previousMonth(): void {
    this.currentMonth.update(date => {
      const newDate = new Date(date);
      newDate.setMonth(date.getMonth() - 1);
      return newDate;
    });
    
    // Met à jour la date sélectionnée pour rester dans le mois affiché
    this.selectedDate.set(new Date(this.currentMonth()));
  }

  /**
   * Navigue vers le mois suivant
   */
  nextMonth(): void {
    this.currentMonth.update(date => {
      const newDate = new Date(date);
      newDate.setMonth(date.getMonth() + 1);
      return newDate;
    });
    
    // Met à jour la date sélectionnée pour rester dans le mois affiché
    this.selectedDate.set(new Date(this.currentMonth()));
  }

  /**
   * Vérifie si un jour est aujourd'hui
   */
  isToday(day: number): boolean {
    const today = new Date();
    const dateToCheck = new Date(
      this.currentMonth().getFullYear(),
      this.currentMonth().getMonth(),
      day
    );
    return today.toDateString() === dateToCheck.toDateString();
  }

  /**
   * Vérifie si un jour est sélectionné
   */
  isSelected(day: number): boolean {
    const selected = this.selectedDate();
    const dateToCheck = new Date(
      this.currentMonth().getFullYear(),
      this.currentMonth().getMonth(),
      day
    );
    return selected.toDateString() === dateToCheck.toDateString();
  }

  /**
   * Récupère les événements pour un jour donné
   */
  getEventsForDay(day: number): CalendarEvent[] {
    const dateToCheck = new Date(
      this.currentMonth().getFullYear(),
      this.currentMonth().getMonth(),
      day
    );
    
    return this.events().filter(event =>
      event.date.getFullYear() === dateToCheck.getFullYear() &&
      event.date.getMonth() === dateToCheck.getMonth() &&
      event.date.getDate() === dateToCheck.getDate()
    );
  }

  /**
   * Vérifie si le formulaire d'ajout est valide
   */
  isAddFormValid(): boolean {
    return this.newEventTitle().trim().length > 0 && !!this.selectedDate();
  }

  /**
   * Vérifie si le formulaire d'édition est valide
   */
  isEditFormValid(): boolean {
    return this.editEventTitle().trim().length > 0 && !!this.editEventDate();
  }

  /**
   * Formate une date pour l'affichage
   */
  formatDate(date: Date): string {
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * Formate une heure pour l'affichage
   */
  formatTime(time: string): string {
    return time ? time.slice(0, 5) : '';
  }

  /**
   * Retourne le nombre d'événements pour le mois courant
   */
  getMonthEventCount(): number {
    const currentMonth = this.currentMonth();
    return this.events().filter(event =>
      event.date.getFullYear() === currentMonth.getFullYear() &&
      event.date.getMonth() === currentMonth.getMonth()
    ).length;
  }

  /**
   * Vérifie si une date a des événements
   */
  hasEventsOnDay(day: number): boolean {
    return this.getEventsForDay(day).length > 0;
  }

  /**
   * Navigue vers le mois actuel
   */
  goToCurrentMonth(): void {
    const now = new Date();
    this.currentMonth.set(new Date(now.getFullYear(), now.getMonth(), 1));
    this.selectedDate.set(now);
  }

  /**
   * Navigue vers une date spécifique
   */
  goToDate(date: Date): void {
    this.currentMonth.set(new Date(date.getFullYear(), date.getMonth(), 1));
    this.selectedDate.set(date);
  }

  /**
   * Crée un nouvel événement rapide (sans modal)
   */
  createQuickEvent(day: number, title: string): void {
    if (!this.canModify() || !title.trim()) {
      return;
    }

    const eventDate = new Date(
      this.currentMonth().getFullYear(),
      this.currentMonth().getMonth(),
      day
    );

    const newEvent: CalendarEvent = {
      id: crypto.randomUUID(),
      title: title.trim(),
      date: eventDate,
      campaignId: localStorage.getItem('currentCampaignId') || undefined
    };

    this.loading.set(true);

    this.actionsService.addEvent(newEvent)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: () => {
          this.loadEvents();
        },
        error: (err) => {
          console.error('Erreur lors de la création rapide:', err);
          this.error.set('Erreur lors de la création de l\'événement');
        }
      });
  }

  /**
   * Duplique un événement
   */
  duplicateEvent(event: CalendarEvent): void {
    if (!this.canModify()) {
      this.error.set('Permissions insuffisantes pour dupliquer cet événement');
      return;
    }

    const duplicatedEvent: CalendarEvent = {
      id: crypto.randomUUID(),
      title: `${event.title} (copie)`,
      date: new Date(event.date),
      startTime: event.startTime,
      campaignId: event.campaignId
    };

    this.loading.set(true);

    this.actionsService.addEvent(duplicatedEvent)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: () => {
          this.loadEvents();
        },
        error: (err) => {
          console.error('Erreur lors de la duplication:', err);
          this.error.set('Erreur lors de la duplication de l\'événement');
        }
      });
  }

  /**
   * Exporte les événements du mois courant
   */
  exportMonthEvents(): void {
    const currentMonth = this.currentMonth();
    const monthEvents = this.events().filter(event =>
      event.date.getFullYear() === currentMonth.getFullYear() &&
      event.date.getMonth() === currentMonth.getMonth()
    );

    if (monthEvents.length === 0) {
      alert('Aucun événement à exporter pour ce mois');
      return;
    }

    const csv = this.convertEventsToCSV(monthEvents);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `evenements-${currentMonth.getFullYear()}-${currentMonth.getMonth() + 1}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  /**
   * Convertit les événements en format CSV
   */
  private convertEventsToCSV(events: CalendarEvent[]): string {
    const headers = ['Titre', 'Date', 'Heure'];
    const rows = events.map(event => [
      event.title,
      event.date.toLocaleDateString('fr-FR'),
      event.startTime || ''
    ]);

    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
  }
}