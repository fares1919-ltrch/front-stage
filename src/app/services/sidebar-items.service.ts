import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { NavItem } from '../layouts/full/sidebar/nav-item/nav-item';
import { navItems } from '../layouts/full/sidebar/sidebar-data';
import { UserRole } from './admin.service';

/**
 * Service to manage sidebar navigation items based on user roles
 * Integrates with backend role-based permissions
 *
 * Backend roles:
 * - User (0): Standard access to personal features
 * - Admin (1): Manage users and content
 * - SuperAdmin (2): Full system access and configuration
 */
@Injectable({
  providedIn: 'root'
})
export class SidebarItemsService {
  private sidebarItemsSubject = new BehaviorSubject<NavItem[]>([]);
  public sidebarItems$ = this.sidebarItemsSubject.asObservable();

  constructor(public authService: AuthService) {
    // Subscribe to user changes to update sidebar items
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.updateSidebarItems(user.role);
      } else {
        // If no user, show empty sidebar
        this.sidebarItemsSubject.next([]);
      }
    });

    // Initial load - if user is already logged in
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      this.updateSidebarItems(currentUser.role);
    }
  }

  /**
   * Update sidebar items based on user role
   * Maps backend roles to frontend permissions
   *
   * @param userRole The user's role (string or number)
   */
  private updateSidebarItems(userRole: string | number): void {
    // Convert string role to number if needed
    let roleValue: UserRole;

    if (typeof userRole === 'string') {
      switch (userRole) {
        case 'SuperAdmin':
          roleValue = UserRole.SuperAdmin;
          break;
        case 'Admin':
          roleValue = UserRole.Admin;
          break;
        default:
          roleValue = UserRole.User;
      }
    } else {
      roleValue = userRole as UserRole;
    }

    // Get current user to check validation status
    const currentUser = this.authService.getCurrentUser();
    const isValidated = currentUser?.isValidated || false;

    // Filter items based on user role and validation status
    const filteredItems = navItems.filter(item => {
      // Always show Profile section to all users regardless of validation status
      if (item.navCap === 'User') {
        return true;
      }

      // For non-validated users, only show Profile section
      if (!isValidated) {
        return false;
      }

      // For validated users, show all sections except those that require specific roles
      // Administration and System Configuration sections require specific roles
      if (item.navCap === 'Administration' || item.navCap === 'System Configuration') {
        // Check if user role is in the required roles
        return item.requiredRoles && item.requiredRoles.includes(roleValue);
      }

      // Show all other sections to validated users
      return true;
    });

    // Process children recursively
    const processedItems = this.processChildItems(filteredItems, roleValue, isValidated);

    this.sidebarItemsSubject.next(processedItems);
  }

  /**
   * Process child items recursively to ensure proper role-based filtering
   *
   * @param items The navigation items to process
   * @param roleValue The user's role value
   * @returns Filtered navigation items
   */
  private processChildItems(items: NavItem[], roleValue: UserRole, isValidated: boolean = true): NavItem[] {
    return items.map(item => {
      if (item.children && item.children.length > 0) {
        // Filter children based on role and validation status
        const filteredChildren = item.children.filter(child => {
          // For non-validated users, only show Profile items
          if (!isValidated && !child.route?.includes('profile')) {
            return false;
          }

          // For validated users, show all items except those that require specific roles
          // User Management and BlackList items require specific roles
          if (child.route?.includes('admin') || child.route?.includes('lists')) {
            // Check if user role is in the required roles
            return child.requiredRoles && child.requiredRoles.includes(roleValue);
          }

          // Show all other items to validated users
          return true;
        });

        // Process children recursively
        return {
          ...item,
          children: this.processChildItems(filteredChildren, roleValue, isValidated)
        };
      }
      return item;
    });
  }

  /**
   * Get current sidebar items
   *
   * @returns Current sidebar items
   */
  getSidebarItems(): NavItem[] {
    return this.sidebarItemsSubject.value;
  }
}
