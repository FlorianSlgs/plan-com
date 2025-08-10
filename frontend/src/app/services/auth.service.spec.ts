import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { TaskService } from './dashboard/tasks/task-service.service';
import { environment } from '../../environments/environment';
import { ChangePasswordData } from '../models/user.model';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let routerSpy: jasmine.SpyObj<Router>;
  let taskServiceSpy: jasmine.SpyObj<TaskService>;
  const apiUrl = environment.baseUrl + environment.endpoints.auth;

  beforeEach(() => {
    // Création des spies pour les dépendances
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    taskServiceSpy = jasmine.createSpyObj('TaskService', ['clearTasks']);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AuthService,
        { provide: Router, useValue: routerSpy },
        { provide: TaskService, useValue: taskServiceSpy }
      ]
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);

    // Gérer l'appel initial à checkAuth dans le constructeur
    const req = httpMock.expectOne(`${apiUrl}/me`);
    req.flush({ isAdmin: false }, { status: 401, statusText: 'Unauthorized' });
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  describe('Initialisation', () => {
    it('devrait être créé', () => {
      expect(service).toBeTruthy();
    });

    it('devrait initialiser avec isLoggedIn à false', () => {
      expect(service.isLoggedIn()).toBeFalse();
    });

    it('devrait initialiser avec isAdmin à false', () => {
      expect(service.isAdmin()).toBeFalse();
    });
  });

  describe('login()', () => {
    it('devrait connecter un utilisateur standard avec succès', () => {
      const credentials = { email: 'user@test.com', password: 'password123' };
      const mockResponse = { 
        token: 'mock-token', 
        isAdmin: false,
        user: { email: 'user@test.com' }
      };

      service.login(credentials).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(service.isLoggedIn()).toBeTrue();
        expect(service.isAdmin()).toBeFalse();
      });

      const req = httpMock.expectOne(`${apiUrl}/login`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(credentials);
      expect(req.request.withCredentials).toBeTrue();
      
      req.flush(mockResponse);
      
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/home']);
    });

    it('devrait connecter un administrateur avec succès', () => {
      const credentials = { email: 'admin@test.com', password: 'admin123' };
      const mockResponse = { 
        token: 'mock-token', 
        isAdmin: true,
        user: { email: 'admin@test.com' }
      };

      service.login(credentials).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(service.isLoggedIn()).toBeTrue();
        expect(service.isAdmin()).toBeTrue();
      });

      const req = httpMock.expectOne(`${apiUrl}/login`);
      req.flush(mockResponse);
      
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/admin']);
    });

    it('devrait gérer les erreurs de connexion', () => {
      const credentials = { email: 'user@test.com', password: 'wrongpassword' };
      const errorMessage = 'Invalid credentials';

      service.login(credentials).subscribe({
        next: () => fail('devrait avoir échoué'),
        error: (error) => {
          expect(error.message).toBe('Échec de la connexion. Vérifiez vos identifiants.');
          expect(service.isLoggedIn()).toBeFalse();
          expect(service.isAdmin()).toBeFalse();
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/login`);
      req.flush({ message: errorMessage }, { status: 401, statusText: 'Unauthorized' });
    });

    it('devrait nettoyer le localStorage lors de la connexion', () => {
      // Préparer le localStorage avec des données
      localStorage.setItem('currentCampaign', 'test-campaign');
      localStorage.setItem('events', 'test-events');
      
      const credentials = { email: 'user@test.com', password: 'password123' };
      const mockResponse = { isAdmin: false };

      service.login(credentials).subscribe();

      const req = httpMock.expectOne(`${apiUrl}/login`);
      req.flush(mockResponse);

      expect(localStorage.getItem('currentCampaign')).toBeNull();
      expect(localStorage.getItem('events')).toBeNull();
    });
  });

  describe('register()', () => {
    it('devrait inscrire un nouvel utilisateur avec succès', () => {
      const userData = {
        email: 'newuser@test.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe'
      };

      service.register(userData).subscribe(response => {
        expect(response).toBeTruthy();
      });

      const req = httpMock.expectOne(`${apiUrl}/register`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(userData);
      expect(req.request.withCredentials).toBeTrue();
      
      req.flush({ success: true });
      
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
    });

    it('devrait gérer les erreurs d\'inscription avec message du backend', () => {
      const userData = { email: 'existing@test.com', password: 'password123' };
      const backendError = { message: 'Email déjà utilisé' };

      service.register(userData).subscribe({
        next: () => fail('devrait avoir échoué'),
        error: (error) => {
          expect(error.message).toBe('Email déjà utilisé');
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/register`);
      req.flush(backendError, { status: 400, statusText: 'Bad Request' });
    });

    it('devrait utiliser un message par défaut si pas de message du backend', () => {
      const userData = { email: 'test@test.com', password: 'password123' };

      service.register(userData).subscribe({
        next: () => fail('devrait avoir échoué'),
        error: (error) => {
          expect(error.message).toBe("Échec de l'inscription. L'email est peut-être déjà utilisé.");
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/register`);
      req.flush({}, { status: 400, statusText: 'Bad Request' });
    });
  });

  describe('logout()', () => {
    it('devrait déconnecter l\'utilisateur avec succès', () => {
      // Préparer l'état connecté
      service['loggedInState'].set(true);
      service['userIsAdmin'].set(true);
      
      // Préparer le localStorage
      localStorage.setItem('currentCampaign', 'test');
      localStorage.setItem('events', 'test-events');

      service.logout();

      const req = httpMock.expectOne(`${apiUrl}/logout`);
      expect(req.request.method).toBe('POST');
      expect(req.request.withCredentials).toBeTrue();
      
      req.flush({ success: true });

      expect(service.isLoggedIn()).toBeFalse();
      expect(service.isAdmin()).toBeFalse();
      expect(taskServiceSpy.clearTasks).toHaveBeenCalled();
      expect(localStorage.getItem('currentCampaign')).toBeNull();
      expect(localStorage.getItem('events')).toBeNull();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
    });

    it('devrait gérer les erreurs de déconnexion', () => {
      service['loggedInState'].set(true);
      localStorage.setItem('currentCampaign', 'test');

      service.logout();

      const req = httpMock.expectOne(`${apiUrl}/logout`);
      req.flush({}, { status: 500, statusText: 'Server Error' });

      expect(service.isLoggedIn()).toBeFalse();
      expect(taskServiceSpy.clearTasks).toHaveBeenCalled();
      expect(localStorage.getItem('currentCampaign')).toBeNull();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
    });
  });

  describe('checkAuth()', () => {
    it('devrait confirmer l\'authentification pour un utilisateur connecté', () => {
      const mockResponse = { 
        isAdmin: false, 
        email: 'user@test.com' 
      };

      service.checkAuth().subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(service.isLoggedIn()).toBeTrue();
        expect(service.isAdmin()).toBeFalse();
      });

      const req = httpMock.expectOne(`${apiUrl}/me`);
      expect(req.request.method).toBe('GET');
      expect(req.request.withCredentials).toBeTrue();
      
      req.flush(mockResponse);
    });

    it('devrait confirmer l\'authentification pour un admin', () => {
      const mockResponse = { 
        isAdmin: true, 
        email: 'admin@test.com' 
      };

      service.checkAuth().subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(service.isLoggedIn()).toBeTrue();
        expect(service.isAdmin()).toBeTrue();
      });

      const req = httpMock.expectOne(`${apiUrl}/me`);
      req.flush(mockResponse);
    });

    it('devrait gérer le cas d\'un utilisateur non authentifié', () => {
      service.checkAuth().subscribe({
        next: () => fail('devrait avoir échoué'),
        error: (error) => {
          expect(error.message).toBe('Non authentifié');
          expect(service.isLoggedIn()).toBeFalse();
          expect(service.isAdmin()).toBeFalse();
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/me`);
      req.flush({}, { status: 401, statusText: 'Unauthorized' });
    });
  });

  describe('changePassword()', () => {
    it('devrait changer le mot de passe avec succès', () => {
      const passwordData: ChangePasswordData = {
        currentPassword: 'oldpass',
        newPassword: 'newpass',
        confirmPassword: 'newpass'
      };

      service.changePassword(passwordData).subscribe(response => {
        expect(response).toBeTruthy();
      });

      const req = httpMock.expectOne(`${apiUrl}/change-password`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(passwordData);
      expect(req.request.withCredentials).toBeTrue();
      
      req.flush({ success: true, message: 'Password changed successfully' });
    });

    it('devrait gérer les erreurs avec message du backend', () => {
      const passwordData: ChangePasswordData = {
        currentPassword: 'wrongpass',
        newPassword: 'newpass',
        confirmPassword: 'newpass'
      };
      const backendError = { message: 'Mot de passe actuel incorrect' };

      service.changePassword(passwordData).subscribe({
        next: () => fail('devrait avoir échoué'),
        error: (error) => {
          expect(error.message).toBe('Mot de passe actuel incorrect');
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/change-password`);
      req.flush(backendError, { status: 400, statusText: 'Bad Request' });
    });

    it('devrait utiliser un message par défaut si pas de message du backend', () => {
      const passwordData: ChangePasswordData = {
        currentPassword: 'pass',
        newPassword: 'newpass',
        confirmPassword: 'newpass'
      };

      service.changePassword(passwordData).subscribe({
        next: () => fail('devrait avoir échoué'),
        error: (error) => {
          expect(error.message).toBe('Erreur lors du changement de mot de passe.');
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/change-password`);
      req.flush({}, { status: 500, statusText: 'Server Error' });
    });
  });

  describe('Méthodes utilitaires', () => {
    it('isUserLoggedIn() devrait retourner l\'état de connexion', () => {
      service['loggedInState'].set(false);
      expect(service.isUserLoggedIn()).toBeFalse();
      
      service['loggedInState'].set(true);
      expect(service.isUserLoggedIn()).toBeTrue();
    });

    it('isUserAdmin() devrait retourner le statut admin', () => {
      service['userIsAdmin'].set(false);
      expect(service.isUserAdmin()).toBeFalse();
      
      service['userIsAdmin'].set(true);
      expect(service.isUserAdmin()).toBeTrue();
    });

    it('isAuthChecked() devrait retourner si la vérification est terminée', () => {
      service['authChecked'].set(false);
      expect(service.isAuthChecked()).toBeFalse();
      
      service['authChecked'].set(true);
      expect(service.isAuthChecked()).toBeTrue();
    });
  });

  describe('clearLocalStorage()', () => {
    it('devrait supprimer uniquement les clés spécifiées du localStorage', () => {
      // Ajouter diverses clés au localStorage
      localStorage.setItem('currentCampaign', 'campaign1');
      localStorage.setItem('currentCampaignId', '123');
      localStorage.setItem('events', 'event1,event2');
      localStorage.setItem('campaignAccess', 'true');
      localStorage.setItem('otherKey', 'shouldRemain'); // Cette clé ne doit pas être supprimée

      // Appeler la méthode privée via login (qui l'appelle)
      const credentials = { email: 'user@test.com', password: 'pass' };
      service.login(credentials).subscribe();
      
      const req = httpMock.expectOne(`${apiUrl}/login`);
      req.flush({ isAdmin: false });

      // Vérifier que les clés spécifiées sont supprimées
      expect(localStorage.getItem('currentCampaign')).toBeNull();
      expect(localStorage.getItem('currentCampaignId')).toBeNull();
      expect(localStorage.getItem('events')).toBeNull();
      expect(localStorage.getItem('campaignAccess')).toBeNull();
      
      // Vérifier que les autres clés restent
      expect(localStorage.getItem('otherKey')).toBe('shouldRemain');
    });
  });
});