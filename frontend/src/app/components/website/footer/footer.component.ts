import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-footer',
  imports: [],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss'
})
export class FooterComponent {
  constructor(private router: Router) {}

  navigateToCGU(): void {
    this.router.navigate(['/cgu']);
  }

  navigateToMentions(): void {
    this.router.navigate(['/mentions']);
  }

  navigateToConfidentialite(): void {
    this.router.navigate(['/confidentialite']);
  }
}
