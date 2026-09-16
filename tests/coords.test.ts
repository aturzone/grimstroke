import { describe, expect, it } from 'vitest';
import { CoordinateError, format, resolve, toStyle } from '~/render/coords.ts';

const source = { width: 720, height: 1280 };

describe('the coordinate contract', () => {
  it('refuses a bare tuple and names the source size', () => {
    // A box whose numbers silently meant another space lands on nothing while
    // looking exactly as confident as a box on the right element.
    try {
      resolve('60,860,600,90', source);
      throw new Error('should have refused');
    } catch (error) {
      expect(error).toBeInstanceOf(CoordinateError);
      expect(String(error)).toContain('720x1280');
      expect(String(error)).toContain('src:');
    }
  });

  it('converts source pixels to percent', () => {
    const rect = resolve('src:72,128,144,256', source);
    expect(rect).toEqual({ x: 10, y: 10, w: 20, h: 20 });
  });

  it('accounts for device pixel ratio on css rectangles', () => {
    const rect = resolve('css:36,64,72,128', { ...source, dpr: 2 });
    expect(rect.x).toBeCloseTo(10);
    expect(rect.w).toBeCloseTo(20);
  });

  it('takes percent with no source at all', () => {
    expect(resolve('pct:10,20,30,40')).toEqual({ x: 10, y: 20, w: 30, h: 40 });
  });

  it('refuses a source-relative rectangle when the size is unknown', () => {
    expect(() => resolve('src:1,2,3,4')).toThrow(/size is not known/);
  });

  it('refuses a rectangle with no area', () => {
    expect(() => resolve('pct:1,2,0,4')).toThrow(/zero or negative/);
  });

  it('round trips through its own format', () => {
    const rect = resolve('src:72,128,144,256', source);
    expect(resolve(format(rect))).toEqual(rect);
  });

  it('emits percentages, so nothing downstream depends on the source size', () => {
    expect(toStyle({ x: 1, y: 2, w: 3, h: 4 })).toBe(
      'left:1.000%;top:2.000%;width:3.000%;height:4.000%',
    );
  });
});
