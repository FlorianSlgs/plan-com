// navbar.component.ts
import { Component, OnInit, HostListener, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ModalService } from '../../../services/modal/modal.service';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive, CommonModule],
  standalone: true,
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss'
})
export class NavbarComponent implements OnInit {
  private modalService = inject(ModalService);
  
  hasCampaign = false;
  isMobileMenuOpen = false;

  ngOnInit() {
    this.checkCampaign();
  }

  private checkCampaign() {
    this.hasCampaign = !!localStorage.getItem('currentCampaign');
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

  // === Nouvelles méthodes pour les raccourcis modals ===

  // Ouvrir la modal de création de campagne
  openCampaignModal() {
    this.modalService.openCampaignModal();
    this.closeMobileMenu(); // Fermer le menu mobile si ouvert
  }

  // Ouvrir la modal des paramètres
  openSettingsModal() {
    this.modalService.openSettingsModal();
    this.closeMobileMenu();
  }

  // Ouvrir la modal de profil
  openProfileModal() {
    this.modalService.openProfileModal();
    this.closeMobileMenu();
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