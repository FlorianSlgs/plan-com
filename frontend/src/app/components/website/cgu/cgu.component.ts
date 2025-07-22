import { Component } from '@angular/core';
import { HeaderComponent } from '../header_black/header.component';
import { FooterComponent } from '../footer/footer.component';

@Component({
  selector: 'app-cgu',
  imports: [HeaderComponent, FooterComponent],
  templateUrl: './cgu.component.html',
  styleUrl: './cgu.component.scss'
})
export class CguComponent {

}
