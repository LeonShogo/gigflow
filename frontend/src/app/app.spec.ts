import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach } from 'vitest';

import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
  });

  afterEach(() => {
    localStorage.removeItem('gigflow-language');
    document.documentElement.lang = 'de';
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('renders the GigFlow logo and a vector theme icon', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const logo = fixture.nativeElement.querySelector('.shell__mark') as HTMLImageElement;
    const themeIcon = fixture.nativeElement.querySelector('.shell__theme-icon svg');

    expect(logo.src).toContain('/svg/gigflow-icon.svg');
    expect(themeIcon).toBeTruthy();
  });

  it('toggles and stores the selected color theme', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('.shell__theme') as HTMLButtonElement;

    button.click();
    fixture.detectChanges();

    expect(document.documentElement.dataset['theme']).toBe('dark');
    expect(localStorage.getItem('gigflow-theme')).toBe('dark');
    expect(button.getAttribute('aria-pressed')).toBe('true');

    button.click();
    fixture.detectChanges();

    expect(document.documentElement.dataset['theme']).toBe('light');
    expect(localStorage.getItem('gigflow-theme')).toBe('light');
  });

  it('switches and persists the app language', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const select = fixture.nativeElement.querySelector('.shell__language') as HTMLSelectElement;

    select.value = 'fr';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(localStorage.getItem('gigflow-language')).toBe('fr');
    expect(document.documentElement.lang).toBe('fr');
    expect(fixture.nativeElement.querySelector('.shell__nav-link')?.textContent?.trim()).toBe('Événements');
  });
});
