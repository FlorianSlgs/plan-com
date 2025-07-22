import { Component } from '@angular/core';
import { HeaderComponent } from '../header_black/header.component';
import { FooterComponent } from '../footer/footer.component';

@Component({
  selector: 'app-mentions-legales',
  imports: [HeaderComponent, FooterComponent],
  templateUrl: './mentions-legales.component.html',
  styleUrl: './mentions-legales.component.scss'
})
export class MentionsLegalesComponent {

}
