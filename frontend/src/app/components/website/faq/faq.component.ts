import { Component } from '@angular/core';

@Component({
  selector: 'app-faq',
  imports: [],
  templateUrl: './faq.component.html',
  styleUrl: './faq.component.scss'
})
export class FaqComponent {

  // Tableau pour gérer l'état ouvert/fermé de chaque FAQ
  openItems: boolean[] = new Array(15).fill(false);

  // Méthode pour basculer l'état d'un élément FAQ
  toggleItem(index: number): void {
    this.openItems[index] = !this.openItems[index];
  }
}