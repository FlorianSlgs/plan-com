import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-goals-cards',
  standalone: true,
  templateUrl: './goals-cards.component.html',
  styleUrl: './goals-cards.component.scss'
})
export class GoalsCardsComponent {
  @Input() title = 'Titre de l’objectif';
  @Input() imageUrl = 'https://via.placeholder.com/120x80';
  @Input() description = 'Description de l’objectif.';
  @Input() items: string[] = [];
}