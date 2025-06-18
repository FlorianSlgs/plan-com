/* import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { RegisterComponent } from './register.component';
import { AuthService } from '../../services/auth.service';

describe('RegisterComponent', () => {
  let component: RegisterComponent;
  let fixture: ComponentFixture<RegisterComponent>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockRouter: any;

  beforeEach(async () => {
    mockAuthService = jasmine.createSpyObj('AuthService', ['register', 'isUserLoggedIn']);
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [RegisterComponent, ReactiveFormsModule],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        provideRouter([]) // Fournit ActivatedRoute et autres dépendances de routing
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Form Initialization', () => {
    it('should initialize form with empty values', () => {
      expect(component.registerForm.get('lastName')?.value).toBe('');
      expect(component.registerForm.get('firstName')?.value).toBe('');
      expect(component.registerForm.get('birthDate')?.value).toBe('');
      expect(component.registerForm.get('email')?.value).toBe('');
      expect(component.registerForm.get('password')?.value).toBe('');
    });

    it('should have required validators on all fields', () => {
      const form = component.registerForm;
      
      form.get('lastName')?.setValue('');
      form.get('firstName')?.setValue('');
      form.get('birthDate')?.setValue('');
      form.get('email')?.setValue('');
      form.get('password')?.setValue('');

      expect(form.get('lastName')?.hasError('required')).toBeTruthy();
      expect(form.get('firstName')?.hasError('required')).toBeTruthy();
      expect(form.get('birthDate')?.hasError('required')).toBeTruthy();
      expect(form.get('email')?.hasError('required')).toBeTruthy();
      expect(form.get('password')?.hasError('required')).toBeTruthy();
    });

    it('should validate email format', () => {
      const emailControl = component.registerForm.get('email');
      
      emailControl?.setValue('invalid-email');
      expect(emailControl?.hasError('email')).toBeTruthy();
      
      emailControl?.setValue('valid@email.com');
      expect(emailControl?.hasError('email')).toBeFalsy();
    });

    it('should validate password minimum length', () => {
      const passwordControl = component.registerForm.get('password');
      
      passwordControl?.setValue('123');
      expect(passwordControl?.hasError('minlength')).toBeTruthy();
      
      passwordControl?.setValue('123456');
      expect(passwordControl?.hasError('minlength')).toBeFalsy();
    });
  });

  describe('onSubmit', () => {
    beforeEach(() => {
      // Remplir le formulaire avec des données valides
      component.registerForm.patchValue({
        lastName: 'Dupont',
        firstName: 'Jean',
        birthDate: '1990-01-01',
        email: 'jean.dupont@email.com',
        password: 'password123'
      });
    });

    it('should call authService.register with form data when form is valid', () => {
      mockAuthService.register.and.returnValue(of({}));
      
      component.onSubmit();
      
      expect(mockAuthService.register).toHaveBeenCalledWith({
        lastName: 'Dupont',
        firstName: 'Jean',
        birthDate: '1990-01-01',
        email: 'jean.dupont@email.com',
        password: 'password123'
      });
    });

    it('should reset error message before submitting', () => {
      component.errorMessage = 'Previous error';
      mockAuthService.register.and.returnValue(of({}));
      
      component.onSubmit();
      
      expect(component.errorMessage).toBeNull();
    });

    it('should set error message when registration fails', () => {
      const errorMessage = 'Registration failed';
      mockAuthService.register.and.returnValue(throwError(() => new Error(errorMessage)));
      
      component.onSubmit();
      
      expect(component.errorMessage).toBe(errorMessage);
    });

    it('should set default error message when registration fails without message', () => {
      mockAuthService.register.and.returnValue(throwError(() => new Error()));
      
      component.onSubmit();
      
      expect(component.errorMessage).toBe("Une erreur inconnue est survenue lors de l'inscription.");
    });

    it('should set error message when form is invalid', () => {
      component.registerForm.patchValue({
        lastName: '',
        firstName: '',
        birthDate: '',
        email: '',
        password: ''
      });
      
      component.onSubmit();
      
      expect(component.errorMessage).toBe('Veuillez remplir correctement tous les champs.');
      expect(mockAuthService.register).not.toHaveBeenCalled();
    });
  });

  describe('Template Integration', () => {
    it('should display error messages when form fields are invalid and touched', () => {
      const compiled = fixture.nativeElement;
      
      // Marquer les champs comme touchés et invalides
      component.registerForm.get('lastName')?.markAsTouched();
      component.registerForm.get('lastName')?.setValue('');
      
      fixture.detectChanges();
      
      const errorElement = compiled.querySelector('.error');
      expect(errorElement?.textContent).toContain('Le nom est requis.');
    });

    it('should disable submit button when form is invalid', () => {
      component.registerForm.patchValue({
        lastName: '',
        firstName: '',
        birthDate: '',
        email: '',
        password: ''
      });
      
      fixture.detectChanges();
      
      const submitButton = fixture.nativeElement.querySelector('button[type="submit"]');
      expect(submitButton.disabled).toBeTruthy();
    });

    it('should enable submit button when form is valid', () => {
      component.registerForm.patchValue({
        lastName: 'Dupont',
        firstName: 'Jean',
        birthDate: '1990-01-01',
        email: 'jean.dupont@email.com',
        password: 'password123'
      });
      
      fixture.detectChanges();
      
      const submitButton = fixture.nativeElement.querySelector('button[type="submit"]');
      expect(submitButton.disabled).toBeFalsy();
    });

    it('should display general error message when present', () => {
      component.errorMessage = 'Test error message';
      
      fixture.detectChanges();
      
      const errorElement = fixture.nativeElement.querySelector('.error-message');
      expect(errorElement?.textContent).toContain('Test error message');
    });
  });
}); */