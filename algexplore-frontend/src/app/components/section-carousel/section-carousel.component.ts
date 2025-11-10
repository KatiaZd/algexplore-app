import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Lieu } from '../../services/lieu.service';
import { LieuCardComponent } from '../lieu-card/lieu-card.component';

@Component({
  selector: 'app-section-carousel',
  standalone: true,
  imports: [CommonModule, LieuCardComponent],
  templateUrl: './section-carousel.component.html',
  styleUrls: ['./section-carousel.component.scss']
})
export class SectionCarouselComponent {
  @Input() title!: string;
  @Input() lieux: Lieu[] = [];

  scrollLeft(container: HTMLElement) {
    container.scrollBy({ left: -300, behavior: 'smooth' });
  }

  scrollRight(container: HTMLElement) {
    container.scrollBy({ left: 300, behavior: 'smooth' });
  }
}
