import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { descriptionModeFromUrl, provideExpenseWebMcp } from './webmcp/provide-expense-webmcp';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),

    // The second interface. Remove this line and the app still works, for humans only.
    provideExpenseWebMcp(descriptionModeFromUrl()),
  ],
};
