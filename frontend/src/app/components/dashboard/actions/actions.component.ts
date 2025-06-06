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

  // --- Chargement des événements depuis la base ou le local ---
  loadEvents(): void {
    const userId = localStorage.getItem('userId') || undefined;
    const currentCampaign = localStorage.getItem('currentCampaign') || undefined;
    this.actionsService.getEvents(userId, currentCampaign).subscribe({
      next: (dbEvents) => {
        // Vérification de cohérence avec le localStorage
        const localEventsStr = localStorage.getItem('events');
        let localEvents: CalendarEvent[] = [];
        if (localEventsStr) {
          try {
            localEvents = JSON.parse(localEventsStr).map((e: any) => ({
              ...e,
              date: new Date(e.date)
            }));
          } catch {
            localEvents = [];
          }
        }

        // Si les données locales sont différentes, on prend la base
        if (!this.areEventsEqual(dbEvents, localEvents)) {
          this.events.set(dbEvents.map(e => ({ ...e, date: new Date(e.date) })));
          localStorage.setItem('events', JSON.stringify(dbEvents));
        } else {
          this.events.set(localEvents);
        }
      },
      error: () => {
        // Si erreur (ex: pas de connexion), fallback sur localStorage
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

  // --- Comparaison simple des listes d'événements ---
  areEventsEqual(eventsA: CalendarEvent[], eventsB: CalendarEvent[]): boolean {
    if (eventsA.length !== eventsB.length) return false;
    const sortFn = (a: CalendarEvent, b: CalendarEvent) => (a.id || '').localeCompare(b.id || '');
    const aSorted = [...eventsA].sort(sortFn);
    const bSorted = [...eventsB].sort(sortFn);
    for (let i = 0; i < aSorted.length; i++) {
      if (
        aSorted[i].id !== bSorted[i].id ||
        aSorted[i].title !== bSorted[i].title ||
        new Date(aSorted[i].date).getTime() !== new Date(bSorted[i].date).getTime() ||
        aSorted[i].startTime !== bSorted[i].startTime
      ) {
        return false;
      }
    }
    return true;
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
    const userId = localStorage.getItem('userId');

    if (title && eventDate) {
      const newEvent: CalendarEvent = {
        id: crypto.randomUUID(),
        title,
        date: eventDate,
        startTime: this.newEventTime() || undefined,
        currentCampaign: currentCampaign || undefined,
        userId: userId || undefined
      };
      this.actionsService.addEvent(newEvent).subscribe({
        next: (savedEvent) => {
          // Recharge depuis la base pour garantir la cohérence
          this.loadEvents();
          this.newEventTitle.set('');
          this.newEventTime.set('');
        },
        error: (err) => {
          // Si erreur, ajoute localement et sauvegarde dans localStorage
          const updatedEvents = [...this.events(), newEvent];
          this.events.set(updatedEvents);
          localStorage.setItem('events', JSON.stringify(updatedEvents));
          this.newEventTitle.set('');
          this.newEventTime.set('');
          console.error('Erreur lors de l\'ajout de l\'événement', err);
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

    const updatedEvent: CalendarEvent = {
      ...event,
      title: this.editEventTitle(),
      date: this.editEventDate()!,
      startTime: this.editEventTime() || undefined,
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