// chức năng setAuthCookie, setToken ,thao tác token, cookie

import { Page } from '@playwright/test';

export async function setAuthCookie(page: Page, cookie: { name: string; value: string; domain: string; path?: string }) {
  await page.context().addCookies([{ ...cookie, path: cookie.path || '/' }]);
}

export async function setToken(page: Page, token: string) {
  await page.addInitScript((token) => {
    window.localStorage.setItem('auth_token', token);
  }, token);
}