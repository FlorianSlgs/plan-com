import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-goals-cards',
  standalone: true,
  templateUrl: './goals-cards.component.html',
  styleUrl: './goals-cards.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GoalsCardsComponent {
  @Input() title = "Titre de l'objectif";
  @Input() imageUrl = 'https://via.placeholder.com/120x80';
  @Input() description = "Description de l'objectif.";
  @Input() items: string[] = [];

  @Output() edit = new EventEmitter<void>();

  // TrackBy function pour optimiser le rendu des listes
  trackByItem = (index: number, item: string): string => item;

  onEditClick(): void {
    this.edit.emit();
  }
}