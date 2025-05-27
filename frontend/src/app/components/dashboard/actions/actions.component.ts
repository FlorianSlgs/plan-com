import { Component, signal, computed, WritableSignal, effect } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CalendarEvent } from './event.model';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe], // DatePipe pour formater les dates
  templateUrl: './actions.component.html',
  styleUrls: ['./actions.component.scss']
})
export class ActionsComponent {
  // --- Signaux pour la gestion de l'état ---
  events: WritableSignal<CalendarEvent[]> = signal([]);
  selectedDate: WritableSignal<Date> = signal(new Date()); // Date actuellement affichée/sélectionnée
  newEventTitle: WritableSignal<string> = signal('');
  newEventTime: WritableSignal<string> = signal(''); // Pour simplifier, on combine date et heure plus tard
  showAddEventModal: WritableSignal<boolean> = signal(false);

  // Propriétés pour l'affichage du calendrier
  currentMonth: WritableSignal<Date> = signal(new Date());
  daysInMonth = computed(() => {
    const date = this.currentMonth();
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Dimanche, 1 = Lundi...
    return {
      totalDays: days,
      emptyStartDays: (firstDayOfMonth === 0 ? 6 : firstDayOfMonth -1) // Ajuster si la semaine commence le Lundi
    };
  });

  weekDays: string[] = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  // Événements filtrés pour le mois courant (ou une autre logique de filtrage)
  // Pour l'affichage au-dessus, on pourrait vouloir tous les événements ou ceux d'une période.
  // Ici, on affiche tous les événements triés par date.
  displayedEvents = computed(() => this.events().sort((a, b) => a.date.getTime() - b.date.getTime()));

  constructor() {
    // Effet pour logger les changements (optionnel, pour démo)
    effect(() => {
      console.log('Events changed:', this.events());
      console.log('Selected date:', this.selectedDate());
    });

    // Exemple d'événements initiaux
    this.events.set([
      { id: '1', title: 'Réunion équipe', date: new Date(2025, 4, 12, 10, 0)}, // Mai est le mois 4 en JS (0-indexé)
      { id: '2', title: 'Présentation client', date: new Date(2025, 4, 15, 14, 30)},
      { id: '3', title: 'Déploiement v2.0', date: new Date(new Date().setDate(new Date().getDate() + 1)) }
    ]);
  }

  // --- Méthodes pour la gestion des événements ---
  addEvent(): void {
    const title = this.newEventTitle().trim();
    const eventDate = new Date(this.selectedDate()); // Utilise la date sélectionnée du calendrier

    if (this.newEventTime()) {
      const [hours, minutes] = this.newEventTime().split(':').map(Number);
      eventDate.setHours(hours);
      eventDate.setMinutes(minutes);
    } else {
      eventDate.setHours(0,0,0,0); // Début de journée si pas d'heure
    }


    if (title && eventDate) {
      const newEvent: CalendarEvent = {
        id: crypto.randomUUID(), // Génération d'ID simple pour l'exemple
        title,
        date: eventDate,
        startTime: this.newEventTime() || undefined
      };
      this.events.update(currentEvents => [...currentEvents, newEvent]);
      this.newEventTitle.set('');
      this.newEventTime.set('');
    }
  }

  selectDate(day: number | null, event?: MouseEvent): void {
    if (day) {
      const newSelectedDate = new Date(this.currentMonth().getFullYear(), this.currentMonth().getMonth(), day);
      this.selectedDate.set(newSelectedDate);
    }
    if (event) {
      // Potentiellement ouvrir un modal pour ajouter un événement à cette date
      console.log('Date cliquée:', this.selectedDate());
    }
  }

  // --- Méthodes pour la navigation du calendrier ---
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
}