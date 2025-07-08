// navbar.component.ts
import { Component, OnInit, HostListener, inject, DestroyRef, signal, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';

import { ModalService } from '../../../services/modal/modal.service';
import { HeaderService } from '../../../services/header/header.service';
import { PendingInvitation } from '../../../models/campaign.model';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive, CommonModule],
  standalone: true,
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss'
})
export class NavbarComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private modalService = inject(ModalService);
  private headerService = inject(HeaderService);
  
  // Outputs pour communiquer avec le composant parent
  logout = output<void>();
  
  // État des données utilisateur
  userFullName = signal<string>('');
  pendingInvitations = signal<PendingInvitation[]>([]);
  loadingUserData = signal<boolean>(false);
  
  hasCampaign = false;
  isMobileMenuOpen = false;

  ngOnInit() {
    this.checkCampaign();
    this.loadUserData();
  }

  private checkCampaign() {
    this.hasCampaign = !!localStorage.getItem('currentCampaign');
  }

  private loadUserData() {
    this.loadingUserData.set(true);
    
    forkJoin({
      user: this.headerService.getUserName(),
      invitations: this.headerService.getPendingInvitations()
    })
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe({
      next: ({ user, invitations }) => {
        this.userFullName.set(`${user.first_name} ${user.last_name}`);
        this.pendingInvitations.set(invitations);
        this.loadingUserData.set(false);
      },
      error: (err) => {
        console.error('Erreur lors du chargement des données utilisateur:', err);
        this.userFullName.set('Utilisateur');
        this.pendingInvitations.set([]);
        this.loadingUserData.set(false);
      }
    });
  }

  // Méthode pour empêcher la navigation
  preventNavigation(event: Event) {
    if (!this.hasCampaign) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  // Gérer l'ouverture/fermeture du menu mobile
  toggleMobileMenu() {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  // Fermer le menu mobile
  closeMobileMenu() {
    this.isMobileMenuOpen = false;
  }

  // Fermer le menu mobile après navigation (si la navigation est autorisée)
  closeMobileMenuOnNavigation() {
    if (this.hasCampaign) {
      this.closeMobileMenu();
    }
  }

  // === Méthodes pour les raccourcis modals ===

  // Ouvrir la modal des paramètres
  openSettingsModal() {
    this.modalService.openSettingsModal();
    this.closeMobileMenu();
    // Recharger les invitations quand on ouvre les paramètres
    this.loadPendingInvitations();
  }

  // Ouvrir la modal de profil
  openProfileModal() {
    this.modalService.openProfileModal();
    this.closeMobileMenu();
  }

  // Gérer la déconnexion
  onLogout() {
    this.logout.emit();
  }

  // Recharger les invitations en attente
  private loadPendingInvitations() {
    this.headerService.getPendingInvitations()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (invitations) => {
          this.pendingInvitations.set(invitations);
        },
        error: (err) => {
          console.error('Erreur lors du chargement des invitations:', err);
          this.pendingInvitations.set([]);
        }
      });
  }

  // Fermer le menu mobile lors du redimensionnement vers desktop
  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    if (event.target.innerWidth >= 1024) { // lg breakpoint
      this.closeMobileMenu();
    }
  }

  // Gérer l'appui sur Escape pour fermer le menu
  @HostListener('document:keydown.escape', ['$event'])
  onEscapeKey(event: KeyboardEvent) {
    if (this.isMobileMenuOpen) {
      this.closeMobileMenu();
    }
  }

  // Obtenir les classes CSS pour la navbar
  getNavbarClasses(): string {
    const baseClasses = 'bg-gray-100 shadow-md h-[calc(100vh-1rem)] w-58 flex flex-col px-6 py-8 fixed left-2 top-2 rounded-xl border border-gray-200 transition-transform duration-300 ease-in-out';
    
    if (this.isMobileMenuOpen) {
      return baseClasses + ' lg:translate-x-0 translate-x-0';
    } else {
      return baseClasses + ' lg:translate-x-0 -translate-x-full';
    }
  }
}