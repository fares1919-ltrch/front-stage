import { Component, ViewEncapsulation } from '@angular/core';
import { MaterialModule } from 'src/app/material.module';
import { AppSalesOverviewComponent } from 'src/app/shared/ui-components/sales-overview/sales-overview.component';
import { AppYearlyBreakupComponent } from 'src/app/shared/ui-components/yearly-breakup/yearly-breakup.component';
import { AppMonthlyEarningsComponent } from 'src/app/shared/ui-components/monthly-earnings/monthly-earnings.component';
import { AppBlogCardsComponent } from 'src/app/shared/ui-components/blog-card/blog-card.component';

@Component({
  selector: 'app-starter',
  imports: [
    MaterialModule,
    AppSalesOverviewComponent,
    AppYearlyBreakupComponent,
    AppMonthlyEarningsComponent,
    AppBlogCardsComponent
  ],
  templateUrl: './starter.component.html',
  encapsulation: ViewEncapsulation.None,
})
export class StarterComponent { }
