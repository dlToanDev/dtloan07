import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LOCALE,
  LOCALES,
  LOCALE_OPTIONS,
  getTranslation,
  isValidLocale,
  translations,
} from '@/lib/i18n';

describe('i18n Unit Tests', () => {
  describe('Config & Validation', () => {
    it('defines supported locales [vi, en] with default vi', () => {
      expect(LOCALES).toEqual(['vi', 'en']);
      expect(DEFAULT_LOCALE).toBe('vi');
    });

    it('validates locale correctly', () => {
      expect(isValidLocale('vi')).toBe(true);
      expect(isValidLocale('en')).toBe(true);
      expect(isValidLocale('fr')).toBe(false);
      expect(isValidLocale('')).toBe(false);
      expect(isValidLocale(null)).toBe(false);
      expect(isValidLocale(undefined)).toBe(false);
    });

    it('has proper locale options with labels and flags', () => {
      expect(LOCALE_OPTIONS).toHaveLength(2);
      const vi = LOCALE_OPTIONS.find((o) => o.code === 'vi');
      const en = LOCALE_OPTIONS.find((o) => o.code === 'en');
      expect(vi).toBeDefined();
      expect(vi?.flag).toBe('🇻🇳');
      expect(vi?.shortLabel).toBe('VI');
      expect(en).toBeDefined();
      expect(en?.flag).toBe('🇬🇧');
      expect(en?.shortLabel).toBe('EN');
    });
  });

  describe('getTranslation()', () => {
    it('translates navigation keys in Vietnamese and English', () => {
      expect(getTranslation('vi', 'nav.home')).toBe('Trang chủ');
      expect(getTranslation('en', 'nav.home')).toBe('Home');

      expect(getTranslation('vi', 'nav.blog')).toBe('Bài viết');
      expect(getTranslation('en', 'nav.blog')).toBe('Articles');

      expect(getTranslation('vi', 'nav.courses')).toBe('Khóa học');
      expect(getTranslation('en', 'nav.courses')).toBe('Courses');
    });

    it('translates search and footer keys in both languages', () => {
      expect(getTranslation('vi', 'search.title')).toBe('Tìm kiếm bài viết');
      expect(getTranslation('en', 'search.title')).toBe('Search articles');

      expect(getTranslation('vi', 'footer.explore')).toBe('Khám phá');
      expect(getTranslation('en', 'footer.explore')).toBe('Explore');
    });

    it('falls back to default locale if key is missing in target locale', () => {
      const result = getTranslation('en', 'only_in_vi_test_fallback', 'custom-fallback');
      expect(result).toBe('custom-fallback');
    });

    it('returns the fallback or the key itself if not found anywhere', () => {
      expect(getTranslation('vi', 'non_existing_key_xyz', 'Fallback Text')).toBe('Fallback Text');
      expect(getTranslation('vi', 'non_existing_key_xyz')).toBe('non_existing_key_xyz');
    });

    it('ensures critical nav keys exist in both vi and en dictionaries', () => {
      const criticalKeys = [
        'nav.home',
        'nav.blog',
        'nav.shop',
        'nav.courses',
        'nav.affiliate',
        'nav.language',
        'nav.skip_to_content',
      ];

      for (const key of criticalKeys) {
        expect(translations.vi[key], `Missing vi key: ${key}`).toBeDefined();
        expect(translations.en[key], `Missing en key: ${key}`).toBeDefined();
      }
    });
  });
});
