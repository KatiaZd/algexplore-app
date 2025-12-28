import { Component, Input, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Lieu } from '../../services/lieu.service';
import { LieuCardComponent } from '../lieu-card/lieu-card.component';

@Component({
  selector: 'app-section-carousel',
  standalone: true,
  imports: [CommonModule, LieuCardComponent],
  templateUrl: './section-carousel.component.html',
  styleUrls: ['./section-carousel.component.scss'],
})
export class SectionCarouselComponent implements AfterViewInit {
  @Input() title!: string;
  @Input() lieux: Lieu[] = [];

  showArrows = false;
  canScrollLeft = false;
  canScrollRight = false;

  ngAfterViewInit(): void {
    // Le rendu des cards peut arriver après (ngFor) => on laisse un micro délai
    setTimeout(() => {
      // On ne peut pas récupérer #carousel ici sans ViewChild,
      // donc on déclenche la 1ère update via (mouseenter) / (scroll) dans le template.
      // Rien à faire ici pour l’instant.
    }, 0);
  }

  updateArrows(container: HTMLElement): void {
    const maxScrollLeft = container.scrollWidth - container.clientWidth;

    // show arrows uniquement si overflow horizontal
    this.showArrows = container.scrollWidth > container.clientWidth + 2;

    this.canScrollLeft = container.scrollLeft > 0;
    this.canScrollRight = container.scrollLeft < maxScrollLeft - 1;
  }

  onCarouselScroll(container: HTMLElement): void {
    this.updateArrows(container);
  }

  scrollLeft(container: HTMLElement): void {
    container.scrollBy({ left: -300, behavior: 'smooth' });
    setTimeout(() => this.updateArrows(container), 250);
  }

  scrollRight(container: HTMLElement): void {
    container.scrollBy({ left: 300, behavior: 'smooth' });
    setTimeout(() => this.updateArrows(container), 250);
  }
}