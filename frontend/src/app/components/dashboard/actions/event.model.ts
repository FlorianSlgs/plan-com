export interface CalendarEvent {
  id?: string; // Optionnel, pourrait être généré
  title: string;
  date: Date; // Date complète de l'événement
  startTime?: string; // Heure de début, ex: "10:00"
  endTime?: string;   // Heure de fin, ex: "11:00"
  description?: string;
}