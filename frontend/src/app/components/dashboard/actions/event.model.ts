export interface CalendarEvent {
  id?: string; // Optionnel, pourrait être généré
  title: string;
  date: Date; // Date complète de l'événement
  startTime?: string; // Heure de début, ex: "10:00"
  campaignId?: string; // ID de la campagne
  userId?: string; // ID de l'utilisateur
}