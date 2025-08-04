import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';

@Component({
  selector: 'app-targets-cards',
  standalone: true,
  imports: [],
  templateUrl: './targets-cards.component.html',
  styleUrl: './targets-cards.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TargetsCardsComponent {
  // Input signals
  title = input<string>("Titre de l'cible");
  imageUrl = input<string>('https://via.placeholder.com/120x80');
  description = input<string>("Description de l'cible.");
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
