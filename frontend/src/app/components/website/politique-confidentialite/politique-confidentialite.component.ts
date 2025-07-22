import { Component } from '@angular/core';
import { HeaderComponent } from '../header_black/header.component';
import { FooterComponent } from '../footer/footer.component';

@Component({
  selector: 'app-politique-confidentialite',
  imports: [HeaderComponent, FooterComponent],
  templateUrl: './politique-confidentialite.component.html',
  styleUrl: './politique-confidentialite.component.scss'
})
export class PolitiqueConfidentialiteComponent {

}
