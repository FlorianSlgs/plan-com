import { Component, signal, computed, WritableSignal, effect } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CalendarEvent } from './event.model';
import { ActionsService } from '../../../services/actions/actions.service';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './actions.component.html',
  styleUrls: ['./actions.component.scss']
})
export class ActionsComponent {
  events: WritableSignal<CalendarEvent[]> = signal([]);
  selectedDate: WritableSignal<Date> = signal(new Date());
  newEventTitle: WritableSignal<string> = signal('');
  newEventTime: WritableSignal<string> = signal('');
  showAddEventModal: WritableSignal<boolean> = signal(false);

  currentMonth: WritableSignal<Date> = signal(new Date());
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

  weekDays: string[] = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  editEvent: WritableSignal<CalendarEvent | null> = signal(null);
  editEventTitle: WritableSignal<string> = signal('');
  editEventTime: WritableSignal<string> = signal('');
  editEventDate: WritableSignal<Date | null> = signal(null);
  showEditEventModal: WritableSignal<boolean> = signal(false);

  displayedEvents = computed(() => this.events().sort((a, b) => a.date.getTime() - b.date.getTime()));

  constructor(private actionsService: ActionsService) {
    effect(() => {
      console.log('Events changed:', this.events());
      console.log('Selected date:', this.selectedDate());
    });

    this.loadEvents();
  }

  // --- Chargement des événements depuis la base ---
  loadEvents(): void {
    const currentCampaign = localStorage.getItem('currentCampaign') || undefined;
    this.actionsService.getEvents(currentCampaign).subscribe({
      next: (dbEvents) => {
        this.events.set(dbEvents.map(e => ({ ...e, date: new Date(e.date) })));
        // Optionnel : sauvegarder en local pour cache
        localStorage.setItem('events', JSON.stringify(dbEvents));
      },
      error: (err) => {
        console.error('Erreur lors du chargement des événements:', err);
        // Fallback sur localStorage si disponible
        const localEventsStr = localStorage.getItem('events');
        if (localEventsStr) {
          try {
            const localEvents = JSON.parse(localEventsStr).map((e: any) => ({
              ...e,
              date: new Date(e.date)
            }));
            this.events.set(localEvents);
          } catch {
            this.events.set([]);
          }
        } else {
          this.events.set([]);
        }
      }
    });
  }

  // --- Ajout d'un événement ---
  addEvent(): void {
    const title = this.newEventTitle().trim();
    const eventDate = new Date(this.selectedDate());

    if (this.newEventTime()) {
      const [hours, minutes] = this.newEventTime().split(':').map(Number);
      eventDate.setHours(hours);
      eventDate.setMinutes(minutes);
    } else {
      eventDate.setHours(0, 0, 0, 0);
    }

    const currentCampaign = localStorage.getItem('currentCampaign');

    if (title && eventDate) {
      const newEvent: CalendarEvent = {
        id: crypto.randomUUID(),
        title,
        date: eventDate,
        startTime: this.newEventTime() || undefined,
        currentCampaign: currentCampaign || undefined
        // userId sera automatiquement récupéré depuis le cookie côté serveur
      };
      
      this.actionsService.addEvent(newEvent).subscribe({
        next: (savedEvent) => {
          // Recharge depuis la base pour garantir la cohérence
          this.loadEvents();
          this.newEventTitle.set('');
          this.newEventTime.set('');
        },
        error: (err) => {
          console.error('Erreur lors de l\'ajout de l\'événement', err);
          // Si erreur, ajoute localement et sauvegarde dans localStorage
          const updatedEvents = [...this.events(), newEvent];
          this.events.set(updatedEvents);
          localStorage.setItem('events', JSON.stringify(updatedEvents));
          this.newEventTitle.set('');
          this.newEventTime.set('');
        }
      });
    }
  }

  selectDate(day: number | null, event?: MouseEvent): void {
    if (day) {
      const newSelectedDate = new Date(this.currentMonth().getFullYear(), this.currentMonth().getMonth(), day);
      this.selectedDate.set(newSelectedDate);
    }
    if (event) {
      console.log('Date cliquée:', this.selectedDate());
    }
  }

  previousMonth(): void {
    this.currentMonth.update(date => {
      const newDate = new Date(date);
      newDate.setMonth(date.getMonth() - 1);
      return newDate;
    });
    this.selectedDate.set(new Date(this.currentMonth()));
  }

  nextMonth(): void {
    this.currentMonth.update(date => {
      const newDate = new Date(date);
      newDate.setMonth(date.getMonth() + 1);
      return newDate;
    });
    this.selectedDate.set(new Date(this.currentMonth()));
  }

  isToday(day: number): boolean {
    const today = new Date();
    const dateToCheck = new Date(this.currentMonth().getFullYear(), this.currentMonth().getMonth(), day);
    return today.toDateString() === dateToCheck.toDateString();
  }

  isSelected(day: number): boolean {
    const selected = this.selectedDate();
    const dateToCheck = new Date(this.currentMonth().getFullYear(), this.currentMonth().getMonth(), day);
    return selected.toDateString() === dateToCheck.toDateString();
  }

  getEventsForDay(day: number): CalendarEvent[] {
    const dateToCheck = new Date(this.currentMonth().getFullYear(), this.currentMonth().getMonth(), day);
    return this.events().filter(event =>
      event.date.getFullYear() === dateToCheck.getFullYear() &&
      event.date.getMonth() === dateToCheck.getMonth() &&
      event.date.getDate() === dateToCheck.getDate()
    );
  }

  openEditEventModal(event: CalendarEvent) {
    this.editEvent.set(event);
    this.editEventTitle.set(event.title);
    this.editEventTime.set(event.startTime || '');
    this.editEventDate.set(event.date);
    this.showEditEventModal.set(true);
  }

  updateEvent(): void {
    const event = this.editEvent();
    if (!event) return;

    const currentCampaign = localStorage.getItem('currentCampaign');
    const updatedEvent: CalendarEvent = {
      ...event,
      title: this.editEventTitle(),
      date: this.editEventDate()!,
      startTime: this.editEventTime() || undefined,
      currentCampaign: currentCampaign || undefined
      // userId sera automatiquement récupéré depuis le cookie côté serveur
    };

    this.actionsService.updateEvent(updatedEvent).subscribe({
      next: () => {
        this.showEditEventModal.set(false);
        this.editEvent.set(null);
        this.loadEvents();
      },
      error: (err) => {
        alert('Erreur lors de la modification');
        console.error(err);
      }
    });
  }

  onEditEventDateChange(value: string) {
    this.editEventDate.set(value ? new Date(value) : null);
  }

  deleteEvent() {
    const event = this.editEvent();
    if (!event || !event.id) return;
    this.actionsService.deleteEvent(event.id).subscribe({
      next: () => {
        this.showEditEventModal.set(false);
        this.editEvent.set(null);
        this.loadEvents();
      },
      error: (err) => {
        alert('Erreur lors de la suppression');
        console.error(err);
      }
    });
  }
}