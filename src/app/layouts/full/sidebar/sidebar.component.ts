import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  OnDestroy,
  Output,
  AfterViewInit,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { TablerIconsModule } from 'angular-tabler-icons';
import { MaterialModule } from 'src/app/material.module';
import { CommonModule } from '@angular/common';
import { AppNavItemComponent } from './nav-item/nav-item.component';
import { SidebarItemsService } from '../../../services/sidebar-items.service';
import { NavItem } from './nav-item/nav-item';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { Router } from '@angular/router';

/**
 * Sidebar component that displays navigation based on user role
 * Integrates with backend role-based permissions
 */
@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    TablerIconsModule,
    MaterialModule,
    AppNavItemComponent
  ],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
})
export class SidebarComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input() showToggle = true;
  @Output() toggleMobileNav = new EventEmitter<void>();
  @Output() toggleCollapsed = new EventEmitter<void>();

  @ViewChild('sidebar-scroll-container', { static: false }) scrollContainer: ElementRef;

  navItems: NavItem[] = [];
  private subscription: Subscription = new Subscription();

  constructor(
    private sidebarItemsService: SidebarItemsService,
    private authService: AuthService,
    private router: Router,
    private elementRef: ElementRef
  ) {}

  ngOnInit(): void {
    // Subscribe to sidebar items changes based on user role
    this.subscription.add(
      this.sidebarItemsService.sidebarItems$.subscribe(items => {
        this.navItems = items;
      })
    );

    // Check if user is authenticated
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      this.router.navigate(['/auth/login']);
    }
  }

  ngAfterViewInit(): void {
    // Ensure scrollbar is visible and working
    setTimeout(() => {
      const scrollContainer = this.elementRef.nativeElement.querySelector('#sidebar-scroll-container');
      if (scrollContainer) {
        // Force scrollbar to be visible
        scrollContainer.style.overflowY = 'auto';
        scrollContainer.style.display = 'block';
      }
    }, 100);
  }

  ngOnDestroy(): void {
    // Clean up subscriptions to prevent memory leaks
    this.subscription.unsubscribe();
  }
}
