// services/modal/modal.service.ts
import { Injectable, signal } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type ModalType = 
  | 'campaign' 
  | 'settings' 
  | 'profile' 
  | 'deleteConfirmation' 
  | 'deleteCampaign';

export interface ModalState {
  campaign: boolean;
  settings: boolean;
  profile: boolean;
  deleteConfirmation: boolean;
  deleteCampaign: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ModalService {
  // État des modals avec signals pour la réactivité
  private modalStates = signal<ModalState>({
    campaign: false,
    settings: false,
    profile: false,
    deleteConfirmation: false,
    deleteCampaign: false
  });

  // BehaviorSubject pour les composants qui préfèrent les observables
  private modalStates$ = new BehaviorSubject<ModalState>(this.modalStates());

  // Getters pour l'état des modals
  get states() {
    return this.modalStates.asReadonly();
  }

  get states$(): Observable<ModalState> {
    return this.modalStates$.asObservable();
  }

  // Méthodes pour ouvrir des modals spécifiques
  openCampaignModal() {
    this.openModal('campaign');
  }

  openSettingsModal() {
    this.openModal('settings');
  }

  openProfileModal() {
    this.openModal('profile');
  }

  openDeleteConfirmationModal() {
    this.openModal('deleteConfirmation');
  }

  openDeleteCampaignModal() {
    this.openModal('deleteCampaign');
  }

  // Méthodes pour fermer des modals spécifiques
  closeCampaignModal() {
    this.closeModal('campaign');
  }

  closeSettingsModal() {
    this.closeModal('settings');
  }

  closeProfileModal() {
    this.closeModal('profile');
  }

  closeDeleteConfirmationModal() {
    this.closeModal('deleteConfirmation');
  }

  closeDeleteCampaignModal() {
    this.closeModal('deleteCampaign');
  }

  // Méthode générique pour ouvrir une modal
  openModal(modalType: ModalType) {
    this.modalStates.update(states => ({
      ...states,
      [modalType]: true
    }));
    this.modalStates$.next(this.modalStates());
  }

  // Méthode générique pour fermer une modal
  closeModal(modalType: ModalType) {
    this.modalStates.update(states => ({
      ...states,
      [modalType]: false
    }));
    this.modalStates$.next(this.modalStates());
  }

  // Fermer toutes les modals
  closeAllModals() {
    this.modalStates.set({
      campaign: false,
      settings: false,
      profile: false,
      deleteConfirmation: false,
      deleteCampaign: false
    });
    this.modalStates$.next(this.modalStates());
  }

  // Vérifier si une modal spécifique est ouverte
  isModalOpen(modalType: ModalType): boolean {
    return this.modalStates()[modalType];
  }

  // Vérifier si au moins une modal est ouverte
  isAnyModalOpen(): boolean {
    const states = this.modalStates();
    return states.campaign || states.settings || states.profile || states.deleteConfirmation || states.deleteCampaign;
  }

  // Toggle une modal (ouvrir si fermée, fermer si ouverte)
  toggleModal(modalType: ModalType) {
    if (this.isModalOpen(modalType)) {
      this.closeModal(modalType);
    } else {
      this.openModal(modalType);
    }
  }

  // Méthodes utilitaires pour les raccourcis clavier
  handleKeyboardShortcuts(event: KeyboardEvent) {
    // Ctrl/Cmd + N = Nouvelle campagne
    if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
      event.preventDefault();
      this.openCampaignModal();
    }
    
    // Ctrl/Cmd + , = Paramètres  
    if ((event.ctrlKey || event.metaKey) && event.key === ',') {
      event.preventDefault();
      this.openSettingsModal();
    }
    
    // Ctrl/Cmd + P = Profil
    if ((event.ctrlKey || event.metaKey) && event.key === 'p') {
      event.preventDefault();
      this.openProfileModal();
    }
    
    // Escape = Fermer toutes les modals
    if (event.key === 'Escape') {
      this.closeAllModals();
    }
  }
}