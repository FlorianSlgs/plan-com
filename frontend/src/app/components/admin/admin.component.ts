import { Component, output, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';

import { AuthService } from '../../services/auth.service';
import { AdminService } from '../../services/admin/admin.service';
import { Campaign, AdminStats } from '../../models/admin.model';

@Component({
  selector: 'app-admin',
  imports: [CommonModule],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss'
})
export class AdminComponent implements OnInit, OnDestroy {
  // Services injectés
  authService = inject(AuthService);
  adminService = inject(AdminService);

  // Événements
  logout = output<void>();

  // État du composant
  campaigns: Campaign[] = [];
  stats: AdminStats | null = null;
  isLoading = false;
  error: string | null = null;

  // Gestion des subscriptions
  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.loadAdminData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Charge toutes les données d'administration
   */
  private loadAdminData(): void {
    this.isLoading = true;
    this.error = null;

    // Charger les campagnes et les statistiques en parallèle
    this.loadCampaigns();
    this.loadStats();
  }

  /**
   * Charge la liste des campagnes
   */
  private loadCampaigns(): void {
    this.adminService.getAllCampaigns()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.campaigns = response.data;
            console.log(`${this.campaigns.length} campagnes chargées`);
          } else {
            this.error = 'Erreur lors du chargement des campagnes';
          }
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Erreur chargement campagnes:', error);
          this.error = error.message || 'Erreur lors du chargement des campagnes';
          this.isLoading = false;
        }
      });
  }

  /**
   * Charge les statistiques
   */
  private loadStats(): void {
    this.adminService.getAdminStats()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.stats = response.data;
            console.log('Statistiques chargées:', this.stats);
          }
        },
        error: (error) => {
          console.error('Erreur chargement statistiques:', error);
        }
      });
  }

  /**
   * Rafraîchit les données
   */
  onRefresh(): void {
    this.loadAdminData();
  }

  /**
   * Gère le clic sur déconnexion
   */
  onLogoutClick(): void {
    this.authService.logout();
    this.logout.emit();
  }

  /**
   * Formate une date pour l'affichage
   */
  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
}