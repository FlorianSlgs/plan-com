import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';

@Component({
  selector: 'app-goals-cards',
  standalone: true,
  templateUrl: './goals-cards.component.html',
  styleUrl: './goals-cards.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GoalsCardsComponent {
  // Input signals
  title = input<string>("Titre de l'objectif");
  imageUrl = input<string>('https://via.placeholder.com/120x80');
  description = input<string>("Description de l'objectif.");
  items = input<string[]>([]);
  canEdit = input<boolean>(false); // Nouveau input pour les permissions

  // Output
  edit = output<void>();

  // TrackBy function pour optimiser le rendu des listes
  trackByItem = (index: number, item: string): string => item;

  onEditClick(): void {
    if (this.canEdit()) {
      this.edit.emit();
    }
  }
}