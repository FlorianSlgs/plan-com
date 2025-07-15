import { Component, ElementRef, ViewChild, ViewChildren, AfterViewInit, OnDestroy, QueryList } from '@angular/core';
import { Router } from '@angular/router';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

@Component({
  selector: 'app-welcome',
  imports: [],
  templateUrl: './welcome.component.html',
  styleUrl: './welcome.component.scss'
})
export class WelcomeComponent implements AfterViewInit, OnDestroy {

  //appel éléments animation 1
  @ViewChild('whiteContainer', { static: true }) whiteContainer!: ElementRef;
  @ViewChild('stickyTitle', { static: true }) stickyTitle!: ElementRef;
  @ViewChild('img1', { static: true }) img1!: ElementRef;
  @ViewChild('img2', { static: true }) img2!: ElementRef;
  @ViewChild('img3', { static: true }) img3!: ElementRef;
  @ViewChild('img4', { static: true }) img4!: ElementRef;
  @ViewChild('img5', { static: true }) img5!: ElementRef;

  //appel éléments animation 2
  @ViewChild('wordsContainer', { static: true }) wordsContainer!: ElementRef;
  @ViewChild('container', { static: true }) container!: ElementRef<HTMLElement>;
  @ViewChildren('title') titles!: QueryList<ElementRef<HTMLHeadingElement>>;
  @ViewChild('title1', { static: true }) title1!: ElementRef<HTMLElement>;

  constructor(private router: Router) {}

  ngAfterViewInit(): void {
    this.initScrollAnimations();
    this.wordsScrollAnimations();
  }

  ngOnDestroy(): void {
    ScrollTrigger.getAll().forEach(trigger => trigger.kill());
  }

  private initScrollAnimations(): void {
    // Animation pour faire descendre les éléments hero
    gsap.timeline({
        defaults: {
        ease: 'sine'
      },
      scrollTrigger: {
        trigger: this.whiteContainer.nativeElement,
        start: 'center center',
        end: '+=100%',
        pin: this.whiteContainer.nativeElement.parentNode,
        scrub: 0.5,
      },
    });

    // Animation pour réduire la taille du titre "Le travail d'équipe simplifié"
    const titleElement = this.whiteContainer.nativeElement.querySelector('h3');
    
    gsap.fromTo(titleElement, 
      {
        scale: 1, // Taille initiale
        fontSize: "6rem" // Taille de départ (équivalent à text-6xl)
      },
      {
        scale: 0.75, // Taille finale (50% de la taille originale)
        fontSize: "4.5rem", // Taille finale en rem
        scrollTrigger: {
          trigger: this.whiteContainer.nativeElement,
          start: 'center center', // Commence quand le haut du container atteint le centre
          end: 'bottom center', // Finit quand le bas du container atteint le centre
          scrub: 1, // Animation fluide liée au scroll
        }
      }
    );

    const imgs = [this.img1.nativeElement, this.img2.nativeElement, this.img3.nativeElement, this.img4.nativeElement, this.img5.nativeElement];

    // Positions initiales (hors écran)
    gsap.set(imgs[0], { x: window.innerWidth/2, y: -500 }); // haut
    gsap.set(imgs[1], { x: window.innerWidth/2 - 1500, y: -500 }); // droite 1
    gsap.set(imgs[2], { x: window.innerWidth + 300, y: window.innerHeight/2 + 800 }); // droite 2
    gsap.set(imgs[3], { x: -700, y: window.innerHeight/2 + 325 }); // gauche 1
    gsap.set(imgs[4], { x: 0, y: window.innerHeight/2 + 800 }); // gauche 2

    // Animation vers le centre
    gsap.to(imgs[0], {
      x: window.innerWidth/2 - 650,
      y: window.innerHeight/2 - 355,
      scrollTrigger: {
        trigger: this.whiteContainer.nativeElement,
        start: 'center center',
        end: '+=100%',
        scrub: 1
      }
    });

    gsap.to(imgs[1], {
      x: window.innerWidth/2 - 690,
      y: window.innerHeight/2 - 325,
      scrollTrigger: {
        trigger: this.whiteContainer.nativeElement,
        start: 'center center',
        end: '+=100%',
        scrub: 1
      }
    });

    gsap.to(imgs[2], {
      x: window.innerWidth/2 -720,
      y: window.innerHeight/2 - 355,
      scrollTrigger: {
        trigger: this.whiteContainer.nativeElement,
        start: 'center center',
        end: '+=100%',
        scrub: 1
      }
    });

    gsap.to(imgs[3], {
      x: window.innerWidth/2 - 520,
      y: window.innerHeight/2 - 355,
      scrollTrigger: {
        trigger: this.whiteContainer.nativeElement,
        start: 'center center',
        end: '+=100%',
        scrub: 1
      }
    });

    gsap.to(imgs[4], {
      x: window.innerWidth/2 - 650,
      y: window.innerHeight/2 - 295,
      scrollTrigger: {
        trigger: this.whiteContainer.nativeElement,
        start: 'center center',
        end: '+=100%',
        scrub: 1
      }
    });
  }

  private wordsScrollAnimations(): void {
    const containerEl = this.container.nativeElement;
    const titleEls = this.titles.toArray().map((v) => v.nativeElement);
    const title1 = this.title1.nativeElement;

    // Position initiale
    gsap.set(titleEls, {
      y: window.innerHeight * 1.2,
    });
    gsap.set(title1, {
      y: (window.innerHeight / 2) - 260,
    });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: containerEl,
        start: 'top top',
        end: '+=300%',
        scrub: true,
        pin: true,
      }
    });

    titleEls.forEach((el, i) => {
      const offsetY = (i - 1) * 130;
      tl.to(el, {
        y: window.innerHeight / 2 + offsetY,
        duration: 1
      }, i * 0.5);
    });

    // Pause
    tl.to({}, { duration: 0.7 });

    // Départ
    tl.to([titleEls, title1], {
      y: -window.innerHeight * 0.2,
      duration: 1
    });
  }


  navigateToHome(): void {
    this.router.navigate(['/']);
  }

  navigateToDashboard(): void {
    this.router.navigate(['/home']);
  }
}