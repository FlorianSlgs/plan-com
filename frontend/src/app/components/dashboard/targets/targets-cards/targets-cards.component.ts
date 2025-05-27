import { Component } from '@angular/core';
import { Input } from '@angular/core';

@Component({
  selector: 'app-targets-cards',
  imports: [],
  templateUrl: './targets-cards.component.html',
  styleUrl: './targets-cards.component.scss'
})
export class TargetsCardsComponent {
  @Input() title = 'Titre de la cible';
  @Input() imageUrl = 'https://via.placeholder.com/120x80';
  @Input() description = 'Description de la cible.';
  @Input() items: string[] = [];
}
