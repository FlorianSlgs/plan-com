/* import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(() => {
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AuthService,
        { provide: Router, useValue: mockRouter }
      ]
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);

    // Nettoyer le localStorage avant chaque test
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Initial State', () => {
    it('should initialize loggedIn state as false when no token exists', () => {
      expect(service.isLoggedIn()).toBeFalsy();
      expect(service.isUserLoggedIn()).toBeFalsy();
    });

    it('should initialize loggedIn state as true when token exists', () => {
      localStorage.setItem('authToken', 'test-token');
      
      // Réinitialiser le service pour qu'il lise le token du localStorage
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [HttpClientTestingModule],
        providers: [
          AuthService,
          { provide: Router, useValue: mockRouter }
        ]
      });
      service = TestBed.inject(AuthService);
      
      expect(service.isLoggedIn()).toBeTruthy();
      expect(service.isUserLoggedIn()).toBeTruthy();
    });
  });

  describe('login', () => {
    it('should login successfully and store token', () => {
      const credentials = { email: 'test@email.com', password: 'password' };
      const mockResponse = { token: 'test-token', id: 'user-id' };

      service.login(credentials).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(localStorage.getItem('authToken')).toBe('test-token');
        expect(localStorage.getItem('userId')).toBe('user-id');
        expect(service.isLoggedIn()).toBeTruthy();
        expect(mockRouter.navigate).toHaveBeenCalledWith(['/home']);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/login`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(credentials);
      req.flush(mockResponse);
    });

    it('should handle login error', () => {
      const credentials = { email: 'test@email.com', password: 'wrong-password' };
      const errorResponse = { status: 401, statusText: 'Unauthorized' };

      service.login(credentials).subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.message).toBe('Échec de la connexion. Vérifiez vos identifiants.');
          expect(service.isLoggedIn()).toBeFalsy();
          expect(localStorage.getItem('authToken')).toBeNull();
        }
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/login`);
      req.flush({}, errorResponse);
    });
  });

  describe('register', () => {
    it('should register successfully and redirect to login', () => {
      const userData = {
        lastName: 'Dupont',
        firstName: 'Jean',
        birthDate: '1990-01-01',
        email: 'jean.dupont@email.com',
        password: 'password123'
      };
      const mockResponse = { message: 'Registration successful' };

      service.register(userData).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/register`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(userData);
      req.flush(mockResponse);
    });

    it('should handle registration error', () => {
      const userData = {
        lastName: 'Dupont',
        firstName: 'Jean',
        birthDate: '1990-01-01',
        email: 'existing@email.com',
        password: 'password123'
      };
      const errorResponse = { status: 400, statusText: 'Bad Request' };

      service.register(userData).subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.message).toBe("Échec de l'inscription. L'email est peut-être déjà utilisé.");
        }
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/register`);
      req.flush({}, errorResponse);
    });
  });

  describe('logout', () => {
    it('should logout and clear storage', () => {
      // Simuler un utilisateur connecté
      localStorage.setItem('authToken', 'test-token');
      localStorage.setItem('userId', 'user-id');
      localStorage.setItem('currentCampaign', 'campaign-data');

      service.logout();

      expect(localStorage.getItem('authToken')).toBeNull();
      expect(localStorage.getItem('userId')).toBeNull();
      expect(localStorage.getItem('currentCampaign')).toBeNull();
      expect(service.isLoggedIn()).toBeFalsy();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
    });
  });

  describe('getToken', () => {
    it('should return token when exists', () => {
      localStorage.setItem('authToken', 'test-token');
      expect(service.getToken()).toBe('test-token');
    });

    it('should return null when no token exists', () => {
      expect(service.getToken()).toBeNull();
    });
  });

  describe('isUserLoggedIn', () => {
    it('should return true when user is logged in', () => {
      localStorage.setItem('authToken', 'test-token');
      
      // Réinitialiser le service pour qu'il lise le token
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [HttpClientTestingModule],
        providers: [
          AuthService,
          { provide: Router, useValue: mockRouter }
        ]
      });
      service = TestBed.inject(AuthService);
      
      expect(service.isUserLoggedIn()).toBeTruthy();
    });

    it('should return false when user is not logged in', () => {
      expect(service.isUserLoggedIn()).toBeFalsy();
    });
  });

  describe('Signal State Management', () => {
    it('should update signal state on successful login', () => {
      const credentials = { email: 'test@email.com', password: 'password' };
      const mockResponse = { token: 'test-token', id: 'user-id' };

      expect(service.isLoggedIn()).toBeFalsy();

      service.login(credentials).subscribe(() => {
        expect(service.isLoggedIn()).toBeTruthy();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/login`);
      req.flush(mockResponse);
    });

    it('should update signal state on logout', () => {
      localStorage.setItem('authToken', 'test-token');
      
      // Réinitialiser le service pour simuler un état connecté
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [HttpClientTestingModule],
        providers: [
          AuthService,
          { provide: Router, useValue: mockRouter }
        ]
      });
      service = TestBed.inject(AuthService);
      
      expect(service.isLoggedIn()).toBeTruthy();
      
      service.logout();
      
      expect(service.isLoggedIn()).toBeFalsy();
    });

    it('should maintain signal state consistency with localStorage', () => {
      // État initial : pas de token
      expect(service.isLoggedIn()).toBeFalsy();
      
      // Simuler ajout de token
      localStorage.setItem('authToken', 'test-token');
      // Le signal ne change pas automatiquement car il est géré par le service
      expect(service.isLoggedIn()).toBeFalsy();
      
      // Mais après login, le signal est mis à jour
      const credentials = { email: 'test@email.com', password: 'password' };
      const mockResponse = { token: 'new-token', id: 'user-id' };

      service.login(credentials).subscribe(() => {
        expect(service.isLoggedIn()).toBeTruthy();
        expect(localStorage.getItem('authToken')).toBe('new-token');
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/login`);
      req.flush(mockResponse);
    });
  });
}); */