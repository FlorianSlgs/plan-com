import { Component, Output, EventEmitter, OnInit, signal, inject, DestroyRef } from '@angular/core';
import { HeaderService } from '../../../services/header/header.service';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { DOCUMENT } from '@angular/common'; // Ajout de cet import

interface Campaign {
  id: number;
  name: string;
}

interface User {
  first_name: string;
  last_name: string;
}

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private document = inject(DOCUMENT); // Injection du document
  
  @Output() logout = new EventEmitter<void>();
  @Output() campaignSelected = new EventEmitter<string>();
  
  // Signals pour la gestion d'état réactive
  userFullName = signal<string>('');
  campaigns = signal<Campaign[]>([]);
  currentCampaign = signal<string>('');
  showCampaignModal = signal<boolean>(false);
  campaignName = signal<string>('');
  loadingState = signal<'idle' | 'loading' | 'error'>('idle');
  error = signal<string | null>(null);

  constructor(private headerService: HeaderService) {}

  ngOnInit() {
    this.loadInitialData();
    this.loadCurrentCampaign();
  }

  private loadInitialData() {
    this.loadingState.set('loading');
    
    forkJoin({
      user: this.headerService.getUserName(),
      campaigns: this.headerService.getCampaigns()
    })
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe({
      next: ({ user, campaigns }) => {
        this.userFullName.set(`${user.first_name} ${user.last_name}`);
        this.campaigns.set(campaigns);
        this.loadingState.set('idle');
        this.error.set(null);
      },
      error: (err) => {
        this.userFullName.set('Utilisateur');
        this.campaigns.set([]);
        this.loadingState.set('error');
        this.error.set('Erreur lors du chargement des données');
        console.error('Erreur lors du chargement:', err);
      }
    });
  }

  private loadCurrentCampaign() {
    const savedCampaign = localStorage.getItem('currentCampaign') || '';
    this.currentCampaign.set(savedCampaign);
  }

  selectCampaign(name: string) {
    localStorage.setItem('currentCampaign', name);
    this.currentCampaign.set(name);
    this.campaignSelected.emit(name);
    
    // Rechargement de la page
    this.document.defaultView?.location.reload();
  }

  onLogout() {
    this.logout.emit();
  }

  createCampaign() {
    const name = this.campaignName().trim();
    if (!name) return;
    
    this.loadingState.set('loading');
    
    this.headerService.createCampaign(name)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          // Ajoute la nouvelle campagne à la liste
          const newCampaign: Campaign = { 
            id: Date.now(), // ID temporaire
            name: name 
          };
          this.campaigns.update(campaigns => [...campaigns, newCampaign]);
          
          // Sélectionne la nouvelle campagne
          this.selectCampaign(name);
          
          // Ferme le modal et remet à zéro
          this.showCampaignModal.set(false);
          this.campaignName.set('');
          this.loadingState.set('idle');
          this.error.set(null);
        },
        error: (err) => {
          this.loadingState.set('error');
          this.error.set('Erreur lors de la création de la campagne');
          console.error('Erreur création campagne:', err);
        }
      });
  }

  openCampaignModal() {
    this.showCampaignModal.set(true);
    this.campaignName.set('');
    this.error.set(null);
  }

  closeCampaignModal() {
    this.showCampaignModal.set(false);
    this.campaignName.set('');
    this.error.set(null);
  }

  updateCampaignName(event: Event) {
    const target = event.target as HTMLInputElement;
    this.campaignName.set(target.value);
  }

  // Getters pour compatibilité template
  get dropdownOpen() { return false; } // Géré par CSS
}