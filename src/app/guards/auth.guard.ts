import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../services/admin.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  /**
   * Check if the user has Admin or SuperAdmin role
   * @param role User role (string or number)
   * @returns True if user has Admin or SuperAdmin role
   */
  private hasAdminRole(role: string | number): boolean {
    if (typeof role === 'string') {
      return role === 'Admin' || role === 'SuperAdmin';
    } else {
      return role === 1 || role === 2; // 1 = Admin, 2 = SuperAdmin
    }
  }

  /**
   * Check if the user has SuperAdmin role
   * @param role User role (string or number)
   * @returns True if user has SuperAdmin role
   */
  private hasSuperAdminRole(role: string | number): boolean {
    if (typeof role === 'string') {
      return role === 'SuperAdmin';
    } else {
      return role === 2; // 2 = SuperAdmin
    }
  }

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    const currentUser = this.authService.getCurrentUser();

    // Check if user is authenticated
    if (!currentUser) {
      this.router.navigate(['/auth/login'], { queryParams: { returnUrl: state.url } });
      return false;
    }

    // Check if user is validated - only allow access to profile if not validated
    if (!currentUser.isValidated) {
      // Always allow access to profile
      if (state.url.includes('/features/profile')) {
        return true;
      }

      // For other routes, check if they explicitly allow validated users
      const allowValidatedUsers = route.data['allowValidatedUsers'] as boolean;
      if (!allowValidatedUsers) {
        console.log('User not validated. Redirecting to profile page.');
        this.router.navigate(['/features/profile']);
        return false;
      }
    }

    // For validated users, check if they're trying to access restricted features
    if (currentUser.isValidated) {
      // Check if trying to access admin features
      if (state.url.includes('/features/admin')) {
        const isAdmin = this.hasAdminRole(currentUser.role);
        if (!isAdmin) {
          console.log('User does not have admin privileges. Redirecting to unauthorized page.');
          this.router.navigate(['/unauthorized']);
          return false;
        }
      }

      // Check if trying to access SuperAdmin features
      if (state.url.includes('/ui-components/lists')) {
        const isSuperAdmin = this.hasSuperAdminRole(currentUser.role);
        if (!isSuperAdmin) {
          console.log('User does not have SuperAdmin privileges. Redirecting to unauthorized page.');
          this.router.navigate(['/unauthorized']);
          return false;
        }
      }
    }

    // Check required roles
    const requiredRoles = route.data['roles'] as Array<string | number>;
    if (!requiredRoles || requiredRoles.length === 0) {
      return true; // No specific roles required
    }

    // Convert user's role to the appropriate type for comparison
    let userRole: string | number;
    if (typeof currentUser.role === 'string') {
      userRole = currentUser.role;
    } else {
      userRole = currentUser.role as number;
    }

    // Check if user has any of the required roles
    const hasRequiredRole = requiredRoles.some(role => {
      if (typeof role === 'string' && typeof userRole === 'string') {
        return role === userRole;
      } else if (typeof role === 'number' && typeof userRole === 'number') {
        return role === userRole;
      } else if (typeof role === 'string' && typeof userRole === 'number') {
        // Map numeric role to string
        if (userRole === UserRole.SuperAdmin && role === 'SuperAdmin') return true;
        if (userRole === UserRole.Admin && role === 'Admin') return true;
        if (userRole === UserRole.User && role === 'User') return true;
      } else if (typeof role === 'number' && typeof userRole === 'string') {
        // Map string role to numeric
        if (role === UserRole.SuperAdmin && userRole === 'SuperAdmin') return true;
        if (role === UserRole.Admin && userRole === 'Admin') return true;
        if (role === UserRole.User && userRole === 'User') return true;
      }
      return false;
    });

    if (hasRequiredRole) {
      return true;
    }

    // If user doesn't have required role, redirect to unauthorized page
    this.router.navigate(['/unauthorized']);
    return false;
  }
}
