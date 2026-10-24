import { TestBed } from '@angular/core/testing';
import { afterEach } from 'vitest';

import { LanguageService, LANGUAGE_OPTIONS } from './language.service';

describe('LanguageService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
    localStorage.removeItem('gigflow-language');
  });

  afterEach(() => {
    localStorage.removeItem('gigflow-language');
    document.documentElement.lang = 'de';
  });

  it('offers the six supported languages and persists the selected language', () => {
    const service = TestBed.inject(LanguageService);

    expect(LANGUAGE_OPTIONS.map((option) => option.code)).toEqual([
      'de',
      'en-US',
      'fr',
      'es',
      'ja',
      'zh-CN',
    ]);

    service.setLanguage('fr');

    expect(service.language()).toBe('fr');
    expect(localStorage.getItem('gigflow-language')).toBe('fr');
    expect(document.documentElement.lang).toBe('fr');
  });

  it('translates common navigation labels and falls back to German in the German locale', () => {
    const service = TestBed.inject(LanguageService);

    expect(service.translate('Termine')).toBe('Termine');
    service.setLanguage('en-US');
    expect(service.translate('Termine')).toBe('Events');
    expect(service.translate('Unbekannter dynamischer Text')).toBe('Unbekannter dynamischer Text');
  });
});
