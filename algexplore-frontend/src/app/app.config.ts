import { ApplicationConfig, LOCALE_ID, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import {
  provideHttpClient,
  withInterceptorsFromDi,
  HTTP_INTERCEPTORS,
} from '@angular/common/http';

import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';

import { routes } from './app.routes';
import { AuthInterceptor } from './interceptors/auth.interceptor';

registerLocaleData(localeFr);

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),

    provideHttpClient(withInterceptorsFromDi()),
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },

    { provide: LOCALE_ID, useValue: 'fr-FR' },
  ],
};